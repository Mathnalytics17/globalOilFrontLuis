import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../shared/context/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { 
  ArrowLeft, 
  Save, 
  TestTube, 
  CheckCircle, 
  XCircle,
  Edit3,
  ChevronDown,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

const IngresoEnsayos = () => {
  const { api, user } = useAuth();
  const router = useRouter();
  const { muestra } = router.query;
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [expandedTests, setExpandedTests] = useState(new Set());

  console.log(muestra)
  const handleBack = () => {
    router.push(`/muestras/ensayos-muestra?muestra=${muestra}`);
  };

  // Obtener todas las pruebas asignadas a la muestra con sus resultados
  useEffect(() => {
    const fetchTests = async () => {
      if (!muestra) return;
      
      try {
        console.log('🔍 Buscando pruebas para muestra:', muestra);
        
        // Obtener la muestra completa con sus pruebas
        const response = await api.get(`lubrication/samples/${muestra}/`);
        console.log('📦 Muestra con pruebas:', response.data);
        
        const pruebasMuestra = response.data.resultados || [];
        console.log('✅ Pruebas de la muestra:', pruebasMuestra);
        setTests(pruebasMuestra);
        
        // Inicializar formData con valores existentes
        const initialData = {};
        pruebasMuestra.forEach(test => {
          if (test.valor !== null && test.valor !== undefined) {
            initialData[`prueba_${test.id}`] = test.valor;
          }
        });
        setFormData(initialData);
        
        // Expandir automáticamente las pruebas que tienen subpruebas
        const expanded = new Set();
        pruebasMuestra.forEach(test => {
          if (hasSubTests(test.prueba.id)) {
            expanded.add(test.id);
          }
        });
        setExpandedTests(expanded);
        
      } catch (error) {
        console.error('❌ Error cargando pruebas:', error);
        toast.error('Error al cargar pruebas: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, [api, muestra]);

  // Función para verificar si una prueba tiene subpruebas
  const hasSubTests = (pruebaId) => {
    return tests.some(test => 
      test.prueba.is_subPrueba && test.prueba.parent_node === pruebaId
    );
  };

  // Función para obtener subpruebas de una prueba principal
  const getSubTests = (parentTestId) => {
    return tests.filter(test => 
      test.prueba.is_subPrueba && test.prueba.parent_node === parentTestId
    );
  };

  // Función para obtener pruebas principales (que no son subpruebas)
  const getMainTests = () => {
    return tests.filter(test => 
      !test.prueba.is_subPrueba
    );
  };

  // Función para obtener pruebas individuales (que no son padres ni subpruebas)
  const getIndividualTests = () => {
    return tests.filter(test => 
      !test.prueba.is_subPrueba && !hasSubTests(test.prueba.id)
    );
  };

  const handleInputChange = (pruebaId, value) => {
    setFormData(prev => ({
      ...prev,
      [`prueba_${pruebaId}`]: value
    }));
  };

  const toggleExpanded = (testId) => {
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  };

  // Función para verificar si una prueba padre tiene resultados en sus subpruebas
  const hasSubTestResults = (parentTestId) => {
    const subTests = getSubTests(parentTestId);
    return subTests.some(subTest => {
      const fieldName = `prueba_${subTest.id}`;
      const value = formData[fieldName];
      return value !== undefined && value !== null && value !== '';
    });
  };

  // Función para contar cuántas subpruebas tienen resultados
  const getSubTestCompletedCount = (parentTestId) => {
    const subTests = getSubTests(parentTestId);
    return subTests.filter(subTest => {
      const fieldName = `prueba_${subTest.id}`;
      const value = formData[fieldName];
      return value !== undefined && value !== null && value !== '';
    }).length;
  };

  // Función para contar resultados completados - CORREGIDA
  const getCompletedCount = () => {
    let count = 0;
    
    tests.forEach(test => {
      const fieldName = `prueba_${test.id}`;
      const value = formData[fieldName];
      
      // Contar TODAS las pruebas que tienen valor (subpruebas e individuales)
      if (value !== undefined && value !== null && value !== '') {
        count++;
      }
    });
    
    return count;
  };

  // Función para obtener el total de pruebas que pueden recibir datos - CORREGIDA
  const getTotalInputTests = () => {
    // TODAS las pruebas pueden recibir datos, excepto las pruebas padre que solo agrupan
    return tests.filter(test => {
      // Si es una prueba padre (tiene subpruebas), no puede recibir datos directamente
      if (!test.prueba.is_subPrueba && hasSubTests(test.prueba.id)) {
        return false;
      }
      // Las subpruebas y pruebas individuales sí pueden recibir datos
      return true;
    }).length;
  };

  const onSubmit = async () => {
    if (!tests.length) {
      toast.error('No hay pruebas para guardar');
      return;
    }

    setSaving(true);
    try {
      const fechaMedicion = new Date().toISOString();
      const updates = [];
      
      console.log('💾 Guardando resultados para', tests.length, 'pruebas');

      for (const test of tests) {
        const fieldName = `prueba_${test.id}`;
        const value = formData[fieldName];
        
        // Determinar qué tipo de prueba es
        const isParentTest = !test.prueba.is_subPrueba && hasSubTests(test.prueba.id);
        const isSubPrueba = test.prueba.is_subPrueba;
        const isIndividualTest = !test.prueba.is_subPrueba && !hasSubTests(test.prueba.id);

        console.log(`🔧 Procesando prueba ${test.id} (${test.prueba.nombre}):`, { 
          value, 
          isParentTest, 
          isSubPrueba, 
          isIndividualTest 
        });

        // Solo procesar subpruebas y pruebas individuales (NO procesar pruebas padre)
        if (isParentTest) {
          console.log(`⏭️ Saltando prueba padre ${test.id} (${test.prueba.nombre})`);
          continue;
        }

        // Solo enviar si hay un valor (para subpruebas e individuales)
        if (value !== undefined && value !== null && value !== '') {
          updates.push(
            api.patch(`lubrication/sample-tests/${test.id}/`, {
              valor: value,
              unidad: test.prueba.unidad_medida,
              fecha_medicion: fechaMedicion,
              usuario_medicion: user.id,
              // CORREGIDO: Estado a "en_proceso" y completada en false
              estatus: 'en_proceso',
              completada: false
            })
          );
        }
      }

      if (updates.length === 0) {
        toast.info('No hay resultados para guardar');
        return;
      }

      await Promise.all(updates);
      toast.success(`✅ ${updates.length} resultados guardados correctamente`);
      
      // Actualizar el estado de las pruebas padre si tienen subpruebas con resultados
      await updateParentTestsStatus();
      
      router.push(`/muestras`);

    } catch (error) {
      console.error('❌ Error guardando resultados:', error);
      toast.error('Error al guardar resultados: ' + (error.response?.data?.message || error.response?.data || error.message));
    } finally {
      setSaving(false);
    }
  };

  // Función para actualizar el estado de las pruebas padre - CORREGIDA
  const updateParentTestsStatus = async () => {
    try {
      const parentUpdates = [];
      const parentTests = getMainTests().filter(test => hasSubTests(test.prueba.id));
      
      for (const parentTest of parentTests) {
        const subTests = getSubTests(parentTest.prueba.id);
        const hasSubTestResults = subTests.some(subTest => {
          const fieldName = `prueba_${subTest.id}`;
          const value = formData[fieldName];
          return value !== undefined && value !== null && value !== '';
        });
        
        // Si al menos una subprueba tiene resultado, actualizar el padre a "en_proceso"
        if (hasSubTestResults) {
          parentUpdates.push(
            api.patch(`lubrication/sample-tests/${parentTest.id}/`, {
              // CORREGIDO: Estado a "en_proceso" y completada en false
              estatus: 'en_proceso',
              completada: false
            })
          );
        }
      }
      
      if (parentUpdates.length > 0) {
        await Promise.all(parentUpdates);
        console.log('✅ Estados de pruebas padre actualizados a "en_proceso"');
      }
      
    } catch (error) {
      console.error('❌ Error actualizando pruebas padre:', error);
    }
  };

  // Renderizar una fila de prueba
  const renderTestRow = (test, level = 0, isSubTestParam = false) => {
    const fieldName = `prueba_${test.id}`;
    const currentValue = formData[fieldName];
    const hasResult = currentValue !== undefined && currentValue !== null && currentValue !== '';
    const hasSubTestsFlag = hasSubTests(test.prueba.id);
    const subTests = hasSubTestsFlag ? getSubTests(test.prueba.id) : [];
    const isExpanded = expandedTests.has(test.id);
    const hasSubResults = hasSubTestsFlag && hasSubTestResults(test.prueba.id);
    const subTestsCompleted = hasSubTestsFlag ? getSubTestCompletedCount(test.prueba.id) : 0;

    // Determinar el tipo de prueba
    const isParentTest = !test.prueba.is_subPrueba && hasSubTestsFlag;
    const isSubPrueba = test.prueba.is_subPrueba;
    const isIndividualTest = !test.prueba.is_subPrueba && !hasSubTestsFlag;

    // Determinar estado para mostrar
    const getStatusDisplay = () => {
      if (isParentTest) {
        if (subTestsCompleted === subTests.length) {
          return { icon: <CheckCircle size={16} className="text-green-500" />, text: 'En Proceso', color: 'text-green-400' };
        } else if (subTestsCompleted > 0) {
          return { icon: <AlertTriangle size={16} className="text-yellow-500" />, text: 'En Proceso', color: 'text-yellow-400' };
        } else {
          return { icon: <XCircle size={16} className="text-red-500" />, text: 'Pendiente', color: 'text-red-400' };
        }
      } else {
        if (hasResult) {
          return { icon: <CheckCircle size={16} className="text-green-500" />, text: 'En Proceso', color: 'text-green-400' };
        } else if (test.estatus === 'en_proceso') {
          return { icon: <AlertTriangle size={16} className="text-yellow-500" />, text: 'En Proceso', color: 'text-yellow-400' };
        } else {
          return { icon: <XCircle size={16} className="text-red-500" />, text: 'Pendiente', color: 'text-red-400' };
        }
      }
    };

    const status = getStatusDisplay();

    return (
      <React.Fragment key={test.id}>
        {/* Fila principal */}
        <tr className={`border-b border-[#444] hover:bg-[#2a2a2a] transition-colors ${level % 2 === 0 ? 'bg-[#292929]' : 'bg-[#2a2a2a]'}`}>
          <td className="px-6 py-4" style={{ paddingLeft: `${level * 24 + 24}px` }}>
            <div className="flex items-center gap-2">
              {isParentTest && (
                <button
                  onClick={() => toggleExpanded(test.id)}
                  className="text-[#d9d9d9] hover:text-white transition-colors"
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              <span className={`font-mono font-semibold ${
                isParentTest ? 'text-red-400' : 
                isSubPrueba ? 'text-blue-400' : 
                'text-green-400'
              }`}>
                {test.prueba.codigo}
              </span>
              {isParentTest && (
                <span className="text-xs text-[#888] bg-[#333] px-2 py-1 rounded">
                  Padre
                </span>
              )}
              {isSubPrueba && (
                <span className="text-xs text-[#888] bg-[#334] px-2 py-1 rounded">
                  Subprueba
                </span>
              )}
              {isIndividualTest && (
                <span className="text-xs text-[#888] bg-[#343] px-2 py-1 rounded">
                  Individual
                </span>
              )}
            </div>
          </td>
          
          <td className="px-6 py-4">
            <div>
              <div className="text-white font-medium">
                {test.prueba.nombre}
                {isParentTest && (
                  <span className="text-[#888] text-sm ml-2">
                    ({subTests.length} subpruebas)
                  </span>
                )}
              </div>
              {test.prueba.descripcion && (
                <div className="text-[#888] text-sm mt-1">
                  {test.prueba.descripcion}
                </div>
              )}
            </div>
          </td>
          
          <td className="px-6 py-4">
            {test.prueba.unidad_medida && (isSubPrueba || isIndividualTest) ? (
              <span className="text-[#d9d9d9] bg-[#333] px-2 py-1 rounded text-sm">
                {test.prueba.unidad_medida}
              </span>
            ) : (
              <span className="text-[#888] text-sm">-</span>
            )}
          </td>
          
          <td className="px-6 py-4">
            {isParentTest ? (
              <div className="text-[#888] text-sm italic">
                Prueba compuesta - ingrese valores en subpruebas
                {subTestsCompleted > 0 && (
                  <div className="text-green-400 text-xs mt-1">
                    {subTestsCompleted}/{subTests.length} subpruebas con datos
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type={test.prueba.unidad_medida ? 'number' : 'text'}
                  value={currentValue || ''}
                  onChange={(e) => handleInputChange(test.id, e.target.value)}
                  className="px-3 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder={`Ingrese resultado${test.prueba.unidad_medida ? ` en ${test.prueba.unidad_medida}` : ''}`}
                  min="0"
                  step="0.01"
                />
                {hasResult && (
                  <Edit3 size={16} className="text-green-500" />
                )}
              </div>
            )}
          </td>
          
          <td className="px-6 py-4">
            <div className="flex items-center gap-2">
              {status.icon}
              <span className={`${status.color} text-sm`}>
                {isParentTest && subTestsCompleted > 0 ? 
                  `${status.text} (${subTestsCompleted}/${subTests.length})` : 
                  status.text
                }
              </span>
            </div>
          </td>
        </tr>

        {/* Subpruebas */}
        {isParentTest && isExpanded && subTests.map(subTest => 
          renderTestRow(subTest, level + 1, true)
        )}
      </React.Fragment>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-[#292929] rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-[#292929] rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const mainTests = getMainTests();
  const individualTests = getIndividualTests();
  const completedCount = getCompletedCount();
  const totalInputTests = getTotalInputTests();

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
                <h1 className="text-2xl font-bold text-white">Ingreso de Resultados</h1>
                <p className="text-[#d9d9d9]">Muestra #{muestra}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#d9d9d9]">
                {tests.length} pruebas asignadas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-6xl mx-auto p-6">
        {tests.length > 0 ? (
          <>
            {/* Tabla de resultados */}
            <div className="bg-[#292929] rounded-lg border border-[#333] overflow-hidden mb-6">
              <div className="p-6 border-b border-[#444]">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <TestTube size={24} className="text-red-500" />
                  Resultados de Pruebas
                </h2>
                <p className="text-[#d9d9d9] mt-1">
                  Ingrese los resultados de las pruebas realizadas. Las pruebas compuestas (padres) muestran subpruebas donde se ingresan los datos reales.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#444] bg-[#333]">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                        Código
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                        Nombre de la Prueba
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                        Unidad
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                        Resultado
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mainTests.map(test => renderTestRow(test))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resumen y botones */}
            <div className="bg-[#292929] rounded-lg border border-[#333] p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Resumen</h3>
                  <div className="flex gap-6 text-sm">
                    <div className="text-[#d9d9d9]">
                      <span className="text-green-500 font-semibold">
                        {completedCount}
                      </span> resultados ingresados
                    </div>
                    <div className="text-[#d9d9d9]">
                      <span className="text-yellow-500 font-semibold">
                        {totalInputTests - completedCount}
                      </span> pendientes
                    </div>
                    <div className="text-[#d9d9d9]">
                      Total editables: <span className="font-semibold">{totalInputTests}</span>
                    </div>
                    <div className="text-[#d9d9d9]">
                      Individuales: <span className="font-semibold">{individualTests.length}</span>
                    </div>
                  </div>
                  <div className="text-xs text-[#888] mt-2">
                    * Estado actual: <span className="text-yellow-400">En Proceso</span> - Los resultados se guardan sin marcar como completados
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleBack}
                    className="px-6 py-3 border border-[#444] text-white rounded-lg hover:bg-[#333] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={onSubmit}
                    disabled={saving}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Guardar Resultados</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-[#292929] rounded-lg border border-[#333] p-8 text-center">
            <TestTube size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No hay pruebas asignadas
            </h3>
            <p className="text-[#d9d9d9] mb-4">
              No se encontraron pruebas asignadas para esta muestra.
            </p>
            <button
              onClick={handleBack}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Volver a la Muestra
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IngresoEnsayos;