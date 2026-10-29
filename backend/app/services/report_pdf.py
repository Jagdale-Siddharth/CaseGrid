"""Official-format PDF for the case report: header with tricolour rule, summary, analytics charts,
full case register and sign-off block. Built with ReportLab (already a lightweight pure-Python dependency);
generated only when an officer clicks Export > PDF, so it adds no load to normal browsing."""
import io
from collections import Counter
from datetime import datetime
from xml.sax.saxutils import escape

from reportlab.graphics.charts.barcharts import HorizontalBarChart, VerticalBarChart
from reportlab.graphics.charts.legends import Legend
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (BaseDocTemplate, Frame, KeepTogether, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle)

NAVY, BLUE = colors.HexColor("#0B1F42"), colors.HexColor("#163E80")
SAFFRON, GREEN, RED = colors.HexColor("#FF9933"), colors.HexColor("#138808"), colors.HexColor("#C12026")
GREY, LINE, ZEBRA = colors.HexColor("#586378"), colors.HexColor("#CFD6E2"), colors.HexColor("#F1F4F8")
SERIES = [BLUE, SAFFRON, GREEN, colors.HexColor("#7FA3DA"), RED, colors.HexColor("#6B7A99")]
PAGE = landscape(A4)
LM = RM = 14 * mm
SLA_LABEL = {"on_track": "On track", "due_soon": "Due soon", "overdue": "Overdue", "escalated": "Escalated", "closed": "Closed"}

_ss = getSampleStyleSheet()
H1 = ParagraphStyle("h1", parent=_ss["Heading1"], fontName="Helvetica-Bold", fontSize=18, textColor=NAVY, spaceAfter=2, leading=22)
H2 = ParagraphStyle("h2", parent=_ss["Heading2"], fontName="Helvetica-Bold", fontSize=12.5, textColor=NAVY, spaceBefore=10, spaceAfter=4, leading=15)
BODY = ParagraphStyle("body", parent=_ss["BodyText"], fontName="Helvetica", fontSize=9, leading=12, textColor=colors.HexColor("#1A202C"))
SMALL = ParagraphStyle("small", parent=BODY, fontSize=8, leading=10, textColor=GREY)
CELL = ParagraphStyle("cell", parent=BODY, fontSize=7.6, leading=9.2)
CELLH = ParagraphStyle("cellh", parent=CELL, fontName="Helvetica-Bold", textColor=colors.white)
KPI_N = ParagraphStyle("kpin", parent=BODY, fontName="Helvetica-Bold", fontSize=20, leading=22, alignment=TA_CENTER, textColor=NAVY)
KPI_L = ParagraphStyle("kpil", parent=SMALL, alignment=TA_CENTER)


def _p(text, style=CELL):
    return Paragraph(escape(str(text if text not in (None, "") else "-")), style)


class _Canvas(canvas.Canvas):
    """Two-pass canvas so every footer can say 'Page x of y'."""
    meta = {}

    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        self._pages = []

    def showPage(self):
        self._pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._pages)
        for st in self._pages:
            self.__dict__.update(st)
            self._chrome(total)
            super().showPage()
        super().save()

    def _chrome(self, total):
        w, h = PAGE
        self.saveState()
        # tricolour rule at very top
        for i, c in enumerate((SAFFRON, colors.white, GREEN)):
            self.setFillColor(c)
            self.rect(i * w / 3, h - 5, w / 3, 5, stroke=0, fill=1)
        self.setStrokeColor(LINE); self.setLineWidth(0.4)
        self.line(0, h - 5, w, h - 5)
        # letterhead
        self.setFillColor(NAVY); self.circle(LM + 7 * mm, h - 17 * mm, 6.2 * mm, stroke=0, fill=1)
        self.setStrokeColor(SAFFRON); self.setLineWidth(1.2); self.circle(LM + 7 * mm, h - 17 * mm, 6.2 * mm, stroke=1, fill=0)
        self.setFillColor(colors.white); self.setFont("Helvetica-Bold", 9); self.drawCentredString(LM + 7 * mm, h - 18.6 * mm, "AICTE")
        self.setFillColor(NAVY); self.setFont("Helvetica-Bold", 13.5)
        self.drawString(LM + 17 * mm, h - 15 * mm, "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION")
        self.setFont("Helvetica", 8.6); self.setFillColor(GREY)
        self.drawString(LM + 17 * mm, h - 20 * mm, "Ministry of Education, Government of India  |  Complaint Monitoring and Coordination Portal")
        self.setFont("Helvetica-Bold", 8.6); self.setFillColor(BLUE)
        self.drawRightString(w - RM, h - 15 * mm, self.meta.get("ref", ""))
        self.setFont("Helvetica", 8); self.setFillColor(GREY)
        self.drawRightString(w - RM, h - 20 * mm, self.meta.get("generated", ""))
        self.setStrokeColor(NAVY); self.setLineWidth(1.1); self.line(LM, h - 25 * mm, w - RM, h - 25 * mm)
        self.setStrokeColor(SAFFRON); self.setLineWidth(1.1); self.line(LM, h - 26.2 * mm, LM + 38 * mm, h - 26.2 * mm)
        # footer
        self.setStrokeColor(LINE); self.setLineWidth(0.5); self.line(LM, 14 * mm, w - RM, 14 * mm)
        self.setFont("Helvetica", 7.6); self.setFillColor(GREY)
        self.drawString(LM, 10 * mm, "Official use only. Computer-generated report from the AICTE Complaint Monitoring Portal (prototype, synthetic data).")
        self.drawRightString(w - RM, 10 * mm, f"Page {self._pageNumber} of {total}")
        self.restoreState()


def _kpi_row(rows):
    n = len(rows)
    pending = sum(1 for r in rows if r["status"] != "Resolved")
    overdue = sum(1 for r in rows if r["sla_state"] in ("overdue", "escalated"))
    soon = sum(1 for r in rows if r["sla_state"] == "due_soon")
    cells = [(n, "Total cases"), (pending, "Pending"), (n - pending, "Resolved"), (soon, "Due soon"), (overdue, "Overdue or escalated")]
    t = Table([[Paragraph(str(v), KPI_N) for v, _ in cells], [Paragraph(l, KPI_L) for _, l in cells]], colWidths=[(PAGE[0] - LM - RM) / len(cells)] * len(cells))
    st = [("BOX", (0, 0), (-1, -1), 0.6, LINE), ("LINEAFTER", (0, 0), (-2, -1), 0.6, LINE), ("BACKGROUND", (0, 0), (-1, -1), ZEBRA),
          ("TOPPADDING", (0, 0), (-1, 0), 7), ("BOTTOMPADDING", (0, 1), (-1, 1), 6)]
    for i, c in enumerate((BLUE, BLUE, GREEN, SAFFRON, RED)):
        st.append(("LINEABOVE", (i, 0), (i, 0), 3, c))
    t.setStyle(TableStyle(st))
    return t


def _short(s, n=26):
    s = str(s)
    return s if len(s) <= n else s[: n - 1] + "\u2026"


def _hbar(title, items, w, top=8):
    items = items[:top] or [("No data", 0)]
    rows = len(items)
    h = 26 + rows * 17
    d = Drawing(w, h)
    d.add(String(0, h - 11, title, fontName="Helvetica-Bold", fontSize=9.5, fillColor=NAVY))
    ch = HorizontalBarChart()
    ch.x, ch.y, ch.width, ch.height = 132, 6, w - 132 - 26, h - 26
    ch.data = [[v for _, v in items]]
    ch.categoryAxis.categoryNames = [_short(n, 30) for n, _ in items]
    ch.categoryAxis.reverseDirection = 1
    ch.categoryAxis.labels.fontName, ch.categoryAxis.labels.fontSize = "Helvetica", 7.4
    ch.categoryAxis.labels.dx = -3
    ch.categoryAxis.strokeColor = LINE
    ch.categoryAxis.visibleTicks = 0
    ch.valueAxis.valueMin = 0
    top_v = max(v for _, v in items) or 1
    ch.valueAxis.valueMax = top_v * 1.18
    ch.valueAxis.visible = 0
    ch.bars[0].fillColor, ch.bars[0].strokeColor = BLUE, None
    ch.barWidth = 9
    ch.groupSpacing = 5
    ch.barLabelFormat = "%d"
    ch.barLabels.fontName, ch.barLabels.fontSize = "Helvetica-Bold", 7.4
    ch.barLabels.boxAnchor = "w"
    ch.barLabels.dx = 3
    ch.barLabels.fillColor = NAVY
    d.add(ch)
    return d


def _pie(title, items, w):
    h = 26 + 8 * 17
    d = Drawing(w, h)
    d.add(String(0, h - 11, title, fontName="Helvetica-Bold", fontSize=9.5, fillColor=NAVY))
    items = [(n, v) for n, v in items if v] or [("No data", 1)]
    pie = Pie()
    pie.x, pie.y, pie.width, pie.height = 6, 8, 100, 100
    pie.data = [v for _, v in items]
    pie.labels = None
    pie.sideLabels = 0
    pie.slices.strokeColor = colors.white
    pie.slices.strokeWidth = 1
    for i in range(len(items)):
        pie.slices[i].fillColor = SERIES[i % len(SERIES)]
    d.add(pie)
    total = sum(v for _, v in items)
    lg = Legend()
    lg.x, lg.y, lg.alignment, lg.dy, lg.dx, lg.deltay = 125, h - 36, "right", 7, 7, 13
    lg.fontName, lg.fontSize, lg.columnMaximum = "Helvetica", 8, 8
    lg.colorNamePairs = [(SERIES[i % len(SERIES)], f"{_short(n, 22)}  -  {v} ({v * 100 // total}%)") for i, (n, v) in enumerate(items)]
    d.add(lg)
    return d


def _vbar(title, items, w):
    h = 26 + 8 * 17
    d = Drawing(w, h)
    d.add(String(0, h - 11, title, fontName="Helvetica-Bold", fontSize=9.5, fillColor=NAVY))
    items = items or [("No data", 0)]
    ch = VerticalBarChart()
    ch.x, ch.y, ch.width, ch.height = 14, 22, w - 30, h - 52
    ch.data = [[v for _, v in items]]
    ch.categoryAxis.categoryNames = [n for n, _ in items]
    ch.categoryAxis.labels.fontName, ch.categoryAxis.labels.fontSize = "Helvetica", 7.6
    ch.categoryAxis.strokeColor = LINE
    ch.valueAxis.valueMin = 0
    ch.valueAxis.valueMax = (max(v for _, v in items) or 1) * 1.25
    ch.valueAxis.visible = 0
    ch.bars[0].strokeColor = None
    tone = {"On track": BLUE, "Due soon": SAFFRON, "Overdue": RED, "Escalated": RED, "Closed": GREEN}
    for i, (n, _) in enumerate(items):
        ch.bars[(0, i)].fillColor = tone.get(n, BLUE)
    ch.barLabelFormat = "%d"
    ch.barLabels.fontName, ch.barLabels.fontSize, ch.barLabels.fillColor = "Helvetica-Bold", 8, NAVY
    ch.barLabels.nudge = 7
    ch.barWidth = 22
    d.add(ch)
    return d


def _counts(rows, key, map_=None):
    c = Counter((map_ or {}).get(r[key], r[key]) for r in rows)
    return c.most_common()


def build_pdf(rows: list[dict], *, user, filters: list[str], scope: str, as_of, ref: str) -> bytes:
    buf = io.BytesIO()
    _Canvas.meta = {"ref": ref, "generated": f"Generated {datetime.now().strftime('%d %b %Y, %I:%M %p')}"}
    doc = BaseDocTemplate(buf, pagesize=PAGE, leftMargin=LM, rightMargin=RM, topMargin=31 * mm, bottomMargin=19 * mm,
                          title="AICTE Complaint Status Report", author="AICTE Complaint Monitoring Portal")
    frame = Frame(LM, 19 * mm, PAGE[0] - LM - RM, PAGE[1] - 50 * mm, id="f", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id="p", frames=[frame])])
    W = PAGE[0] - LM - RM
    s = [Paragraph("Complaint Status Report", H1), Paragraph("Consolidated view of complaints handled across AICTE bureaus and cells", SMALL), Spacer(1, 5)]

    info = [
        [_p("Reference No.", CELLH), _p(ref, CELL), _p("Data as of", CELLH), _p(as_of.strftime("%d %B %Y"), CELL)],
        [_p("Prepared for", CELLH), _p(user.full_name, CELL), _p("Scope", CELLH), _p(scope, CELL)],
        [_p("Filters applied", CELLH), _p("; ".join(filters) if filters else "None (all cases within the officer's scope)", CELL), _p("Cases in report", CELLH), _p(len(rows), CELL)],
    ]
    t = Table(info, colWidths=[28 * mm, W / 2 - 28 * mm, 28 * mm, W / 2 - 28 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, -1), NAVY), ("BACKGROUND", (2, 0), (2, -1), NAVY), ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                           ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    s += [t, Paragraph("1. Summary", H2), _kpi_row(rows), Spacer(1, 4)]

    if not rows:
        s.append(Paragraph("No cases match the selected filters.", BODY))
    else:
        cw = W / 2 - 6
        pairs = [
            (_pie("Cases by status", _counts(rows, "status"), cw), _vbar("Cases by timing against deadline", _counts(rows, "sla_state", SLA_LABEL), cw)),
            (_hbar("Cases by bureau or cell", _counts(rows, "bureau"), cw), _hbar("Cases by category", _counts(rows, "category"), cw)),
            (_hbar("Cases by state", _counts(rows, "state"), cw), _hbar("Top institutions by complaints", _counts(rows, "institution"), cw)),
        ]
        s.append(Paragraph("2. Analytics", H2))
        for a, b in pairs:
            row = Table([[a, b]], colWidths=[W / 2, W / 2])
            row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                                     ("BOX", (0, 0), (-1, -1), 0.4, LINE), ("LINEAFTER", (0, 0), (0, 0), 0.4, LINE), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                                     ("LEFTPADDING", (0, 0), (-1, -1), 8)]))
            s += [KeepTogether([row]), Spacer(1, 5)]

        s += [PageBreak(), Paragraph("3. Case register", H2)]
        head = ["S.No.", "Case ID", "Institution", "State", "Category", "Bureau / cell", "Officer", "Status", "Registered", "Due", "Timing"]
        cws = [13, 31, 50, 21, 24, 29, 25, 23, 20, 20, 20]
        scale = W / (sum(cws) * mm)
        data = [[_p(h, CELLH) for h in head]]
        for i, r in enumerate(rows, 1):
            data.append([_p(i), _p(r["case_id"]), _p(r["institution"]), _p(r["state"]), _p(r["category"]), _p(r["bureau"]), _p(r["officer"]),
                         _p(r["status"]), _p(r["registered_on"]), _p(r["due_date"]), _p(SLA_LABEL.get(r["sla_state"], r["sla_state"]))])
        reg = Table(data, colWidths=[c * mm * scale for c in cws], repeatRows=1)
        st = [("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.3, LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
              ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3), ("LINEBELOW", (0, 0), (-1, 0), 1.2, SAFFRON)]
        st += [("BACKGROUND", (0, i), (-1, i), ZEBRA) for i in range(2, len(data), 2)]
        reg.setStyle(TableStyle(st))
        s.append(reg)

    s.append(Spacer(1, 12))
    sign = Table([[_p("Prepared by (system generated)", CELLH), _p("Reviewed by", CELLH), _p("Approved by", CELLH)],
                  [_p(f"{user.full_name}\n{as_of.strftime('%d %b %Y')}", CELL), _p("Name, designation, date and signature", SMALL), _p("Name, designation, date and signature", SMALL)]],
                 colWidths=[W / 3] * 3, rowHeights=[None, 16 * mm])
    sign.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.4, LINE), ("VALIGN", (0, 1), (-1, 1), "BOTTOM")]))
    s += [KeepTogether([Paragraph("4. Authorisation", H2), sign,
                        Spacer(1, 4), Paragraph("Notes: Timing is measured against the deadline set for each priority. Overdue cases are past their deadline; escalated cases are overdue beyond the escalation limit. "
                                               "This report lists only the cases the signed-in officer is permitted to see.", SMALL)])]
    doc.build(s, canvasmaker=_Canvas)
    return buf.getvalue()