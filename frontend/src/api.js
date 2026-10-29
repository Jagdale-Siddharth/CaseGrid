import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401 && !e.config.url.includes("/auth/login")) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(e);
  }
);

export const errText = (e) => {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || "Something went wrong";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => `${(x.loc || []).slice(1).join(".")}: ${x.msg}`).join("; ");
  return d.message || JSON.stringify(d);
};

export async function download(url, params, filename) {
  const r = await api.get(url, { params, responseType: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(r.data);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
export default api;
