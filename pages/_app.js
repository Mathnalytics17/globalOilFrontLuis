import AppLayout from '../src/app/layout/AppLayout';
import "react-toastify/dist/ReactToastify.css";

import { useRouter } from "next/router";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from '../shared/context/AuthContext';

import "../pages/globals.css";



const pathsWithoutDefaultLayout = [
  "/",
  "/self-management",
  "/users/login",
  "/users/create-user",
  "/financialProfile/financialStatement",
  "/financialProfile/indicators",
  "/auth/resetPassword",
  "/auth/forgotPassword",
  "/users/signUp",
  "/users/forgotPassword",
  "/users/resetPassword",
  "/users/confirmUser"
];

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();


  const isErrorPage = pageProps?.statusCode === 404;
  return (
    <>
      {!pathsWithoutDefaultLayout.includes(router.pathname) &&
        !isErrorPage ? (
        <AuthProvider>
          <AppLayout>
            <Component {...pageProps} />
          </AppLayout>
        </AuthProvider>
      ) : (
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
      )}
      <ToastContainer position="top-right" autoClose={3500} />

    </>
  )
}
