import { getApiUrl } from '../config';

export async function request(path, options = {}) {
  const baseUrl = await getApiUrl();
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  
  const headers = { ...(options.headers || {}) };
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Connection timed out after 15s reaching ${url}. Check your server connection.`);
    }
    throw new Error(`Cannot reach server at ${baseUrl}. Ensure backend is running and phone is on the same Wi-Fi.`);
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text };
  }

  if (!response.ok) {
    const errorMsg = data.detail || data.message || `Request failed (${response.status})`;
    throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
  }

  return data;
}

export async function sendOtp(email) {
  return request('/citizen/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
}

export async function verifyOtp(email, otp_code, full_name, phone) {
  return request('/citizen/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      otp_code: otp_code.trim(),
      full_name: full_name ? full_name.trim() : '',
      phone: phone ? phone.trim() : '',
    }),
  });
}

export async function getMe(token) {
  return request('/citizen/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getInstitutions(query = '') {
  const q = encodeURIComponent(query.trim());
  return request(`/citizen/institutions?q=${q}`);
}

export async function getCategories() {
  return request('/citizen/categories');
}

export async function fileComplaint(token, payload) {
  return request('/citizen/complaints', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function getMyComplaints(token) {
  return request('/citizen/my-complaints', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function trackCase(caseRef) {
  return request(`/citizen/track/${encodeURIComponent(caseRef.trim().toUpperCase())}`);
}
