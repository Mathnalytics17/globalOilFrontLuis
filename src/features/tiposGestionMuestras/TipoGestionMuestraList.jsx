import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { CalendarClock, Pencil, Plus, RefreshCw, Search, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'react-toastify';

import { sampleManagementTypesService } from '@features/samples/infrastructure/sampleManagementTypesService';
import { getApiErrorMessage } from './apiErrors';

const getCompaniesLabel = (item) => {
  if (item.aplica_a_todos) return 'Todas las empresas';

  const companies = item.empresas_permitidas_info || [];
  if (!companies.length) return 'Sin empresas asignadas';

  if (companies.length <= 2) {
    return companies.map((company) => company.nombre || company.name || `Empresa ${company.id}`).join(', ');
  }

  return `${companies.length} empresas específicas`;
};

export default function TipoGestionMuestraList() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);

  useEffect(() => {
    load();
  }, [includeDeleted]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await sampleManagementTypesService.list({
        incluir_eliminados: includeDeleted ? 'true' : 'false',
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, 'No se pudieron cargar los tipos de gestión'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;

    return items.filter((item) => {
      const text = [
        item.nombre,
        item.dias_habiles,
        item.dias_calendario,
        getCompaniesLabel(item),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(term);
    });
  }, [items, search]);

  const stats = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.aplica_a_todos) acc.globales += 1;
        else acc.especificos += 1;
        if (item.activo && !item.deleted_at) acc.activos += 1;
        return acc;
      },
      { total: 0, globales: 0, especificos: 0, activos: 0 }
    );
  }, [items]);

  const remove = async (item) => {
    if (!confirm(`¿Eliminar el tipo de gestión "${item.nombre}"?`)) return;

    try {
      await sampleManagementTypesService.remove(item.id);
      toast.success('Tipo de gestión eliminado');
      await load();
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, 'No se pudo eliminar'));
    }
  };

  const restore = async (item) => {
    try {
      await sampleManagementTypesService.restore(item.id);
      toast.success('Tipo de gestión restaurado');
      await load();
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, 'No se pudo restaurar'));
    }
  };

  return (
    <div className="tg-page">
      <div className="tg-shell">
        <header className="tg-header">
          <div>
            <p>Configuración técnica</p>
            <h1>Tipos de gestión de muestras</h1>
            <span>
              Administra Comercial, PQRS, Postventa u otros tipos, con tiempos y visibilidad por empresa.
            </span>
          </div>

          <button
            className="tg-primary"
            onClick={() => router.push('/configuracion-tecnica/tipos-gestion-muestras/crear')}
          >
            <Plus size={18} /> Nuevo tipo
          </button>
        </header>

        <section className="tg-stats">
          <div className="tg-stat"><CalendarClock /><span>Total</span><b>{stats.total}</b></div>
          <div className="tg-stat"><CalendarClock /><span>Activos</span><b>{stats.activos}</b></div>
          <div className="tg-stat"><CalendarClock /><span>Globales</span><b>{stats.globales}</b></div>
          <div className="tg-stat"><CalendarClock /><span>Por empresa</span><b>{stats.especificos}</b></div>
        </section>

        <section className="tg-card tg-toolbar">
          <label>
            <span>Buscar</span>
            <div className="tg-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre, empresa, días..."
              />
            </div>
          </label>

          <label className="tg-check">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(event) => setIncludeDeleted(event.target.checked)}
            />
            Ver eliminados
          </label>

          <button className="tg-secondary" onClick={load}>
            <RefreshCw size={16} /> Actualizar
          </button>
        </section>

        <section className="tg-card">
          <div className="tg-table-wrap">
            <table className="tg-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Días hábiles</th>
                  <th>Días calendario</th>
                  <th>Visibilidad</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr><td colSpan="6">Cargando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="6">No hay tipos de gestión registrados.</td></tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <b>{item.nombre}</b>
                        {!item.aplica_a_todos && <small>Asignación específica</small>}
                      </td>
                      <td>{item.dias_habiles ?? 0}</td>
                      <td>{item.dias_calendario ?? 0}</td>
                      <td>{getCompaniesLabel(item)}</td>
                      <td>
                        {item.deleted_at || !item.activo ? (
                          <span className="tg-status off">Eliminado</span>
                        ) : (
                          <span className="tg-status on">Activo</span>
                        )}
                      </td>
                      <td>
                        <div className="tg-actions">
                          <button
                            className="tg-mini"
                            onClick={() => router.push(`/configuracion-tecnica/tipos-gestion-muestras/editar/${item.id}`)}
                          >
                            <Pencil size={15} /> Editar
                          </button>

                          {item.deleted_at || !item.activo ? (
                            <button className="tg-mini" onClick={() => restore(item)}>
                              <Undo2 size={15} /> Restaurar
                            </button>
                          ) : (
                            <button className="tg-danger-icon" onClick={() => remove(item)}>
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <style jsx global>{styles}</style>
    </div>
  );
}

const styles = `
.tg-page { min-height: 100vh; background: #09090b; color: #f8fafc; padding: 34px; }
.tg-shell { width: min(1440px, 100%); margin: 0 auto; }
.tg-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 24px; }
.tg-header p { color: #ff4545; text-transform: uppercase; letter-spacing: .18em; font-weight: 900; margin: 0 0 10px; font-size: 12px; }
.tg-header h1 { font-size: clamp(30px, 5vw, 52px); margin: 0 0 10px; line-height: 1; }
.tg-header span { color: #b7c7df; font-size: 17px; line-height: 1.6; }
.tg-primary, .tg-secondary, .tg-mini, .tg-danger-icon { border: 0; cursor: pointer; font-weight: 900; display: inline-flex; align-items: center; justify-content: center; gap: 9px; }
.tg-primary { min-height: 54px; border-radius: 16px; padding: 0 22px; background: #ef2429; color: #fff; box-shadow: 0 18px 40px rgba(239,36,41,.18); }
.tg-secondary { min-height: 50px; border-radius: 16px; padding: 0 18px; background: #23242c; color: #fff; border: 1px solid #343640; }
.tg-card { background: linear-gradient(180deg, #17181f, #111216); border: 1px solid #2b2d37; border-radius: 24px; padding: 26px; box-shadow: 0 22px 60px rgba(0,0,0,.25); }
.tg-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 18px; }
.tg-stat { background: linear-gradient(180deg,#17181f,#111216); border: 1px solid #2b2d37; border-radius: 22px; padding: 22px; display: grid; gap: 8px; }
.tg-stat svg { color: #ff4545; }
.tg-stat span { color: #9ca3af; }
.tg-stat b { font-size: 34px; }
.tg-toolbar { display: grid; grid-template-columns: 1fr auto auto; gap: 16px; align-items: end; margin-bottom: 18px; }
.tg-toolbar label > span { display: block; color: #e5e7eb; font-weight: 900; margin-bottom: 9px; }
.tg-search { position: relative; }
.tg-search svg { position: absolute; left: 15px; top: 18px; color: #9ca3af; }
.tg-search input { width: 100%; min-height: 54px; border-radius: 16px; border: 1px solid #30323a; background: #090a0f; color: #fff; padding: 0 16px 0 44px; font-weight: 800; outline: none; }
.tg-search input:focus { border-color: #ef2429; box-shadow: 0 0 0 4px rgba(239,36,41,.12); }
.tg-check { display: flex; gap: 10px; align-items: center; color: #e5e7eb; font-weight: 800; min-height: 50px; }
.tg-check input { width: 18px; height: 18px; accent-color: #ef2429; }
.tg-table-wrap { overflow: auto; }
.tg-table { width: 100%; min-width: 980px; border-collapse: collapse; }
.tg-table th { color: #a1a1aa; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; text-align: left; padding: 16px; border-bottom: 1px solid #2b2d37; }
.tg-table td { padding: 18px 16px; border-bottom: 1px solid #242630; color: #e5e7eb; vertical-align: middle; }
.tg-table td b { display: block; font-size: 16px; }
.tg-table td small { display: block; margin-top: 5px; color: #94a3b8; }
.tg-status { border-radius: 999px; padding: 7px 12px; font-weight: 900; font-size: 12px; }
.tg-status.on { background: rgba(34,197,94,.12); color: #4ade80; border: 1px solid rgba(34,197,94,.35); }
.tg-status.off { background: rgba(239,68,68,.12); color: #ff6b70; border: 1px solid rgba(239,68,68,.35); }
.tg-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
.tg-mini { min-height: 38px; border-radius: 12px; padding: 0 12px; background: #23242c; color: #fff; border: 1px solid #343640; }
.tg-danger-icon { width: 38px; height: 38px; border-radius: 12px; background: rgba(239,36,41,.12); color: #ff5b60; border: 1px solid rgba(239,36,41,.4); }
@media (max-width: 1000px) { .tg-stats { grid-template-columns: 1fr 1fr; } .tg-toolbar { grid-template-columns: 1fr; } .tg-secondary { width: 100%; } }
@media (max-width: 650px) { .tg-page { padding: 18px; } .tg-header { flex-direction: column; } .tg-primary { width: 100%; } .tg-stats { grid-template-columns: 1fr; } .tg-card { padding: 20px; border-radius: 20px; } }
`;
