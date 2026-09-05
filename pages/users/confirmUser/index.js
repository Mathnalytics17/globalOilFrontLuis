import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { usersService } from '@features/auth/infrastructure/usersService';
import { securityService } from '@features/security/infrastructure/securityService';

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  if (data?.error) return data.error;

  try {
    if (data) return JSON.stringify(data);
  } catch {}

  return fallback;
};

export default function ConfirmUser() {
  const router = useRouter();
  const { token, invite } = router.query;
  const isInvite = invite === '1' || invite === 'true';

  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    password: '',
    password2: '',
  });

  useEffect(() => {
    if (!router.isReady) return;

    if (!token) {
      setStatus('error');
      setMessage('El enlace no tiene token de confirmacion.');
      return;
    }

    let mounted = true;

    const run = async () => {
      setStatus('loading');
      setMessage('');

      if (!isInvite) {
        try {
          await usersService.verifyEmail({ token });
          if (!mounted) return;
          setStatus('success');
          setMessage('Email verificado exitosamente. Ya puedes iniciar sesion.');
          setTimeout(() => router.push('/users/login'), 3000);
        } catch (error) {
          if (!mounted) return;
          setStatus('error');
          setMessage(getErrorMessage(error, 'Error al verificar el email.'));
        }
        return;
      }

      try {
        const data = await securityService.invitations.validate(token);
        if (!mounted) return;

        setInvitation(data);
        setForm((current) => ({
          ...current,
          first_name: data?.metadata?.first_name || current.first_name,
          last_name: data?.metadata?.last_name || current.last_name,
        }));
        setStatus('form');
      } catch (error) {
        if (!mounted) return;
        setStatus('error');
        setMessage(getErrorMessage(error, 'La invitacion no es valida o ya expiro.'));
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [router.isReady, isInvite, token, router]);

  const acceptInvitation = async (event) => {
    event.preventDefault();

    if (form.password !== form.password2) {
      setStatus('form');
      setMessage('Las contrasenas no coinciden.');
      return;
    }

    try {
      setStatus('submitting');
      setMessage('');

      await securityService.invitations.accept({
        token,
        first_name: form.first_name,
        last_name: form.last_name,
        password: form.password,
        password2: form.password2,
      });

      setStatus('success');
      setMessage('Cuenta activada exitosamente. Ya puedes iniciar sesion.');
      setTimeout(() => router.push('/users/login'), 2500);
    } catch (error) {
      setStatus('form');
      setMessage(getErrorMessage(error, 'No se pudo activar la invitacion.'));
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#111] text-white">
      <header className="flex justify-center p-6 md:justify-start">
        <img src="/logo-global-oil.png" alt="Logo Global Oil" className="w-44 md:w-36" />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1b1b1b] p-8 shadow-2xl">
          {status === 'loading' ? (
            <div className="text-center">
              <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-b-[#ef232a]" />
              <h2 className="mb-2 text-2xl font-bold">
                {isInvite ? 'Validando invitacion...' : 'Verificando email...'}
              </h2>
              <p className="text-gray-400">Por favor espera mientras revisamos tu enlace.</p>
            </div>
          ) : null}

          {status === 'form' || status === 'submitting' ? (
            <>
              <h1 className="mb-2 text-3xl font-bold">Activar cuenta</h1>
              <p className="mb-6 text-gray-400">
                Completa tus datos y crea tu contrasena para entrar a Global Oil.
              </p>

              {invitation ? (
                <div className="mb-5 rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-gray-300">
                  <div><span className="text-gray-500">Correo:</span> {invitation.email}</div>
                  <div><span className="text-gray-500">Empresa:</span> {invitation.empresa_nombre || '-'}</div>
                  {invitation.role_name ? (
                    <div><span className="text-gray-500">Rol:</span> {invitation.role_name}</div>
                  ) : null}
                </div>
              ) : null}

              {message ? (
                <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                  {message}
                </div>
              ) : null}

              <form className="grid gap-4" onSubmit={acceptInvitation}>
                <label className="grid gap-2">
                  <span>Nombre *</span>
                  <input
                    className="h-11 rounded border border-white/20 bg-black px-3 outline-none focus:border-[#ef232a] disabled:opacity-60"
                    value={form.first_name}
                    onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                    disabled={status === 'submitting'}
                    required
                  />
                </label>

                <label className="grid gap-2">
                  <span>Apellido *</span>
                  <input
                    className="h-11 rounded border border-white/20 bg-black px-3 outline-none focus:border-[#ef232a] disabled:opacity-60"
                    value={form.last_name}
                    onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                    disabled={status === 'submitting'}
                    required
                  />
                </label>

                <label className="grid gap-2">
                  <span>Contrasena *</span>
                  <input
                    type="password"
                    className="h-11 rounded border border-white/20 bg-black px-3 outline-none focus:border-[#ef232a] disabled:opacity-60"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    disabled={status === 'submitting'}
                    required
                    minLength={8}
                  />
                </label>

                <label className="grid gap-2">
                  <span>Confirmar contrasena *</span>
                  <input
                    type="password"
                    className="h-11 rounded border border-white/20 bg-black px-3 outline-none focus:border-[#ef232a] disabled:opacity-60"
                    value={form.password2}
                    onChange={(e) => setForm((p) => ({ ...p, password2: e.target.value }))}
                    disabled={status === 'submitting'}
                    required
                    minLength={8}
                  />
                </label>

                <button
                  type="submit"
                  className="mt-2 h-12 rounded bg-[#ef232a] font-bold text-white hover:bg-[#d70d19] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting' ? 'Activando...' : 'Activar cuenta'}
                </button>
              </form>
            </>
          ) : null}

          {status === 'success' ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-3xl text-green-300">OK</div>
              <h2 className="mb-2 text-2xl font-bold">Listo</h2>
              <p className="text-gray-300">{message}</p>
            </div>
          ) : null}

          {status === 'error' ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-3xl text-red-300">!</div>
              <h2 className="mb-2 text-2xl font-bold">No se pudo verificar</h2>
              <p className="mb-6 text-gray-300">{message}</p>
              <button onClick={() => router.push('/users/login')} className="h-11 rounded border border-white/20 px-5">
                Ir al login
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
