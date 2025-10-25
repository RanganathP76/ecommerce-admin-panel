import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api", // change if your backend URL is different
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

