import Layout from '../shared/components/layout'
import "react-toastify/dist/ReactToastify.css";

import Head from "next/head";
import { useRouter } from "next/router";
import { ToastContainer, toast } from "react-toastify";
import { AuthProvider } from '../shared/context/AuthContext';
import axios from 'axios';
import { AppProvider } from '@toolpad/core/AppProvider';





const pathsWithoutDefaultLayout = [
  "/",
  "/self-management",
  "/users/login",
  "/users/create-user",
  "/financialProfile/financialStatement",
  "/financialProfile/indicators",
  "/auth/resetPassword",
  "/auth/forgotPassword"
];

// Clase para coordinar y cancelar peticiones
class RequestCoordinator {
  constructor() {
    this.controllers = new Map();
    this.globalController = new AbortController();
  }

  createRequest(source) {
    const requestId = Symbol('request');
    this.controllers.set(requestId, source);
    return requestId;
  }

  cancelRequest(requestId) {
    if (this.controllers.has(requestId)) {
      const source = this.controllers.get(requestId);
      source.cancel('Request canceled');
      this.controllers.delete(requestId);
    }
  }

  cancelAll() {
    this.globalController.abort('All requests canceled');
    this.controllers.forEach(source => {
      source.cancel('Request canceled due to global cancellation');
    });
    this.controllers.clear();
    // Reset global controller for future requests
    this.globalController = new AbortController();
  }
}

// Configuración global de axios
const requestCoordinator = new RequestCoordinator();

axios.interceptors.request.use(config => {
  const source = axios.CancelToken.source();
  const requestId = requestCoordinator.createRequest(source);
  config.cancelToken = source.token;
  config.requestId = requestId;
  return config;
}, error => {
  return Promise.reject(error);
});

axios.interceptors.response.use(response => {
  if (response.config.requestId) {
    requestCoordinator.cancelRequest(response.config.requestId);
  }
  return response;
}, error => {
  if (axios.isCancel(error)) {
    console.log('Request canceled:', error.message);
    return Promise.reject(error);
  }
  
  // Si hay un error, cancelamos todas las peticiones pendientes
  requestCoordinator.cancelAll();
  return Promise.reject(error);
});

// Función para manejar peticiones con reintentos
async function resilientRequest(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios({
        url,
        ...options,
        signal: requestCoordinator.globalController.signal
      });
      return response.data;
    } catch (error) {
      if (i === retries - 1 || error.response?.status < 500) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  const isErrorPage = pageProps?.statusCode === 404;
  return (
    <> 
       {!pathsWithoutDefaultLayout.includes(router.pathname) &&
            !isErrorPage ? (
              <AuthProvider>
              <Layout>
                <Component {...pageProps} />
              </Layout>
              </AuthProvider>
            ) : (
              <AuthProvider>
              <Component {...pageProps} />
              </AuthProvider>
            )}
    
    </>
  )
}