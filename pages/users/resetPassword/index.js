import { useState, useEffect } from 'react';
import { useAuth } from '@context/AuthContext';
import { useRouter } from 'next/router';

export default function ResetPassword() {
  const [formData, setFormData] = useState({
    new_password: '',
    new_password2: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  
  const { api } = useAuth();
  const router = useRouter();
  const { token } = router.query;

  useEffect(() => {
    // Verificar si el token está presente en la URL
    if (!token) {
      setErrors({ general: 'Enlace inválido o faltante' });
    }
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar errores del campo cuando el usuario escribe
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!token) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});
    
    try {
      // Enviar datos al endpoint de Django
      const response = await api.post('/users/password-reset/confirm/', {
        token: token,
        new_password: formData.new_password,
        new_password2: formData.new_password2
      });
      
      setSuccess(true);
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        router.push('/users/login');
      }, 3000);
      
    } catch (error) {
      console.error('Error resetting password:', error);
      
      if (error.response?.data) {
        const { data } = error.response;
        
        // Manejar errores específicos del backend
        if (data.token) {
          setErrors({ general: data.token });
        } else if (data.new_password2) {
          setErrors({ new_password2: data.new_password2 });
        } else if (data.new_password) {
          setErrors({ new_password: data.new_password });
        } else if (data.detail) {
          setErrors({ general: data.detail });
        } else {
          setErrors({ general: 'Error al restablecer la contraseña' });
        }
      } else if (error.request) {
        setErrors({ general: 'No se pudo conectar con el servidor' });
      } else {
        setErrors({ general: 'Error inesperado' });
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
            <div className="bg-[#9D9D9D] p-12 rounded-lg shadow-lg flex flex-col gap-4 w-full max-w-sm border-2 border-white min-h-[350px] h-auto text-center items-center justify-center">
              <div className="text-green-600 text-5xl mb-4">✓</div>
              <h1 className="text-2xl font-bold text-white mb-4">¡Contraseña restablecida!</h1>
              <p className="text-white mb-6">
                Tu contraseña ha sido cambiada exitosamente. Serás redirigido al login.
              </p>
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
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
            className="bg-[#9D9D9D] p-12 rounded-lg shadow-lg flex flex-col gap-4 w-full max-w-sm border-2 border-white min-h-[350px] h-auto"
          >
            <h1 className="text-2xl font-bold text-center text-white mb-2">
              Reestablecer contraseña
            </h1>

            {/* Mensaje de error general */}
            {errors.general && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                {errors.general}
              </div>
            )}

            <div className="flex flex-col">
              <input
                type="password"
                name="new_password"
                placeholder="Nueva contraseña (mínimo 8 caracteres)"
                value={formData.new_password}
                onChange={handleChange}
                className={`border p-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  errors.new_password ? 'border-red-500' : ''
                }`}
              />
              {errors.new_password && (
                <span className="text-red-500 text-sm mt-1">{errors.new_password}</span>
              )}
            </div>

            <div className="flex flex-col">
              <input
                type="password"
                name="new_password2"
                placeholder="Repite nueva contraseña"
                value={formData.new_password2}
                onChange={handleChange}
                className={`border p-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  errors.new_password2 ? 'border-red-500' : ''
                }`}
              />
              {errors.new_password2 && (
                <span className="text-red-500 text-sm mt-1">{errors.new_password2}</span>
              )}
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="bg-[#D9D9D9] text-gray-800 py-3 px-6 rounded hover:bg-blue-300 transition duration-200 mx-auto w-full max-w-48 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-800 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Procesando...
                </>
              ) : (
                'Ingresar nueva contraseña'
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