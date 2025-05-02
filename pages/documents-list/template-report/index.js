import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { 
  Box, Typography, Table, TableBody, TableCell, TableRow, Paper, 
  TextField, Button, Divider, Dialog, DialogActions, 
  DialogContent, DialogTitle, CircularProgress, IconButton, Chip,
  Select, MenuItem, FormControl, InputLabel
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

const AnalysisReport = () => {
  const router = useRouter();
  const sampleId = router.query.muestra;
  const { api } = useAuth();
  const [allResults, setAllResults] = useState([]);
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
  const [showLimits, setShowLimits] = useState(true); // Añade este estado
  
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
    // Preparar datos para enviar - solo incluir los IDs de las relaciones
    const sampleDataToSend = {
      ...sampleData,
      lubricante: sampleData.lubricante?.id || null,  // Solo el ID
      referencia_equipo: sampleData.referencia_equipo?.id || null  // Solo el ID
    };

    // Actualizar la muestra
    await api.patch(`lubrication/samples/${sampleId}/`, sampleDataToSend);
    
    // Actualizar resultados individuales si es necesario
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
  console.log(filteredResults)

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
            src="../../../public/logo-globaloil.jpg" 
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
                        // Si necesitas cambiar solo el nombre, deberías hacer un PATCH al lubricante por separado
                        // O implementar un selector de lubricantes existentes
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