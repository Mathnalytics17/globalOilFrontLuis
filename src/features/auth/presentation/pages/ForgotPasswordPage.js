import { useState } from 'react';
import { useRouter } from 'next/router';
import { Mail, Send } from 'lucide-react';

import { authService } from '@features/auth/infrastructure/authService';
import AuthShell from '@features/auth/presentation/AuthShell';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const validateForm = () => {
    const next = {};
    if (!email) next.email = 'El correo es requerido';
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = 'Ingrese un correo válido';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setErrors({});
    try {
      await authService.forgotPassword(email);
      setSuccess(true);
      setTimeout(() => router.push('/users/login'), 5000);
    } catch (error) {
      const data = error.response?.data;
      if (data?.email) setErrors({ email: data.email[0] });
      else setErrors({ general: data?.detail || data?.error || (error.request ? 'No se pudo conectar con el servidor' : 'Error al enviar el enlace de recuperación') });
    } finally { setIsLoading(false); }
  };

  if (success) {
    return (
      <AuthShell title="Revise su correo" subtitle="Enviamos un enlace de recuperación a la dirección indicada.">
        <div className="grid place-items-center gap-4 py-4 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full border border-white/[0.08] bg-[#202328] text-[#8c929b]"><Mail className="h-5 w-5" /></div>
          <p className="m-0 text-sm leading-6 text-[#aeb3bb]">El enlace fue enviado a <strong className="text-white">{email}</strong>. Será redirigido al inicio de sesión.</p>
          <button className="go-ghost" type="button" onClick={() => router.push('/users/login')}>Volver al inicio de sesión</button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Recuperar contraseña" subtitle="Ingrese su correo y le enviaremos un enlace para establecer una nueva contraseña." footer={<button className="go-link-quiet" type="button" onClick={() => router.push('/users/login')}>← Volver al inicio de sesión</button>}>
      <form onSubmit={handleSubmit} className="go-stack">
        {errors.general ? <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-sm text-[#ef858b]">{errors.general}</div> : null}
        <label className="go-stack !gap-1.5 text-xs font-semibold text-[#b8bdc5]">Correo
          <input className="min-h-10 rounded-md border border-[#353940] bg-[#141518] px-3 text-sm text-white outline-none focus:border-[#595f68]" type="email" value={email} onChange={(event) => { setEmail(event.target.value); if (errors.email) setErrors((prev) => ({ ...prev, email: '' })); }} placeholder="correo@empresa.com" />
          {errors.email ? <span className="text-[11px] text-[#e58b91]">{errors.email}</span> : null}
        </label>
        <button className="go-primary mt-2 w-full" type="submit" disabled={isLoading}><Send className="h-4 w-4" /> {isLoading ? 'Enviando...' : 'Enviar enlace'}</button>
      </form>
    </AuthShell>
  );
}
