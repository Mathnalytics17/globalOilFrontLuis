import React from "react";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white p-6 mt-10">
      <div className="max-w-7xl mx-auto text-center">
        <p>&copy; {new Date().getFullYear()} Empresa de Motores y Mantenimiento. Todos los derechos reservados.</p>
        <p className="mt-2">
          <Link href="/politica-de-privacidad" aria-label="Política de Privacidad">
            <span className="text-yellow-400 hover:underline">Política de Privacidad</span>
          </Link> 
          <span className="mx-2 text-gray-500">|</span> 
          <Link href="/terminos" aria-label="Términos y Condiciones">
            <span className="text-yellow-400 hover:underline">Términos y Condiciones</span>
          </Link>
        </p>
      </div>
    </footer>
  );
}

export default Footer;
