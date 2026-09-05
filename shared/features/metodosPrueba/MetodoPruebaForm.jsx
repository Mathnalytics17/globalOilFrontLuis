import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { testMethodsService } from '@features/technical-config/infrastructure/testMethodsService';

const newSub = () => ({ codigo: "", nombre: "", descripcion: "", activo: true });

const MetodoPruebaForm = ({ mode = "create", id }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ codigo: "", nombre: "", descripcion: "", equipo: "", referencia_normativa: "", activo: true, submetodos: [] });

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    loadData();
  }, [mode, id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await testMethodsService.getById(id);
      setForm({
        codigo: data.codigo || "",
        nombre: data.nombre || "",
        descripcion: data.descripcion || "",
        equipo: data.equipo || "",
        referencia_normativa: data.referencia_normativa || "",
        activo: data.activo !== false,
        submetodos: data.submetodos || [],
      });
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!form.codigo.trim() || !form.nombre.trim()) {
      alert("Código y nombre son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion || null,
        equipo: form.equipo || null,
        referencia_normativa: form.referencia_normativa || null,
        submetodos: form.submetodos.map((s, i) => ({ ...s, orden: i + 1, activo: s.activo !== false })).filter((s) => s.nombre?.trim()),
      };
      if (mode === "edit") await testMethodsService.update(id, payload);
      else await testMethodsService.create(payload);
      router.push("/configuracion-tecnica/metodos-prueba");
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar el método técnico");
    } finally {
      setSaving(false);
    }
  };

  const updateSub = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      submetodos: prev.submetodos.map((s, i) => i === index ? { ...s, [field]: value } : s),
    }));
  };

  if (loading) return <div className="go-page"><div className="go-card">Cargando...</div></div>;

  return (
    <div className="go-page">
      <div className="go-shell">
        <button className="go-back" onClick={() => router.push("/configuracion-tecnica/metodos-prueba")}><ArrowLeft size={18}/> Volver</button>
        <div className="go-header">
          <div>
            <p className="go-kicker">Configuración técnica</p>
            <h1>{mode === "edit" ? "Editar método técnico" : "Crear método técnico"}</h1>
            <p>El método y sus submétodos técnicos se configuran aquí. No son resultados.</p>
          </div>
          <button className="go-primary" onClick={save} disabled={saving}><Save size={18}/> {saving ? "Guardando..." : "Guardar"}</button>
        </div>

        <div className="go-grid-two">
          <section className="go-card">
            <h2>Datos del método</h2>
            <div className="go-form-grid">
              <label>Código<input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })}/></label>
              <label>Nombre<input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}/></label>
              <label>Equipo<input value={form.equipo} onChange={(e) => setForm({ ...form, equipo: e.target.value })}/></label>
              <label>Referencia normativa<input value={form.referencia_normativa} onChange={(e) => setForm({ ...form, referencia_normativa: e.target.value })}/></label>
              <label className="go-span-2">Descripción<textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}/></label>
            </div>
          </section>

          <section className="go-card">
            <div className="go-section-head"><div><h2>Submétodos técnicos</h2><p>Opcionales. Pertenecen al método, no al resultado.</p></div><button className="go-ghost" onClick={() => setForm((p) => ({ ...p, submetodos: [...p.submetodos, newSub()] }))}><Plus size={16}/> Agregar</button></div>
            <div className="go-stack">
              {form.submetodos.length === 0 && <div className="go-empty">Este método no tiene submétodos técnicos.</div>}
              {form.submetodos.map((sub, index) => (
                <div className="go-subrow" key={index}>
                  <input placeholder="Código" value={sub.codigo || ""} onChange={(e) => updateSub(index, "codigo", e.target.value)}/>
                  <input placeholder="Nombre del submétodo" value={sub.nombre || ""} onChange={(e) => updateSub(index, "nombre", e.target.value)}/>
                  <button className="go-danger-icon" onClick={() => setForm((p) => ({ ...p, submetodos: p.submetodos.filter((_, i) => i !== index) }))}><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <style jsx global>{globalStyles}</style>
    </div>
  );
};

export const globalStyles = `
.go-page{min-height:100vh;background:#0b0b0d;color:#f5f5f5;padding:24px}.go-shell{max-width:1380px;margin:0 auto}.go-back{display:inline-flex;align-items:center;gap:8px;color:#aaa;background:transparent;border:0;margin-bottom:18px;cursor:pointer}.go-header{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin-bottom:22px}.go-header h1{font-size:32px;margin:4px 0;font-weight:800}.go-header p{color:#9ca3af;margin:0}.go-kicker{color:#ef4444!important;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:800}.go-card{background:linear-gradient(180deg,#18181b,#121214);border:1px solid #2a2a31;border-radius:22px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.22)}.go-card h2{margin:0 0 14px;font-size:19px}.go-grid-two{display:grid;grid-template-columns:1fr 1fr;gap:18px}.go-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.go-form-grid label,.go-card label{display:flex;flex-direction:column;gap:8px;color:#d4d4d8;font-size:13px;font-weight:700}.go-span-2{grid-column:span 2}input,textarea,select{background:#0f0f12;border:1px solid #33333b;border-radius:14px;color:#fff;padding:12px 13px;outline:none;width:100%;min-width:0}textarea{min-height:92px;resize:vertical}input:focus,textarea:focus,select:focus{border-color:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.12)}.go-primary,.go-ghost,.go-danger,.go-mini{border:0;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:800;cursor:pointer}.go-primary{background:#dc2626;color:#fff;padding:13px 18px}.go-primary:hover{background:#b91c1c}.go-primary:disabled{opacity:.55}.go-ghost{background:#24242a;color:#fff;padding:10px 13px;border:1px solid #33333b}.go-danger{background:#7f1d1d;color:#fecaca;padding:10px 13px}.go-mini{background:#2a2a31;color:#eee;padding:8px 10px;font-size:12px}.go-danger-icon{width:42px;height:42px;display:flex;align-items:center;justify-content:center;background:#2b1111;color:#fca5a5;border:1px solid #5f1d1d;border-radius:12px;cursor:pointer}.go-section-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}.go-section-head p{color:#9ca3af;margin:4px 0 0;font-size:13px}.go-stack{display:flex;flex-direction:column;gap:10px}.go-subrow{display:grid;grid-template-columns:.45fr 1fr auto;gap:10px}.go-empty{border:1px dashed #3f3f46;border-radius:16px;padding:18px;color:#8b8b93;text-align:center}.go-pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 10px;background:#26262d;color:#ddd;font-size:12px;border:1px solid #3b3b45}.go-table-wrap{overflow-x:auto;border-radius:18px;border:1px solid #2a2a31}.go-table{width:100%;border-collapse:collapse;min-width:900px}.go-table th{background:#19191d;color:#a1a1aa;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.07em;padding:13px}.go-table td{padding:14px;border-top:1px solid #292932;color:#e5e7eb;vertical-align:top}.go-actions{display:flex;justify-content:flex-end;gap:8px}.go-status-on{color:#86efac;background:#052e16;border:1px solid #166534;padding:5px 9px;border-radius:999px;font-size:12px}.go-status-off{color:#fca5a5;background:#450a0a;border:1px solid #7f1d1d;padding:5px 9px;border-radius:999px;font-size:12px}@media(max-width:1000px){.go-grid-two{grid-template-columns:1fr}.go-header{align-items:stretch;flex-direction:column}.go-primary{width:100%}}@media(max-width:640px){.go-page{padding:14px}.go-form-grid{grid-template-columns:1fr}.go-span-2{grid-column:auto}.go-subrow{grid-template-columns:1fr}.go-danger-icon{width:100%}.go-card{padding:16px;border-radius:18px}.go-header h1{font-size:26px}}
`;

export default MetodoPruebaForm;
