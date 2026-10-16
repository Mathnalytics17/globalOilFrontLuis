import { AlertTriangle, X } from 'lucide-react';

export default function AdvertenciaModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="register-warning-title" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <section className="w-full max-w-md rounded-xl border border-white/[0.1] bg-[#191b1e] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/[0.07] text-[#d8a44c]"><AlertTriangle className="h-5 w-5" /></div>
          <button type="button" className="go-mini h-8 w-8 p-0" aria-label="Cerrar" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <h2 id="register-warning-title" className="mt-5 text-lg font-semibold text-white">Antes de crear tu cuenta</h2>
        <p className="mt-2 text-sm leading-6 text-[#9ba1aa]">Crear una cuenta no garantiza el acceso. Elige la empresa correcta y espera la aprobación de su administrador, quien también definirá tu rol.</p>
        <div className="mt-6 flex justify-end"><button type="button" className="go-primary" onClick={onClose}>Continuar</button></div>
      </section>
    </div>
  );
}
