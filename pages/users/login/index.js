import { useState, useEffect } from 'react';
import { useAuth } from '@context/AuthContext';
import { useRouter } from 'next/router';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Redirigir si ya está autenticado - CON TIMEOUT DE SEGURIDAD
  useEffect(() => {
    const checkAuth = async () => {
      // Pequeño delay para evitar loops
      await new Promise(resolve => setTimeout(resolve, 100));

      if (isAuthenticated()) {
        router.push('/dashboard');
      }
    };

    checkAuth();
  }, [isAuthenticated, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Por favor ingrese un email válido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({}); // Limpiar errores anteriores

    try {
      const result = await login(formData.email, formData.password);

      if (!result.success) {
        setErrors({ general: result.error });
      }
    } catch (error) {
      // Este catch solo debería ejecutarse para errores inesperados
      console.error('Error inesperado:', error);
      setErrors({ general: 'Ocurrió un error inesperado. Por favor intente nuevamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Spinner de carga mejorado
  if (authLoading) {
    return (
      <div className="flex min-h-screen bg-[#777777] items-center justify-center">
        <div className="flex flex-col items-center">
          {/* Spinner circular */}
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-white text-lg">Verificando autenticación...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#777777] flex-col">
      <header className="p-4 flex justify-center md:justify-start">
        <img
          src="/logo-global-oil.png"
          alt="Logo Global Oil"
          className="w-40 md:w-32"
        />
      </header>

      <main className="flex flex-1 items-center justify-between px-8">
        <div className="hidden md:flex flex-1 items-center justify-center">
          <img
            src="/logo-global-oil.png"
            alt="Global Oil"
            className="max-w-md w-full"
          />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <form
            onSubmit={handleSubmit}
            className="bg-[#9D9D9D] p-12 rounded-lg shadow-lg flex flex-col gap-4 w-full max-w-sm border-2 border-white min-h-[500px] h-auto"
          >
            <h1 className="text-2xl font-bold text-center text-white mb-4">
              Ingreso de usuarios
            </h1>

            {errors.general && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                {errors.general}
              </div>
            )}

            <div className="flex flex-col">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className={`border p-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.email ? 'border-red-500' : ''
                  }`}
              />
              {errors.email && (
                <span className="text-red-500 text-sm mt-1">{errors.email}</span>
              )}
            </div>

            <div className="flex flex-col">
              <input
                type="password"
                name="password"
                placeholder="Contraseña"
                value={formData.password}
                onChange={handleChange}
                className={`border p-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.password ? 'border-red-500' : ''
                  }`}
              />
              {errors.password && (
                <span className="text-red-700 text-sm mt-1">{errors.password}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#D9D9D9] text-gray-800 py-3 px-8 rounded hover:bg-blue-300 transition duration-200 mx-auto w-40 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-800 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>

            <div className="mt-auto pt-8">
              <a href='/users/forgotPassword' className="text-white block mb-2 hover:underline cursor-pointer">
                ¿Olvidaste tu contraseña? Ingresa aquí
              </a>

            </div>
          </form>
        </div>
      </main>
    </div>
  );
}