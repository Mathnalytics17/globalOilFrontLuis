import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { 
  Chip, 
  Box, 
  Button, 
  Typography, 
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Divider,
  IconButton,
  Card,
  CardContent,
  Grid,
  Avatar,
  Badge,
  Tooltip,
  Collapse
} from '@mui/material';
import { CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScienceIcon from '@mui/icons-material/Science';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

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
};

const DEFAULT_TESTS_BY_CATEGORY = {
  'Físicos': [
    'Apariencia', 'Olor', 'Viscosidad Cinemática 40°C', 'Viscosidad Cinemática 100° C',
    'Índice de Viscosidad', 'Punto de Chispa', 'Densidad @15°C', 'Espuma Seq I', 
    'Espuma Seq II', 'Espuma Seq III'
  ],
  'Químicos': [
    'Nitración', 'Oxidación', 'Hollín', 'Sulfatación', 'TAN', 'TBN', 'Agua',
    'Nivel de Contaminacion'
  ],
  'Metales': [
    'Plata (Ag)', 'Aluminio (Al)', 'Boro (B)', 'Ba', 'Ca', 'Cd', 'Cr', 'Cu', 'Fe', 
    'K', 'Li', 'Mg', 'Mn', 'Mo', 'Na', 'Ni', 'P', 'Pb', 'Sb', 'Si', 'Sn', 'Ti', 'V', 'Zn'
  ],
  'Otros': ['O']
};

// Componente para mostrar el estado de la prueba
const TestStatus = ({ test }) => {
  if (test.completada) {
    return (
      <Tooltip title="Completada">
        <CheckCircleIcon sx={{ color: COLORS.success, fontSize: 20 }} />
      </Tooltip>
    );
  }
  if (test.is_used) {
    return (
      <Tooltip title="Activa - Pendiente">
        <PendingIcon sx={{ color: COLORS.warning, fontSize: 20 }} />
      </Tooltip>
    );
  }
  return (
    <Tooltip title="Inactiva">
      <CancelIcon sx={{ color: COLORS.textSecondary, fontSize: 20 }} />
    </Tooltip>
  );
};

// Componente para mostrar pruebas en cards
const TestCard = ({ test }) => (
  <Card 
    sx={{ 
      backgroundColor: COLORS.surface,
      border: `1px solid ${test.is_used ? COLORS.secondary : COLORS.border}`,
      opacity: test.is_used ? 1 : 0.6,
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: `0 4px 8px rgba(0,0,0,0.3)`,
      }
    }}
  >
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between">
        <Box flex={1}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              color: COLORS.textPrimary,
              fontWeight: 'bold',
              lineHeight: 1.2,
              mb: 0.5
            }}
          >
            {test.prueba.codigo}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: COLORS.textSecondary,
              fontSize: '0.75rem',
              lineHeight: 1.2,
              mb: 1
            }}
          >
            {test.prueba.nombre}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: COLORS.textSecondary,
              fontSize: '0.7rem'
            }}
          >
            Por: {test.usuario_solicitud?.first_name || 'N/A'}
          </Typography>
        </Box>
        <TestStatus test={test} />
      </Box>
    </CardContent>
  </Card>
);

// Componente para mostrar pruebas en chips compactos
const TestChipCompact = ({ test }) => (
  <Tooltip 
    title={`${test.prueba.nombre} - ${test.completada ? 'Completada' : test.is_used ? 'Activa' : 'Inactiva'}`}
  >
    <Chip
      size="small"
      label={test.prueba.codigo}
      sx={{
        backgroundColor: test.completada ? COLORS.success : 
                        test.is_used ? COLORS.secondary : COLORS.border,
        color: COLORS.textPrimary,
        fontSize: '0.7rem',
        height: '24px',
        '& .MuiChip-label': {
          px: 1
        }
      }}
      avatar={
        <Avatar sx={{ 
          width: 16, 
          height: 16,
          backgroundColor: 'transparent',
          fontSize: '0.6rem'
        }}>
          {test.completada ? '✓' : test.is_used ? '!' : '×'}
        </Avatar>
      }
    />
  </Tooltip>
);

// Componente para grupo de pruebas jerárquicas
const TestGroup = ({ parentTest, subTests, selectedTests, onTestToggle, onGroupToggle }) => {
  const [expanded, setExpanded] = useState(false);
  
  const allSubTestsSelected = subTests.every(sub => selectedTests.includes(sub.id));
  const someSubTestsSelected = subTests.some(sub => selectedTests.includes(sub.id));
  
  const isParentSelected = selectedTests.includes(parentTest.id);
  const shouldShowParentAsSelected = isParentSelected || someSubTestsSelected;

  return (
    <Box 
      sx={{ 
        p: 2,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 1,
        backgroundColor: COLORS.primary,
        mb: 1
      }}
    >
      {/* Prueba padre */}
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1} flex={1}>
          <Chip
            label={`${parentTest.codigo} - ${parentTest.nombre}`}
            color={shouldShowParentAsSelected ? 'primary' : 'default'}
            onClick={() => onGroupToggle(parentTest.id, !shouldShowParentAsSelected)}
            onDelete={shouldShowParentAsSelected ? () => onGroupToggle(parentTest.id, false) : null}
            deleteIcon={<AddIcon />}
            variant={shouldShowParentAsSelected ? 'filled' : 'outlined'}
            sx={{
              backgroundColor: shouldShowParentAsSelected ? COLORS.secondary : 'transparent',
              color: shouldShowParentAsSelected ? COLORS.textPrimary : COLORS.textSecondary,
              borderColor: shouldShowParentAsSelected ? COLORS.secondary : COLORS.border,
              '&:hover': {
                backgroundColor: shouldShowParentAsSelected ? '#b71c1c' : 'rgba(217, 217, 217, 0.1)',
                borderColor: COLORS.secondary
              },
              '& .MuiChip-deleteIcon': {
                color: shouldShowParentAsSelected ? COLORS.textPrimary : COLORS.textSecondary,
                '&:hover': {
                  color: COLORS.textPrimary
                }
              }
            }}
          />
          
          <Tooltip title={`${subTests.length} subpruebas`}>
            <Chip 
              label={subTests.length}
              size="small"
              variant="outlined"
              sx={{ 
                color: COLORS.textSecondary, 
                borderColor: COLORS.border,
                fontSize: '0.6rem'
              }}
            />
          </Tooltip>
        </Box>
        
        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title={allSubTestsSelected ? "Deseleccionar todo" : "Seleccionar todo"}>
            <Button
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.7rem',
                height: '24px',
                minWidth: 'auto',
                borderColor: COLORS.border,
                color: COLORS.textSecondary
              }}
              onClick={() => onGroupToggle(parentTest.id, !allSubTestsSelected)}
            >
              {allSubTestsSelected ? '✗ Todo' : '✓ Todo'}
            </Button>
          </Tooltip>
          
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ color: COLORS.textSecondary }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      {/* Subpruebas */}
      <Collapse in={expanded}>
        <Box display="flex" flexWrap="wrap" gap={1} mt={2} pl={2}>
          {subTests.map(subprueba => (
            <Chip
              key={subprueba.id}
              label={`${subprueba.codigo} - ${subprueba.nombre}`}
              size="small"
              color={selectedTests.includes(subprueba.id) ? 'primary' : 'default'}
              onClick={() => onTestToggle(subprueba.id)}
              onDelete={selectedTests.includes(subprueba.id) ? () => onTestToggle(subprueba.id) : null}
              deleteIcon={<AddIcon />}
              variant={selectedTests.includes(subprueba.id) ? 'filled' : 'outlined'}
              sx={{
                backgroundColor: selectedTests.includes(subprueba.id) ? COLORS.secondary : 'transparent',
                color: selectedTests.includes(subprueba.id) ? COLORS.textPrimary : COLORS.textSecondary,
                borderColor: selectedTests.includes(subprueba.id) ? COLORS.secondary : COLORS.border,
                fontSize: '0.65rem',
                height: '24px',
                '&:hover': {
                  backgroundColor: selectedTests.includes(subprueba.id) ? '#b71c1c' : 'rgba(217, 217, 217, 0.1)',
                  borderColor: COLORS.secondary
                },
                '& .MuiChip-deleteIcon': {
                  color: selectedTests.includes(subprueba.id) ? COLORS.textPrimary : COLORS.textSecondary,
                  '&:hover': {
                    color: COLORS.textPrimary
                  }
                }
              }}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

const EnsayosMuestra = () => {
  const { api, user } = useAuth();
  const router = useRouter();
  const muestraId = router?.query?.muestra;
  const [allTests, setAllTests] = useState([]);
  const [allSampleTests, setAllSampleTests] = useState([]);
  const [sampleTests, setSampleTests] = useState([]);
  const [selectedTests, setSelectedTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openDefaultModal, setOpenDefaultModal] = useState(false);
  const [viewMode, setViewMode] = useState('cards');
  const [selectedCategories, setSelectedCategories] = useState({
    'Físicos': true,
    'Químicos': true,
    'Metales': true,
    'Otros': true
  });

useEffect(() => {
  const fetchData = async () => {
    if (!muestraId) return;
    
    try {
      const [testsRes, sampleTestsRes] = await Promise.all([
        api.get('lubrication/tests/'),
        api.get(`lubrication/sample-tests/by-sample/${muestraId}/`)
      ]);

      setAllTests(testsRes.data);
      setSampleTests(sampleTestsRes.data);
      
      // CORRECCIÓN: Cambiar el filtro
      const initialSelectedTests = new Set();
      sampleTestsRes.data
        .filter(test => test.estatus !== 'inactivo') // Filtra por estatus en lugar de is_used
        .forEach(test => {
          const testId = test.prueba.id;
          initialSelectedTests.add(testId);
          
          if (test.prueba.is_subPrueba && test.prueba.parent_node) {
            initialSelectedTests.add(test.prueba.parent_node);
          }
        });
      
      console.log('Pruebas cargadas:', sampleTestsRes.data.length);
      console.log('Pruebas activas:', sampleTestsRes.data.filter(test => test.estatus !== 'inactivo').length);
      console.log('SelectedTests inicializados:', Array.from(initialSelectedTests));
      
      setSelectedTests(Array.from(initialSelectedTests));

    } catch (error) {
      toast.error('Error al cargar datos: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [api, muestraId]);

  // Función para obtener todas las subpruebas de una prueba padre
  const getSubpruebas = (parentId) => {
    return allTests.filter(test => 
      test.is_subPrueba && test.parent_node === parentId
    );
  };

  // Función para obtener pruebas padres (que no son subpruebas)
  const getParentTests = () => {
    return allTests.filter(test => !test.is_subPrueba);
  };

  // Función para obtener pruebas que tienen subpruebas
  const getTestsWithSubpruebas = () => {
    const parentTests = getParentTests();
    return parentTests.filter(parent => {
      const subpruebas = getSubpruebas(parent.id);
      return subpruebas.length > 0;
    });
  };

  // Función para obtener pruebas individuales (sin subpruebas)
  const getIndividualTests = () => {
    const parentTests = getParentTests();
    return parentTests.filter(parent => {
      const subpruebas = getSubpruebas(parent.id);
      return subpruebas.length === 0;
    });
  };

  // Función mejorada para manejar la selección de subpruebas individuales
  const handleTestToggle = (testId) => {
    const test = allTests.find(t => t.id === testId);
    
    setSelectedTests(prev => {
      const newSelected = new Set(prev);
      
      if (newSelected.has(testId)) {
        // Deseleccionar
        newSelected.delete(testId);
        
        // Si es una subprueba, verificar si hay que deseleccionar el padre
        if (test.is_subPrueba && test.parent_node) {
          const parentId = test.parent_node;
          const otrasSubpruebas = getSubpruebas(parentId).filter(
            sub => sub.id !== testId && newSelected.has(sub.id)
          );
          // Si no quedan subpruebas seleccionadas, deseleccionar el padre
          if (otrasSubpruebas.length === 0) {
            newSelected.delete(parentId);
          }
        }
      } else {
        // Seleccionar
        newSelected.add(testId);
        
        // Si es una subprueba, seleccionar también su padre
        if (test.is_subPrueba && test.parent_node) {
          newSelected.add(test.parent_node);
        }
      }
      
      return Array.from(newSelected);
    });
  };

  // Función para seleccionar/deseleccionar un grupo completo (padre + subpruebas)
  const handleGroupToggle = (parentId, select) => {
    const parentTest = allTests.find(t => t.id === parentId);
    const subpruebas = getSubpruebas(parentId);
    
    setSelectedTests(prev => {
      const newSelected = new Set(prev);
      
      if (select) {
        // Seleccionar grupo completo
        newSelected.add(parentId);
        subpruebas.forEach(sub => newSelected.add(sub.id));
      } else {
        // Deseleccionar grupo completo
        newSelected.delete(parentId);
        subpruebas.forEach(sub => newSelected.delete(sub.id));
      }
      
      return Array.from(newSelected);
    });
  };

  // Organizar pruebas para mostrar
  const getOrganizedTests = () => {
    const testsWithSubpruebas = getTestsWithSubpruebas();
    const individualTests = getIndividualTests();
    
    return {
      grouped: testsWithSubpruebas.map(parent => ({
        ...parent,
        subpruebas: getSubpruebas(parent.id)
      })),
      individual: individualTests
    };
  };

  const organizedTests = getOrganizedTests();

  // Contadores para el resumen
  const stats = {
    total: sampleTests.length,
    active: sampleTests.filter(t => t.is_used).length,
    completed: sampleTests.filter(t => t.completada).length,
    inactive: sampleTests.filter(t => !t.is_used).length
  };

  const handleCategoryToggle = (category) => {
    setSelectedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

const applyDefaultTests = async () => {
  try {
    const categoriesToInclude = Object.keys(selectedCategories).filter(
      cat => selectedCategories[cat]
    );
    
    const defaultTestsForSelectedCategories = categoriesToInclude.flatMap(
      cat => DEFAULT_TESTS_BY_CATEGORY[cat]
    );
    
    const defaultTestIds = allTests
      .filter(test => defaultTestsForSelectedCategories.includes(test.nombre))
      .map(test => test.id);
    
    // Incluir automáticamente los padres de las subpruebas seleccionadas
    const testsWithParents = new Set(defaultTestIds);
    defaultTestIds.forEach(testId => {
      const test = allTests.find(t => t.id === testId);
      if (test?.is_subPrueba && test.parent_node) {
        testsWithParents.add(test.parent_node);
      }
    });

    const finalTestIds = Array.from(testsWithParents);
    
    // Obtener pruebas actuales
    const existingTestsResponse = await api.get(`lubrication/sample-tests/by-sample/${muestraId}/`);
    const existingTestsForSample = existingTestsResponse.data;

    // ACTUALIZAR EL ESTADO DE LA MUESTRA
    await api.patch(`lubrication/samples/${muestraId}/`, {
      is_ingresado: true
    });

    // Desactivar todas las pruebas existentes que no están en las predeterminadas
    const testsToDeactivate = existingTestsForSample.filter(
      test => !finalTestIds.includes(test.prueba.id)
    );

    await Promise.all(testsToDeactivate.map(test => 
      api.patch(`lubrication/sample-tests/${test.id}/`, { 
        estatus: 'inactivo',
        is_used: false 
      })
    ));

    // Eliminar pruebas no completadas que no están en las predeterminadas
    const testsToRemove = testsToDeactivate.filter(
      test => !test.completada
    );
    
    await Promise.all(testsToRemove.map(test => 
      api.delete(`lubrication/sample-tests/${test.id}/`)
    ));

    const currentTestIds = existingTestsForSample.map(
      st => st.prueba.id
    );
    
    // Solo agregar las pruebas que no existen actualmente
    const testsToAdd = finalTestIds.filter(id => !currentTestIds.includes(id));
    
    await Promise.all(testsToAdd.map(testId =>
      api.post('lubrication/sample-tests/', {
        muestra: muestraId,
        prueba: testId,
        usuario_solicitud: user.id,
        estatus: 'pendiente',
        
      })
    ));

    // Reactivar pruebas predeterminadas que estaban inactivas
    const testsToReactivate = existingTestsForSample.filter(
      test => finalTestIds.includes(test.prueba.id) && test.estatus === 'inactivo'
    );
    
    await Promise.all(testsToReactivate.map(test => 
      api.patch(`lubrication/sample-tests/${test.id}/`, { 
        estatus: 'pendiente',
       
      }))
    );

    // Recargar datos actualizados
    const updatedSampleTestsRes = await api.get(`lubrication/sample-tests/by-sample/${muestraId}/`);
    setSampleTests(updatedSampleTestsRes.data);
    
    // Actualizar la selección
    setSelectedTests(finalTestIds);
    
    setOpenDefaultModal(false);
    toast.success(`Pruebas predeterminadas aplicadas para ${categoriesToInclude.join(', ')}`);
    
  } catch (error) {
    toast.error('Error al aplicar pruebas por defecto: ' + (error.response?.data?.message || error.message));
  }
};

const saveTests = async () => {
  try {
    if (!muestraId) {
      toast.error('No se ha seleccionado ninguna muestra');
      return;
    }

    // Obtener las pruebas actuales de esta muestra
    const existingTestsResponse = await api.get(`lubrication/sample-tests/by-sample/${muestraId}/`);
    const existingTestsForSample = existingTestsResponse.data;
    
    const currentTestIds = existingTestsForSample.map(
      st => st.prueba.id
    );
    
    // Pruebas a desactivar (las que no están en la nueva selección)
    const testsToDeactivate = existingTestsForSample.filter(
      test => !selectedTests.includes(test.prueba.id)
    );

    // Desactivar pruebas que ya no están seleccionadas
    await Promise.all(testsToDeactivate.map(test => 
      api.patch(`lubrication/sample-tests/${test.id}/`, { 
        estatus: 'inactivo',
        is_used: false 
      })
    ));

    // Eliminar pruebas no completadas que ya no están seleccionadas
    const testsToRemove = testsToDeactivate.filter(
      test => !test.completada
    );
    
    await Promise.all(testsToRemove.map(test => 
      api.delete(`lubrication/sample-tests/${test.id}/`)
    ));

    // Pruebas a agregar (las nuevas que no existen actualmente)
    const testsToAdd = selectedTests.filter(id => 
      !currentTestIds.includes(id)
    );
    
    console.log('Pruebas a agregar:', testsToAdd);
    
    // Crear nuevas pruebas
    await Promise.all(testsToAdd.map(testId =>
      api.post('lubrication/sample-tests/', {
        muestra: muestraId,
        prueba: testId,
        usuario_solicitud: user.id,
        estatus: 'pendiente',
        is_used: true
      })
    ));

    // Reactivar pruebas que estaban inactivas pero ahora están seleccionadas
    const testsToReactivate = existingTestsForSample.filter(
      test => selectedTests.includes(test.prueba.id) && test.estatus === 'inactivo'
    );
    
    await Promise.all(testsToReactivate.map(test => 
      api.patch(`lubrication/sample-tests/${test.id}/`, { 
        estatus: 'pendiente',
        is_used: true 
      })
    ));

    // ACTUALIZAR EL ESTADO DE LA MUESTRA
    await api.patch(`lubrication/samples/${muestraId}/`, {
      is_ingresado: true
    });

    // Recargar los datos actualizados
    const updatedSampleTestsRes = await api.get(`lubrication/sample-tests/by-sample/${muestraId}/`);
    setSampleTests(updatedSampleTestsRes.data);
    
    toast.success(`Pruebas actualizadas correctamente para la muestra ${muestraId}`);
    
  } catch (error) {
    console.error('Error detallado:', error);
    toast.error('Error al guardar: ' + (error.response?.data?.message || error.message));
  }
};

  const startTests = () => {
    router.push(`/muestras/ensayos-muestra/ingreso-ensayos?muestra=${muestraId}`);
  };

  const openCreateTest = () => {
    setOpenCreateModal(true);
  };

  const closeCreateModal = () => {
    setOpenCreateModal(false);
    const fetchData = async () => {
      try {
        const testsRes = await api.get('lubrication/tests/');
        setAllTests(testsRes.data);
      } catch (error) {
        toast.error('Error al cargar pruebas: ' + (error.response?.data?.message || error.message));
      }
    };
    fetchData();
  };

  const navigateToTests = () => {
    router.push('/pruebas');
  };

  const goBack = () => {
    router.push('/muestras');
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
        <CircularProgress 
          sx={{ 
            color: 'red'
          }} 
        />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: COLORS.background,
      minHeight: '100vh',
      color: COLORS.textPrimary
    }}>
      {/* Header */}
      <Box 
        sx={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          mb: 4,
          p: 3,
          backgroundColor: COLORS.surface,
          borderRadius: 2,
          border: `1px solid ${COLORS.border}`
        }}
      >
        <Box display="flex" alignItems="center">
          <IconButton 
            onClick={goBack} 
            sx={{ 
              mr: 2,
              color: COLORS.textPrimary,
              '&:hover': {
                backgroundColor: 'rgba(211, 47, 47, 0.1)'
              }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ color: COLORS.textPrimary, fontWeight: 'bold' }}>
            Ensayos para Muestra <span style={{ color: COLORS.secondary }}>#{muestraId}</span>
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
        <Button 
  variant="contained" 
  sx={{
    backgroundColor: COLORS.secondary,
    color: COLORS.textPrimary,
    '&:hover': {
      backgroundColor: '#b71c1c',
    },
    '&:disabled': {
      backgroundColor: COLORS.border,
      color: COLORS.textSecondary
    }
  }}
  startIcon={<PlayArrowIcon />}
  onClick={startTests}
  disabled={sampleTests.filter(t => t.estatus === 'pendiente' || t.estatus === 'en_proceso').length === 0}
>
  Iniciar Ensayos
</Button>
          <Button 
            variant="outlined"
            sx={{
              borderColor: COLORS.secondary,
              color: COLORS.secondary,
              '&:hover': {
                borderColor: '#b71c1c',
                backgroundColor: 'rgba(211, 47, 47, 0.1)'
              }
            }}
            startIcon={<ScienceIcon />}
            onClick={openCreateTest}
          >
            Agregar Pruebas
          </Button>
          <Button 
            variant="outlined"
            sx={{
              borderColor: COLORS.textSecondary,
              color: COLORS.textSecondary,
              '&:hover': {
                borderColor: COLORS.textPrimary,
                color: COLORS.textPrimary,
                backgroundColor: 'rgba(217, 217, 217, 0.1)'
              }
            }}
            startIcon={<SettingsIcon />}
            onClick={() => setOpenDefaultModal(true)}
          >
            Ensayos por Defecto
          </Button>
          <Button 
            variant="outlined"
            sx={{
              borderColor: COLORS.textSecondary,
              color: COLORS.textSecondary,
              '&:hover': {
                borderColor: COLORS.textPrimary,
                color: COLORS.textPrimary,
                backgroundColor: 'rgba(217, 217, 217, 0.1)'
              }
            }}
            startIcon={<VisibilityIcon />}
            onClick={navigateToTests}
          >
            Ver Pruebas
          </Button>
        </Box>
      </Box>

      {/* Selección de pruebas - VISTA MEJORADA CON JERARQUÍA */}
      <Box 
        sx={{ 
          mb: 4,
          p: 3,
          backgroundColor: COLORS.surface,
          borderRadius: 2,
          border: `1px solid ${COLORS.border}`
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ color: COLORS.textPrimary }}>
            Seleccione las pruebas a realizar:
          </Typography>
          <Button 
            variant="outlined" 
            size="small"
            sx={{
              borderColor: COLORS.textSecondary,
              color: COLORS.textSecondary,
              '&:hover': {
                borderColor: COLORS.secondary,
                color: COLORS.secondary
              }
            }}
            onClick={() => setSelectedTests([])}
          >
            Limpiar selección
          </Button>
        </Box>
        
        {/* Grupos de pruebas con subpruebas */}
        {organizedTests.grouped.length > 0 && (
          <Box mb={3}>
            <Typography variant="subtitle1" sx={{ color: COLORS.textPrimary, mb: 2 }}>
              Pruebas con Subpruebas ({organizedTests.grouped.length})
            </Typography>
            {organizedTests.grouped.map(group => (
              <TestGroup
                key={group.id}
                parentTest={group}
                subTests={group.subpruebas}
                selectedTests={selectedTests}
                onTestToggle={handleTestToggle}
                onGroupToggle={handleGroupToggle}
              />
            ))}
          </Box>
        )}
        
        {/* Pruebas individuales */}
        {organizedTests.individual.length > 0 && (
          <Box>
            <Typography variant="subtitle1" sx={{ color: COLORS.textPrimary, mb: 2 }}>
              Pruebas Individuales ({organizedTests.individual.length})
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {organizedTests.individual.map(test => (
                <Chip
                  key={test.id}
                  label={`${test.codigo} - ${test.nombre}`}
                  color={selectedTests.includes(test.id) ? 'primary' : 'default'}
                  onClick={() => handleTestToggle(test.id)}
                  onDelete={selectedTests.includes(test.id) ? () => handleTestToggle(test.id) : null}
                  deleteIcon={<AddIcon />}
                  variant={selectedTests.includes(test.id) ? 'filled' : 'outlined'}
                  sx={{
                    backgroundColor: selectedTests.includes(test.id) ? COLORS.secondary : 'transparent',
                    color: selectedTests.includes(test.id) ? COLORS.textPrimary : COLORS.textSecondary,
                    borderColor: selectedTests.includes(test.id) ? COLORS.secondary : COLORS.border,
                    '&:hover': {
                      backgroundColor: selectedTests.includes(test.id) ? '#b71c1c' : 'rgba(217, 217, 217, 0.1)',
                      borderColor: COLORS.secondary
                    },
                    '& .MuiChip-deleteIcon': {
                      color: selectedTests.includes(test.id) ? COLORS.textPrimary : COLORS.textSecondary,
                      '&:hover': {
                        color: COLORS.textPrimary
                      }
                    }
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
        
        <Button 
          variant="contained" 
          sx={{
            mt: 3,
            backgroundColor: COLORS.primary,
            color: COLORS.textPrimary,
            border: `1px solid ${COLORS.border}`,
            '&:hover': {
              backgroundColor: COLORS.secondary,
            },
            '&:disabled': {
              backgroundColor: COLORS.border,
              color: COLORS.textSecondary
            }
          }}
          onClick={saveTests}
          disabled={selectedTests.length === 0}
        >
          Guardar Pruebas Seleccionadas ({selectedTests.length})
        </Button>
      </Box>

      {/* Pruebas asignadas */}
      <Box
        sx={{
          p: 3,
          backgroundColor: COLORS.surface,
          borderRadius: 2,
          border: `1px solid ${COLORS.border}`
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" sx={{ color: COLORS.textPrimary }}>
            Pruebas Asignadas
          </Typography>
          
          {/* Resumen de estadísticas */}
          <Box display="flex" gap={2}>
            <Tooltip title="Total de pruebas">
              <Chip 
                label={`Total: ${stats.total}`}
                size="small"
                variant="outlined"
                sx={{ color: COLORS.textSecondary, borderColor: COLORS.border }}
              />
            </Tooltip>
            <Tooltip title="Pruebas activas">
              <Chip 
                label={`Activas: ${stats.active}`}
                size="small"
                sx={{ 
                  backgroundColor: COLORS.secondary, 
                  color: COLORS.textPrimary 
                }}
              />
            </Tooltip>
            <Tooltip title="Pruebas completadas">
              <Chip 
                label={`Completadas: ${stats.completed}`}
                size="small"
                sx={{ 
                  backgroundColor: COLORS.success, 
                  color: COLORS.textPrimary 
                }}
              />
            </Tooltip>
          </Box>
        </Box>

        {sampleTests?.length > 0 ? (
          <>
            {/* Selector de vista */}
            <Box display="flex" gap={1} mb={3}>
              <Button
                size="small"
                variant={viewMode === 'cards' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('cards')}
                sx={{
                  backgroundColor: viewMode === 'cards' ? COLORS.secondary : 'transparent',
                  color: viewMode === 'cards' ? COLORS.textPrimary : COLORS.textSecondary,
                  borderColor: COLORS.border,
                  '&:hover': {
                    backgroundColor: viewMode === 'cards' ? '#b71c1c' : 'rgba(217, 217, 217, 0.1)'
                  }
                }}
              >
                Vista Tarjetas
              </Button>
              <Button
                size="small"
                variant={viewMode === 'chips' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('chips')}
                sx={{
                  backgroundColor: viewMode === 'chips' ? COLORS.secondary : 'transparent',
                  color: viewMode === 'chips' ? COLORS.textPrimary : COLORS.textSecondary,
                  borderColor: COLORS.border,
                  '&:hover': {
                    backgroundColor: viewMode === 'chips' ? '#b71c1c' : 'rgba(217, 217, 217, 0.1)'
                  }
                }}
              >
                Vista Compacta
              </Button>
            </Box>

            {/* Vista en Tarjetas (Grid) */}
            {viewMode === 'cards' && (
              <Grid container spacing={2}>
                {sampleTests.map((test) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={test.id}>
                    <TestCard test={test} />
                  </Grid>
                ))}
              </Grid>
            )}

            {/* Vista en Chips Compactos */}
            {viewMode === 'chips' && (
              <Box display="flex" flexWrap="wrap" gap={1}>
                {sampleTests.map((test) => (
                  <TestChipCompact key={test.id} test={test} />
                ))}
              </Box>
            )}
          </>
        ) : (
          <Typography variant="body1" sx={{ color: COLORS.textSecondary, textAlign: 'center', py: 4 }}>
            No hay pruebas asignadas aún
          </Typography>
        )}
      </Box>

      {/* Modal para crear nueva prueba */}
      <Dialog
        open={openCreateModal}
        onClose={closeCreateModal}
        maxWidth="md"
        fullWidth
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
          borderBottom: `1px solid ${COLORS.border}`
        }}>
          Crear Nueva Prueba
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: COLORS.surface, p: 0 }}>
          <iframe 
            src={`/pruebas/create-pruebas`} 
            style={{ width: '100%', height: '500px', border: 'none' }}
            title="Crear nueva prueba"
          />
        </DialogContent>
        <DialogActions sx={{ 
          backgroundColor: COLORS.primary,
          borderTop: `1px solid ${COLORS.border}`
        }}>
          <Button 
            onClick={closeCreateModal}
            sx={{ color: COLORS.textSecondary }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para ensayos por defecto */}
      <Dialog
        open={openDefaultModal}
        onClose={() => setOpenDefaultModal(false)}
        maxWidth="sm"
        fullWidth
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
          borderBottom: `1px solid ${COLORS.border}`
        }}>
          Seleccionar Ensayos por Defecto
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: COLORS.surface }}>
          <Typography variant="body1" gutterBottom sx={{ color: COLORS.textPrimary, mt: 2 }}>
            Seleccione las categorías de pruebas que desea incluir como predeterminadas:
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', ml: 3, mt: 2 }}>
            {Object.keys(DEFAULT_TESTS_BY_CATEGORY).map(category => (
              <FormControlLabel
                key={category}
                control={
                  <Checkbox 
                    checked={selectedCategories[category]} 
                    onChange={() => handleCategoryToggle(category)}
                    sx={{
                      color: COLORS.secondary,
                      '&.Mui-checked': {
                        color: COLORS.secondary,
                      }
                    }}
                  />
                }
                label={
                  <Typography sx={{ color: COLORS.textPrimary }}>
                    {`${category} (${DEFAULT_TESTS_BY_CATEGORY[category].length} pruebas)`}
                  </Typography>
                }
              />
            ))}
          </Box>
          
          <Divider sx={{ my: 2, backgroundColor: COLORS.border }} />
          
          <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
            Las pruebas seleccionadas reemplazarán la selección actual.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ 
          backgroundColor: COLORS.primary,
          borderTop: `1px solid ${COLORS.border}`
        }}>
          <Button 
            onClick={() => setOpenDefaultModal(false)}
            sx={{ color: COLORS.textSecondary }}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={applyDefaultTests}
            disabled={Object.values(selectedCategories).every(val => !val)}
            sx={{
              backgroundColor: COLORS.secondary,
              color: COLORS.textPrimary,
              '&:hover': {
                backgroundColor: '#b71c1c',
              },
              '&:disabled': {
                backgroundColor: COLORS.border,
                color: COLORS.textSecondary
              }
            }}
          >
            Aplicar Selección
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnsayosMuestra;