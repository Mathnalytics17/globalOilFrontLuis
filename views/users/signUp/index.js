import Head from "next/head";
import { useEffect, useState } from "react";
import  RegisterComponent  from "./components";
import Axios from 'axios';

export default function SignUpIndex() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [companies, setCompanies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para obtener compañías
  const GetCompanies = async () => {
    try {
      const res = await Axios.get(`${API_URL}/companies/`);
      return res.data;
    } catch (err) {
      console.error('Error en GetCompanies:', err);
      throw err;
    }
  };

  // Ejecutar la función cuando el componente se monta
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const data = await GetCompanies();
        setCompanies(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  console.log("Companies data:", companies);

  return (
    <>
   
      
      <RegisterComponent companiesData={companies} />
    </>
  );
}

