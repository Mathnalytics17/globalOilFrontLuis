import Layout from '../shared/components/layout'
import "react-toastify/dist/ReactToastify.css";

import Head from "next/head";
import { useRouter } from "next/router";
import { ToastContainer, toast } from "react-toastify";
import { AuthProvider } from '../shared/context/AuthContext';
import { useAuth } from '../shared/context/AuthContext';
import axios from 'axios';
import { AppProvider } from '@toolpad/core/AppProvider';

import "../pages/globals.css";



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