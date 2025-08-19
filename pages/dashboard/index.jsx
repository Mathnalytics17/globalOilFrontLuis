import React, { useState, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, RadialBarChart, RadialBar, 
         ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell, 
         LabelList, Label } from "recharts";
import { DataGrid } from "@mui/x-data-grid";
import { Box, Typography, CircularProgress, Alert, Paper, Button } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { styled } from "@mui/system";
import Axios from 'axios';
import { useAuth } from '../../shared/context/AuthContext';

import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Colores mejorados y paleta profesional
const COLORS = {
  NORMAL: "#4CAF50",      // Verde
  ALERTA: "#FFC107",      // Amarillo
  CRITICO: "#F44336",     // Rojo
  "NO REGISTRA": "#9E9E9E", // Gris
  background: "#f5f7fa",  // Fondo claro
  text: "#333333",        // Texto oscuro
};

// Tema personalizado mejorado
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#4CAF50",
    },
    background: {
      default: COLORS.background,
    },
  },
  typography: {
    fontFamily: "'Roboto', sans-serif",
    h4: {
      fontWeight: 600,
      color: COLORS.text,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

// Componente estilizado para los contenedores
const ChartContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: "100%",
  display: "flex",
  flexDirection: "column",
  transition: "transform 0.3s ease-in-out",
  "&:hover": {
    transform: "translateY(-5px)",
  },
}));

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
 
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem("access_token") : null;
        
        if (!token) {
          throw new Error('No hay token disponible');
        }

        const response = await Axios.get(`${API_URL}/resultsOilAnalysis/`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.status !== 200) {
          throw new Error("Error al cargar los datos");
        }
        
        setData(response.data || []);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Procesamiento de datos mejorado con datos de ejemplo cuando no hay datos reales
  const processData = () => {
    const defaultCounts = { NORMAL: 0, ALERTA: 0, CRITICO: 0, "NO REGISTRA": 0 };
    
    // Si no hay datos, mostramos datos de ejemplo con valores cero
    const sampleData = data.length > 0 ? data : [
      { indicadores: "NO REGISTRA" },
      { indicadores: "NO REGISTRA" },
      { indicadores: "NO REGISTRA" }
    ];
    
    const indicadoresCount = sampleData.reduce((acc, item) => {
      const indicador = item.indicadores?.toUpperCase().trim() || "NO REGISTRA";
      acc[indicador] = (acc[indicador] || 0) + 1;
      return acc;
    }, { ...defaultCounts });

    const barChartData = Object.keys(defaultCounts).map((key) => ({
      name: key,
      count: indicadoresCount[key] || 0,
    }));

    const pieChartData = barChartData.map((item) => ({
      ...item,
      fill: COLORS[item.name],
    }));

    const gaugeData = pieChartData.map((item) => ({
      ...item,
      value: item.count,
      fill: COLORS[item.name],
    }));

    return { barChartData, pieChartData, gaugeData };
  };

  const { barChartData, pieChartData, gaugeData } = processData();
  const hasData = data.length > 0;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Alert severity="error" sx={{ width: '50%' }}>
          <Typography variant="h6">Error al cargar datos</Typography>
          <Typography>{error}</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
    
        <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
          Dashboard de Análisis de Lubricante
        </Typography>
        
        {!hasData && (
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Actualmente no hay datos de análisis disponibles. Cuando se agreguen nuevos análisis, aparecerán aquí automáticamente.
            </Alert>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => window.location.reload()}
              sx={{ mr: 2 }}
            >
              Reintentar
            </Button>
            <Button 
              variant="outlined" 
              color="primary"
              onClick={() => window.location.href = '/analisis/nuevo'}
            >
              Crear nuevo análisis
            </Button>
          </Box>
        )}
        
        {/* Grid de gráficos */}
        <Box
          display="grid"
          gridTemplateColumns="repeat(12, 1fr)"
          gap={3}
          sx={{ mb: 4 }}
        >
          {/* Gráfico de Barras */}
          <Box gridColumn="span 8">
            <ChartContainer>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Distribución de Indicadores
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={barChartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '8px', 
                      boxShadow: theme.shadows[3] 
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="count" 
                    radius={[4, 4, 0, 0]}
                  >
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                    ))}
                    <LabelList dataKey="count" position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {!hasData && (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
                  Gráfico muestra datos de ejemplo. No hay análisis registrados actualmente.
                </Typography>
              )}
            </ChartContainer>
          </Box>

          {/* Gráfico de Pastel */}
          <Box gridColumn="span 4">
            <ChartContainer>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Porcentaje de Indicadores
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    innerRadius={60}
                    label={({ name, percent }) => 
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      value, 
                      `${name}: ${(props.payload.percent * 100).toFixed(2)}%`
                    ]}
                  />
                  <Legend layout="vertical" align="right" verticalAlign="middle" />
                </PieChart>
              </ResponsiveContainer>
              {!hasData && (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
                  Visualización de ejemplo con datos predeterminados.
                </Typography>
              )}
            </ChartContainer>
          </Box>

          {/* Gráfico de Medidor Circular (Gauge) */}
          <Box gridColumn="span 4">
            <ChartContainer>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Estado General
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <RadialBarChart
                  innerRadius="20%"
                  outerRadius="90%"
                  data={gaugeData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    minAngle={15}
                    label={{ position: "insideStart", fill: "#fff" }}
                    background
                    clockWise
                    dataKey="count"
                  >
                    {gaugeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </RadialBar>
                  <Tooltip />
                  <Legend />
                  <Label
                    value="Estado General"
                    position="center"
                    fill={theme.palette.text.primary}
                    style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              {!hasData && (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
                  Todos los indicadores están en estado "No registra"
                </Typography>
              )}
            </ChartContainer>
          </Box>

          {/* Tabla de Datos */}
          <Box gridColumn="span 8">
            <ChartContainer>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Detalle de Análisis
              </Typography>
              <Box sx={{ height: 400, width: "100%" }}>
                <DataGrid
                  rows={hasData ? data.map((item, index) => ({
                    id: index,
                    indicadores: item.indicadores || "N/A",
                    observaciones: item.observaciones || "Sin observaciones",
                    fecha: item.fecha_muestreo || "N/A",
                  })) : [
                    { id: 0, indicadores: "NO REGISTRA", observaciones: "No hay datos disponibles", fecha: "N/A" }
                  ]}
                  columns={[
                    { 
                      field: "indicadores", 
                      headerName: "Indicadores", 
                      width: 150,
                      renderCell: (params) => (
                        <Box
                          sx={{
                            backgroundColor: COLORS[params.value?.toUpperCase()] || COLORS["NO REGISTRA"],
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                          }}
                        >
                          {params.value}
                        </Box>
                      ),
                    },
                    { field: "observaciones", headerName: "Observaciones", width: 300 },
                    { field: "fecha", headerName: "Fecha Muestreo", width: 150 },
                  ]}
                  pageSize={5}
                  rowsPerPageOptions={[5, 10, 20]}
                  sx={{
                    '& .MuiDataGrid-cell:hover': {
                      backgroundColor: theme.palette.action.hover,
                    },
                  }}
                />
                {!hasData && (
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
                    La tabla muestra un registro de ejemplo. No hay análisis reales registrados.
                  </Typography>
                )}
              </Box>
            </ChartContainer>
          </Box>
        </Box>
     
    </ThemeProvider>
  );
};

// Componente para estado vacío
const EmptyState = ({ message }) => (
  <Box
    display="flex"
    flexDirection="column"
    justifyContent="center"
    alignItems="center"
    height="100%"
    textAlign="center"
    p={4}
  >
    
    <Typography variant="body1" color="textSecondary">
      {message}
    </Typography>
  </Box>
);

export default Dashboard;