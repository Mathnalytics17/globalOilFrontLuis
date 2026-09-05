import { useState } from 'react';
import { useRouter } from 'next/router';
import { authService } from '@features/auth/infrastructure/authService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Por favor ingrese un email válido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});
    
    try {
      // Enviar solicitud al endpoint de Django
      await authService.forgotPassword(email);
      
      setSuccess(true);
      
      // Opcional: Redirigir automáticamente después de éxito
      setTimeout(() => {
        router.push('/users/login');
      }, 5000);
      
    } catch (error) {
      
      let errorMessage = 'Error al enviar el enlace de recuperación';
      
      if (error.response?.data) {
        const { data } = error.response;
        
        if (data.email) {
          setErrors({ email: data.email[0] });
        } else if (data.detail) {
          setErrors({ general: data.detail });
        } else if (data.error) {
          setErrors({ general: data.error });
        } else {
          setErrors({ general: errorMessage });
        }
      } else if (error.request) {
        setErrors({ general: 'No se pudo conectar con el servidor' });
      } else {
        setErrors({ general: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
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
            <div className="bg-[#9D9D9D] p-12 rounded-lg shadow-lg flex flex-col gap-4 w-full max-w-sm border-2 border-white min-h-[200px] h-auto text-center">
              <div className="text-green-600 text-4xl mb-4">✓</div>
              <h1 className="text-2xl font-bold text-white mb-4">¡Enlace enviado!</h1>
              <p className="text-white mb-6">
                Hemos enviado un enlace de recuperación a <strong>{email}</strong>. 
                Revisa tu bandeja de entrada y sigue las instrucciones.
              </p>
              <button 
                onClick={() => router.push('/users/login')}
                className="bg-[#D9D9D9] text-gray-800 py-2 px-6 rounded hover:bg-blue-300 transition duration-200 mx-auto w-fit"
              >
                Volver al login
              </button>
            </div>
          </div>
        </main>
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
            className="bg-[#9D9D9D] p-12 rounded-lg shadow-lg flex flex-col gap-4 w-full max-w-sm border-2 border-white min-h-[200px] h-auto"
          >
            <h1 className="text-2xl font-bold text-center text-white mb-4">
              Ingresa tu correo
            </h1>
            
            {/* Tooltip informativo */}
            <div className="bg-[#454141] border border-white text-white px-4 py-3 rounded text-sm mb-4 text-center">
              <strong>Información:</strong> Te enviaremos un enlace para restablecer tu contraseña
            </div>

            {/* Mensaje de error general */}
            {errors.general && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
                {errors.general}
              </div>
            )}

            <div className="flex flex-col">
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={handleChange}
                className={`border p-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  errors.email ? 'border-red-500' : ''
                }`}
              />
              {errors.email && (
                <span className="text-red-500 text-sm mt-1">{errors.email}</span>
              )}
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="bg-[#D9D9D9] text-gray-800 py-2 px-6 rounded hover:bg-blue-300 transition duration-200 mx-auto w-40 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Enviando...
                </>
              ) : (
                'Enviar'
              )}
            </button>

            {/* Enlace para volver al login */}
            <div className="text-center mt-4">
              <button 
                type="button"
                onClick={() => router.push('/users/login')}
                className="text-white text-sm hover:underline"
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
