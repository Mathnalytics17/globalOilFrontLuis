import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Building2, Check, Save, Search, X } from 'lucide-react';
import { toast } from 'react-toastify';

import { sampleManagementTypesService } from '@features/samples/infrastructure/sampleManagementTypesService';
import { companiesOptionsService } from '@features/companies/infrastructure/companiesOptionsService';
import { testsService } from '@features/technical-config/infrastructure/testsService';
import { getApiErrorMessage, getApiFieldErrors } from './apiErrors';

const emptyForm = {
  nombre: '',
  dias_habiles: 0,
  dias_calendario: 0,
  aplica_a_todos: true,
  empresas_permitidas: [],
  pruebas_sugeridas: [],
  activo: true,
};

const Field = ({ label, error, children, hint }) => (
  <label className="tg-field">
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
    {error && <em>{error}</em>}
  </label>
);

const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function TipoGestionMuestraForm({ mode = 'create', id }) {
  const router = useRouter();
  const isEdit = mode === 'edit';

  const [form, setForm] = useState(emptyForm);
  const [companies, setCompanies] = useState([]);
  const [tests, setTests] = useState([]);
  const [companySearch, setCompanySearch] = useState('');
  const [testSearch, setTestSearch] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadCompanies();
    loadTests();
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    loadItem();
  }, [isEdit, id]);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const data = await companiesOptionsService.list();
      setCompanies(data);
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar las empresas');
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadTests = async () => {
    try {
      const data = await testsService.list({ include_inactive: 'false' });
      setTests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar las pruebas');
    }
  };

  const loadItem = async () => {
    setLoading(true);
    try {
      const data = await sampleManagementTypesService.getById(id);
      setForm({
        nombre: data.nombre || '',
        dias_habiles: data.dias_habiles ?? 0,
        dias_calendario: data.dias_calendario ?? 0,
        aplica_a_todos: data.aplica_a_todos ?? true,
        empresas_permitidas: (data.empresas_permitidas || data.empresas_permitidas_info || []).map((item) =>
          typeof item === 'object' ? item.id : item
        ),
        pruebas_sugeridas: (data.pruebas_sugeridas || data.pruebas_sugeridas_info || []).map((item) =>
          typeof item === 'object' ? item.id : item
        ),
        activo: data.activo ?? true,
      });
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, 'No se pudo cargar el tipo de gestión'));
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const selectedCompanyIds = useMemo(
    () => form.empresas_permitidas.map((value) => String(value)),
    [form.empresas_permitidas]
  );

  const selectedCompanies = useMemo(
    () => companies.filter((company) => selectedCompanyIds.includes(String(company.id))),
    [companies, selectedCompanyIds]
  );

  const filteredCompanies = useMemo(() => {
    const term = companySearch.trim().toLowerCase();
    if (!term) return companies;
    return companies.filter((company) => company.nombre.toLowerCase().includes(term));
  }, [companies, companySearch]);

  const selectedTestIds = useMemo(
    () => form.pruebas_sugeridas.map((value) => String(value)),
    [form.pruebas_sugeridas]
  );

  const filteredTests = useMemo(() => {
    const term = testSearch.trim().toLowerCase();
    if (!term) return tests;
    return tests.filter((test) => [test.nombre_variable, test.acronimo, test.unidad_medida].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [tests, testSearch]);

  const toggleCompany = (companyId) => {
    const idStr = String(companyId);

    setForm((prev) => {
      const exists = prev.empresas_permitidas.map(String).includes(idStr);
      const next = exists
        ? prev.empresas_permitidas.filter((item) => String(item) !== idStr)
        : [...prev.empresas_permitidas, companyId];

      return { ...prev, empresas_permitidas: next };
    });

    setErrors((prev) => ({ ...prev, empresas_permitidas: undefined }));
  };

  const toggleTest = (testId) => {
    const idStr = String(testId);
    setForm((prev) => {
      const exists = prev.pruebas_sugeridas.map(String).includes(idStr);
      return {
        ...prev,
        pruebas_sugeridas: exists
          ? prev.pruebas_sugeridas.filter((item) => String(item) !== idStr)
          : [...prev.pruebas_sugeridas, testId],
      };
    });
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.nombre.trim()) nextErrors.nombre = 'El nombre es obligatorio.';
    if (toNumber(form.dias_habiles) < 0) nextErrors.dias_habiles = 'No puede ser negativo.';
    if (toNumber(form.dias_calendario) < 0) nextErrors.dias_calendario = 'No puede ser negativo.';

    if (!form.aplica_a_todos && form.empresas_permitidas.length === 0) {
      nextErrors.empresas_permitidas = 'Selecciona al menos una empresa o marca aplica a todos.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => ({
    nombre: form.nombre.trim(),
    dias_habiles: toNumber(form.dias_habiles),
    dias_calendario: toNumber(form.dias_calendario),
    aplica_a_todos: Boolean(form.aplica_a_todos),
    empresas_permitidas: form.aplica_a_todos ? [] : form.empresas_permitidas,
    pruebas_sugeridas: form.pruebas_sugeridas,
    activo: Boolean(form.activo),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setErrors({});

    try {
      const payload = buildPayload();

      if (isEdit) {
        await sampleManagementTypesService.update(id, payload);
        toast.success('Tipo de gestión actualizado');
      } else {
        await sampleManagementTypesService.create(payload);
        toast.success('Tipo de gestión creado');
      }

      router.push('/configuracion-tecnica/tipos-gestion-muestras');
    } catch (error) {
      console.error(error);
      setErrors(getApiFieldErrors(error));
      toast.error(getApiErrorMessage(error, 'No se pudo guardar el tipo de gestión'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="tg-page">
        <div className="tg-shell">
          <div className="tg-card tg-loading">Cargando tipo de gestión...</div>
        </div>
        <style jsx global>{styles}</style>
      </div>
    );
  }

  return (
    <div className="tg-page">
      <div className="tg-shell">
        <button className="tg-back" onClick={() => router.push('/configuracion-tecnica/tipos-gestion-muestras')}>
          <ArrowLeft size={18} /> Volver al listado
        </button>

        <header className="tg-header">
          <div>
            <p>Configuración técnica</p>
            <h1>{isEdit ? 'Editar tipo de gestión' : 'Crear tipo de gestión'}</h1>
            <span>
              Define tiempos de respuesta y si el tipo aplica a todas las empresas o solo a empresas específicas.
            </span>
          </div>

          <button className="tg-primary" disabled={saving} onClick={handleSubmit}>
            <Save size={18} /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </header>

        <form onSubmit={handleSubmit} className="tg-form-layout">
          <section className="tg-card">
            <div className="tg-section-title">
              <h2>Datos generales</h2>
              <p>Estos datos se verán al crear lotes de muestras.</p>
            </div>

            <div className="tg-grid">
              <Field label="Nombre *" error={errors.nombre}>
                <input
                  value={form.nombre}
                  onChange={(event) => updateField('nombre', event.target.value)}
                  placeholder="Ej: Comercial, PQRS, Postventa"
                />
              </Field>

              <Field
                label="Días hábiles"
                error={errors.dias_habiles}
                hint="Útil para SLA operativo interno."
              >
                <input
                  type="number"
                  min="0"
                  value={form.dias_habiles}
                  onChange={(event) => updateField('dias_habiles', event.target.value)}
                />
              </Field>

              <Field
                label="Días calendario"
                error={errors.dias_calendario}
                hint="Útil para vencimientos por fecha real."
              >
                <input
                  type="number"
                  min="0"
                  value={form.dias_calendario}
                  onChange={(event) => updateField('dias_calendario', event.target.value)}
                />
              </Field>
            </div>

            <div className="tg-switch-row">
              <button
                type="button"
                className={form.aplica_a_todos ? 'active' : ''}
                onClick={() => updateField('aplica_a_todos', true)}
              >
                <Check size={16} /> Visible para todos
              </button>

              <button
                type="button"
                className={!form.aplica_a_todos ? 'active' : ''}
                onClick={() => updateField('aplica_a_todos', false)}
              >
                <Building2 size={16} /> Solo empresas específicas
              </button>
            </div>

            <label className="tg-check">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(event) => updateField('activo', event.target.checked)}
              />
              Activo
            </label>
          </section>

          <section className="tg-card">
            <div className="tg-section-title">
              <h2>Pruebas sugeridas</h2>
              <p>Estas pruebas se podrán preseleccionar al asignar pruebas a muestras. El usuario podrá quitarlas o agregar otras.</p>
            </div>

            <div className="tg-company-toolbar">
              <div className="tg-search">
                <Search size={17} />
                <input
                  value={testSearch}
                  onChange={(event) => setTestSearch(event.target.value)}
                  placeholder="Buscar prueba..."
                />
              </div>
              <span>{form.pruebas_sugeridas.length} seleccionada(s)</span>
            </div>

            <div className="tg-company-grid">
              {filteredTests.length === 0 ? (
                <div className="tg-empty">No hay pruebas para mostrar.</div>
              ) : (
                filteredTests.map((test) => {
                  const selected = selectedTestIds.includes(String(test.id));
                  return (
                    <button
                      type="button"
                      key={test.id}
                      className={`tg-company-card ${selected ? 'selected' : ''}`}
                      onClick={() => toggleTest(test.id)}
                    >
                      <span>{test.acronimo ? `${test.acronimo} · ` : ''}{test.nombre_variable}</span>
                      {selected ? <Check size={18} /> : <PlusIcon />}
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {!form.aplica_a_todos && (
            <section className="tg-card">
              <div className="tg-section-title">
                <h2>Empresas permitidas</h2>
                <p>Solo estas empresas podrán ver este tipo de gestión al crear un lote.</p>
              </div>

              <div className="tg-company-toolbar">
                <div className="tg-search">
                  <Search size={17} />
                  <input
                    value={companySearch}
                    onChange={(event) => setCompanySearch(event.target.value)}
                    placeholder="Buscar empresa..."
                  />
                </div>

                <span>{selectedCompanies.length} seleccionada(s)</span>
              </div>

              {errors.empresas_permitidas && <div className="tg-error-box">{errors.empresas_permitidas}</div>}

              <div className="tg-company-grid">
                {loadingCompanies ? (
                  <div className="tg-empty">Cargando empresas...</div>
                ) : filteredCompanies.length === 0 ? (
                  <div className="tg-empty">No hay empresas para mostrar.</div>
                ) : (
                  filteredCompanies.map((company) => {
                    const selected = selectedCompanyIds.includes(String(company.id));

                    return (
                      <button
                        type="button"
                        key={company.id}
                        className={`tg-company-card ${selected ? 'selected' : ''}`}
                        onClick={() => toggleCompany(company.id)}
                      >
                        <span>{company.nombre}</span>
                        {selected ? <Check size={18} /> : <PlusIcon />}
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          )}

          <section className="tg-card tg-summary">
            <h2>Resumen</h2>
            <div>
              <span>Nombre</span>
              <b>{form.nombre || 'Sin nombre'}</b>
            </div>
            <div>
              <span>Tiempo</span>
              <b>
                {toNumber(form.dias_habiles)} hábiles / {toNumber(form.dias_calendario)} calendario
              </b>
            </div>
            <div>
              <span>Visibilidad</span>
              <b>{form.aplica_a_todos ? 'Todas las empresas' : `${selectedCompanies.length} empresa(s)`}</b>
            </div>
            <div>
              <span>Estado</span>
              <b>{form.activo ? 'Activo' : 'Inactivo'}</b>
            </div>
            <div>
              <span>Pruebas sugeridas</span>
              <b>{form.pruebas_sugeridas.length}</b>
            </div>
          </section>
        </form>
      </div>

      <style jsx global>{styles}</style>
    </div>
  );
}

const PlusIcon = () => <span className="tg-plus-dot">+</span>;

const styles = `
.tg-page {
  min-height: 100vh;
  background: #09090b;
  color: #f8fafc;
  padding: 34px;
}

.tg-shell {
  width: min(1440px, 100%);
  margin: 0 auto;
}

.tg-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  color: #cbd5e1;
  font-size: 15px;
  cursor: pointer;
  margin-bottom: 20px;
}

.tg-back:hover { color: #fff; }

.tg-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 24px;
}

.tg-header p {
  color: #ff4545;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-weight: 900;
  margin: 0 0 10px;
  font-size: 12px;
}

.tg-header h1 {
  font-size: clamp(30px, 5vw, 52px);
  margin: 0 0 10px;
  line-height: 1;
}

.tg-header span { color: #b7c7df; font-size: 17px; line-height: 1.6; }

.tg-primary,
.tg-secondary,
.tg-danger,
.tg-ghost {
  border: 0;
  border-radius: 16px;
  min-height: 50px;
  padding: 0 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-weight: 900;
  cursor: pointer;
}

.tg-primary { background: #ef2429; color: #fff; box-shadow: 0 18px 40px rgba(239, 36, 41, .18); }
.tg-primary:disabled { opacity: .6; cursor: not-allowed; }
.tg-secondary { background: #23242c; color: #fff; border: 1px solid #343640; }
.tg-ghost { background: #15161b; color: #e5e7eb; border: 1px solid #30323a; }
.tg-danger { background: rgba(239, 36, 41, .12); color: #ff5b60; border: 1px solid rgba(239, 36, 41, .4); }

.tg-form-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
  align-items: start;
}

.tg-card {
  background: linear-gradient(180deg, #17181f, #111216);
  border: 1px solid #2b2d37;
  border-radius: 24px;
  padding: 28px;
  box-shadow: 0 22px 60px rgba(0,0,0,.25);
}

.tg-form-layout .tg-card:first-child,
.tg-form-layout .tg-card:nth-child(2) { grid-column: 1 / 2; }
.tg-summary { grid-column: 2 / 3; grid-row: 1 / span 2; position: sticky; top: 20px; }

.tg-section-title { margin-bottom: 22px; }
.tg-section-title h2, .tg-summary h2 { margin: 0 0 7px; font-size: 24px; }
.tg-section-title p { margin: 0; color: #a8b4c5; line-height: 1.5; }

.tg-grid {
  display: grid;
  grid-template-columns: 1.2fr .7fr .7fr;
  gap: 16px;
}

.tg-field span {
  display: block;
  color: #e5e7eb;
  font-weight: 900;
  margin-bottom: 9px;
}

.tg-field input,
.tg-field select,
.tg-search input {
  width: 100%;
  min-height: 54px;
  border-radius: 16px;
  border: 1px solid #30323a;
  background: #090a0f;
  color: #fff;
  padding: 0 16px;
  font-weight: 800;
  outline: none;
}

.tg-field input:focus,
.tg-search input:focus { border-color: #ef2429; box-shadow: 0 0 0 4px rgba(239,36,41,.12); }
.tg-field small { display: block; color: #94a3b8; margin-top: 8px; }
.tg-field em { display: block; color: #ff6b70; margin-top: 8px; font-style: normal; font-size: 13px; }

.tg-switch-row {
  margin-top: 22px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid #30323a;
  border-radius: 18px;
  overflow: hidden;
}

.tg-switch-row button {
  min-height: 56px;
  border: 0;
  background: #24252b;
  color: #e5e7eb;
  font-weight: 900;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 9px;
}

.tg-switch-row button.active { background: #ef2429; color: white; }

.tg-check {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
  color: #e5e7eb;
  font-weight: 800;
}

.tg-check input { width: 18px; height: 18px; accent-color: #ef2429; }

.tg-company-toolbar {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.tg-search { position: relative; }
.tg-search svg { position: absolute; left: 15px; top: 18px; color: #9ca3af; }
.tg-search input { padding-left: 44px; }
.tg-company-toolbar > span { color: #cbd5e1; font-weight: 900; }

.tg-company-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  max-height: 420px;
  overflow: auto;
  padding-right: 4px;
}

.tg-company-card {
  min-height: 68px;
  border-radius: 16px;
  border: 1px solid #30323a;
  background: #0b0c11;
  color: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
  font-weight: 800;
}

.tg-company-card.selected { border-color: #ef2429; background: rgba(239,36,41,.12); color: #fff; }
.tg-plus-dot { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; border: 1px solid #40434f; color: #cbd5e1; }

.tg-error-box {
  background: rgba(239, 36, 41, .12);
  border: 1px solid rgba(239, 36, 41, .4);
  color: #ff7a7e;
  border-radius: 14px;
  padding: 12px 14px;
  margin-bottom: 14px;
  font-weight: 800;
}

.tg-summary div {
  display: grid;
  gap: 8px;
  padding: 16px 0;
  border-bottom: 1px solid #2b2d37;
}

.tg-summary span { color: #9ca3af; font-size: 13px; }
.tg-summary b { font-size: 18px; line-height: 1.35; }
.tg-summary div:last-child { border-bottom: 0; }

.tg-loading, .tg-empty { color: #cbd5e1; font-weight: 800; }
.tg-empty { grid-column: 1 / -1; padding: 18px; border: 1px dashed #3a3d48; border-radius: 16px; }

@media (max-width: 1100px) {
  .tg-form-layout { grid-template-columns: 1fr; }
  .tg-form-layout .tg-card,
  .tg-summary { grid-column: 1 / -1 !important; grid-row: auto !important; position: static; }
  .tg-grid { grid-template-columns: 1fr 1fr; }
  .tg-company-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 700px) {
  .tg-page { padding: 18px; }
  .tg-header { flex-direction: column; }
  .tg-primary { width: 100%; }
  .tg-grid, .tg-company-toolbar, .tg-switch-row, .tg-company-grid { grid-template-columns: 1fr; }
  .tg-card { padding: 20px; border-radius: 20px; }
}
`;
