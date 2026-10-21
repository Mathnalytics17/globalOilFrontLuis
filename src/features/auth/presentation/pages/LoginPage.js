import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Eye, EyeOff, LogIn } from 'lucide-react';

import { useAuth } from '@features/auth/presentation/context/AuthContext';
import AuthShell from '@features/auth/presentation/AuthShell';
import { resolveHomeRoute } from '@features/auth/application/homeRoute';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login, isAuthenticated, isLoading: authLoading, user, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (isAuthenticated()) router.push(resolveHomeRoute(user, hasPermission));
    };
    checkAuth();
  }, [hasPermission, isAuthenticated, router, user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const next = {};
    if (!formData.email.trim()) next.email = 'El correo es requerido';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) next.email = 'Ingrese un correo válido';
    if (!formData.password) next.password = 'La contraseña es requerida';
    else if (formData.password.length < 6) next.password = 'La contraseña debe tener al menos 6 caracteres';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setErrors({});
    try {
      const result = await login(formData.email, formData.password);
      if (!result.success) setErrors({ general: result.error });
    } catch (error) {
      console.error(error);
      setErrors({ general: 'Ocurrió un error inesperado. Intente nuevamente.' });
    } finally { setIsLoading(false); }
  };

  if (authLoading) return (
    <div className="grid min-h-screen place-items-center bg-[#111214] text-[#d6d9dd]">
      <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
        <img src="/logo-global-oil.png" alt="Global Oil" className="h-auto w-32 opacity-90" />
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#565c65] border-t-[#ef2b2d]" />
        <p className="text-sm text-[#aeb7c7]">Preparando tu espacio de trabajo...</p>
      </div>
    </div>
  );

  return (
    <AuthShell
      title="Ingreso de usuarios"
      subtitle="Acceda al sistema con sus credenciales de Global Oil."
      footer={<Link href="/users/forgotPassword" className="text-[#d6d9dd] hover:text-white">¿Olvidó su contraseña?</Link>}
    >
      <form onSubmit={handleSubmit} className="go-stack">
        {errors.general ? <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-sm text-[#ef858b]">{errors.general}</div> : null}
        <label className="go-stack !gap-1.5 text-xs font-semibold text-[#b8bdc5]">Correo
          <input className="min-h-10 rounded-md border border-[#353940] bg-[#141518] px-3 text-sm text-white outline-none focus:border-[#595f68]" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="correo@empresa.com" />
          {errors.email ? <span className="text-[11px] text-[#e58b91]">{errors.email}</span> : null}
        </label>
        <label className="go-stack !gap-1.5 text-xs font-semibold text-[#b8bdc5]">Contraseña
          <div className="relative">
            <input className="min-h-10 w-full rounded-md border border-[#353940] bg-[#141518] px-3 pr-10 text-sm text-white outline-none focus:border-[#595f68]" type={passwordVisible ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" />
            <button type="button" onClick={() => setPasswordVisible((visible) => !visible)} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#9aa2ad] hover:text-white" aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password ? <span className="text-[11px] text-[#e58b91]">{errors.password}</span> : null}
        </label>
        <button type="submit" disabled={isLoading} className="go-primary mt-2 w-full"><LogIn className="h-4 w-4" /> {isLoading ? 'Ingresando...' : 'Ingresar'}</button>
      </form>
    </AuthShell>
  );
}
