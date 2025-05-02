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
  Chip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EnhancedFormGenerator from '../../../../shared/components/formGenComponent';

const IngresoEnsayos = () => {
  const { api,user } = useAuth();
  console.log(user)
  const router = useRouter();
  const { muestra } = router.query;
  const [tests, setTests] = useState([]);
  const [formConfig, setFormConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [groupedConfigs, setGroupedConfigs] = useState([]);
  const [formData, setFormData] = useState({}); // Estado para guardar los datos del formulario

  const handleBack = () => {
    router.push(`/muestras/ensayos-muestra?muestra=${muestra}`);
  };

  const getFieldType = (unidad) => {
    if (!unidad) return 'text';
    const numericUnits = ['mg/kg', 'ppm', '%', 'cSt', 'mm²/s', 'mgKOH/g'];
    return numericUnits.includes(unidad) ? 'number' : 'text';
  };

  const getValidation = (unidad) => {
    if (unidad === 'mg/kg' || unidad === 'ppm') {
      return (value) => (value >= 0 ? true : 'El valor no puede ser negativo');
    }
    return undefined;
  };

  useEffect(() => {
    const fetchTests = async () => {
      if (!muestra) return;
      
      try {
        const response = await api.get(`lubrication/sample-tests/?muestra=${muestra}`);
        setTests(response.data);
        
        const config = response.data.map(test => ({
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
          pruebaData: test
        }));

        setFormConfig(config);
        
        // Agrupar configuraciones en grupos de 4
        const groups = [];
        for (let i = 0; i < config.length; i += 4) {
          groups.push(config.slice(i, i + 4));
        }
        setGroupedConfigs(groups);
      } catch (error) {
        toast.error('Error al cargar pruebas: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, [api, muestra]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Función para manejar cambios en los campos
  const handleFormChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const onSubmit = async (finalData) => {
    try {
      // Combinar datos de todos los formularios
      const allData = { ...formData, ...finalData };
      
      // Obtener la fecha actual en formato ISO
      const fechaMedicion = new Date().toISOString();
      
      const results = tests.map(test => ({
        prueba_muestra: test.id,  // ID de la relación muestra-prueba
        resultado: allData[`prueba_${test.prueba.id}`],
        fecha_medicion: fechaMedicion,
        usuario_medicion: user.id,  // ID del usuario autenticado
        completada: true
      }));

      // Verificar que todos los campos requeridos estén presentes
      const missingFields = results.some(result => 
        !result.prueba_muestra || 
        result.resultado === undefined || 
        !result.fecha_medicion || 
        !result.usuario_medicion
      );

      if (missingFields) {
        throw new Error('Faltan campos requeridos en algunos resultados');
      }

      await Promise.all(results.map(result => 
        api.post(`lubrication/results/`, {
          prueba_muestra: result.prueba_muestra,
          resultado: result.resultado,
          fecha_medicion: result.fecha_medicion,
          usuario_medicion: result.usuario_medicion,
          completada: result.completada
        })
      ));

      toast.success('Resultados guardados correctamente');
      router.push(`/muestras`);
    } catch (error) {
      toast.error('Error al guardar resultados: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>Cargando pruebas...</Typography>
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
              {tests.map(test => (
                <Chip
                  key={test.id}
                  label={`${test.prueba.codigo}: ${test.prueba.nombre}`}
                  color="primary"
                  size="small"
                />
              ))}
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
                  />
                ))}
              </Tabs>

              {groupedConfigs.map((group, index) => (
                <Box key={index} hidden={activeTab !== index}>
                  <EnhancedFormGenerator
                    formConfig={group}
                    initialValues={formData} // Pasar los datos guardados
                    onChange={handleFormChange} // Manejar cambios
                    onSubmit={
                      index === groupedConfigs.length - 1 
                        ? onSubmit 
                        : (data) => {
                            setFormData(prev => ({ ...prev, ...data }));
                            setActiveTab(index + 1);
                          }
                    }
                    submitText={
                      index === groupedConfigs.length - 1 
                        ? "Guardar Resultados" 
                        : "Siguiente"
                    }
                    submitIcon={
                      index === groupedConfigs.length - 1 
                        ? <SaveIcon /> 
                        : null
                    }
                    sx={{ mt: 2 }}
                  />
                </Box>
              ))}
            </>
          ) : (
            <EnhancedFormGenerator
              formConfig={formConfig}
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