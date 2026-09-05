import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../shared/context/AuthContext';
import { samplesService } from '@features/samples/infrastructure/samplesService';
import { reportsService } from '@features/reports/infrastructure/reportsService';
import { isCompanyAdmin, isGlobalUser } from '@features/auth/application/sessionAccess';

const DocumentsList = () => {
  const router = useRouter();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [approvedSamples, setApprovedSamples] = useState([]);
  const [generatedReports, setGeneratedReports] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  // Verificar si el usuario actual tiene permisos para enviar reportes
  const canSendReport = Boolean(user) && isGlobalUser(user);

  // Cargar muestras aprobadas
  const loadApprovedSamples = async () => {
    try {
      setLoadingSamples(true);
      const data = await samplesService.list();
      const approved = data.filter(sample => sample.is_revisado === true);
      setApprovedSamples(approved);
    } catch (error) {
      setApprovedSamples([]);
    } finally {
      setLoadingSamples(false);
    }
  };

  // Cargar reportes generados
  const loadGeneratedReports = async () => {
    try {
      setLoadingReports(true);
      const data = await reportsService.list();
      setGeneratedReports(data);
    } catch (error) {
      setGeneratedReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  // CORREGIDO: Filtrar muestras que NO tienen reporte
  const getSamplesWithoutReport = () => {
    const sampleIdsWithReport = generatedReports.map(report => 
      typeof report.muestra === 'object' ? report.muestra.id : report.muestra
    );
    
    return approvedSamples.filter(sample => 
      !sampleIdsWithReport.includes(sample.id)
    );
  };

  // CORREGIDO: Filtrar muestras que SÍ tienen reporte
  const getSamplesWithReport = () => {
    const sampleIdsWithReport = generatedReports.map(report => 
      typeof report.muestra === 'object' ? report.muestra.id : report.muestra
    );
    
    return approvedSamples.filter(sample => 
      sampleIdsWithReport.includes(sample.id)
    );
  };

  // CORREGIDO: Obtener reporte por ID de muestra
  const getReportBySampleId = (sampleId) => {
    return generatedReports.find(report => {
      const reportSampleId = typeof report.muestra === 'object' ? report.muestra.id : report.muestra;
      return reportSampleId === sampleId;
    });
  };

  // NUEVA FUNCIÓN: Enviar reporte
  const handleSendReport = async (report) => {
    if (!canSendReport) {
      alert('No tienes permisos para enviar reportes');
      return;
    }

    try {
      setSendingReport(true);
      
      // Obtener los usuarios ADMIN/GLOBAL de la empresa asociada
      const adminUsers = [];
      
      // Buscar en la muestra asociada al reporte
      const sampleId = typeof report.muestra === 'object' ? report.muestra.id : report.muestra;
      const sample = approvedSamples.find(s => s.id === sampleId);
      
      if (sample && sample.referencia_equipo_info && sample.referencia_equipo_info.empresa_info) {
        const empresaInfo = sample.referencia_equipo_info.empresa_info;
        
        // Filtrar usuarios con rol ADMIN o GLOBAL
        if (empresaInfo.usuarios) {
          adminUsers.push(...empresaInfo.usuarios.filter((u) => isCompanyAdmin(u) || isGlobalUser(u)));
        }
      }

      if (adminUsers.length === 0) {
        alert('No se encontraron usuarios ADMIN o GLOBAL para enviar el reporte');
        return;
      }

      // Aquí iría la lógica real para enviar el reporte
      // Por ahora simulamos el envío
      // Simular envío
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`Reporte enviado exitosamente a ${adminUsers.length} usuario(s)`);
      
    } catch (error) {
      alert('Error al enviar el reporte');
    } finally {
      setSendingReport(false);
    }
  };

  // Abrir modal de detalles del reporte
  const openReportDetails = (report) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  // Cerrar modal
  const closeReportModal = () => {
    setShowReportModal(false);
    setSelectedReport(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([
        loadApprovedSamples(),
        loadGeneratedReports()
      ]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const samplesWithoutReport = getSamplesWithoutReport();
  const samplesWithReport = getSamplesWithReport();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="text-white mt-4">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Modal para detalles del reporte */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white">
                Detalles del Reporte
              </h3>
              <button
                onClick={closeReportModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-400">Consecutivo</label>
                  <p className="text-white font-semibold">{selectedReport.consecutivo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Estado</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedReport.estatus === 'aprobado' 
                      ? 'bg-green-600 text-white' 
                      : selectedReport.estatus === 'pendiente_aprobacion'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-600 text-white'
                  }`}>
                    {selectedReport.estatus || 'borrador'}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Fecha Emisión</label>
                  <p className="text-white">
                    {selectedReport.fecha_emision ? new Date(selectedReport.fecha_emision).toLocaleDateString() : 'No especificada'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Muestra</label>
                  <p className="text-white">
                    {typeof selectedReport.muestra === 'object' ? selectedReport.muestra.id : selectedReport.muestra}
                  </p>
                </div>
              </div>

              {selectedReport.responsable && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-400">Responsable</label>
                  <p className="text-white">{selectedReport.responsable}</p>
                </div>
              )}

              {selectedReport.empresa && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-400">Empresa</label>
                  <p className="text-white">{selectedReport.empresa}</p>
                </div>
              )}

              {selectedReport.comentarios && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-400">Comentarios</label>
                  <div 
                    className="text-white bg-[#292929] p-3 rounded border border-gray-700 mt-1"
                    dangerouslySetInnerHTML={{ __html: selectedReport.comentarios }}
                  />
                </div>
              )}

              {selectedReport.conclusiones && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-400">Conclusiones</label>
                  <div 
                    className="text-white bg-[#292929] p-3 rounded border border-gray-700 mt-1"
                    dangerouslySetInnerHTML={{ __html: selectedReport.conclusiones }}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                {/* NUEVO: Botón Enviar Reporte (solo para ADMIN/GLOBAL) */}
                {canSendReport && (
                  <button
                    onClick={() => handleSendReport(selectedReport)}
                    disabled={sendingReport}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sendingReport ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Enviar Reporte
                      </>
                    )}
                  </button>
                )}
                
                <button
                  onClick={() => {
                    const sampleId = typeof selectedReport.muestra === 'object' 
                      ? selectedReport.muestra.id 
                      : selectedReport.muestra;
                    router.push(`/documents-list/template-report?muestra=${sampleId}`);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  Editar Reporte
                </button>
                <button
                  onClick={closeReportModal}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Reportes de Análisis
          </h1>
          <p className="text-gray-400">
            Gestiona y genera reportes de muestras revisadas
            {canSendReport && (
              <span className="ml-2 text-green-400 text-sm">
                • Permisos de envío activos
              </span>
            )}
          </p>
        </div>

        {/* Pestañas */}
        <div className="bg-[#292929] rounded-lg mb-6 border border-gray-700">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab(0)}
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === 0 
                  ? 'text-white border-b-2 border-red-600' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>Generar Reportes</span>
                {samplesWithoutReport.length > 0 && (
                  <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                    {samplesWithoutReport.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab(1)}
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === 1 
                  ? 'text-white border-b-2 border-red-600' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>Reportes Generados</span>
                {samplesWithReport.length > 0 && (
                  <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded-full">
                    {samplesWithReport.length}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Contenido de las pestañas */}
          <div className="p-6">
            {/* Pestaña 1: Generar Reportes (solo muestras SIN reporte) */}
            {activeTab === 0 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Muestras Revisadas Sin Reporte
                  </h2>
                  <p className="text-gray-400">
                    Selecciona una muestra para generar su reporte
                  </p>
                </div>

                {loadingSamples ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                    <p className="text-gray-400 mt-2">Cargando muestras...</p>
                  </div>
                ) : samplesWithoutReport.length > 0 ? (
                  <div className="overflow-hidden border border-gray-700 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-[#1a1a1a]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                            Código Muestra
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                            Lubricante
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                            Equipo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                            Fecha Toma
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-[#292929] divide-y divide-gray-700">
                        {samplesWithoutReport.map((sample) => (
                          <tr key={sample.id} className="hover:bg-[#333333]">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-white font-bold">{sample.id}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-gray-300">
                                {sample.referencia_marca || 'No especificado'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-gray-300">
                                {sample.referencia_equipo_info?.nombre || 'No especificado'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-gray-300">
                                {sample.fecha_toma ? new Date(sample.fecha_toma).toLocaleDateString() : 'No especificada'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => router.push(`/documents-list/template-report?muestra=${sample.id}`)}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                              >
                                Generar Reporte
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
                    <div className="text-gray-500 text-6xl mb-4">📋</div>
                    <h3 className="text-lg font-medium text-gray-400 mb-2">
                      No hay muestras sin reporte
                    </h3>
                    <p className="text-gray-500">
                      Todas las muestras aprobadas ya tienen reporte generado
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Pestaña 2: Reportes Generados (solo muestras CON reporte) */}
            {activeTab === 1 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Reportes Generados
                  </h2>
                  <p className="text-gray-400">
                    Lista de reportes creados en el sistema
                  </p>
                </div>

                {loadingReports ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                    <p className="text-gray-400 mt-2">Cargando reportes...</p>
                  </div>
                ) : samplesWithReport.length > 0 ? (
                  <div className="overflow-hidden border border-gray-700 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-[#1a1a1a]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                            Consecutivo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                            Muestra
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                            Fecha Emisión
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                            Estado
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-[#292929] divide-y divide-gray-700">
                        {generatedReports.map((report) => {
                          const sampleId = typeof report.muestra === 'object' 
                            ? report.muestra.id 
                            : report.muestra;
                          
                          const sample = samplesWithReport.find(s => s.id === sampleId);
                          
                          return (
                            <tr key={report.id} className="hover:bg-[#333333]">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-white font-bold">{report.consecutivo}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <span className="text-white font-bold">#{sampleId}</span>
                                  {sample && (
                                    <div className="text-xs text-gray-400">
                                      {sample.referencia_marca || 'Sin referencia'} - {sample.referencia_equipo_info?.nombre}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-gray-300">
                                  {report.fecha_emision ? new Date(report.fecha_emision).toLocaleDateString() : 'No especificada'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  report.estatus === 'aprobado' 
                                    ? 'bg-green-600 text-white' 
                                    : report.estatus === 'pendiente_aprobacion'
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-gray-600 text-white'
                                }`}>
                                  {report.estatus || 'borrador'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  onClick={() => openReportDetails(report)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors mr-2"
                                >
                                  Ver Detalles
                                </button>
                                <button
                                  onClick={() => router.push(`/documents-list/template-report?muestra=${sampleId}`)}
                                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                                >
                                  Editar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
                    <div className="text-gray-500 text-6xl mb-4">📄</div>
                    <h3 className="text-lg font-medium text-gray-400 mb-2">
                      No hay reportes generados
                    </h3>
                    <p className="text-gray-500">
                      Los reportes aparecerán aquí una vez que sean creados
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsList;
