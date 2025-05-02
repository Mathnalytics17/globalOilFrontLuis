import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../shared/context/AuthContext';
import { toast } from 'react-toastify';
import { Box, Typography, Button } from '@mui/material';
import EnhancedFormGenerator from '../../../shared/components/formGenComponent';

const CrearPrueba = () => {
  const { api } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const formConfig = [
    {
      name: 'codigo',
      label: 'Código',
      type: 'text',
      required: true,
      placeholder: 'Ej: VIS40',
      validation: (value) => 
        /^[A-Z0-9]{2,20}$/.test(value) || 'Código debe ser alfanumérico en mayúsculas (2-20 caracteres)'
    },
    {
      name: 'nombre',
      label: 'Nombre',
      type: 'text',
      required: true,
      placeholder: 'Ej: Viscosidad Cinemática 40°C',
      validation: (value) => 
        value.length <= 100 || 'El nombre no puede exceder 100 caracteres'
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      placeholder: 'Descripción detallada de la prueba',
      validation: (value) => 
        !value || value.length <= 500 || 'La descripción no puede exceder 500 caracteres'
    },
    {
      name: 'metodo_referencia',
      label: 'Método de Referencia',
      type: 'text',
      placeholder: 'Ej: ASTM D445',
      validation: (value) => 
        !value || value.length <= 100 || 'El método no puede exceder 100 caracteres'
    },
    {
      name: 'unidad_medida',
      label: 'Unidad de Medida',
      type: 'text',
      placeholder: 'Ej: cSt, ppm, °C',
      validation: (value) => 
        !value || value.length <= 20 || 'La unidad no puede exceder 20 caracteres'
    },
    {
      name: 'activo',
      label: 'Activo',
      type: 'checkbox',
      initialValue: true
    }
  ];

  const onSubmit = async (formData) => {
    setLoading(true);
    try {
      // Preparar los datos según el modelo Django
      const payload = {
        codigo: formData.codigo,
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        metodo_referencia: formData.metodo_referencia || null,
        unidad_medida: formData.unidad_medida || null,
        activo: formData.activo !== undefined ? formData.activo : true
      };

      await api.post('lubrication/tests/', payload);
      toast.success('Prueba creada exitosamente');
      router.push('/pruebas');
    } catch (error) {
      let errorMessage = 'Error al crear prueba';
      if (error.response) {
        if (error.response.status === 400 && error.response.data.codigo) {
          errorMessage = `Error: ${error.response.data.codigo[0]}`;
        } else {
          errorMessage = error.response.data.message || errorMessage;
        }
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>Crear Nueva Prueba</Typography>
      <EnhancedFormGenerator
        formConfig={formConfig}
        onSubmit={onSubmit}
        submitText={loading ? "Creando..." : "Crear Prueba"}
        loading={loading}
      />
      <Button
        variant="outlined"
        sx={{ mt: 2 }}
        onClick={() => router.push('/gestion-pruebas')}
      >
        Cancelar
      </Button>
    </Box>
  );
};

export default CrearPrueba;