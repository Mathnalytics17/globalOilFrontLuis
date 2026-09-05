import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { AccountCircle, Business, DeleteOutline, Save } from '@mui/icons-material';
import { useAuth } from '@features/auth/application/AuthContext';
import { authService } from '@features/auth/infrastructure/authService';
import { getErrorMessage } from '@features/security/presentation/components/securityUi';

const fieldClass = 'min-h-[46px] w-full rounded-lg border border-white/15 bg-black/45 px-3 text-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20';

export default function UserProfilePage() {
  const { user, loadUser } = useAuth();
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
    });
  }, [user]);

  useEffect(() => () => {
    if (signaturePreview) URL.revokeObjectURL(signaturePreview);
  }, [signaturePreview]);

  const companyName = useMemo(
    () => user?.profile?.empresa_nombre || user?.empresa_nombre || user?.empresa || 'Sin empresa asociada',
    [user]
  );

  const roleName = useMemo(
    () => user?.profile?.role_name || user?.profile?.role_code || user?.role || 'Sin rol',
    [user]
  );

  const submit = async (event) => {
    event.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      let payload = form;
      if (signatureFile) {
        payload = new FormData();
        Object.entries(form).forEach(([key, value]) => payload.append(key, value));
        payload.append('firma_predeterminada', signatureFile);
      }
      await authService.updateCurrentUser(payload);
      await loadUser({ silent: true });
      setSignatureFile(null);
      setSignaturePreview('');
      toast.success('Perfil actualizado.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo actualizar el perfil.'));
    } finally {
      setSaving(false);
    }
  };

  const chooseSignature = (file) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      toast.warning('La firma debe ser una imagen PNG o JPG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.warning('La firma no puede superar 2 MB.');
      return;
    }
    if (signaturePreview) URL.revokeObjectURL(signaturePreview);
    setSignatureFile(file);
    setSignaturePreview(URL.createObjectURL(file));
  };

  const removeSignature = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await authService.updateCurrentUser({ firma_predeterminada: null });
      await loadUser({ silent: true });
      setSignatureFile(null);
      setSignaturePreview('');
      toast.success('Firma predeterminada eliminada.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo eliminar la firma.'));
    } finally {
      setSaving(false);
    }
  };

  const savedSignature = user?.firma_predeterminada || '';
  const visibleSignature = signaturePreview || savedSignature;

  return (
    <main className="min-h-full bg-[#101010] px-6 py-8 text-white md:px-10">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.35em] text-red-500">Cuenta</p>
            <h1 className="m-0 text-4xl font-semibold md:text-5xl">Mi perfil</h1>
            <p className="mt-3 text-lg text-zinc-400">Consulta tu información y actualiza tus datos personales.</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-5 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-red-600/15 text-red-400">
                <AccountCircle fontSize="large" />
              </div>
              <div className="min-w-0">
                <h2 className="m-0 truncate text-2xl font-semibold">{user?.full_name || user?.email || 'Usuario'}</h2>
                <p className="m-0 truncate text-zinc-400">{user?.email}</p>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                <span className="block text-xs uppercase tracking-widest text-zinc-500">Rol</span>
                <strong className="mt-1 block text-lg">{roleName}</strong>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                <span className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
                  <Business fontSize="small" /> Empresa
                </span>
                <strong className="block text-lg">{companyName}</strong>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                <span className="block text-xs uppercase tracking-widest text-zinc-500">Estado</span>
                <strong className="mt-1 block text-lg">{user?.access_status || (user?.is_active ? 'Activo' : 'Inactivo')}</strong>
              </div>
            </div>
          </aside>

          <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <h2 className="m-0 mb-5 text-2xl font-semibold">Datos personales</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-zinc-200">Nombre</span>
                <input className={fieldClass} value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-zinc-200">Apellido</span>
                <input className={fieldClass} value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-bold text-zinc-200">Teléfono</span>
                <input className={fieldClass} value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-bold text-zinc-200">Correo</span>
                <input className={`${fieldClass} opacity-70`} value={user?.email || ''} disabled />
              </label>
            </div>

            <div className="mt-7 border-t border-white/10 pt-6">
              <h3 className="m-0 text-xl font-semibold">Firma predeterminada</h3>
              <p className="mb-4 mt-1 text-sm text-zinc-400">
                Se aplicará automáticamente al generar o previsualizar tus reportes.
              </p>
              <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
                <div className="grid min-h-[120px] place-items-center overflow-hidden rounded-lg border border-dashed border-white/20 bg-black/35 p-3">
                  {visibleSignature ? (
                    <img className="max-h-[105px] max-w-full bg-white object-contain p-2" src={visibleSignature} alt="Firma predeterminada" />
                  ) : (
                    <span className="text-sm text-zinc-500">Sin firma configurada</span>
                  )}
                </div>
                <div className="grid gap-3">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-zinc-200">Imagen PNG o JPG, máximo 2 MB</span>
                    <input
                      className={fieldClass}
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(event) => chooseSignature(event.target.files?.[0])}
                    />
                  </label>
                  {savedSignature ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={removeSignature}
                      className="inline-flex min-h-[40px] w-fit items-center gap-2 rounded-lg border border-red-500/50 bg-transparent px-4 font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                    >
                      <DeleteOutline fontSize="small" /> Eliminar firma
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button type="submit" disabled={saving} className="inline-flex min-h-[46px] items-center gap-2 rounded-lg bg-red-600 px-5 font-black text-white transition hover:bg-red-500 disabled:opacity-60">
                <Save fontSize="small" /> {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
