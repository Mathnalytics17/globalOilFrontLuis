import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { 
  Box, Typography, Table, TableBody, TableCell, TableRow, Paper, 
  TextField, Button, Divider, Dialog, DialogActions, 
  DialogContent, DialogTitle, CircularProgress, IconButton, Chip,
  Select, MenuItem, FormControl, InputLabel, Grid, Tabs, Tab
} from '@mui/material';
import { Edit, Save, Close, PictureAsPdf, ArrowBack } from '@mui/icons-material';
import { useAuth } from '../../../shared/context/AuthContext';
import { toast } from 'react-toastify';
import TextEditor from '../../../shared/components/blockAdvancedText';

const SignaturePad = ({ onSave }) => {
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

  return (
    <Box>
      <canvas
        ref={canvasRef}
        width={500}
        height={200}
        style={{ border: '1px solid #000' }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
      />
      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Button onClick={clearSignature}>Limpiar</Button>
        <Button 
          variant="contained" 
          onClick={() => onSave(canvasRef.current.toDataURL())}
        >
          Guardar Firma
        </Button>
      </Box>
    </Box>
  );
};

const PartsPerMillionCalculator = ({ onViscositySelect }) => {
  const [selectedViscosityType, setSelectedViscosityType] = useState('');
  const [viscosityLimits, setViscosityLimits] = useState([]);
  const { api } = useAuth();

  useEffect(() => {
    const fetchViscosityLimits = async () => {
      try {
        const response = await api.get('limites-viscosidad/');
        setViscosityLimits(response.data);
        if (response.data.length > 0) {
          setSelectedViscosityType(response.data[0].tipo);
          if (onViscositySelect) {
            onViscositySelect(response.data[0]);
          }
        }
      } catch (error) {
        console.error('Error loading viscosity limits:', error);
        toast.error('Error al cargar límites de viscosidad');
      }
    };

    fetchViscosityLimits();
  }, [api]);

  const handleViscosityChange = (e) => {
    const selectedType = e.target.value;
    setSelectedViscosityType(selectedType);
    const selectedLimit = viscosityLimits.find(l => l.tipo === selectedType);
    if (selectedLimit && onViscositySelect) {
      onViscositySelect(selectedLimit);
    }
  };

  return (
    <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Cálculo Partes por Millón</Typography>
      
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Tipo de Viscosidad</InputLabel>
        <Select
          value={selectedViscosityType}
          onChange={handleViscosityChange}
          label="Tipo de Viscosidad"
        >
          {viscosityLimits.map((limit) => (
            <MenuItem key={limit.id} value={limit.tipo}>
              {limit.tipo}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedViscosityType && (
        <Table sx={{ mt: 2 }}>
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>vmin</TableCell>
              <TableCell>
                {viscosityLimits.find(l => l.tipo === selectedViscosityType)?.vmin || 'N/A'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>vmax</TableCell>
              <TableCell>
                {viscosityLimits.find(l => l.tipo === selectedViscosityType)?.vmax || 'N/A'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>iv1</TableCell>
              <TableCell>
                {viscosityLimits.find(l => l.tipo === selectedViscosityType)?.iv1 || 'N/A'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>iv2</TableCell>
              <TableCell>
                {viscosityLimits.find(l => l.tipo === selectedViscosityType)?.iv2 || 'N/A'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

const TestMetricsCalculator = ({ onQualitySelect }) => {
  const [selectedQualityType, setSelectedQualityType] = useState('');
  const [qualityLimits, setQualityLimits] = useState([]);
  const { api } = useAuth();

  useEffect(() => {
    const fetchQualityLimits = async () => {
      try {
        const response = await api.get('limites-calidad/');
        setQualityLimits(response.data);
        if (response.data.length > 0) {
          setSelectedQualityType(response.data[0].tipo);
          if (onQualitySelect) {
            onQualitySelect(response.data[0]);
          }
        }
      } catch (error) {
        console.error('Error loading quality limits:', error);
        toast.error('Error al cargar límites de calidad');
      }
    };

    fetchQualityLimits();
  }, [api]);

  const handleQualityChange = (e) => {
    const selectedType = e.target.value;
    setSelectedQualityType(selectedType);
    const selectedLimit = qualityLimits.find(l => l.tipo === selectedType);
    if (selectedLimit && onQualitySelect) {
      onQualitySelect(selectedLimit);
    }
  };

  return (
    <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Métricas de Prueba</Typography>
      
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Tipo de Calidad</InputLabel>
        <Select
          value={selectedQualityType}
          onChange={handleQualityChange}
          label="Tipo de Calidad"
        >
          {qualityLimits.map((limit) => (
            <MenuItem key={limit.id} value={limit.tipo}>
              {limit.tipo}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedQualityType && (
        <Table sx={{ mt: 2 }}>
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Espuma 1</TableCell>
              <TableCell>
                {qualityLimits.find(l => l.tipo === selectedQualityType)?.espuma1 || 'N/A'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Espuma 2</TableCell>
              <TableCell>
                {qualityLimits.find(l => l.tipo === selectedQualityType)?.espuma2 || 'N/A'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Espuma 3</TableCell>
              <TableCell>
                {qualityLimits.find(l => l.tipo === selectedQualityType)?.espuma3 || 'N/A'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Chispa</TableCell>
              <TableCell>
                {qualityLimits.find(l => l.tipo === selectedQualityType)?.chispa || 'N/A'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

const ViscosityCalculator = () => {
  const [pmccAceite, setPmccAceite] = useState(210);
  const [pmccComb, setPmccComb] = useState(52);
  const [bf, setBf] = useState(4.966665572);
  const [combustible, setCombustible] = useState(35.65);
  
  const calculatePmccFinal = () => {
    const term1 = pmccAceite * 0.8;
    const term2 = pmccComb * 1.2;
    return ((term1 * (1 - combustible/100)) + (term2 * (combustible/100))).toFixed(2);
  };
  
  const calculateBfFormula = () => {
    return (bf * 0.95).toFixed(6);
  };

  return (
    <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Cálculo de Viscosidad</Typography>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <TextField
            label="PMCC Aceite"
            type="number"
            value={pmccAceite}
            onChange={(e) => setPmccAceite(Number(e.target.value))}
            fullWidth
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="PMCC Comb"
            type="number"
            value={pmccComb}
            onChange={(e) => setPmccComb(Number(e.target.value))}
            fullWidth
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="BF"
            type="number"
            value={bf}
            onChange={(e) => setBf(Number(e.target.value))}
            fullWidth
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="% Combustible"
            type="number"
            value={combustible}
            onChange={(e) => setCombustible(Number(e.target.value))}
            fullWidth
          />
        </Grid>
      </Grid>
      
      <Table sx={{ mt: 2 }}>
        <TableBody>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>PMCC Comb</TableCell>
            <TableCell>{pmccComb}</TableCell>
            <TableCell>{calculateBfFormula()}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>PMCC Aceite</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>PMCC Final</TableCell>
            <TableCell>{pmccAceite}</TableCell>
            <TableCell>{calculatePmccFinal()}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>% Combustible</TableCell>
            <TableCell>{combustible}%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  );
};

const PerformanceCalculator = () => {
  const [selectedCode, setSelectedCode] = useState('23/21/17');
  
  const isoTableData = [
    { 
      code: '23/21/17', 
      system: 'Sistemas de baja presión con márgenes grandes.', 
      components: 'Bombas de pistón', 
      sensitivity: 'Baja', 
      um4: 23, 
      um6: 21, 
      um14: 17 
    },
    { 
      code: '20/18/15', 
      system: 'Pureza típica de aceite hidráulico nuevo directo del fabricante.', 
      components: 'Válvulas de control de flujo. Cilindros', 
      sensitivity: 'Promedio', 
      um4: 20, 
      um6: 18, 
      um14: 15 
    },
  ];

  const selectedData = isoTableData.find(item => item.code === selectedCode) || isoTableData[0];
  const pistonPumpTable = [
    { code: selectedCode, system: selectedData.system, sensitivity: selectedData.sensitivity },
  ];

  return (
    <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Cálculo de Desempeño</Typography>
      
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Código ISO</InputLabel>
        <Select
          value={selectedCode}
          onChange={(e) => setSelectedCode(e.target.value)}
          label="Código ISO"
        >
          <MenuItem value="23/21/17">23/21/17</MenuItem>
          <MenuItem value="20/18/15">20/18/15</MenuItem>
          <MenuItem value="19/17/14">19/17/14</MenuItem>
          <MenuItem value="18/16/13">18/16/13</MenuItem>
          <MenuItem value="17/15/12">17/15/12</MenuItem>
          <MenuItem value="16/14/11">16/14/11</MenuItem>
          <MenuItem value="15/13/09">15/13/09</MenuItem>
        </Select>
      </FormControl>
      
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Información del Código ISO</Typography>
      <Table sx={{ mb: 3 }}>
        <TableBody>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Tipo de sistema</TableCell>
            <TableCell>{selectedData.system}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Componentes típicos</TableCell>
            <TableCell>{selectedData.components}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Sensibilidad</TableCell>
            <TableCell>{selectedData.sensitivity}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>4um</TableCell>
            <TableCell>{selectedData.um4}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>6um</TableCell>
            <TableCell>{selectedData.um6}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>14um</TableCell>
            <TableCell>{selectedData.um14}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Bombas de pistón</Typography>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Sistema</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Sensibilidad</TableCell>
          </TableRow>
          {pistonPumpTable.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.code}</TableCell>
              <TableCell>{row.system}</TableCell>
              <TableCell>{row.sensitivity}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

const AnalysisReport = () => {
  const router = useRouter();
  const sampleId = router.query.muestra;
  const { api } = useAuth();
  const [allResults, setAllResults] = useState([]);
  const [allSamples, setAllSamples] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [sampleData, setSampleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [signature, setSignature] = useState(null);
  const [openSignatureDialog, setOpenSignatureDialog] = useState(false);
  const [predefinedComments, setPredefinedComments] = useState([]);
  const reportRef = useRef();
  const [commentContent, setCommentContent] = useState([
    { type: 'paragraph', text: 'Ingrese comentarios aquí...' }
  ]);
  const [showLimits, setShowLimits] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [activeToolTab, setActiveToolTab] = useState(0);
  const [selectedViscosity, setSelectedViscosity] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState(null);

  // Función para actualizar los límites en los resultados
  const updateLimitsInResults = () => {
    setFilteredResults(prevResults => 
      prevResults.map(result => {
        // Actualizar VIS100 con los límites de viscosidad
        if (result.prueba_muestra.prueba?.codigo === 'VIS100' && selectedViscosity) {
          return {
            ...result,
            prueba_muestra: {
              ...result.prueba_muestra,
              prueba: {
                ...result.prueba_muestra.prueba,
                relaciones: [{
                  ...result.prueba_muestra.prueba.relaciones[0],
                  limite_data: selectedViscosity
                }]
              }
            }
          };
        }
        // Actualizar IV con los límites de viscosidad
        if (result.prueba_muestra.prueba?.codigo === 'IV' && selectedViscosity) {
          return {
            ...result,
            prueba_muestra: {
              ...result.prueba_muestra,
              prueba: {
                ...result.prueba_muestra.prueba,
                relaciones: [{
                  ...result.prueba_muestra.prueba.relaciones[0],
                  limite_data: {
                    ...result.prueba_muestra.prueba.relaciones[0]?.limite_data,
                    vmin: selectedViscosity.iv2,
                    vmax: selectedViscosity.iv2
                  }
                }]
              }
            }
          };
        }
        // Actualizar ESP1, ESP2, ESP3 con los límites de calidad
        if (['ESP1', 'ESP2', 'ESP3'].includes(result.prueba_muestra.prueba?.codigo) && selectedQuality) {
          const field = result.prueba_muestra.prueba?.codigo.toLowerCase();
          return {
            ...result,
            prueba_muestra: {
              ...result.prueba_muestra,
              prueba: {
                ...result.prueba_muestra.prueba,
                relaciones: [{
                  ...result.prueba_muestra.prueba.relaciones[0],
                  limite_data: {
                    ...result.prueba_muestra.prueba.relaciones[0]?.limite_data,
                    vmin: selectedQuality[field] || null,
                    vmax: selectedQuality[field] || null
                  }
                }]
              }
            }
          };
        }
        // Actualizar PCHISPA con los límites de calidad
        if (result.prueba_muestra.prueba?.codigo === 'PCHISPA' && selectedQuality) {
          return {
            ...result,
            prueba_muestra: {
              ...result.prueba_muestra,
              prueba: {
                ...result.prueba_muestra.prueba,
                relaciones: [{
                  ...result.prueba_muestra.prueba.relaciones[0],
                  limite_data: {
                    ...result.prueba_muestra.prueba.relaciones[0]?.limite_data,
                    vmin: selectedQuality.chispa || null,
                    vmax: selectedQuality.chispa || null
                  }
                }]
              }
            }
          };
        }
        return result;
      })
    );
  };

  // Efecto para actualizar los límites cuando cambian las selecciones
  useEffect(() => {
    if (selectedViscosity || selectedQuality) {
      updateLimitsInResults();
    }
  }, [selectedViscosity, selectedQuality]);

  // Obtener comentarios predefinidos
  useEffect(() => {
    const fetchPredefinedComments = async () => {
      try {
        const response = await api.get('comentarios-predefinidos/');
        setPredefinedComments(response.data);
      } catch (error) {
        console.error('Error loading predefined comments:', error);
        toast.error('Error al cargar comentarios predefinidos');
      }
    };

    fetchPredefinedComments();
  }, [api]);

  // Obtener todas las muestras
  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const response = await api.get('lubrication/samples/');
        setAllSamples(response.data);
      } catch (error) {
        console.error('Error loading samples:', error);
      }
    };
    
    fetchSamples();
  }, [api]);

  // Actualizar observaciones cuando cambia el contenido del editor
  useEffect(() => {
    const text = commentContent.map(block => block.text).join('\n');
    handleFieldChange('observaciones', text);
  }, [commentContent]);

  // Obtener todos los resultados y filtrar por muestra
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get('lubrication/results/');
        setAllResults(response.data);
        
        // Filtrar resultados para esta muestra
        const filtered = response.data.filter(
          result => result.prueba_muestra.muestra?.id === sampleId
        );
        
        setFilteredResults(filtered);
        
        // Obtener datos de la muestra del primer resultado (si existe)
        if (filtered.length > 0) {
          setSampleData(filtered[0].prueba_muestra.muestra);
        }
      } catch (error) {
        console.error('Error loading results:', error);
        toast.error('Error al cargar los resultados');
      } finally {
        setLoading(false);
      }
    };

    if (sampleId) {
      fetchData();
    }
  }, [sampleId, api]);

  // Manejar edición de campos
  const handleFieldChange = (field, value) => {
    setSampleData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Guardar cambios
  const handleSave = async () => {
    try {
      const sampleDataToSend = {
        ...sampleData,
        lubricante: sampleData.lubricante?.id || null,
        referencia_equipo: sampleData.referencia_equipo?.id || null
      };

      await api.patch(`lubrication/samples/${sampleId}/`, sampleDataToSend);
      
      const updatePromises = filteredResults.map(result => {
        return api.patch(`lubrication/results/${result.id}/`, {
          resultado: result.resultado,
          observaciones: result.comentario
        });
      });
      
      await Promise.all(updatePromises);
      
      setEditing(false);
      toast.success('Reporte actualizado correctamente');
    } catch (error) {
      toast.error('Error al guardar reporte: ' + (error.response?.data?.message || error.message));
    }
  };

  // Actualizar un resultado específico
  const updateResult = (resultId, field, value) => {
    setFilteredResults(prev => 
      prev.map(result => 
        result.id === resultId ? { ...result, [field]: value } : result
      )
    );
  };

  // Generar PDF
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte de Análisis - ${sampleId}</title>
          <style>
            body { font-family: Arial; line-height: 1.5; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            .header { text-align: center; margin-bottom: 20px; }
            .signature-line { border-top: 1px solid #000; width: 200px; margin-top: 50px; }
            .completed { background-color: #e8f5e9; }
            .pending { background-color: #fff8e1; }
          </style>
        </head>
        <body>
          ${reportRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (!sampleData || filteredResults.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>No se encontraron resultados para esta muestra</Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="contained" 
            startIcon={<PictureAsPdf />}
            onClick={handlePrint}
          >
            Generar PDF
          </Button>
          <Button
            variant="outlined"
            onClick={() => setShowLimits(!showLimits)}
            sx={{ ml: 1 }}
          >
            {showLimits ? 'Ocultar Límites' : 'Mostrar Límites'}
          </Button>
          <Button
            variant="outlined"
            startIcon={editing ? <Save /> : <Edit />}
            onClick={editing ? handleSave : () => setEditing(true)}
          >
            {editing ? 'Guardar' : 'Editar'}
          </Button>
          {editing && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Close />}
              onClick={() => setEditing(false)}
            >
              Cancelar
            </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Columna izquierda - Reporte principal */}
        <Grid item xs={12} md={8}>
          <Paper 
            ref={reportRef}
            sx={{ 
              padding: '20px', 
              fontFamily: 'Arial', 
              maxWidth: '210mm', 
              margin: 'auto',
              lineHeight: '1.5',
              '@media print': {
                padding: 0,
                boxShadow: 'none',
                backgroundColor: 'transparent'
              }
            }}
          >
            {/* Logo y título */}
            <Box sx={{ mr: 2 }}>
              <img 
                src="https://keeplubricants.com/wp-content/uploads/2019/09/logo-globaloil.jpg" 
                alt="Escudo" 
                style={{ height: '40px', width: '40px', objectFit: 'contain' }} 
              />
            </Box>

            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', color: '#333' }}>
                {editing ? (
                  <TextField
                    value={sampleData.companyName || 'GLOABALOIL'}
                    onChange={(e) => handleFieldChange('companyName', e.target.value)}
                    sx={{ width: '300px' }}
                  />
                ) : (
                  sampleData.companyName || 'GIOBALOIL'
                )}
              </Typography>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', mt: 1 }}>
                ORDEN DE ANÁLISIS
              </Typography>
            </Box>

            {/* Información principal */}
            <Table sx={{ mb: 3, borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ border: 'none', padding: '4px 16px 4px 0', fontWeight: 'bold' }}>
                    Fecha de Toma de Muestra:
                  </TableCell>
                  <TableCell sx={{ border: 'none', padding: '4px 16px' }}>
                    {editing ? (
                      <TextField
                        type="date"
                        value={sampleData.fecha_toma || ''}
                        onChange={(e) => handleFieldChange('fecha_toma', e.target.value)}
                        sx={{ width: '150px' }}
                      />
                    ) : (
                      new Date(sampleData.fecha_toma).toLocaleDateString() || 'No especificada'
                    )}
                  </TableCell>
                  <TableCell sx={{ border: 'none', padding: '4px 16px 4px 0', fontWeight: 'bold' }}>
                    Período de Servicio:
                  </TableCell>
                  <TableCell sx={{ border: 'none', padding: '4px 0' }}>
                    {editing ? (
                      <TextField
                        value={sampleData.periodo_servicio_aceite || ''}
                        onChange={(e) => handleFieldChange('periodo_servicio_aceite', e.target.value)}
                        sx={{ width: '100px' }}
                      />
                    ) : (
                      `${sampleData.periodo_servicio_aceite || 'DESCONOCIDO'} ${sampleData.unidad_periodo_aceite || ''}`
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ border: 'none', padding: '4px 16px 4px 0', fontWeight: 'bold' }}>
                    Lubricante:
                  </TableCell>
                  <TableCell sx={{ border: 'none', padding: '4px 16px' }}>
                      {editing ? (
                        <TextField
                          value={sampleData.lubricante?.nombre_comercial || ''}
                          onChange={(e) => {
                            handleFieldChange('lubricante', {
                              ...sampleData.lubricante,
                              nombre_comercial: e.target.value
                            });
                          }}
                          sx={{ width: '300px' }}
                        />
                      ) : (
                        sampleData.lubricante?.nombre_comercial || 'No especificado'
                      )}
                    </TableCell>
                  <TableCell sx={{ border: 'none', padding: '4px 16px 4px 0', fontWeight: 'bold' }}>
                    Equipo:
                  </TableCell>
                  <TableCell sx={{ border: 'none', padding: '4px 0' }}>
                    {sampleData.referencia_equipo?.codigo || 'No especificado'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ border: 'none', padding: '4px 16px 4px 0', fontWeight: 'bold' }}>
                    Cliente:
                  </TableCell>
                  <TableCell sx={{ border: 'none', padding: '4px 16px' }}>
                    {sampleData.contacto_cliente || 'No especificado'}
                  </TableCell>
                  <TableCell sx={{ border: 'none', padding: '4px 16px 4px 0', fontWeight: 'bold' }}>
                    Placa:
                  </TableCell>
                  <TableCell sx={{ border: 'none', padding: '4px 0' }}>
                    {sampleData.equipo_placa || 'No especificado'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ border: 'none', padding: '4px 16px 4px 0', fontWeight: 'bold' }}>
                    Estado:
                  </TableCell>
                  <TableCell sx={{ border: 'none', padding: '4px 16px' }}>
                    <Chip 
                      label={sampleData.is_aprobado ? 'Aprobado' : 'Pendiente'} 
                      color={sampleData.is_aprobado ? 'success' : 'warning'} 
                    />
                  </TableCell>
                  <TableCell sx={{ border: 'none', padding: '4px 16px 4px 0', fontWeight: 'bold' }}>
                    Período Servicio Equipo:
                  </TableCell>
                  <TableCell sx={{ border: 'none', padding: '4px 0' }}>
                    {`${sampleData.periodo_servicio_equipo || 'DESCONOCIDO'} ${sampleData.unidad_periodo_equipo || ''}`}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Divider sx={{ my: 2 }} />

            {/* Tabla de análisis */}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>ANÁLISIS</Typography>
            <Table sx={{ border: '1px solid #000', mb: 3 , color: 'black'}}>
              <TableBody>
                <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
                  <TableCell sx={{ border: '1px solid #000', fontWeight: 'bold' , color: 'black'}}>Análisis</TableCell>
                  <TableCell sx={{ border: '1px solid #000', fontWeight: 'bold', color: 'black' }}>Método</TableCell>
                  <TableCell sx={{ border: '1px solid #000', fontWeight: 'bold', color: 'black' }}>Resultado</TableCell>
                  <TableCell sx={{ border: '1px solid #000', fontWeight: 'bold', color: 'black'}}>Unidades</TableCell>
                  <TableCell sx={{ border: '1px solid #000', fontWeight: 'bold', color: 'black' }}>Límite</TableCell>
                  <TableCell sx={{ border: '1px solid #000', fontWeight: 'bold', color: 'black' }}>Operacion limite</TableCell>
                  <TableCell sx={{ border: '1px solid #000', fontWeight: 'bold', color: 'black' }}>Comentario</TableCell>
                </TableRow>
                
                {filteredResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell sx={{ border: '1px solid #000' }}>
                      {result.prueba_muestra.prueba?.codigo|| 'Prueba no especificada'}
                    </TableCell>
                    <TableCell sx={{ border: '1px solid #000' }}>
                      {result.prueba_muestra.prueba?.metodo_referencia || ''}
                    </TableCell>
                    <TableCell sx={{ border: '1px solid #000', color: 'black' }}>
                      {editing ? (
                        <TextField
                          value={result.resultado || ''}
                          onChange={(e) => updateResult(result.id, 'resultado', e.target.value)}
                          type="number"
                          sx={{ width: '100px' , color: 'black'}}
                        />
                      ) : (
                        result.resultado || 'N/A'
                      )}
                    </TableCell>
                    <TableCell sx={{ border: '1px solid #000'}}>
                      {result.prueba_muestra.prueba?.unidad_medida || ''}
                    </TableCell>
                    <TableCell sx={{ border: '1px solid #000', color: 'black' }}>
                    {showLimits ? (
                      result.prueba_muestra.prueba?.relaciones[0]?.limite_data?.vmin 
                        ? `${result.prueba_muestra.prueba?.relaciones[0]?.limite_data?.vmin}-${result.prueba_muestra.prueba?.relaciones[0]?.limite_data?.vmax}`
                        : 'N/A'
                    ) : '---'}
                  </TableCell>
                  <TableCell sx={{ border: '1px solid #000'}}>
                        {result.prueba_muestra.prueba?.relaciones[0]?.symbol_operation || '---'}
                      </TableCell>
                    <TableCell sx={{ border: '1px solid #000', color: 'black' }}>
                      {editing ? (
                        <FormControl fullWidth size="small">
                          <Select
                            value={result.comentario || ''}
                            onChange={(e) => updateResult(result.id, 'comentario', e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value="">
                              <em>Seleccione un comentario</em>
                            </MenuItem>
                            {predefinedComments.map((comment) => (
                              <MenuItem key={comment.id} value={comment.texto}>
                                {comment.texto}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        result.observaciones || 'Sin comentario'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Divider sx={{ my: 2 }} />

            {/* Comentarios */}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>COMENTARIOS</Typography>
            <Box sx={{ mb: 3 }}>
              {/* Editor de texto */}
              {editing ? (
                <Box sx={{ p: 1 }}>
                  <TextEditor 
                    content={commentContent}
                    setContent={setCommentContent}
                    sx={{ 
                      '& .MuiTypography-root': { color: '#000 !important' },
                      '& .MuiListItemText-primary': { color: '#000 !important' }
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{ p: 2, whiteSpace: 'pre-line', color: '#000' }}>
                  {sampleData.observaciones || 'No hay comentarios'}
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Conclusiones */}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>CONCLUSIONES</Typography>
            <Box sx={{ mb: 3 }}>
              {editing ? (
                <TextField
                  multiline
                  fullWidth
                  rows={3}
                  value={sampleData.conclusiones || ''}
                  onChange={(e) => handleFieldChange('conclusiones', e.target.value)}
                />
              ) : (
                <Typography sx={{ whiteSpace: 'pre-line' }}>
                  {sampleData.conclusiones || 'No hay conclusiones'}
                </Typography>
              )}
            </Box>

            {/* Nota final */}
            <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 3 }}>
              La propiedad descrita en este reporte corresponde a los de la muestra suministrada.
            </Typography>

            {/* Firma */}
            <Box sx={{ textAlign: 'right', mt: 4 }}>
              <Box sx={{ borderTop: '1px solid #000', display: 'inline-block', pt: 1, minWidth: '200px' }}>
                <Typography>
                  <strong>RESPONSABLE:</strong>
                </Typography>
                {signature ? (
                  <Box sx={{ height: '80px', mb: 1 }}>
                    <img src={signature} alt="Firma" style={{ height: '100%' }} />
                  </Box>
                ) : (
                  <Button 
                    variant="outlined" 
                    onClick={() => setOpenSignatureDialog(true)}
                    sx={{ mt: 1 }}
                  >
                    Agregar Firma
                  </Button>
                )}
                <Typography>
                  {sampleData.usuario_registro?.email || 'Ing. Responsable'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

         {/* Columna derecha - Herramientas */}
         <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Seleccionar Muestra</Typography>
            <FormControl fullWidth>
              <InputLabel>Muestra</InputLabel>
              <Select
                value={sampleId}
                onChange={(e) => router.push(`/documents-list/template-report?muestra=${e.target.value}`)}
                label="Muestra"
              >
                {allSamples.map(sample => (
                  <MenuItem key={sample.id} value={sample.id}>
                    {sample.codigo} - {sample.equipo_placa}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Tabs 
              value={activeToolTab} 
              onChange={(e, newValue) => setActiveToolTab(newValue)}
              sx={{ mb: 2 }}
            >
              <Tab label="Herramientas 1" />
              <Tab label="Herramientas 2" />
            </Tabs>
            
            {activeToolTab === 0 && (
              <>
                <PartsPerMillionCalculator 
                  onViscositySelect={setSelectedViscosity}
                />
                <TestMetricsCalculator 
                  onQualitySelect={setSelectedQuality}
                />
              </>
            )}
            
            {activeToolTab === 1 && (
              <>
                <ViscosityCalculator />
                <PerformanceCalculator />
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Diálogo de firma */}
      <Dialog 
        open={openSignatureDialog} 
        onClose={() => setOpenSignatureDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Agregar Firma</DialogTitle>
        <DialogContent>
          <SignaturePad 
            onSave={(sig) => {
              setSignature(sig);
              setOpenSignatureDialog(false);
            }} 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSignatureDialog(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AnalysisReport;