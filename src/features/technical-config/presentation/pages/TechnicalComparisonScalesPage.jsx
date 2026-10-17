import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Power } from 'lucide-react';
import OverflowMenu from '@shared/ui/OverflowMenu';
import { toast } from 'react-toastify';
import TechnicalConfigShell from '../components/TechnicalConfigShell';
import technicalConfigService from '../../infrastructure/technicalConfigService';
import { apiErrorToText } from '../components/technicalConfigUtils';
import styles from '../components/TechnicalConfig.module.css';
import DataTable from '@shared/ui/DataTable';
import useTableSort from '@shared/hooks/useTableSort';

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
  const actions = <Link className={styles.primaryButton} href="/configuracion-tecnica/escalas/create"><Plus size={17}/> Nueva escala</Link>;

  return <TechnicalConfigShell title="Escalas de comparación" subtitle="Listas ordenadas para resultados cualitativos y alfanuméricos." action={actions}>
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Escalas configuradas</h2>
          <p className={styles.cardSubtitle}>Cree, edite, active o desactive escalas ordinales.</p>
        </div>
      </div>
      <DataTable
        data={sortedRows}
        rowKey="id"
        pagination
        initialRowsPerPage={15}
        pageSizeOptions={[10, 15, 25, 50]}
        minWidth={760}
        sort={sort ? { field: sort.key, direction: sort.direction } : null}
        onSort={requestSort}
        emptyMessage={loading ? 'Cargando escalas…' : 'No hay escalas configuradas.'}
        columns={[
          { id: 'name', label: 'Nombre', mobileTitle: true, render: (scale) => <strong>{scale.nombre}</strong> },
          { id: 'code', label: 'Código', render: (scale) => scale.codigo },
          { id: 'values', label: 'Valores', render: (scale) => scale.items_count ?? scale.cantidad_items ?? '-' },
          { id: 'status', label: 'Estado', render: (scale) => <span className={scale.activo ? styles.statusActive : ''}>{scale.activo ? 'Activa' : 'Inactiva'}</span> },
          { id: 'acciones', label: 'Acciones', sortable: false, mobileActions: true, render: (scale) => <OverflowMenu items={[{ label: 'Editar', icon: Pencil, onClick: () => window.location.assign(`/configuracion-tecnica/escalas/edit/${scale.id}`) }, { label: scale.activo ? 'Desactivar' : 'Activar', icon: Power, onClick: () => toggle(scale) }]} /> },
        ]}
      />
    </section>
  </TechnicalConfigShell>;
}
