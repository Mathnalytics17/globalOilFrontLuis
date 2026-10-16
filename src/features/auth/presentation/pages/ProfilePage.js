import { useEffect, useMemo, useState } from 'react';
import { Building2, Save, Trash2, User } from 'lucide-react';
import { toast } from 'react-toastify';

import { useAuth } from '@features/auth/presentation/context/AuthContext';
import { authService } from '@features/auth/infrastructure/authService';
import { getErrorMessage } from '@features/security/presentation/components/securityUi';
import PageHeader from '@shared/ui/PageHeader';

export default function UserProfilePage() {
  const { user, loadUser } = useAuth();
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ first_name: user?.first_name || '', last_name: user?.last_name || '', phone: user?.phone || '' });
  }, [user]);

  useEffect(() => () => { if (signaturePreview) URL.revokeObjectURL(signaturePreview); }, [signaturePreview]);

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
    } finally { setSaving(false); }
  };

  const chooseSignature = (file) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) return toast.warning('La firma debe ser una imagen PNG o JPG.');
    if (file.size > 2 * 1024 * 1024) return toast.warning('La firma no puede superar 2 MB.');
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
    } finally { setSaving(false); }
  };

  const savedSignature = user?.firma_predeterminada || '';
  const visibleSignature = signaturePreview || savedSignature;

  return (
    <main className="go-page">
      <div className="go-shell max-w-[1080px]">
        <PageHeader title="Mi perfil" subtitle="Consulte su información y actualice sus datos personales." />
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="go-card self-start">
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
              <div className="grid h-12 w-12 place-items-center rounded-full border border-white/[0.08] bg-[#202328] text-[#9da3ac]"><User className="h-6 w-6" /></div>
              <div className="min-w-0"><h2 className="m-0 truncate !text-base">{user?.full_name || user?.email || 'Usuario'}</h2><p className="m-0 mt-1 truncate text-xs text-[#777d86]">{user?.email}</p></div>
            </div>
            <dl className="m-0 mt-2">
              <div className="border-t border-white/[0.06] py-3 first:border-t-0"><dt className="text-[10px] uppercase tracking-[.07em] text-[#747a83]">Rol</dt><dd className="m-0 mt-1 text-sm text-[#d7dade]">{roleName}</dd></div>
              <div className="border-t border-white/[0.06] py-3"><dt className="flex items-center gap-1 text-[10px] uppercase tracking-[.07em] text-[#747a83]"><Building2 className="h-3 w-3" /> Empresa</dt><dd className="m-0 mt-1 text-sm text-[#d7dade]">{companyName}</dd></div>
              <div className="border-t border-white/[0.06] py-3"><dt className="text-[10px] uppercase tracking-[.07em] text-[#747a83]">Estado</dt><dd className="m-0 mt-1"><span className={user?.is_active === false ? 'go-status-off' : 'go-status-on'}>{user?.access_status || (user?.is_active === false ? 'Inactivo' : 'Activo')}</span></dd></div>
            </dl>
          </aside>

          <form onSubmit={submit} className="go-card">
            <div className="go-section-head"><div><h2>Datos personales</h2><p>Información visible dentro del sistema.</p></div></div>
            <div className="go-form-grid">
              <label>Nombre<input value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} /></label>
              <label>Apellido<input value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} /></label>
              <label className="go-span-2">Teléfono<input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></label>
              <label className="go-span-2">Correo<input value={user?.email || ''} disabled className="opacity-60" /></label>
            </div>

            <div className="go-section mt-6">
              <div className="go-section-head"><div><h2>Firma predeterminada</h2><p>Se aplicará automáticamente al generar o previsualizar reportes.</p></div></div>
              <div className="grid gap-4 md:grid-cols-[210px_minmax(0,1fr)] md:items-center">
                <div className="grid min-h-[120px] place-items-center overflow-hidden rounded-lg border border-dashed border-white/[0.12] bg-[#151719] p-3">
                  {visibleSignature ? <img className="max-h-[100px] max-w-full bg-white object-contain p-2" src={visibleSignature} alt="Firma predeterminada" /> : <span className="text-xs text-[#777d86]">Sin firma configurada</span>}
                </div>
                <div className="go-stack">
                  <label>Imagen PNG o JPG, máximo 2 MB<input type="file" accept="image/png,image/jpeg" onChange={(event) => chooseSignature(event.target.files?.[0])} /></label>
                  {savedSignature ? <button type="button" disabled={saving} onClick={removeSignature} className="go-danger w-fit"><Trash2 className="h-4 w-4" /> Eliminar firma</button> : null}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end"><button type="submit" disabled={saving} className="go-primary"><Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar cambios'}</button></div>
          </form>
        </div>
      </div>
    </main>
  );
}
