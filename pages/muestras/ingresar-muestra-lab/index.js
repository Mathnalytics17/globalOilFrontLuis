import React, { useState, useEffect } from 'react';
import FormGenerator from '../../../shared/components/formGenComponent';
import { useAuth } from '../../../shared/context/AuthContext';
import { toast } from 'react-toastify';

const IngresoMuestra = () => {
  const { api, user } = useAuth();
  const [allSamples, setAllSamples] = useState([]);
  const [availableSamples, setAvailableSamples] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar todas las muestras y usuarios
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [samplesRes, usersRes] = await Promise.all([
          api.get('lubrication/samples/'),
          api.get('users/')
        ]);
        
        setAllSamples(samplesRes.data);
        setAvailableSamples(samplesRes.data.filter(sample => !sample.is_ingresado));
        setUsers(usersRes.data);
      } catch (error) {
        toast.error('Error al cargar datos: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api]);

  const formConfig = [
    {
      name: 'muestra',
      label: 'ID de la Muestra',
      type: 'select',
      options: availableSamples.map(sample => ({
        value: sample.id,
        label: `Muestra ${sample.id} - ${sample.name || 'Sin nombre'}`
      })),
      required: true,
      placeholder: 'Seleccione una muestra disponible'
    },
    {
      name: 'fecha_recepcion',
      label: 'Fecha de Recepción',
      type: 'datetime-local',
      required: true
    },
    {
      name: 'usuario_recepcion',
      label: 'Usuario que registra',
      type: 'select',
      options: users.map(user => ({
        value: user.id,
        label: `${user.first_name} ${user.last_name} (${user.email})`
      })),
      required: true,
      disabled: !user?.is_superuser
    },
    {
      name: 'observaciones',
      label: 'Observaciones',
      type: 'textarea',
      placeholder: 'Ingrese observaciones relevantes'
    },
    {
      name: 'propiedades_adicionales',
      label: 'Propiedades adicionales',
      type: 'dynamic-fields',
      fieldTypes: [
        { value: 'text', label: 'Texto' },
        { value: 'number', label: 'Número' },
        { value: 'select', label: 'Selección' }
      ]
    }
  ];

  const onSubmit = async (formData) => {
    try {
      // Validar muestra seleccionada
      const selectedSample = allSamples.find(s => s.id === formData.muestra);
      if (!selectedSample) {
        toast.error('Muestra no encontrada');
        return;
      }

      if (selectedSample.is_ingresado) {
        toast.error('Esta muestra ya fue ingresada anteriormente');
        return;
      }

      // Preparar payload para lab-entries
      const labEntryPayload = {
        muestra: formData.muestra,
        fecha_recepcion: formData.fecha_recepcion,
        usuario_recepcion: formData.usuario_recepcion,
        observaciones: formData.observaciones,
        propiedades: {}
      };

      // Procesar propiedades adicionales
      if (formData.propiedades_adicionales) {
        formData.propiedades_adicionales.forEach(prop => {
          labEntryPayload.propiedades[prop.nombre] = prop.valor;
        });
      }

      // 1. Registrar el ingreso al laboratorio
      const response = await api.post('lubrication/lab-entries/', labEntryPayload);
      
      // 2. Actualizar el estado de la muestra en el backend
      await api.patch(`lubrication/samples/${formData.muestra}/`, {
        is_ingresado: true,
        ingreso_lab: response.data.id
      });

      // 3. Refrescar los datos del servidor para garantizar consistencia
      const refreshedSamples = await api.get('lubrication/samples/');
      setAllSamples(refreshedSamples.data);
      setAvailableSamples(refreshedSamples.data.filter(s => !s.is_ingresado));

      toast.success('Muestra ingresada al laboratorio exitosamente');

    } catch (error) {
      console.error('Error en el proceso:', error);
      toast.error('Error al registrar: ' + (error.response?.data?.message || error.message));
    }
  };
  if (loading) {
    return <div className="text-center py-8">Cargando datos...</div>;
  }

  if (availableSamples.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Ingreso al Laboratorio</h1>
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-lg mb-4">No hay muestras disponibles para ingresar al laboratorio</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Ingreso al Laboratorio</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <FormGenerator 
          formConfig={formConfig}
          onSubmit={onSubmit}
          submitText="Registrar Ingreso"
          initialValues={{
            fecha_recepcion: new Date().toISOString().slice(0, 16),
            usuario_recepcion: user?.id || (users.length > 0 ? users[0].id : '')
          }}
        />
      </div>
    </div>
  );
};

export default IngresoMuestra;