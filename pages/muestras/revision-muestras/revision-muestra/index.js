import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../shared/context/AuthContext';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  IconButton,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Collapse
} from '@mui/material';
import { 
  Close, 
  Edit, 
  Save, 
  PictureAsPdf, 
  ArrowBack, 
  CheckCircle, 
  Warning,
  Science,
  Assignment,
  MoreVert,
  ViewList,
  GridView,
  TableChart,
  ExpandMore,
  ExpandLess,
  PlaylistAddCheck
} from '@mui/icons-material';
import { toast } from 'react-toastify';

// Paleta de colores
const COLORS = {
  primary: '#292929',
  secondary: '#d32f2f',
  background: '#1a1a1a',
  surface: '#292929',
  textPrimary: '#ffffff',
  textSecondary: '#d9d9d9',
  border: '#424242',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336'
};

const VistaMuestraIndividual = () => {
  const { api, user } = useAuth();
  const router = useRouter();
  const { muestra } = router.query;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Estados reorganizados
  const [loading, setLoading] = useState(true);
  const [sampleData, setSampleData] = useState(null);
  const [expandedParents, setExpandedParents] = useState(new Set());
  
  // Estados de UI
  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);
  const [resultValue, setResultValue] = useState('');
  const [openDocModal, setOpenDocModal] = useState(false);
  const [docUrl, setDocUrl] = useState('');
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const [completingTests, setCompletingTests] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState('table');

  // Cargar datos de forma organizada
  useEffect(() => {
    const fetchData = async () => {
      if (!muestra) return;

      try {
        setLoading(true);
        
        // Obtener datos de la muestra con resultados incluidos
        const sampleRes = await api.get(`lubrication/samples/${muestra}/`);
        const sample = sampleRes.data;
        setSampleData(sample);

        // Expandir automáticamente las pruebas que tienen subpruebas
        const expanded = new Set();
        if (sample.pruebas_estructuradas) {
          sample.pruebas_estructuradas.forEach(test => {
            if (test.subpruebas && test.subpruebas.length > 0) {
              expanded.add(test.id);
            }
          });
        }
        setExpandedParents(expanded);

      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Error al cargar datos: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api, muestra]);

  // Función para verificar si una prueba tiene subpruebas
  const hasSubTests = (test) => {
    return test.subpruebas && test.subpruebas.length > 0;
  };

  // Función para obtener todas las pruebas organizadas
  const getOrganizedTests = () => {
    if (!sampleData?.pruebas_estructuradas) return [];
    
    return sampleData.pruebas_estructuradas.map(test => ({
      ...test,
      subTests: test.subpruebas || [],
      hasSubTests: hasSubTests(test),
      isParent: hasSubTests(test)
    }));
  };

  // Función para contar subpruebas completadas de un padre
  const getCompletedSubTestsCount = (parentTest) => {
    const subTests = parentTest.subpruebas || [];
    return subTests.filter(subTest => subTest.completada).length;
  };

  // Función para verificar si TODAS las subpruebas están completadas
  const allSubTestsCompleted = (parentTest) => {
    const subTests = parentTest.subpruebas || [];
    return subTests.length > 0 && subTests.every(subTest => subTest.is_revisada);
  };

  // Estadísticas - CORREGIDAS para usar la estructura correcta
  const getStats = () => {
    if (!sampleData?.pruebas_estructuradas) return { total: 0, completadas: 0, pendientes: 0, progreso: 0 };
    
    // Obtener todas las pruebas editables (subpruebas + pruebas simples)
    const allEditableTests = sampleData.pruebas_estructuradas.flatMap(test => 
      test.subpruebas && test.subpruebas.length > 0 ? test.subpruebas : [test]
    );
    
    const completadas = allEditableTests.filter(t => t.is_revisada).length;
    const pendientes = allEditableTests.filter(t => !t.is_revisada).length;
    
    return {
      total: allEditableTests.length,
      completadas: completadas,
      pendientes: pendientes,
      progreso: allEditableTests.length > 0 ? Math.round((completadas / allEditableTests.length) * 100) : 0
    };
  };

  // Verificar si se pueden completar todas las pruebas
  const canCompleteAllTests = () => {
    const stats = getStats();
    return stats.completadas === stats.total;
  };

  // Manejar expandir/colapsar pruebas padre
  const toggleExpandParent = (parentTestId) => {
    setExpandedParents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parentTestId)) {
        newSet.delete(parentTestId);
      } else {
        newSet.add(parentTestId);
      }
      return newSet;
    });
  };

  // Manejar guardado de resultado - CORREGIDO para usar sample-tests
  const openAddResult = (test) => {
    // Permitir edición de subpruebas Y pruebas simples (que no tienen subpruebas)
    setCurrentTest(test);
    setResultValue(test.valor || '');
    setOpenResultDialog(true);
  };

  const handleSaveResult = async () => {
    try {
      if (!currentTest) return;

      await api.patch(`lubrication/sample-tests/${currentTest.id}/`, {
        valor: resultValue,
        unidad: currentTest.prueba.unidad_medida,
        fecha_medicion: new Date().toISOString(),
        usuario_medicion: user.id,
         is_revisada: true,
        
      });

      // Recargar datos
      const sampleRes = await api.get(`lubrication/samples/${muestra}/`);
      setSampleData(sampleRes.data);

      setOpenResultDialog(false);
      toast.success('Resultado guardado correctamente');

    } catch (error) {
      console.error('Error saving result:', error);
      toast.error('Error al guardar resultado: ' + (error.response?.data?.message || error.message));
    }
  };

  // Función para completar TODAS las pruebas
  const completeAllTests = async () => {
    try {
      setCompletingTests(true);

      // 1. Marcar TODAS las pruebas editables como completadas en sample_tests
      if (sampleData?.pruebas_estructuradas) {
        const allEditableTests = sampleData.pruebas_estructuradas.flatMap(test => 
          test.subpruebas && test.subpruebas.length > 0 ? test.subpruebas : [test]
        );
        
        const completionPromises = allEditableTests.map(test =>
          api.patch(`lubrication/sample-tests/${test.id}/`, {
            is_revisada: true,
           
          })
        );

        await Promise.all(completionPromises);
      }

      // 2. ACTUALIZAR EL ESTADO DE LA MUESTRA A APROBADO
      await api.patch(`lubrication/samples/${muestra}/`, {
        is_revisado: true
      });

      // 3. Recargar todos los datos
      const sampleRes = await api.get(`lubrication/samples/${muestra}/`);
      setSampleData(sampleRes.data);

      toast.success('¡Proceso completado! Redirigiendo a la lista de muestras...');

      // 4. Redireccionar a /muestras después de un breve delay
      setTimeout(() => {
        router.push('/muestras');
      }, 2000);

    } catch (error) {
      console.error('Error completing tests:', error);
      toast.error('Error al completar pruebas: ' + (error.response?.data?.message || error.message));
    } finally {
      setCompletingTests(false);
    }
  };




  // Componente para tabla responsiva con jerarquía - CORREGIDO
  const ResponsiveTable = () => {
    const organizedTests = getOrganizedTests();
    
    return (
      <TableContainer 
        sx={{ 
          maxHeight: isMobile ? '400px' : 'none',
          overflow: 'auto'
        }}
      >
        <Table size={isSmallMobile ? "small" : "medium"}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: COLORS.textPrimary, fontWeight: 'bold', minWidth: isSmallMobile ? '80px' : '120px' }}>
                Prueba
              </TableCell>
              {!isSmallMobile && (
                <TableCell sx={{ color: COLORS.textPrimary, fontWeight: 'bold' }}>
                  Estado
                </TableCell>
              )}
              <TableCell sx={{ color: COLORS.textPrimary, fontWeight: 'bold', minWidth: isSmallMobile ? '60px' : '100px' }}>
                Resultado
              </TableCell>
              <TableCell sx={{ color: COLORS.textPrimary, fontWeight: 'bold', width: isSmallMobile ? '80px' : '120px' }}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {organizedTests.map(test => {
              // Si es una prueba padre (tiene subpruebas)
              if (test.isParent) {
                const isExpanded = expandedParents.has(test.id);
                const completedSubTests = getCompletedSubTestsCount(test);
                const totalSubTests = test.subTests.length;
                const allCompleted = allSubTestsCompleted(test);
                
                return (
                  <React.Fragment key={test.id}>
                    {/* Fila del padre */}
                    <TableRow sx={{ backgroundColor: COLORS.primary }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => toggleExpandParent(test.id)}
                            sx={{ color: COLORS.textSecondary }}
                          >
                            {isExpanded ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                          <Box>
                            <Typography sx={{ color: COLORS.textPrimary, fontWeight: 'bold', fontSize: isSmallMobile ? '0.8rem' : '0.9rem' }}>
                              {test.prueba.codigo}
                              <Chip 
                                label="Padre" 
                                size="small" 
                                sx={{ 
                                  ml: 1, 
                                  backgroundColor: COLORS.secondary, 
                                  color: COLORS.textPrimary,
                                  fontSize: '0.6rem',
                                  height: '16px'
                                }} 
                              />
                            </Typography>
                            {!isSmallMobile && (
                              <Typography sx={{ color: COLORS.textSecondary, fontSize: '0.8rem' }}>
                                {test.prueba.nombre}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      {!isSmallMobile && (
                        <TableCell>
                          <Chip 
                            label={allCompleted ? "REVISADA" : `${completedSubTests}/${totalSubTests}`}
                            size="small"
                            sx={{
                              backgroundColor: allCompleted ? COLORS.success : 
                                             completedSubTests > 0 ? COLORS.warning : COLORS.error,
                              color: COLORS.textPrimary,
                              fontSize: '0.8rem'
                            }}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Typography sx={{ color: COLORS.textSecondary, fontStyle: 'italic', fontSize: isSmallMobile ? '0.7rem' : '0.8rem' }}>
                          Prueba compuesta
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          size={isSmallMobile ? "small" : "medium"}
                          variant="outlined"
                          fullWidth={isSmallMobile}
                          disabled
                          sx={{
                            borderColor: COLORS.textSecondary,
                            color: COLORS.textSecondary,
                            fontSize: isSmallMobile ? '0.7rem' : '0.8rem',
                            minWidth: isSmallMobile ? '60px' : 'auto',
                          }}
                        >
                          {allCompleted ? 'Completada' : 'Ver'}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Subpruebas */}
                    {isExpanded && test.subTests.map(subTest => {
                      const hasResult = subTest.valor && subTest.valor !== '';
                      const isCompleted = subTest.is_revisada;
                      
                      return (
                        <TableRow key={subTest.id}>
                          <TableCell sx={{ pl: isSmallMobile ? 4 : 6 }}>
                            <Box>
                              <Typography sx={{ color: COLORS.textPrimary, fontWeight: 'bold', fontSize: isSmallMobile ? '0.8rem' : '0.9rem' }}>
                                {subTest.prueba.codigo}
                                <Chip 
                                  label="Subprueba" 
                                  size="small" 
                                  sx={{ 
                                    ml: 1, 
                                    backgroundColor: '#1976d2', 
                                    color: COLORS.textPrimary,
                                    fontSize: '0.6rem',
                                    height: '16px'
                                  }} 
                                />
                              </Typography>
                              {!isSmallMobile && (
                                <Typography sx={{ color: COLORS.textSecondary, fontSize: '0.8rem' }}>
                                  {subTest.prueba.nombre}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          {!isSmallMobile && (
                            <TableCell>
                              <Chip 
                                icon={isCompleted ? <CheckCircle fontSize="small" /> : <Warning fontSize="small" />}
                                label={isCompleted ? "Revisada" : hasResult ? "Pendiente" : "Sin dato"} 
                                size="small"
                                sx={{
                                  backgroundColor: isCompleted ? COLORS.success : 
                                                 hasResult ? COLORS.warning : COLORS.error,
                                  color: COLORS.textPrimary,
                                  fontSize: '0.8rem'
                                }}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            {hasResult ? (
                              <Box>
                                <Typography sx={{ color: COLORS.textPrimary, fontSize: isSmallMobile ? '0.8rem' : '0.9rem' }}>
                                  {subTest.valor}
                                </Typography>
                                {subTest.prueba.unidad_medida && !isSmallMobile && (
                                  <Typography sx={{ color: COLORS.textSecondary, fontSize: '0.7rem' }}>
                                    {subTest.prueba.unidad_medida}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography sx={{ color: COLORS.textSecondary, fontStyle: 'italic', fontSize: isSmallMobile ? '0.7rem' : '0.8rem' }}>
                                No registrado
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Button
                                size={isSmallMobile ? "small" : "medium"}
                                variant={hasResult ? "outlined" : "contained"}
                                fullWidth
                                sx={{
                                  backgroundColor: hasResult ? 'transparent' : COLORS.secondary,
                                  borderColor: hasResult ? COLORS.textSecondary : COLORS.secondary,
                                  color: hasResult ? COLORS.textSecondary : COLORS.textPrimary,
                                  fontSize: isSmallMobile ? '0.6rem' : '0.7rem',
                                  minWidth: isSmallMobile ? '60px' : 'auto',
                                  '&:hover': {
                                    backgroundColor: hasResult ? 'rgba(217, 217, 217, 0.1)' : '#b71c1c',
                                    borderColor: hasResult ? COLORS.textPrimary : '#b71c1c',
                                  }
                                }}
                                onClick={() => openAddResult(subTest)}
                              >
                                {hasResult ? 'Editar' : 'Agregar'}
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              } else {
                // Si es una prueba simple (sin subpruebas)
                const hasResult = test.valor && test.valor !== '';
                const isCompleted = test.is_revisada;
                
                return (
                  <TableRow key={test.id}>
                    <TableCell>
                      <Box>
                        <Typography sx={{ color: COLORS.textPrimary, fontWeight: 'bold', fontSize: isSmallMobile ? '0.8rem' : '0.9rem' }}>
                          {test.prueba.codigo}
                          <Chip 
                            label="Simple" 
                            size="small" 
                            sx={{ 
                              ml: 1, 
                              backgroundColor: '#4caf50', 
                              color: COLORS.textPrimary,
                              fontSize: '0.6rem',
                              height: '16px'
                            }} 
                          />
                        </Typography>
                        {!isSmallMobile && (
                          <Typography sx={{ color: COLORS.textSecondary, fontSize: '0.8rem' }}>
                            {test.prueba.nombre}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    {!isSmallMobile && (
                      <TableCell>
                        <Chip 
                          icon={isCompleted ? <CheckCircle fontSize="small" /> : <Warning fontSize="small" />}
                          label={isCompleted ? "Revisada" : hasResult ? "Pendiente" : "Sin dato"} 
                          size="small"
                          sx={{
                            backgroundColor: isCompleted ? COLORS.success : 
                                           hasResult ? COLORS.warning : COLORS.error,
                            color: COLORS.textPrimary,
                            fontSize: '0.8rem'
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      {hasResult ? (
                        <Box>
                          <Typography sx={{ color: COLORS.textPrimary, fontSize: isSmallMobile ? '0.8rem' : '0.9rem' }}>
                            {test.valor}
                          </Typography>
                          {test.prueba.unidad_medida && !isSmallMobile && (
                            <Typography sx={{ color: COLORS.textSecondary, fontSize: '0.7rem' }}>
                              {test.prueba.unidad_medida}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography sx={{ color: COLORS.textSecondary, fontStyle: 'italic', fontSize: isSmallMobile ? '0.7rem' : '0.8rem' }}>
                          No registrado
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Button
                          size={isSmallMobile ? "small" : "medium"}
                          variant={hasResult ? "outlined" : "contained"}
                          fullWidth
                          sx={{
                            backgroundColor: hasResult ? 'transparent' : COLORS.secondary,
                            borderColor: hasResult ? COLORS.textSecondary : COLORS.secondary,
                            color: hasResult ? COLORS.textSecondary : COLORS.textPrimary,
                            fontSize: isSmallMobile ? '0.6rem' : '0.7rem',
                            minWidth: isSmallMobile ? '60px' : 'auto',
                            '&:hover': {
                              backgroundColor: hasResult ? 'rgba(217, 217, 217, 0.1)' : '#b71c1c',
                              borderColor: hasResult ? COLORS.textPrimary : '#b71c1c',
                            }
                          }}
                          onClick={() => openAddResult(test)}
                        >
                          {hasResult ? 'Editar' : 'Agregar'}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              }
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Componente para cards responsivas
  const ResponsiveCards = () => {
    const organizedTests = getOrganizedTests();
    
    return (
      <Grid container spacing={isSmallMobile ? 1 : 2}>
        {organizedTests.map(test => {
          if (test.isParent) {
            // Cards para pruebas padre
            const completedSubTests = getCompletedSubTestsCount(test);
            const totalSubTests = test.subTests.length;
            const allCompleted = completedSubTests === totalSubTests;
            
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={test.id}>
                <Card 
                  sx={{ 
                    backgroundColor: COLORS.primary,
                    border: `1px solid ${allCompleted ? COLORS.success : COLORS.warning}`,
                    height: '100%',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 4px 8px rgba(0,0,0,0.3)`,
                    }
                  }}
                >
                  <CardContent sx={{ p: isSmallMobile ? 1.5 : 2 }}>
                    <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1}>
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          color: COLORS.textPrimary, 
                          fontWeight: 'bold',
                          fontSize: isSmallMobile ? '0.9rem' : '1rem'
                        }}
                      >
                        {test.prueba.codigo}
                      </Typography>
                      {allCompleted ? 
                        <CheckCircle sx={{ color: COLORS.success, fontSize: isSmallMobile ? 18 : 20 }} /> : 
                        <Warning sx={{ color: COLORS.warning, fontSize: isSmallMobile ? 18 : 20 }} />
                      }
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: COLORS.textSecondary, 
                        mb: 1,
                        fontSize: isSmallMobile ? '0.75rem' : '0.8rem'
                      }}
                    >
                      {test.prueba.nombre}
                    </Typography>

                    <Box mb={2}>
                      <Chip 
                        label={`${completedSubTests}/${totalSubTests} subpruebas`}
                        size="small"
                        sx={{
                          backgroundColor: allCompleted ? COLORS.success : COLORS.warning,
                          color: COLORS.textPrimary,
                          fontSize: isSmallMobile ? '0.6rem' : '0.7rem'
                        }}
                      />
                    </Box>

                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: COLORS.textSecondary, 
                        fontStyle: 'italic',
                        fontSize: isSmallMobile ? '0.7rem' : '0.8rem'
                      }}
                    >
                      Prueba compuesta
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          } else {
            // Cards para pruebas simples
            const hasResult = test.valor && test.valor !== '';
            const isCompleted = test.completada;
            
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={test.id}>
                <Card 
                  sx={{ 
                    backgroundColor: COLORS.primary,
                    border: `1px solid ${isCompleted ? COLORS.success : COLORS.warning}`,
                    height: '100%',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 4px 8px rgba(0,0,0,0.3)`,
                    }
                  }}
                >
                  <CardContent sx={{ p: isSmallMobile ? 1.5 : 2 }}>
                    <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1}>
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          color: COLORS.textPrimary, 
                          fontWeight: 'bold',
                          fontSize: isSmallMobile ? '0.9rem' : '1rem'
                        }}
                      >
                        {test.prueba.codigo}
                      </Typography>
                      {isCompleted ? 
                        <CheckCircle sx={{ color: COLORS.success, fontSize: isSmallMobile ? 18 : 20 }} /> : 
                        <Warning sx={{ color: COLORS.warning, fontSize: isSmallMobile ? 18 : 20 }} />
                      }
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: COLORS.textSecondary, 
                        mb: 1,
                        fontSize: isSmallMobile ? '0.75rem' : '0.8rem'
                      }}
                    >
                      {test.prueba.nombre}
                    </Typography>

                    {hasResult ? (
                      <Box mb={2}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            color: COLORS.textPrimary,
                            fontSize: isSmallMobile ? '0.9rem' : '1rem'
                          }}
                        >
                          {test.valor}
                        </Typography>
                        {test.prueba.unidad_medida && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: COLORS.textSecondary,
                              fontSize: isSmallMobile ? '0.6rem' : '0.7rem'
                            }}
                          >
                            {test.prueba.unidad_medida}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: COLORS.textSecondary, 
                          fontStyle: 'italic',
                          mb: 2,
                          fontSize: isSmallMobile ? '0.7rem' : '0.8rem'
                        }}
                      >
                        Sin resultado
                      </Typography>
                    )}

                    <Button
                      size="small"
                      variant={hasResult ? "outlined" : "contained"}
                      fullWidth
                      sx={{
                        backgroundColor: hasResult ? 'transparent' : COLORS.secondary,
                        borderColor: hasResult ? COLORS.textSecondary : COLORS.secondary,
                        color: hasResult ? COLORS.textSecondary : COLORS.textPrimary,
                        fontSize: isSmallMobile ? '0.6rem' : '0.7rem',
                        '&:hover': {
                          backgroundColor: hasResult ? 'rgba(217, 217, 217, 0.1)' : '#b71c1c',
                          borderColor: hasResult ? COLORS.textPrimary : '#b71c1c',
                        }
                      }}
                      onClick={() => openAddResult(test)}
                    >
                      {hasResult ? 'Editar' : 'Agregar'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          }
        })}
      </Grid>
    );
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          backgroundColor: COLORS.background
        }}
      >
        <CircularProgress sx={{ color: COLORS.secondary }} />
      </Box>
    );
  }

  if (!sampleData) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '200px',
          backgroundColor: COLORS.background,
          color: COLORS.textPrimary
        }}
      >
        <Typography>No se encontraron datos para esta muestra</Typography>
      </Box>
    );
  }

  const stats = getStats();
  const organizedTests = getOrganizedTests();
  const canComplete = canCompleteAllTests();

  // Para las pestañas de completadas y pendientes
  const getAllEditableTests = () => {
    return organizedTests.flatMap(test => 
      test.isParent ? test.subTests : [test]
    );
  };

  const allEditableTests = getAllEditableTests();
  const completedTests = allEditableTests.filter(t => t.is_revisada);
  const pendingTests = allEditableTests.filter(t => !t.is_revisada);

  return (
    <Box sx={{ 
      p: isSmallMobile ? 1 : 2,
      backgroundColor: COLORS.background,
      minHeight: '100vh',
      color: COLORS.textPrimary
    }}>
      {/* Header Mobile */}
      {isMobile && (
        <AppBar 
          position="static" 
          sx={{ 
            backgroundColor: COLORS.surface,
            mb: 2,
            boxShadow: 'none',
            borderBottom: `1px solid ${COLORS.border}`
          }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              sx={{ color: COLORS.textPrimary }}
              onClick={() => router.push('/muestras')}
            >
              <ArrowBack />
            </IconButton>
            
            <Box sx={{ flexGrow: 1, ml: 2 }}>
              <Typography variant="h6" noWrap sx={{ color: COLORS.textPrimary, fontSize: isSmallMobile ? '1rem' : '1.25rem' }}>
                Muestra {sampleData.id}
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                {stats.completadas}/{stats.total} completadas
              </Typography>
            </Box>

            {/* BOTÓN TERMINAR INGRESO PARA MÓVIL */}
            {canComplete && (
              <Button
                variant="contained"
                size="small"
                startIcon={<PlaylistAddCheck />}
                onClick={completeAllTests}
                disabled={completingTests}
                sx={{
                  backgroundColor: COLORS.success,
                  color: COLORS.textPrimary,
                  mr: 1,
                  fontSize: '0.7rem',
                  minWidth: 'auto',
                  px: 1,
                  '&:hover': {
                    backgroundColor: '#388e3c',
                  }
                }}
              >
                {completingTests ? '...' : 'Terminar'}
              </Button>
            )}

            <IconButton
              sx={{ color: COLORS.textPrimary }}
              onClick={(e) => setMobileMenuAnchor(e.currentTarget)}
            >
              <MoreVert />
            </IconButton>

            <Menu
              anchorEl={mobileMenuAnchor}
              open={Boolean(mobileMenuAnchor)}
              onClose={() => setMobileMenuAnchor(null)}
              PaperProps={{
                sx: {
                  backgroundColor: COLORS.surface,
                  color: COLORS.textPrimary,
                  minWidth: 200
                }
              }}
            >
              {canComplete && (
                <MenuItem 
                  onClick={() => {
                    completeAllTests();
                    setMobileMenuAnchor(null);
                  }}
                  disabled={completingTests}
                  sx={{
                    color: COLORS.success,
                    '&:hover': {
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    }
                  }}
                >
                  <ListItemIcon>
                    <PlaylistAddCheck fontSize="small" sx={{ color: COLORS.success }} />
                  </ListItemIcon>
                  <ListItemText>
                    {completingTests ? 'Completando...' : 'Terminar Revisión'}
                  </ListItemText>
                </MenuItem>
              )}
            </Menu>
          </Toolbar>
        </AppBar>
      )}

      {/* Header Desktop */}
      {!isMobile && (
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: 3,
            p: 3,
            backgroundColor: COLORS.surface,
            borderRadius: 2,
            border: `1px solid ${COLORS.border}`
          }}
        >
          <IconButton 
            onClick={() => router.push('/muestras')} 
            sx={{ 
              mr: 2,
              color: COLORS.textPrimary,
              '&:hover': {
                backgroundColor: 'rgba(211, 47, 47, 0.1)'
              }
            }}
          >
            <ArrowBack />
          </IconButton>
          <Box flex={1}>
            <Typography variant="h4" sx={{ color: COLORS.textPrimary, fontWeight: 'bold' }}>
              Muestra: <span style={{ color: COLORS.secondary }}>{sampleData.id}</span>
            </Typography>
            <Typography variant="body1" sx={{ color: COLORS.textSecondary, mt: 1 }}>
              {sampleData.lubricante?.nombre_comercial} - {sampleData.referencia_equipo_info?.nombre}
            </Typography>
          </Box>
          
          {/* Botón para completar todas las pruebas */}
          {canComplete && (
            <Button
              variant="contained"
              startIcon={<PlaylistAddCheck />}
              onClick={completeAllTests}
              disabled={completingTests}
              sx={{
                backgroundColor: COLORS.success,
                color: COLORS.textPrimary,
                mr: 2,
                '&:hover': {
                  backgroundColor: '#388e3c',
                }
              }}
            >
              {completingTests ? 'Completando...' : 'Terminar Revisión'}
            </Button>
          )}
          
          <Chip 
            label={stats.progreso === 100 ? 'LISTO PARA TERMINAR' : 'EN PROGRESO'} 
            sx={{ 
              backgroundColor: stats.progreso === 100 ? COLORS.success : COLORS.warning,
              color: COLORS.textPrimary,
              fontWeight: 'bold'
            }} 
          />
        </Box>
      )}

      {/* Información básica */}
      <Paper 
        sx={{ 
          p: isSmallMobile ? 2 : 3, 
          mb: 3, 
          backgroundColor: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          color: COLORS.textPrimary
        }}
      >
        {!isMobile && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ color: COLORS.textPrimary }}>
              Información de la Muestra
            </Typography>
          </Box>
        )}

        <Grid container spacing={isSmallMobile ? 2 : 3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary, mb: 1, fontSize: isSmallMobile ? '0.8rem' : '0.9rem' }}>
              LUBRICANTE
            </Typography>
            <Typography variant="body1" sx={{ color: COLORS.textPrimary, fontSize: isSmallMobile ? '0.9rem' : '1rem' }}>
              {sampleData.lubricante?.nombre_comercial || 'No especificado'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary, mb: 1, fontSize: isSmallMobile ? '0.8rem' : '0.9rem' }}>
              EQUIPO
            </Typography>
            <Typography variant="body1" sx={{ color: COLORS.textPrimary, fontSize: isSmallMobile ? '0.9rem' : '1rem' }}>
              {sampleData.referencia_equipo_info?.id} - {sampleData.referencia_equipo_info?.nombre}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary, mb: 1, fontSize: isSmallMobile ? '0.8rem' : '0.9rem' }}>
              FECHA DE CREACIÓN
            </Typography>
            <Typography variant="body1" sx={{ color: COLORS.textPrimary, fontSize: isSmallMobile ? '0.9rem' : '1rem' }}>
              {new Date(sampleData.fecha_registro).toLocaleDateString()}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Pruebas y resultados */}
      <Paper 
        sx={{ 
          p: isSmallMobile ? 2 : 3, 
          backgroundColor: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          color: COLORS.textPrimary
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ 
              '& .MuiTab-root': {
                color: COLORS.textSecondary,
                fontSize: isSmallMobile ? '0.8rem' : '0.9rem',
                minWidth: 'auto',
                px: isSmallMobile ? 1 : 2,
                '&.Mui-selected': {
                  color: COLORS.secondary,
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: COLORS.secondary,
              }
            }}
          >
            <Tab label={`Todas (${stats.total})`} />
            <Tab label={`Completadas (${stats.completadas})`} />
            <Tab label={`Pendientes (${stats.pendientes})`} />
            <Tab label="Resumen" />
          </Tabs>

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Vista tabla">
                <IconButton
                  size="small"
                  onClick={() => setViewMode('table')}
                  sx={{
                    color: viewMode === 'table' ? COLORS.secondary : COLORS.textSecondary,
                  }}
                >
                  <TableChart />
                </IconButton>
              </Tooltip>
              <Tooltip title="Vista grid">
                <IconButton
                  size="small"
                  onClick={() => setViewMode('grid')}
                  sx={{
                    color: viewMode === 'grid' ? COLORS.secondary : COLORS.textSecondary,
                  }}
                >
                  <GridView />
                </IconButton>
              </Tooltip>
              <Tooltip title="Vista cards">
                <IconButton
                  size="small"
                  onClick={() => setViewMode('cards')}
                  sx={{
                    color: viewMode === 'cards' ? COLORS.secondary : COLORS.textSecondary,
                  }}
                >
                  <ViewList />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        {activeTab === 0 && (
          <Box>
            {viewMode === 'table' ? (
              <ResponsiveTable />
            ) : (
              <ResponsiveCards />
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: COLORS.textPrimary, mb: 3, fontSize: isSmallMobile ? '1.1rem' : '1.25rem' }}>
              Pruebas Completadas
            </Typography>
            {completedTests.length > 0 ? (
              <Grid container spacing={isSmallMobile ? 1 : 2}>
                {completedTests.map(test => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={test.id}>
                    <Card 
                      sx={{ 
                        backgroundColor: COLORS.primary,
                        border: `1px solid ${COLORS.success}`,
                        height: '100%'
                      }}
                    >
                      <CardContent sx={{ p: isSmallMobile ? 1.5 : 2 }}>
                        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1}>
                          <Typography variant="subtitle1" sx={{ color: COLORS.textPrimary, fontWeight: 'bold' }}>
                            {test.prueba.codigo}
                          </Typography>
                          <CheckCircle sx={{ color: COLORS.success }} />
                        </Box>
                        <Typography variant="body2" sx={{ color: COLORS.textSecondary, mb: 1 }}>
                          {test.prueba.nombre}
                        </Typography>
                        <Box mb={2}>
                          <Typography variant="h6" sx={{ color: COLORS.textPrimary }}>
                            {test.valor}
                          </Typography>
                          {test.prueba.unidad_medida && (
                            <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                              {test.prueba.unidad_medida}
                            </Typography>
                          )}
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          fullWidth
                          sx={{
                            borderColor: COLORS.textSecondary,
                            color: COLORS.textSecondary
                          }}
                          onClick={() => openAddResult(test)}
                        >
                          Editar
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box textAlign="center" py={4}>
                <Science sx={{ fontSize: 48, color: COLORS.textSecondary, mb: 2 }} />
                <Typography sx={{ color: COLORS.textSecondary }}>
                  No hay pruebas completadas
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {activeTab === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: COLORS.textPrimary, mb: 3, fontSize: isSmallMobile ? '1.1rem' : '1.25rem' }}>
              Pruebas Pendientes
            </Typography>
            {pendingTests.length > 0 ? (
              <Grid container spacing={isSmallMobile ? 1 : 2}>
                {pendingTests.map(test => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={test.id}>
                    <Card 
                      sx={{ 
                        backgroundColor: COLORS.primary,
                        border: `1px solid ${COLORS.warning}`,
                        height: '100%'
                      }}
                    >
                      <CardContent sx={{ p: isSmallMobile ? 1.5 : 2 }}>
                        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1}>
                          <Typography variant="subtitle1" sx={{ color: COLORS.textPrimary, fontWeight: 'bold' }}>
                            {test.prueba.codigo}
                          </Typography>
                          <Warning sx={{ color: COLORS.warning }} />
                        </Box>
                        <Typography variant="body2" sx={{ color: COLORS.textSecondary, mb: 2 }}>
                          {test.prueba.nombre}
                        </Typography>
                        <Button
                          size="small"
                          variant="contained"
                          fullWidth
                          sx={{
                            backgroundColor: COLORS.secondary,
                            '&:hover': { backgroundColor: '#b71c1c' }
                          }}
                          onClick={() => openAddResult(test)}
                        >
                          Agregar
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box textAlign="center" py={4}>
                <Assignment sx={{ fontSize: 48, color: COLORS.success, mb: 2 }} />
                <Typography sx={{ color: COLORS.textSecondary }}>
                  ¡Todas las pruebas están completadas!
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {activeTab === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: COLORS.textPrimary, mb: 3, fontSize: isSmallMobile ? '1.1rem' : '1.25rem' }}>
              Resumen de Progreso
            </Typography>
            <Grid container spacing={isSmallMobile ? 1 : 2} sx={{ mb: 4 }}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ backgroundColor: COLORS.primary, textAlign: 'center', p: isSmallMobile ? 1 : 2 }}>
                  <Typography variant={isSmallMobile ? "h5" : "h4"} sx={{ color: COLORS.textPrimary }}>
                    {stats.total}
                  </Typography>
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                    Total
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ backgroundColor: COLORS.primary, textAlign: 'center', p: isSmallMobile ? 1 : 2 }}>
                  <Typography variant={isSmallMobile ? "h5" : "h4"} sx={{ color: COLORS.success }}>
                    {stats.completadas}
                  </Typography>
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                    Completadas
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ backgroundColor: COLORS.primary, textAlign: 'center', p: isSmallMobile ? 1 : 2 }}>
                  <Typography variant={isSmallMobile ? "h5" : "h4"} sx={{ color: COLORS.warning }}>
                    {stats.pendientes}
                  </Typography>
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                    Pendientes
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ backgroundColor: COLORS.primary, textAlign: 'center', p: isSmallMobile ? 1 : 2 }}>
                  <Typography variant={isSmallMobile ? "h5" : "h4"} sx={{ color: COLORS.secondary }}>
                    {stats.progreso}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                    Progreso
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Diálogo para editar resultado */}
      <Dialog 
        open={openResultDialog} 
        onClose={() => setOpenResultDialog(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            backgroundColor: COLORS.surface,
            color: COLORS.textPrimary
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: COLORS.primary,
          color: COLORS.textPrimary,
          borderBottom: `1px solid ${COLORS.border}`,
          fontSize: isSmallMobile ? '1.1rem' : '1.25rem'
        }}>
          {currentTest?.valor ? 'Editar Resultado' : 'Agregar Resultado'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {currentTest && (
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ color: COLORS.textPrimary, fontSize: isSmallMobile ? '0.9rem' : '1rem' }}>
                {currentTest.prueba.codigo} - {currentTest.prueba.nombre}
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.textSecondary, mb: 3, fontSize: isSmallMobile ? '0.8rem' : '0.9rem' }}>
                {currentTest.prueba.descripcion || 'Sin descripción disponible'}
              </Typography>
              <Divider sx={{ backgroundColor: COLORS.border, mb: 3 }} />
              <TextField
                fullWidth
                label="Resultado"
                value={resultValue}
                onChange={(e) => setResultValue(e.target.value)}
                type={currentTest.prueba.unidad_medida ? 'number' : 'text'}
                inputProps={currentTest.prueba.unidad_medida ? { step: "0.01" } : {}}
                InputProps={{
                  endAdornment: currentTest.prueba.unidad_medida && (
                    <Typography variant="body2" sx={{ color: COLORS.textSecondary, ml: 1 }}>
                      {currentTest.prueba.unidad_medida}
                    </Typography>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: COLORS.textPrimary,
                    '& fieldset': {
                      borderColor: COLORS.border,
                    },
                    '&:hover fieldset': {
                      borderColor: COLORS.textSecondary,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: COLORS.secondary,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: COLORS.textSecondary,
                  }
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          backgroundColor: COLORS.primary,
          borderTop: `1px solid ${COLORS.border}`
        }}>
          <Button 
            onClick={() => setOpenResultDialog(false)}
            sx={{ color: COLORS.textSecondary }}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveResult}
            sx={{
              backgroundColor: COLORS.secondary,
              color: COLORS.textPrimary,
              '&:hover': {
                backgroundColor: '#b71c1c',
              }
            }}
          >
            Guardar Resultado
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para documento */}
      <Dialog 
        open={openDocModal} 
        onClose={() => setOpenDocModal(false)}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        sx={{
          '& .MuiDialog-paper': {
            height: isMobile ? '100vh' : '90vh',
            backgroundColor: COLORS.surface
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: COLORS.primary,
          color: COLORS.textPrimary,
          borderBottom: `1px solid ${COLORS.border}`,
          fontSize: isSmallMobile ? '1.1rem' : '1.25rem'
        }}>
          Documento de la Muestra {muestra}
          <IconButton
            aria-label="close"
            onClick={() => setOpenDocModal(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: COLORS.textSecondary,
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: COLORS.surface, p: isMobile ? 0 : 1 }}>
          <Box sx={{ height: '100%', width: '100%' }}>
            {docUrl && (
              <iframe
                src={docUrl}
                title="Documento de la muestra"
                width="100%"
                height="100%"
                style={{ border: 'none' }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          backgroundColor: COLORS.primary,
          borderTop: `1px solid ${COLORS.border}`
        }}>
          <Button 
            variant="contained"
            sx={{
              backgroundColor: COLORS.secondary,
              color: COLORS.textPrimary,
              '&:hover': {
                backgroundColor: '#b71c1c',
              }
            }}
            onClick={() => {
              window.open(docUrl, '_blank');
              setOpenDocModal(false);
            }}
          >
            Abrir en nueva pestaña
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VistaMuestraIndividual;