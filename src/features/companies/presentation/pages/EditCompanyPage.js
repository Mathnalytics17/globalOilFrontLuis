import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'react-toastify';

import RequirePermission from '@features/auth/presentation/RequirePermission';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import PageHeader from '@shared/ui/PageHeader';

function EditCompany() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [formData, setFormData] = useState({ nombre: '', nit: '', direccion: '', telefono: '', email: '', is_active: true });

  useEffect(() => {
    if (!id) return;
    const fetchCompany = async () => {
      try {
        const company = await companiesService.getById(id);
        setFormData({
          nombre: company.nombre || company.name || '',
          nit: company.nit || '',
          direccion: company.direccion || company.address || '',
          telefono: company.telefono || company.phone || '',
          email: company.email || '',
          is_active: company.is_active !== false,
        });
      } catch (error) {
        toast.error('Error al cargar compañía: ' + (error.response?.data?.message || error.message));
        router.push('/managment-companies');
      } finally {
        setInitialLoad(false);
      }
    };
    fetchCompany();
  }, [id, router]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (!formData.nombre.trim()) throw new Error('El nombre es requerido');
      if (!formData.nit.trim()) throw new Error('El NIT es requerido');
      await companiesService.patch(id, formData);
      toast.success('Compañía actualizada correctamente');
      router.push('/managment-companies');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Error al actualizar compañía');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoad) return <div className="go-empty-state">Cargando empresa...</div>;

  return (
    <main className="go-page">
      <div className="go-shell max-w-[1080px]">
        <button className="go-back" type="button" onClick={() => router.push('/managment-companies')}>
          <ArrowLeft className="h-4 w-4" /> Volver a empresas
        </button>
        <PageHeader
          title="Editar empresa"
          subtitle="Actualice la información operativa y de contacto de la empresa."
          actions={(
            <div className="flex gap-2">
              <button className="go-ghost" type="button" onClick={() => router.push('/managment-companies')} disabled={loading}>Cancelar</button>
              <button className="go-primary" type="submit" form="company-edit-form" disabled={loading}>
                <Save className="h-4 w-4" /> {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}
        />

        <form id="company-edit-form" className="go-card" onSubmit={handleSubmit}>
          <div className="go-section-head">
            <div>
              <h2>Información general</h2>
              <p>Datos principales que identifican a la empresa en el sistema.</p>
            </div>
          </div>
          <div className="go-form-grid">
            <label>Nombre <span className="text-go-red">*</span><input name="nombre" value={formData.nombre} onChange={handleChange} required /></label>
            <label>NIT <span className="text-go-red">*</span><input name="nit" value={formData.nit} onChange={handleChange} required /></label>
            <label className="go-span-2">Dirección<input name="direccion" value={formData.direccion} onChange={handleChange} /></label>
            <label>Teléfono<input name="telefono" value={formData.telefono} onChange={handleChange} /></label>
            <label>Correo<input type="email" name="email" value={formData.email} onChange={handleChange} /></label>
          </div>

          <div className="go-section mt-6">
            <div className="go-section-head mb-0">
              <div>
                <h2>Estado de la empresa</h2>
                <p>Una empresa inactiva no estará disponible para nuevas asignaciones.</p>
              </div>
              <label className="!flex-row items-center gap-3 !text-sm !font-medium">
                <input className="!h-4 !min-h-0 !w-4 accent-[var(--go-red)]" type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
                Empresa activa
              </label>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function ProtectedEditCompany(props) {
  return <RequirePermission permissionsAny={['empresas.editar']}><EditCompany {...props} /></RequirePermission>;
}
