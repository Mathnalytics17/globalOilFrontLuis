import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { authService } from '@features/auth/infrastructure/authService';
import AuthShell from '@features/auth/presentation/AuthShell';

function extractTokenFromSearch(asPath = '') {
  if (!asPath) return '';
  const queryPart = asPath.includes('?') ? asPath.split('?')[1] : '';
  if (!queryPart) return '';
  const params = new URLSearchParams(queryPart.split('#')[0]);
  return params.get('token') || '';
}

export default function ResetPassword() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [safeToken, setSafeToken] = useState('');
  const [formData, setFormData] = useState({ new_password: '', new_password2: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || !router.isReady) return;
    const q = typeof router.query.token === 'string' ? router.query.token : Array.isArray(router.query.token) ? router.query.token[0] : '';
    const resolved = q || extractTokenFromSearch(router.asPath) || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') || '' : '');
    setSafeToken(resolved);
    setErrors((prev) => resolved ? ({ ...prev, general: undefined }) : ({ ...prev, general: 'Enlace inválido o faltante' }));
  }, [mounted, router.isReady, router.asPath, router.query.token]);

  const canSubmit = useMemo(() => Boolean(safeToken) && !isLoading, [safeToken, isLoading]);
  const handleChange = ({ target: { name, value } }) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, general: safeToken ? undefined : prev.general }));
  };

  const validate = () => {
    const next = {};
    if (!safeToken) next.general = 'Enlace de recuperación inválido';
    if (!formData.new_password) next.new_password = 'La nueva contraseña es requerida';
    else if (formData.new_password.length < 8) next.new_password = 'La contraseña debe tener al menos 8 caracteres';
    if (!formData.new_password2) next.new_password2 = 'Confirma tu nueva contraseña';
    else if (formData.new_password !== formData.new_password2) next.new_password2 = 'Las contraseñas no coinciden';
    setErrors(next);
    return !Object.keys(next).length;
  };

  const backendMessage = (error) => {
    const data = error?.response?.data;
    if (!data) return error?.request ? 'No se pudo conectar con el servidor' : 'Error inesperado';
    if (typeof data === 'string') return data;
    for (const key of ['detail', 'token', 'new_password', 'new_password2', 'non_field_errors']) {
      if (data[key]) return Array.isArray(data[key]) ? data[key][0] : data[key];
    }
    const first = Object.values(data)[0];
    return Array.isArray(first) ? first[0] : typeof first === 'string' ? first : 'Error al restablecer la contraseña';
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setIsLoading(true); setErrors({});
    try {
      await authService.resetPassword({ token: safeToken, ...formData });
      setSuccess(true);
      setTimeout(() => router.push('/users/login'), 2500);
    } catch (error) {
      setErrors({ general: backendMessage(error) });
    } finally { setIsLoading(false); }
  };

  if (!mounted) return <AuthShell title="Restablecer contraseña" subtitle="Validando el enlace de recuperación."><div className="flex items-center gap-3 text-sm text-[#858b94]"><Loader2 className="h-4 w-4 animate-spin" /> Cargando enlace...</div></AuthShell>;
  if (success) return <AuthShell title="Contraseña restablecida" subtitle="Tu contraseña fue actualizada correctamente."><div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm text-[#b9dec8]"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div>Serás redirigido al inicio de sesión en unos segundos.</div></div></AuthShell>;

  return (
    <AuthShell title="Restablecer contraseña" subtitle="Ingresa y confirma tu nueva contraseña." footer={<button type="button" className="text-[#b8bdc5] hover:text-white" onClick={() => router.push('/users/login')}>← Volver al inicio de sesión</button>}>
      <form className="grid gap-4" onSubmit={submit} noValidate>
        {errors.general ? <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3 text-sm text-[#f0a2a7]">{errors.general}</div> : null}
        {[['new_password','Nueva contraseña'], ['new_password2','Confirmar contraseña']].map(([name,label]) => (
          <label key={name} className="grid gap-2 text-xs font-semibold text-[#b8bdc5]">
            <span>{label}</span>
            <div className="relative"><KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666d76]" /><input className="h-10 w-full rounded-lg border border-white/[0.1] bg-[#141518] pl-10 pr-3 text-sm text-white outline-none focus:border-white/[0.24]" type="password" name={name} value={formData[name]} onChange={handleChange} autoComplete="new-password" placeholder="Mínimo 8 caracteres" /></div>
            {errors[name] ? <small className="text-[#e9898f]">{errors[name]}</small> : null}
          </label>
        ))}
        <button type="submit" className="go-primary mt-1 w-full" disabled={!canSubmit}>{isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</> : 'Guardar nueva contraseña'}</button>
      </form>
    </AuthShell>
  );
}
