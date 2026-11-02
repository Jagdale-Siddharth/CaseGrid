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
  UploadCloud,
  ChevronRight,
  Sparkles,
  Video,
  Languages,
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
} from "../services/citizenApi";

const TOKEN_KEY = "@aicte_citizen_token";
const USER_KEY = "@aicte_citizen_user";
const LANG_KEY = "@aicte_citizen_lang";

export const TRANSLATIONS = {
  en: {
    portalTitle: "AICTE Grievance Portal",
    portalSubtitle: "Citizen & Student Mobile Access",
    encryptedNotice: "AICTE Central Redressal System • 256-bit Encrypted",
    tabFile: "File Grievance",
    tabMyCases: "My Cases",
    tabTrack: "Track Any",
    tabAccount: "Account",
    signInTitle: "Sign In / Authenticate",
    signInSubtitle: "Enter your email address to receive a secure one-time verification code.",
    emailLabel: "Email Address *",
    emailPlaceholder: "e.g. rahul.sharma@example.com",
    sendOtpBtn: "Send Verification Code",
    sendingOtp: "Dispatching OTP...",
    otpSentSuccess: "A 6-digit verification code has been dispatched to {email}. Check your inbox or spam.",
    enterCodeTitle: "Enter 6-Digit Code",
    codeSentTo: "Code sent to",
    changeEmail: "Change",
    otpLabel: "6-Digit OTP Code *",
    otpPlaceholder: "123456",
    nameLabel: "Full Name (Optional)",
    namePlaceholder: "e.g. Rahul Sharma",
    phoneLabel: "Mobile Phone (Optional)",
    phonePlaceholder: "e.g. 9876543210",
    verifyBtn: "Verify & Enter Portal",
    verifying: "Authenticating...",
    resendCode: "Resend Code",
    validEmailError: "Please enter a valid email address.",
    enter6Digits: "Please enter the 6-digit verification code.",
    lodgeTitle: "Lodge Citizen Grievance",
    registeredUnder: "Registered under citizen:",
    instLabel: "AICTE Approved Institution *",
    selectInstPlaceholder: "Select an institution...",
    instCode: "Code:",
    categoryLabel: "Grievance Category *",
    subjectLabel: "Subject / Headline *",
    subjectPlaceholder: "e.g. Inadequate lab equipment in Computer Center",
    descLabel: "Detailed Grievance Description *",
    descPlaceholder: "Describe the issue, dates, personnel involved and impact...",
    urgentLabel: "Urgent Attention Needed",
    urgentSub: "Escalates ticket directly to AICTE priority review",
    fieldPhotoLabel: "Field Photo (With Geotag)",
    takePhotoLaptop: "Take Photo with Laptop Camera",
    uploadImageFile: "Or upload image from file",
    readingGps: "Reading GPS coordinates...",
    gpsAttached: "GPS attached",
    removePhoto: "Remove",
    docLabel: "Supporting Document (PDF / Doc)",
    attachDoc: "Attach document evidence",
    submitComplaint: "Submit Grievance to AICTE",
    transmitting: "Transmitting Complaint...",
    selectApprovedInst: "Please select an approved institution.",
    selectCategory: "Please select a grievance category.",
    validSubject: "Please provide a valid subject (at least 3 characters).",
    validDesc: "Please describe your grievance in detail (at least 10 characters).",
    cameraTitle: "Laptop Camera Viewfinder",
    locatingGps: "Locating GPS...",
    gpsActive: "GPS Active",
    refreshGps: "Refresh GPS",
    cancel: "Cancel",
    uploadFile: "Upload File",
    cameraError: "Camera access denied or webcam not available on this device.",
    cameraHelp: "Please allow camera permission in your browser or upload an image file instead.",
    retryCamera: "Retry Camera",
    selectInstModalTitle: "Select Institution",
    searchInstPlaceholder: "Search by college name or code...",
    myGrievancesTitle: "My Grievances",
    myGrievancesSub: "Complaints filed from this account",
    refreshList: "Refresh List",
    loadingGrievances: "Loading grievance records...",
    noGrievances: "No complaints registered yet",
    noGrievancesSub: "Use the \"File Grievance\" tab to lodge your first official issue.",
    trackInDetail: "Track in Detail",
    subjectModal: "Subject",
    instModal: "Institution",
    descModal: "Description",
    geotagEvidence: "Geotag Evidence",
    auditTrail: "Lifecycle Audit Trail",
    loadingTimeline: "Loading case timeline...",
    trackAnyTitle: "Track Any Grievance",
    trackAnySub: "Public tracking via Case Reference ID",
    trackPlaceholder: "e.g. CMP-2026-000001",
    trackBtn: "Track",
    assignedBureau: "Assigned Bureau",
    activityTimeline: "Activity Timeline",
    enterCaseRef: "Please enter a Case Reference ID (e.g. CMP-2026-000001)",
    profileTitle: "Citizen Profile",
    profileSub: "Session authentication & preferences",
    languageSetting: "Language / भाषा",
    verifiedCitizen: "Verified Citizen",
    phone: "Phone",
    notConfigured: "Not configured",
    authProvider: "Auth Provider",
    secureOtp: "Secure Email OTP",
    status: "Status",
    activeSession: "Active Session",
    backendEndpoint: "Backend API Endpoint",
    edit: "Edit",
    saveEndpoint: "Save Endpoint",
    logOut: "Log Out of Citizen Account",
  },
  hi: {
    portalTitle: "एआईसीटीई शिकायत निवारण पोर्टल",
    portalSubtitle: "नागरिक एवं छात्र मोबाइल सेवा",
    encryptedNotice: "एआईसीटीई केंद्रीय निवारण प्रणाली • 256-बिट एन्क्रिप्टेड",
    tabFile: "शिकायत दर्ज करें",
    tabMyCases: "मेरी शिकायतें",
    tabTrack: "ट्रैक करें",
    tabAccount: "खाता",
    signInTitle: "लॉग इन / प्रमाणीकरण",
    signInSubtitle: "सुरक्षित वन-टाइम सत्यापन कोड प्राप्त करने के लिए अपना ईमेल दर्ज करें।",
    emailLabel: "ईमेल पता *",
    emailPlaceholder: "उदा. rahul.sharma@example.com",
    sendOtpBtn: "सत्यापन कोड भेजें",
    sendingOtp: "ओटीपी भेजा जा रहा है...",
    otpSentSuccess: "{email} पर 6-अंकों का सत्यापन कोड भेज दिया गया है। अपना इनबॉक्स या स्पैम जांचें।",
    enterCodeTitle: "6-अंकों का कोड दर्ज करें",
    codeSentTo: "कोड भेजा गया:",
    changeEmail: "बदलें",
    otpLabel: "6-अंकीय ओटीपी कोड *",
    otpPlaceholder: "123456",
    nameLabel: "पूरा नाम (वैकल्पिक)",
    namePlaceholder: "उदा. राहुल शर्मा",
    phoneLabel: "मोबाइल नंबर (वैकल्पिक)",
    phonePlaceholder: "उदा. 9876543210",
    verifyBtn: "सत्यापित करें और प्रवेश करें",
    verifying: "प्रमाणीकरण जारी...",
    resendCode: "कोड पुनः भेजें",
    validEmailError: "कृपया एक मान्य ईमेल पता दर्ज करें।",
    enter6Digits: "कृपया 6-अंकों का सत्यापन कोड दर्ज करें।",
    lodgeTitle: "नागरिक शिकायत दर्ज करें",
    registeredUnder: "पंजीकृत नागरिक:",
    instLabel: "एआईसीटीई अनुमोदित संस्थान *",
    selectInstPlaceholder: "संस्थान चुनें...",
    instCode: "कोड:",
    categoryLabel: "शिकायत श्रेणी *",
    subjectLabel: "विषय / शीर्षक *",
    subjectPlaceholder: "उदा. कंप्यूटर लैब में उपकरणों की अनुपलब्धता",
    descLabel: "शिकायत का विस्तृत विवरण *",
    descPlaceholder: "मुद्दे, तारीख, संबंधित व्यक्तियों और प्रभाव का विवरण दें...",
    urgentLabel: "अति आवश्यक ध्यान दें",
    urgentSub: "शिकायत सीधे एआईसीटीई प्राथमिकता समीक्षा को भेजी जाएगी",
    fieldPhotoLabel: "स्थल फोटो (जियोटैग सहित)",
    takePhotoLaptop: "लैपटॉप कैमरे से फोटो लें",
    uploadImageFile: "या फ़ाइल से छवि अपलोड करें",
    readingGps: "जीपीएस निर्देशांक पढ़े जा रहे हैं...",
    gpsAttached: "जीपीएस संलग्न",
    removePhoto: "हटाएं",
    docLabel: "सहायक दस्तावेज़ (PDF / Doc)",
    attachDoc: "दस्तावेज़ साक्ष्य संलग्न करें",
    submitComplaint: "एआईसीटीई को शिकायत सबमिट करें",
    transmitting: "शिकायत प्रेषित हो रही है...",
    selectApprovedInst: "कृपया एक अनुमोदित संस्थान चुनें।",
    selectCategory: "कृपया एक शिकायत श्रेणी चुनें।",
    validSubject: "कृपया एक मान्य विषय दर्ज करें (कम से कम 3 वर्ण)।",
    validDesc: "कृपया विस्तृत विवरण दें (कम से कम 10 वर्ण)।",
    cameraTitle: "लैपटॉप कैमरा दृश्य",
    locatingGps: "जीपीएस खोज रहे हैं...",
    gpsActive: "जीपीएस सक्रिय",
    refreshGps: "जीपीएस ताज़ा करें",
    cancel: "रद्द करें",
    uploadFile: "फ़ाइल अपलोड करें",
    cameraError: "कैमरा अनुमति अस्वीकृत या वेबकैम अनुपलब्ध है।",
    cameraHelp: "कृपया ब्राउज़र में कैमरा अनुमति दें या फ़ाइल अपलोड करें।",
    retryCamera: "पुनः प्रयास करें",
    selectInstModalTitle: "संस्थान चुनें",
    searchInstPlaceholder: "कॉलेज के नाम या कोड से खोजें...",
    myGrievancesTitle: "मेरी शिकायतें",
    myGrievancesSub: "इस खाते से दर्ज की गई शिकायतें",
    refreshList: "सूची ताज़ा करें",
    loadingGrievances: "शिकायत रिकॉर्ड लोड हो रहे हैं...",
    noGrievances: "अभी तक कोई शिकायत दर्ज नहीं है",
    noGrievancesSub: "अपनी पहली आधिकारिक शिकायत दर्ज करने के लिए \"शिकायत दर्ज करें\" का उपयोग करें।",
    trackInDetail: "विस्तृत स्थिति ट्रैक करें",
    subjectModal: "विषय",
    instModal: "संस्थान",
    descModal: "विवरण",
    geotagEvidence: "जियोटैग साक्ष्य",
    auditTrail: "जीवनचक्र ऑडिट ट्रेल",
    loadingTimeline: "समयरेखा लोड हो रही है...",
    trackAnyTitle: "किसी भी शिकायत को ट्रैक करें",
    trackAnySub: "केस संदर्भ आईडी द्वारा सार्वजनिक ट्रैकिंग",
    trackPlaceholder: "उदा. CMP-2026-000001",
    trackBtn: "ट्रैक करें",
    assignedBureau: "सौंपा गया ब्यूरो",
    activityTimeline: "गतिविधि समयरेखा",
    enterCaseRef: "कृपया केस संदर्भ आईडी दर्ज करें (उदा. CMP-2026-000001)",
    profileTitle: "नागरिक प्रोफ़ाइल",
    profileSub: "सत्र प्रमाणीकरण एवं प्राथमिकताएं",
    languageSetting: "भाषा चुनें (Language)",
    verifiedCitizen: "सत्यापित नागरिक",
    phone: "फ़ोन",
    notConfigured: "कॉन्फ़िगर नहीं",
    authProvider: "प्रमाणीकरण प्रदाता",
    secureOtp: "सुरक्षित ईमेल ओटीपी",
    status: "स्थिति",
    activeSession: "सक्रिय सत्र",
    backendEndpoint: "बैकएंड एपीआई एंडपॉइंट",
    edit: "संपादित करें",
    saveEndpoint: "एंडपॉइंट सहेजें",
    logOut: "नागरिक खाते से लॉग आउट करें",
  },
  mr: {
    portalTitle: "एआयसीटीई तक्रार निवारण पोर्टल",
    portalSubtitle: "नागरिक आणि विद्यार्थी मोबाइल सेवा",
    encryptedNotice: "एआयसीटीई केंद्रीय निवारण प्रणाली • २५६-बिट एन्क्रिप्टेड",
    tabFile: "तक्रार नोंदवा",
    tabMyCases: "माझ्या तक्रारी",
    tabTrack: "तक्रार शोधा",
    tabAccount: "खाते",
    signInTitle: "साइन इन / प्रमाणीकरण",
    signInSubtitle: "सुरक्षित वन-टाइम व्हेरिफिकेशन कोड मिळवण्यासाठी आपला ईमेल प्रविष्ट करा.",
    emailLabel: "ईमेल पत्ता *",
    emailPlaceholder: "उदा. rahul.sharma@example.com",
    sendOtpBtn: "व्हेरिफिकेशन कोड पाठवा",
    sendingOtp: "ओटीपी पाठवला जात आहे...",
    otpSentSuccess: "{email} वर ६-अंकी व्हेरिफिकेशन कोड पाठवला आहे. इनबॉक्स किंवा स्पॅम तपासा.",
    enterCodeTitle: "६-अंकी कोड प्रविष्ट करा",
    codeSentTo: "कोड पाठवला:",
    changeEmail: "बदला",
    otpLabel: "६-अंकी ओटीपी कोड *",
    otpPlaceholder: "123456",
    nameLabel: "पूर्ण नाव (पर्यायी)",
    namePlaceholder: "उदा. राहुल शर्मा",
    phoneLabel: "मोबाइल क्रमांक (पर्यायी)",
    phonePlaceholder: "उदा. 9876543210",
    verifyBtn: "सत्यापित करा आणि पुढे जा",
    verifying: "प्रमाणीकरण सुरू आहे...",
    resendCode: "कोड पुन्हा पाठवा",
    validEmailError: "कृपया वैध ईमेल पत्ता प्रविष्ट करा.",
    enter6Digits: "कृपया ६-अंकी व्हेरिफिकेशन कोड प्रविष्ट करा.",
    lodgeTitle: "नागरिक तक्रार नोंदवा",
    registeredUnder: "नोंदणीकृत नागरिक:",
    instLabel: "एआयसीटीई मान्यताप्राप्त संस्था *",
    selectInstPlaceholder: "संस्था निवडा...",
    instCode: "संकेतांक:",
    categoryLabel: "तक्रारीचा प्रकार *",
    subjectLabel: "विषय / शीर्षक *",
    subjectPlaceholder: "उदा. संगणक केंद्रात उपकरणांची अनुपलब्धता",
    descLabel: "तक्रारीचे सविस्तर वर्णन *",
    descPlaceholder: "समस्या, तारीख, संबंधित व्यक्ती आणि परिणामांचे वर्णन करा...",
    urgentLabel: "तातडीचे लक्ष आवश्यक",
    urgentSub: "तक्रार थेट एआयसीटीई प्राधान्य पुनरावलोकनासाठी पाठवली जाईल",
    fieldPhotoLabel: "घटनास्थळाचे छायाचित्र (जिओटॅगसह)",
    takePhotoLaptop: "लॅपटॉप कॅमेऱ्याने फोटो घ्या",
    uploadImageFile: "किंवा फाईलमधून प्रतिमा अपलोड करा",
    readingGps: "जीपीएस निर्देशांक मिळवत आहे...",
    gpsAttached: "जीपीएस जोडले",
    removePhoto: "काढून टाका",
    docLabel: "पूरक कागदपत्रे (PDF / Doc)",
    attachDoc: "कागदपत्र पुरावा जोडा",
    submitComplaint: "एआयसीटीई कडे तक्रार सबमिट करा",
    transmitting: "तक्रार पाठवली जात आहे...",
    selectApprovedInst: "कृपया मान्यताप्राप्त संस्था निवडा.",
    selectCategory: "कृपया तक्रारीचा प्रकार निवडा.",
    validSubject: "कृपया वैध विषय प्रविष्ट करा (किमान ३ अक्षरे).",
    validDesc: "कृपया सविस्तर वर्णन द्या (किमान १० अक्षरे).",
    cameraTitle: "लॅपटॉप कॅमेरा दृश्य",
    locatingGps: "जीपीएस शोधत आहे...",
    gpsActive: "जीपीएस सक्रिय",
    refreshGps: "जीपीएस रिफ्रेश करा",
    cancel: "रद्द करा",
    uploadFile: "फाईल अपलोड करा",
    cameraError: "कॅमेरा परवानगी नाकारली किंवा वेबकॅम उपलब्ध नाही.",
    cameraHelp: "कृपया ब्राउझरमध्ये कॅमेरा परवानगी द्या किंवा फाईल अपलोड करा.",
    retryCamera: "पुन्हा प्रयत्न करा",
    selectInstModalTitle: "संस्था निवडा",
    searchInstPlaceholder: "कॉलेजचे नाव किंवा कोडद्वारे शोधा...",
    myGrievancesTitle: "माझ्या तक्रारी",
    myGrievancesSub: "या खात्यावरून नोंदवलेल्या तक्रारी",
    refreshList: "सूची रिफ्रेश करा",
    loadingGrievances: "तक्रार नोंदी लोड होत आहेत...",
    noGrievances: "अद्याप कोणतीही तक्रार नोंदवलेली नाही",
    noGrievancesSub: "पहिली तक्रार नोंदवण्यासाठी \"तक्रार नोंदवा\" टॅब वापरा.",
    trackInDetail: "सविस्तर स्थिती ट्रॅक करा",
    subjectModal: "विषय",
    instModal: "संस्था",
    descModal: "वर्णन",
    geotagEvidence: "जिओटॅग पुरावा",
    auditTrail: "जीवनचक्र ऑडिट ट्रेल",
    loadingTimeline: "टाइमलाइन लोड होत आहे...",
    trackAnyTitle: "कोणतीही तक्रार ट्रॅक करा",
    trackAnySub: "केस संदर्भ आयडी द्वारे सार्वजनिक ट्रॅकिंग",
    trackPlaceholder: "उदा. CMP-2026-000001",
    trackBtn: "ट्रॅक करा",
    assignedBureau: "नेमलेला विभाग",
    activityTimeline: "कृती कालक्रम",
    enterCaseRef: "कृपया केस संदर्भ आयडी प्रविष्ट करा (उदा. CMP-2026-000001)",
    profileTitle: "नागरिक प्रोफाईल",
    profileSub: "सत्र प्रमाणीकरण आणि प्राधान्ये",
    languageSetting: "भाषा निवडा (Language)",
    verifiedCitizen: "सत्यापित नागरिक",
    phone: "फोन",
    notConfigured: "कॉन्फिगर नाही",
    authProvider: "प्रमाणीकरण प्रदाता",
    secureOtp: "सुरक्षित ईमेल ओटीपी",
    status: "स्थिती",
    activeSession: "सक्रिय सत्र",
    backendEndpoint: "बॅकएंड एपीआई एंडपॉईंट",
    edit: "संपादित करा",
    saveEndpoint: "एंडपॉईंट सेव्ह करा",
    logOut: "नागरिक खात्यातून लॉग आउट व्हा",
  },
};

export const CATEGORY_TRANSLATIONS = {
  Infrastructure: {
    en: "Infrastructure",
    hi: "बुनियादी ढांचा (Infrastructure)",
    mr: "पायाभूत सुविधा (Infrastructure)",
  },
  Faculty: {
    en: "Faculty & Staff",
    hi: "संकाय एवं शिक्षक वर्ग (Faculty)",
    mr: "प्राध्यापक व शिक्षक वर्ग (Faculty)",
  },
  Fees: {
    en: "Fees & Accounts",
    hi: "शुल्क एवं वित्तीय (Fees)",
    mr: "शुल्क व आर्थिक (Fees)",
  },
  Admissions: {
    en: "Admissions",
    hi: "प्रवेश प्रक्रिया (Admissions)",
    mr: "प्रवेश प्रक्रिया (Admissions)",
  },
  Affiliation: {
    en: "Affiliation & Approval",
    hi: "संबद्धता एवं मान्यता (Affiliation)",
    mr: "संलग्नता व मान्यता (Affiliation)",
  },
  "Academic Quality": {
    en: "Academic Quality",
    hi: "शैक्षणिक गुणवत्ता (Academic Quality)",
    mr: "शैक्षणिक दर्जा (Academic Quality)",
  },
  Curriculum: {
    en: "Curriculum & Syllabus",
    hi: "पाठ्यक्रम (Curriculum)",
    mr: "अभ्यासक्रम (Curriculum)",
  },
  Harassment: {
    en: "Anti-Ragging & Harassment",
    hi: "उत्पीड़न / रैगिंग (Anti-Ragging)",
    mr: "छळवणूक / रॅगिंग विरोधी (Anti-Ragging)",
  },
  Other: {
    en: "Other / General",
    hi: "अन्य / सामान्य (Other)",
    mr: "इतर / सर्वसाधारण (Other)",
  },
};

export function getCategoryLabel(cat, lang = "en") {
  if (!cat) return "";
  const match = CATEGORY_TRANSLATIONS[cat];
  if (match && match[lang]) return match[lang];
  return cat;
}

export default function NativeCitizenApp({ themeOverride }) {
  const { theme: ctxTheme } = useTheme() || {};
  const currentTheme = themeOverride || ctxTheme || "light";
  const isDark = currentTheme === "dark";

  // Language: 'en' (default) | 'hi' | 'mr'
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem(LANG_KEY) || "en";
    } catch {
      return "en";
    }
  });

  const handleLangChange = (newLang) => {
    setLang(newLang);
    try {
      localStorage.setItem(LANG_KEY, newLang);
    } catch {}
  };

  const t = (key, params = {}) => {
    let text = TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v);
    }
    return text;
  };

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
      {/* Top Phone Status Bar Simulation with Mini Language Switcher */}
      <div
        className={`flex items-center justify-between px-5 pt-2.5 pb-1 text-[11px] font-semibold tracking-wider transition-colors ${
          isDark ? "text-slate-400" : "text-slate-600"
        }`}
      >
        <span>9:41</span>

        {/* Header Language Switcher: EN | हिं | म */}
        <div className={`flex items-center gap-0.5 rounded-full border p-0.5 text-[9px] shadow-xs ${
          isDark ? "border-slate-800 bg-slate-900/90 text-slate-400" : "border-slate-300 bg-white text-slate-600"
        }`}>
          <button
            type="button"
            onClick={() => handleLangChange("en")}
            className={`rounded-full px-1.5 py-0.5 font-bold transition ${
              lang === "en" ? "bg-sky-600 text-white" : "hover:text-sky-500"
            }`}
            title="English"
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => handleLangChange("hi")}
            className={`rounded-full px-1.5 py-0.5 font-bold transition ${
              lang === "hi" ? "bg-sky-600 text-white" : "hover:text-sky-500"
            }`}
            title="हिंदी (Hindi)"
          >
            हिं
          </button>
          <button
            type="button"
            onClick={() => handleLangChange("mr")}
            className={`rounded-full px-1.5 py-0.5 font-bold transition ${
              lang === "mr" ? "bg-sky-600 text-white" : "hover:text-sky-500"
            }`}
            title="मराठी (Marathi)"
          >
            म
          </button>
        </div>

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
          <CitizenAuthScreen
            onLoginSuccess={handleLoginSuccess}
            isDark={isDark}
            t={t}
            lang={lang}
            onLangChange={handleLangChange}
          />
        ) : (
          <>
            {activeTab === "new" && (
              <CitizenNewComplaintScreen
                token={token}
                citizen={citizen}
                onComplaintCreated={handleComplaintCreated}
                isDark={isDark}
                t={t}
                lang={lang}
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
                t={t}
                lang={lang}
              />
            )}
            {activeTab === "track" && (
              <CitizenTrackCaseScreen initialCaseId={prefilledTrackCaseId} isDark={isDark} t={t} lang={lang} />
            )}
            {activeTab === "profile" && (
              <CitizenProfileScreen
                citizen={citizen}
                onLogout={handleLogout}
                isDark={isDark}
                t={t}
                lang={lang}
                onLangChange={handleLangChange}
              />
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
            label={t("tabFile")}
            isDark={isDark}
          />
          <TabButton
            active={activeTab === "my"}
            onClick={() => setActiveTab("my")}
            icon={<FolderOpen size={20} />}
            label={t("tabMyCases")}
            isDark={isDark}
          />
          <TabButton
            active={activeTab === "track"}
            onClick={() => setActiveTab("track")}
            icon={<Search size={20} />}
            label={t("tabTrack")}
            isDark={isDark}
          />
          <TabButton
            active={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
            icon={<UserRound size={20} />}
            label={t("tabAccount")}
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
      <span className="mt-1 text-[10px] tracking-tight truncate max-w-[70px]">{label}</span>
    </button>
  );
}

// -------------------------------------------------------------
// 1. AUTH SCREEN (Email OTP)
// -------------------------------------------------------------
function CitizenAuthScreen({ onLoginSuccess, isDark, t }) {
  const [step, setStep] = useState("email"); // 'email' | 'otp'
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setMsg({ type: "error", text: t("validEmailError") });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      await sendOtp(email.trim());
      setStep("otp");
      setMsg({
        type: "success",
        text: t("otpSentSuccess", { email: email.trim() }),
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
      setMsg({ type: "error", text: t("enter6Digits") });
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

  return (
    <div className="flex min-h-full flex-col justify-between p-5">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 pt-2 pb-4">
          <div
            className={`grid h-8 w-8 place-items-center rounded-xl ${
              isDark ? "bg-sky-500/20 text-sky-400" : "bg-blue-100 text-blue-600 border border-blue-200"
            }`}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              {t("portalTitle")}
            </h2>
            <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {t("portalSubtitle")}
            </p>
          </div>
        </div>

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
                  {t("signInTitle")}
                </h3>
                <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {t("signInSubtitle")}
                </p>
              </div>

              <div>
                <label className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  {t("emailLabel")}
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
                    placeholder={t("emailPlaceholder")}
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
                {loading ? t("sendingOtp") : t("sendOtpBtn")}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {t("enterCodeTitle")}
                  </h3>
                  <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {t("codeSentTo")} <span className={`font-semibold ${isDark ? "text-sky-400" : "text-blue-600"}`}>{email}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className={`text-[11px] font-semibold hover:underline ${isDark ? "text-sky-400" : "text-blue-600"}`}
                >
                  {t("changeEmail")}
                </button>
              </div>

              <div>
                <label className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  {t("otpLabel")}
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
                    placeholder={t("otpPlaceholder")}
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
                  {t("nameLabel")}
                </label>
                <div
                  className={`mt-1.5 flex items-center rounded-xl border px-3 py-2 focus-within:border-sky-500 ${
                    isDark ? "border-slate-800 bg-slate-950/80" : "border-slate-300 bg-slate-50"
                  }`}
                >
                  <User size={16} className={isDark ? "text-slate-400" : "text-slate-500"} />
                  <input
                    type="text"
                    placeholder={t("namePlaceholder")}
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
                  {t("phoneLabel")}
                </label>
                <div
                  className={`mt-1.5 flex items-center rounded-xl border px-3 py-2 focus-within:border-sky-500 ${
                    isDark ? "border-slate-800 bg-slate-950/80" : "border-slate-300 bg-slate-50"
                  }`}
                >
                  <Phone size={16} className={isDark ? "text-slate-400" : "text-slate-500"} />
                  <input
                    type="tel"
                    placeholder={t("phonePlaceholder")}
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
                {loading ? t("verifying") : t("verifyBtn")}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className={`text-[11px] font-semibold hover:underline ${isDark ? "text-sky-400" : "text-blue-600"}`}
                >
                  {t("resendCode")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className={`pt-4 pb-2 text-center text-[10px] ${isDark ? "text-slate-400" : "text-slate-600"}`}>
        <span>{t("encryptedNotice")}</span>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. NEW COMPLAINT SCREEN (With Live Laptop Webcam Viewfinder)
// -------------------------------------------------------------
function CitizenNewComplaintScreen({ token, citizen, onComplaintCreated, isDark, t, lang }) {
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
      setCameraError(t("cameraError"));
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
      setErrorMsg(t("selectApprovedInst"));
      return;
    }
    if (!category) {
      setErrorMsg(t("selectCategory"));
      return;
    }
    if (subject.trim().length < 3) {
      setErrorMsg(t("validSubject"));
      return;
    }
    if (description.trim().length < 10) {
      setErrorMsg(t("validDesc"));
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
        geo_latitude: locationCoords?.latitude ?? null,
        geo_longitude: locationCoords?.longitude ?? null,
        geo_lat: locationCoords?.latitude ?? null,
        geo_lng: locationCoords?.longitude ?? null,
        photo_name: photoName || null,
        photo_filename: photoName || null,
        photo_base64: photoBase64 || null,
        document_name: docName || null,
        doc_filename: docName || null,
        document_base64: docBase64 || null,
        doc_base64: docBase64 || null,
      };

      const res = await fileComplaint(token, payload);
      const caseId = res?.case_id || res?.complaint?.case_id || res?.data?.case_id || res?.id;
      if (caseId) {
        onComplaintCreated(typeof caseId === "string" ? caseId : `CMP-${caseId}`);
      } else {
        throw new Error(res?.message || res?.detail || "Unable to create complaint. Server did not return a valid Case ID.");
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
          {t("lodgeTitle")}
        </h2>
        <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {t("registeredUnder")} <span className={`font-semibold ${isDark ? "text-sky-400" : "text-blue-600"}`}>{citizen.email}</span>
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
            {t("instLabel")}
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
                  {selectedInst ? selectedInst.name : t("selectInstPlaceholder")}
                </p>
                {selectedInst && (
                  <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {t("instCode")} {selectedInst.code} • {selectedInst.city || "India"}
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
            {t("categoryLabel")}
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
                {getCategoryLabel(c, lang)}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            {t("subjectLabel")}
          </label>
          <input
            type="text"
            required
            placeholder={t("subjectPlaceholder")}
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
            {t("descLabel")}
          </label>
          <textarea
            rows={3}
            required
            placeholder={t("descPlaceholder")}
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
            <span className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{t("urgentLabel")}</span>
            <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {t("urgentSub")}
            </p>
          </div>
          <input
            type="checkbox"
            checked={isUrgent}
            onChange={(e) => setIsUrgent(e.target.checked)}
            className="h-4 w-4 rounded accent-sky-500"
          />
        </div>

        {/* Field Evidence: Geotag Photo */}
        <div
          className={`rounded-xl border p-3 ${
            isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-semibold flex items-center gap-1.5 ${isDark ? "text-white" : "text-slate-900"}`}>
              <Camera size={14} className={isDark ? "text-sky-400" : "text-blue-600"} />
              {t("fieldPhotoLabel")}
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
                {t("removePhoto")}
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
                  {loadingLocation ? t("readingGps") : locationAddress || t("gpsAttached")}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2">
              <button
                type="button"
                onClick={startCamera}
                className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-500 transition"
              >
                <Video size={14} />
                <span>{t("takePhotoLaptop")}</span>
              </button>

              <label
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-2 text-center transition ${
                  isDark
                    ? "border-slate-700 text-slate-400 hover:border-sky-500 hover:text-sky-300"
                    : "border-slate-300 text-slate-600 hover:border-blue-500 hover:text-blue-700 bg-slate-50"
                }`}
              >
                <UploadCloud size={14} />
                <span className="text-[11px]">{t("uploadImageFile")}</span>
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
              {t("docLabel")}
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
                {t("removePhoto")}
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
              <span className="text-[11px]">{t("attachDoc")}</span>
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
          {submitting ? t("transmitting") : t("submitComplaint")}
        </button>
      </form>

      {/* Live Laptop Camera Viewfinder Overlay (Inside Phone Frame) */}
      {cameraActive && (
        <div className="absolute inset-0 z-50 flex flex-col bg-black text-white p-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Camera size={16} className="text-sky-400" />
              <span className="text-xs font-bold text-white">{t("cameraTitle")}</span>
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
              <span className="truncate">{loadingLocation ? t("locatingGps") : locationAddress || t("gpsActive")}</span>
            </div>
            <button
              type="button"
              onClick={fetchCurrentGps}
              className="text-[10px] text-sky-400 underline ml-2 shrink-0"
            >
              {t("refreshGps")}
            </button>
          </div>

          {/* Video viewport */}
          <div className="relative flex-1 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-800">
            {cameraError ? (
              <div className="p-4 text-center">
                <AlertTriangle size={32} className="mx-auto text-amber-400 mb-2" />
                <p className="text-xs text-rose-300 font-semibold">{cameraError}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {t("cameraHelp")}
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-3 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {t("retryCamera")}
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
              {t("cancel")}
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
              {t("uploadFile")}
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
              <h4 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{t("selectInstModalTitle")}</h4>
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
                placeholder={t("searchInstPlaceholder")}
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
                        {t("instCode")} {inst.code} • {inst.city || "India"}
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
function CitizenMyComplaintsScreen({ token, onTrackExternal, isDark, t, lang }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDetails, setCaseDetails] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await getMyComplaints(token);
      const list = Array.isArray(res) ? res : (res?.complaints || res?.items || []);
      setComplaints(list);
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
            {t("myGrievancesTitle")}
          </h2>
          <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("myGrievancesSub")}</p>
        </div>
        <button
          type="button"
          onClick={fetchList}
          className={`rounded-lg border p-1.5 transition ${
            isDark
              ? "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
              : "border-slate-300 bg-white text-slate-600 hover:text-slate-900 shadow-xs"
          }`}
          title={t("refreshList")}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <RefreshCw size={24} className={`mx-auto animate-spin ${isDark ? "text-sky-400" : "text-blue-600"}`} />
          <p className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("loadingGrievances")}</p>
        </div>
      ) : complaints.length === 0 ? (
        <div
          className={`rounded-2xl border p-6 text-center ${
            isDark ? "border-slate-800 bg-slate-900/40 text-slate-400" : "border-slate-200 bg-white text-slate-500 shadow-xs"
          }`}
        >
          <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold">{t("noGrievances")}</p>
          <p className="mt-1 text-[10px]">{t("noGrievancesSub")}</p>
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
                <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{getCategoryLabel(selectedCase.category, lang)}</p>
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
                  {t("subjectModal")}
                </span>
                <p className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{selectedCase.subject}</p>
              </div>

              <div>
                <span className={`text-[10px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {t("instModal")}
                </span>
                <p className={isDark ? "text-slate-200" : "text-slate-700"}>
                  {selectedCase.institution_name} ({selectedCase.institution_code})
                </p>
              </div>

              <div>
                <span className={`text-[10px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {t("descModal")}
                </span>
                <p className={`whitespace-pre-wrap leading-relaxed mt-0.5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {selectedCase.description}
                </p>
              </div>

              {selectedCase.geo_address && (
                <div>
                  <span className={`text-[10px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {t("geotagEvidence")}
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
                  <p className={`mt-1 text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("loadingTimeline")}</p>
                </div>
              ) : caseDetails?.history && (
                <div className={`pt-2 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                  <span className={`text-[10px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {t("auditTrail")}
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
                {t("trackInDetail")}
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
function CitizenTrackCaseScreen({ initialCaseId, isDark, t, lang }) {
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
      setErrorMsg(t("enterCaseRef"));
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
          {t("trackAnyTitle")}
        </h2>
        <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("trackAnySub")}</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder={t("trackPlaceholder")}
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
          {loading ? <RefreshCw size={14} className="animate-spin" /> : t("trackBtn")}
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
              <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{getCategoryLabel(data.category, lang)}</p>
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
              {t("subjectModal")}
            </span>
            <p className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{data.subject}</p>
          </div>

          <div>
            <span className={`text-[10px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {t("instModal")}
            </span>
            <p className={isDark ? "text-slate-200" : "text-slate-700"}>
              {data.institution_name} ({data.institution_code})
            </p>
          </div>

          <div>
            <span className={`text-[10px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {t("assignedBureau")}
            </span>
            <p className={isDark ? "text-slate-300" : "text-slate-700"}>{data.bureau || "Central Review Bureau"}</p>
          </div>

          {/* Timeline */}
          {data.history && data.history.length > 0 && (
            <div className={`pt-2 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <span className={`text-[10px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {t("activityTimeline")}
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
function CitizenProfileScreen({ citizen, onLogout, isDark, t, lang, onLangChange }) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className={`text-base font-bold flex items-center gap-1.5 ${isDark ? "text-white" : "text-slate-900"}`}>
          <UserRound size={18} className={isDark ? "text-sky-400" : "text-blue-600"} />
          {t("profileTitle")}
        </h2>
        <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t("profileSub")}</p>
      </div>

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
              {citizen.full_name || t("verifiedCitizen")}
            </h3>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{citizen.email}</p>
          </div>
        </div>

        <div className={`space-y-1.5 pt-2 border-t text-xs ${isDark ? "border-slate-800 text-slate-300" : "border-slate-200 text-slate-700"}`}>
          <div className="flex justify-between">
            <span className={isDark ? "text-slate-500" : "text-slate-400"}>{t("phone")}</span>
            <span>{citizen.phone || t("notConfigured")}</span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? "text-slate-500" : "text-slate-400"}>{t("authProvider")}</span>
            <span>{t("secureOtp")}</span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? "text-slate-500" : "text-slate-400"}>{t("status")}</span>
            <span className="font-semibold text-emerald-500 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {t("activeSession")}
            </span>
          </div>
        </div>
      </div>

      {/* Language Selector Card */}
      <div
        className={`rounded-2xl border p-4 space-y-2.5 ${
          isDark ? "border-slate-800 bg-slate-900/90 text-white" : "border-slate-200 bg-white text-slate-900 shadow-xs"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Languages size={16} className={isDark ? "text-sky-400" : "text-blue-600"} />
          <span className="font-semibold text-xs">{t("languageSetting")}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => onLangChange("en")}
            className={`rounded-xl border py-2 px-1 text-xs font-bold transition text-center ${
              lang === "en"
                ? "border-sky-500 bg-sky-600 text-white shadow-sm"
                : isDark
                ? "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"
                : "border-slate-300 bg-slate-50 text-slate-700 hover:border-blue-400"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => onLangChange("hi")}
            className={`rounded-xl border py-2 px-1 text-xs font-bold transition text-center ${
              lang === "hi"
                ? "border-sky-500 bg-sky-600 text-white shadow-sm"
                : isDark
                ? "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"
                : "border-slate-300 bg-slate-50 text-slate-700 hover:border-blue-400"
            }`}
          >
            हिंदी
          </button>
          <button
            type="button"
            onClick={() => onLangChange("mr")}
            className={`rounded-xl border py-2 px-1 text-xs font-bold transition text-center ${
              lang === "mr"
                ? "border-sky-500 bg-sky-600 text-white shadow-sm"
                : isDark
                ? "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"
                : "border-slate-300 bg-slate-50 text-slate-700 hover:border-blue-400"
            }`}
          >
            मराठी
          </button>
        </div>
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 py-2.5 text-xs font-bold text-rose-500 transition hover:bg-rose-500 hover:text-white"
      >
        <LogOut size={14} />
        <span>{t("logOut")}</span>
      </button>
    </div>
  );
}
