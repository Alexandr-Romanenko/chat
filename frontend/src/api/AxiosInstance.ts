import axios from "axios";
import { API_URL } from "../config";

const AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    accept: "application/json",
  },
});

AxiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default AxiosInstance;
