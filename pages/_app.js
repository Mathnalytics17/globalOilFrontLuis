import AppLayout from '../src/app/layout/AppLayout';
import "react-toastify/dist/ReactToastify.css";

import { useRouter } from "next/router";
import { ToastContainer } from "react-toastify";
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { AuthProvider, useAuth } from '@features/auth/presentation/context/AuthContext';
import NativeSelectSearch from '@shared/ui/NativeSelectSearch';
import AppErrorBoundary from '@shared/ui/AppErrorBoundary';
import GlobalOilLoader from '@shared/ui/GlobalOilLoader';
import GlobalNavigationLoader from '@shared/ui/GlobalNavigationLoader';
import { useEffect } from 'react';

import "../src/shared/styles/design-system.css";
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

function NumericWheelGuard() {
  useEffect(() => {
    const preventNumericWheel = (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.type === 'number' && document.activeElement === target) {
        event.preventDefault();
      }
    };
    window.addEventListener('wheel', preventNumericWheel, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', preventNumericWheel, { capture: true });
  }, []);
  return null;
}

function ProtectedContent({ Component, pageProps }) {
  const { isLoading, isAuthenticated } = useAuth();

  // Never mount a protected page until the session has been checked. Otherwise
  // its data requests can emit error toasts after the user is sent to login.
  if (isLoading || !isAuthenticated()) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#111214]">
        <GlobalOilLoader label="Verificando autenticación..." />
      </main>
    );
  }

  return (
    <AppLayout>
      <Component {...pageProps} />
    </AppLayout>
  );
}

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();


  const isErrorPage = pageProps?.statusCode === 404;
  return (
    <>
      <AppErrorBoundary>
      {!pathsWithoutDefaultLayout.includes(router.pathname) &&
        !isErrorPage ? (
        <AuthProvider>
          <ProtectedContent Component={Component} pageProps={pageProps} />
        </AuthProvider>
      ) : (
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
      )}
      </AppErrorBoundary>
      <ToastContainer
        position="top-right"
        autoClose={4200}
        closeOnClick={false}
        pauseOnFocusLoss
        draggable={false}
        theme="dark"
        icon={({ type }) => {
          const Icon = type === 'success' ? CheckCircle2 : type === 'warning' ? AlertCircle : type === 'info' ? Info : XCircle;
          return <Icon size={19} />;
        }}
        toastClassName={({ type }) => `go-toast go-toast--${type || 'default'}`}
        bodyClassName="go-toast-body"
        progressClassName="go-toast-progress"
      />
      <NativeSelectSearch />
      <NumericWheelGuard />
      <GlobalNavigationLoader />

    </>
  )
}
