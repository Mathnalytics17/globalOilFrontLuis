import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAuth } from '../../shared/context/AuthContext';

const Dashboard = () => {
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState("");
  const [trendData, setTrendData] = useState({});
  const [filteredTrendData, setFilteredTrendData] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para filtros de fecha
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: ""
  });
  const [dateFilterEnabled, setDateFilterEnabled] = useState(false);
  
  const { api } = useAuth();

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const response = await api.get('machines/');
        
        console.log('Máquinas cargadas:', response.data);
        
        if (response.data && response.data.length > 0) {
          setMachines(response.data);
        } else {
          setMachines([]);
        }
      } catch (error) {
        console.error('Error al cargar las máquinas:', error);
        setError('Error al cargar los equipos: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchMachines();
  }, [api]);

  useEffect(() => {
    if (selectedMachine) {
      fetchTrendData();
    }
  }, [selectedMachine]);

  // Aplicar filtros cuando cambien las fechas
  useEffect(() => {
    if (dateFilterEnabled && dateRange.startDate && dateRange.endDate) {
      applyDateFilter();
    } else {
      // Si no hay filtro, usar todos los datos
      setFilteredTrendData(trendData);
    }
  }, [dateRange, dateFilterEnabled, trendData]);

  const fetchTrendData = async () => {
    if (!selectedMachine) return;
    
    setLoadingTrends(true);
    try {
      const machine = machines.find(m => m.id === parseInt(selectedMachine));
      
      if (!machine) {
        console.log('Máquina no encontrada:', selectedMachine);
        setTrendData({});
        setFilteredTrendData({});
        return;
      }

      console.log('Procesando máquina:', machine);
      console.log('Muestras encontradas:', machine.muestras?.length || 0);

      const trendDataMap = {};

      if (!machine.muestras || machine.muestras.length === 0) {
        console.log('No hay muestras para esta máquina');
        setTrendData({});
        setFilteredTrendData({});
        return;
      }

      // Recorrer cada muestra
      for (const muestra of machine.muestras) {
        const fecha = new Date(muestra.fecha_toma).toLocaleDateString();
        const fechaCompleta = new Date(muestra.fecha_toma);
        
        console.log(`Procesando muestra ${muestra.id} con fecha ${fecha}`);

        // Usar un Set para evitar duplicados por ID de prueba
        const pruebasProcesadas = new Set();

        // Procesar SOLO pruebas estructuradas (evitar duplicados con resultados)
        if (muestra.pruebas_estructuradas && muestra.pruebas_estructuradas.length > 0) {
          muestra.pruebas_estructuradas.forEach(prueba => {
            // Procesar prueba principal
            if (prueba.valor && prueba.prueba && !pruebasProcesadas.has(prueba.id)) {
              const pruebaKey = prueba.prueba.codigo;
              const pruebaNombre = prueba.prueba.nombre;
              const unidad = prueba.unidad || prueba.prueba.unidad_medida;
              
              if (!trendDataMap[pruebaKey]) {
                trendDataMap[pruebaKey] = {
                  nombre: pruebaNombre,
                  unidad: unidad,
                  datos: []
                };
              }
              
              const valorNumerico = parseFloat(prueba.valor);
              if (!isNaN(valorNumerico)) {
                trendDataMap[pruebaKey].datos.push({
                  fecha,
                  valor: valorNumerico,
                  muestra: muestra.id,
                  fechaCompleta: fechaCompleta,
                  pruebaId: prueba.id
                });
                pruebasProcesadas.add(prueba.id);
              }
            }

            // Procesar subpruebas
            if (prueba.subpruebas && prueba.subpruebas.length > 0) {
              prueba.subpruebas.forEach(subprueba => {
                if (subprueba.valor && subprueba.prueba && !pruebasProcesadas.has(subprueba.id)) {
                  const pruebaKey = subprueba.prueba.codigo;
                  const pruebaNombre = subprueba.prueba.nombre;
                  const unidad = subprueba.unidad || subprueba.prueba.unidad_medida;
                  
                  if (!trendDataMap[pruebaKey]) {
                    trendDataMap[pruebaKey] = {
                      nombre: pruebaNombre,
                      unidad: unidad,
                      datos: []
                    };
                  }
                  
                  const valorNumerico = parseFloat(subprueba.valor);
                  if (!isNaN(valorNumerico)) {
                    trendDataMap[pruebaKey].datos.push({
                      fecha,
                      valor: valorNumerico,
                      muestra: muestra.id,
                      fechaCompleta: fechaCompleta,
                      pruebaId: subprueba.id
                    });
                    pruebasProcesadas.add(subprueba.id);
                  }
                }
              });
            }
          });
        }

        // Solo procesar resultados que NO estén en pruebas_estructuradas
        if (muestra.resultados && muestra.resultados.length > 0) {
          muestra.resultados.forEach(resultado => {
            if (resultado.valor && resultado.prueba && !pruebasProcesadas.has(resultado.id)) {
              const pruebaKey = resultado.prueba.codigo;
              const pruebaNombre = resultado.prueba.nombre;
              const unidad = resultado.unidad || resultado.prueba.unidad_medida;
              
              if (!trendDataMap[pruebaKey]) {
                trendDataMap[pruebaKey] = {
                  nombre: pruebaNombre,
                  unidad: unidad,
                  datos: []
                };
              }
              
              const valorNumerico = parseFloat(resultado.valor);
              if (!isNaN(valorNumerico)) {
                trendDataMap[pruebaKey].datos.push({
                  fecha,
                  valor: valorNumerico,
                  muestra: muestra.id,
                  fechaCompleta: fechaCompleta,
                  pruebaId: resultado.id
                });
                pruebasProcesadas.add(resultado.id);
              }
            }
          });
        }
      }

      // Ordenar datos por fecha para cada prueba y eliminar duplicados
      Object.keys(trendDataMap).forEach(pruebaKey => {
        const datosUnicos = [];
        const idsVistos = new Set();
        
        trendDataMap[pruebaKey].datos.forEach(dato => {
          if (!idsVistos.has(dato.pruebaId)) {
            datosUnicos.push(dato);
            idsVistos.add(dato.pruebaId);
          }
        });

        // Ordenar por fecha
        datosUnicos.sort((a, b) => a.fechaCompleta - b.fechaCompleta);
        
        // Remover fechaCompleta y pruebaId después de ordenar
        trendDataMap[pruebaKey].datos = datosUnicos.map(({fechaCompleta, pruebaId, ...rest}) => rest);
      });

      console.log('Datos de tendencia procesados:', trendDataMap);
      setTrendData(trendDataMap);
      setFilteredTrendData(trendDataMap);
      
      // Resetear filtros cuando se cargan nuevos datos
      setDateRange({ startDate: "", endDate: "" });
      setDateFilterEnabled(false);
      
    } catch (error) {
      console.error('Error al procesar datos de tendencia:', error);
      setError('Error al procesar los datos de tendencia: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingTrends(false);
    }
  };

  const applyDateFilter = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      setFilteredTrendData(trendData);
      return;
    }

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999); // Incluir todo el día final

    const filteredData = {};

    Object.keys(trendData).forEach(pruebaKey => {
      const pruebaData = trendData[pruebaKey];
      const datosFiltrados = pruebaData.datos.filter(dato => {
        const datoDate = new Date(dato.fecha.split('/').reverse().join('-'));
        return datoDate >= startDate && datoDate <= endDate;
      });

      if (datosFiltrados.length > 0) {
        filteredData[pruebaKey] = {
          ...pruebaData,
          datos: datosFiltrados
        };
      }
    });

    setFilteredTrendData(filteredData);
  };

  const handleMachineChange = (event) => {
    setSelectedMachine(event.target.value);
    setTrendData({});
    setFilteredTrendData({});
    setDateRange({ startDate: "", endDate: "" });
    setDateFilterEnabled(false);
  };

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleDateFilter = () => {
    if (dateFilterEnabled) {
      // Desactivar filtro
      setDateFilterEnabled(false);
      setFilteredTrendData(trendData);
    } else {
      // Activar filtro
      setDateFilterEnabled(true);
      if (dateRange.startDate && dateRange.endDate) {
        applyDateFilter();
      }
    }
  };

  const clearDateFilter = () => {
    setDateRange({ startDate: "", endDate: "" });
    setDateFilterEnabled(false);
    setFilteredTrendData(trendData);
  };

  const getMachineInfo = () => {
    if (!selectedMachine) return null;
    return machines.find(m => m.id === parseInt(selectedMachine));
  };

  // Función para determinar el color de la línea
  const getLineColor = (pruebaKey) => {
    const colors = [
      '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d',
      '#16a34a', '#059669', '#0d9488', '#0891b2', '#0284c7',
      '#2563eb', '#4f46e5', '#7c3aed', '#9333ea', '#c026d3'
    ];
    
    let hash = 0;
    for (let i = 0; i < pruebaKey.length; i++) {
      hash = pruebaKey.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Componente de gráfica individual para cada prueba
  const PruebaChart = ({ pruebaKey, pruebaData }) => {
    if (!pruebaData.datos || pruebaData.datos.length === 0) return null;

    const lineColor = getLineColor(pruebaKey);

    return (
      <div className="bg-[#292929] rounded-lg border border-gray-700 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-1">
            {pruebaData.nombre} ({pruebaKey})
          </h3>
          <p className="text-gray-400 text-sm">
            Unidad: {pruebaData.unidad || 'N/A'} | 
            Datos: {pruebaData.datos.length} | 
            Rango: {Math.min(...pruebaData.datos.map(d => d.valor)).toFixed(2)} - {Math.max(...pruebaData.datos.map(d => d.valor)).toFixed(2)}
          </p>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={pruebaData.datos}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="fecha" 
              stroke="#9CA3AF"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#F9FAFB'
              }}
              formatter={(value) => [value, 'Valor']}
              labelFormatter={(label) => `Fecha: ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="valor" 
              stroke={lineColor}
              strokeWidth={2}
              dot={{ fill: lineColor, r: 4 }}
              activeDot={{ r: 6, fill: lineColor }}
              name={`${pruebaKey} (${pruebaData.unidad || ''})`}
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* Tabla de datos debajo de la gráfica */}
        <div className="mt-4">
          <h4 className="text-white font-medium mb-2">Datos Detallados</h4>
          <div className="overflow-x-auto max-h-40 overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-400 font-medium">Fecha</th>
                  <th className="text-left py-2 text-gray-400 font-medium">Muestra</th>
                  <th className="text-left py-2 text-gray-400 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {pruebaData.datos.map((dato, index) => (
                  <tr key={index} className="border-b border-gray-800 hover:bg-[#333333]">
                    <td className="py-2 text-gray-300">{dato.fecha}</td>
                    <td className="py-2 text-gray-300">{dato.muestra}</td>
                    <td className="py-2 text-white font-medium">{dato.valor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Estadísticas generales
  const StatisticsPanel = () => {
    const machineInfo = getMachineInfo();
    if (!machineInfo) return null;

    const totalPruebas = Object.keys(filteredTrendData).length;
    const totalMuestras = machineInfo.muestras?.length || 0;
    
    let totalDatos = 0;
    Object.keys(filteredTrendData).forEach(key => {
      totalDatos += filteredTrendData[key].datos.length;
    });

    return (
      <div className="bg-[#292929] rounded-lg border border-gray-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Estadísticas del Equipo
          {dateFilterEnabled && (
            <span className="ml-2 text-sm bg-yellow-600 text-white px-2 py-1 rounded-full">
              Filtrado
            </span>
          )}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-red-600 mb-1">{totalMuestras}</div>
            <div className="text-gray-400 text-sm">Total Muestras</div>
          </div>
          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-orange-500 mb-1">{totalPruebas}</div>
            <div className="text-gray-400 text-sm">Tipos de Pruebas</div>
          </div>
          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-green-500 mb-1">{totalDatos}</div>
            <div className="text-gray-400 text-sm">Datos Registrados</div>
          </div>
        </div>
      </div>
    );
  };

  // Panel de filtros de fecha
  const DateFilterPanel = () => {
    if (!selectedMachine) return null;

    return (
      <div className="bg-[#292929] rounded-lg border border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Filtros de Fecha</h3>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={dateFilterEnabled}
                onChange={toggleDateFilter}
                className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500 focus:ring-2"
              />
              Activar filtro
            </label>
            {(dateRange.startDate || dateRange.endDate) && (
              <button
                onClick={clearDateFilter}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Fecha Inicial</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-600"
              disabled={!dateFilterEnabled}
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">Fecha Final</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-600"
              disabled={!dateFilterEnabled}
            />
          </div>
          <div className="flex items-end">
            {dateFilterEnabled && dateRange.startDate && dateRange.endDate && (
              <div className="text-green-400 text-sm">
                Filtro activo: {dateRange.startDate} a {dateRange.endDate}
              </div>
            )}
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
          <p className="text-white mt-4">Cargando equipos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-[#292929] border border-gray-700 rounded-lg p-6 max-w-md">
          <div className="text-red-600 text-4xl mb-4 text-center">⚠️</div>
          <h3 className="text-white text-lg font-semibold mb-2 text-center">Error</h3>
          <p className="text-gray-400 text-center">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const machineInfo = getMachineInfo();
  const pruebasConDatos = Object.keys(filteredTrendData).filter(key => 
    filteredTrendData[key].datos && filteredTrendData[key].datos.length > 0
  );

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Dashboard de Tendencia de Pruebas
          </h1>
          <p className="text-gray-400">
            Visualiza la evolución de las pruebas a lo largo del tiempo por equipo
          </p>
        </div>

        {/* Selector de Máquina */}
        <div className="bg-[#292929] rounded-lg border border-gray-700 p-6 mb-6">
          <label className="block text-white font-medium mb-3">
            Seleccionar Equipo
          </label>
          <select
            value={selectedMachine}
            onChange={handleMachineChange}
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600"
          >
            <option value="">Selecciona un equipo</option>
            {machines.map((machine) => (
              <option key={machine.id} value={machine.id}>
                {machine.nombre} - {machine.codigo_equipo || 'Sin código'}
                {machine.muestras && machine.muestras.length > 0 && 
                  ` (${machine.muestras.length} muestra${machine.muestras.length > 1 ? 's' : ''})`}
              </option>
            ))}
          </select>
          
          {machineInfo && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#1a1a1a] rounded-lg border border-gray-700">
              <div>
                <h4 className="text-white font-semibold mb-2">Información del Equipo</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-300"><span className="text-gray-500">Nombre:</span> {machineInfo.nombre}</p>
                  <p className="text-gray-300"><span className="text-gray-500">Código:</span> {machineInfo.codigo_equipo || 'N/A'}</p>
                  <p className="text-gray-300"><span className="text-gray-500">N° Serie:</span> {machineInfo.numero_serie || 'N/A'}</p>
                </div>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">Especificaciones</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-300"><span className="text-gray-500">Componente:</span> {machineInfo.componente || 'N/A'}</p>
                  <p className="text-gray-300"><span className="text-gray-500">Tipo Aceite:</span> {machineInfo.tipoAceite || 'N/A'}</p>
                  <p className="text-gray-300"><span className="text-gray-500">Muestras:</span> {machineInfo.muestras?.length || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedMachine && (
          <>
            {loadingTrends ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                <p className="text-gray-400 mt-4">Cargando datos de tendencia...</p>
              </div>
            ) : (
              <>
                <DateFilterPanel />
                
                {pruebasConDatos.length > 0 ? (
                  <div className="space-y-6">
                    <StatisticsPanel />
                    
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-white">
                        Gráficas de Tendencia
                        {dateFilterEnabled && (
                          <span className="ml-2 text-sm bg-yellow-600 text-white px-2 py-1 rounded-full">
                            Filtrado
                          </span>
                        )}
                      </h2>
                      <span className="bg-red-600 text-white text-sm px-3 py-1 rounded-full">
                        {pruebasConDatos.length} pruebas con datos
                      </span>
                    </div>

                    {/* Grid de gráficas individuales */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {pruebasConDatos.map(pruebaKey => (
                        <PruebaChart 
                          key={pruebaKey}
                          pruebaKey={pruebaKey}
                          pruebaData={filteredTrendData[pruebaKey]}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
                    <div className="text-gray-500 text-6xl mb-4">📊</div>
                    <h3 className="text-lg font-medium text-gray-400 mb-2">
                      {dateFilterEnabled 
                        ? 'No hay datos en el rango de fechas seleccionado'
                        : 'No hay datos de pruebas disponibles'
                      }
                    </h3>
                    <p className="text-gray-500">
                      {machineInfo?.muestras?.length === 0 
                        ? 'Este equipo no tiene muestras registradas'
                        : dateFilterEnabled
                          ? 'Intenta con un rango de fechas diferente'
                          : 'No se encontraron pruebas con datos numéricos para este equipo'
                      }
                    </p>
                    {dateFilterEnabled && (
                      <button
                        onClick={clearDateFilter}
                        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        Limpiar Filtros
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {!selectedMachine && machines.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
            <div className="text-gray-500 text-6xl mb-4">🏭</div>
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              No hay equipos disponibles
            </h3>
            <p className="text-gray-500">
              No se encontraron equipos en el sistema
            </p>
          </div>
        )}

        {!selectedMachine && machines.length > 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
            <div className="text-gray-500 text-6xl mb-4">🏭</div>
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              Selecciona un equipo
            </h3>
            <p className="text-gray-500">
              Elige un equipo de la lista para ver las tendencias de sus pruebas
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;