import { API_URL } from "../api";

export function getCitizenBaseUrl() {
  const saved = localStorage.getItem("aicte_citizen_server_url");
  if (saved && saved.trim() && !saved.includes("10.83.67.219") && !saved.includes("192.168.1.6")) {
    return saved.trim().replace(/\/$/, "");
  }
  // If API_URL is configured, default to it, otherwise production render
  if (API_URL && API_URL.trim() && !API_URL.includes("localhost")) {
    return API_URL.trim().replace(/\/$/, "");
  }
  return "https://casegrid-backend.onrender.com";
}

export function setCitizenBaseUrl(url) {
  if (url && url.trim()) {
    localStorage.setItem("aicte_citizen_server_url", url.trim().replace(/\/$/, ""));
  }
}

export async function citizenRequest(path, options = {}) {
  const base = getCitizenBaseUrl();
  const url = `${base}${path}`;

  const headers = { ...(options.headers || {}) };
  if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error(`Connection timed out after 30s reaching ${url}. Check your server connection.`);
    }
    throw new Error(`Cannot reach server at ${base}. Ensure backend is running.`);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text };
  }

  if (!res.ok) {
    const errorMsg = data.detail || data.message || `Request failed (${res.status})`;
    throw new Error(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
  }

  return data;
}

export async function sendOtp(email) {
  return citizenRequest("/citizen/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
}

export async function verifyOtp(email, otp_code, full_name, phone) {
  return citizenRequest("/citizen/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      otp_code: otp_code.trim(),
      full_name: full_name ? full_name.trim() : "",
      phone: phone ? phone.trim() : "",
    }),
  });
}

export async function getCitizenProfile(token) {
  return citizenRequest("/citizen/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getInstitutions(query = "") {
  const q = encodeURIComponent(query.trim());
  return citizenRequest(`/citizen/institutions?q=${q}`);
}

export async function getCategories() {
  return citizenRequest("/citizen/categories");
}

export async function fileComplaint(token, payload) {
  return citizenRequest("/citizen/complaints", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function getMyComplaints(token) {
  return citizenRequest("/citizen/my-complaints", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function trackCase(caseRef) {
  return citizenRequest(`/citizen/track/${encodeURIComponent(caseRef.trim().toUpperCase())}`);
}
