import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Loader2, UserPlus } from 'lucide-react';
import AdvertenciaModal from '@features/auth/presentation/components/AdvertisingRegisterModal';
import { authService } from '@features/auth/infrastructure/authService';
import AuthShell from '@features/auth/presentation/AuthShell';
import { getApiErrorMessage } from '@shared/utils/errors';

export default function RegisterComponent({ companiesData = [] }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({ email:'', password:'', password2:'', first_name:'', last_name:'', phone:'', company:'', profile_picture:null });

  useEffect(() => setShowModal(true), []);
  const change = ({ target: { name, value } }) => { setFormData((p) => ({ ...p, [name]: value })); if (error) setError(''); };
  const file = (e) => setFormData((p) => ({ ...p, profile_picture: e.target.files?.[0] || null }));
  const validate = () => {
    const { email,password,password2,first_name,last_name,phone,company } = formData;
    if (!email || !password || !password2 || !first_name || !last_name || !phone || !company) return setError('Todos los campos marcados con * son obligatorios'), false;
    if (password !== password2) return setError('Las contraseñas no coinciden'), false;
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres'), false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Por favor ingresa un email válido'), false;
    return true;
  };
  const submit = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); if (!validate()) return; setLoading(true);
    try {
      const data = new FormData();
      ['email','password','password2','first_name','last_name','phone','company'].forEach((key) => data.append(key, formData[key]));
      if (formData.profile_picture) data.append('profile_picture', formData.profile_picture);
      await authService.register(data);
      setSuccess('Usuario registrado exitosamente.');
      setTimeout(() => router.push(router.query.mode === 'administrator' ? '/activesTree' : '/users/login'), 2200);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo completar el registro.'));
    } finally { setLoading(false); }
  };

  const fields = [
    ['first_name','Nombres *','text','Ingrese sus nombres'], ['last_name','Apellidos *','text','Ingrese sus apellidos'], ['email','Email *','email','correo@ejemplo.com'],
    ['phone','Teléfono *','tel','+57 300...'], ['password','Contraseña *','password','Mínimo 8 caracteres'], ['password2','Confirmar contraseña *','password','Repite la contraseña'],
  ];

  return (
    <>
      <AuthShell wide title="Crear cuenta" subtitle="Registra tus datos y selecciona la empresa a la que solicitarás acceso." footer={<button type="button" className="text-[#b8bdc5] hover:text-white" onClick={() => router.push('/users/login')}>¿Ya tienes cuenta? Iniciar sesión</button>}>
        <form onSubmit={submit} className="grid gap-5">
          {error ? <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3 text-sm text-[#f0a2a7]">{error}</div> : null}
          {success ? <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-sm text-[#b9dec8]">{success} Redirigiendo…</div> : null}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {fields.map(([name,label,type,placeholder]) => <label key={name} className="grid gap-2 text-xs font-semibold text-[#b8bdc5]"><span>{label}</span><input className="h-10 rounded-lg border border-white/[0.1] bg-[#141518] px-3 text-sm text-white outline-none focus:border-white/[0.24] disabled:opacity-50" name={name} type={type} value={formData[name]} onChange={change} placeholder={placeholder} disabled={loading || Boolean(success)} required /></label>)}
            <label className="grid gap-2 text-xs font-semibold text-[#b8bdc5]"><span>Empresa *</span><select className="h-10 rounded-lg border border-white/[0.1] bg-[#141518] px-3 text-sm text-white outline-none focus:border-white/[0.24]" name="company" value={formData.company} onChange={change} disabled={loading || Boolean(success)} required><option value="">Seleccione una empresa</option>{(Array.isArray(companiesData) ? companiesData : []).map((company) => <option key={company.id} value={company.id}>{company.name || company.nombre || company.razon_social || `Empresa ${company.id}`}</option>)}</select></label>
            <label className="grid gap-2 text-xs font-semibold text-[#b8bdc5]"><span>Foto de perfil</span><input className="min-h-10 rounded-lg border border-dashed border-white/[0.12] bg-[#141518] p-2 text-xs text-[#858b94]" type="file" accept="image/*" onChange={file} disabled={loading || Boolean(success)} /></label>
          </div>
          <div className="flex justify-end border-t border-white/[0.06] pt-5"><button className="go-primary min-w-[180px]" disabled={loading || Boolean(success)}>{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Registrando…</> : <><UserPlus className="h-4 w-4" /> Crear cuenta</>}</button></div>
        </form>
      </AuthShell>
      {showModal ? <AdvertenciaModal onClose={() => setShowModal(false)} /> : null}
    </>
  );
}
