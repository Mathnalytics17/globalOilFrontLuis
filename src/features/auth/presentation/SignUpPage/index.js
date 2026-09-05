import Head from "next/head";
import { useEffect, useState } from "react";
import  RegisterComponent  from "./components";
import { companiesService } from "@features/companies/infrastructure/companiesService";

export default function SignUpIndex() {
  const [companies, setCompanies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para obtener compañías
  const GetCompanies = async () => {
    try {
      return await companiesService.list();
    } catch (err) {
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
  return (
    <>
   
      
      <RegisterComponent companiesData={companies} />
    </>
  );
}

