import { useEffect, useState } from 'react';
import Link from 'next/link';
import TechnicalConfigShell from '../components/TechnicalConfigShell';
import styles from '../components/TechnicalConfig.module.css';
import technicalConfigService from '../../infrastructure/technicalConfigService';
import { safeArray, parseError } from '../components/technicalConfigUtils';

export default function TechnicalConfigHomePage() {
  const [data, setData] = useState({ catalogs: [], items: [], fields: [], limitSources: [], tests: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    technicalConfigService.getDashboard()
      .then((payload) => { if (mounted) setData(payload); })
      .catch((err) => { if (mounted) setError(parseError(err)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const cards = [
    { title: 'Catálogos', value: safeArray(data.catalogs).length, text: 'Grado de viscosidad, nivel de desempeño, uso, NLGI y demás parámetros.' },
    { title: 'Items', value: safeArray(data.items).length, text: 'Valores como SAE 70W-90, API SN o Diferencial.' },
    { title: 'Campos de límite', value: safeArray(data.fields).length, text: 'Vmin, Vmax, IV1, IV2, espuma I FI, etc.' },
    { title: 'Fuentes configuradas', value: safeArray(data.limitSources).length, text: 'Conexiones entre pruebas y catálogos.' },
  ];

  return (
    <TechnicalConfigShell
      title="Centro de configuración técnica"
      subtitle="Administre catálogos, items, equipos, métodos y la relación de límites. Este es el core técnico de laboratorio dentro del centro de configuración."
    >
      {error ? <div className={styles.alert}>{error}</div> : null}
      <section className={styles.grid}>
        {cards.map((card) => (
          <article key={card.title} className={`${styles.card} ${styles.col3}`}>
            <h3>{card.title}</h3>
            <div className={styles.statNumber}>{loading ? '...' : card.value}</div>
            <p>{card.text}</p>
          </article>
        ))}

        <article className={`${styles.card} ${styles.col6}`}>
          <h2>Flujo recomendado</h2>
          <div className={styles.step}><span className={styles.stepNum}>1</span><p><b>Cree el catálogo técnico.</b><br />Ejemplo: Grado de viscosidad, Nivel de desempeño o Uso.</p></div>
          <div className={styles.step}><span className={styles.stepNum}>2</span><p><b>Cree los items.</b><br />Ejemplo: SAE 70W-90, API SN o Diferencial.</p></div>
          <div className={styles.step}><span className={styles.stepNum}>3</span><p><b>Cree campos de límite.</b><br />Ejemplo: Vmin, Vmax, IV1, IV2, espuma_i_fi.</p></div>
          <div className={styles.step}><span className={styles.stepNum}>4</span><p><b>Conecte prueba + catálogo.</b><br />Cada item del catálogo tendrá sus valores de límite para esa prueba o componente.</p></div>
        </article>

        <article className={`${styles.card} ${styles.col6}`}>
          <h2>Accesos rápidos</h2>
          <p>Separé el flujo en rutas para que no quede todo mezclado en un solo formulario.</p>
          <div className={styles.actions}>
            <Link href="/configuracion-tecnica" className={`${styles.btn} ${styles.secondary}`}>Volver al centro</Link>
            <Link href="/configuracion-tecnica/catalogos" className={`${styles.btn} ${styles.primary}`}>Gestionar catálogos</Link>
            <Link href="/configuracion-tecnica/limites" className={`${styles.btn} ${styles.secondary}`}>Conectar límites</Link>
            <Link href="/configuracion-tecnica/pruebas" className={`${styles.btn} ${styles.secondary}`}>Ir a pruebas</Link>
            <Link href="/configuracion-tecnica/escalas" className={`${styles.btn} ${styles.secondary}`}>Escalas de comparación</Link>
          </div>
          <p className={styles.help}>Ejemplo: para Viscosidad 100 °C, conecta la prueba con el catálogo “Grado de viscosidad” y usa los campos Vmin / Vmax. Luego en cada item pones SAE 70W-90 = 13.5 / 18.5.</p>
        </article>
      </section>
    </TechnicalConfigShell>
  );
}
