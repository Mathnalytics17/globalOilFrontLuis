
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import { securityService } from '@features/security/infrastructure/securityService';
import RequirePermission from '@features/auth/presentation/RequirePermission';
import { ArrowLeft, Building2, Mail, Save, UserPlus } from 'lucide-react';

const emptyForm = {
  nombre: '',
  nit: '',
  direccion: '',
  telefono: '',
  email: '',
  is_active: true,
  admin_email: '',
  admin_role: '',
  transfer_existing_admin: false,
};

const getList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getRoleName = (role) => role?.nombre || role?.name || role?.codigo || role?.code || `Rol ${role?.id || ''}`;

const isCompanyRole = (role) => {
  const scope = String(role?.scope || role?.tipo || role?.role_scope || '').toUpperCase();
  const code = String(role?.codigo || role?.code || role?.nombre || role?.name || '').toLowerCase();
  return scope === 'COMPANY' || scope === 'EMPRESA' || code.includes('empresa') || code.includes('company');
};

const isValidEmail = (value) => /\S+@\S+\.\S+/.test(String(value || '').trim());

function CreateCompany() {
  const router = useRouter();
  const [formData, setFormData] = useState(emptyForm);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const companyRoles = useMemo(() => {
    const filtered = roles.filter(isCompanyRole);
    return filtered.length ? filtered : roles;
  }, [roles]);

  useEffect(() => {
    const loadRoles = async () => {
      setLoadingRoles(true);
      try {
        const data = await securityService.roles.list({ scope: 'COMPANY' });
        const roleList = getList(data);
        setRoles(roleList);

        const adminRole = roleList.find((role) => {
          const code = String(role.codigo || role.code || role.nombre || role.name || '').toLowerCase();
          return code.includes('admin') && (code.includes('empresa') || code.includes('company'));
        });

        if (adminRole) {
          setFormData((prev) => ({ ...prev, admin_role: String(adminRole.id) }));
        }
      } catch (error) {
        setRoles([]);
      } finally {
        setLoadingRoles(false);
      }
    };

    loadRoles();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validate = () => {
    if (!formData.nombre.trim()) return 'El nombre de la empresa es requerido.';
    if (!formData.nit.trim()) return 'El NIT es requerido.';
    if (formData.email && !isValidEmail(formData.email)) return 'El correo de la empresa no es válido.';
    if (!formData.admin_email.trim()) return 'El correo del administrador inicial es requerido.';
    if (!isValidEmail(formData.admin_email)) return 'El correo del administrador inicial no es válido.';
    if (companyRoles.length && !formData.admin_role) return 'Seleccione el rol del administrador inicial.';
    return '';
  };

  const buildPayload = () => {
    const payload = {
      nombre: formData.nombre.trim(),
      nit: formData.nit.trim(),
      direccion: formData.direccion.trim(),
      telefono: formData.telefono.trim(),
      email: formData.email.trim(),
      is_active: formData.is_active,
      admin_email: formData.admin_email.trim(),
      transfer_existing_admin: formData.transfer_existing_admin,
    };

    if (formData.admin_role) {
      payload.admin_role = formData.admin_role;
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const error = validate();
    if (error) {
      toast.warning(error);
      return;
    }

    setLoading(true);
    try {
      const created = await companiesService.create(buildPayload());
      if (created?.admin_invitation?.email_sent === false) {
        toast.warning('Empresa creada. El correo no pudo enviarse y quedó pendiente para reenvío desde Seguridad > Invitaciones.');
      } else {
        toast.success('Empresa creada. Se envió la invitación al administrador inicial.');
      }
      router.push('/managment-companies');
    } catch (error) {
      const data = error?.response?.data;
      const message =
        data?.detail ||
        data?.message ||
        data?.admin_email?.[0] ||
        data?.email?.[0] ||
        data?.nit?.[0] ||
        error.message ||
        'Error al crear empresa.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="companyCreatePage">
      <section className="companyCreateShell">
        <button type="button" className="backButton" onClick={() => router.push('/managment-companies')}>
          <ArrowLeft className="h-4 w-4" />
          Volver a empresas
        </button>

        <header className="pageHeader">
          <div>
            <p className="kicker">Empresas</p>
            <h1>Crear empresa</h1>
            <p>
              Registra una nueva empresa cliente y crea la invitación del administrador inicial.
            </p>
          </div>
          <div className="headerBadge">
            <Building2 className="h-4 w-4" />
            Alta de cliente
          </div>
        </header>

        <form className="formLayout" onSubmit={handleSubmit}>
          <section className="formSection">
            <div className="sectionHead">
              <span className="sectionNumber">1</span>
              <div>
                <h2>Datos de empresa</h2>
                <p>Información general y datos de contacto del cliente.</p>
              </div>
            </div>

            <div className="fieldsGrid">
              <label className="field">
                <span>Nombre de empresa <b>*</b></span>
                <input
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Ej. Mineros S.A."
                  required
                />
              </label>

              <label className="field">
                <span>NIT <b>*</b></span>
                <input
                  name="nit"
                  value={formData.nit}
                  onChange={handleChange}
                  placeholder="Ej. 900123456-7"
                  required
                />
              </label>

              <label className="field wide">
                <span>Dirección</span>
                <input
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  placeholder="Dirección principal"
                />
              </label>

              <label className="field">
                <span>Teléfono</span>
                <input
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="Teléfono de contacto"
                />
              </label>

              <label className="field">
                <span>Correo de empresa</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contacto@empresa.com"
                />
              </label>
            </div>

            <label className="toggleLine">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              <span>
                Empresa activa
                <small>Permite operación normal desde el momento de creación.</small>
              </span>
            </label>
          </section>

          <section className="formSection">
            <div className="sectionHead">
              <span className="sectionNumber">2</span>
              <div>
                <h2>Administrador inicial</h2>
                <p>Se creará una invitación para que el administrador active su cuenta.</p>
              </div>
            </div>

            <div className="adminNotice">
              <Mail className="h-4 w-4" />
              <span>
                El correo del administrador es obligatorio y debe ser válido. El sistema enviará un enlace de activación de un solo uso.
              </span>
            </div>

            <div className="fieldsGrid">
              <label className="field">
                <span>Correo administrador <b>*</b></span>
                <input
                  type="email"
                  name="admin_email"
                  value={formData.admin_email}
                  onChange={handleChange}
                  placeholder="admin@empresa.com"
                  required
                />
              </label>

              <label className="field">
                <span>Rol inicial <b>*</b></span>
                <select
                  name="admin_role"
                  value={formData.admin_role}
                  onChange={handleChange}
                  disabled={loadingRoles || !companyRoles.length}
                  required={Boolean(companyRoles.length)}
                >
                  <option value="">
                    {loadingRoles ? 'Cargando roles...' : companyRoles.length ? 'Seleccione rol' : 'Admin empresa por defecto'}
                  </option>
                  {companyRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {getRoleName(role)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flowBox">
              <UserPlus className="h-4 w-4" />
              <div>
                <strong>Flujo automático</strong>
                <p>
                  Al guardar, se crea la empresa, se genera la invitación del administrador y el enlace anterior no será reutilizable si se reenvía después.
                </p>
              </div>
            </div>

            <label className="toggleLine transferToggle">
              <input
                type="checkbox"
                name="transfer_existing_admin"
                checked={formData.transfer_existing_admin}
                onChange={handleChange}
              />
              <span>
                Reinvitar y transferir si el correo ya existe
                <small>
                  La cuenta conservará su identidad e historial. Solo cambiará a esta empresa cuando acepte la nueva invitación.
                </small>
              </span>
            </label>
          </section>

          <section className="footerBar">
            <button type="button" className="buttonSecondary" onClick={() => router.push('/managment-companies')} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="buttonPrimary" disabled={loading}>
              {loading ? (
                <span className="spinner" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Crear empresa e invitar admin
            </button>
          </section>
        </form>
      </section>

      <style jsx>{`
        .companyCreatePage { min-height:100%; color:var(--go-text); background:transparent; }
        .companyCreateShell { width:min(1120px,100%); margin:0 auto; }
        .backButton { display:inline-flex;align-items:center;gap:7px;margin:0 0 18px;padding:0;border:0;background:transparent;color:#9197a0;font-size:13px;font-weight:600; }
        .backButton:hover { color:#fff; }
        .pageHeader { display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:26px; }
        .kicker { margin:0 0 7px;color:#858b94;text-transform:uppercase;letter-spacing:.09em;font-size:11px;font-weight:650; }
        h1 { margin:0;font-size:34px;line-height:1.1;font-weight:650;letter-spacing:-.035em; }
        .pageHeader p { margin:8px 0 0;max-width:760px;color:#858b94;font-size:14px;line-height:1.55; }
        .headerBadge { min-height:38px;display:inline-flex;align-items:center;gap:8px;padding:0 12px;border:1px solid var(--go-border-soft);border-radius:7px;color:#cfd3d8;background:#1b1d20;font-size:12px;white-space:nowrap; }
        .formLayout { display:grid;gap:0; }
        .formSection { border-top:1px solid var(--go-border-soft);padding:24px 0; }
        .formSection:first-of-type { border-top:0;padding-top:0; }
        .sectionHead { display:flex;gap:13px;align-items:flex-start;margin-bottom:20px; }
        .sectionNumber { width:28px;height:28px;border:1px solid #3b3f45;border-radius:999px;display:grid;place-items:center;font-size:12px;font-weight:700;color:#d8dbe0;flex:0 0 auto; }
        .sectionHead h2 { margin:0;font-size:18px;font-weight:650;letter-spacing:-.02em; }
        .sectionHead p { margin:4px 0 0;color:#858b94;font-size:13px; }
        .fieldsGrid { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px; }
        .field { display:grid;gap:7px; } .field.wide { grid-column:1/-1; }
        .field span { color:#b8bdc5;font-size:12px;font-weight:650; } .field b { color:var(--go-red); }
        input,select { min-height:40px;border:1px solid #353940;background:#141518;color:#eef0f3;border-radius:7px;padding:8px 11px;outline:none;font-size:13px; }
        input:focus,select:focus { border-color:#595f68;box-shadow:0 0 0 2px rgba(255,255,255,.035); }
        .toggleLine { margin-top:16px;display:flex;align-items:flex-start;gap:10px;color:#d8dbe0;cursor:pointer;font-size:13px; }
        .transferToggle { padding:12px 14px;border:1px solid var(--go-border-soft);border-radius:8px;background:#17191c; }
        .toggleLine input { width:16px;height:16px;min-height:16px;accent-color:var(--go-red);margin-top:2px; }
        .toggleLine span { display:grid;gap:3px;font-weight:650; } .toggleLine small { color:#7f858e;font-weight:400;line-height:1.45; }
        .adminNotice,.flowBox { display:flex;gap:10px;align-items:flex-start;border:1px solid var(--go-border-soft);background:#17191c;color:#cdd1d6;padding:12px 14px;border-radius:8px;margin-bottom:16px;font-size:13px; }
        .adminNotice { border-left:2px solid rgba(239,43,50,.55); }
        .flowBox { margin:16px 0 0; } .flowBox strong { color:#eef0f3; } .flowBox p { margin:4px 0 0;color:#858b94;line-height:1.45; }
        .footerBar { border-top:1px solid var(--go-border-soft);padding-top:20px;display:flex;justify-content:flex-end;gap:8px; }
        .buttonPrimary,.buttonSecondary { min-height:40px;border-radius:7px;padding:0 14px;font-weight:650;font-size:13px;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer; }
        .buttonPrimary { background:var(--go-red);color:#fff;border:1px solid var(--go-red); }
        .buttonPrimary:hover { background:var(--go-red-hover);border-color:var(--go-red-hover); }
        .buttonSecondary { background:#1b1d20;color:#d1d5da;border:1px solid #34383f; }
        button:disabled { opacity:.5;cursor:not-allowed; }
        .spinner { width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:999px;animation:spin .8s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @media(max-width:760px){ .pageHeader,.footerBar{flex-direction:column;align-items:stretch}.fieldsGrid{grid-template-columns:1fr}.field.wide{grid-column:auto}.headerBadge{width:max-content} }
      `}</style>
    </main>
  );
}

export default function ProtectedCreateCompany(props) {
  return (
    <RequirePermission permissionsAny={['empresas.crear']}>
      <CreateCompany {...props} />
    </RequirePermission>
  );
}
