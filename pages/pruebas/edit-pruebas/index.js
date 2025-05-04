import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../shared/context/AuthContext';
import { toast } from 'react-toastify';
import {
  Box,
  Typography,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Divider,
  Grid,
  CircularProgress,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Chip,
  IconButton,
  ListItemText
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const EditarPrueba = () => {
  const { api } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pruebaData, setPruebaData] = useState(null);
  const [contentTypes, setContentTypes] = useState([]);
  const [allLimits, setAllLimits] = useState([]);
  const [selectedContentType, setSelectedContentType] = useState('');
  const [selectedLimits, setSelectedLimits] = useState([]);
  const [testLimits, setTestLimits] = useState([]);

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    metodo_referencia: '',
    unidad_medida: '',
    equipo_requerido: '',
    activo: true
  });

  // Fetch all initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Fetch all pruebas and find the current one
        const pruebasResponse = await api.get('lubrication/tests/');
        const currentPrueba = pruebasResponse.data.find(p => p.id.toString() === id);
        
        if (!currentPrueba) {
          toast.error('Prueba no encontrada');
          //router.push('/pruebas');
          return;
        }

        setPruebaData(currentPrueba);
        setFormData({
          codigo: currentPrueba.codigo || '',
          nombre: currentPrueba.nombre || '',
          descripcion: currentPrueba.descripcion || '',
          metodo_referencia: currentPrueba.metodo_referencia || '',
          unidad_medida: currentPrueba.unidad_medida || '',
          equipo_requerido: currentPrueba.equipo_requerido || '',
          activo: currentPrueba.activo || true
        });

        // Fetch all content types
        const contentTypesResponse = await api.get('content/');
        setContentTypes(contentTypesResponse.data);

        // Fetch all limits (both types)
        const [calidadResponse, viscosidadResponse] = await Promise.all([
          api.get('limites-calidad/'),
          api.get('limites-viscosidad/')
        ]);
        
        const combinedLimits = [
          ...calidadResponse.data.map(item => ({ ...item, type: 'limitecalidad' })),
          ...viscosidadResponse.data.map(item => ({ ...item, type: 'limiteviscosidad' }))
        ];
        setAllLimits(combinedLimits);

        // Fetch all relationships and filter by prueba_id
        const relacionesResponse = await api.get('relaciones/');
        const pruebaRelations = relacionesResponse.data.filter(rel => rel.prueba_id.toString() === id);
        
        const existingLimits = pruebaRelations.map(rel => {
          const limit = combinedLimits.find(l => l.id === rel.object_id);
          return {
            limitId: rel.object_id,
            limitName: limit?.tipo || 'Desconocido',
            contentType: rel.content_type.model,
            contentTypeId: rel.content_type.id,
            symbolOperation: rel.symbol_operation,
            typeOperation: rel.type_operation
          };
        });
        setTestLimits(existingLimits);

      } catch (error) {
        toast.error('Error al cargar datos: ' + (error.response?.data?.message || error.message));
        // router.push('/pruebas');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api, id, router]); // Eliminada la dependencia que causaba el bucle

  // Filter limits by selected content type
  const filteredLimits = selectedContentType 
    ? allLimits.filter(limit => limit.type === selectedContentType)
    : [];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleContentTypeChange = (e) => {
    setSelectedContentType(e.target.value);
    setSelectedLimits([]);
  };

  const handleAddLimits = () => {
    if (selectedLimits.length === 0) {
      toast.warning('Seleccione al menos un límite');
      return;
    }

    const newLimits = selectedLimits.map(limitId => {
      const limit = filteredLimits.find(l => l.id === limitId);
      const contentType = contentTypes.find(ct => ct.model === selectedContentType);
      
      return {
        limitId,
        limitName: limit.tipo,
        contentType: selectedContentType,
        contentTypeId: contentType.id,
        symbolOperation: '=',
        typeOperation: 'equal'
      };
    });

    setTestLimits([...testLimits, ...newLimits]);
    setSelectedLimits([]);
  };

  const handleRemoveLimit = (index) => {
    const updatedLimits = [...testLimits];
    updatedLimits.splice(index, 1);
    setTestLimits(updatedLimits);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Update prueba data
      await api.patch(`lubrication/tests/${id}/`, formData);

      // Get all current relationships to know which to delete
      const relacionesResponse = await api.get('relaciones/');
      const currentRelations = relacionesResponse.data.filter(rel => rel.prueba_id.toString() === id);
      
      // Delete all existing relationships for this prueba
      await Promise.all(currentRelations.map(rel => 
        api.delete(`relaciones/${rel.id}/`)
      ));

      // Create new relationships
      if (testLimits.length > 0) {
        await Promise.all(testLimits.map(limit => 
          api.post('relaciones/', {
            object_id: limit.limitId,
            content_type_id: limit.contentTypeId,
            prueba_id: id,
            symbol_operation: limit.symbolOperation,
            type_operation: limit.typeOperation
          })
        ));
      }

      toast.success('Prueba actualizada exitosamente');
      router.push('/pruebas');
    } catch (error) {
      toast.error('Error al actualizar prueba: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !pruebaData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Editar Prueba: {formData.codigo} - {formData.nombre}
      </Typography>

      <Grid container spacing={3}>
        {/* Código (disabled) */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Código"
            name="codigo"
            value={formData.codigo}
            onChange={handleChange}
            disabled
            required
          />
        </Grid>

        {/* Nombre */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
          />
        </Grid>

        {/* Descripción */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Descripción"
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            multiline
            rows={4}
          />
        </Grid>

        {/* Método de Referencia */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Método de Referencia"
            name="metodo_referencia"
            value={formData.metodo_referencia}
            onChange={handleChange}
          />
        </Grid>

        {/* Unidad de Medida */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Unidad de Medida"
            name="unidad_medida"
            value={formData.unidad_medida}
            onChange={handleChange}
          />
        </Grid>

        {/* Equipo Requerido */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Equipo Requerido"
            name="equipo_requerido"
            value={formData.equipo_requerido}
            onChange={handleChange}
          />
        </Grid>

        {/* Activo */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                name="activo"
                checked={formData.activo}
                onChange={handleChange}
              />
            }
            label="Activo"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Limits Section */}
      <Typography variant="h5" gutterBottom>Límites de la Prueba</Typography>

      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={5}>
          <FormControl fullWidth>
            <InputLabel>Tipo de Límite</InputLabel>
            <Select
              value={selectedContentType}
              onChange={handleContentTypeChange}
              label="Tipo de Límite"
            >
              <MenuItem value="limitecalidad">Límite de Calidad</MenuItem>
              <MenuItem value="limiteviscosidad">Límite de Viscosidad</MenuItem>
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
                    const limit = filteredLimits.find(l => l.id === id);
                    return limit?.tipo || '';
                  }).join(', ')}
                >
                  {filteredLimits.map(limit => (
                    <MenuItem key={limit.id} value={limit.id}>
                      <Checkbox checked={selectedLimits.indexOf(limit.id) > -1} />
                      <ListItemText primary={limit.tipo} />
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
          <Typography variant="subtitle1" gutterBottom>
            Límites asignados:
          </Typography>
          {testLimits.map((limit, index) => (
            <Box 
              key={index} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 2,
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
                  sx={{ mt: 1 }}
                />
              </Box>
              <IconButton onClick={() => handleRemoveLimit(index)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      <Divider sx={{ my: 4 }} />

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => router.push('/pruebas')}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={saving}
        >
          {saving ? <CircularProgress size={24} /> : 'Guardar Cambios'}
        </Button>
      </Box>
    </Box>
  );
};

export default EditarPrueba;