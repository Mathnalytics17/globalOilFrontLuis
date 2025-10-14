import React, { useState, useEffect } from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import DataTable from '../../shared/components/dataTableGen';

// Iconos de Lucide React
import {
  Search,
  X,
  Download,
  Plus,
  Filter,
  CheckCircle,
  Clock,
  CheckSquare,
  TestTube,
  FileText,
  Eye,
  Edit,
  Play
} from 'lucide-react';

const MuestrasTable = () => {
  const { api } = useAuth();
  const router = useRouter();
  const [muestras, setMuestras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    estado: 'todos',
    fechaDesde: '',
    fechaHasta: '',
    idMuestra: '',
    equipoCodigo: '',
    lubricanteRef: ''
  });

  // Obtener datos optimizados - SOLO 1 llamada
  const fetchData = async () => {
    setLoading(true);
    try {
      const muestrasRes = await api.get('lubrication/samples-list/');
      setMuestras(muestrasRes.data);
    } catch (error) {
      toast.error('Error al cargar datos: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calcular estadísticas para cada muestra - AHORA CON ESTRUCTURA JERÁRQUICA
  const getEstadisticasMuestra = (muestra) => {
    if (!muestra.pruebas_estructuradas || muestra.pruebas_estructuradas.length === 0) {
      return { total: 0, completadas: 0, aprobadas: 0, grupos: 0 };
    }
    
    // Contar solo subpruebas (las que realmente se ejecutan)
    let totalSubpruebas = 0;
    let completadasSubpruebas = 0;
    let aprobadasSubpruebas = 0;
    
    muestra.pruebas_estructuradas.forEach(prueba => {
      if (prueba.subpruebas && prueba.subpruebas.length > 0) {
        // Es una prueba compuesta, contar sus subpruebas
        prueba.subpruebas.forEach(subprueba => {
          totalSubpruebas++;
          if (subprueba.completada) completadasSubpruebas++;
          if (subprueba.estatus === 'aprobado') aprobadasSubpruebas++;
        });
      } else {
        // Es una prueba individual, contar como subprueba
        totalSubpruebas++;
        if (prueba.completada) completadasSubpruebas++;
        if (prueba.estatus === 'aprobado') aprobadasSubpruebas++;
      }
    });
    
    return { 
      total: totalSubpruebas, 
      completadas: completadasSubpruebas, 
      aprobadas: aprobadasSubpruebas,
      grupos: muestra.pruebas_estructuradas.length 
    };
  };

  // Función auxiliar para contar pruebas totales (incluyendo padres)
  const getTotalPruebasAsignadas = (muestra) => {
    return muestra.resultados ? muestra.resultados.length : 0;
  };

  // Columnas optimizadas
  const columns = [
    { 
      id: 'id', 
      label: 'ID MUESTRA', 
      minWidth: 120,
      render: (row) => (
        <span className="font-mono font-bold text-red-400">
          #{row.id}
        </span>
      )
    },
    { 
      id: 'fecha_toma', 
      label: 'FECHA TOMA', 
      minWidth: 120,
      render: (row) => (
        <div className="font-mono font-bold text-red-400">
          {new Date(row.fecha_toma).toLocaleDateString('es-ES')}
        </div>
      )
    },
    { 
      id: 'lubricante', 
      label: 'LUBRICANTE', 
      minWidth: 150,
      render: (row) => (
        <div>
          <div className="font-mono font-bold text-red-400">
            {row.lubricante?.referencia || '-'}
          </div>
          {row.lubricante?.nombre_comercial && (
            <div className="text-gray-400 text-sm">
              {row.lubricante.nombre_comercial}
            </div>
          )}
        </div>
      )
    },
    { 
      id: 'referencia_equipo_info', 
      label: 'EQUIPO', 
      minWidth: 120,
      render: (row) => (
        <div>
          <div className="font-mono font-bold text-red-400">
            {row.referencia_equipo_info?.id || '-'}
          </div>
          {row.referencia_equipo_info?.nombre && (
            <div className="text-gray-600 text-sm">
              {row.referencia_equipo_info.nombre}
            </div>
          )}
        </div>
      )
    },
    { 
      id: 'progreso', 
      label: 'PROGRESO', 
      minWidth: 140,
      render: (row) => {
        const stats = getEstadisticasMuestra(row);
        const porcentaje = stats.total > 0 ? Math.round((stats.completadas / stats.total) * 100) : 0;
        
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{stats.completadas}/{stats.total}</span>
              <span className="text-white font-medium">{porcentaje}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${porcentaje}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 text-center">
              {stats.grupos} grupo(s) de pruebas
            </div>
          </div>
        );
      }
    },
    { 
      id: 'estado', 
      label: 'ESTADO', 
      minWidth: 120,
      align: 'center',
      render: (row) => {
        const stats = getEstadisticasMuestra(row);
        const totalAsignadas = getTotalPruebasAsignadas(row);
        
        const getStatusConfig = (row, stats, totalAsignadas) => {
          if (stats.completadas > 0) {
            return {
              label: 'APROBADO',
              color: 'bg-green-600',
              textColor: 'text-green-100',
              icon: CheckCircle,
              subText: `${stats.aprobadas}/${stats.total} aprobadas`
            };
          }
          if (row.is_revisado) {
            return {
              label: 'REVISADO',
              color: 'bg-blue-600',
              textColor: 'text-blue-100',
              icon: CheckSquare,
              subText: `${stats.completadas}/${stats.total} completadas`
            };
          }
          if (row.is_ingresado && totalAsignadas > 0) {
            return {
              label: 'ASIGNADO',
              color: 'bg-yellow-600',
              textColor: 'text-yellow-100',
              icon: Clock,
              subText: `${totalAsignadas} pruebas asignadas`
            };
          }
          if (row.is_ingresado) {
            return {
              label: 'INGRESADO',
              color: 'bg-gray-600',
              textColor: 'text-gray-100',
              icon: Clock,
              subText: 'Sin pruebas asignadas'
            };
          }
          return {
            label: 'PENDIENTE',
            color: 'bg-red-600',
            textColor: 'text-gray-100',
            icon: Clock,
            subText: 'Por ingresar'
          };
        };

        const config = getStatusConfig(row, stats, totalAsignadas);
        const IconComponent = config.icon;

        return (
          <div className="flex flex-col items-center space-y-1">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color} ${config.textColor}`}>
              <IconComponent size={12} className="mr-1" />
              {config.label}
            </span>
            <div className="text-xs text-gray-400 text-center">
              {config.subText}
            </div>
          </div>
        );
      }
    }
  ];

  // Acciones simplificadas - ACTUALIZADAS CON NUEVA LÓGICA
  const actions = [
    {
      id: 'asignar-ensayos',
      icon: <Play size={16} />,
      tooltip: 'Asignar ensayos',
      handler: (row) => router.push(`/muestras/ensayos-muestra?muestra=${row.id}`),
      // Disponible si está ingresado pero no tiene pruebas asignadas
      //disabled: (row) => row.is_revisado,
      color: 'text-blue-400 hover:text-blue-300'
    },
    {
      id: 'ingresar-resultados',
      icon: <TestTube size={16} />,
      tooltip: 'Ingresar resultados',
      handler: (row) => router.push(`/muestras/ensayos-muestra/ingreso-ensayos?muestra=${row.id}`),
      // Disponible si tiene pruebas asignadas pero no todas están completadas
     //disabled: (row) => row.is_revisado,
      color: 'text-green-400 hover:text-green-300'
    },
    {
      id: 'revision-ensayos',
      icon: <FileText size={16} />,
      tooltip: 'Revisar resultados',
      handler: (row) => router.push(`/muestras/revision-muestras/revision-muestra?muestra=${row.id}`),
      // Disponible si tiene pruebas completadas pero no está aprobado
     // disabled: (row) => row.is_revisado,
      color: 'text-purple-400 hover:text-purple-300'
    },
    {
      id: 'view',
      icon: <Eye size={16} />,
      tooltip: 'Ver detalle',
      handler: (row) => router.push(`/muestras/muestra-details?muestra=${row.id}`),
      color: 'text-gray-400 hover:text-gray-300'
    },
    {
      id: 'edit',
      icon: <Edit size={16} />,
      tooltip: 'Editar',
      handler: (row) => router.push(`/muestras/editar-muestra?muestra=${row.id}`),
      // No editable si está aprobado o tiene resultados
      disabled: (row) => {
        const stats = getEstadisticasMuestra(row);
        return row.is_aprobado || stats.completadas > 0;
      },
      color: 'text-yellow-400 hover:text-yellow-300'
    }
  ];

  // Aplicar filtros
  const filteredData = muestras.filter(muestra => {
    const matchesSearch = 
      !searchTerm ||
      (muestra.id && muestra.id.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
      (muestra.lubricante?.nombre_comercial && muestra.lubricante.nombre_comercial.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (muestra.referencia_equipo_info?.nombre && muestra.referencia_equipo_info.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = 
      filters.estado === 'todos' || 
      (filters.estado === 'ingresado' && muestra.is_ingresado) ||
      (filters.estado === 'pendiente' && !muestra.is_ingresado);

    const matchesId = !filters.idMuestra || (muestra.id && muestra.id.toString().includes(filters.idMuestra));
    const matchesEquipo = !filters.equipoCodigo || 
      (muestra.referencia_equipo_info?.id && muestra.referencia_equipo_info.id.toString().includes(filters.equipoCodigo));
    const matchesLubricante = !filters.lubricanteRef || 
      (muestra.lubricante?.referencia && muestra.lubricante.referencia.includes(filters.lubricanteRef));

    const fechaToma = new Date(muestra.fecha_toma);
    fechaToma.setHours(0, 0, 0, 0);
    
    const filterFechaDesde = filters.fechaDesde ? new Date(filters.fechaDesde) : null;
    const filterFechaHasta = filters.fechaHasta ? new Date(filters.fechaHasta) : null;
    
    if (filterFechaDesde) filterFechaDesde.setHours(0, 0, 0, 0);
    if (filterFechaHasta) filterFechaHasta.setHours(23, 59, 59, 999);
    
    const matchesFechaDesde = !filterFechaDesde || fechaToma >= filterFechaDesde;
    const matchesFechaHasta = !filterFechaHasta || fechaToma <= filterFechaHasta;

    return matchesSearch && matchesStatus && matchesId && matchesEquipo && 
           matchesLubricante && matchesFechaDesde && matchesFechaHasta;
  });

  // Exportar a Excel optimizado
  const exportToExcel = () => {
    const dataForExport = filteredData.map(muestra => {
      const stats = getEstadisticasMuestra(muestra);
      const baseData = {
        'ID Muestra': muestra.id,
        'Fecha Toma': new Date(muestra.fecha_toma).toLocaleDateString(),
        'Lubricante': muestra.lubricante?.nombre_comercial || '',
        'Referencia Lubricante': muestra.lubricante?.referencia || '',
        'Equipo': muestra.referencia_equipo_info?.nombre || '',
        'ID Equipo': muestra.referencia_equipo_info?.id || '',
        'Estado': muestra.is_aprobado ? 'Aprobado' : (muestra.is_ingresado ? 'Ingresado' : 'Pendiente'),
        'Pruebas Totales': stats.total,
        'Pruebas Completadas': stats.completadas,
        'Pruebas Aprobadas': stats.aprobadas,
        'Grupos de Pruebas': stats.grupos
      };

      // Agregar columnas dinámicas para cada subprueba
      if (muestra.pruebas_estructuradas) {
        muestra.pruebas_estructuradas.forEach(grupo => {
          if (grupo.subpruebas && grupo.subpruebas.length > 0) {
            grupo.subpruebas.forEach(subprueba => {
              baseData[subprueba.prueba?.nombre || 'Prueba'] = subprueba.valor || '';
            });
          } else {
            baseData[grupo.prueba?.nombre || 'Prueba'] = grupo.valor || '';
          }
        });
      }

      return baseData;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataForExport);
    XLSX.utils.book_append_sheet(wb, ws, 'Muestras');
    const fileName = `muestras_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Resetear filtros
  const resetAdvancedFilters = () => {
    setFilters({
      ...filters,
      fechaDesde: '',
      fechaHasta: '',
      idMuestra: '',
      equipoCodigo: '',
      lubricanteRef: ''
    });
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Gestión de Muestras
        </h1>
        <p className="text-gray-400">
          Administre y realice seguimiento a las muestras de lubricantes
        </p>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-[#292929] rounded-lg p-4 mb-6 border border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por ID, lubricante o equipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-[#333] border border-[#444] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={() => setAdvancedFilterOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg transition-colors"
            >
              <Filter size={18} />
              <span>Filtros</span>
            </button>

            <select
              value={filters.estado}
              onChange={(e) => setFilters({...filters, estado: e.target.value})}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="ingresado">Ingresados</option>
              <option value="pendiente">Pendientes</option>
            </select>

            <button
              onClick={exportToExcel}
              disabled={filteredData.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Download size={18} />
              <span>Exportar</span>
            </button>

            <button
              onClick={() => router.push('/muestras/cliente-muestra')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <Plus size={18} />
              <span>Nueva Muestra</span>
            </button>
          </div>
        </div>
      </div>
      {/* Diálogo de filtros avanzados (igual que antes) */}
      {advancedFilterOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-md">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Filtros Avanzados</h2>
            </div>
            
            <div className="p-6 space-y-4">
              {/* ... (mismo código de filtros avanzados) ... */}
            </div>
            
            <div className="p-6 border-t border-gray-700 flex justify-between">
              <button
                onClick={resetAdvancedFilters}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Limpiar
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setAdvancedFilterOpen(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setAdvancedFilterOpen(false)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Tabla de resultados */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredData}
          actions={actions}
          loading={loading}
          emptyMessage="No se encontraron muestras con los filtros aplicados"
          selectable
          pagination
          sx={{
            '& .MuiDataGrid-root': {
              border: 'none',
              minHeight: '500px',
              backgroundColor: '#1f2937',
              color: 'white'
            }
          }}
        />
      </div>
    </div>
  );
};

export default MuestrasTable;