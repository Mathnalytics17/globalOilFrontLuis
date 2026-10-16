import Link from 'next/link';
import {
  BookOpen,
  Box,
  ChevronRight,
  FlaskConical,
  Gauge,
  Layers,
  MessageSquare,
  Pipette,
  SlidersHorizontal,
  Thermometer,
  Wrench,
  Droplets,
} from 'lucide-react';

import PageHeader from '@shared/ui/PageHeader';

const sections = [
  {
    title: 'Configuración general',
    description: 'Catálogos y parámetros base que utiliza el sistema.',
    items: [
      ['Tipos de gestión', 'Reglas de tiempos y comportamiento por tipo de servicio.', '/configuracion-tecnica/tipos-gestion-muestras', Layers],
      ['Unidades y condiciones', 'Unidades de medida y condiciones técnicas reutilizables.', '/configuracion-tecnica/unidades-condiciones', Thermometer],
      ['Equipos y métodos', 'Equipos de laboratorio y métodos técnicos disponibles.', '/configuracion-tecnica/equipos-metodos', FlaskConical],
      ['Máquinas / activos', 'Parámetros técnicos relacionados con activos y equipos.', '/configuracion-tecnica/maquinas', Wrench],
      ['Lubricantes', 'Fabricantes y referencias reutilizables para puntos y muestras.', '/configuracion-tecnica/lubricantes', Droplets],
      ['Campos de muestra', 'Campos y atributos disponibles en la captura de muestras.', '/configuracion-tecnica/campos-muestra', SlidersHorizontal],
    ],
  },
  {
    title: 'Pruebas y laboratorio',
    description: 'Estructura técnica para resultados, interpretación y límites.',
    items: [
      ['Escalas de comparación', 'Escalas utilizadas para interpretar resultados.', '/configuracion-tecnica/escalas', Gauge],
      ['Catálogos técnicos', 'Catálogos y valores reutilizables por las pruebas.', '/configuracion-tecnica/catalogos', BookOpen],
      ['Pruebas', 'Definición de variables, métodos y estructura de resultados.', '/configuracion-tecnica/pruebas', Pipette],
      ['Límites por prueba', 'Criterios de aceptación y límites por campo evaluable.', '/configuracion-tecnica/limites/list', Gauge],
      ['Lotes predefinidos', 'Plantillas reutilizables para asignación de pruebas.', '/configuracion-tecnica/lotes-pruebas', Box],
      ['Comentarios técnicos', 'Textos usados durante la interpretación de resultados.', '/configuracion-tecnica/comentarios', MessageSquare],
    ],
  },
];

export default function TechnicalConfigEntryPage() {
  return (
    <div className="go-page">
      <div className="go-shell">
        <PageHeader
          eyebrow="Configuración del sistema"
          title="Configuración técnica"
          subtitle="Administre los parámetros técnicos del laboratorio desde un único lugar."
        />
        <div className="grid gap-8 xl:grid-cols-2">
          {sections.map((section) => (
            <section key={section.title}>
              <div className="mb-3">
                <h2 className="m-0 text-sm font-semibold text-[#e8eaed]">{section.title}</h2>
                <p className="mt-1 text-xs leading-5 text-[#7f858e]">{section.description}</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-white/[0.065] bg-[#191b1e]">
                {section.items.map(([title, description, href, Icon], index) => (
                  <Link
                    key={href}
                    href={href}
                    className={`group flex items-center gap-3 px-4 py-3.5 no-underline transition hover:bg-white/[0.025] ${index ? 'border-t border-white/[0.055]' : ''}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.065] bg-[#202226] text-[#8f959e] group-hover:text-[#d9dce0]">
                      <Icon size={17} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-[#dfe2e5]">{title}</span>
                      <span className="mt-0.5 block truncate text-xs text-[#737983]">{description}</span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-[#5f656e] transition group-hover:translate-x-0.5 group-hover:text-[#9298a1]" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
