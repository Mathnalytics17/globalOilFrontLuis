import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../shared/context/AuthContext';
import { toast } from 'react-toastify';
import { Box, Typography, Button } from '@mui/material';
import EnhancedFormGenerator from '../../../shared/components/formGenComponent';

const EditarPrueba = () => {
  const { api } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [prueba, setPrueba] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState({});

  useEffect(() => {
    const fetchPrueba = async () => {
      if (!id) return;
      
      try {
        const response = await api.get(`misc/pruebas/${id}/`);
        setPrueba(response.data);
        setInitialValues({
          codigo: response.data.codigo,
          nombre: response.data.nombre,
          descripcion: response.data.descripcion,
          metodo_referencia: response.data.metodo_referencia,
          unidad_medida: response.data.unidad_medida,
          equipo_requerido: response.data.equipo_requerido,
          activo: response.data.activo
        });
      } catch (error) {
        toast.error('Error al cargar prueba: ' + (error.response?.data?.message || error.message));
        router.push('/gestion-pruebas');
      }
    };

    fetchPrueba();
  }, [api, id, router]);

  const formConfig = [
    {
      name: 'codigo',
      label: 'Código',
      type: 'text',
      required: true,
      disabled: true, // Código no se puede modificar
      validation: (value) => 
        /^[A-Z0-9]{2,20}$/.test(value) || 'Código debe ser alfanumérico en mayúsculas'
    },
    {
      name: 'nombre',
      label: 'Nombre',
      type: 'text',
      required: true
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea'
    },
    {
      name: 'metodo_referencia',
      label: 'Método de Referencia',
      type: 'text'
    },
    {
      name: 'unidad_medida',
      label: 'Unidad de Medida',
      type: 'text'
    },
    {
      name: 'equipo_requerido',
      label: 'Equipo Requerido',
      type: 'text'
    },
    {
      name: 'activo',
      label: 'Activo',
      type: 'checkbox'
    }
  ];

  const onSubmit = async (formData) => {
    setLoading(true);
    try {
      await api.patch(`misc/pruebas/${id}/`, formData);
      toast.success('Prueba actualizada exitosamente');
      router.push('/gestion-pruebas');
    } catch (error) {
      toast.error('Error al actualizar prueba: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (!prueba) {
    return <Box sx={{ p: 3 }}>Cargando datos de la prueba...</Box>;
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Editar Prueba: {prueba.codigo} - {prueba.nombre}
      </Typography>
      <EnhancedFormGenerator
        formConfig={formConfig}
        onSubmit={onSubmit}
        submitText="Guardar Cambios"
        initialValues={initialValues}
        loading={loading}
      />
    </Box>
  );
};

export default EditarPrueba;