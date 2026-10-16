import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, CalendarDays, Mail, MapPin, Pencil, Phone } from 'lucide-react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';

import RequirePermission from '@features/auth/presentation/RequirePermission';
import { companiesService } from '@features/companies/infrastructure/companiesService';

const CompanyDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    if (!id) return;
    const fetchCompany = async () => {
      try {
        setCompany(await companiesService.getById(id));
      } catch (error) {
        toast.error(`Error al cargar compañía: ${error.response?.data?.message || error.message}`);
        router.push('/managment-companies');
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, [id, router]);

  if (loading) return <div className="go-page-shell text-go-muted">Cargando compañía...</div>;
  if (!company) return <div className="go-page-shell text-go-muted">Compañía no encontrada.</div>;

  const name = company.nombre || company.name || 'Compañía';
  const address = company.direccion || company.address || '-';
  const phone = company.telefono || company.phone || '-';
  const email = company.email || '-';
  const active = company.is_active !== false && String(company.status || '').toUpperCase() !== 'INACTIVE';

  return (
    <main className="go-page-shell">
      <button type="button" className="go-button mb-5" onClick={() => router.push('/managment-companies')}><ArrowLeft size={16} /> Volver</button>
      <header className="go-page-header">
        <div>
          <h1>{name}</h1>
          <p>Información general, contacto y estado operativo de la empresa.</p>
        </div>
        <button type="button" className="go-button-primary" onClick={() => router.push(`/managment-companies/edit-companies/${id}`)}><Pencil size={16} /> Editar empresa</button>
      </header>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="go-panel">
          <div className="go-panel-header flex items-center gap-2 font-semibold"><Building2 size={17} /> Información general</div>
          <div className="go-panel-body grid gap-4">
            <Info label="Nombre" value={name} />
            <Info label="NIT" value={company.nit || '-'} />
            <div>
              <span className="mb-1 block text-xs uppercase tracking-widest text-go-muted">Estado</span>
              <span className="go-status" data-tone={active ? 'success' : 'danger'}>{active ? 'Activo' : 'Inactivo'}</span>
            </div>
          </div>
        </article>

        <article className="go-panel">
          <div className="go-panel-header font-semibold">Contacto</div>
          <div className="go-panel-body grid gap-4">
            <Info icon={<MapPin size={15} />} label="Dirección" value={address} />
            <Info icon={<Phone size={15} />} label="Teléfono" value={phone} />
            <Info icon={<Mail size={15} />} label="Correo" value={email} />
          </div>
        </article>

        <article className="go-panel lg:col-span-2">
          <div className="go-panel-header flex items-center gap-2 font-semibold"><CalendarDays size={17} /> Fechas</div>
          <div className="go-panel-body grid gap-4 md:grid-cols-2">
            <Info label="Fecha de creación" value={company.created_at ? new Date(company.created_at).toLocaleDateString() : '-'} />
            <Info label="Última actualización" value={company.updated_at ? new Date(company.updated_at).toLocaleDateString() : '-'} />
          </div>
        </article>
      </section>
    </main>
  );
};

function Info({ icon, label, value }) {
  return (
    <div>
      <span className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-go-muted">{icon}{label}</span>
      <strong className="text-base font-semibold text-go-text">{value || '-'}</strong>
    </div>
  );
}

export default function ProtectedCompanyDetail(props) {
  return (
    <RequirePermission permissionsAny={['empresas.ver_todo_global', 'empresas.editar', 'empresas.crear']}>
      <CompanyDetail {...props} />
    </RequirePermission>
  );
}
