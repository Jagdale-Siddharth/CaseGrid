import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748b"))
        # Header rule & title
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(40, 755, 572, 755)
        self.drawString(40, 762, "AICTE PS 26264 — Screen Recording Voiceover Script (Under 5 Min)")
        
        # Footer rule & page number
        self.line(40, 45, 572, 45)
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(572, 32, page_text)
        self.drawString(40, 32, "Confidential • AICTE Prototype Demonstration • Ready to Record")
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=55,
        bottomMargin=55
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#475569'),
        spaceAfter=12
    )

    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=12,
        textColor=colors.white
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=4
    )

    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0284c7')
    )

    action_text = ParagraphStyle(
        'ActionText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#1e293b')
    )

    voice_label = ParagraphStyle(
        'VoiceLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#d97706')
    )

    voice_text = ParagraphStyle(
        'VoiceText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14.5,
        textColor=colors.HexColor('#0f172a')
    )

    setup_title = ParagraphStyle(
        'SetupTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=4
    )

    setup_text = ParagraphStyle(
        'SetupText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )

    story = []

    # Title & Subtitle
    story.append(Paragraph("AICTE Complaint Monitor (PS 26264)", title_style))
    story.append(Paragraph("Official Screen Recording Script — <b>Target Duration: 4 Min 30 Sec</b>", subtitle_style))

    # Pre-flight Setup Box
    setup_data = [
        [
            Paragraph("<b>PRE-FLIGHT SETUP (Before you hit record):</b>", setup_title)
        ],
        [
            Paragraph(
                "• <b>Left Window</b>: Web Browser on <code>http://localhost:5173/login</code><br/>"
                "• <b>Right Window</b>: Mobile Screen mirrored with Expo Go open (or phone screen capture).<br/>"
                "• <b>Demo Password for all accounts</b>: <code>Demo@1234</code> (supervisor, kulkarni, management, admin).<br/>"
                "• <b>Hero Institution</b>: <i>Sahyadri Institute of Technology</i> (Code: <code>INST-MH-001</code>).",
                setup_text
            )
        ]
    ]
    setup_table = Table(setup_data, colWidths=[532])
    setup_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,0), 2),
    ]))
    story.append(setup_table)
    story.append(Spacer(1, 10))

    scenes = [
        {
            "num": "SCENE 1",
            "time": "0:00 – 0:30 (30s)",
            "title": "Problem Statement & Solution Context",
            "actions": "Show the web login page (<code>http://localhost:5173/login</code>). Hover mouse over title: <i>'Every complaint. One institution. All bureaus.'</i>",
            "voice": "\"Hello everyone. Today, I'm presenting our solution for AICTE Problem Statement 26264: an Integrated Dashboard for Monitoring and Tracking Institution-Related Complaints Across AICTE Bureaus and Cells.<br/><br/>Previously, AICTE bureaus—like Regulation, Approval, and Grievance Cells—handled complaints in silos. Cases concerning the exact same institution were often processed concurrently without coordination, causing duplicate work and delays.<br/><br/>We solved this with an end-to-end platform: a citizen mobile app for verified complaint filing, combined with a central dashboard featuring automated overlap detection, real-time workload tracking, and strict role-based access.\""
        },
        {
            "num": "SCENE 2",
            "time": "0:30 – 1:30 (60s)",
            "title": "Citizen Mobile App: Email OTP Auth, Geotag & Filing",
            "actions": "1. Focus on Mobile Screen. Enter email &rarr; Tap 'Send Code' &rarr; enter 6-digit OTP &rarr; Tap 'Verify'.<br/>"
                       "2. Tap 'File New Complaint' &rarr; Pick 'Sahyadri Institute of Technology' &rarr; Category 'Infrastructure' &rarr; Subject: <code>Severe electronics lab equipment malfunction</code>.<br/>"
                       "3. Tap 'Add Geotagged Photo' &rarr; snap photo (highlight captured GPS coordinates & address).<br/>"
                       "4. Tap 'Attach Document' (pick sample PDF) &rarr; Check 'Urgent Priority' &rarr; Tap 'Submit'.<br/>"
                       "5. Switch to 'Track Complaint' tab, show live status & timeline with Case ID.",
            "voice": "\"We start with the citizen mobile app, built with React Native and Expo SDK 58.<br/><br/>To eliminate spam, complaints require passwordless email OTP verification via Resend. Once verified, the complainant selects the institution and enters their grievance.<br/><br/>For tamper-proof evidence, with one tap the app captures a geotagged photo—automatically embedding real-time GPS coordinates and the reverse-geocoded physical address onto the record. We also support PDF attachments and an 'Urgent Priority' flag.<br/><br/>Once submitted, the backend auto-routes the case to the appropriate bureau and generates a tracking ID. On the 'Track Complaint' tab, citizens can monitor live progress, handling bureau, and action timeline anytime.\""
        },
        {
            "num": "SCENE 3",
            "time": "1:30 – 2:15 (45s)",
            "title": "Web Portal & Centralized Institution Profile",
            "actions": "1. Switch to Web Browser (<code>http://localhost:5173/login</code>).<br/>"
                       "2. Click 'Supervisor' demo login (<code>supervisor</code> / <code>Demo@1234</code>).<br/>"
                       "3. Point out top bar: <b>no manual 'Register' button</b> for staff (data comes strictly from citizen channels).<br/>"
                       "4. Click 'Institutions' &rarr; open 'Sahyadri Institute of Technology' (<code>INST-MH-001</code>).",
            "voice": "\"Now switching to the AICTE web portal as a Supervisor.<br/><br/>Notice our security design: administrative staff cannot manually register complaints here. All public cases originate exclusively from verified citizen channels, preserving complete data integrity.<br/><br/>Opening 'Institutions' &rarr; 'Sahyadri Institute of Technology', we see the Centralized Institution Profile mandated by the problem statement. In one single window, officers see the AICTE Permanent Code, state, affiliating body, and a consolidated history of all past and ongoing complaints across all AICTE bureaus.\""
        },
        {
            "num": "SCENE 4",
            "time": "2:15 – 3:15 (60s)",
            "title": "Cross-Bureau Overlap Detection, Scoping & Linking",
            "actions": "1. Click 'Related cases' (<code>/overlaps</code>).<br/>"
                       "2. Point out warning banner: <b>'⚠️ Potential Overlapping Cases – Coordination Required'</b>.<br/>"
                       "3. Show match score (78%) and the 4 signals: Same institution, similar text topics, close in time, different bureaus.<br/>"
                       "4. Sign out & log in as Technical Officer (<code>kulkarni</code>): show other bureau case is <b>redacted</b>.<br/>"
                       "5. Log back in as Supervisor &rarr; Click 'Link cases' &rarr; reason: <i>'Same lab issue; joint inspection required'</i> &rarr; Confirm.",
            "voice": "\"Here is our core innovation: Cross-Bureau Overlap Detection.<br/><br/>Notice this warning banner: 'Potential Overlapping Cases – Coordination Required'. Our engine automatically flags when multiple bureaus are independently processing complaints for the same institution.<br/><br/>It's completely explainable—combining institution ID matching, category correlation, a 60-day window, and TF-IDF text similarity with a technical synonym dictionary.<br/><br/>Security is enforced at the database level: when logged in as a specific Bureau Officer like Mr. Kulkarni, another bureau's text is automatically redacted to prevent privacy leaks. A supervisor can review both sides, enter an audited rationale, and link the cases for joint action.\""
        },
        {
            "num": "SCENE 5",
            "time": "3:15 – 4:00 (45s)",
            "title": "Real-Time Monitoring Dashboard & Analytics",
            "actions": "1. Click 'Dashboard' (<code>/</code>).<br/>"
                       "2. Point to KPI cards: <i>Overdue, Due soon, Under process, Transferred, Overlaps</i>.<br/>"
                       "3. Scroll to 'Who is holding what' (Bureau Lanes): hover over colored SLA dots (red=overdue, orange=due soon, black=on track).<br/>"
                       "4. Point to monthly intake vs. disposal area chart, status pie chart, and officer workload.",
            "voice": "\"On the executive Dashboard, authorized officials have complete visibility.<br/><br/>At the top, we display all key metrics from the problem statement: total complaints received, pending cases, cases under process, cases transferred between bureaus, and cases disposed.<br/><br/>Our 'Who is holding what' Lanes visually partition active workload across bureaus. Each dot represents a live case, color-coded by SLA deadline health—red for overdue, orange for due soon, and black for on track.<br/><br/>Officials can also track monthly intake vs. disposal trends, status breakdowns, case ageing from 0 to 30-plus days, and individual officer workloads.\""
        },
        {
            "num": "SCENE 6",
            "time": "4:00 – 4:35 (35s)",
            "title": "Search, Regional Filters, Alerts & Conclusion",
            "actions": "1. Click 'Cases' (<code>/cases</code>): pick Region dropdown &rarr; <i>'Maharashtra'</i>.<br/>"
                       "2. Click 'Reports' (<code>/reports</code>): show 'By region / state' chart and click 'Export CSV'.<br/>"
                       "3. Click 'Audit' (<code>/audit</code>): show immutable audit trail.<br/>"
                       "4. Toggle Light/Dark mode in the top right to end on the polished dashboard view.",
            "voice": "\"Finally, under 'Cases' and 'Reports', users can filter by Bureau, Category, Status, and State or Region, and export sanitized CSV or JSON reports.<br/><br/>Behind the scenes, configurable routing sends ambiguous cases to a manual review queue, deduplicated SLA alerts prevent notification spam, and every single action is permanently recorded in an immutable audit trail.<br/><br/>Our platform directly fulfills all requirements of AICTE Problem Statement 26264—bringing transparency, coordination, and accountability across all AICTE bureaus.<br/><br/>Thank you!\""
        }
    ]

    for s in scenes:
        card_content = [
            [
                Paragraph(f"<b>{s['num']}</b> | {s['title']}", section_heading),
                Paragraph(f"<b>{s['time']}</b>", ParagraphStyle('TBadge', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#0284c7'), alignment=2))
            ],
            [
                Paragraph("<b>🖥️ WHAT TO SHOW (ACTIONS ON SCREEN):</b>", label_style),
                ""
            ],
            [
                Paragraph(s["actions"], action_text),
                ""
            ],
            [
                Paragraph("<b>🎙️ WHAT TO SAY (EXACT VOICEOVER SCRIPT):</b>", voice_label),
                ""
            ],
            [
                Paragraph(s["voice"], voice_text),
                ""
            ]
        ]
        
        table = Table(card_content, colWidths=[400, 132])
        table.setStyle(TableStyle([
            ('SPAN', (0,1), (1,1)),
            ('SPAN', (0,2), (1,2)),
            ('SPAN', (0,3), (1,3)),
            ('SPAN', (0,4), (1,4)),
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#ffffff')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
            ('LINEBELOW', (0,0), (-1,0), 1, colors.HexColor('#cbd5e1')),
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
            ('PADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,1), (-1,1), 5),
            ('BOTTOMPADDING', (0,1), (-1,1), 2),
            ('TOPPADDING', (0,3), (-1,3), 5),
            ('BOTTOMPADDING', (0,3), (-1,3), 2),
        ]))

        story.append(KeepTogether([table]))
        story.append(Spacer(1, 9))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF built successfully: {filename}")

if __name__ == "__main__":
    out1 = r"C:\Users\HP\Downloads\New folder (2)\aicte-complaint-platform\docs\AICTE_PS26264_Screen_Recording_Script_Under_5_Min.pdf"
    out2 = r"C:\Users\HP\.gemini\antigravity\brain\52523483-522e-4d59-991b-bc79419953b6\AICTE_PS26264_Screen_Recording_Script_Under_5_Min.pdf"
    build_pdf(out1)
    build_pdf(out2)
