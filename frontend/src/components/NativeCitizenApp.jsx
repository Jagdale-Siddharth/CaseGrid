import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Mail,
  Key,
  User,
  Phone,
  PlusCircle,
  FolderOpen,
  Search,
  UserRound,
  LogOut,
  MapPin,
  Camera,
  FileText,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  X,
  Server,
  UploadCloud,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  sendOtp,
  verifyOtp,
  getInstitutions,
  getCategories,
  fileComplaint,
  getMyComplaints,
  trackCase,
  getCitizenBaseUrl,
  setCitizenBaseUrl,
} from "../services/citizenApi";

const TOKEN_KEY = "@aicte_citizen_token";
const USER_KEY = "@aicte_citizen_user";

export default function NativeCitizenApp() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [citizen, setCitizen] = useState(() => {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  // Active tab: 'new' | 'my' | 'track' | 'profile'
  const [activeTab, setActiveTab] = useState("new");
  const [prefilledTrackCaseId, setPrefilledTrackCaseId] = useState("");

  const handleLoginSuccess = (newToken, userProfile) => {
    setToken(newToken);
    setCitizen(userProfile);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userProfile));
    setActiveTab("new");
  };

  const handleLogout = () => {
    setToken(null);
    setCitizen(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const handleComplaintCreated = (caseId) => {
    setPrefilledTrackCaseId(caseId);
    setActiveTab("my");
  };

  return (
    <div className="flex h-full w-full flex-col bg-slate-950 font-sans text-slate-100 select-none overflow-hidden">
      {/* Top Phone Status Bar Simulation */}
      <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-slate-400">
        <span>9:41</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]">5G</span>
          <div className="h-2.5 w-5 rounded-[3px] border border-slate-400 p-0.5">
            <div className="h-full w-full rounded-[1px] bg-emerald-400" />
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden bg-slate-900/60 scrollbar-thin scrollbar-thumb-slate-700">
        {!token || !citizen ? (
          <CitizenAuthScreen onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            {activeTab === "new" && (
              <CitizenNewComplaintScreen
                token={token}
                citizen={citizen}
                onComplaintCreated={handleComplaintCreated}
              />
            )}
            {activeTab === "my" && (
              <CitizenMyComplaintsScreen
                token={token}
                onTrackExternal={(caseId) => {
                  setPrefilledTrackCaseId(caseId);
                  setActiveTab("track");
                }}
              />
            )}
            {activeTab === "track" && (
              <CitizenTrackCaseScreen initialCaseId={prefilledTrackCaseId} />
            )}
            {activeTab === "profile" && (
              <CitizenProfileScreen citizen={citizen} onLogout={handleLogout} />
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      {token && citizen && (
        <nav className="flex items-center justify-around border-t border-slate-800/80 bg-slate-950/95 py-2 px-1 backdrop-blur-md">
          <TabButton
            active={activeTab === "new"}
            onClick={() => setActiveTab("new")}
            icon={<PlusCircle size={20} />}
            label="File Grievance"
          />
          <TabButton
            active={activeTab === "my"}
            onClick={() => setActiveTab("my")}
            icon={<FolderOpen size={20} />}
            label="My Cases"
          />
          <TabButton
            active={activeTab === "track"}
            onClick={() => setActiveTab("track")}
            icon={<Search size={20} />}
            label="Track Any"
          />
          <TabButton
            active={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
            icon={<UserRound size={20} />}
            label="Account"
          />
        </nav>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center justify-center py-1 transition-all ${
        active ? "text-sky-400 font-semibold" : "text-slate-400 hover:text-slate-200"
      }`}
    >
      <div className={`${active ? "scale-110" : "scale-100"} transition-transform`}>{icon}</div>
      <span className="mt-1 text-[10px] tracking-tight">{label}</span>
    </button>
  );
}

// -------------------------------------------------------------
// 1. AUTH SCREEN (Email OTP)
// -------------------------------------------------------------
function CitizenAuthScreen({ onLoginSuccess }) {
  const [step, setStep] = useState("email"); // 'email' | 'otp'
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(getCitizenBaseUrl());

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setMsg({ type: "error", text: "Please enter a valid email address." });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      await sendOtp(email.trim());
      setStep("otp");
      setMsg({
        type: "success",
        text: `A 6-digit verification code has been dispatched to ${email.trim()}. Check your inbox or spam.`,
      });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Failed to send code. Check server connection." });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setMsg({ type: "error", text: "Please enter the 6-digit verification code." });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await verifyOtp(email, otpCode, fullName, phone);
      if (res.access_token && res.citizen) {
        onLoginSuccess(res.access_token, res.citizen);
      } else {
        throw new Error("Invalid response received from server.");
      }
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Invalid or expired OTP code." });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = () => {
    setCitizenBaseUrl(serverUrl);
    setShowConfig(false);
    setMsg({ type: "success", text: `Server URL updated to: ${serverUrl}` });
  };

  return (
    <div className="flex min-h-full flex-col justify-between p-5">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pt-2 pb-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-sky-500/20 text-sky-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">AICTE Grievance Portal</h2>
              <p className="text-[10px] text-slate-400">Citizen & Student Mobile Access</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="rounded-lg border border-slate-800 bg-slate-900/60 p-1.5 text-slate-400 hover:text-white"
            title="Configure Server URL"
          >
            <Server size={14} />
          </button>
        </div>

        {/* Server Config Drawer */}
        {showConfig && (
          <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-950/40 p-3 text-xs">
            <span className="font-semibold text-sky-300">Backend API URL</span>
            <input
              type="text"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-500"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="rounded-md px-2 py-1 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="rounded-md bg-sky-600 px-3 py-1 font-semibold text-white hover:bg-sky-500"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Notification Toast */}
        {msg && (
          <div
            className={`mb-4 flex items-start gap-2 rounded-xl border p-3 text-xs leading-relaxed ${
              msg.type === "error"
                ? "border-rose-500/30 bg-rose-950/40 text-rose-300"
                : "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
            }`}
          >
            {msg.type === "error" ? <AlertTriangle size={16} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={16} className="shrink-0 mt-0.5" />}
            <div className="flex-1">{msg.text}</div>
            <button type="button" onClick={() => setMsg(null)} className="text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur-sm">
          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Sign In / Authenticate</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Enter your email address to receive a secure one-time verification code.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Email Address *
                </label>
                <div className="mt-1.5 flex items-center rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 focus-within:border-sky-500">
                  <Mail size={16} className="text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. rahul.sharma@example.com"
                    className="ml-2.5 flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-600/30 hover:bg-sky-500 disabled:opacity-50"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                {loading ? "Dispatching OTP..." : "Send Verification Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Enter 6-Digit Code</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Code sent to <span className="font-semibold text-sky-400">{email}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="text-[11px] font-semibold text-sky-400 hover:underline"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  6-Digit OTP Code *
                </label>
                <div className="mt-1.5 flex items-center rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 focus-within:border-sky-500">
                  <Key size={16} className="text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="123456"
                    className="ml-2.5 flex-1 bg-transparent text-sm font-mono tracking-widest text-white placeholder-slate-500 outline-none"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Full Name (Optional)
                </label>
                <div className="mt-1.5 flex items-center rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 focus-within:border-sky-500">
                  <User size={16} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    className="ml-2.5 flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Mobile Phone (Optional)
                </label>
                <div className="mt-1.5 flex items-center rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 focus-within:border-sky-500">
                  <Phone size={16} className="text-slate-400" />
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    className="ml-2.5 flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-600/30 hover:bg-sky-500 disabled:opacity-50"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                {loading ? "Verifying..." : "Verify & Enter Portal"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSendOtp}
                  className="text-xs text-slate-400 hover:text-sky-400 hover:underline"
                >
                  Resend Verification Code
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center pt-4 pb-2 text-[10px] text-slate-500">
        All India Council for Technical Education (AICTE), New Delhi • PS 26264
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. FILE GRIEVANCE SCREEN
// -------------------------------------------------------------
function CitizenNewComplaintScreen({ token, citizen, onComplaintCreated }) {
  const [institutions, setInstitutions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [selectedInst, setSelectedInst] = useState(null);
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  // Field Evidence: Geotag & Photo
  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoName, setPhotoName] = useState(null);
  const [locationCoords, setLocationCoords] = useState(null);
  const [locationAddress, setLocationAddress] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Document attachment
  const [docBase64, setDocBase64] = useState(null);
  const [docName, setDocName] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Institution Search Modal
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [insts, cats] = await Promise.all([getInstitutions(""), getCategories()]);
        setInstitutions(insts || []);
        const cList = cats.categories || ["Infrastructure", "Faculty", "Fees", "Admissions", "Academic Quality"];
        setCategories(cList);
        if (cList.length > 0) setCategory(cList[0]);
        if (insts && insts.length > 0) setSelectedInst(insts[0]);
      } catch (err) {
        console.warn("Failed to load metadata", err);
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, []);

  const handleCapturePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoBase64(reader.result);
      fetchCurrentGps();
    };
    reader.readAsDataURL(file);
  };

  const handleAttachDocument = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setDocBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const fetchCurrentGps = () => {
    if (!navigator.geolocation) {
      setLocationAddress("GPS Geolocation not supported in this browser");
      return;
    }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocationCoords({ latitude, longitude });
        setLocationAddress(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
        setLoadingLocation(false);
      },
      (err) => {
        console.warn("Geo error", err);
        setLocationAddress("GPS Coordinates unavailable");
        setLoadingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInst) {
      setErrorMsg("Please select an approved institution.");
      return;
    }
    if (!category) {
      setErrorMsg("Please select a grievance category.");
      return;
    }
    if (subject.trim().length < 3) {
      setErrorMsg("Subject must be at least 3 characters.");
      return;
    }
    if (description.trim().length < 10) {
      setErrorMsg("Description must be at least 10 characters.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      institution_id: selectedInst.id,
      category,
      subject: subject.trim(),
      description: description.trim(),
      is_urgent: isUrgent,
      geo_latitude: locationCoords?.latitude || null,
      geo_longitude: locationCoords?.longitude || null,
      geo_address: locationAddress || null,
      photo_base64: photoBase64,
      photo_name: photoName,
      document_base64: docBase64,
      document_name: docName,
    };

    try {
      const res = await fileComplaint(token, payload);
      onComplaintCreated(res.case_id);
    } catch (err) {
      setErrorMsg(err.message || "Failed to register complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 pb-6 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-1.5">
          <PlusCircle size={18} className="text-sky-400" /> Lodge New Grievance
        </h2>
        <p className="text-[11px] text-slate-400">
          Logged in as <span className="text-slate-300 font-semibold">{citizen.email}</span>
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-2.5 text-xs text-rose-300">
          <AlertTriangle size={14} className="shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)}><X size={12} /></button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {/* Institution Selector */}
        <div>
          <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Approved Institution *
          </label>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="mt-1 flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2.5 text-left text-white hover:border-slate-700"
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 size={16} className="text-sky-400 shrink-0" />
              <span className="truncate">
                {selectedInst ? `${selectedInst.name} (${selectedInst.code})` : "Select Institution..."}
              </span>
            </div>
            <ChevronRight size={14} className="text-slate-500 shrink-0" />
          </button>
        </div>

        {/* Category Selector */}
        <div>
          <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Grievance Category *
          </label>
          <select
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2 text-white outline-none focus:border-sky-500"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Subject *
          </label>
          <input
            type="text"
            required
            placeholder="Brief summary of the grievance"
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-sky-500"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Detailed Description *
          </label>
          <textarea
            required
            rows={3}
            placeholder="Provide specific details, dates, and background regarding this issue..."
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-white placeholder-slate-500 outline-none focus:border-sky-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Urgent Switch */}
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <div>
            <span className="font-semibold text-white">Mark as High Priority / Urgent</span>
            <p className="text-[10px] text-slate-400">Escalates ticket directly to AICTE priority review</p>
          </div>
          <input
            type="checkbox"
            checked={isUrgent}
            onChange={(e) => setIsUrgent(e.target.checked)}
            className="h-4 w-4 rounded accent-sky-500"
          />
        </div>

        {/* Field Evidence: Geotag Photo */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Camera size={14} className="text-sky-400" /> Field Photo (With Geotag)
            </span>
            {photoBase64 && (
              <button
                type="button"
                onClick={() => {
                  setPhotoBase64(null);
                  setPhotoName(null);
                  setLocationCoords(null);
                  setLocationAddress("");
                }}
                className="text-[10px] text-rose-400 hover:underline"
              >
                Remove
              </button>
            )}
          </div>

          {photoBase64 ? (
            <div className="mt-2 flex items-center gap-3">
              <img src={photoBase64} alt="Attached" className="h-14 w-14 rounded-lg object-cover border border-slate-700" />
              <div className="text-[11px]">
                <p className="text-slate-300 font-medium truncate max-w-[160px]">{photoName}</p>
                <p className="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5">
                  <MapPin size={10} className="text-emerald-400 shrink-0" />
                  {loadingLocation ? "Reading GPS coordinates..." : locationAddress || "GPS attached"}
                </p>
              </div>
            </div>
          ) : (
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 p-2.5 text-center text-slate-400 hover:border-sky-500 hover:text-sky-300">
              <UploadCloud size={14} />
              <span>Attach Image (Auto-embeds GPS)</span>
              <input type="file" accept="image/*" onChange={handleCapturePhoto} className="hidden" />
            </label>
          )}
        </div>

        {/* Supporting Document */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <FileText size={14} className="text-sky-400" /> Supporting Document (PDF / Doc)
            </span>
            {docName && (
              <button
                type="button"
                onClick={() => {
                  setDocBase64(null);
                  setDocName(null);
                }}
                className="text-[10px] text-rose-400 hover:underline"
              >
                Remove
              </button>
            )}
          </div>

          {docName ? (
            <p className="mt-1.5 text-[11px] text-emerald-400 truncate">Attached: {docName}</p>
          ) : (
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 p-2.5 text-center text-slate-400 hover:border-sky-500 hover:text-sky-300">
              <FileText size={14} />
              <span>Upload PDF, DOC, or TXT file</span>
              <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleAttachDocument} className="hidden" />
            </label>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || loadingMeta}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-xs font-bold text-white shadow-lg shadow-sky-600/30 hover:bg-sky-500 disabled:opacity-50"
        >
          {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {submitting ? "Transmitting Complaint..." : "Submit Grievance to AICTE"}
        </button>
      </form>

      {/* Institution Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[80%] w-full max-w-sm flex-col rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3">
              <h4 className="text-sm font-bold text-white">Select Institution</h4>
              <button type="button" onClick={() => setSearchOpen(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="mb-3 flex items-center rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search by college name or code..."
                className="ml-2 flex-1 bg-transparent text-xs text-white outline-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {institutions
                .filter(
                  (i) =>
                    !query.trim() ||
                    i.name.toLowerCase().includes(query.toLowerCase()) ||
                    i.code.toLowerCase().includes(query.toLowerCase())
                )
                .map((inst) => (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => {
                      setSelectedInst(inst);
                      setSearchOpen(false);
                    }}
                    className="flex w-full items-start gap-2.5 rounded-xl border border-slate-900 bg-slate-900/60 p-2.5 text-left hover:border-sky-500/50 hover:bg-slate-800/60"
                  >
                    <Building2 size={16} className="text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-white leading-snug">{inst.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Code: {inst.code} • {inst.city || "India"}</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 3. MY COMPLAINTS SCREEN
// -------------------------------------------------------------
function CitizenMyComplaintsScreen({ token, onTrackExternal }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDetails, setCaseDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getMyComplaints(token);
      setComplaints(data || []);
    } catch (err) {
      console.warn("My complaints error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const openDetail = async (c) => {
    setSelectedCase(c);
    setLoadingDetails(true);
    try {
      const details = await trackCase(c.case_id);
      setCaseDetails(details);
    } catch {
      setCaseDetails(c);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            <FolderOpen size={18} className="text-sky-400" /> My Grievances
          </h2>
          <p className="text-[11px] text-slate-400">Complaints filed from this account</p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-white"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <RefreshCw size={24} className="animate-spin text-sky-400 mb-2" />
          <span className="text-xs">Fetching complaint history...</span>
        </div>
      ) : complaints.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center text-slate-400">
          <FolderOpen size={32} className="mx-auto text-slate-600 mb-2" />
          <p className="text-xs font-semibold text-slate-300">No Complaints Lodged Yet</p>
          <p className="text-[11px] text-slate-500 mt-1">Tap the &quot;File Grievance&quot; tab to register your first ticket.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {complaints.map((c) => (
            <button
              key={c.id || c.case_id}
              type="button"
              onClick={() => openDetail(c)}
              className="flex w-full flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-left hover:border-slate-700 hover:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-sky-400">{c.case_id}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    c.status === "Resolved"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : c.status === "In Progress"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-sky-500/20 text-sky-400"
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <p className="text-xs font-semibold text-white truncate">{c.subject}</p>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>{c.institution_name}</span>
                <span>{c.registered_on}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Case Detail Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[85%] w-full max-w-sm flex-col rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div>
                <span className="font-mono text-xs font-bold text-sky-400">{selectedCase.case_id}</span>
                <p className="text-[10px] text-slate-400">{selectedCase.category}</p>
              </div>
              <button type="button" onClick={() => setSelectedCase(null)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 py-3 text-xs pr-1 scrollbar-thin">
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400">Subject</span>
                <p className="text-white font-semibold">{selectedCase.subject}</p>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400">Institution</span>
                <p className="text-slate-200">{selectedCase.institution_name} ({selectedCase.institution_code})</p>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400">Description</span>
                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed mt-0.5">{selectedCase.description}</p>
              </div>

              {selectedCase.geo_address && (
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Geotag Evidence</span>
                  <p className="text-emerald-400 flex items-center gap-1 mt-0.5">
                    <MapPin size={12} className="shrink-0" /> {selectedCase.geo_address}
                  </p>
                </div>
              )}

              {/* History Timeline */}
              {caseDetails?.history && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Lifecycle Audit Trail</span>
                  <div className="mt-2 space-y-2">
                    {caseDetails.history.map((h, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px]">
                        <Clock size={12} className="text-sky-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-white font-medium">{h.description}</p>
                          <p className="text-[9px] text-slate-500">{h.created_at ? new Date(h.created_at).toLocaleString() : ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const id = selectedCase.case_id;
                  setSelectedCase(null);
                  onTrackExternal(id);
                }}
                className="flex-1 rounded-xl bg-sky-600 py-2 text-center text-xs font-semibold text-white hover:bg-sky-500"
              >
                Track in Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 4. TRACK ANY CASE SCREEN
// -------------------------------------------------------------
function CitizenTrackCaseScreen({ initialCaseId }) {
  const [caseRef, setCaseRef] = useState(initialCaseId || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (initialCaseId) {
      setCaseRef(initialCaseId);
      handleTrack(initialCaseId);
    }
  }, [initialCaseId]);

  const handleTrack = async (overrideRef) => {
    const target = (overrideRef || caseRef).trim();
    if (!target) {
      setErrorMsg("Please enter a Case Reference ID (e.g. CMP-2026-000001)");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setData(null);
    try {
      const res = await trackCase(target);
      setData(res);
    } catch (err) {
      setErrorMsg(err.message || `No case found matching reference "${target}".`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-1.5">
          <Search size={18} className="text-sky-400" /> Track Any Grievance
        </h2>
        <p className="text-[11px] text-slate-400">Public tracking via Case Reference ID</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="e.g. CMP-2026-000001"
          className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono uppercase text-white placeholder-slate-500 outline-none focus:border-sky-500"
          value={caseRef}
          onChange={(e) => setCaseRef(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleTrack()}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => handleTrack()}
          className="rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : "Track"}
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {data && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <span className="font-mono text-sm font-bold text-sky-400">{data.case_id}</span>
              <p className="text-[10px] text-slate-400">{data.category}</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                data.status === "Resolved"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : data.status === "In Progress"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
              }`}
            >
              {data.status}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase text-slate-400">Subject</span>
            <p className="text-white font-semibold">{data.subject}</p>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase text-slate-400">Institution</span>
            <p className="text-slate-200">{data.institution_name} ({data.institution_code})</p>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase text-slate-400">Assigned Bureau</span>
            <p className="text-slate-300">{data.bureau || "Central Review Bureau"}</p>
          </div>

          {/* Timeline */}
          {data.history && data.history.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] font-semibold uppercase text-slate-400">Activity Timeline</span>
              <div className="mt-2.5 space-y-2 border-l border-slate-800 pl-3 ml-1">
                {data.history.map((h, i) => (
                  <div key={i} className="relative text-[11px]">
                    <div className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-sky-400" />
                    <p className="text-white font-medium">{h.description}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {h.actor_role} ({h.actor_name}) • {h.created_at ? new Date(h.created_at).toLocaleString() : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 5. PROFILE & SETTINGS SCREEN
// -------------------------------------------------------------
function CitizenProfileScreen({ citizen, onLogout }) {
  const [serverUrl, setServerUrl] = useState(getCitizenBaseUrl());
  const [editingUrl, setEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState(serverUrl);
  const [saveToast, setSaveToast] = useState(false);

  const handleSave = () => {
    setCitizenBaseUrl(tempUrl);
    setServerUrl(tempUrl);
    setEditingUrl(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-1.5">
          <UserRound size={18} className="text-sky-400" /> Account & Settings
        </h2>
        <p className="text-[11px] text-slate-400">Authenticated Citizen Profile</p>
      </div>

      {saveToast && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-2.5 text-xs text-emerald-300">
          Server endpoint updated successfully!
        </div>
      )}

      {/* Profile Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-500/20 text-sky-400 font-bold text-lg">
            {citizen.full_name ? citizen.full_name[0].toUpperCase() : citizen.email[0].toUpperCase()}
          </div>
          <div className="flex-1 truncate">
            <h3 className="text-sm font-bold text-white truncate">{citizen.full_name || "Citizen User"}</h3>
            <p className="text-xs text-slate-400 truncate">{citizen.email}</p>
            {citizen.phone && <p className="text-[11px] text-slate-500">+91 {citizen.phone}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-400">
          <ShieldCheck size={14} />
          <span>Email Authenticated (Google Apps Script / Brevo)</span>
        </div>
      </div>

      {/* Server Endpoint Settings */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Server size={14} className="text-sky-400" /> Backend API Endpoint
          </span>
          <button
            type="button"
            onClick={() => setEditingUrl(!editingUrl)}
            className="text-[11px] text-sky-400 hover:underline"
          >
            {editingUrl ? "Cancel" : "Edit"}
          </button>
        </div>

        {editingUrl ? (
          <div className="space-y-2 pt-1">
            <input
              type="text"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
            />
            <button
              type="button"
              onClick={handleSave}
              className="w-full rounded-xl bg-sky-600 py-2 text-xs font-bold text-white hover:bg-sky-500"
            >
              Save Endpoint
            </button>
          </div>
        ) : (
          <p className="font-mono text-[11px] text-slate-400 break-all bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            {serverUrl}
          </p>
        )}
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20"
      >
        <LogOut size={14} /> End Citizen Session
      </button>
    </div>
  );
}
