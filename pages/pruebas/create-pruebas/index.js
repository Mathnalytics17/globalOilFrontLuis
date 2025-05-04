import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../shared/context/AuthContext';
import { toast } from 'react-toastify';
import { 
  Box, 
  Typography, 
  Button, 
  Divider, 
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  Grid,
  FormControlLabel,
  Chip,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const CrearPrueba = () => {
  const { api } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [contentTypes, setContentTypes] = useState([]);
  const [selectedContentType, setSelectedContentType] = useState('');
  const [limits, setLimits] = useState([]);
  const [selectedLimits, setSelectedLimits] = useState([]);
  const [testLimits, setTestLimits] = useState([]);

  // Form data
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    metodo_referencia: '',
    unidad_medida: '',
    activo: true
  });

  // Fetch content types
  useEffect(() => {
    const fetchContentTypes = async () => {
      try {
        const response = await api.get('content/');
        const filtered = response.data.filter(ct => 
          ct.model === 'limitecalidad' || ct.model === 'limiteviscosidad'
        );
        setContentTypes(filtered);
      } catch (error) {
        toast.error('Error al cargar tipos de límites');
      }
    };
    fetchContentTypes();
  }, [api]);

  // Fetch limits when content type changes
  useEffect(() => {
    if (!selectedContentType) return;
    
    const fetchLimits = async () => {
      try {
        const endpoint = selectedContentType === 'limitecalidad' 
          ? 'limites-calidad/' 
          : 'limites-viscosidad/';
        const response = await api.get(endpoint);
        setLimits(response.data);
      } catch (error) {
        toast.error('Error al cargar límites');
      }
    };
    fetchLimits();
  }, [selectedContentType, api]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleAddLimits = () => {
    if (selectedLimits.length === 0) {
      toast.warning('Seleccione al menos un límite');
      return;
    }

    const newLimits = selectedLimits.map(id => {
      const limit = limits.find(l => l.id === id);
      return {
        limitId: id,
        limitName: limit.tipo,
        contentType: selectedContentType
      };
    });

    setTestLimits([...testLimits, ...newLimits]);
    setSelectedLimits([]);
  };

  const handleRemoveLimit = (index) => {
    const updated = [...testLimits];
    updated.splice(index, 1);
    setTestLimits(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create test
      const testResponse = await api.post('lubrication/tests/', formData);
      const testId = testResponse.data.id;

      // Create limit relationships
      if (testLimits.length > 0) {
        const contentType = contentTypes.find(ct => ct.model === testLimits[0].contentType);
        
        await Promise.all(testLimits.map(limit => 
          api.post('relaciones/', {
            object_id: limit.limitId,
            content_type: contentType.id,
            prueba: testId,
            symbol_operation: '=',
            type_operation: 'equal',
            tipo_equipo:'22dd',
            tipo_lubricante:'22d',
            severidad:'normal'
          })
        ));
      }

      toast.success('Prueba creada exitosamente');
      router.push('/pruebas');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear prueba');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Crear Nueva Prueba</Typography>

      {/* Test Fields */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Código"
            name="codigo"
            value={formData.codigo}
            onChange={handleInputChange}
            required
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleInputChange}
            required
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Descripción"
            name="descripcion"
            value={formData.descripcion}
            onChange={handleInputChange}
            variant="outlined"
            multiline
            rows={3}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Método de Referencia"
            name="metodo_referencia"
            value={formData.metodo_referencia}
            onChange={handleInputChange}
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Unidad de Medida"
            name="unidad_medida"
            value={formData.unidad_medida}
            onChange={handleInputChange}
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                name="activo"
                checked={formData.activo}
                onChange={handleInputChange}
              />
            }
            label="Activo"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Limits Section */}
      <Typography variant="h6" sx={{ mb: 2 }}>Límites de la Prueba</Typography>

      <Grid container spacing={2} alignItems="flex-end">
        <Grid item xs={12} sm={5}>
          <FormControl fullWidth>
            <InputLabel>Tipo de Límite</InputLabel>
            <Select
              value={selectedContentType}
              onChange={(e) => setSelectedContentType(e.target.value)}
              label="Tipo de Límite"
            >
              {contentTypes.map(ct => (
                <MenuItem key={ct.id} value={ct.model}>
                  {ct.model === 'limitecalidad' ? 'Límite de Calidad' : 'Límite de Viscosidad'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {selectedContentType && (
          <>
            <Grid item xs={12} sm={5}>
              <FormControl fullWidth>
                <InputLabel>Límites Disponibles</InputLabel>
                <Select
                  multiple
                  value={selectedLimits}
                  onChange={(e) => setSelectedLimits(e.target.value)}
                  renderValue={(selected) => selected.map(id => {
                    const limit = limits.find(l => l.id === id);
                    return limit?.tipo || '';
                  }).join(', ')}
                >
                  {limits.map(limit => (
                    <MenuItem key={limit.id} value={limit.id}>
                      {limit.tipo}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="contained"
                onClick={handleAddLimits}
                fullWidth
                sx={{ height: '56px' }}
              >
                Agregar
              </Button>
            </Grid>
          </>
        )}
      </Grid>

      {/* Selected Limits */}
      {testLimits.length > 0 && (
        <Box sx={{ mt: 3 }}>
          {testLimits.map((limit, index) => (
            <Box 
              key={index} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 1.5,
                mb: 1,
                bgcolor: 'background.paper',
                borderRadius: 1,
                boxShadow: 1
              }}
            >
              <Box>
                <Typography>{limit.limitName}</Typography>
                <Chip 
                  label={limit.contentType === 'limitecalidad' ? 'Calidad' : 'Viscosidad'} 
                  size="small" 
                  sx={{ mt: 0.5 }}
                />
              </Box>
              <IconButton onClick={() => handleRemoveLimit(index)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
        <Button 
          variant="outlined" 
          onClick={() => router.push('/pruebas')}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          variant="contained" 
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Guardar Prueba'}
        </Button>
      </Box>
    </Box>
  );
};

export default CrearPrueba;