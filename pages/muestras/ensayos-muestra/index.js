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
  IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScienceIcon from '@mui/icons-material/Science';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

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

const EnsayosMuestra = () => {
  const { api, user } = useAuth();
  const router = useRouter();
  const muestraId = router?.query?.muestra;
  const [allTests, setAllTests] = useState([]);
  const [sampleTests, setSampleTests] = useState([]);
  const [selectedTests, setSelectedTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openDefaultModal, setOpenDefaultModal] = useState(false);
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
          api.get(`lubrication/sample-tests/?muestra=${muestraId}`)
        ]);
        
        setAllTests(testsRes.data);
        setSampleTests(sampleTestsRes.data);
        setSelectedTests(sampleTestsRes.data.map(st => st.prueba.id));

      } catch (error) {
        toast.error('Error al cargar datos: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api, muestraId]);

  const handleTestToggle = (testId) => {
    setSelectedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId) 
        : [...prev, testId]
    );
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
      
      // 1. Desactivar todos los tests existentes (is_used: false)
      await Promise.all(sampleTests.map(test => 
        api.patch(`lubrication/sample-tests/${test.id}/`, { is_used: false })
      ));

      // 2. Eliminar los que no están en la nueva selección
      const testsToRemove = sampleTests.filter(
        test => !defaultTestIds.includes(test.prueba.id)
      );
      await Promise.all(testsToRemove.map(test => 
        api.delete(`lubrication/sample-tests/${test.id}/`)
      ));

      // 3. Agregar los nuevos con is_used: true
      const currentTestIds = sampleTests.map(st => st.prueba.id);
      const testsToAdd = defaultTestIds.filter(id => !currentTestIds.includes(id));
      
      await Promise.all(testsToAdd.map(testId =>
        api.post('lubrication/sample-tests/', {
          muestra: muestraId,
          prueba: testId,
          usuario_solicitud: user.id,
          is_used: true
        })
      ));

      // Actualizar estado local
      const updatedSampleTests = await api.get(`lubrication/sample-tests/?muestra=${muestraId}`);
      setSampleTests(updatedSampleTests.data);
      setSelectedTests(defaultTestIds);
      
      setOpenDefaultModal(false);
      toast.success(`Pruebas predeterminadas aplicadas para ${categoriesToInclude.join(', ')}`);
      
    } catch (error) {
      toast.error('Error al aplicar pruebas por defecto: ' + (error.response?.data?.message || error.message));
    }
  };

  const saveTests = async () => {
    try {
      const currentTestIds = sampleTests.map(st => st.prueba.id);
      
      // 1. Desactivar los tests que se están eliminando
      const testsToDeactivate = sampleTests.filter(
        test => !selectedTests.includes(test.prueba.id)
      );
      await Promise.all(testsToDeactivate.map(test => 
        api.patch(`lubrication/sample-tests/${test.id}/`, { is_used: false })
      ));

      // 2. Eliminar completamente los tests deseleccionados
      const testsToRemove = testsToDeactivate.filter(t => !t.completada); // Solo eliminar si no están completados
      await Promise.all(testsToRemove.map(test => 
        api.delete(`lubrication/sample-tests/${test.id}/`)
      ));

      // 3. Agregar nuevos tests con is_used: true
      const testsToAdd = selectedTests.filter(id => !currentTestIds.includes(id));
      await Promise.all(testsToAdd.map(testId =>
        api.post('lubrication/sample-tests/', {
          muestra: muestraId,
          prueba: testId,
          usuario_solicitud: user.id,
          is_used: true
        })
      ));

      // 4. Reactivar los tests que se mantienen seleccionados
      const testsToReactivate = sampleTests.filter(
        test => selectedTests.includes(test.prueba.id)
      );
      await Promise.all(testsToReactivate.map(test => 
        api.patch(`lubrication/sample-tests/${test.id}/`, { is_used: true })
      ));

      // Actualizar estado local
      const updatedSampleTests = await api.get(`lubrication/sample-tests/?muestra=${muestraId}`);
      setSampleTests(updatedSampleTests.data);
      
      toast.success('Pruebas actualizadas correctamente');
      
    } catch (error) {
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
    return <div>Cargando datos...</div>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box display="flex" alignItems="center">
          <IconButton onClick={goBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">Ensayos para Muestra #{muestraId}</Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<PlayArrowIcon />}
            onClick={startTests}
            disabled={sampleTests.filter(t => t.is_used).length === 0}
          >
            Iniciar Ensayos
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<ScienceIcon />}
            onClick={openCreateTest}
          >
            Agregar Pruebas
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<SettingsIcon />}
            onClick={() => setOpenDefaultModal(true)}
          >
            Ensayos por Defecto
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<VisibilityIcon />}
            onClick={navigateToTests}
          >
            Ver Pruebas
          </Button>
        </Box>
      </Box>

      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Seleccione las pruebas a realizar:</Typography>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => setSelectedTests([])}
          >
            Limpiar selección
          </Button>
        </Box>
        
        <Box display="flex" flexWrap="wrap" gap={1} mb={3}>
          {allTests.map(test => (
            <Chip
              key={test.id}
              label={`${test.codigo} - ${test.nombre}`}
              color={selectedTests.includes(test.id) ? 'primary' : 'default'}
              onClick={() => handleTestToggle(test.id)}
              onDelete={selectedTests.includes(test.id) ? () => handleTestToggle(test.id) : null}
              deleteIcon={<AddIcon />}
              variant={selectedTests.includes(test.id) ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={saveTests}
          disabled={selectedTests.length === 0}
          sx={{ mr: 2 }}
        >
          Guardar Pruebas Seleccionadas
        </Button>
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>Pruebas asignadas actualmente:</Typography>
        {sampleTests.length > 0 ? (
          <List dense>
            {sampleTests.map(test => (
              <ListItem key={test.id}>
                <ListItemText
                  primary={`${test.prueba.codigo} - ${test.prueba.nombre}`}
                  secondary={
                    <>
                      {`Solicitado por: ${test.usuario_solicitud?.first_name || 'Usuario desconocido'}`}
                      <br />
                      {`Estado: ${test.is_used ? 'Activo' : 'Inactivo'} ${test.completada ? '| Completado' : ''}`}
                    </>
                  }
                  sx={{ opacity: test.is_used ? 1 : 0.6 }}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body1">No hay pruebas asignadas aún</Typography>
        )}
      </Box>

      {/* Modales... (mantener igual que en el código anterior) */}
      <Dialog
        open={openCreateModal}
        onClose={closeCreateModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Crear Nueva Prueba</DialogTitle>
        <DialogContent>
          <iframe 
            src={`/pruebas/create-pruebas`} 
            style={{ width: '100%', height: '500px', border: 'none' }}
            title="Crear nueva prueba"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreateModal}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDefaultModal}
        onClose={() => setOpenDefaultModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Seleccionar Ensayos por Defecto</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Seleccione las categorías de pruebas que desea incluir como predeterminadas:
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', ml: 3 }}>
            {Object.keys(DEFAULT_TESTS_BY_CATEGORY).map(category => (
              <FormControlLabel
                key={category}
                control={
                  <Checkbox 
                    checked={selectedCategories[category]} 
                    onChange={() => handleCategoryToggle(category)}
                  />
                }
                label={`${category} (${DEFAULT_TESTS_BY_CATEGORY[category].length} pruebas)`}
              />
            ))}
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="body2" color="text.secondary">
            Las pruebas seleccionadas reemplazarán la selección actual.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDefaultModal(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={applyDefaultTests}
            disabled={Object.values(selectedCategories).every(val => !val)}
          >
            Aplicar Selección
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnsayosMuestra;