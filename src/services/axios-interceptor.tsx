import { useEffect } from "react";
import { httpClient } from "../services/http-client";

const AxiosApiInterceptor = () => {
  useEffect(() => {
    const requestInterceptor = httpClient.interceptors.request.use(async (config) => {
      // config.headers["X-API-KEY"] = import.meta.env.VITE_APP_BTC_API_KEY;
      return config;
    });

    // Response interceptor
    const responseInterceptor = httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        return Promise.reject(error);
      },
    );

    return () => {
      // Cleanup: Remove the interceptors when the component unmounts
      httpClient.interceptors.request.eject(requestInterceptor);
      httpClient.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  return null; // This component doesn't render anything
};

export default AxiosApiInterceptor;
