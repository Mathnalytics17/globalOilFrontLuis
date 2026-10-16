import { Home } from 'lucide-react';
import { useRouter } from 'next/router';
import AuthShell from '@features/auth/presentation/AuthShell';

export default function Custom404() {
  const router = useRouter();
  return (
    <AuthShell title="Página no encontrada" subtitle="La ruta que intentas abrir no existe o fue movida.">
      <div className="mb-6 text-6xl font-semibold tracking-[-0.06em] text-[#30343a]">404</div>
      <button type="button" className="go-primary" onClick={() => router.push('/dashboard')}><Home className="h-4 w-4" /> Volver al inicio</button>
    </AuthShell>
  );
}
