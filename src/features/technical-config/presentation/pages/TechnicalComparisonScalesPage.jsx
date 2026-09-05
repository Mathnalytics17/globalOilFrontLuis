import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Pencil, Plus, Power } from 'lucide-react';
import { toast } from 'react-toastify';
import TechnicalConfigShell from '../components/TechnicalConfigShell';
import technicalConfigService from '../../infrastructure/technicalConfigService';
import { apiErrorToText } from '../components/technicalConfigUtils';
import styles from '../components/TechnicalConfig.module.css';
import SortableTableHeader from '@components/SortableTableHeader';
import useTableSort from '@hooks/useTableSort';

export default function TechnicalComparisonScalesPage() {
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { setScales(await technicalConfigService.listComparisonScales({ page_size: 1000 })); }
    catch (error) { toast.error(apiErrorToText(error)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const scaleSortColumns = useMemo(() => ({
    name: (scale) => scale.nombre,
    code: (scale) => scale.codigo,
    values: (scale) => scale.items_count ?? scale.cantidad_items,
    status: (scale) => scale.activo,
  }), []);
  const { sortedRows, sort, requestSort } = useTableSort(scales, scaleSortColumns, {
    key: 'name',
    direction: 'asc',
  });
  const toggle = async (scale) => {
    try { await technicalConfigService.patchComparisonScale(scale.id, { activo: !scale.activo }); await load(); }
    catch (error) { toast.error(apiErrorToText(error)); }
  };
  const actions = (
    <>
      <Link className={styles.btn + ' ' + styles.secondary} href="/configuracion-tecnica"><ArrowLeft size={17}/> Volver</Link>
      <Link className={styles.primaryButton} href="/configuracion-tecnica/escalas/create"><Plus size={17}/> Nueva escala</Link>
    </>
  );

  return <TechnicalConfigShell title="Escalas de comparación" subtitle="Listas ordenadas para resultados cualitativos y alfanuméricos." action={actions}>
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Escalas configuradas</h2>
          <p className={styles.cardSubtitle}>Cree, edite, active o desactive escalas ordinales.</p>
        </div>
        <div className={styles.actions}>{actions}</div>
      </div>
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><SortableTableHeader column="name" label="Nombre" sort={sort} onSort={requestSort}/><SortableTableHeader column="code" label="Codigo" sort={sort} onSort={requestSort}/><SortableTableHeader column="values" label="Valores" sort={sort} onSort={requestSort}/><SortableTableHeader column="status" label="Estado" sort={sort} onSort={requestSort}/><th>Acciones</th></tr></thead><tbody>
        {!loading && !scales.length && <tr><td colSpan="5">No hay escalas configuradas.</td></tr>}
        {sortedRows.map((scale) => <tr key={scale.id}><td><strong>{scale.nombre}</strong></td><td>{scale.codigo}</td><td>{scale.items_count ?? scale.cantidad_items ?? '-'}</td><td className={scale.activo ? styles.statusActive : ''}>{scale.activo ? 'Activa' : 'Inactiva'}</td><td><div className={styles.inlineActions}><Link title="Editar" href={`/configuracion-tecnica/escalas/edit/${scale.id}`}><Pencil size={17}/></Link><button title={scale.activo ? 'Desactivar' : 'Activar'} onClick={() => toggle(scale)}><Power size={17}/></button></div></td></tr>)}
      </tbody></table></div>
    </section>
  </TechnicalConfigShell>;
}
