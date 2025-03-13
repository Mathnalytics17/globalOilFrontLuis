import React, { createContext, useContext, useState, useEffect } from 'react';

// Crea el contexto
const SessionContext = createContext();

// Función para generar un código único
const generateUniqueCode = () => {
  return Math.random().toString(36).substr(2, 9); // Genera un código alfanumérico de 9 caracteres
};

export const SessionProvider = ({ children }) => {
  const [sessionName, setSessionName] = useState('');
  const [sessionCode, setSessionCode] = useState('');

  useEffect(() => {
    // Verifica si ya existe un nombre de sesión en localStorage
    let name = localStorage.getItem('sessionName');
    let code = localStorage.getItem('sessionCode');

    if (!name || !code) {
      // Generar un nombre y código únicos si no existen
      name = generateUniqueCode();
      code = generateUniqueCode();
      localStorage.setItem('sessionName', name);
      localStorage.setItem('sessionCode', code);
    }

    setSessionName(name);
    setSessionCode(code);
  }, []);

  return (
    <SessionContext.Provider value={{ sessionName, sessionCode }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);


