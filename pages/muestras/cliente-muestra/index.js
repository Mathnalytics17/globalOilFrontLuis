import React, { useEffect, useState } from 'react';
import EnhancedFormGenerator from '../../../shared/components/formGenComponent';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Typography,
  IconButton,
  Stack,
  Tooltip,
  Collapse,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowDropDown as ArrowDropDownIcon,
  ArrowRight as ArrowRightIcon,
  SwapHoriz as SwapIcon
} from '@mui/icons-material';
import Axios from 'axios';
import { useAuth } from '../../../shared/context/AuthContext';
import { useFetch } from '@hooks/useFetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const ClienteMuestra = () => {
  const { user } = useAuth();
  const [formConfig, setFormConfig] = useState([]);
  const [initialValues, setInitialValues] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const DynamicInputField = ({ fieldConfig, value, onChange, error }) => {
    const [inputMode, setInputMode] = useState(fieldConfig.mode || 'select');
    const [customValue, setCustomValue] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
  
    useEffect(() => {
      if (fieldConfig.options && !fieldConfig.options.some(opt => opt.value === value)) {
        setCustomValue(value || '');
        setShowCustomInput(true);
      }
    }, [value, fieldConfig.options]);
  
    const handleToggleMode = () => {
      const newMode = inputMode === 'select' ? 'text' : 'select';
      setInputMode(newMode);
      if (newMode === 'text') {
        onChange(customValue || '');
      } else {
        onChange('');
      }
    };
  
    const handleSelectChange = (event) => {
      const selectedValue = event.target.value;
      if (selectedValue === 'CUSTOM') {
        setShowCustomInput(true);
        onChange(customValue || '');
      } else {
        setShowCustomInput(false);
        onChange(selectedValue);
      }
    };
  
    const handleCustomInputChange = (event) => {
      const newValue = event.target.value;
      setCustomValue(newValue);
      if (showCustomInput) {
        onChange(newValue);
      }
    };
  
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
        {fieldConfig.mode === 'both' && (
          <Tooltip title={`Cambiar a modo ${inputMode === 'select' ? 'texto' : 'selección'}`}>
            <IconButton onClick={handleToggleMode} size="small">
              <SwapIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
  
        {inputMode === 'select' ? (
          <Box sx={{ width: '100%' }}>
            <FormControl fullWidth error={!!error}>
              <InputLabel>{fieldConfig.label}</InputLabel>
              <Select
                value={showCustomInput ? 'CUSTOM' : value || ''}
                onChange={handleSelectChange}
                label={fieldConfig.label}
              >
                {fieldConfig.options?.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
                <MenuItem value="CUSTOM">Otro (especificar)</MenuItem>
              </Select>
            </FormControl>
            
            {showCustomInput && (
              <TextField
                fullWidth
                label="Especificar valor"
                value={customValue}
                onChange={handleCustomInputChange}
                sx={{ mt: 2 }}
                error={!!error}
                helperText={error}
              />
            )}
          </Box>
        ) : (
          <TextField
            fullWidth
            label={fieldConfig.label}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            error={!!error}
            helperText={error}
          />
        )}
      </Box>
    );
  };

  // Fetch lubricants data
  const GetLubricantes = async () => {
    const res = await Axios.get(`${API_URL}/lubrication/lubricants/`);
    return res.data;
  };

  // Fetch equipment references data
  const GetReferenciasEquipo = async () => {
    const res = await Axios.get(`${API_URL}/lubrication/equipment-references/`);
    return res.data;
  };

  // Use custom hooks for data fetching
  const {
    fetch: getLubricantes,
    loading: loadingLubricantes,
    error: errorLubricantes,
    data: lubricantesData,
  } = useFetch({ service: GetLubricantes, init: true });

  const {
    fetch: getReferenciasEquipo,
    loading: loadingReferencias,
    error: errorReferencias,
    data: referenciasData,
  } = useFetch({ service: GetReferenciasEquipo, init: true });

  useEffect(() => {
    if (lubricantesData && referenciasData && user) {
      const config = [
        {
          name: 'fecha_toma',
          label: 'Fecha de Toma',
          type: 'datetime-local',
          required: true,
          InputLabelProps: { shrink: true }
        },
        {
          name: 'lubricante',
          label: 'Lubricante',
          type: 'dynamic',
          mode: 'both',
          required: true,
          options: lubricantesData.map(l => ({
            value: l.id,
            label: l.referencia || l.nombre
          })),
          component: (data, onChange, error) => (
            <DynamicInputField
              fieldConfig={{
                label: 'Lubricante',
                mode: 'both',
                options: lubricantesData.map(l => ({
                  value: l.id,
                  label: l.referencia || l.nombre
                }))
              }}
              value={data.lubricante}
              onChange={onChange}
              error={error}
            />
          )
        },
        {
          name: 'contacto_cliente',
          label: 'Contacto del Cliente',
          type: 'text',
          placeholder: 'Nombre del contacto',
          required: false
        },
        {
          name: 'equipo_placa',
          label: 'Placa del Equipo',
          type: 'text',
          placeholder: 'Ej: ABC-123',
          required: false
        },
        {
          name: 'referencia_equipo',
          label: 'Referencia del Equipo',
          type: 'dynamic',
          mode: 'both',
          required: false,
          options: referenciasData.map(r => ({
            value: r.id,
            label: `${r.tipo?.nombre || 'Equipo'} - ${r.codigo}`
          })),
          component: (data, onChange, error) => (
            <DynamicInputField
              fieldConfig={{
                label: 'Referencia del Equipo',
                mode: 'both',
                options: referenciasData.map(r => ({
                  value: r.id,
                  label: `${r.tipo?.nombre || 'Equipo'} - ${r.codigo}`
                }))
              }}
              value={data.referencia_equipo}
              onChange={onChange}
              error={error}
            />
          )
        },
        {
          name: 'periodo_servicio_aceite',
          label: 'Periodo Servicio Aceite',
          type: 'number',
          InputProps: { inputProps: { min: 0 } },
          validation: (value) => (value >= 0 ? true : 'Debe ser un número positivo'),
          required: false
        },
        {
          name: 'unidad_periodo_aceite',
          label: 'Unidad Periodo Aceite',
          type: 'select',
          options: [
            { value: 'horas', label: 'Horas' },
            { value: 'km', label: 'Kilómetros' },
            { value: 'millas', label: 'Millas' },
            { value: 'dias', label: 'Días' }
          ],
          required: false
        },
        {
          name: 'periodo_servicio_equipo',
          label: 'Periodo Servicio Equipo',
          type: 'number',
          InputProps: { inputProps: { min: 0 } },
          validation: (value) => (value >= 0 ? true : 'Debe ser un número positivo'),
          required: false
        },
        {
          name: 'unidad_periodo_equipo',
          label: 'Unidad Periodo Equipo',
          type: 'select',
          options: [
            { value: 'horas', label: 'Horas' },
            { value: 'km', label: 'Kilómetros' },
            { value: 'millas', label: 'Millas' },
            { value: 'dias', label: 'Días' }
          ],
          required: false
        },
        {
          name: 'observaciones',
          label: 'Observaciones',
          type: 'textarea',
          multiline: true,
          rows: 3,
          required: false
        },
        {
          name: 'usuario_registro',
          label: 'Registrado por',
          type: 'text',
          disabled: true,
          value: user.username || user.email,
          sx: { backgroundColor: 'transparents' }
        },
        {
          name: 'fecha_registro',
          label: 'Fecha de Registro',
          type: 'datetime-local',
          disabled: true,
          sx: { backgroundColor: 'transparents' }
        }
      ];
  
      setFormConfig(config);
      setInitialValues({
        usuario_registro: user.username || user.email,
        fecha_registro: new Date().toISOString().slice(0, 16)
      });
    }
  }, [lubricantesData, referenciasData, user]);

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const onSubmit = async (formData, event) => {
    if (event) {
      event.preventDefault(); // Prevenir la recarga de la página
    }
  
    try {
      const payload = {
        ...formData,
        usuario_registro: user.id,
        fecha_registro: new Date().toISOString(),
        fecha_toma: new Date().toISOString()
      };
  
      // Limpiar campos vacíos
      Object.keys(payload).forEach(key => {
        if (payload[key] === '' || payload[key] == null) {
          delete payload[key];
        }
      });
      console.log(user)
      const response = await Axios.post(`${API_URL}/lubrication/samples/`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
  
      setSnackbar({
        open: true,
        message: 'Muestra guardada correctamente',
        severity: 'success'
      });
  
    } catch (error) {
      console.error('Error al guardar la muestra:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar la muestra: ' + (error.response?.data?.message || error.message),
        severity: 'error'
      });
    }
  };
  if (loadingLubricantes || loadingReferencias) {
    return <Box>Cargando datos...</Box>;
  }

  if (errorLubricantes || errorReferencias) {
    return <Box>Error al cargar los datos</Box>;
  }

  return (
    <Box>
      <h1>Registrar Muestra</h1>
      {formConfig.length > 0 && (
       <EnhancedFormGenerator
       formConfig={formConfig}
       initialValues={initialValues}
       onSubmit={onSubmit}
       submitText="Guardar Muestra"
     />
      )}
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClienteMuestra;