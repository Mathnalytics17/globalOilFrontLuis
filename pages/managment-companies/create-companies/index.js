
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import { securityService } from '@features/security/infrastructure/securityService';
import RequirePermission from '@features/auth/presentation/RequirePermission';
import {
  ArrowBack,
  Business,
  CheckCircle,
  Email,
  PersonAdd,
  Save,
} from '@mui/icons-material';

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
          <ArrowBack fontSize="small" />
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
            <Business />
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
              <Email />
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
              <PersonAdd />
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
                <Save fontSize="small" />
              )}
              Crear empresa e invitar admin
            </button>
          </section>
        </form>
      </section>

      <style jsx>{`
        .companyCreatePage {
          margin: -36px -44px;
          min-height: calc(100vh - 64px);
          color: #f7f7f7;
          background:
            radial-gradient(circle at 10% 0%, rgba(255,255,255,.08), transparent 25%),
            radial-gradient(circle at 88% 42%, rgba(239,35,42,.15), transparent 34%),
            linear-gradient(135deg, #171717 0%, #101010 48%, #090909 100%);
          padding: 42px 56px 52px;
        }

        .companyCreateShell {
          width: min(1180px, 92vw);
          margin: 0 auto;
        }

        .backButton {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          border: 0;
          color: #cfcfcf;
          cursor: pointer;
          font-size: 15px;
          margin-bottom: 24px;
        }

        .backButton:hover {
          color: #fff;
        }

        .pageHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 28px;
          margin-bottom: 32px;
        }

        .kicker {
          color: #ef232a;
          text-transform: uppercase;
          letter-spacing: .35em;
          font-size: 12px;
          font-weight: 900;
          margin: 0 0 12px;
        }

        h1 {
          margin: 0;
          font-size: clamp(38px, 4vw, 54px);
          line-height: 1.02;
          font-weight: 600;
          letter-spacing: -.04em;
        }

        .pageHeader p {
          margin: 12px 0 0;
          color: #b9b9b9;
          font-size: 17px;
          line-height: 1.45;
        }

        .headerBadge {
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 0 18px;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 999px;
          color: #f1f1f1;
          background: rgba(255,255,255,.035);
          white-space: nowrap;
        }

        .formLayout {
          display: grid;
          gap: 22px;
        }

        .formSection {
          border-top: 1px solid rgba(255,255,255,.13);
          padding: 28px 0 4px;
        }

        .sectionHead {
          display: flex;
          gap: 18px;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .sectionNumber {
          width: 38px;
          height: 38px;
          border: 1px solid rgba(255,255,255,.25);
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-size: 20px;
          color: #fff;
          flex: 0 0 auto;
        }

        .sectionHead h2 {
          margin: 0;
          font-size: 28px;
          font-weight: 500;
          letter-spacing: -.03em;
        }

        .sectionHead p {
          margin: 7px 0 0;
          color: #aaa;
          font-size: 15px;
        }

        .fieldsGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .field {
          display: grid;
          gap: 8px;
        }

        .field.wide {
          grid-column: 1 / -1;
        }

        .field span {
          color: #f4f4f4;
          font-size: 14px;
          font-weight: 700;
        }

        .field b {
          color: #ef232a;
        }

        input,
        select {
          min-height: 48px;
          border: 1px solid rgba(255,255,255,.17);
          background: rgba(5,5,5,.55);
          color: #fff;
          border-radius: 8px;
          padding: 0 14px;
          outline: none;
          font-size: 15px;
        }

        input:focus,
        select:focus {
          border-color: #ef232a;
          box-shadow: 0 0 0 3px rgba(239,35,42,.13);
        }

        .toggleLine {
          margin-top: 20px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          color: #fff;
          cursor: pointer;
        }

        .transferToggle {
          padding: 14px 16px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 10px;
          background: rgba(255,255,255,.025);
        }

        .toggleLine input {
          width: 18px;
          height: 18px;
          min-height: 18px;
          accent-color: #ef232a;
          margin-top: 3px;
        }

        .toggleLine span {
          display: grid;
          gap: 4px;
          font-weight: 800;
        }

        .toggleLine small {
          color: #999;
          font-weight: 400;
        }

        .adminNotice,
        .flowBox {
          display: flex;
          gap: 13px;
          align-items: flex-start;
          border: 1px solid rgba(239,35,42,.28);
          background: rgba(239,35,42,.075);
          color: #ffe1e3;
          padding: 15px 17px;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .flowBox {
          margin: 20px 0 0;
          border-color: rgba(255,255,255,.12);
          background: rgba(255,255,255,.035);
          color: #dfdfdf;
        }

        .flowBox strong {
          color: #fff;
        }

        .flowBox p {
          margin: 5px 0 0;
          color: #aaa;
          line-height: 1.4;
        }

        .footerBar {
          border-top: 1px solid rgba(255,255,255,.13);
          padding-top: 24px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .buttonPrimary,
        .buttonSecondary {
          min-height: 48px;
          border-radius: 8px;
          padding: 0 20px;
          font-weight: 900;
          font-size: 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
        }

        .buttonPrimary {
          background: linear-gradient(180deg, #ff2838, #d70d19);
          color: #fff;
          border: 1px solid #ef232a;
          box-shadow: 0 16px 32px rgba(239,35,42,.18);
        }

        .buttonSecondary {
          background: rgba(255,255,255,.03);
          color: #fff;
          border: 1px solid rgba(255,255,255,.20);
        }

        button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 3px solid rgba(255,255,255,.35);
          border-top-color: #fff;
          border-radius: 999px;
          animation: spin .8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .companyCreatePage {
            padding: 28px 22px;
          }

          .companyCreateShell {
            width: 100%;
          }

          .pageHeader,
          .footerBar {
            flex-direction: column;
            align-items: stretch;
          }

          .fieldsGrid {
            grid-template-columns: 1fr;
          }
        }
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
