import React, { useState, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, RadialBarChart, RadialBar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from "recharts";
import { DataGrid } from "@mui/x-data-grid";
import ReactGridLayout from "react-grid-layout";
import { CircularProgress, Alert, Box, Typography } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Colores para cada tipo de indicador
const COLORS = {
  NORMAL: "#4CAF50",      // Verde
  ALERTA: "#FFC107",      // Amarillo
  CRITICO: "#F44336",     // Rojo
  "NO REGISTRA": "#9E9E9E", // Gris
};

// Tema personalizado para Material-UI
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#4CAF50",
    },
  },
  typography: {
    fontFamily: "'Roboto', sans-serif",
  },
});

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_URL}/resultsOilAnalysis/`);
        if (!response.ok) {
          throw new Error("Error al cargar los datos");
        }
        const json = await response.json();
        setData(json);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Contar los valores de indicadores
  const indicadoresCount = data.reduce(
    (acc, item) => {
      const indicador = item.indicadores?.toUpperCase().trim();
      if (indicador) {
        acc[indicador] = (acc[indicador] || 0) + 1;
      }
      return acc;
    },
    { NORMAL: 0, ALERTA: 0, CRITICO: 0, "NO REGISTRA": 0 }
  );

  // Datos para gráficos
  const barChartData = Object.keys(indicadoresCount).map((key) => ({
    name: key,
    count: indicadoresCount[key],
  }));

  const pieChartData = barChartData.map((item) => ({
    name: item.name,
    value: item.count,
    fill: COLORS[item.name],
  }));

  // Datos para Gauge (medidor circular)
  const gaugeData = Object.keys(indicadoresCount).map((key) => ({
    name: key,
    value: indicadoresCount[key],
    fill: COLORS[key],
  }));

  const layout = [
    { i: "barChart", x: 0, y: 0, w: 6, h: 4 },
    { i: "pieChart", x: 6, y: 0, w: 3, h: 4 },
    { i: "gaugeChart", x: 9, y: 0, w: 3, h: 4},
    { i: "dataGrid", x: 0, y: 3, w: 12, h: 4 },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ padding: 3 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard de Análisis de Lubricante
        </Typography>
        <ReactGridLayout className="layout" layout={layout} cols={12} rowHeight={100} width={1200}>
          
          {/* Gráfico de Barras */}
          <div key="barChart">
            <ChartContainer title="Indicadores">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {barChartData.map((entry, index) => (
                    <Bar key={index} dataKey="count" fill={COLORS[entry.name]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Gráfico de Pastel */}
          <div key="pieChart">
            <ChartContainer title="Distribución de Indicadores">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pieChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Gráfico de Medidor Circular (Gauge) */}
          <div key="gaugeChart">
            <ChartContainer title="Indicadores - Gauge">
              <ResponsiveContainer width="100%" height={300}>
                <RadialBarChart innerRadius="30%" outerRadius="90%" data={gaugeData} startAngle={90} endAngle={-270}>
                  <RadialBar minAngle={15} label={{ position: "insideStart", fill: "#fff" }} background clockWise dataKey="value" />
                  <Tooltip />
                  <Legend />
                </RadialBarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Tabla de Datos */}
          <div key="dataGrid">
            <ChartContainer title="Datos de Análisis">
              <Box sx={{ height: 400, width: "100%" }}>
                <DataGrid
                  rows={data.map((item, index) => ({
                    id: index,
                    indicadores: item.indicadores || "N/A",
                    observaciones: item.observaciones || "Sin observaciones",
                  }))}
                  columns={[
                    { field: "indicadores", headerName: "Indicadores", width: 200 },
                    { field: "observaciones", headerName: "Observaciones", width: 400 },
                  ]}
                  pageSize={5}
                  rowsPerPageOptions={[5, 10, 20]}
                />
              </Box>
            </ChartContainer>
          </div>
        </ReactGridLayout>
      </Box>
    </ThemeProvider>
  );
};

// Contenedor de gráficos con estilos
const ChartContainer = ({ children, title }) => (
  <Box sx={{ background: "white", padding: 3, borderRadius: 2, boxShadow: 2 }}>
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    {children}
  </Box>
);

export default Dashboard;