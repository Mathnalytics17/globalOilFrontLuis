import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Axios from 'axios';
import { toast } from 'react-toastify';
import { ArrowLeft, Save, TestTube, Calendar, User, Settings, FileText, Plus, X } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const EditarMuestra = () => {
    const router = useRouter();
    const { muestra: muestraId } = router.query;
    const [muestra, setMuestra] = useState(null);
    const [formData, setFormData] = useState({});
    const [camposAdicionales, setCamposAdicionales] = useState([]);
    const [nuevoCampo, setNuevoCampo] = useState({ nombre: '', tipo: 'text', requerido: false });
    const [mostrarAgregarCampo, setMostrarAgregarCampo] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [maquinas, setMaquinas] = useState([]);
    const [lubricantes, setLubricantes] = useState([]);
    const [tipoEquipo, setTipoEquipo] = useState([]);

    // Fetch de datos iniciales
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!muestraId) return;

            try {
                setLoading(true);
                setError(null);

                // Fetch de datos maestros
                const [maquinasRes, lubricantesRes, tipoEquipoRes] = await Promise.all([
                    Axios.get(`${API_URL}/machines/`),
                    Axios.get(`${API_URL}/lubrication/lubricants/`),
                    Axios.get(`${API_URL}/lubrication/equipment-types/`)
                ]);

                setMaquinas(maquinasRes.data);
                setLubricantes(lubricantesRes.data);
                setTipoEquipo(tipoEquipoRes.data);

                // Fetch de la muestra principal
                const muestraResponse = await Axios.get(`${API_URL}/lubrication/samples/${muestraId}/`);
                const muestraData = muestraResponse.data;
                setMuestra(muestraData);
                setFormData(muestraData);

                // Fetch de campos adicionales existentes
                try {
                    const camposResponse = await Axios.get(`${API_URL}/api/extra-fields/`, {
                        params: {
                            tabla_relacionada: 'muestra',
                            objeto_id: muestraId
                        }
                    });
                    setCamposAdicionales(camposResponse.data);
                } catch (error) {
                    console.error('Error cargando campos adicionales:', error);
                    setCamposAdicionales([]);
                }

            } catch (error) {
                console.error('Error cargando datos:', error);
                setError('No se pudo cargar la información de la muestra');
                toast.error('Error al cargar los datos');
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [muestraId]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCampoAdicionalChange = (index, value) => {
        const updatedCampos = [...camposAdicionales];
        updatedCampos[index].valor_texto = value;
        updatedCampos[index].valor_numero = value;
        updatedCampos[index].valor_fecha = value;
        setCamposAdicionales(updatedCampos);
    };

    const agregarCampo = () => {
        if (nuevoCampo.nombre.trim() === '') {
            toast.error('El nombre del campo es requerido');
            return;
        }

        const campo = {
            id: Date.now(),
            nombre_campo: nuevoCampo.nombre.trim(),
            tipo_campo: nuevoCampo.tipo,
            etiqueta: nuevoCampo.nombre.trim(),
            requerido: nuevoCampo.requerido,
            valor_texto: '',
            valor_numero: null,
            valor_fecha: null,
            tabla_relacionada: 'muestra',
            objeto_id: muestraId,
            estado: 'activo'
        };

        setCamposAdicionales([...camposAdicionales, campo]);
        setNuevoCampo({ nombre: '', tipo: 'text', requerido: false });
        setMostrarAgregarCampo(false);
        toast.success('Campo adicional agregado');
    };

    const eliminarCampo = async (campoId, index) => {
        // Si el campo tiene ID (existe en BD), eliminarlo
        if (campoId && typeof campoId === 'number') {
            try {
                await Axios.delete(`${API_URL}/api/extra-fields/${campoId}/`);
                toast.success('Campo eliminado');
            } catch (error) {
                console.error('Error eliminando campo:', error);
                toast.error('Error al eliminar el campo');
                return;
            }
        }
        
        // Eliminar del estado local
        const updatedCampos = camposAdicionales.filter((_, i) => i !== index);
        setCamposAdicionales(updatedCampos);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            // 1. Actualizar datos principales de la muestra
            await Axios.put(`${API_URL}/lubrication/samples/${muestraId}/`, formData);

            // 2. Procesar campos adicionales
            const camposParaGuardar = camposAdicionales.filter(campo => 
                campo.valor_texto || campo.valor_numero || campo.valor_fecha
            );

            if (camposParaGuardar.length > 0) {
                // Separar campos nuevos de los existentes
                const nuevosCampos = camposParaGuardar.filter(campo => !campo.id || typeof campo.id !== 'number');
                const camposExistentes = camposParaGuardar.filter(campo => campo.id && typeof campo.id === 'number');

                // Actualizar campos existentes
                for (const campo of camposExistentes) {
                    await Axios.put(`${API_URL}/api/extra-fields/${campo.id}/`, campo);
                }

                // Crear nuevos campos
                if (nuevosCampos.length > 0) {
                    await Axios.post(`${API_URL}/api/extra-fields/bulk-create/`, {
                        campos: nuevosCampos
                    });
                }
            }

            toast.success('Muestra actualizada correctamente');
            router.push(`/muestras/muestra-details?muestra=${muestraId}`);

        } catch (error) {
            console.error('Error guardando cambios:', error);
            toast.error('Error al guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    const handleBack = () => {
        router.back();
    };

    const tiposCampo = [
        { value: 'text', label: 'Texto' },
        { value: 'number', label: 'Número' },
        { value: 'date', label: 'Fecha' },
        { value: 'textarea', label: 'Texto largo' }
    ];

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
                    <p className="text-[#d9d9d9] mb-4">La muestra solicitada no existe.</p>
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
            <div className="bg-transparent border-b border-[#333]">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-2 text-[#d9d9d9] hover:text-white transition-colors"
                            >
                                <ArrowLeft size={20} />
                                <span>Volver</span>
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Editar Muestra</h1>
                                <p className="text-[#d9d9d9]">Modificar información del punto de medida</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition duration-200 flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Guardando...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    <span>Guardar Cambios</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Formulario */}
            <div className="max-w-6xl mx-auto p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Información Principal */}
                    <div className="bg-[#292929] rounded-lg border border-[#333] p-6">
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <TestTube size={24} className="text-red-500" />
                            Información Principal
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Fecha de Toma *
                                </label>
                                <input
                                    type="datetime-local"
                                    name="fecha_toma"
                                    value={formData.fecha_toma || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Lubricante *
                                </label>
                                <select
                                    name="lubricante"
                                    value={formData.lubricante || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    required
                                >
                                    <option value="">Seleccione un lubricante</option>
                                    {lubricantes.map(lub => (
                                        <option key={lub.id} value={lub.id}>
                                            {lub.referencia} - {lub.grado_viscosidad}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Máquina *
                                </label>
                                <select
                                    name="referencia_equipo"
                                    value={formData.referencia_equipo || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    required
                                >
                                    <option value="">Seleccione una máquina</option>
                                    {maquinas.map(maquina => (
                                        <option key={maquina.id} value={maquina.id}>
                                            {maquina.nombre} - {maquina.codigo_equipo}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Contacto del Cliente *
                                </label>
                                <input
                                    type="text"
                                    name="contacto_cliente"
                                    value={formData.contacto_cliente || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Periodos de Servicio */}
                    <div className="bg-[#292929] rounded-lg border border-[#333] p-6">
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <Calendar size={24} className="text-red-500" />
                            Periodos de Servicio
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-medium text-white mb-3">Servicio del Aceite</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Periodo</label>
                                        <input
                                            type="number"
                                            name="periodo_servicio_aceite"
                                            value={formData.periodo_servicio_aceite || ''}
                                            onChange={handleInputChange}
                                            step="0.01"
                                            className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Unidad</label>
                                        <select
                                            name="unidad_periodo_aceite"
                                            value={formData.unidad_periodo_aceite || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        >
                                            <option value="">Seleccione</option>
                                            <option value="horas">Horas</option>
                                            <option value="dias">Días</option>
                                            <option value="km">Kilómetros</option>
                                            <option value="millas">Millas</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium text-white mb-3">Servicio del Equipo</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Periodo</label>
                                        <input
                                            type="number"
                                            name="periodo_servicio_equipo"
                                            value={formData.periodo_servicio_equipo || ''}
                                            onChange={handleInputChange}
                                            step="0.01"
                                            className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Unidad</label>
                                        <select
                                            name="unidad_periodo_equipo"
                                            value={formData.unidad_periodo_equipo || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        >
                                            <option value="">Seleccione</option>
                                            <option value="horas">Horas</option>
                                            <option value="dias">Días</option>
                                            <option value="km">Kilómetros</option>
                                            <option value="millas">Millas</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Información Adicional */}
                    <div className="bg-[#292929] rounded-lg border border-[#333] p-6">
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <FileText size={24} className="text-red-500" />
                            Información Adicional
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Placa del Equipo
                                </label>
                                <input
                                    type="text"
                                    name="equipo_placa"
                                    value={formData.equipo_placa || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Tipo de Equipo/Uso
                                </label>
                                <select
                                    name="tipo_equipo"
                                    value={formData.tipo_equipo || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                >
                                    <option value="">Seleccione tipo de equipo</option>
                                    {tipoEquipo.map(tipo => (
                                        <option key={tipo.id} value={tipo.id}>
                                            {tipo.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-white mb-2">
                                    Observaciones
                                </label>
                                <textarea
                                    name="observaciones"
                                    value={formData.observaciones || ''}
                                    onChange={handleInputChange}
                                    rows={4}
                                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-vertical"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Campos Adicionales */}
                    <div className="bg-[#292929] rounded-lg border border-[#333] p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                <Settings size={24} className="text-red-500" />
                                Campos Adicionales
                            </h2>
                            <button
                                type="button"
                                onClick={() => setMostrarAgregarCampo(true)}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                            >
                                <Plus size={16} />
                                Agregar Campo
                            </button>
                        </div>

                        {/* Modal para agregar campo */}
                        {mostrarAgregarCampo && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div className="bg-[#292929] rounded-lg p-6 w-96 border border-[#444]">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-white">Agregar Campo</h3>
                                        <button
                                            onClick={() => setMostrarAgregarCampo(false)}
                                            className="text-[#d9d9d9] hover:text-white"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-white mb-1">
                                                Nombre del Campo *
                                            </label>
                                            <input
                                                type="text"
                                                value={nuevoCampo.nombre}
                                                onChange={(e) => setNuevoCampo({ ...nuevoCampo, nombre: e.target.value })}
                                                className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-white mb-1">
                                                Tipo de Campo
                                            </label>
                                            <select
                                                value={nuevoCampo.tipo}
                                                onChange={(e) => setNuevoCampo({ ...nuevoCampo, tipo: e.target.value })}
                                                className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            >
                                                {tiposCampo.map(tipo => (
                                                    <option key={tipo.value} value={tipo.value}>
                                                        {tipo.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={nuevoCampo.requerido}
                                                onChange={(e) => setNuevoCampo({ ...nuevoCampo, requerido: e.target.checked })}
                                                className="mr-2"
                                            />
                                            <label className="text-sm text-white">Campo requerido</label>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => setMostrarAgregarCampo(false)}
                                                className="px-4 py-2 border border-[#444] text-white rounded-lg hover:bg-[#333]"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={agregarCampo}
                                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                                            >
                                                <Plus size={16} />
                                                Agregar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Lista de campos adicionales */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {camposAdicionales.map((campo, index) => (
                                <div key={index} className="border border-[#444] rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-white font-medium">
                                            {campo.etiqueta || campo.nombre_campo}
                                            {campo.requerido && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => eliminarCampo(campo.id, index)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    
                                    {campo.tipo_campo === 'text' && (
                                        <input
                                            type="text"
                                            value={campo.valor_texto || ''}
                                            onChange={(e) => handleCampoAdicionalChange(index, e.target.value)}
                                            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                                            required={campo.requerido}
                                        />
                                    )}
                                    
                                    {campo.tipo_campo === 'number' && (
                                        <input
                                            type="number"
                                            value={campo.valor_numero || ''}
                                            onChange={(e) => handleCampoAdicionalChange(index, e.target.value)}
                                            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                                            required={campo.requerido}
                                        />
                                    )}
                                    
                                    {campo.tipo_campo === 'date' && (
                                        <input
                                            type="date"
                                            value={campo.valor_fecha || ''}
                                            onChange={(e) => handleCampoAdicionalChange(index, e.target.value)}
                                            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                                            required={campo.requerido}
                                        />
                                    )}
                                    
                                    {campo.tipo_campo === 'textarea' && (
                                        <textarea
                                            value={campo.valor_texto || ''}
                                            onChange={(e) => handleCampoAdicionalChange(index, e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white focus:outline-none focus:ring-1 focus:ring-red-500 resize-vertical"
                                            required={campo.requerido}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        {camposAdicionales.length === 0 && (
                            <div className="text-center py-8 text-[#d9d9d9]">
                                No hay campos adicionales configurados
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditarMuestra;