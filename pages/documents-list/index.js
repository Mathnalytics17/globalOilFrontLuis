import React, { useState } from 'react';
import DataTable from '../../shared/components/dataTableGen';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Chip
} from '@mui/material';
import { Visibility, PictureAsPdf, Description } from '@mui/icons-material';

const DocumentsList = () => {
  // Estado para el diálogo de visualización
  const [openDialog, setOpenDialog] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);

  // Columnas para la tabla de documentos
  const columns = [
    {
      id: 'reportId',
      label: 'ID Reporte',
      minWidth: 100,
      filterable: true,
      render: (row) => <strong>REP-{row.reportId}</strong>
    },
    {
      id: 'title',
      label: 'Título del Reporte',
      minWidth: 200,
      filterable: true,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {row.type === 'pdf' ? <PictureAsPdf color="error" /> : <Description color="primary" />}
          {row.title}
        </Box>
      )
    },
    {
      id: 'client',
      label: 'Cliente',
      minWidth: 150,
      filterable: true
    },
    {
      id: 'date',
      label: 'Fecha de Generación',
      minWidth: 120,
      render: (row) => new Date(row.date).toLocaleDateString()
    },
    {
      id: 'status',
      label: 'Estado',
      align: 'center',
      render: (row) => (
        <Chip 
          label={row.status} 
          color={row.status === 'Completado' ? 'success' : 'warning'} 
          size="small"
          variant="outlined"
        />
      )
    }
  ];

  // Acciones para cada fila
  const actions = [
    {
      id: 'view',
      icon: <Visibility fontSize="small" />,
      tooltip: 'Ver reporte completo',
      handler: (row) => {
        setCurrentReport(row);
        setOpenDialog(true);
      }
    }
  ];

  // Datos de ejemplo para reportes
  const reportData = [
    { 
      reportId: '10025',
      title: 'Análisis de Aceite - Motor D21',
      client: 'MINEROS ALUVIAL S.A.S',
      date: '2023-01-15',
      status: 'Completado',
      type: 'pdf',
      equipment: 'MOTOR SUMERGIBLE DIA/6A No.21',
      lubricant: 'MAXILUDISO-LIVRYNTHETIC BLINDING 32',
      content: `RESULTADOS DEL ANÁLISIS:
      - Viscosidad 40°C: 31.66 cSt
      - Contaminación: Alta presencia de silicio (146,200 ppm)
      - Agua: 108 ppm
      CONCLUSIÓN: El aceite presenta contaminación con agua y tierra. Se recomienda cambio inmediato.`
    },
    { 
      reportId: '10026',
      title: 'Análisis de Desgaste - Turbina T45',
      client: 'ENERGÍA RENOVABLE S.A.',
      date: '2023-02-20',
      status: 'Pendiente',
      type: 'doc',
      equipment: 'TURBINA HIDRÁULICA T45',
      lubricant: 'TURBOLUBE SYNTHETIC 68',
      content: `RESULTADOS PRELIMINARES:
      - Niveles de hierro: 58 ppm (dentro de límites)
      - Oxidación: 0.8 abs/0.1 mm2
      OBSERVACIÓN: Se requieren análisis adicionales para confirmar resultados.`
    },
    { 
      reportId: '10027',
      title: 'Evaluación de Lubricante - Compresor C12',
      client: 'AIRE INDUSTRIAL LTDA',
      date: '2023-03-10',
      status: 'Completado',
      type: 'pdf',
      equipment: 'COMPRESOR DE TORNILLO C12',
      lubricant: 'AIREX COMPRESSOR OIL 100',
      content: `RESULTADOS FINALES:
      - Viscosidad 100°C: 10.2 cSt
      - TAN: 1.8 mgKOH/g
      - Contaminantes: Dentro de límites aceptables
      CONCLUSIÓN: Lubricante en buen estado, continuar con programa de monitoreo.`
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Reportes de Análisis
      </Typography>
      
      <DataTable
        columns={columns}
        data={reportData}
        actions={actions}
        selectable
        searchable
        pagination
        sx={{ 
          mt: 2,
          '& .MuiTableCell-root': {
            py: 1.5
          }
        }}
      />

      {/* Diálogo para ver el reporte completo */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {currentReport?.title || 'Detalles del Reporte'}
        </DialogTitle>
        <DialogContent dividers>
          {currentReport && (
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Información General
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography><strong>ID Reporte:</strong> REP-{currentReport.reportId}</Typography>
                <Typography><strong>Cliente:</strong> {currentReport.client}</Typography>
                <Typography><strong>Equipo:</strong> {currentReport.equipment}</Typography>
                <Typography><strong>Lubricante:</strong> {currentReport.lubricant}</Typography>
                <Typography><strong>Fecha:</strong> {new Date(currentReport.date).toLocaleDateString()}</Typography>
                <Typography><strong>Estado:</strong> 
                  <Chip 
                    label={currentReport.status} 
                    color={currentReport.status === 'Completado' ? 'success' : 'warning'} 
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Box>

              <Typography variant="h6" gutterBottom>
                Contenido del Reporte
              </Typography>
              <Box sx={{ 
                p: 2, 
                backgroundColor: '#f9f9f9', 
                borderRadius: 1,
                whiteSpace: 'pre-line'
              }}>
                {currentReport.content}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<PictureAsPdf />}
            onClick={() => console.log('Generar PDF')}
          >
            Exportar a PDF
          </Button>
          <Button 
            onClick={() => setOpenDialog(false)}
            variant="outlined"
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentsList;