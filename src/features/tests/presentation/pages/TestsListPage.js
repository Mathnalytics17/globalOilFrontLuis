import { useEffect, useMemo, useState } from "react";
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
import MetricStrip from "@shared/ui/MetricStrip";
import OverflowMenu from "@shared/ui/OverflowMenu";
import { testsService } from '@features/technical-config/infrastructure/testsService';
import PaginationBar from "@shared/ui/PaginationBar";
import DataTable from "@shared/ui/DataTable";

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


export default function PruebasPage() {
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = async () => {
    setLoading(true);

    try {
      const data = await testsService.page({
        include_inactive: includeInactive ? "true" : "false",
        // El endpoint no garantiza el filtro `search`. Se carga el catálogo
        // completo y se filtra localmente para que el texto visible siempre
        // determine las filas mostradas.
        page: 1,
        page_size: 1000,
      });

      setItems(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      console.error("Error cargando pruebas:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [includeInactive]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    if (!term) return items;
    return items.filter((test) => [
      test.nombre_variable,
      test.acronimo,
      test.condicion,
      test.unidad_medida,
      test.metodo_detalle?.codigo,
      test.metodo_detalle?.nombre,
      test.metodo_codigo,
      test.metodo_nombre,
      getEquipoNombre(test),
    ].filter(Boolean).join(' ').toLocaleLowerCase('es').includes(term));
  }, [items, search]);
  const visibleItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(1, Math.ceil(filtered.length / pageSize))));
  }, [filtered.length, pageSize]);

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

        <MetricStrip items={[
          { label: "Total pruebas", value: items.length, icon: Beaker },
          { label: "Resultados", value: totals.resultados, icon: GitBranch },
          { label: "Componentes", value: totals.componentes, icon: GitBranch },
        ]} />

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
                onChange={(e) => { setPage(1); setIncludeInactive(e.target.checked); }}
              />
              Ver eliminadas
            </label>

            <button className="go-ghost refresh-btn" onClick={load}>
              <RefreshCw size={16} />
              Actualizar
            </button>
          </div>
        </section>

        <section className="go-card p-0 overflow-visible">
          {loading ? (
            <div className="go-empty">Cargando pruebas...</div>
          ) : (
            <DataTable
              data={visibleItems}
              pagination={false}
              minWidth={820}
              defaultSort={{ field: 'nombre_variable', order: 'asc' }}
              emptyMessage={search.trim() ? 'No hay pruebas que coincidan con la búsqueda.' : 'No hay pruebas registradas.'}
              columns={[
                {
                  id: 'nombre_variable',
                  label: 'Prueba',
                  mobileTitle: true,
                  minWidth: 180,
                  render: (p) => (
                    <div>
                      <b>{p.nombre_variable}</b>
                      <div className="test-acronym">{p.acronimo}</div>
                      {p.condicion ? <small className="test-condition">{p.condicion}</small> : null}
                    </div>
                  ),
                },
                { id: 'metodo_codigo', label: 'Método técnico', minWidth: 160, render: getMetodoNombre },
                { id: 'equipo', label: 'Equipo', minWidth: 150, sortable: false, render: (p) => <span className="equipment-name">{getEquipoNombre(p)}</span> },
                { id: 'unidad_medida', label: 'Unidad', width: 90, render: (p) => p.unidad_medida || '-' },
                {
                  id: 'total_resultados',
                  label: 'Estructura',
                  minWidth: 175,
                  render: (p) => <div className="structure-pills"><span className="go-pill">{p.total_resultados || 0} resultados</span><span className="go-pill">{p.total_componentes || 0} componentes</span></div>,
                },
                { id: 'activo', label: 'Estado', width: 100, render: (p) => p.activo ? <span className="go-status-on">Activa</span> : <span className="go-status-off">Eliminada</span> },
                {
                  id: 'acciones',
                  label: 'Acciones',
                  sortable: false,
                  searchable: false,
                  mobileHidden: true,
                  width: 72,
                  render: (p) => <OverflowMenu items={[
                    { label: "Editar", icon: Pencil, onClick: () => router.push(`/configuracion-tecnica/pruebas/editar-prueba/${p.id}`) },
                    p.activo ? { label: "Eliminar", icon: Trash2, danger: true, onClick: () => remove(p) } : { label: "Restaurar", icon: RefreshCw, onClick: () => restore(p) },
                  ]} />,
                },
              ]}
            />
          )}
          <div className="px-3">
            <PaginationBar count={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />
          </div>
        </section>
      </div>

      <style jsx global>{`
        .search-card {
          margin-bottom: 18px;
        }

        .go-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          border: 0;
          background: transparent;
          color: #858b94;
          border-radius: 0;
          padding: 0;
          font-weight: 550;
          cursor: pointer;
        }

        .go-back:hover {
          color: #fff;
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
          color: #858b94;
          font-weight: 650;
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
          .search-grid {
            grid-template-columns: 1fr !important;
          }

          .include-inactive {
            padding-top: 0;
          }

        }

        @media (max-width: 560px) {
          .go-header {
            flex-direction: column;
            align-items: stretch;
          }

        }
      `}</style>
    </div>
  );
}
