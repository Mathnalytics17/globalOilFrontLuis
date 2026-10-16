import { ShieldOff } from 'lucide-react';
import { useRouter } from 'next/router';
import AuthShell from '@features/auth/presentation/AuthShell';

export default function Unauthorized() {
  const router = useRouter();
  return (
    <AuthShell title="Acceso no autorizado" subtitle="Tu cuenta no tiene permisos para abrir esta vista.">
      <div className="flex gap-3 rounded-lg border border-white/[0.07] bg-[#15171a] p-4 text-sm text-[#a5abb4]"><ShieldOff className="h-5 w-5 shrink-0 text-[#e45d65]" /><p className="m-0 leading-6">Verifica tus permisos o contacta al administrador de tu empresa si necesitas acceso.</p></div>
      <button type="button" className="go-ghost mt-5" onClick={() => router.back()}>Volver</button>
    </AuthShell>
  );
}
