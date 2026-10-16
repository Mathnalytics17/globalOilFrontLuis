import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Building2, Mail, MapPin, Pencil, Phone } from 'lucide-react';
import { toast } from 'react-toastify';

import RequirePermission from '@features/auth/presentation/RequirePermission';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import PageHeader from '@shared/ui/PageHeader';

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 border-t border-white/[0.06] py-4 first:border-t-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#747a83]" />
      <div className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.07em] text-[#747a83]">{label}</span>
        <strong className="mt-1 block break-words text-sm font-medium text-[#e5e7ea]">{value || '-'}</strong>
      </div>
    </div>
  );
}

function CompanyDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    if (!id) return;
    const fetchCompany = async () => {
      try { setCompany(await companiesService.getById(id)); }
      catch (error) {
        toast.error('Error al cargar compañía: ' + (error.response?.data?.message || error.message));
        router.push('/managment-companies');
      } finally { setLoading(false); }
    };
    fetchCompany();
  }, [id, router]);

  if (loading) return <div className="go-empty-state">Cargando empresa...</div>;
  if (!company) return <div className="go-empty-state">Compañía no encontrada.</div>;

  const name = company.nombre || company.name || '-';
  const active = company.is_active !== false && company.status !== 'BLOCKED';

  return (
    <main className="go-page">
      <div className="go-shell max-w-[1100px]">
        <button className="go-back" type="button" onClick={() => router.push('/managment-companies')}>
          <ArrowLeft className="h-4 w-4" /> Volver a empresas
        </button>
        <PageHeader
          title={name}
          subtitle="Información registrada, contacto y estado operativo de la empresa."
          actions={(
            <button className="go-primary" type="button" onClick={() => router.push(`/managment-companies/edit-companies/${id}`)}>
              <Pencil className="h-4 w-4" /> Editar empresa
            </button>
          )}
        />

        <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <section className="go-card">
            <div className="go-section-head"><div><h2>Información general</h2><p>Datos de identificación y contacto.</p></div></div>
            <DetailItem icon={Building2} label="Razón social" value={name} />
            <DetailItem icon={Building2} label="NIT" value={company.nit} />
            <DetailItem icon={MapPin} label="Dirección" value={company.direccion || company.address} />
            <DetailItem icon={Phone} label="Teléfono" value={company.telefono || company.phone} />
            <DetailItem icon={Mail} label="Correo" value={company.email} />
          </section>
          <aside className="go-card self-start">
            <div className="go-section-head"><div><h2>Estado</h2><p>Acceso actual de la empresa.</p></div></div>
            <span className={active ? 'go-status-on' : 'go-status-off'}>{company.status === 'READ_ONLY' ? 'Solo lectura' : company.status === 'BLOCKED' ? 'Bloqueada' : active ? 'Activa' : 'Inactiva'}</span>
            <dl className="mt-5">
              <div className="border-t border-white/[0.06] py-3"><dt className="text-[10px] uppercase tracking-[.07em] text-[#747a83]">Creada</dt><dd className="m-0 mt-1 text-sm text-[#d7dade]">{company.created_at ? new Date(company.created_at).toLocaleString() : '-'}</dd></div>
              <div className="border-t border-white/[0.06] py-3"><dt className="text-[10px] uppercase tracking-[.07em] text-[#747a83]">Última actualización</dt><dd className="m-0 mt-1 text-sm text-[#d7dade]">{company.updated_at ? new Date(company.updated_at).toLocaleString() : '-'}</dd></div>
            </dl>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function ProtectedCompanyDetail(props) {
  return <RequirePermission permissionsAny={['empresas.ver_todo_global', 'empresas.editar', 'empresas.crear']}><CompanyDetail {...props} /></RequirePermission>;
}
