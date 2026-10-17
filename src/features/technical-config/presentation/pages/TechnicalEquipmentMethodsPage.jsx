import { useEffect, useMemo, useState } from 'react';
import {
  Pencil as Edit3,
  FlaskConical,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  Trash2,
  Wrench,
} from 'lucide-react';

import { technicalConfigService } from '../../infrastructure/technicalConfigService';
import { apiErrorToText } from '../components/technicalConfigUtils';
import OverflowMenu from '@shared/ui/OverflowMenu';
import DataTable from '@shared/ui/DataTable';
import PageHeader from '@shared/ui/PageHeader';

const EMPTY_EQUIPMENT = { codigo: '', nombre: '', descripcion: '', activo: true };
const EMPTY_METHOD = { equipo_prueba: '', codigo: '', nombre: '', norma_referencia: '', descripcion: '', activo: true };

const Field = ({ label, children }) => (
  <label className="flex flex-col gap-1.5 text-xs font-medium text-[#b8bdc5]">
    <span>{label}</span>
    {children}
  </label>
);

const inputClass = 'min-h-10 w-full rounded-lg border border-[#353940] bg-[#141518] px-3 text-sm text-[#e8eaed] outline-none placeholder:text-[#5f656e] focus:border-[#555b64]';

export default function TechnicalEquipmentMethodsPage() {
  const [equipment, setEquipment] = useState([]);
  const [methods, setMethods] = useState([]);
  const [eqForm, setEqForm] = useState(EMPTY_EQUIPMENT);
  const [methodForm, setMethodForm] = useState(EMPTY_METHOD);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [editingEquipmentId, setEditingEquipmentId] = useState(null);
  const [editingMethodId, setEditingMethodId] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState('');

  const selectedEquipment = useMemo(
    () => equipment.find((item) => String(item.id) === String(selectedEquipmentId)),
    [equipment, selectedEquipmentId]
  );

  const load = async () => {
    setError('');
    try {
      const eq = await technicalConfigService.listTestEquipment();
      const nextEquipment = Array.isArray(eq) ? eq : [];
      setEquipment(nextEquipment);
      const active = selectedEquipmentId || nextEquipment?.[0]?.id || '';
      setSelectedEquipmentId(active ? String(active) : '');
      const mt = await technicalConfigService.listEquipmentMethods(active ? { equipo_prueba: active } : {});
      setMethods(Array.isArray(mt) ? mt : []);
    } catch (e) {
      setError(apiErrorToText(e));
    }
  };

  const loadMethods = async (equipmentId) => {
    try {
      const data = await technicalConfigService.listEquipmentMethods(equipmentId ? { equipo_prueba: equipmentId } : {});
      setMethods(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(apiErrorToText(e));
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    loadMethods(selectedEquipmentId);
    setMethodForm((current) => ({ ...current, equipo_prueba: selectedEquipmentId }));
  }, [selectedEquipmentId]);

  const resetEquipmentForm = () => {
    setEqForm(EMPTY_EQUIPMENT);
    setEditingEquipmentId(null);
  };

  const resetMethodForm = () => {
    setMethodForm({ ...EMPTY_METHOD, equipo_prueba: selectedEquipmentId });
    setEditingMethodId(null);
  };

  const saveEquipment = async (event) => {
    event.preventDefault();
    setError('');
    setOk('');
    try {
      const created = editingEquipmentId
        ? await technicalConfigService.updateTestEquipment(editingEquipmentId, eqForm)
        : await technicalConfigService.createTestEquipment(eqForm);
      setOk(editingEquipmentId ? 'Equipo actualizado.' : 'Equipo de prueba creado.');
      resetEquipmentForm();
      await load();
      if (created?.id) setSelectedEquipmentId(String(created.id));
    } catch (e) {
      setError(apiErrorToText(e));
    }
  };

  const saveMethod = async (event) => {
    event.preventDefault();
    setError('');
    setOk('');
    try {
      const payload = { ...methodForm, equipo_prueba: selectedEquipmentId || methodForm.equipo_prueba };
      if (editingMethodId) await technicalConfigService.updateEquipmentMethod(editingMethodId, payload);
      else await technicalConfigService.createEquipmentMethod(payload);
      setOk(editingMethodId ? 'Método actualizado.' : 'Método creado para el equipo seleccionado.');
      resetMethodForm();
      await loadMethods(selectedEquipmentId);
    } catch (e) {
      setError(apiErrorToText(e));
    }
  };

  const changeEquipmentStatus = async (item) => {
    try {
      if (item.activo === false) await technicalConfigService.restoreEquipment(item.id);
      else await technicalConfigService.deleteEquipment(item.id);
      setOk(item.activo === false ? 'Equipo reactivado.' : 'Equipo desactivado.');
      await load();
    } catch (e) {
      setError(apiErrorToText(e));
    }
  };

  const changeMethodStatus = async (item) => {
    try {
      if (item.activo === false) await technicalConfigService.restoreMethod(item.id);
      else await technicalConfigService.deleteMethod(item.id);
      setOk(item.activo === false ? 'Método reactivado.' : 'Método desactivado.');
      await loadMethods(selectedEquipmentId);
    } catch (e) {
      setError(apiErrorToText(e));
    }
  };

  const visibleEquipment = showInactive ? equipment : equipment.filter((item) => item.activo !== false);
  const normalizedSearch = search.trim().toLowerCase();
  const visibleMethods = (showInactive ? methods : methods.filter((item) => item.activo !== false)).filter((item) => {
    if (!normalizedSearch) return true;
    return [item.codigo, item.nombre, item.norma_referencia, item.equipo_prueba_info?.nombre]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch);
  });

  return (
    <div className="go-page">
      <div className="go-shell">
        <PageHeader
          eyebrow="Configuración técnica"
          title="Equipos y métodos"
          subtitle="Cree los equipos de medición usados en laboratorio y los métodos técnicos disponibles para cada uno."
          actions={null}
        />

        {error ? <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-sm text-[#ef9aa0]">{error}</div> : null}
        {ok ? <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-[#90d0aa]">{ok}</div> : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-xl border border-white/[0.065] bg-[#191b1e] p-5">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-[#202226] text-[#959ba4]"><Wrench size={17} /></span>
              <div>
                <h2 className="m-0 text-base font-semibold text-[#eceef1]">{editingEquipmentId ? 'Editar equipo de prueba' : 'Nuevo equipo de prueba'}</h2>
                <p className="mt-1 text-xs leading-5 text-[#7f858e]">Registre un equipo de medición disponible en el laboratorio.</p>
              </div>
            </div>

            <form onSubmit={saveEquipment} className="grid gap-4 sm:grid-cols-2">
              <Field label="Código">
                <input className={inputClass} value={eqForm.codigo} onChange={(e) => setEqForm({ ...eqForm, codigo: e.target.value })} placeholder="Ej. VISC-01" required />
              </Field>
              <Field label="Nombre">
                <input className={inputClass} value={eqForm.nombre} onChange={(e) => setEqForm({ ...eqForm, nombre: e.target.value })} placeholder="Ej. Viscosímetro" required />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Descripción">
                  <textarea className={`${inputClass} min-h-[92px] resize-y py-2.5`} value={eqForm.descripcion} onChange={(e) => setEqForm({ ...eqForm, descripcion: e.target.value })} placeholder="Descripción del equipo (opcional)" />
                </Field>
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                {editingEquipmentId ? <button type="button" className="go-ghost" onClick={resetEquipmentForm}>Cancelar</button> : null}
                <button className="go-primary" type="submit"><Plus size={15} /> {editingEquipmentId ? 'Guardar cambios' : 'Crear equipo'}</button>
              </div>
            </form>
          </section>

          <section className="rounded-xl border border-white/[0.065] bg-[#191b1e] p-5">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-[#202226] text-[#959ba4]"><FlaskConical size={17} /></span>
              <div>
                <h2 className="m-0 text-base font-semibold text-[#eceef1]">Métodos del equipo</h2>
                <p className="mt-1 text-xs leading-5 text-[#7f858e]">Defina los métodos técnicos asociados al equipo seleccionado.</p>
              </div>
            </div>

            <div className="mb-4 flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Field label="Equipo">
                  <select className={inputClass} value={selectedEquipmentId} onChange={(e) => setSelectedEquipmentId(e.target.value)}>
                    <option value="">Seleccione...</option>
                    {visibleEquipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.codigo} · {eq.nombre}</option>)}
                  </select>
                </Field>
              </div>
              {selectedEquipment ? (
                <OverflowMenu
                  items={[
                    {
                      label: 'Editar equipo',
                      icon: Edit3,
                      onClick: () => {
                        setEditingEquipmentId(selectedEquipment.id);
                        setEqForm({ codigo: selectedEquipment.codigo || '', nombre: selectedEquipment.nombre || '', descripcion: selectedEquipment.descripcion || '', activo: selectedEquipment.activo !== false });
                      },
                    },
                    {
                      label: selectedEquipment.activo === false ? 'Reactivar equipo' : 'Desactivar equipo',
                      icon: selectedEquipment.activo === false ? RotateCcw : Trash2,
                      danger: selectedEquipment.activo !== false,
                      onClick: () => changeEquipmentStatus(selectedEquipment),
                    },
                  ]}
                />
              ) : null}
            </div>

            <form onSubmit={saveMethod} className="grid gap-4 sm:grid-cols-2">
              <Field label="Código método">
                <input className={inputClass} value={methodForm.codigo} onChange={(e) => setMethodForm({ ...methodForm, codigo: e.target.value })} placeholder="Ej. ASTM D445" required />
              </Field>
              <Field label="Nombre método">
                <input className={inputClass} value={methodForm.nombre} onChange={(e) => setMethodForm({ ...methodForm, nombre: e.target.value })} placeholder="Ej. Viscosidad cinemática" required />
              </Field>
              <Field label="Norma de referencia">
                <input className={inputClass} value={methodForm.norma_referencia} onChange={(e) => setMethodForm({ ...methodForm, norma_referencia: e.target.value })} placeholder="Ej. ASTM D445" />
              </Field>
              <div />
              <div className="sm:col-span-2">
                <Field label="Descripción">
                  <textarea className={`${inputClass} min-h-[92px] resize-y py-2.5`} value={methodForm.descripcion} onChange={(e) => setMethodForm({ ...methodForm, descripcion: e.target.value })} placeholder="Descripción del método (opcional)" />
                </Field>
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                {editingMethodId ? <button type="button" className="go-ghost" onClick={resetMethodForm}>Cancelar</button> : null}
                <button className="go-primary" type="submit"><Plus size={15} /> {editingMethodId ? 'Guardar cambios' : 'Crear método'}</button>
              </div>
            </form>
          </section>
        </div>

        <section className="mt-4 overflow-hidden rounded-xl border border-white/[0.065] bg-[#191b1e]">
          <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="m-0 text-base font-semibold text-[#eceef1]">{selectedEquipment ? `Métodos de ${selectedEquipment.nombre}` : 'Métodos registrados'}</h2>
              <p className="mt-1 text-xs text-[#7f858e]">Métodos técnicos disponibles para el equipo seleccionado.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex h-9 min-w-[230px] items-center gap-2 rounded-lg border border-[#353940] bg-[#141518] px-3 text-[#777d86]">
                <Search size={14} />
                <input className="min-w-0 flex-1 border-0 bg-transparent text-xs text-[#e4e6e9] outline-none placeholder:text-[#5f656e]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código, nombre o norma..." />
              </label>
              <label className="flex items-center gap-2 text-xs text-[#9aa0a9]">
                <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Mostrar inactivos
              </label>
            </div>
          </div>

          <DataTable
            data={visibleMethods}
            rowKey="id"
            pagination
            preserveOrder
            initialRowsPerPage={15}
            pageSizeOptions={[10, 15, 25, 50]}
            minWidth={820}
            emptyMessage="No hay métodos para este equipo."
            columns={[
              { id: 'metodo', label: 'Método', mobileTitle: true, minWidth: 220, render: (method) => <><strong className="font-semibold text-[#f0f1f3]">{method.codigo}</strong><br /><span className="text-xs text-[#949aa3]">{method.nombre}</span></> },
              { id: 'norma', label: 'Norma', render: (method) => method.norma_referencia || '-' },
              { id: 'equipo', label: 'Equipo', render: (method) => method.equipo_prueba_info?.nombre || method.equipo_prueba },
              { id: 'estado', label: 'Estado', render: (method) => <span className={method.activo === false ? 'go-status-off' : 'go-status-on'}>{method.activo === false ? 'Inactivo' : 'Activo'}</span> },
              { id: 'acciones', label: 'Acciones', sortable: false, mobileActions: true, render: (method) => <OverflowMenu items={[{ label: 'Editar método', icon: Edit3, onClick: () => { setEditingMethodId(method.id); setMethodForm({ equipo_prueba: method.equipo_prueba || selectedEquipmentId, codigo: method.codigo || '', nombre: method.nombre || '', norma_referencia: method.norma_referencia || '', descripcion: method.descripcion || '', activo: method.activo !== false }); } }, { label: method.activo === false ? 'Reactivar método' : 'Desactivar método', icon: method.activo === false ? RotateCcw : Trash2, danger: method.activo !== false, onClick: () => changeMethodStatus(method) }]} /> },
            ]}
          />
        </section>
      </div>
    </div>
  );
}
