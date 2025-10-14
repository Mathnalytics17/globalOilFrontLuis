import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../shared/context/AuthContext';
import { toast } from 'react-toastify';
import dynamic from 'next/dynamic';

// Importar ReactQuill de forma dinámica para evitar SSR
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div>Cargando editor...</div>
});

import 'react-quill/dist/quill.snow.css';

// Componente SignaturePad
const SignaturePad = ({ onSave, onClose }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL();
    onSave(signatureData);
  };

  return (
    <div className="bg-white p-6 rounded-lg w-96 max-w-[90vw]">
      <h3 className="text-lg font-bold mb-4">Firmar Documento</h3>
      <div className="border-2 border-gray-300 rounded-lg mb-4 bg-white">
        <canvas
          ref={canvasRef}
          width={350}
          height={200}
          className="w-full bg-white touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={(e) => {
            e.preventDefault();
            startDrawing(e.touches[0]);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            draw(e.touches[0]);
          }}
          onTouchEnd={endDrawing}
        />
      </div>
      <div className="flex flex-col sm:flex-row justify-between gap-2">
        <button
          onClick={clearSignature}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex-1"
        >
          Limpiar
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex-1"
        >
          Cancelar
        </button>
        <button
          onClick={saveSignature}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex-1"
        >
          Guardar Firma
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Firma en el área arriba. Funciona con mouse y pantallas táctiles.
      </p>
    </div>
  );
};

// Función para evaluar resultados con límites
const evaluateResult = (valor, limites) => {
  if (!limites || valor === null || valor === undefined || valor === '') {
    return { status: 'pending', comment: 'PENDIENTE' };
  }
  
  const numValor = parseFloat(valor);
  const isNumeric = !isNaN(numValor);

  if (!isNumeric && valor) {
    return { status: 'normal', comment: 'NORMAL' };
  }

  if (!isNumeric) {
    return { status: 'pending', comment: 'PENDIENTE' };
  }

  switch (limites.tipo) {
    case 'generico':
      return evaluateGenericLimit(numValor, limites);
    case 'viscosidad':
      return evaluateViscosityLimit(numValor, limites);
    case 'calidad':
      return evaluateQualityLimit(numValor, limites);
    case 'elemento_analisis':
      return evaluateElementAnalysis(numValor, limites);
    default:
      return { status: 'normal', comment: 'NORMAL' };
  }
};

const evaluateGenericLimit = (valor, limites) => {
  const { symbol_operation, valor: limiteValor } = limites;
  
  if (limiteValor === null || limiteValor === undefined) {
    return { status: 'normal', comment: 'NORMAL' };
  }

  const numLimite = parseFloat(limiteValor);
  if (isNaN(numLimite)) return { status: 'normal', comment: 'NORMAL' };

  switch (symbol_operation) {
    case '<': return valor < numLimite ? { status: 'normal', comment: 'NORMAL' } : { status: 'warning', comment: 'NO DESEADO' };
    case '<=': return valor <= numLimite ? { status: 'normal', comment: 'NORMAL' } : { status: 'warning', comment: 'NO DESEADO' };
    case '>': return valor > numLimite ? { status: 'normal', comment: 'NORMAL' } : { status: 'warning', comment: 'NO DESEADO' };
    case '>=': return valor >= numLimite ? { status: 'normal', comment: 'NORMAL' } : { status: 'warning', comment: 'NO DESEADO' };
    case '=': return valor === numLimite ? { status: 'normal', comment: 'NORMAL' } : { status: 'warning', comment: 'NO DESEADO' };
    default: return { status: 'normal', comment: 'NORMAL' };
  }
};

const evaluateViscosityLimit = (valor, limites) => {
  const { vmin, vmax } = limites;
  
  if (vmin !== null && vmax !== null) {
    const min = parseFloat(vmin);
    const max = parseFloat(vmax);
    
    if (!isNaN(min) && !isNaN(max)) {
      return valor >= min && valor <= max
        ? { status: 'normal', comment: 'NORMAL' }
        : { status: 'warning', comment: 'NO DESEADO' };
    }
  }
  
  return { status: 'normal', comment: 'NORMAL' };
};

const evaluateQualityLimit = (valor, limites) => {
  return { status: 'normal', comment: 'NORMAL' };
};

const evaluateElementAnalysis = (valor, limites) => {
  if (!limites || limites.valor === null || limites.valor === undefined) {
    return { status: 'normal', comment: 'NORMAL' };
  }

  const numValor = parseFloat(valor);
  const numLimite = parseFloat(limites.valor);
  
  if (isNaN(numValor) || isNaN(numLimite)) {
    return { status: 'pending', comment: 'PENDIENTE' };
  }

  const { symbol_operation } = limites;
  
  switch (symbol_operation) {
    case '<':
      return numValor < numLimite 
        ? { status: 'normal', comment: 'NORMAL' } 
        : { status: 'warning', comment: 'NO DESEADO' };
    case '<=':
      return numValor <= numLimite 
        ? { status: 'normal', comment: 'NORMAL' } 
        : { status: 'warning', comment: 'NO DESEADO' };
    case '>':
      return numValor > numLimite 
        ? { status: 'normal', comment: 'NORMAL' } 
        : { status: 'warning', comment: 'NO DESEADO' };
    case '>=':
      return numValor >= numLimite 
        ? { status: 'normal', comment: 'NORMAL' } 
        : { status: 'warning', comment: 'NO DESEADO' };
    case '=':
      return numValor === numLimite 
        ? { status: 'normal', comment: 'NORMAL' } 
        : { status: 'warning', comment: 'NO DESEADO' };
    default:
      return { status: 'normal', comment: 'NORMAL' };
  }
};

const AnalysisReport = () => {
  const router = useRouter();
  const { muestra } = router.query;
  const { api, user } = useAuth();
  const [sampleData, setSampleData] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLimits, setShowLimits] = useState(false);
  
  // Estados para contenido editable
  const [editedResults, setEditedResults] = useState({});
  const [editedComments, setEditedComments] = useState({});
  const [reportComments, setReportComments] = useState('');
  const [reportConclusions, setReportConclusions] = useState('');
  const [companyName, setCompanyName] = useState('Global Oil');
  const [responsibleName, setResponsibleName] = useState('Ing. Santiago Quintero');
  
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  
  // Estados para firma - AHORA SOLO USAMOS BASE64
  const [signature, setSignature] = useState(null);
  const [signaturePath, setSignaturePath] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Estados para comentarios automáticos
  const [autoComments, setAutoComments] = useState({});

  // Configuración de React Quill
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link'
  ];

  // Opciones para el desplegable de comentarios
  const commentOptions = [
    { value: 'NORMAL', label: 'NORMAL', color: 'bg-green-100 text-green-800' },
    { value: 'NO DESEADO', label: 'NO DESEADO', color: 'bg-red-100 text-red-800' },
    { value: 'PENDIENTE', label: 'PENDIENTE', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'REVISAR', label: 'REVISAR', color: 'bg-orange-100 text-orange-800' },
    { value: 'CRÍTICO', label: 'CRÍTICO', color: 'bg-purple-100 text-purple-800' }
  ];

  // NUEVA: Función para cargar firma en base64


  useEffect(() => {
    const fetchData = async () => {
      if (!muestra) return;
      
      try {
        // Obtener datos de la muestra
        const sampleResponse = await api.get(`lubrication/samples/${muestra}/`);
        setSampleData(sampleResponse.data);
        
        // Intentar obtener el reporte existente
        try {
          const reportResponse = await api.get(`lubrication/reports/?muestra=${muestra}`);
          if (reportResponse.data.length > 0) {
            const report = reportResponse.data[0];
            setReportData(report);
            setReportComments(report.comentarios || '');
            setReportConclusions(report.conclusiones || '');
            
            // Cargar el estado de límites desde el reporte
            setShowLimits(report.with_limites || false);
            
            // Cargar firma en base64 si existe
            if (report.firma_ruta) {
              // Intentar cargar desde el endpoint específico
          
              if  (report.firma_base64) {
                // Usar el base64 que viene en el reporte
                setSignature(report.firma_base64);
                setSignaturePath(report.firma_ruta);
              } else {
                // Fallback: usar la ruta normal
                setSignature(report.firma_ruta);
                setSignaturePath(report.firma_ruta);
              }
            } else {
              setSignature(null);
              setSignaturePath(null);
            }
          }
        } catch (error) {
          console.log('No se encontró reporte existente');
        }

        // Inicializar resultados editados y comentarios
        const initialResults = {};
        const initialComments = {};
        
        const allTests = [
          ...(sampleResponse.data.pruebas_estructuradas || []),
          ...(sampleResponse.data.resultados || [])
        ];

        allTests.forEach(test => {
          initialResults[test.id] = test.valor || '';
          initialComments[test.id] = test.observaciones || '';
        });

        setEditedResults(initialResults);
        setEditedComments(initialComments);

        // Calcular comentarios automáticos
        calculateAutoComments(sampleResponse.data, initialResults);
        
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [muestra, api]);

  // Función mejorada para calcular comentarios automáticos
  const calculateAutoComments = (data, currentResults = editedResults) => {
    const comments = {};
    
    const evaluateTestWithLimits = (test, value) => {
      if (test.prueba.limites) {
        const evaluation = evaluateResult(value, test.prueba.limites);
        return evaluation.comment;
      }
      return test.completada ? 'NORMAL' : 'PENDIENTE';
    };
    
    data.pruebas_estructuradas?.forEach(prueba => {
      const valor = currentResults[prueba.id] ?? prueba.valor;
      comments[prueba.id] = evaluateTestWithLimits(prueba, valor);
      
      prueba.subpruebas?.forEach(subprueba => {
        const subValor = currentResults[subprueba.id] ?? subprueba.valor;
        comments[subprueba.id] = evaluateTestWithLimits(subprueba, subValor);
      });
    });

    data.resultados?.forEach(resultado => {
      const valor = currentResults[resultado.id] ?? resultado.valor;
      comments[resultado.id] = evaluateTestWithLimits(resultado, valor);
    });

    setAutoComments(comments);
  };

  useEffect(() => {
    if (sampleData) {
      calculateAutoComments(sampleData);
    }
  }, [editedResults, sampleData]);

  // Guardar resultados en sample-tests
  const saveResults = async () => {
    setSaving(true);
    try {
      const updatePromises = [];
      
      const allTests = [
        ...(sampleData.pruebas_estructuradas || []),
        ...(sampleData.resultados || [])
      ];

      allTests.forEach(test => {
        const testId = test.id;
        const updateData = {
          valor: editedResults[testId] || test.valor,
          observaciones: editedComments[testId] || test.observaciones
        };

        if (updateData.valor !== test.valor || updateData.observaciones !== test.observaciones) {
          updatePromises.push(
            api.patch(`lubrication/sample-tests/${testId}/`, updateData)
          );
        }
      });

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        toast.success('Resultados guardados exitosamente');
      }

      // Recargar datos
      const response = await api.get(`lubrication/samples/${muestra}/`);
      setSampleData(response.data);
      
    } catch (error) {
      console.error('Error saving results:', error);
      toast.error('Error al guardar resultados: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  // Función para guardar la firma físicamente
  const saveSignatureToFile = async (signatureData) => {
    try {
      // signatureData ya viene en base64 del SignaturePad
      let blob;
      if (signatureData.startsWith('data:')) {
        const response = await fetch(signatureData);
        blob = await response.blob();
      } else {
        // Si es otra cosa, manejar según corresponda
        const response = await fetch(signatureData);
        blob = await response.blob();
      }
      
      const formData = new FormData();
      const fileName = `firma_${muestra}_${Date.now()}.png`;
      formData.append('file', blob, fileName);
      formData.append('folder', 'firmas');
      
      const uploadResponse = await api.post('upload/signature/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return uploadResponse.data.filePath;
      
    } catch (error) {
      console.error('Error guardando firma:', error);
      throw error;
    }
  };

  // Modificar handleSaveSignature
  const handleSaveSignature = async (signatureData) => {
    try {
      // Guardar firma físicamente y obtener ruta
      const signatureFilePath = await saveSignatureToFile(signatureData);
      
      // Actualizar estados - signatureData ya es base64
      setSignature(signatureData); // Mantenemos el base64 para mostrar
      setSignaturePath(signatureFilePath); // Guardamos la ruta para la BD
      
      setShowSignatureModal(false);
      toast.success('Firma guardada correctamente');
    } catch (error) {
      console.error('Error al guardar la firma:', error);
      toast.error('Error al guardar la firma');
    }
  };

  // Guardar metadata del reporte
  const saveReportMetadata = async () => {
    try {
      const reportPayload = {
        muestra: muestra,
        comentarios: reportComments,
        conclusiones: reportConclusions,
        responsable: responsibleName,
        empresa: companyName,
        firma_ruta: signaturePath, // Guardamos la ruta del archivo
        with_limites: showLimits,
        usuario_emision: user?.id
      };

      console.log('Guardando reporte con payload:', reportPayload);

      if (reportData && reportData?.id) {
        // Actualizar reporte existente
        await api.patch(`lubrication/reports/${reportData.id}/`, reportPayload);
        toast.success('Reporte actualizado exitosamente');
      } else {
        // Crear nuevo reporte
        const newReport = await api.post('lubrication/reports/', {
          ...reportPayload,
          consecutivo: `R${new Date().getFullYear()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          fecha_emision: new Date().toISOString()
        });
        setReportData(newReport.data);
        toast.success('Reporte creado exitosamente');
      }

    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Error al guardar el reporte: ' + (error.response?.data?.message || error.message));
    }
  };

  // Función para activar/desactivar límites
  const toggleLimits = async () => {
    const newShowLimits = !showLimits;
    setShowLimits(newShowLimits);
    
    // Actualizar inmediatamente en la base de datos
    if (reportData?.id) {
      try {
        await api.patch(`lubrication/reports/${reportData.id}/`, {
          with_limites: newShowLimits
        });
        toast.success(`Límites ${newShowLimits ? 'activados' : 'desactivados'}`);
      } catch (error) {
        console.error('Error actualizando límites:', error);
        toast.error('Error al actualizar límites');
        // Revertir el cambio si hay error
        setShowLimits(!newShowLimits);
      }
    }
  };

  const handleSaveAll = async () => {
    await saveResults();
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
    if (sampleData) {
      const originalResults = {};
      const originalComments = {};
      
      const allTests = [
        ...(sampleData.pruebas_estructuradas || []),
        ...(sampleData.resultados || [])
      ];

      allTests.forEach(test => {
        originalResults[test.id] = test.valor || '';
        originalComments[test.id] = test.observaciones || '';
      });
      
      setEditedResults(originalResults);
      setEditedComments(originalComments);
    }
  };

  const handleResultChange = (pruebaId, newValue) => {
    setEditedResults(prev => ({
      ...prev,
      [pruebaId]: newValue
    }));
  };

  const handleCommentChange = (pruebaId, newComment) => {
    setEditedComments(prev => ({
      ...prev,
      [pruebaId]: newComment
    }));
  };

  // Función para formatear límites
  const formatLimits = (limites) => {
    if (!showLimits || !limites) return '-';
    
    switch (limites.tipo) {
      case 'generico':
        return `${limites.symbol_operation || ''} ${limites.valor !== null ? limites.valor : ''}`.trim();
      case 'viscosidad':
        if (limites.vmin !== null && limites.vmax !== null) {
          return `${limites.vmin} - ${limites.vmax}`;
        }
        return '-';
      case 'calidad':
        const parts = [];
        if (limites.c1) parts.push(`C1: ${limites.c1}`);
        if (limites.c2) parts.push(`C2: ${limites.c2}`);
        return parts.length > 0 ? parts.join(', ') : '-';
      case 'elemento_analisis':
        return `${limites.symbol_operation || ''} ${limites.valor !== null ? limites.valor : ''}`.trim();
      default:
        return '-';
    }
  };

  // Funciones para manejar la firma
  const handleOpenSignatureModal = () => {
    setShowSignatureModal(true);
  };

  const handleCloseSignatureModal = () => {
    setShowSignatureModal(false);
  };

  const handleRemoveSignature = () => {
    setSignature(null);
    setSignaturePath(null);
    toast.info('Firma eliminada');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Función para ver/generar PDF
  const handleViewPDF = async () => {
    try {
      setGeneratingPDF(true);
      
      // Llamar al endpoint para generar el PDF
      const response = await api.get(`lubrication/reports/imprimir_reporte/?pdf=${muestra}`);
      
      if (response.data.error) {
        toast.error('Error generando PDF: ' + response.data.message);
        return;
      }

      // Convertir base64 a Blob
      const pdfBase64 = response.data.pdf;
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      // Crear URL para el PDF
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      
      // Abrir en nueva pestaña
      window.open(url, '_blank');
      
      toast.success('PDF generado exitosamente');
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.error('Error al generar el PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="w-full max-w-[8.5in] mx-auto p-8 border border-black text-[11px] font-sans bg-white">
      {/* Modal para firma */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <SignaturePad 
            onSave={handleSaveSignature}
            onClose={handleCloseSignatureModal}
          />
        </div>
      )}

      {/* Header con controles de edición */}
      <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-lg border">
        <h2 className="text-lg font-bold text-gray-800">
          Reporte de Análisis - Muestra {muestra}
        </h2>
        
        <div className="flex gap-2 items-center">
          {/* Botón para activar/desactivar límites */}
          <button
            onClick={toggleLimits}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showLimits 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {showLimits ? 'Desactivar Límites' : 'Activar Límites'}
          </button>
          
          <button
            onClick={() => saveReportMetadata()}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Guardar Reporte
          </button>

          <button
            onClick={handleViewPDF}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Ver PDF
          </button>
          
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modo Edición
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Guardar Todo
              </button>

              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Encabezado del reporte */}
      <div className="grid grid-cols-[250px_1fr_110px_190px] h-[110px] border border-black">
        {/* Columna izquierda (logo y texto) */}
        <div className="border-r border-black grid grid-rows-2 h-full">
          <div className="flex items-center justify-center border-b border-black">
            <img src="/logo-globaloil.jpg" alt="Logo Global Oil" className="h-[45px] object-contain" />
          </div>
          <div className="flex flex-col justify-center text-center leading-[0.9] px-1 space-y-0">
            <p className="text-[9px]">NIT: 830135980-4</p>
            <p className="text-[9px]">Parque Industrial Ciem Oikos de Occidente</p>
            <p className="text-[9px]">Autopista Bogotá - Medellín</p>
            <p className="text-[9px]">KM 2.5 Vía a Parcelas 900 Mts - Bodega K172</p>
          </div>
        </div>

        {/* Columna central (Título) */}
        <div className="border-r border-black flex items-center justify-center">
          <h1 className="text-[16px] font-semibold underline">ORDEN DE ANÁLISIS</h1>
        </div>

        {/* Columna con ícono */}
        <div className="border-r border-black flex items-center justify-center">
          <img src="/icon-report.png" alt="Icono" className="h-[70px] object-contain" />
        </div>

        {/* Columna derecha (cuadro de orden y fecha) */}
        <div className="grid grid-rows-[1fr_1fr] h-full">
          <div className="flex flex-col border-b border-black">
            <div className="border-b border-black text-center text-[10px] font-semibold py-1">
              Orden de Análisis N°
            </div>
            <div className="flex-1 flex items-center justify-center text-[13px] font-bold">
              {reportData?.consecutivo || '091-2025'}
            </div>
          </div>
          <div className="flex flex-col">
            <div className="border-b border-black text-center text-[10px] font-semibold py-1">
              Fecha:
            </div>
            <div className="flex-1 flex items-center justify-center text-[13px] font-bold">
              {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Información de la muestra */}
      <div className="w-full mt-4">
        <table className="w-full border-collapse border border-black text-[11px]">
          <tbody>
            <tr>
              <td className="border border-black p-1 font-semibold bg-gray-100 w-[180px]">Fecha de Toma de Muestra:</td>
              <td className="border border-black p-1 w-[200px]">
                {sampleData?.fecha_toma ? new Date(sampleData.fecha_toma).toLocaleDateString() : '03/05/2025'}
              </td>
              <td className="border border-black p-1 font-semibold bg-gray-100 w-[150px]">Periodo de Servicio:</td>
              <td className="border border-black p-1">{sampleData?.periodo_servicio_aceite || 'N/A'}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 font-semibold bg-gray-100">Lubricante:</td>
              <td className="border border-black p-1">{sampleData?.lubricante?.nombre_comercial || 'N/A'}</td>
              <td className="border border-black p-1 font-semibold bg-gray-100">Equipo:</td>
              <td className="border border-black p-1">{sampleData?.referencia_equipo_info?.nombre || 'N/A'}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 font-semibold bg-gray-100">Cliente:</td>
              <td className="border border-black p-1">N/A</td>
              <td className="border border-black p-1 font-semibold bg-gray-100">Placa:</td>
              <td className="border border-black p-1">{sampleData?.equipo_placa || 'N/A'}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 font-semibold bg-gray-100">Contacto:</td>
              <td className="border border-black p-1">{sampleData?.contacto_cliente || 'N/A'}</td>
              <td className="border border-black p-1 font-semibold bg-gray-100">Periodo de Servicio Equipo:</td>
              <td className="border border-black p-1">{sampleData?.periodo_servicio_equipo || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tabla de resultados */}
      <div className="w-full mt-4">
        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 font-semibold text-left w-[220px]">ANÁLISIS</th>
              <th className="border border-black p-1 font-semibold text-center w-[110px]">MÉTODO</th>
              <th className="border border-black p-1 font-semibold text-center w-[80px]">RESULTADO</th>
              <th className="border border-black p-1 font-semibold text-center w-[70px]">UNIDADES</th>
              <th className="border border-black p-1 font-semibold text-center w-[100px]">LÍMITE</th>
              <th className="border border-black p-1 font-semibold text-center w-[100px]">COMENTARIO</th>
            </tr>
          </thead>
          <tbody>
            {sampleData?.pruebas_estructuradas.map((prueba) => (
              <React.Fragment key={prueba.id}>
                {/* Pruebas individuales (sin subpruebas) */}
                {prueba.subpruebas.length === 0 ? (
                  <tr>
                    <td className="border border-black p-1">
                      {prueba.prueba.nombre}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {prueba.prueba.metodo_referencia || '-'}
                    </td>
                    <td className="border border-black p-1 text-center">
                     {editing ? (
  <input
    type="text"
    value={editedResults[prueba.id] ?? ''}
    onChange={(e) => handleResultChange(prueba.id, e.target.value)}
    className="w-16 px-1 py-0.5 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
    placeholder="-"
  />
) : (
  <span>{prueba.valor || '-'}</span>
)}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {prueba.prueba.unidad_medida || '-'}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {formatLimits(prueba.prueba.limites)}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {editing ? (
                        <select
                          value={editedComments[prueba.id] || autoComments[prueba.id] || (prueba.completada ? 'NORMAL' : 'PENDIENTE')}
                          onChange={(e) => handleCommentChange(prueba.id, e.target.value)}
                          className={`w-full text-center p-1 rounded border ${
                            commentOptions.find(opt => opt.value === (editedComments[prueba.id] || autoComments[prueba.id] || (prueba.completada ? 'NORMAL' : 'PENDIENTE')))?.color || 'bg-gray-100'
                          }`}
                        >
                          {commentOptions.map(option => (
                            <option key={option.value} value={option.value} className={option.color}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-block px-2 py-1 rounded ${
                          commentOptions.find(opt => opt.value === (editedComments[prueba.id] || autoComments[prueba.id] || (prueba.completada ? 'NORMAL' : 'PENDIENTE')))?.color || 'bg-gray-100'
                        }`}>
                          {editedComments[prueba.id] || autoComments[prueba.id] || (prueba.completada ? 'NORMAL' : 'PENDIENTE')}
                        </span>
                      )}
                    </td>
                  </tr>
                ) : (
                  // Prueba padre con subpruebas
                  <tr>
                    <td className="border border-black p-1 font-semibold align-top">
                      {prueba.prueba.nombre}
                    </td>
                    
                    <td className="border border-black p-1 text-center align-top">
                      {prueba.prueba.metodo_referencia || '-'}
                    </td>
                    
                    {/* COLUMNA DE RESULTADOS - Subpruebas */}
                    <td className="border border-black p-0 align-top">
                      <div className="flex flex-col">
                        {prueba.subpruebas.map((subprueba, index) => (
                          <div key={subprueba.id} className={`flex items-center justify-center p-1 ${index < prueba.subpruebas.length - 1 ? 'border-b border-gray-300' : ''}`}>
                           {editing ? (
  <input
    type="text"
    value={editedResults[subprueba.id] ?? ''}
    onChange={(e) => handleResultChange(subprueba.id, e.target.value)}
    className="w-14 px-1 py-0.5 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
    placeholder="-"
  />
) : (
  <span>{subprueba.valor || '-'}</span>
)}
                          </div>
                        ))}
                      </div>
                    </td>
                    
                    {/* COLUMNA DE UNIDADES - Subpruebas */}
                    <td className="border border-black p-0 align-top">
                      <div className="flex flex-col">
                        {prueba.subpruebas.map((subprueba, index) => (
                          <div key={subprueba.id} className={`p-1 text-center ${index < prueba.subpruebas.length - 1 ? 'border-b border-gray-300' : ''}`}>
                            {subprueba.prueba.unidad_medida || '-'}
                          </div>
                        ))}
                      </div>
                    </td>
                    
                    {/* COLUMNA DE LÍMITES - Subpruebas */}
                    <td className="border border-black p-0 align-top">
                      <div className="flex flex-col">
                        {prueba.subpruebas.map((subprueba, index) => (
                          <div key={subprueba.id} className={`p-1 text-center ${index < prueba.subpruebas.length - 1 ? 'border-b border-gray-300' : ''}`}>
                            {formatLimits(subprueba.prueba.limites)}
                          </div>
                        ))}
                      </div>
                    </td>
                    
                    {/* COLUMNA DE COMENTARIOS - Subpruebas */}
                    <td className="border border-black p-0 align-top">
                      <div className="flex flex-col">
                        {prueba.subpruebas.map((subprueba, index) => (
                          <div key={subprueba.id} className={`p-1 text-center ${index < prueba.subpruebas.length - 1 ? 'border-b border-gray-300' : ''}`}>
                            {editing ? (
                              <select
                                value={editedComments[subprueba.id] || autoComments[subprueba.id] || (subprueba.completada ? 'NORMAL' : 'PENDIENTE')}
                                onChange={(e) => handleCommentChange(subprueba.id, e.target.value)}
                                className={`w-full text-center p-1 rounded border ${
                                  commentOptions.find(opt => opt.value === (editedComments[subprueba.id] || autoComments[subprueba.id] || (subprueba.completada ? 'NORMAL' : 'PENDIENTE')))?.color || 'bg-gray-100'
                                }`}
                              >
                                {commentOptions.map(option => (
                                  <option key={option.value} value={option.value} className={option.color}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className={`inline-block px-2 py-1 rounded ${
                                commentOptions.find(opt => opt.value === (editedComments[subprueba.id] || autoComments[subprueba.id] || (subprueba.completada ? 'NORMAL' : 'PENDIENTE')))?.color || 'bg-gray-100'
                              }`}>
                                {editedComments[subprueba.id] || autoComments[subprueba.id] || (subprueba.completada ? 'NORMAL' : 'PENDIENTE')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            
            {/* Pruebas individuales adicionales */}
            {sampleData?.resultados
              .filter(resultado => 
                !sampleData.pruebas_estructuradas.some(p => 
                  p.id === resultado.id || 
                  (p.subpruebas && p.subpruebas.some(sp => sp.id === resultado.id))
                )
              )
              .map((resultado) => (
                <tr key={resultado.id}>
                  <td className="border border-black p-1">
                    {resultado.prueba.nombre}
                  </td>
                  <td className="border border-black p-1 text-center">
                    {resultado.prueba.metodo_referencia || '-'}
                  </td>
                  <td className="border border-black p-1 text-center">
                    {editing ? (
                      <input
                        type="text"
                        value={editedResults[resultado.id] || resultado.valor || ''}
                        onChange={(e) => handleResultChange(resultado.id, e.target.value)}
                        className="w-16 px-1 py-0.5 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      resultado.valor || '-'
                    )}
                  </td>
                  <td className="border border-black p-1 text-center">
                    {resultado.prueba.unidad_medida || '-'}
                  </td>
                  <td className="border border-black p-1 text-center">
                    {formatLimits(resultado.prueba.limites)}
                  </td>
                  <td className="border border-black p-1 text-center">
                    {editing ? (
                      <select
                        value={editedComments[resultado.id] || autoComments[resultado.id] || (resultado.completada ? 'NORMAL' : 'PENDIENTE')}
                        onChange={(e) => handleCommentChange(resultado.id, e.target.value)}
                        className={`w-full text-center p-1 rounded border ${
                          commentOptions.find(opt => opt.value === (editedComments[resultado.id] || autoComments[resultado.id] || (resultado.completada ? 'NORMAL' : 'PENDIENTE')))?.color || 'bg-gray-100'
                        }`}
                      >
                        {commentOptions.map(option => (
                          <option key={option.value} value={option.value} className={option.color}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-block px-2 py-1 rounded ${
                        commentOptions.find(opt => opt.value === (editedComments[resultado.id] || autoComments[resultado.id] || (resultado.completada ? 'NORMAL' : 'PENDIENTE')))?.color || 'bg-gray-100'
                      }`}>
                        {editedComments[resultado.id] || autoComments[resultado.id] || (resultado.completada ? 'NORMAL' : 'PENDIENTE')}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Secciones editables: Comentarios y Conclusiones */}
      <div className="w-full mt-6">
        {/* Comentarios */}
        <div className="mb-4">
          <div className="font-semibold text-center mb-1">Comentarios del Reporte</div>
          {editing ? (
            <ReactQuill
              value={reportComments}
              onChange={setReportComments}
              modules={quillModules}
              formats={quillFormats}
              theme="snow"
              style={{ 
                height: '120px',
                fontSize: '11px'
              }}
            />
          ) : (
            <div 
              className="border border-black min-h-[120px] p-3 text-[11px] rounded"
              dangerouslySetInnerHTML={{ __html: reportComments || 'No hay comentarios registrados' }}
            />
          )}
        </div>

        {/* Conclusiones y Firma */}
        <div className="grid grid-cols-2 gap-4">
          {/* Conclusiones */}
          <div>
            <div className="font-semibold text-center mb-1">Conclusiones del Reporte</div>
            {editing ? (
              <ReactQuill
                value={reportConclusions}
                onChange={setReportConclusions}
                modules={quillModules}
                formats={quillFormats}
                theme="snow"
                style={{ 
                  height: '150px',
                  fontSize: '11px'
                }}
              />
            ) : (
              <div 
                className="border border-black min-h-[150px] p-3 text-[11px] rounded"
                dangerouslySetInnerHTML={{ __html: reportConclusions || 'No hay conclusiones registradas' }}
              />
            )}
          </div>

          {/* Firma */}
          <div>
     
     <div className="font-semibold text-center mb-1">Firma</div>
        <div className="border border-black min-h-[150px] p-3 text-[11px] flex flex-col items-center justify-end rounded">
          {editing ? (
            <div className="w-full space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre del Responsable
                </label>
                <input
                  type="text"
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Empresa
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              {/* Controles de firma digital */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleOpenSignatureModal}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs flex items-center justify-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  {signature ? 'Cambiar Firma' : 'Agregar Firma'}
                </button>
                
                {signature && (
                  <button
                    type="button"
                    onClick={handleRemoveSignature}
                    className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-xs flex items-center justify-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center w-full">
              <div className="mb-4">
                <div className="font-semibold mb-1">RESPONSABLE</div>
                <div>{responsibleName}</div>
                <div className="text-xs text-gray-600">{companyName}</div>
              </div>
              
              {/* Mostrar firma digital si existe - AHORA USA BASE64 DIRECTAMENTE */}
              {signature ? (
                <div className="mb-2">
                  <img 
                    src={signature}  // Esto ya es base64, se renderiza directamente
                    alt="Firma digital" 
                    className="h-16 mx-auto border-b-2 border-gray-400"
                    onError={(e) => {
                      console.error('Error loading signature from base64');
                      
                    }}
                  />
                  <div className="text-xs text-gray-500 mt-1">Firma digital</div>
                </div>
              ) : (
                <div className="w-full border-t border-black mt-2 pt-8 text-center text-gray-500">
                  Firma
                </div>
              )}
            </div>
          )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisReport;