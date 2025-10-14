import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Axios from 'axios';

export default function ConfirmUser() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) return;

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL;
        const response = await Axios.post(`${API_URL}/users/verify-email/`, {
          token: token
        });

        if (response.status === 200) {
          setStatus('success');
          setMessage('¡Email verificado exitosamente! Ya puedes iniciar sesión.');
          
          // Redirigir al login después de 3 segundos
          setTimeout(() => {
            router.push('/users/login');
          }, 3000);
        }
      } catch (error) {
        console.error('Error verifying email:', error);
        setStatus('error');
        
        if (error.response?.data) {
          setMessage(error.response.data.detail || 'Error al verificar el email.');
        } else {
          setMessage('Error de conexión. Por favor intenta nuevamente.');
        }
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="flex min-h-screen bg-[#777777] flex-col">
      <header className="p-4 flex justify-center md:justify-start">
        <img 
          src="/logo-global-oil.png" 
          alt="Logo Global Oil" 
          className="w-40 md:w-32"
        />
      </header>

      <main className="flex flex-1 items-center justify-center px-8 py-12">
        <div className="max-w-4xl w-full flex flex-col md:flex-row items-center gap-12">
          {/* Imagen izquierda - Solo en desktop */}
          <div className="hidden md:flex flex-1 items-center justify-center">
            <img
              src="/logo-global-oil.png"
              alt="Global Oil"
              className="max-w-md w-full opacity-90"
            />
          </div>

          {/* Contenido de confirmación a la derecha */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="bg-[#d9d9d9] p-8 rounded-lg shadow-lg w-full max-w-md">
              {status === 'loading' && (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#777777] mx-auto mb-4"></div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Verificando email...</h2>
                  <p className="text-gray-600">Por favor espera mientras confirmamos tu cuenta.</p>
                </div>
              )}

              {status === 'success' && (
                <div className="text-center">
                  <div className="bg-green-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Verificación Exitosa!</h2>
                  <p className="text-gray-600 mb-4">{message}</p>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">Serás redirigido automáticamente al login...</p>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="text-center">
                  <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Error de Verificación</h2>
                  <p className="text-gray-600 mb-4">{message}</p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-[#777777] text-white px-6 py-2 rounded hover:bg-gray-600 transition"
                    >
                      Reintentar
                    </button>
                    <button
                      onClick={() => router.push('/users/login')}
                      className="bg-gray-300 text-gray-800 px-6 py-2 rounded hover:bg-gray-400 transition"
                    >
                      Ir al Login
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Información adicional */}
            <div className="mt-8 text-center text-white">
              <p className="text-sm">
                ¿Necesitas ayuda?{' '}
                <a href="/contact" className="underline hover:text-gray-300">
                  Contáctanos
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

     
    </div>
  );
}