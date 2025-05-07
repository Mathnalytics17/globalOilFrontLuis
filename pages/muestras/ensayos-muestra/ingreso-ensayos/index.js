import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../shared/context/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { 
  Box, 
  Typography, 
  Button, 
  Tabs, 
  Tab,
  Chip,
  CircularProgress
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EnhancedFormGenerator from '../../../../shared/components/formGenComponent';

const IngresoEnsayos = () => {
  const { api, user } = useAuth();
  const router = useRouter();
  const { muestra } = router.query;
  const [tests, setTests] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [formConfig, setFormConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [groupedConfigs, setGroupedConfigs] = useState([]);
  const [formData, setFormData] = useState({});
  const [visitedTabs, setVisitedTabs] = useState(new Set([0]));

  const handleBack = () => {
    router.push(`/muestras/ensayos-muestra?muestra=${muestra}`);
  };

  const getFieldType = (unidad) => {
    if (!unidad) return 'text';
    const numericUnits = ['mg/kg', 'ppm', '%', 'cSt', 'mm²/s', 'mgKOH/g', 'ml'];
    return numericUnits.includes(unidad) ? 'number' : 'text';
  };

  const getValidation = (unidad) => {
    if (unidad === 'mg/kg' || unidad === 'ppm' || unidad === 'ml') {
      return (value) => (value >= 0 ? true : 'El valor no puede ser negativo');
    }
    return undefined;
  };

  // Obtener todas las pruebas asignadas a muestras
  useEffect(() => {
    const fetchTests = async () => {
      if (!muestra) return;
      
      try {
        const response = await api.get(`lubrication/sample-tests/?muestra=${muestra}`);
        console.log(muestra)
        console.log(response.data)
        const testMuestra=response.data.filter(muestras => muestras.muestra.id===muestra)
        console.log(testMuestra)
        setTests(testMuestra);
      } catch (error) {
        toast.error('Error al cargar pruebas: ' + (error.response?.data?.message || error.message));
      }
    };

    fetchTests();
  }, [api, muestra]);

  // Obtener todos los resultados disponibles
  useEffect(() => {
    const fetchAllResults = async () => {
      try {
        const response = await api.get('lubrication/results/');
        setAllResults(response.data);
      } catch (error) {
        toast.error('Error al cargar resultados: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchAllResults();
  }, [api]);

  // Filtrar resultados por muestra actual
  useEffect(() => {
    if (muestra && allResults.length > 0) {
      const filtered = allResults.filter(
        result => result.prueba_muestra?.muestra?.id === muestra
      );
      setFilteredResults(filtered);
    }
  }, [muestra, allResults]);

  // Configurar formulario cuando tengamos los datos
  useEffect(() => {
    if (tests.length > 0 && allResults.length >= 0) {
      const config = tests.map(test => {
        const existingResult = filteredResults.find(
          result => result.prueba_muestra?.prueba?.id === test.prueba.id
        );

        return {
          name: `prueba_${test.prueba.id}`,
          label: `${test.prueba.codigo} - ${test.prueba.nombre}`,
          type: getFieldType(test.prueba.unidad_medida),
          required: true,
          InputProps: {
            endAdornment: test.prueba.unidad_medida ? (
              <Typography variant="caption" color="textSecondary">
                {test.prueba.unidad_medida}
              </Typography>
            ) : undefined,
            inputProps: getFieldType(test.prueba.unidad_medida) === 'number' ? { 
              min: 0,
              step: 0.01 
            } : undefined
          },
          helperText: test.prueba.descripcion,
          validation: getValidation(test.prueba.unidad_medida),
          sx: { mb: 2 },
          pruebaData: test,
          existingResult: existingResult
        };
      });

      setFormConfig(config);
      
      // Inicializar formData con valores existentes o vacíos
      const initialFormData = {};
      config.forEach(item => {
        initialFormData[item.name] = item.existingResult?.resultado || '';
      });
      setFormData(initialFormData);
      
      // Agrupar configuraciones en grupos de 4
      const groups = [];
      for (let i = 0; i < config.length; i += 4) {
        groups.push(config.slice(i, i + 4));
      }
      setGroupedConfigs(groups);
    }
  }, [tests, filteredResults, allResults]);

  const handleTabChange = (event, newValue) => {
    setVisitedTabs(prev => new Set([...prev, newValue]));
    setActiveTab(newValue);
  };

  const handleFormChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNext = (data) => {
    // Validar campos requeridos antes de avanzar
    const currentGroup = groupedConfigs[activeTab];
    const missingFields = currentGroup.filter(
      field => field.required && (!data[field.name] && data[field.name] !== 0)
    );

    if (missingFields.length > 0) {
      toast.error(`Complete los campos requeridos: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    setFormData(prev => ({ ...prev, ...data }));
    setVisitedTabs(prev => new Set([...prev, activeTab + 1]));
    setActiveTab(prev => prev + 1);
  };

  const handlePrev = () => {
    setActiveTab(prev => prev - 1);
  };

  const onSubmit = async (finalData) => {
    try {
      // Combinar todos los datos
      const allData = { ...formData, ...finalData };
      const fechaMedicion = new Date().toISOString();
      
      // Verificar que todos los campos requeridos estén completos
      const missingFields = formConfig.filter(
        field => field.required && (!allData[field.name] && allData[field.name] !== 0)
      );

      if (missingFields.length > 0) {
        toast.error(`Faltan campos requeridos: ${missingFields.map(f => f.label).join(', ')}`);
        return;
      }

      // Preparar resultados para enviar
      const resultsToSubmit = [];
      
      for (const test of tests) {
        const fieldName = `prueba_${test.prueba.id}`;
        const value = allData[fieldName];
        const existingResult = filteredResults.find(
          r => r.prueba_muestra?.prueba?.id === test.prueba.id
        );
        
        if (existingResult) {
          if (existingResult.resultado !== value) {
            resultsToSubmit.push({
              id: existingResult.id,
              prueba_muestra: test.id,
              resultado: value,
              fecha_medicion: fechaMedicion,
              usuario_medicion: user.id,
              completada: true
            });
          }
        } else {
          resultsToSubmit.push({
            prueba_muestra: test.id,
            resultado: value,
            fecha_medicion: fechaMedicion,
            usuario_medicion: user.id,
            completada: true
          });
        }
      }

      if (resultsToSubmit.length === 0) {
        toast.info('No hay cambios para guardar');
        return;
      }

      // Enviar actualizaciones
      const updatePromises = resultsToSubmit.map(result => {
        if (result.id) {
          return api.patch(`lubrication/results/${result.id}/`, {
            resultado: result.resultado,
            fecha_medicion: result.fecha_medicion,
            usuario_medicion: result.usuario_medicion,
            completada: result.completada
          });
        } else {
          return api.post(`lubrication/results/`, result);
        }
      });

      await Promise.all(updatePromises);
      toast.success('Resultados guardados correctamente');
      router.push(`/muestras`);
    } catch (error) {
      toast.error('Error al guardar resultados: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Ingreso de Resultados - Muestra #{muestra}
      </Typography>
      
      {tests.length > 0 ? (
        <>
          <Box mb={4}>
            <Typography variant="h6" gutterBottom>
              Pruebas a realizar:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {tests.map(test => {
                const existingResult = filteredResults.find(
                  r => r.prueba_muestra?.prueba?.id === test.prueba.id
                );
                
                return (
                  <Chip
                    key={test.id}
                    label={`${test.prueba.codigo}: ${test.prueba.nombre}`}
                    color={existingResult ? "success" : "primary"}
                    size="small"
                  />
                );
              })}
            </Box>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            Volver a Muestra
          </Button>

          {groupedConfigs.length > 1 ? (
            <>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 3 }}
              >
                {groupedConfigs.map((group, index) => (
                  <Tab 
                    key={index}
                    label={`Grupo ${index + 1}`}
                    icon={<Chip label={group.length} size="small" />}
                    iconPosition="end"
                    disabled={!visitedTabs.has(index) && index !== 0}
                  />
                ))}
              </Tabs>

              {groupedConfigs.map((group, index) => (
                <Box key={index} hidden={activeTab !== index}>
                  <EnhancedFormGenerator
                    formConfig={group}
                    initialValues={formData}
                    onChange={handleFormChange}
                    onSubmit={index === groupedConfigs.length - 1 ? onSubmit : handleNext}
                    submitText={index === groupedConfigs.length - 1 ? "Guardar Resultados" : "Siguiente"}
                    submitIcon={<SaveIcon />}
                    additionalButtons={
                      index > 0 && (
                        <Button
                          variant="outlined"
                          onClick={handlePrev}
                          sx={{ mr: 2 }}
                        >
                          Anterior
                        </Button>
                      )
                    }
                    sx={{ mt: 2 }}
                  />
                </Box>
              ))}
            </>
          ) : (
            <EnhancedFormGenerator
              formConfig={formConfig}
              initialValues={formData}
              onChange={handleFormChange}
              onSubmit={onSubmit}
              submitText="Guardar Resultados"
              submitIcon={<SaveIcon />}
              sx={{ mt: 3 }}
            />
          )}
        </>
      ) : (
        <Typography variant="body1">No hay pruebas asignadas para esta muestra</Typography>
      )}
    </Box>
  );
};

export default IngresoEnsayos;