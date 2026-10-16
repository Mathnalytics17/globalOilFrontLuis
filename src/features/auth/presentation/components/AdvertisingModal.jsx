import { AlertTriangle } from 'lucide-react';

import Modal from '@shared/ui/Modal';

export default function AdvertisingModal({ onClose }) {
  return (
    <Modal
      open
      title="Antes de continuar"
      onClose={onClose}
      size="sm"
      footer={<button type="button" className="go-button-primary" onClick={onClose}>Continuar</button>}
    >
      <div className="grid gap-4 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-300">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h3 className="m-0 text-xl font-semibold text-white">Creación sujeta a aprobación</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-go-muted">
            Crear una cuenta no garantiza el acceso. Seleccione la empresa correcta y espere la aprobación del administrador, quien también definirá su rol.
          </p>
        </div>
      </div>
    </Modal>
  );
}
