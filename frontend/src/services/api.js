import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Interceptor Request: Sisipkan token JWT jika tersedia
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("finreport_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor Response: Handle error global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Jika token expired atau invalid, bersihkan sesi
      const currentPath = window.location.pathname;
      if (!currentPath.includes("/login") && !currentPath.includes("/register")) {
        localStorage.removeItem("finreport_token");
        localStorage.removeItem("finreport_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;