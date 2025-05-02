import React, { useState, useEffect } from 'react';
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
  Collapse
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowDropDown as ArrowDropDownIcon,
  ArrowRight as ArrowRightIcon,
  SwapHoriz as SwapIcon
} from '@mui/icons-material';

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

const EnhancedSelectField = ({ field, value, onChange, error }) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');

  useEffect(() => {
    if (field.options && value && !field.options.some(opt => opt.value === value)) {
      setCustomValue(value);
      setShowCustomInput(true);
    }
  }, [value, field.options]);

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
    <Box sx={{ width: '100%' }}>
      <FormControl fullWidth error={!!error}>
        <InputLabel>{field.label}</InputLabel>
        <Select
          value={showCustomInput ? 'CUSTOM' : value || ''}
          onChange={handleSelectChange}
          label={field.label}
        >
          {field.options?.map((option) => (
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
  );
};

const FieldConfigurator = ({ onAddField }) => {
  const [field, setField] = useState({
    name: '',
    label: '',
    type: 'text',
    mode: 'text',
    options: []
  });
  const [expanded, setExpanded] = useState(false);

  const addOption = () => {
    setField(prev => ({
      ...prev,
      options: [...prev.options, { value: '', label: '' }]
    }));
  };

  const updateOption = (index, key, value) => {
    const updatedOptions = [...field.options];
    updatedOptions[index][key] = value;
    setField(prev => ({ ...prev, options: updatedOptions }));
  };

  const handleAddField = () => {
    if (field.name && field.label) {
      const newField = {
        ...field,
        name: field.name.toLowerCase().replace(/\s+/g, '_'),
        options: field.mode !== 'text' ? field.options : []
      };
      onAddField(newField);
      setField({ name: '', label: '', type: 'text', mode: 'text', options: [] });
    }
  };

  return (
    <Box sx={{ border: '1px solid #ddd', borderRadius: 1, p: 2, mb: 2 }}>
      <Box 
        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <Typography variant="subtitle1">Agregar campo personalizado</Typography>
        {expanded ? <ArrowDropDownIcon /> : <ArrowRightIcon />}
      </Box>

      <Collapse in={expanded}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            label="Nombre del campo (ID)"
            value={field.name}
            onChange={(e) => setField(prev => ({ ...prev, name: e.target.value }))}
            fullWidth
            size="small"
          />

          <TextField
            label="Etiqueta visible"
            value={field.label}
            onChange={(e) => setField(prev => ({ ...prev, label: e.target.value }))}
            fullWidth
            size="small"
          />

          <FormControl fullWidth size="small">
            <InputLabel>Modo de entrada</InputLabel>
            <Select
              value={field.mode}
              onChange={(e) => setField(prev => ({ ...prev, mode: e.target.value }))}
              label="Modo de entrada"
            >
              <MenuItem value="text">Solo texto</MenuItem>
              <MenuItem value="select">Solo selección</MenuItem>
              <MenuItem value="both">Ambos (intercambiable)</MenuItem>
            </Select>
          </FormControl>

          {(field.mode === 'select' || field.mode === 'both') && (
            <>
              <Typography variant="body2">Opciones de selección:</Typography>
              {field.options.map((option, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    label="Valor"
                    value={option.value}
                    onChange={(e) => updateOption(index, 'value', e.target.value)}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Etiqueta"
                    value={option.label}
                    onChange={(e) => updateOption(index, 'label', e.target.value)}
                    size="small"
                    fullWidth
                  />
                  <IconButton onClick={() => setField(prev => ({
                    ...prev,
                    options: prev.options.filter((_, i) => i !== index)
                  }))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addOption}
                size="small"
              >
                Agregar opción
              </Button>
            </>
          )}

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddField}
            disabled={!field.name || !field.label}
          >
            Agregar campo
          </Button>
        </Stack>
      </Collapse>
    </Box>
  );
};

const EnhancedFormGenerator = ({ 
  formConfig: initialFormConfig, 
  initialValues, 
  onSubmit,
  submitText = 'Guardar',
  allowFieldConfiguration = true
}) => {
  const [formData, setFormData] = useState(initialValues || {});
  const [formConfig, setFormConfig] = useState(initialFormConfig);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Asegurarse de que los valores iniciales se establezcan correctamente
  useEffect(() => {
    setFormData(initialValues || {});
  }, [initialValues]);

  const handleChange = (fieldName) => (eventOrValue) => {
    const value = typeof eventOrValue === 'object' && eventOrValue.target ? 
      (eventOrValue.target.type === 'checkbox' ? 
        eventOrValue.target.checked : 
        eventOrValue.target.value) : 
      eventOrValue;
    
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
  

    try {
      await onSubmit(formData, e); // Pasamos el evento aquí
    } catch (error) {
      console.error('Error en el formulario:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCustomField = (field) => {
    setFormConfig(prev => [...prev, {
      ...field,
      type: 'dynamic',
      component: (data, onChange, error) => (
        <DynamicInputField
          fieldConfig={field}
          value={data[field.name]}
          onChange={onChange}
          error={error}
        />
      )
    }]);
    setFormData(prev => ({ ...prev, [field.name]: '' }));
  };

  const removeField = (fieldName) => {
    setFormConfig(prev => prev.filter(f => f.name !== fieldName));
    setFormData(prev => {
      const newData = { ...prev };
      delete newData[fieldName];
      return newData;
    });
  };

  const renderField = (field) => {
    const commonProps = {
      fullWidth: true,
      label: field.label,
      value: formData[field.name] || '',
      onChange: handleChange(field.name),
      error: !!errors[field.name],
      helperText: errors[field.name] || field.helperText,
      required: field.required,
      disabled: field.disabled,
      sx: { mb: 2, ...field.sx },
      InputLabelProps: field.InputLabelProps,
      ...field.InputProps && { InputProps: field.InputProps },
      ...field.inputProps && { inputProps: field.inputProps },
      ...(field.multiline && {
        multiline: true,
        rows: field.rows || 3,
      }),
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'password':
        return <TextField {...commonProps} type={field.type} />;
      
      case 'select':
        return (
          <EnhancedSelectField
            field={field}
            value={formData[field.name] || ''}
            onChange={handleChange(field.name)}
            error={errors[field.name]}
          />
        );
      
      case 'date':
        return <TextField {...commonProps} type="date" />;
      
      case 'time':
        return <TextField {...commonProps} type="time" />;
      
      case 'datetime':
        return <TextField {...commonProps} type="datetime-local" />;
      
      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={!!formData[field.name]}
                onChange={handleChange(field.name)}
              />
            }
            label={field.label}
          />
        );
      
      case 'dynamic':
        return field.component(
          formData, 
          (value) => setFormData(prev => ({ ...prev, [field.name]: value })), 
          errors[field.name]
        );
      
      default:
        return null;
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} >
      {allowFieldConfiguration && (
        <FieldConfigurator onAddField={addCustomField} />
      )}

      <Stack spacing={2}>
        {formConfig?.map(field => (
          <Box key={field.name} sx={{ position: 'relative' }}>
            {allowFieldConfiguration && field.name !== 'sampleId' && (
              <Tooltip title="Eliminar campo">
                <IconButton
                  size="small"
                  onClick={() => removeField(field.name)}
                  sx={{ 
                    position: 'absolute', 
                    right: -40, 
                    top: 8,
                    color: 'error.main'
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {renderField(field)}
          </Box>
        ))}
      </Stack>

      <Button 
        type="submit" 
        variant="contained" 
        fullWidth
        sx={{ mt: 3 }}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Enviando...' : submitText}
      </Button>
    </Box>
  );
};

export default EnhancedFormGenerator;