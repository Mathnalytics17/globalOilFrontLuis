import Link from 'next/link';
import { useRouter } from 'next/router';

import OverflowMenu from '@shared/ui/OverflowMenu';

const primary = [
  ['Tipos de gestión', '/configuracion-tecnica/tipos-gestion-muestras'],
  ['Core técnico', '/configuracion-tecnica/laboratorio'],
  ['Catálogos', '/configuracion-tecnica/catalogos'],
  ['Límites', '/configuracion-tecnica/limites/list'],
  ['Equipos y métodos', '/configuracion-tecnica/equipos-metodos'],
  ['Pruebas', '/configuracion-tecnica/pruebas'],
];

const secondary = [
  ['Escalas de comparación', '/configuracion-tecnica/escalas'],
  ['Lotes predefinidos', '/configuracion-tecnica/lotes-pruebas'],
  ['Comentarios técnicos', '/configuracion-tecnica/comentarios'],
  ['Campos de muestra', '/configuracion-tecnica/campos-muestra'],
  ['Unidades y condiciones', '/configuracion-tecnica/unidades-condiciones'],
  ['Máquinas / activos', '/configuracion-tecnica/maquinas'],
];

function activeFor(pathname, href) {
  if (pathname === href) return true;
  if (href.endsWith('/limites/list') && pathname.startsWith('/configuracion-tecnica/limites')) return true;
  if (href.endsWith('/pruebas') && pathname.startsWith('/configuracion-tecnica/pruebas')) return true;
  return false;
}

export default function TechnicalConfigTabs() {
  const router = useRouter();
  const secondaryActive = secondary.some(([, href]) => activeFor(router.pathname, href));

  return (
    <div className="mb-7 flex items-end gap-5 overflow-x-auto border-b border-white/[0.07] pr-1 text-sm">
      <Link
        href="/configuracion-tecnica"
        className={`shrink-0 border-b-2 px-0 pb-3 no-underline ${router.pathname === '/configuracion-tecnica' ? 'border-go-red font-semibold text-white' : 'border-transparent text-[#858b94] hover:text-[#d5d8dc]'}`}
      >
        Inicio
      </Link>
      {primary.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          className={`shrink-0 border-b-2 px-0 pb-3 no-underline ${activeFor(router.pathname, href) ? 'border-go-red font-semibold text-white' : 'border-transparent text-[#858b94] hover:text-[#d5d8dc]'}`}
        >
          {label}
        </Link>
      ))}
      <div className={`mb-[7px] shrink-0 ${secondaryActive ? 'text-white' : ''}`}>
        <OverflowMenu
          align="left"
          label="Más opciones de configuración"
          items={secondary.map(([label, href]) => ({ label, onClick: () => router.push(href) }))}
        />
      </div>
    </div>
  );
}
