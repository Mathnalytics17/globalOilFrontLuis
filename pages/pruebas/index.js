import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  ArrowLeft,
  Beaker,
  GitBranch,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { testsService } from '@features/technical-config/infrastructure/testsService';
import PaginationBar from "../../src/components/pagination/PaginationBar";
import SortableTableHeader from "../../shared/components/SortableTableHeader";
import useTableSort from "../../shared/hooks/useTableSort";
import { globalStyles } from "../../shared/features/metodosPrueba/MetodoPruebaForm";

function parsePythonDictString(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return null;
  }

  try {
    // Convierte strings tipo Python:
    // "{'id': 1, 'nombre': 'Equipo'}"
    // a JSON válido:
    // {"id": 1, "nombre": "Equipo"}
    const jsonLike = trimmed
      .replace(/'/g, '"')
      .replace(/\bNone\b/g, "null")
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false");

    return JSON.parse(jsonLike);
  } catch {
    return null;
  }
}

function getEquipoNombre(prueba) {
  if (!prueba) return "-";

  // Caso ideal: viene desde metodo_detalle.equipo_prueba_info
  if (prueba.metodo_detalle?.equipo_prueba_info?.nombre) {
    return prueba.metodo_detalle.equipo_prueba_info.nombre;
  }

  // Otros posibles nombres desde backend
  if (prueba.metodo_detalle?.equipo_prueba?.nombre) {
    return prueba.metodo_detalle.equipo_prueba.nombre;
  }

  if (prueba.equipo_medicion_info?.nombre) {
    return prueba.equipo_medicion_info.nombre;
  }

  if (prueba.equipo_medicion?.nombre) {
    return prueba.equipo_medicion.nombre;
  }

  // Si equipo viene como objeto
  if (typeof prueba.equipo === "object" && prueba.equipo !== null) {
    return prueba.equipo.nombre || prueba.equipo.name || "-";
  }

  // Si equipo viene como string tipo "{'id': 1, 'nombre': 'Equipo'}"
  const parsedEquipo = parsePythonDictString(prueba.equipo);
  if (parsedEquipo?.nombre) return parsedEquipo.nombre;
  if (parsedEquipo?.name) return parsedEquipo.name;

  // Si equipo viene como texto limpio
  if (typeof prueba.equipo === "string" && prueba.equipo.trim()) {
    return prueba.equipo;
  }

  return "-";
}

function getMetodoNombre(prueba) {
  if (!prueba) return "-";

  const codigo =
    prueba.metodo_detalle?.codigo ||
    prueba.metodo_codigo ||
    prueba.metodo?.codigo ||
    "";

  const nombre =
    prueba.metodo_detalle?.nombre ||
    prueba.metodo_nombre ||
    prueba.metodo?.nombre ||
    "";

  if (codigo && nombre) {
    return (
      <>
        <b>{codigo}</b>
        <br />
        <span>{nombre}</span>
      </>
    );
  }

  if (nombre) return nombre;
  if (codigo) return codigo;

  return "-";
}

const TEST_SORT_COLUMNS = {
  prueba: (row) => row.nombre_variable || row.acronimo,
  metodo: (row) => row.metodo_detalle?.codigo || row.metodo_codigo || row.metodo_detalle?.nombre,
  equipo: getEquipoNombre,
  unidad: (row) => row.unidad_medida,
  resultados: (row) => row.total_resultados,
  estado: (row) => row.activo,
};

export default function PruebasPage() {
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const load = async () => {
    setLoading(true);

    try {
      const data = await testsService.page({
        include_inactive: includeInactive ? "true" : "false",
        page,
        page_size: pageSize,
        search,
      });

      setItems(Array.isArray(data.results) ? data.results : []);
      setTotalCount(data.count || 0);
    } catch (error) {
      console.error("Error cargando pruebas:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [includeInactive, page, pageSize]);

  useEffect(() => {
    const id = setTimeout(() => { setPage(1); load(); }, 350);
    return () => clearTimeout(id);
  }, [search]);

  const filtered = items;
  const { sortedRows, sort, requestSort } = useTableSort(
    filtered,
    TEST_SORT_COLUMNS,
    { key: "prueba", direction: "asc" }
  );

  const totals = useMemo(() => {
    return items.reduce(
      (acc, p) => {
        acc.resultados += p.total_resultados || 0;
        acc.componentes += p.total_componentes || 0;
        return acc;
      },
      {
        resultados: 0,
        componentes: 0,
      }
    );
  }, [items]);

  const remove = async (p) => {
    const label = p.acronimo || p.nombre_variable || "esta prueba";

    if (!confirm(`¿Eliminar prueba ${label}?`)) return;

    try {
      await testsService.remove(p.id);
      await load();
    } catch (error) {
      console.error("Error eliminando prueba:", error);
      alert("No se pudo eliminar la prueba.");
    }
  };

  const restore = async (p) => {
    try {
      await testsService.restore(p.id);
      await load();
    } catch (error) {
      console.error("Error restaurando prueba:", error);
      alert("No se pudo restaurar la prueba.");
    }
  };

  return (
    <div className="go-page">
      <div className="go-shell">
        <div className="go-header">
          <div>
            <button
              type="button"
              className="go-back"
              onClick={() => router.push("/configuracion-tecnica")}
            >
              <ArrowLeft size={18} />
              Volver a configuración
            </button>
            <p className="go-kicker">Laboratorio</p>
            <h1>Catálogo de pruebas</h1>
            <p>
              Variables, método técnico seleccionado y estructura de resultados
              flexible.
            </p>
          </div>

          <button
            className="go-primary"
            onClick={() => router.push("/configuracion-tecnica/pruebas/crear-prueba")}
          >
            <Plus size={18} />
            Crear prueba
          </button>
        </div>

        <section className="stats-row">
          <div className="stat-card">
            <Beaker />
            <span>Total pruebas</span>
            <b>{items.length}</b>
          </div>

          <div className="stat-card">
            <GitBranch />
            <span>Resultados</span>
            <b>{totals.resultados}</b>
          </div>

          <div className="stat-card">
            <GitBranch />
            <span>Componentes</span>
            <b>{totals.componentes}</b>
          </div>
        </section>

        <section className="go-card search-card">
          <div className="go-form-grid search-grid">
            <label>
              <span>Buscar</span>

              <div className="search-input-wrap">
                <Search size={17} className="search-icon" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre, acrónimo, método, equipo..."
                />
              </div>
            </label>

            <label className="check-inline include-inactive">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              Ver eliminadas
            </label>

            <button className="go-ghost refresh-btn" onClick={load}>
              <RefreshCw size={16} />
              Actualizar
            </button>
          </div>
        </section>

        <section className="go-card">
          <div className="go-table-wrap">
            <table className="go-table">
              <thead>
                <tr>
                  <SortableTableHeader columnKey="prueba" label="Prueba" sort={sort} onSort={requestSort} />
                  <SortableTableHeader columnKey="metodo" label="Método técnico" sort={sort} onSort={requestSort} />
                  <SortableTableHeader columnKey="equipo" label="Equipo" sort={sort} onSort={requestSort} />
                  <SortableTableHeader columnKey="unidad" label="Unidad" sort={sort} onSort={requestSort} />
                  <SortableTableHeader columnKey="resultados" label="Estructura" sort={sort} onSort={requestSort} />
                  <SortableTableHeader columnKey="estado" label="Estado" sort={sort} onSort={requestSort} />
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7">Cargando...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7">No hay pruebas registradas.</td>
                  </tr>
                ) : (
                  sortedRows.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <b>{p.nombre_variable}</b>
                        <br />
                        <span className="test-acronym">{p.acronimo}</span>

                        {p.condicion && (
                          <small className="test-condition">
                            {p.condicion}
                          </small>
                        )}
                      </td>

                      <td>{getMetodoNombre(p)}</td>

                      <td>
                        <span className="equipment-name">
                          {getEquipoNombre(p)}
                        </span>
                      </td>

                      <td>{p.unidad_medida || "-"}</td>

                      <td>
                        <div className="structure-pills">
                          <span className="go-pill">
                            {p.total_resultados || 0} resultados
                          </span>
                          <span className="go-pill">
                            {p.total_componentes || 0} componentes
                          </span>
                        </div>
                      </td>

                      <td>
                        {p.activo ? (
                          <span className="go-status-on">Activa</span>
                        ) : (
                          <span className="go-status-off">Eliminada</span>
                        )}
                      </td>

                      <td>
                        <div className="go-actions">
                          <button
                            className="go-mini"
                            onClick={() =>
                              router.push(`/configuracion-tecnica/pruebas/editar-prueba/${p.id}`)
                            }
                          >
                            <Pencil size={15} />
                            Editar
                          </button>

                          {p.activo ? (
                            <button
                              className="go-danger-icon"
                              onClick={() => remove(p)}
                              title="Eliminar"
                            >
                              <Trash2 size={15} />
                            </button>
                          ) : (
                            <button
                              className="go-mini"
                              onClick={() => restore(p)}
                            >
                              Restaurar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <PaginationBar count={totalCount} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />
          </div>
        </section>
      </div>

      <style jsx global>{`
        ${globalStyles}

        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }

        .stat-card {
          background: linear-gradient(180deg, #18181b, #121214);
          border: 1px solid #2a2a31;
          border-radius: 20px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .stat-card svg {
          color: #ef4444;
        }

        .stat-card span {
          color: #9ca3af;
          font-size: 13px;
        }

        .stat-card b {
          font-size: 28px;
        }

        .search-card {
          margin-bottom: 18px;
        }

        .go-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          border: 1px solid #3a3a42;
          background: #111216;
          color: #d1d5db;
          border-radius: 12px;
          padding: 10px 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .go-back:hover {
          color: #fff;
          border-color: #ef4444;
        }

        .search-grid {
          grid-template-columns: 1fr auto auto;
          align-items: end;
        }

        .search-input-wrap {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 13px;
          color: #777;
        }

        .search-input-wrap input {
          padding-left: 38px;
        }

        .include-inactive {
          padding-top: 28px;
          white-space: nowrap;
        }

        .refresh-btn {
          align-self: end;
        }

        .test-acronym {
          color: #ef4444;
          font-weight: 900;
        }

        .test-condition {
          display: block;
          color: #aaa;
          margin-top: 4px;
        }

        .equipment-name {
          display: inline-block;
          max-width: 240px;
          line-height: 1.4;
          word-break: normal;
        }

        .structure-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        @media (max-width: 1100px) {
          .stats-row {
            grid-template-columns: 1fr 1fr;
          }

          .search-grid {
            grid-template-columns: 1fr !important;
          }

          .include-inactive {
            padding-top: 0;
          }

          .refresh-btn {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 560px) {
          .stats-row {
            grid-template-columns: 1fr;
          }

          .go-header {
            flex-direction: column;
            align-items: stretch;
          }

          .go-primary {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
