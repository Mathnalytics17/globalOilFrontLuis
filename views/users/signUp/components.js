import { useState, useEffect } from "react";
import AdvertenciaModal from "../../../shared/components/modals/advertisingRegister";
import Axios from 'axios';
import { useRouter } from 'next/router';

export default function RegisterComponent({ companiesData }) {
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();
    console.log(router.query.mode)
    // Estado del formulario
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        password2: '',
        first_name: '',
        last_name: '',
        phone: '',
        company: '',
        profile_picture: null
    });

    // Se activa automáticamente al montar la vista
    useEffect(() => {
        setShowModal(true);
    }, []);

    // Manejar cambios en los inputs
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (error) setError('');
    };

    // Manejar archivo de imagen
    const handleFileChange = (e) => {
        setFormData(prev => ({
            ...prev,
            profile_picture: e.target.files[0]
        }));
    };

    // Validar formulario
    const validateForm = () => {
        const { email, password, password2, first_name, last_name, phone, company } = formData;

        if (!email || !password || !password2 || !first_name || !last_name || !phone || !company) {
            setError('Todos los campos marcados con * son obligatorios');
            return false;
        }

        if (password !== password2) {
            setError('Las contraseñas no coinciden');
            return false;
        }

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Por favor ingresa un email válido');
            return false;
        }

        return true;
    };

    // Enviar formulario
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!validateForm()) return;

        setLoading(true);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            
            // Crear FormData para enviar archivos
            const submitData = new FormData();
            submitData.append('email', formData.email);
            submitData.append('password', formData.password);
            submitData.append('password2', formData.password2);
            submitData.append('first_name', formData.first_name);
            submitData.append('last_name', formData.last_name);
            submitData.append('phone', formData.phone);
            submitData.append('company', formData.company);
            
            if (formData.profile_picture) {
                submitData.append('profile_picture', formData.profile_picture);
            }

            const response = await Axios.post(`${API_URL}/users/register/`, submitData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            setSuccess('Usuario registrado exitosamente!');
            console.log('Registro exitoso:', response.data);

            if(router.query.mode=='administrator'){
                     setTimeout(() => {
                router.push('/activesTree');
            }, 3000);

            }else{
                // Redirigir después de 3 segundos
            setTimeout(() => {
                router.push('/users/login');
            }, 3000);
            }
            

        } catch (err) {
            console.error('Error en registro:', err);
            
            if (err.response?.data) {
                const backendErrors = err.response.data;
                if (typeof backendErrors === 'object') {
                    const errorMessage = Object.values(backendErrors).flat().join(', ');
                    setError(errorMessage);
                } else {
                    setError('Error en el registro. Por favor intenta nuevamente.');
                }
            } else {
                setError('Error de conexión. Por favor verifica tu internet.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="flex min-h-screen bg-[#777777] flex-col relative">
                {/* Overlay de loading con blur */}
                {loading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 flex items-center justify-center">
                        <div className="bg-white p-8 rounded-lg shadow-xl flex flex-col items-center">
                            {/* Spinner grande */}
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#777777] border-t-transparent mb-4"></div>
                            <p className="text-lg font-semibold text-gray-800">Registrando usuario...</p>
                            <p className="text-sm text-gray-600">Por favor espera</p>
                        </div>
                    </div>
                )}

                <header className="p-4 flex justify-center md:justify-start">
                    <img 
                        src="/logo-global-oil.png" 
                        alt="Logo Global Oil" 
                        className="w-40 md:w-60"
                    />
                </header>

                <main className="flex justify-center items-start w-full p-4 py-8 mt-20">
                    <form 
                        onSubmit={handleSubmit} 
                        className={`bg-[#d9d9d9] p-10 md:p-12 rounded-sm shadow-md w-full max-w-6xl relative ${
                            loading ? 'opacity-60' : ''
                        }`}
                    >
                        {/* Efecto de desenfoque cuando está loading */}
                        {loading && (
                            <div className="absolute inset-0 bg-gray-200 bg-opacity-50 rounded-sm flex items-center justify-center z-30">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#777777] border-t-transparent"></div>
                            </div>
                        )}

                        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-left">
                            REGISTRO DE USUARIOS
                        </h2>

                        {/* Mensajes de éxito y error */}
                        {error && (
                            <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="mb-6 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                                {success}
                                <div className="mt-2 flex items-center text-sm">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent mr-2"></div>
                                    Redirigiendo al login...
                                </div>
                            </div>
                        )}

                        {/* Grid de campos */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Nombres */}
                            <div className="flex flex-col">
                                <label className="text-sm font-medium mb-2">Nombres *</label>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleInputChange}
                                    className="border p-3 rounded bg-white disabled:bg-gray-200 disabled:cursor-not-allowed"
                                    placeholder="Ingrese sus nombres"
                                    required
                                    disabled={loading || success}
                                />
                            </div>

                            {/* Apellidos */}
                            <div className="flex flex-col">
                                <label className="text-sm font-medium mb-2">Apellidos *</label>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleInputChange}
                                    className="border p-3 rounded bg-white disabled:bg-gray-200 disabled:cursor-not-allowed"
                                    placeholder="Ingrese sus apellidos"
                                    required
                                    disabled={loading || success}
                                />
                            </div>

                            {/* Email */}
                            <div className="flex flex-col">
                                <label className="text-sm font-medium mb-2">Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="border p-3 rounded bg-white disabled:bg-gray-200 disabled:cursor-not-allowed"
                                    placeholder="correo@ejemplo.com"
                                    required
                                    disabled={loading || success}
                                />
                            </div>

                            {/* Teléfono */}
                            <div className="flex flex-col">
                                <label className="text-sm font-medium mb-2">Teléfono *</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="border p-3 rounded bg-white disabled:bg-gray-200 disabled:cursor-not-allowed"
                                    placeholder="+57 300..."
                                    required
                                    disabled={loading || success}
                                />
                            </div>

                            {/* Contraseña */}
                            <div className="flex flex-col">
                                <label className="text-sm font-medium mb-2">Contraseña *</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="border p-3 rounded bg-white disabled:bg-gray-200 disabled:cursor-not-allowed"
                                    placeholder="Mínimo 8 caracteres"
                                    required
                                    minLength="8"
                                    disabled={loading || success}
                                />
                            </div>

                            {/* Confirmar contraseña */}
                            <div className="flex flex-col">
                                <label className="text-sm font-medium mb-2">
                                    Confirmar contraseña *
                                </label>
                                <input
                                    type="password"
                                    name="password2"
                                    value={formData.password2}
                                    onChange={handleInputChange}
                                    className="border p-3 rounded bg-white disabled:bg-gray-200 disabled:cursor-not-allowed"
                                    placeholder="Repita su contraseña"
                                    required
                                    minLength="8"
                                    disabled={loading || success}
                                />
                            </div>
                        </div>

                        {/* Fila para Empresa y Foto de perfil */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            {/* Empresa - Select */}
                            <div className="flex flex-col">
                                <label className="text-sm font-medium mb-2">Empresa *</label>
                                <select 
                                    name="company"
                                    value={formData.company}
                                    onChange={handleInputChange}
                                    className="border p-3 rounded bg-white disabled:bg-gray-200 disabled:cursor-not-allowed"
                                    required
                                    disabled={loading || success}
                                >
                                    <option value="">Seleccione una empresa</option>
                                    {companiesData && companiesData.map((company) => (
                                        <option key={company.id} value={company.id}>
                                            {company.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Foto de perfil */}
                            <div className="flex flex-col">
                                <label className="text-sm font-medium mb-2">Foto de perfil</label>
                                <input 
                                    type="file"
                                    onChange={handleFileChange}
                                    className="block w-full p-2 border rounded bg-white text-sm disabled:bg-gray-200 disabled:cursor-not-allowed" 
                                    accept="image/*"
                                    disabled={loading || success}
                                />
                                <p className="text-xs mt-2 text-gray-600">Selecciona un archivo, max 20mb</p>
                            </div>
                        </div>

                        {/* Botón de registro */}
                        <div className="mt-8 flex justify-end">
                            <button 
                                type="submit"
                                disabled={loading || success}
                                className="bg-[#777777] text-white py-3 px-8 rounded hover:bg-gray-600 transition duration-200 text-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                        Registrando...
                                    </>
                                ) : success ? (
                                    'Registro Exitoso!'
                                ) : (
                                    <>
                                        Registrar Usuario
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="#FF0000"
                                            className="h-4 w-4"
                                        >
                                            <path d="M4 3l16 9-16 9V3z" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </main>
            </div>

            {/* Modal se muestra si showModal = true */}
            {showModal && <AdvertenciaModal onClose={() => setShowModal(false)} />}
        </>
    );
}