import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Axios from 'axios';
import { toast } from 'react-toastify';
import { ArrowLeft, TestTube, Calendar, User, Settings, FileText } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const MuestraDetails = () => {
    const router = useRouter();
    const { muestra: muestraId } = router.query;
    const [muestra, setMuestra] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch de los datos de la muestra
    useEffect(() => {
        const fetchMuestraData = async () => {
            if (!muestraId) return;

            try {
                setLoading(true);
                setError(null);
                
                // Fetch de la muestra principal
                const muestraResponse = await Axios.get(`${API_URL}/lubrication/samples/${muestraId}/`);
                const muestraData = muestraResponse.data;

                // Fetch de datos adicionales si es necesario
                let maquinaData = null;
                let lubricanteData = null;
                let camposAdicionales = [];

                if (muestraData.referencia_equipo) {
                    try {
                        const maquinaResponse = await Axios.get(`${API_URL}/machines/${muestraData.referencia_equipo}/`);
                        maquinaData = maquinaResponse.data;
                    } catch (error) {
                        console.error('Error cargando datos de máquina:', error);
                    }
                }

                if (muestraData.lubricante) {
                    try {
                        const lubricanteResponse = await Axios.get(`${API_URL}/lubrication/lubricants/${muestraData.lubricante}/`);
                        lubricanteData = lubricanteResponse.data;
                    } catch (error) {
                        console.error('Error cargando datos de lubricante:', error);
                    }
                }

                // Fetch de campos adicionales
                try {
                    const camposResponse = await Axios.get(`${API_URL}/api/extra-fields/`, {
                        params: {
                            tabla_relacionada: 'muestra',
                            objeto_id: muestraId
                        }
                    });
                    camposAdicionales = camposResponse.data;
                } catch (error) {
                    console.error('Error cargando campos adicionales:', error);
                }

                setMuestra({
                    ...muestraData,
                    maquina: maquinaData,
                    lubricante: lubricanteData,
                    campos_adicionales: camposAdicionales
                });

            } catch (error) {
                console.error('Error cargando datos de la muestra:', error);
                setError('No se pudo cargar la información de la muestra');
                toast.error('Error al cargar los datos de la muestra');
            } finally {
                setLoading(false);
            }
        };

        fetchMuestraData();
    }, [muestraId]);

    const handleBack = () => {
        router.back();
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No disponible';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#1a1a1a] text-white p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-[#292929] rounded w-1/4 mb-6"></div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-4">
                                <div className="h-32 bg-[#292929] rounded"></div>
                                <div className="h-48 bg-[#292929] rounded"></div>
                            </div>
                            <div className="space-y-4">
                                <div className="h-48 bg-[#292929] rounded"></div>
                                <div className="h-32 bg-[#292929] rounded"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#1a1a1a] text-white p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">Error al cargar</h2>
                        <p className="text-[#d9d9d9] mb-4">{error}</p>
                        <button
                            onClick={handleBack}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition duration-200"
                        >
                            Volver
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!muestra) {
        return (
            <div className="min-h-screen bg-[#1a1a1a] text-white p-6">
                <div className="max-w-6xl mx-auto text-center py-12">
                    <h2 className="text-xl font-semibold text-white mb-2">Muestra no encontrada</h2>
                    <p className="text-[#d9d9d9] mb-4">La muestra solicitada no existe o no se pudo cargar.</p>
                    <button
                        onClick={handleBack}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition duration-200"
                    >
                        Volver
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#1a1a1a] text-white font-sans">
            {/* Header */}
            <div className="bg-[#292929] border-b border-[#333]">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-[#d9d9d9] hover:text-white transition-colors"
                        >
                            <ArrowLeft size={20} />
                            <span>Volver</span>
                        </button>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-white">Detalles de la Muestra</h1>
                            <p className="text-[#d9d9d9]">Información completa del punto de medida</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido principal */}
            <div className="max-w-6xl mx-auto p-6">
                {/* Tarjeta de información principal */}
                <div className="bg-[#292929] rounded-lg shadow-2xl border border-[#333] p-6 mb-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                            <TestTube size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">{muestra.id}</h2>
                            <p className="text-[#d9d9d9]">ID de la muestra</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Información básica */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white border-b border-[#444] pb-2">
                                Información Básica
                            </h3>
                            
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-[#444]">
                                    <span className="text-[#d9d9d9]">Fecha de Toma</span>
                                    <span className="text-white font-medium">{formatDate(muestra.fecha_toma)}</span>
                                </div>
                                
                                <div className="flex justify-between items-center py-2 border-b border-[#444]">
                                    <span className="text-[#d9d9d9]">Contacto del Cliente</span>
                                    <span className="text-white font-medium">{muestra.contacto_cliente || 'No especificado'}</span>
                                </div>
                                
                                <div className="flex justify-between items-center py-2 border-b border-[#444]">
                                    <span className="text-[#d9d9d9]">Placa del Equipo</span>
                                    <span className="text-white font-medium">{muestra.equipo_placa || 'No especificada'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Información del equipo y lubricante */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white border-b border-[#444] pb-2">
                                Equipo y Lubricante
                            </h3>
                            
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-[#444]">
                                    <span className="text-[#d9d9d9]">Máquina</span>
                                    <span className="text-white font-medium">
                                        {muestra.maquina?.nombre || 'No especificada'}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center py-2 border-b border-[#444]">
                                    <span className="text-[#d9d9d9]">Lubricante</span>
                                    <span className="text-white font-medium">
                                        {muestra.lubricante?.referencia || 'No especificado'}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center py-2 border-b border-[#444]">
                                    <span className="text-[#d9d9d9]">Tipo de Equipo</span>
                                    <span className="text-white font-medium">{muestra.tipo_equipo || 'No especificado'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid de información adicional */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Periodos de servicio */}
                    <div className="bg-[#292929] rounded-lg border border-[#333] p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Calendar size={20} className="text-red-500" />
                            Periodos de Servicio
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-[#d9d9d9] text-sm mb-2">Servicio del Aceite</h4>
                                <div className="flex justify-between items-center">
                                    <span className="text-white">
                                        {muestra.periodo_servicio_aceite || 'N/A'} 
                                        {muestra.unidad_periodo_aceite ? ` ${muestra.unidad_periodo_aceite}` : ''}
                                    </span>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="text-[#d9d9d9] text-sm mb-2">Servicio del Equipo</h4>
                                <div className="flex justify-between items-center">
                                    <span className="text-white">
                                        {muestra.periodo_servicio_equipo || 'N/A'} 
                                        {muestra.unidad_periodo_equipo ? ` ${muestra.unidad_periodo_equipo}` : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Observaciones */}
                    <div className="bg-[#292929] rounded-lg border border-[#333] p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <FileText size={20} className="text-red-500" />
                            Observaciones
                        </h3>
                        
                        <div className="text-[#d9d9d9]">
                            {muestra.observaciones ? (
                                <p className="whitespace-pre-wrap">{muestra.observaciones}</p>
                            ) : (
                                <p className="italic">No hay observaciones registradas</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Campos adicionales */}
                {muestra.campos_adicionales && muestra.campos_adicionales.length > 0 && (
                    <div className="bg-[#292929] rounded-lg border border-[#333] p-6 mt-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Settings size={20} className="text-red-500" />
                            Campos Adicionales
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {muestra.campos_adicionales.map((campo, index) => (
                                <div key={index} className="border border-[#444] rounded-lg p-4">
                                    <h4 className="text-[#d9d9d9] text-sm mb-2">{campo.etiqueta || campo.nombre_campo}</h4>
                                    <p className="text-white font-medium">
                                        {campo.valor_texto || campo.valor_numero || campo.valor_fecha || 'No especificado'}
                                    </p>
                                    <span className="text-xs text-[#888]">
                                        Tipo: {campo.tipo_campo}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Información de auditoría */}
                <div className="bg-[#292929] rounded-lg border border-[#333] p-6 mt-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <User size={20} className="text-red-500" />
                        Información de Auditoría
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-[#d9d9d9]">Usuario Registro:</span>
                            <span className="text-white ml-2">{muestra.usuario_registro || 'No especificado'}</span>
                        </div>
                        <div>
                            <span className="text-[#d9d9d9]">Cliente:</span>
                            <span className="text-white ml-2">{muestra.cliente || 'No especificado'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MuestraDetails;