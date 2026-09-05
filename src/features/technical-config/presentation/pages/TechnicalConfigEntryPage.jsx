import Link from 'next/link';
import { ArrowLeft, Bell, BookOpen, Box, ChevronRight, FlaskConical, Gauge, Layers, MessageSquare, Pipette, SlidersHorizontal, Thermometer, Wrench } from 'lucide-react';
import ps from '../components/TechnicalPs5.module.css';

const main = [
  ['Tipos de gestión', '/configuracion-tecnica/tipos-gestion-muestras', Layers],
  ['Unidades y condiciones', '/configuracion-tecnica/unidades-condiciones', Thermometer],
  ['Equipos y métodos', '/configuracion-tecnica/equipos-metodos', FlaskConical],
  ['Máquinas / activos', '/configuracion-tecnica/maquinas', Wrench],
  ['Campos de muestra', '/configuracion-tecnica/campos-muestra', SlidersHorizontal],
  ['Notificaciones', '/configuracion-tecnica/notificaciones', Bell],
];

const tests = [
  ['Escalas de comparación', '/configuracion-tecnica/escalas', Gauge],
  ['Catálogos técnicos', '/configuracion-tecnica/catalogos', BookOpen],
  ['Pruebas', '/configuracion-tecnica/pruebas', Pipette],
  ['Límites por prueba', '/configuracion-tecnica/limites/list', Gauge],
  ['Lotes predefinidos', '/configuracion-tecnica/lotes-pruebas', Box],
  ['Comentarios técnicos', '/configuracion-tecnica/comentarios', MessageSquare],
];

function Row({ item, nested = false }) {
  const [title, href, Icon] = item;
  return (
    <Link href={href} className={`${ps.settingsRow} ${nested ? ps.nestedRow : ''}`}>
      <span className={ps.settingsIcon}><Icon size={24} /></span>
      <span className={ps.settingsLabel}><strong>{title}</strong></span>
      <ChevronRight className={ps.chevron} size={22} />
    </Link>
  );
}

export default function TechnicalConfigEntryPage() {
  return (
    <main className={ps.page}>
      <div className={ps.pageScroll}>
        <Link href="/activesTree" className={ps.backPill}><ArrowLeft size={19} />Volver al sistema</Link>
        <section className={ps.centerShell}>
          <h1 className={ps.title}>Configuración técnica</h1>
          <p className={ps.subtitle}>Administra los parámetros técnicos del laboratorio.</p>
          <div className={ps.settingsList}>
            {main.slice(0, 4).map((item) => <Row key={item[1]} item={item} />)}
            <details className={ps.settingsGroup} open>
              <summary>
                <span className={ps.settingsIcon}><FlaskConical size={24} /></span>
                <strong>Pruebas y límites</strong>
                <ChevronRight size={22} />
              </summary>
              {tests.map((item) => <Row key={item[1]} item={item} nested />)}
            </details>
            {main.slice(4).map((item) => <Row key={item[1]} item={item} />)}
          </div>
        </section>
      </div>
    </main>
  );
}
