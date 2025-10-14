import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../shared/context/AuthContext';
import { toast } from 'react-toastify';

// Importar modales de edición
import ModalEditarElemento from '../../../shared/components/modals/modalEditarElemento';
import ModalEditarCalidad from '../../../shared/components/modals/modalEditarCalidad';
import ModalEditarGenerico from '../../../shared/components/modals/modalEditarGenerico';
import ModalEditarViscosidad from '../../../shared/components/modals/modalEditarViscosidad';



const ListaLimites = () => {
  const { api } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('todos');
  const [limites, setLimites] = useState({
    todos: [],
    viscosidad: [],
    calidad: [],
    generico: [],
    elemento: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para modales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [limiteEditando, setLimiteEditando] = useState(null);
  const [tipoEditando, setTipoEditando] = useState('');

  // Cargar todos los límites
  useEffect(() => {
    const fetchLimites = async () => {
      try {
        setLoading(true);
        
        const [viscosidadResponse, calidadResponse, genericoResponse, elementosResponse] = await Promise.all([
          api.get('limites-viscosidad/'),
          api.get('limites-calidad/'),
          api.get('limites-genericos/'),
          api.get('elementos/')
        ]);

        const todosLimites = [
          ...viscosidadResponse.data.map(item => ({ 
            ...item, 
            tipo_limite: 'viscosidad',
            displayName: `${item.v1 || ''}${item.v2 ? '/' + item.v2 : ''}${item.vmin ? ' min:' + item.vmin : ''}${item.vmax ? ' max:' + item.vmax : ''}` || 'Límite Viscosidad'
          })),
          ...calidadResponse.data.map(item => ({ 
            ...item, 
            tipo_limite: 'calidad',
            displayName: `${item.c1 || ''}${item.c2 ? '/' + item.c2 : ''}${item.valor ? ' - ' + item.valor : ''}` || 'Límite Calidad'
          })),
          ...genericoResponse.data.map(item => ({ 
            ...item, 
            tipo_limite: 'generico',
            displayName: item.nombre || 'Límite Genérico'
          })),
          ...elementosResponse.data.map(item => ({ 
            ...item, 
            tipo_limite: 'elemento',
            displayName: `${item.simbolo} - ${item.nombre}${item.valor ? ' (' + item.valor + ')' : ''}`
          }))
        ];

        setLimites({
          todos: todosLimites,
          viscosidad: viscosidadResponse.data.map(item => ({ ...item, tipo_limite: 'viscosidad' })),
          calidad: calidadResponse.data.map(item => ({ ...item, tipo_limite: 'calidad' })),
          generico: genericoResponse.data.map(item => ({ ...item, tipo_limite: 'generico' })),
          elemento: elementosResponse.data.map(item => ({ ...item, tipo_limite: 'elemento' }))
        });

      } catch (error) {
        console.error('Error cargando límites:', error);
        toast.error('Error al cargar los límites');
      } finally {
        setLoading(false);
      }
    };

    fetchLimites();
  }, [api]);

  // Filtrar límites según búsqueda
  const filteredLimites = limites[activeTab].filter(limite => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    if (limite.tipo_limite === 'viscosidad') {
      return (
        (limite.v1 && limite.v1.toLowerCase().includes(searchLower)) ||
        (limite.v2 && limite.v2.toLowerCase().includes(searchLower)) ||
        (limite.vmin && limite.vmin.toString().includes(searchTerm)) ||
        (limite.vmax && limite.vmax.toString().includes(searchTerm))
      );
    }
    
    if (limite.tipo_limite === 'calidad') {
      return (
        (limite.c1 && limite.c1.toLowerCase().includes(searchLower)) ||
        (limite.c2 && limite.c2.toLowerCase().includes(searchLower)) ||
        (limite.seq_espuma && limite.seq_espuma.toLowerCase().includes(searchLower)) ||
        (limite.valor && limite.valor.toLowerCase().includes(searchLower))
      );
    }
    
    if (limite.tipo_limite === 'generico') {
      return (
        (limite.nombre && limite.nombre.toLowerCase().includes(searchLower)) ||
        (limite.valor && limite.valor.toString().includes(searchTerm)) ||
        (limite.symbol_operation && limite.symbol_operation.includes(searchTerm))
      );
    }
    
    if (limite.tipo_limite === 'elemento') {
      return (
        (limite.simbolo && limite.simbolo.toLowerCase().includes(searchLower)) ||
        (limite.nombre && limite.nombre.toLowerCase().includes(searchLower)) ||
        (limite.valor && limite.valor.toString().includes(searchTerm)) ||
        (limite.symbol_operation && limite.symbol_operation.includes(searchTerm))
      );
    }
    
    return false;
  });

  const getTipoBadgeColor = (tipo) => {
    const colors = {
      viscosidad: 'bg-blue-600',
      calidad: 'bg-green-600',
      generico: 'bg-purple-600',
      elemento: 'bg-orange-600'
    };
    return colors[tipo] || 'bg-gray-600';
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      viscosidad: 'Viscosidad',
      calidad: 'Calidad',
      generico: 'Genérico',
      elemento: 'Elemento'
    };
    return labels[tipo] || tipo;
  };

  const handleEdit = (limite) => {
    setLimiteEditando(limite);
    setTipoEditando(limite.tipo_limite);
    setModalAbierto(true);
  };

  const handleDelete = async (limite) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar este límite?`)) {
      return;
    }

    try {
      const endpoints = {
        viscosidad: `limites-viscosidad/${limite.id}/`,
        calidad: `limites-calidad/${limite.id}/`,
        generico: `limites-genericos/${limite.id}/`,
        elemento: `elementos/${limite.id}/`
      };

      await api.delete(endpoints[limite.tipo_limite]);
      toast.success('Límite eliminado exitosamente');
      
      // Recargar la lista
      setLimites(prev => ({
        ...prev,
        [limite.tipo_limite]: prev[limite.tipo_limite].filter(item => item.id !== limite.id),
        todos: prev.todos.filter(item => !(item.id === limite.id && item.tipo_limite === limite.tipo_limite))
      }));
    } catch (error) {
      toast.error('Error al eliminar límite: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCerrarModal = () => {
    setModalAbierto(false);
    setLimiteEditando(null);
    setTipoEditando('');
  };

  const handleGuardarExitoso = () => {
    // Recargar los límites después de una edición exitosa
    const fetchLimitesActualizados = async () => {
      try {
        const [viscosidadResponse, calidadResponse, genericoResponse, elementosResponse] = await Promise.all([
          api.get('limites-viscosidad/'),
          api.get('limites-calidad/'),
          api.get('limites-genericos/'),
          api.get('elementos/')
        ]);

        const todosLimites = [
          ...viscosidadResponse.data.map(item => ({ ...item, tipo_limite: 'viscosidad' })),
          ...calidadResponse.data.map(item => ({ ...item, tipo_limite: 'calidad' })),
          ...genericoResponse.data.map(item => ({ ...item, tipo_limite: 'generico' })),
          ...elementosResponse.data.map(item => ({ ...item, tipo_limite: 'elemento' }))
        ];

        setLimites({
          todos: todosLimites,
          viscosidad: viscosidadResponse.data.map(item => ({ ...item, tipo_limite: 'viscosidad' })),
          calidad: calidadResponse.data.map(item => ({ ...item, tipo_limite: 'calidad' })),
          generico: genericoResponse.data.map(item => ({ ...item, tipo_limite: 'generico' })),
          elemento: elementosResponse.data.map(item => ({ ...item, tipo_limite: 'elemento' }))
        });

        handleCerrarModal();
      } catch (error) {
        console.error('Error recargando límites:', error);
      }
    };

    fetchLimitesActualizados();
  };

  const LimiteCard = ({ limite }) => {
    return (
      <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-4 hover:border-gray-500 transition-colors">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTipoBadgeColor(limite.tipo_limite)}`}>
              {getTipoLabel(limite.tipo_limite)}
            </span>
            {limite.tipo_limite === 'elemento' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-600">
                {limite.simbolo}
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleEdit(limite)}
              className="text-blue-400 hover:text-blue-300 transition-colors p-1"
              title="Editar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => handleDelete(limite)}
              className="text-red-400 hover:text-red-300 transition-colors p-1"
              title="Eliminar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {limite.tipo_limite === 'viscosidad' && (
            <>
              <h3 className="text-white font-semibold">
                {limite.v1 && limite.v2 ? `${limite.v1} / ${limite.v2}` : 'Límite Viscosidad'}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                {limite.vmin && <div>Mín: {limite.vmin}</div>}
                {limite.vmax && <div>Máx: {limite.vmax}</div>}
                {limite.iv1 && <div>IV1: {limite.iv1}</div>}
                {limite.iv2 && <div>IV2: {limite.iv2}</div>}
              </div>
            </>
          )}

          {limite.tipo_limite === 'calidad' && (
            <>
              <h3 className="text-white font-semibold">
                {limite.c1 && limite.c2 ? `${limite.c1} / ${limite.c2}` : 'Límite Calidad'}
              </h3>
              <div className="space-y-1 text-sm text-gray-300">
                {limite.seq_espuma && <div>Sec. Espuma: {limite.seq_espuma}</div>}
                {limite.chispa && <div>Chispa: {limite.chispa}</div>}
                {limite.valor && <div>Valor: {limite.valor}</div>}
              </div>
            </>
          )}

          {limite.tipo_limite === 'generico' && (
            <>
              <h3 className="text-white font-semibold">{limite.nombre}</h3>
              <div className="space-y-1 text-sm text-gray-300">
                {limite.valor && <div>Valor: {limite.valor}</div>}
                {limite.symbol_operation && (
                  <div>Operación: {limite.symbol_operation} {limite.type_operation && `(${limite.type_operation})`}</div>
                )}
              </div>
            </>
          )}

          {limite.tipo_limite === 'elemento' && (
            <>
              <h3 className="text-white font-semibold">
                {limite.nombre}
              </h3>
              <div className="space-y-1 text-sm text-gray-300">
                <div>Símbolo: {limite.simbolo}</div>
                {limite.valor && <div>Valor: {limite.valor}</div>}
                {limite.symbol_operation && <div>Operación: {limite.symbol_operation}</div>}
              </div>
            </>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-xs text-gray-500">
            ID: {limite.id}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="text-white mt-4">Cargando límites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Límites del Sistema
              </h1>
              <p className="text-gray-400">
                Gestiona todos los límites disponibles para asignar a pruebas
              </p>
            </div>
            <button
              onClick={() => router.push('/limits')}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              Crear Nuevo Límite
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-[#292929] border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{limites.todos.length}</div>
            <div className="text-gray-400 text-sm">Total</div>
          </div>
          <div className="bg-[#292929] border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{limites.viscosidad.length}</div>
            <div className="text-gray-400 text-sm">Viscosidad</div>
          </div>
          <div className="bg-[#292929] border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{limites.calidad.length}</div>
            <div className="text-gray-400 text-sm">Calidad</div>
          </div>
          <div className="bg-[#292929] border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">{limites.generico.length}</div>
            <div className="text-gray-400 text-sm">Genéricos</div>
          </div>
          <div className="bg-[#292929] border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-400">{limites.elemento.length}</div>
            <div className="text-gray-400 text-sm">Elementos</div>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-[#292929] rounded-lg border border-gray-700 mb-6">
          <div className="p-4 border-b border-gray-700">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Barra de búsqueda */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar límites..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pl-10 bg-[#1a1a1a] border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Filtro por tipo */}
              <div className="flex space-x-1 bg-[#1a1a1a] rounded-lg p-1">
                {[
                  { key: 'todos', label: 'Todos' },
                  { key: 'viscosidad', label: 'Viscosidad' },
                  { key: 'calidad', label: 'Calidad' },
                  { key: 'generico', label: 'Genéricos' },
                  { key: 'elemento', label: 'Elementos' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'bg-red-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.label} ({limites[tab.key].length})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lista de límites */}
          <div className="p-4">
            {filteredLimites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLimites.map((limite) => (
                  <LimiteCard key={`${limite.tipo_limite}-${limite.id}`} limite={limite} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-400 mb-2">
                  {searchTerm ? 'No se encontraron límites' : 'No hay límites creados'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm 
                    ? 'Intenta con otros términos de búsqueda'
                    : 'Comienza creando el primer límite del sistema'
                  }
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => router.push('/limits')}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
                  >
                    Crear Primer Límite
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modales de Edición */}
        {modalAbierto && tipoEditando === 'viscosidad' && (
          <ModalEditarViscosidad
            limite={limiteEditando}
            onClose={handleCerrarModal}
            onSave={handleGuardarExitoso}
          />
        )}

        {modalAbierto && tipoEditando === 'calidad' && (
          <ModalEditarCalidad
            limite={limiteEditando}
            onClose={handleCerrarModal}
            onSave={handleGuardarExitoso}
          />
        )}

        {modalAbierto && tipoEditando === 'generico' && (
          <ModalEditarGenerico
            limite={limiteEditando}
            onClose={handleCerrarModal}
            onSave={handleGuardarExitoso}
          />
        )}

        {modalAbierto && tipoEditando === 'elemento' && (
          <ModalEditarElemento
            elemento={limiteEditando}
            onClose={handleCerrarModal}
            onSave={handleGuardarExitoso}
          />
        )}
      </div>
    </div>
  );
};

export default ListaLimites;