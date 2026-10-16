import { ArrowLeft, Mail, ShieldCheck, User } from 'lucide-react';
import { useRouter } from 'next/router';
import PageHeader from '@shared/ui/PageHeader';

const userExample = { id: 1, name: 'Juan Pérez', email: 'juan@example.com', role: 'Administrador' };

export default function UserDetail({ user = userExample, onBack }) {
  const router = useRouter();
  const goBack = onBack || (() => router.back());
  return (
    <main className="go-page"><div className="go-shell max-w-[820px]">
      <button className="go-back" type="button" onClick={goBack}><ArrowLeft className="h-4 w-4" /> Volver</button>
      <PageHeader title="Detalle de usuario" subtitle="Información básica y rol asignado." />
      <section className="go-card">
        <div className="flex items-center gap-4 border-b border-white/[0.06] pb-5"><div className="grid h-14 w-14 place-items-center rounded-full bg-[#202328] text-[#8c929b]"><User className="h-7 w-7" /></div><div><h2 className="m-0 !text-lg">{user.name}</h2><p className="m-0 mt-1 text-sm text-[#858b94]">ID {user.id}</p></div></div>
        <div className="mt-2 grid gap-0"><div className="flex items-center gap-3 border-t border-white/[0.06] py-4 first:border-t-0"><Mail className="h-4 w-4 text-[#777d86]" /><span className="text-sm text-[#d7dade]">{user.email}</span></div><div className="flex items-center gap-3 border-t border-white/[0.06] py-4"><ShieldCheck className="h-4 w-4 text-[#777d86]" /><span className="text-sm text-[#d7dade]">{user.role}</span></div></div>
      </section>
    </div></main>
  );
}
