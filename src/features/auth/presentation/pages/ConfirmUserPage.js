import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { usersService } from '@features/auth/infrastructure/usersService';
import { securityService } from '@features/security/infrastructure/securityService';
import AuthShell from '@features/auth/presentation/AuthShell';

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  if (data?.error) return data.error;
  try { if (data) return JSON.stringify(data); } catch {}
  return fallback;
};

export default function ConfirmUser() {
  const router = useRouter();
  const { token, invite } = router.query;
  const isInvite = invite === '1' || invite === 'true';
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [form, setForm] = useState({ first_name:'', last_name:'', password:'', password2:'' });
  const [visiblePasswords, setVisiblePasswords] = useState({ password: false, password2: false });
  const requiresPassword = Boolean(invitation?.requires_password);

  useEffect(() => {
    if (!router.isReady) return;
    if (!token) { setStatus('error'); setMessage('El enlace no tiene token de confirmación.'); return; }
    let mounted = true;
    const run = async () => {
      setStatus('loading'); setMessage('');
      if (!isInvite) {
        try { await usersService.verifyEmail({ token }); if (!mounted) return; setStatus('success'); setMessage('Email verificado exitosamente. Ya puedes iniciar sesión.'); setTimeout(() => router.push('/users/login'), 2500); }
        catch (error) { if (mounted) { setStatus('error'); setMessage(getErrorMessage(error, 'Error al verificar el email.')); } }
        return;
      }
      try {
        const data = await securityService.invitations.validate(token); if (!mounted) return;
        setInvitation(data); setForm((p) => ({ ...p, first_name:data?.metadata?.first_name || p.first_name, last_name:data?.metadata?.last_name || p.last_name })); setStatus('form');
      } catch (error) { if (mounted) { setStatus('error'); setMessage(getErrorMessage(error, 'La invitación no es válida o ya expiró.')); } }
    };
    run(); return () => { mounted = false; };
  }, [router.isReady, isInvite, token, router]);

  const accept = async (event) => {
    event.preventDefault();
    if (requiresPassword && form.password !== form.password2) { setMessage('Las contraseñas no coinciden.'); return; }
    try {
      setStatus('submitting'); setMessage('');
      await securityService.invitations.accept({ token, ...form });
      setStatus('success'); setMessage('Cuenta activada exitosamente. Ya puedes iniciar sesión.'); setTimeout(() => router.push('/users/login'), 2200);
    } catch (error) { setStatus('form'); setMessage(getErrorMessage(error, 'No se pudo activar la invitación.')); }
  };

  const title = status === 'form' || status === 'submitting' ? (requiresPassword ? 'Activar cuenta' : 'Confirmar acceso') : isInvite ? 'Confirmar invitación' : 'Verificar correo';
  return (
    <AuthShell title={title} subtitle={status === 'form' || status === 'submitting' ? 'Completa tus datos para acceder a Global Oil.' : 'Validando la información de tu enlace.'} footer={status === 'error' ? <button className="text-[#b8bdc5] hover:text-white" onClick={() => router.push('/users/login')}>Volver al inicio de sesión</button> : null}>
      {status === 'loading' ? <div className="flex items-center gap-3 text-sm text-[#858b94]"><Loader2 className="h-4 w-4 animate-spin" /> Validando enlace…</div> : null}
      {(status === 'form' || status === 'submitting') ? <form className="grid gap-4" onSubmit={accept}>
        {invitation ? <div className="rounded-lg border border-white/[0.07] bg-[#15171a] p-4 text-sm text-[#a5abb4]"><div><span className="text-[#6f7680]">Correo:</span> {invitation.email}</div><div><span className="text-[#6f7680]">Empresa:</span> {invitation.empresa_nombre || '-'}</div>{invitation.role_name ? <div><span className="text-[#6f7680]">Rol:</span> {invitation.role_name}</div> : null}{!requiresPassword ? <div className="mt-3 border-t border-white/[0.07] pt-3 text-[#b9dec8]">Esta cuenta ya existe: conservará su contraseña actual.</div> : null}</div> : null}
        {message ? <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3 text-sm text-[#f0a2a7]">{message}</div> : null}
        {[['first_name','Nombre','text'],['last_name','Apellido','text'],...(requiresPassword ? [['password','Contraseña','password'],['password2','Confirmar contraseña','password']] : [])].map(([name,label,type]) => {
          const isPassword = type === 'password';
          const visible = Boolean(visiblePasswords[name]);
          return <label key={name} className="grid gap-2 text-xs font-semibold text-[#b8bdc5]"><span>{label} *</span><div className="relative"><input className="h-10 w-full rounded-lg border border-white/[0.1] bg-[#141518] px-3 pr-10 text-sm text-white outline-none focus:border-white/[0.24] disabled:opacity-50" name={name} type={isPassword && !visible ? 'password' : 'text'} value={form[name]} onChange={(e) => setForm((p) => ({ ...p, [name]:e.target.value }))} disabled={status === 'submitting'} minLength={isPassword ? 8 : undefined} required />{isPassword ? <button type="button" onClick={() => setVisiblePasswords((current) => ({ ...current, [name]: !current[name] }))} disabled={status === 'submitting'} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#9aa2ad] hover:text-white disabled:opacity-50" aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`} title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button> : null}</div></label>;
        })}
        <button className="go-primary mt-1 w-full" disabled={status === 'submitting'}>{status === 'submitting' ? <><Loader2 className="h-4 w-4 animate-spin" /> Confirmando…</> : <><ShieldCheck className="h-4 w-4" /> {requiresPassword ? 'Activar cuenta' : 'Confirmar acceso'}</>}</button>
      </form> : null}
      {status === 'success' ? <div className="flex gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm text-[#b9dec8]"><CheckCircle2 className="h-5 w-5 shrink-0" /> {message}</div> : null}
      {status === 'error' ? <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-[#f0a2a7]">{message}</div> : null}
    </AuthShell>
  );
}
