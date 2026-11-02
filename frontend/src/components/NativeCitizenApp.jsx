import { useState, useEffect, useRef } from "react";
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
  Video,
} from "lucide-react";
import { useTheme } from "../theme";
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

export default function NativeCitizenApp({ themeOverride }) {
  const { theme: ctxTheme } = useTheme() || {};
  const currentTheme = themeOverride || ctxTheme || "light";
  const isDark = currentTheme === "dark";

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
    <div
      className={`relative flex h-full w-full flex-col font-sans select-none overflow-hidden transition-colors duration-200 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Top Phone Status Bar Simulation */}
      <div
        className={`flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold tracking-wider transition-colors ${
          isDark ? "text-slate-400" : "text-slate-600"
        }`}
      >
        <span>9:41</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]">5G</span>
          <div className={`h-2.5 w-5 rounded-[3px] border p-0.5 ${isDark ? "border-slate-400" : "border-slate-500"}`}>
            <div className={`h-full w-full rounded-[1px] ${isDark ? "bg-emerald-400" : "bg-emerald-600"}`} />
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div
        className={`relative flex-1 overflow-y-auto overflow-x-hidden transition-colors ${
          isDark ? "bg-slate-900/60 scrollbar-thumb-slate-700" : "bg-slate-100/70 scrollbar-thumb-slate-300"
        }`}
      >
        {!token || !citizen ? (
          <CitizenAuthScreen onLoginSuccess={handleLoginSuccess} isDark={isDark} />
        ) : (
          <>
            {activeTab === "new" && (
              <CitizenNewComplaintScreen
                token={token}
                citizen={citizen}
                onComplaintCreated={handleComplaintCreated}
                isDark={isDark}
              />
            )}
            {activeTab === "my" && (
              <CitizenMyComplaintsScreen
                token={token}
                onTrackExternal={(caseId) => {
                  setPrefilledTrackCaseId(caseId);
                  setActiveTab("track");
                }}
                isDark={isDark}
              />
            )}
            {activeTab === "track" && (
              <CitizenTrackCaseScreen initialCaseId={prefilledTrackCaseId} isDark={isDark} />
            )}
            {activeTab === "profile" && (
              <CitizenProfileScreen citizen={citizen} onLogout={handleLogout} isDark={isDark} />
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      {token && citizen && (
        <nav
          className={`flex items-center justify-around border-t py-2 px-1 backdrop-blur-md transition-colors ${
            isDark ? "border-slate-800/80 bg-slate-950/95" : "border-slate-200 bg-white/95 shadow-md"
          }`}
        >
          <TabButton
            active={activeTab === "new"}
            onClick={() => setActiveTab("new")}
            icon={<PlusCircle size={20} />}
            label="File Grievance"
            isDark={isDark}
          />
          <TabButton
            active={activeTab === "my"}
            onClick={() => setActiveTab("my")}
            icon={<FolderOpen size={20} />}
            label="My Cases"
            isDark={isDark}
          />
          <TabButton
            active={activeTab === "track"}
            onClick={() => setActiveTab("track")}
            icon={<Search size={20} />}
            label="Track Any"
            isDark={isDark}
          />
          <TabButton
            active={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
            icon={<UserRound size={20} />}
            label="Account"
            isDark={isDark}
          />
        </nav>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label, isDark }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center justify-center py-1 transition-all ${
        active
          ? isDark
            ? "text-sky-400 font-semibold"
            : "text-blue-600 font-bold"
          : isDark
          ? "text-slate-400 hover:text-slate-200"
          : "text-slate-500 hover:text-slate-900"
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
function CitizenAuthScreen({ onLoginSuccess, isDark }) {
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
            <div
              className={`grid h-8 w-8 place-items-center rounded-xl ${
                isDark ? "bg-sky-500/20 text-sky-400" : "bg-blue-100 text-blue-600 border border-blue-200"
              }`}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                AICTE Grievance Portal
              </h2>
              <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Citizen & Student Mobile Access
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className={`rounded-lg border p-1.5 transition ${
              isDark
                ? "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                : "border-slate-300 bg-white text-slate-600 hover:text-slate-900 shadow-xs"
            }`}
            title="Configure Server URL"
          >
            <Server size={14} />
          </button>
        </div>

        {/* Server Config Drawer */}
        {showConfig && (
          <div
            className={`mb-4 rounded-xl border p-3 text-xs ${
              isDark ? "border-sky-500/30 bg-sky-950/40 text-slate-200" : "border-blue-300 bg-blue-50/80 text-slate-800"
            }`}
          >
            <span className={`font-semibold ${isDark ? "text-sky-300" : "text-blue-900"}`}>Backend API URL</span>
            <input
              type="text"
              className={`mt-1.5 w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none focus:border-sky-500 ${
                isDark ? "border-slate-700 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-900"
              }`}
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className={`rounded-md px-2 py-1 ${isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
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
                ? isDark
                  ? "border-rose-500/30 bg-rose-950/40 text-rose-300"
                  : "border-rose-300 bg-rose-50 text-rose-800"
                : isDark
                ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
                : "border-emerald-300 bg-emerald-50 text-emerald-800"
            }`}
          >
            {msg.type === "error" ? (
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            )}
            <div className="flex-1">{msg.text}</div>
            <button
              type="button"
              onClick={() => setMsg(null)}
              className={isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Card */}
        <div
          className={`rounded-2xl border p-5 shadow-xl transition-colors ${
            isDark
              ? "border-slate-800 bg-slate-900/90 text-white"
              : "border-slate-200 bg-white text-slate-800 shadow-slate-200/50"
          }`}
        >
          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  Sign In / Authenticate
                </h3>
                <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Enter your email address to receive a secure one-time verification code.
                </p>
              </div>

              <div>
                <label className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Email Address *
                </label>
                <div
                  className={`mt-1.5 flex items-center rounded-xl border px-3 py-2 focus-within:border-sky-500 ${
                    isDark ? "border-slate-800 bg-slate-950/80" : "border-slate-300 bg-slate-50"
                  }`}
                >
                  <Mail size={16} className={isDark ? "text-slate-400" : "text-slate-500"} />
                  <input
                    type="email"
                    required
                    placeholder="e.g. rahul.sharma@example.com"
                    className={`ml-2.5 flex-1 bg-transparent text-xs outline-none ${
                      isDark ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"
                    }`}
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
                  <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    Enter 6-Digit Code
                  </h3>
                  <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Code sent to <span className={`font-semibold ${isDark ? "text-sky-400" : "text-blue-600"}`}>{email}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className={`text-[11px] font-semibold hover:underline ${isDark ? "text-sky-400" : "text-blue-600"}`}
                >
                  Change
                </button>
              </div>

              <div>
                <label className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  6-Digit OTP Code *
                </label>
                <div
                  className={`mt-1.5 flex items-center rounded-xl border px-3 py-2 focus-within:border-sky-500 ${
                    isDark ? "border-slate-800 bg-slate-950/80" : "border-slate-300 bg-slate-50"
                  }`}
                >
                  <Key size={16} className={isDark ? "text-slate-400" : "text-slate-500"} />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="123456"
                    className={`ml-2.5 flex-1 bg-transparent text-sm font-mono tracking-widest outline-none ${
                      isDark ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"
                    }`}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Full Name (Optional)
                </label>
                <div
                  className={`mt-1.5 flex items-center rounded-xl border px-3 py-2 focus-within:border-sky-500 ${
                    isDark ? "border-slate-800 bg-slate-950/80" : "border-slate-300 bg-slate-50"
                  }`}
                >
                  <User size={16} className={isDark ? "text-slate-400" : "text-slate-500"} />
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    className={`ml-2.5 flex-1 bg-transparent text-xs outline-none ${
                      isDark ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"
                    }`}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Mobile Phone (Optional)
                </label>
                <div
                  className={`mt-1.5 flex items-center rounded-xl border px-3 py-2 focus-within:border-sky-500 ${
                    isDark ? "border-slate-800 bg-slate-950/80" : "border-slate-300 bg-slate-50"
                  }`}
                >
                  <Phone size={16} className={isDark ? "text-slate-400" : "text-slate-500"} />
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    className={`ml-2.5 flex-1 bg-transparent text-xs outline-none ${
                      isDark ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"
                    }`}
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
                {loading ? "Authenticating..." : "Verify & Enter Portal"}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className={`text-[11px] font-semibold hover:underline ${isDark ? "text-sky-400" : "text-blue-600"}`}
                >
                  Resend Code
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className={`pt-4 pb-2 text-center text-[10px] ${isDark ? "text-slate-400" : "text-slate-600"}`}>
        <span>AICTE Central Redressal System • 256-bit Encrypted</span>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. NEW COMPLAINT SCREEN (With Live Laptop Webcam Viewfinder)
// -------------------------------------------------------------
function CitizenNewComplaintScreen({ token, citizen, onComplaintCreated, isDark }) {
  const [institutions, setInstitutions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [selectedInst, setSelectedInst] = useState(null);
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  // Field evidence: Geotag Photo & Document
  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoName, setPhotoName] = useState(null);
  const [locationCoords, setLocationCoords] = useState(null);
  const [locationAddress, setLocationAddress] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(false);

  const [docBase64, setDocBase64] = useState(null);
  const [docName, setDocName] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Institution Search Modal
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Live Laptop Camera Viewfinder
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

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

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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

  const startCamera = async () => {
    setCameraError(null);
    setCameraActive(true);
    fetchCurrentGps();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Camera access denied or webcam not available on this device.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraError(null);
  };

  const captureFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw official evidence watermark
    const now = new Date().toLocaleString();
    const latLon = locationCoords
      ? `Lat: ${locationCoords.latitude.toFixed(4)}, Lon: ${locationCoords.longitude.toFixed(4)}`
      : locationAddress || "GPS Geotagged";

    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, canvas.height - 44, canvas.width, 44);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(`AICTE CITIZEN EVIDENCE • ${latLon} • ${now}`, 14, canvas.height - 18);

    const base64 = canvas.toDataURL("image/jpeg", 0.85);
    setPhotoBase64(base64);
    setPhotoName(`Webcam_Evidence_${Date.now()}.jpg`);
    stopCamera();
  };

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
      setErrorMsg("Please provide a valid subject (at least 3 characters).");
      return;
    }
    if (description.trim().length < 10) {
      setErrorMsg("Please describe your grievance in detail (at least 10 characters).");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        institution_id: selectedInst.id,
        category,
        subject: subject.trim(),
        description: description.trim(),
        is_urgent: isUrgent,
        geo_address: locationAddress || null,
        geo_lat: locationCoords?.latitude || null,
        geo_lng: locationCoords?.longitude || null,
        photo_filename: photoName || null,
        photo_base64: photoBase64 || null,
        doc_filename: docName || null,
        doc_base64: docBase64 || null,
      };

      const res = await fileComplaint(token, payload);
      if (res && res.complaint && res.complaint.case_id) {
        onComplaintCreated(res.complaint.case_id);
      } else {
        throw new Error("Unable to create complaint. Server did not return a valid Case ID.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to lodge complaint. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative p-4 space-y-4">
      {/* Top Banner */}
      <div>
        <h2 className={`text-base font-bold flex items-center gap-1.5 ${isDark ? "text-white" : "text-slate-900"}`}>
          <PlusCircle size={18} className={isDark ? "text-sky-400" : "text-blue-600"} />
          Lodge Citizen Grievance
        </h2>
        <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Registered under citizen: <span className={`font-semibold ${isDark ? "text-sky-400" : "text-blue-600"}`}>{citizen.email}</span>
        </p>
      </div>

      {errorMsg && (
        <div
          className={`flex items-start gap-2 rounded-xl border p-3 text-xs leading-relaxed ${
            isDark ? "border-rose-500/30 bg-rose-950/40 text-rose-300" : "border-rose-300 bg-rose-50 text-rose-800"
          }`}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
          <button type="button" onClick={() => setErrorMsg(null)} className="opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {/* Institution Selector */}
        <div>
          <label className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            AICTE Approved Institution *
          </label>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={`mt-1.5 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${
              isDark
                ? "border-slate-800 bg-slate-950/80 hover:border-slate-700"
                : "border-slate-300 bg-white hover:border-blue-400 shadow-xs"
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 size={16} className={isDark ? "text-sky-400 shrink-0" : "text-blue-600 shrink-0"} />
              <div className="truncate">
                <p className={`font-semibold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                  {selectedInst ? selectedInst.name : "Select an institution..."}
                </p>
                {selectedInst && (
                  <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Code: {selectedInst.code} • {selectedInst.city || "India"}
                  </p>
                )}
              </div>
            </div>
            <ChevronRight size={16} className={isDark ? "text-slate-500" : "text-slate-400"} />
          </button>
        </div>

        {/* Grievance Category */}
        <div>
          <label className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            Grievance Category *
          </label>
          <select
            className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-xs outline-none focus:border-sky-500 ${
              isDark ? "border-slate-800 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-900 shadow-xs"
            }`}
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
          <label className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            Subject / Headline *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Inadequate lab equipment in Computer Center"
            className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-xs outline-none focus:border-sky-500 ${
              isDark
                ? "border-slate-800 bg-slate-950/80 text-white placeholder-slate-500"
                : "border-slate-300 bg-white text-slate-900 placeholder-slate-400 shadow-xs"
            }`}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* Detailed Description */}
        <div>
          <label className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            Detailed Grievance Description *
          </label>
          <textarea
            rows={3}
            required
            placeholder="Describe the issue, dates, personnel involved and impact..."
            className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-xs outline-none focus:border-sky-500 resize-none ${
              isDark
                ? "border-slate-800 bg-slate-950/80 text-white placeholder-slate-500"
                : "border-slate-300 bg-white text-slate-900 placeholder-slate-400 shadow-xs"
            }`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Urgent Toggle */}
        <div
          className={`flex items-center justify-between rounded-xl border p-3 ${
            isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white shadow-xs"
          }`}
        >
          <div>
            <span className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Urgent Attention Needed</span>
            <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Escalates ticket directly to AICTE priority review
            </p>
          </div>
          <input
            type="checkbox"
            checked={isUrgent}
            onChange={(e) => setIsUrgent(e.target.checked)}
            className="h-4 w-4 rounded accent-sky-500"
          />
        </div>

        {/* Field Evidence: Geotag Photo (With Laptop Camera Option) */}
        <div
          className={`rounded-xl border p-3 ${
            isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-semibold flex items-center gap-1.5 ${isDark ? "text-white" : "text-slate-900"}`}>
              <Camera size={14} className={isDark ? "text-sky-400" : "text-blue-600"} />
              Field Photo (With Geotag)
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
                className="text-[10px] text-rose-500 hover:underline font-semibold"
              >
                Remove
              </button>
            )}
          </div>

          {photoBase64 ? (
            <div className="mt-2 flex items-center gap-3">
              <img
                src={photoBase64}
                alt="Attached"
                className={`h-14 w-14 rounded-lg object-cover border ${
                  isDark ? "border-slate-700" : "border-slate-300"
                }`}
              />
              <div className="text-[11px]">
                <p className={`font-medium truncate max-w-[160px] ${isDark ? "text-slate-300" : "text-slate-800"}`}>
                  {photoName}
                </p>
                <p className={`text-[10px] flex items-center gap-1 mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  <MapPin size={10} className="text-emerald-500 shrink-0" />
                  {loadingLocation ? "Reading GPS coordinates..." : locationAddress || "GPS attached"}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2">
              {/* Laptop Camera Button */}
              <button
                type="button"
                onClick={startCamera}
                className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-500 transition"
              >
                <Video size={14} />
                <span>Take Photo with Laptop Camera</span>
              </button>

              {/* Or File Upload */}
              <label
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-2 text-center transition ${
                  isDark
                    ? "border-slate-700 text-slate-400 hover:border-sky-500 hover:text-sky-300"
                    : "border-slate-300 text-slate-600 hover:border-blue-500 hover:text-blue-700 bg-slate-50"
                }`}
              >
                <UploadCloud size={14} />
                <span className="text-[11px]">Or upload image from file</span>
                <input type="file" accept="image/*" onChange={handleCapturePhoto} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {/* Supporting Document */}
        <div
          className={`rounded-xl border p-3 ${
            isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-semibold flex items-center gap-1.5 ${isDark ? "text-white" : "text-slate-900"}`}>
              <FileText size={14} className={isDark ? "text-sky-400" : "text-blue-600"} />
              Supporting Document (PDF / Doc)
            </span>
            {docName && (
              <button
                type="button"
                onClick={() => {
                  setDocBase64(null);
                  setDocName(null);
                }}
                className="text-[10px] text-rose-500 hover:underline font-semibold"
              >
                Remove
              </button>
            )}
          </div>

          {docName ? (
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              <FileText size={16} className={isDark ? "text-sky-400" : "text-blue-600"} />
              <span className={`truncate max-w-[200px] font-medium ${isDark ? "text-slate-300" : "text-slate-800"}`}>
                {docName}
              </span>
            </div>
          ) : (
            <label
              className={`mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-2 text-center transition ${
                isDark
                  ? "border-slate-700 text-slate-400 hover:border-sky-500 hover:text-sky-300"
                  : "border-slate-300 text-slate-600 hover:border-blue-500 hover:text-blue-700 bg-slate-50"
              }`}
            >
              <UploadCloud size={14} />
              <span className="text-[11px]">Attach document evidence</span>
              <input type="file" accept=".pdf,.doc,.docx" onChange={handleAttachDocument} className="hidden" />
            </label>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || loadingMeta}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-xs font-bold text-white shadow-lg shadow-sky-600/30 hover:bg-sky-500 disabled:opacity-50 transition"
        >
          {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {submitting ? "Transmitting Complaint..." : "Submit Grievance to AICTE"}
        </button>
      </form>

      {/* Live Laptop Camera Viewfinder Overlay (Inside Phone Frame) */}
      {cameraActive && (
        <div className="absolute inset-0 z-50 flex flex-col bg-black text-white p-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Camera size={16} className="text-sky-400" />
              <span className="text-xs font-bold text-white">Laptop Camera Viewfinder</span>
            </div>
            <button
              type="button"
              onClick={stopCamera}
              className="rounded-full bg-slate-800 p-1.5 text-slate-300 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* Live GPS status */}
          <div className="my-2 flex items-center justify-between rounded-lg bg-slate-900/90 px-2.5 py-1 text-[11px] text-emerald-400 border border-emerald-500/30">
            <div className="flex items-center gap-1 truncate">
              <MapPin size={12} className="shrink-0 animate-pulse" />
              <span className="truncate">{loadingLocation ? "Locating GPS..." : locationAddress || "GPS Active"}</span>
            </div>
            <button
              type="button"
              onClick={fetchCurrentGps}
              className="text-[10px] text-sky-400 underline ml-2 shrink-0"
            >
              Refresh GPS
            </button>
          </div>

          {/* Video viewport */}
          <div className="relative flex-1 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-800">
            {cameraError ? (
              <div className="p-4 text-center">
                <AlertTriangle size={32} className="mx-auto text-amber-400 mb-2" />
                <p className="text-xs text-rose-300 font-semibold">{cameraError}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Please allow camera permission in your browser or upload an image file instead.
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-3 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Retry Camera
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="h-full w-full object-cover"
                />
                {/* Visual target reticle */}
                <div className="pointer-events-none absolute inset-4 border border-dashed border-white/30 rounded-xl" />
              </>
            )}
          </div>

          {/* Bottom shutter bar */}
          <div className="flex items-center justify-around pt-3 pb-2">
            <button
              type="button"
              onClick={stopCamera}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>

            {!cameraError && (
              <button
                type="button"
                onClick={captureFromCamera}
                className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-sky-400 bg-white text-sky-600 shadow-xl transition active:scale-95 hover:bg-slate-100"
                title="Capture Geotagged Photo"
              >
                <Camera size={24} />
              </button>
            )}

            <label className="text-xs text-sky-400 hover:underline cursor-pointer">
              Upload File
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  stopCamera();
                  handleCapturePhoto(e);
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Institution Search Modal (Contained Strictly Inside Phone Screen) */}
      {searchOpen && (
        <div className="absolute inset-0 z-50 flex flex-col bg-black/75 p-3 backdrop-blur-xs">
          <div
            className={`flex max-h-full w-full flex-1 flex-col rounded-2xl border p-4 shadow-2xl overflow-hidden ${
              isDark ? "border-slate-800 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <h4 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Select Institution</h4>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className={isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}
              >
                <X size={16} />
              </button>
            </div>
            <div
              className={`my-3 flex items-center rounded-xl border px-3 py-1.5 ${
                isDark ? "border-slate-800 bg-slate-900" : "border-slate-300 bg-slate-50"
              }`}
            >
              <Search size={14} className={isDark ? "text-slate-400" : "text-slate-500"} />
              <input
                type="text"
                placeholder="Search by college name or code..."
                className={`ml-2 flex-1 bg-transparent text-xs outline-none ${
                  isDark ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"
                }`}
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
                    className={`flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition ${
                      isDark
                        ? "border-slate-900 bg-slate-900/60 hover:border-sky-500/50 hover:bg-slate-800/60"
                        : "border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
                    }`}
                  >
                    <Building2 size={16} className={`${isDark ? "text-sky-400" : "text-blue-600"} shrink-0 mt-0.5`} />
                    <div>
                      <p className={`text-xs font-semibold leading-snug ${isDark ? "text-white" : "text-slate-900"}`}>
                        {inst.name}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Code: {inst.code} • {inst.city || "India"}
                      </p>
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
// 3. MY COMPLAINTS SCREEN (With In-Phone Grievance Modal)
// -------------------------------------------------------------
function CitizenMyComplaintsScreen({ token, onTrackExternal, isDark }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDetails, setCaseDetails] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await getMyComplaints(token);
      setComplaints(res.complaints || []);
    } catch (err) {
      console.warn("Failed to load complaints", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [token]);

  const handleOpenDetail = async (c) => {
    setSelectedCase(c);
    setLoadingDetail(true);
    try {
      const detail = await trackCase(c.case_id);
      setCaseDetails(detail);
    } catch {
      setCaseDetails(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="relative p-4 space-y-3 min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-base font-bold flex items-center gap-1.5 ${isDark ? "text-white" : "text-slate-900"}`}>
            <FolderOpen size={18} className={isDark ? "text-sky-400" : "text-blue-600"} />
            My Grievances
          </h2>
          <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Complaints filed from this account</p>
        </div>
        <button
          type="button"
          onClick={fetchList}
          className={`rounded-lg border p-1.5 transition ${
            isDark
              ? "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
              : "border-slate-300 bg-white text-slate-600 hover:text-slate-900 shadow-xs"
          }`}
          title="Refresh List"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <RefreshCw size={24} className={`mx-auto animate-spin ${isDark ? "text-sky-400" : "text-blue-600"}`} />
          <p className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Loading grievance records...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div
          className={`rounded-2xl border p-6 text-center ${
            isDark ? "border-slate-800 bg-slate-900/40 text-slate-400" : "border-slate-200 bg-white text-slate-500 shadow-xs"
          }`}
        >
          <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold">No complaints registered yet</p>
          <p className="mt-1 text-[10px]">Use the "File Grievance" tab to lodge your first official issue.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {complaints.map((c) => (
            <button
              key={c.case_id}
              type="button"
              onClick={() => handleOpenDetail(c)}
              className={`w-full rounded-2xl border p-3.5 text-left transition ${
                isDark
                  ? "border-slate-800 bg-slate-900/90 hover:border-sky-500/50 hover:bg-slate-800/80"
                  : "border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between pb-1.5">
                <span className={`font-mono text-xs font-bold ${isDark ? "text-sky-400" : "text-blue-600"}`}>
                  {c.case_id}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    c.status === "Resolved"
                      ? "bg-emerald-500/20 text-emerald-500"
                      : c.status === "In Progress"
                      ? "bg-amber-500/20 text-amber-500"
                      : isDark
                      ? "bg-sky-500/20 text-sky-400"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <p className={`text-xs font-semibold truncate ${isDark ? "text-white" : "text-slate-900"}`}>{c.subject}</p>
              <div className={`mt-1 flex items-center justify-between text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                <span className="truncate max-w-[150px]">{c.institution_name}</span>
                <span>{c.registered_on}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Case Detail Modal (Contained Strictly Inside the Phone Frame) */}
      {selectedCase && (
        <div className="absolute inset-0 z-50 flex flex-col bg-black/75 p-3 backdrop-blur-xs">
          <div
            className={`flex max-h-full w-full flex-1 flex-col rounded-2xl border p-4 shadow-2xl overflow-hidden ${
              isDark ? "border-slate-800 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between border-b pb-2.5 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <div>
                <span className={`font-mono text-xs font-bold ${isDark ? "text-sky-400" : "text-blue-600"}`}>
                  {selectedCase.case_id}
                </span>
                <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{selectedCase.category}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className={`rounded-lg p-1 ${isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-3 py-3 text-xs pr-1 scrollbar-thin">
              <div>
                <span className={`text-[10px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Subject
                </span>
                <p className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{selectedCase.subject}</p>
              </div>

              <div>
                <span className={`text-[10px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Institution
                </span>
                <p className={isDark ? "text-slate-200" : "text-slate-700"}>
                  {selectedCase.institution_name} ({selectedCase.institution_code})
                </p>
              </div>

              <div>
                <span className={`text-[10px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Description
                </span>
                <p className={`whitespace-pre-wrap leading-relaxed mt-0.5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {selectedCase.description}
                </p>
              </div>

              {selectedCase.geo_address && (
                <div>
                  <span className={`text-[10px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Geotag Evidence
                  </span>
                  <p className="text-emerald-500 flex items-center gap-1 mt-0.5 font-medium">
                    <MapPin size={12} className="shrink-0" /> {selectedCase.geo_address}
                  </p>
                </div>
              )}

              {/* History Timeline */}
              {loadingDetail ? (
                <div className="py-4 text-center">
                  <RefreshCw size={16} className={`mx-auto animate-spin ${isDark ? "text-sky-400" : "text-blue-600"}`} />
                  <p className={`mt-1 text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Loading case timeline...</p>
                </div>
              ) : caseDetails?.history && (
                <div className={`pt-2 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                  <span className={`text-[10px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Lifecycle Audit Trail
                  </span>
                  <div className="mt-2 space-y-2">
                    {caseDetails.history.map((h, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px]">
                        <Clock size={12} className={`${isDark ? "text-sky-400" : "text-blue-600"} shrink-0 mt-0.5`} />
                        <div>
                          <p className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{h.description}</p>
                          <p className={`text-[9px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            {h.created_at ? new Date(h.created_at).toLocaleString() : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className={`pt-2 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <button
                type="button"
                onClick={() => {
                  const id = selectedCase.case_id;
                  setSelectedCase(null);
                  onTrackExternal(id);
                }}
                className="w-full rounded-xl bg-sky-600 py-2.5 text-center text-xs font-bold text-white hover:bg-sky-500 shadow-sm"
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
function CitizenTrackCaseScreen({ initialCaseId, isDark }) {
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
        <h2 className={`text-base font-bold flex items-center gap-1.5 ${isDark ? "text-white" : "text-slate-900"}`}>
          <Search size={18} className={isDark ? "text-sky-400" : "text-blue-600"} />
          Track Any Grievance
        </h2>
        <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Public tracking via Case Reference ID</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="e.g. CMP-2026-000001"
          className={`flex-1 rounded-xl border px-3 py-2 text-xs font-mono uppercase outline-none focus:border-sky-500 ${
            isDark
              ? "border-slate-800 bg-slate-950 text-white placeholder-slate-500"
              : "border-slate-300 bg-white text-slate-900 placeholder-slate-400 shadow-xs"
          }`}
          value={caseRef}
          onChange={(e) => setCaseRef(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleTrack()}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => handleTrack()}
          className="rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50 shadow-sm"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : "Track"}
        </button>
      </div>

      {errorMsg && (
        <div
          className={`rounded-xl border p-3 text-xs flex items-start gap-2 ${
            isDark ? "border-rose-500/30 bg-rose-950/40 text-rose-300" : "border-rose-300 bg-rose-50 text-rose-800"
          }`}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {data && (
        <div
          className={`rounded-2xl border p-4 space-y-3 text-xs shadow-md ${
            isDark ? "border-slate-800 bg-slate-900/90 text-white" : "border-slate-200 bg-white text-slate-900 shadow-slate-200/50"
          }`}
        >
          <div className={`flex items-center justify-between border-b pb-2.5 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
            <div>
              <span className={`font-mono text-sm font-bold ${isDark ? "text-sky-400" : "text-blue-600"}`}>
                {data.case_id}
              </span>
              <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{data.category}</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                data.status === "Resolved"
                  ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                  : data.status === "In Progress"
                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                  : isDark
                  ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                  : "bg-blue-100 text-blue-700 border border-blue-200"
              }`}
            >
              {data.status}
            </span>
          </div>

          <div>
            <span className={`text-[10px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Subject
            </span>
            <p className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{data.subject}</p>
          </div>

          <div>
            <span className={`text-[10px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Institution
            </span>
            <p className={isDark ? "text-slate-200" : "text-slate-700"}>
              {data.institution_name} ({data.institution_code})
            </p>
          </div>

          <div>
            <span className={`text-[10px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Assigned Bureau
            </span>
            <p className={isDark ? "text-slate-300" : "text-slate-700"}>{data.bureau || "Central Review Bureau"}</p>
          </div>

          {/* Timeline */}
          {data.history && data.history.length > 0 && (
            <div className={`pt-2 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <span className={`text-[10px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Activity Timeline
              </span>
              <div className={`mt-2.5 space-y-2 border-l pl-3 ml-1 ${isDark ? "border-slate-800" : "border-slate-300"}`}>
                {data.history.map((h, i) => (
                  <div key={i} className="relative text-[11px]">
                    <div className={`absolute -left-[17px] top-1 h-2 w-2 rounded-full ${isDark ? "bg-sky-400" : "bg-blue-600"}`} />
                    <p className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{h.description}</p>
                    <p className={`text-[9px] mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
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
function CitizenProfileScreen({ citizen, onLogout, isDark }) {
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
        <h2 className={`text-base font-bold flex items-center gap-1.5 ${isDark ? "text-white" : "text-slate-900"}`}>
          <UserRound size={18} className={isDark ? "text-sky-400" : "text-blue-600"} />
          Citizen Profile
        </h2>
        <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Session authentication & preferences</p>
      </div>

      {saveToast && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-500 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Server URL successfully updated.</span>
        </div>
      )}

      {/* Account Card */}
      <div
        className={`rounded-2xl border p-4 space-y-3 ${
          isDark ? "border-slate-800 bg-slate-900/90 text-white" : "border-slate-200 bg-white text-slate-900 shadow-xs"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`grid h-12 w-12 place-items-center rounded-2xl ${
              isDark ? "bg-sky-500/20 text-sky-400" : "bg-blue-100 text-blue-600"
            }`}
          >
            <UserRound size={24} />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              {citizen.full_name || "Verified Citizen"}
            </h3>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{citizen.email}</p>
          </div>
        </div>

        <div className={`space-y-1.5 pt-2 border-t text-xs ${isDark ? "border-slate-800 text-slate-300" : "border-slate-200 text-slate-700"}`}>
          <div className="flex justify-between">
            <span className={isDark ? "text-slate-500" : "text-slate-400"}>Phone</span>
            <span>{citizen.phone || "Not configured"}</span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? "text-slate-500" : "text-slate-400"}>Auth Provider</span>
            <span>Secure Email OTP</span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? "text-slate-500" : "text-slate-400"}>Status</span>
            <span className="font-semibold text-emerald-500 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active Session
            </span>
          </div>
        </div>
      </div>

      {/* Backend API Config */}
      <div
        className={`rounded-2xl border p-4 space-y-2.5 ${
          isDark ? "border-slate-800 bg-slate-900/90" : "border-slate-200 bg-white shadow-xs"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`font-semibold text-xs flex items-center gap-1.5 ${isDark ? "text-white" : "text-slate-900"}`}>
            <Server size={14} className={isDark ? "text-sky-400" : "text-blue-600"} />
            Backend API Endpoint
          </span>
          {!editingUrl ? (
            <button
              type="button"
              onClick={() => {
                setTempUrl(serverUrl);
                setEditingUrl(true);
              }}
              className={`text-[10px] font-semibold hover:underline ${isDark ? "text-sky-400" : "text-blue-600"}`}
            >
              Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditingUrl(false)}
              className="text-[10px] text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
          )}
        </div>

        {!editingUrl ? (
          <p className={`font-mono text-[10px] break-all ${isDark ? "text-slate-400" : "text-slate-600"}`}>{serverUrl}</p>
        ) : (
          <div className="space-y-2 pt-1">
            <input
              type="text"
              className={`w-full rounded-xl border px-2.5 py-1.5 text-xs outline-none focus:border-sky-500 ${
                isDark ? "border-slate-700 bg-slate-950 text-white" : "border-slate-300 bg-slate-50 text-slate-900"
              }`}
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-500"
              >
                Save Endpoint
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 py-2.5 text-xs font-bold text-rose-500 transition hover:bg-rose-500 hover:text-white"
      >
        <LogOut size={14} />
        <span>Log Out of Citizen Account</span>
      </button>
    </div>
  );
}
