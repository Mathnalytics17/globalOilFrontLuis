
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { authService } from '@features/auth/infrastructure/authService';

function extractTokenFromSearch(asPath = '') {
  if (!asPath) return '';
  const queryPart = asPath.includes('?') ? asPath.split('?')[1] : '';
  if (!queryPart) return '';
  const params = new URLSearchParams(queryPart.split('#')[0]);
  return params.get('token') || '';
}

export default function ResetPassword() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [safeToken, setSafeToken] = useState('');
  const [formData, setFormData] = useState({
    new_password: '',
    new_password2: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !router.isReady) return;

    const tokenFromQuery =
      typeof router.query.token === 'string'
        ? router.query.token
        : Array.isArray(router.query.token)
          ? router.query.token[0]
          : '';

    const tokenFromPath = extractTokenFromSearch(router.asPath);
    const tokenFromWindow =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('token') || ''
        : '';

    const resolvedToken = tokenFromQuery || tokenFromPath || tokenFromWindow;

    setSafeToken(resolvedToken);

    if (!resolvedToken) {
      setErrors({ general: 'Enlace inválido o faltante' });
    } else {
      setErrors((prev) => {
        if (prev.general === 'Enlace inválido o faltante' || prev.general === 'Enlace de recuperación inválido') {
          const next = { ...prev };
          delete next.general;
          return next;
        }
        return prev;
      });
    }
  }, [mounted, router.isReady, router.asPath, router.query.token]);

  const canSubmit = useMemo(() => Boolean(safeToken) && !isLoading, [safeToken, isLoading]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => {
      if (!prev[name] && !prev.general) return prev;
      const next = { ...prev };
      delete next[name];
      if (safeToken) delete next.general;
      return next;
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!safeToken) {
      newErrors.general = 'Enlace de recuperación inválido';
    }

    if (!formData.new_password) {
      newErrors.new_password = 'La nueva contraseña es requerida';
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (!formData.new_password2) {
      newErrors.new_password2 = 'Confirma tu nueva contraseña';
    } else if (formData.new_password !== formData.new_password2) {
      newErrors.new_password2 = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getBackendError = (error) => {
    const data = error?.response?.data;

    if (!data) {
      if (error?.request) return 'No se pudo conectar con el servidor';
      return 'Error inesperado';
    }

    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    if (data.token) return Array.isArray(data.token) ? data.token[0] : data.token;
    if (data.new_password) return Array.isArray(data.new_password) ? data.new_password[0] : data.new_password;
    if (data.new_password2) return Array.isArray(data.new_password2) ? data.new_password2[0] : data.new_password2;
    if (data.non_field_errors) return Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;

    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue)) return firstValue[0];
    if (typeof firstValue === 'string') return firstValue;

    return 'Error al restablecer la contraseña';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      await authService.resetPassword({
        token: safeToken,
        new_password: formData.new_password,
        new_password2: formData.new_password2,
      });

      setSuccess(true);

      setTimeout(() => {
        router.push('/users/login');
      }, 2500);
    } catch (error) {
      setErrors({ general: getBackendError(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const goLogin = () => router.push('/users/login');

  if (!mounted) {
    return (
      <div className="resetPage">
        <header className="resetHeader">
          <img src="/logo-global-oil.png" alt="Logo Global Oil" className="topLogo" />
        </header>
        <main className="resetMain">
          <section className="brandPanel">
            <img src="/logo-global-oil.png" alt="Global Oil" className="bigLogo" />
          </section>
          <section className="resetCard">
            <div className="spinner" />
            <p className="loadingText">Cargando enlace...</p>
          </section>
        </main>

        <style jsx>{styles}</style>
      </div>
    );
  }

  if (success) {
    return (
      <div className="resetPage">
        <header className="resetHeader">
          <img src="/logo-global-oil.png" alt="Logo Global Oil" className="topLogo" />
        </header>

        <main className="resetMain">
          <section className="brandPanel">
            <img src="/logo-global-oil.png" alt="Global Oil" className="bigLogo" />
          </section>

          <section className="resetCard successCard">
            <div className="successIcon">✓</div>
            <h1>Contraseña restablecida</h1>
            <p>Tu contraseña fue cambiada exitosamente. Serás redirigido al inicio de sesión.</p>
            <div className="spinner" />
          </section>
        </main>

        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="resetPage">
      <header className="resetHeader">
        <img src="/logo-global-oil.png" alt="Logo Global Oil" className="topLogo" />
      </header>

      <main className="resetMain">
        <section className="brandPanel">
          <img src="/logo-global-oil.png" alt="Global Oil" className="bigLogo" />
        </section>

        <section className="resetCard">
          <form onSubmit={handleSubmit} noValidate>
            <p className="kicker">Seguridad</p>
            <h1>Restablecer contraseña</h1>
            <p className="subtitle">Ingresa y confirma tu nueva contraseña.</p>

            {errors.general ? (
              <div className="errorBox">
                {errors.general}
              </div>
            ) : null}

            <label className="field">
              <span>Nueva contraseña</span>
              <input
                type="password"
                name="new_password"
                placeholder="Mínimo 8 caracteres"
                value={formData.new_password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              {errors.new_password ? <small>{errors.new_password}</small> : null}
            </label>

            <label className="field">
              <span>Confirmar contraseña</span>
              <input
                type="password"
                name="new_password2"
                placeholder="Repite la nueva contraseña"
                value={formData.new_password2}
                onChange={handleChange}
                autoComplete="new-password"
              />
              {errors.new_password2 ? <small>{errors.new_password2}</small> : null}
            </label>

            <button type="submit" disabled={!canSubmit} className="submitButton">
              {isLoading ? (
                <>
                  <span className="smallSpinner" />
                  Procesando...
                </>
              ) : (
                'Guardar nueva contraseña'
              )}
            </button>

            <button type="button" onClick={goLogin} className="linkButton">
              ← Volver al inicio de sesión
            </button>
          </form>
        </section>
      </main>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .resetPage {
    min-height: 100vh;
    background:
      radial-gradient(circle at 15% 20%, rgba(255,255,255,.08), transparent 24%),
      radial-gradient(circle at 86% 42%, rgba(239,35,42,.14), transparent 32%),
      linear-gradient(135deg, #222 0%, #151515 50%, #090909 100%);
    color: #fff;
  }

  .resetHeader {
    height: 74px;
    display: flex;
    align-items: center;
    padding: 0 28px;
  }

  .topLogo {
    width: 170px;
    height: auto;
  }

  .resetMain {
    min-height: calc(100vh - 74px);
    display: grid;
    grid-template-columns: minmax(320px, 1fr) minmax(360px, 520px);
    align-items: center;
    gap: 56px;
    padding: 28px clamp(28px, 6vw, 90px) 70px;
  }

  .brandPanel {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bigLogo {
    width: min(560px, 70%);
    height: auto;
    filter: drop-shadow(0 24px 42px rgba(0,0,0,.38));
  }

  .resetCard {
    border: 1px solid rgba(255,255,255,.22);
    background: rgba(20,20,20,.74);
    box-shadow: 0 28px 80px rgba(0,0,0,.42);
    border-radius: 18px;
    padding: 42px;
    min-height: 420px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  form {
    width: 100%;
    display: grid;
    gap: 17px;
  }

  .kicker {
    color: #ff2838;
    text-transform: uppercase;
    letter-spacing: .32em;
    font-size: 12px;
    font-weight: 900;
    margin: 0;
  }

  h1 {
    font-size: 34px;
    line-height: 1.05;
    margin: 0;
    font-weight: 800;
  }

  .subtitle {
    margin: -6px 0 8px;
    color: #bdbdbd;
    font-size: 16px;
  }

  .field {
    display: grid;
    gap: 8px;
  }

  .field span {
    font-size: 14px;
    font-weight: 800;
    color: #f2f2f2;
  }

  input {
    height: 52px;
    border: 1px solid rgba(255,255,255,.18);
    border-radius: 9px;
    background: rgba(0,0,0,.55);
    color: #fff;
    outline: none;
    padding: 0 15px;
    font-size: 16px;
  }

  input:focus {
    border-color: #ef232a;
    box-shadow: 0 0 0 3px rgba(239,35,42,.15);
  }

  small {
    color: #ff9ca1;
  }

  .errorBox {
    border: 1px solid rgba(239,35,42,.45);
    background: rgba(239,35,42,.12);
    color: #ffd6d8;
    border-radius: 9px;
    padding: 13px 15px;
    font-size: 14px;
  }

  .submitButton {
    min-height: 52px;
    border-radius: 9px;
    border: 1px solid #ef232a;
    background: linear-gradient(180deg, #ff2838, #d70d19);
    color: #fff;
    font-size: 16px;
    font-weight: 900;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    margin-top: 8px;
  }

  .submitButton:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .linkButton {
    background: transparent;
    border: 0;
    color: #dfdfdf;
    cursor: pointer;
    font-weight: 700;
    margin-top: 8px;
  }

  .linkButton:hover {
    color: #fff;
    text-decoration: underline;
  }

  .spinner,
  .smallSpinner {
    border-radius: 999px;
    border-style: solid;
    border-color: rgba(255,255,255,.32);
    border-top-color: #fff;
    animation: spin .8s linear infinite;
  }

  .spinner {
    width: 34px;
    height: 34px;
    border-width: 4px;
  }

  .smallSpinner {
    width: 18px;
    height: 18px;
    border-width: 3px;
  }

  .loadingText {
    margin-left: 14px;
    color: #d7d7d7;
  }

  .successCard {
    text-align: center;
    display: grid;
    justify-items: center;
    gap: 14px;
  }

  .successIcon {
    width: 74px;
    height: 74px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: rgba(34,197,94,.16);
    color: #4ade80;
    font-size: 42px;
    font-weight: 900;
  }

  .successCard p {
    color: #d1d1d1;
    margin: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 900px) {
    .resetMain {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .brandPanel {
      display: none;
    }

    .resetCard {
      padding: 30px 22px;
    }
  }
`;
