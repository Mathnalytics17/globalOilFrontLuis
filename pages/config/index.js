import React from 'react';
import { useRouter } from 'next/router';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActionArea, 
  Avatar,
  Container,Button
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Build as MachinesIcon,
  Science as TestsIcon,
  TrendingUp as LimitsIcon,
  Folder as FoldersIcon,
  People as UsersIcon,
  Assessment as ReportsIcon,
  Notifications as AlertsIcon
} from '@mui/icons-material';

const ConfigDashboard = () => {
  const router = useRouter();

  const modules = [
    {
      title: "Gestión de Máquinas",
      icon: <MachinesIcon fontSize="large" />,
      path: "/machines",
      color: "#4caf50",
      description: "Administra el inventario de máquinas y equipos"
    },
    {
      title: "Límites y Parámetros",
      icon: <LimitsIcon fontSize="large" />,
      path: "/config/limits",
      color: "#2196f3",
      description: "Configura límites y parámetros técnicos"
    },
    {
      title: "Pruebas y Ensayos",
      icon: <TestsIcon fontSize="large" />,
      path: "/pruebas",
      color: "#9c27b0",
      description: "Administra tipos de pruebas y protocolos"
    },
    {
      title: "Estructura de Carpetas",
      icon: <FoldersIcon fontSize="large" />,
      path: "/activesTree",
      color: "#ff9800",
      description: "Organiza la jerarquía de carpetas y ubicaciones"
    },
    {
      title: "Configuración de Usuarios",
      icon: <UsersIcon fontSize="large" />,
      path: "/administrationPanel/user-management",
      color: "#607d8b",
      description: "Administra usuarios y permisos del sistema"
    },
    {
      title: "Reportes y Análisis",
      icon: <ReportsIcon fontSize="large" />,
      path: "/documents",
      color: "#f44336",
      description: "Personaliza reportes y dashboards"
    },
    {
      title: "Alertas y Notificaciones",
      icon: <AlertsIcon fontSize="large" />,
      path: "/administrationPanel/alerts-config",
      color: "#e91e63",
      description: "Configura reglas de notificaciones"
    },
    {
      title: "Configuración General",
      icon: <SettingsIcon fontSize="large" />,
      path: "/config",
      color: "#795548",
      description: "Ajustes globales del sistema"
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Panel de Configuración
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Centro de control para todas las configuraciones del sistema
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {modules.map((module, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                borderLeft: `4px solid ${module.color}`,
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}
            >
              <CardActionArea 
                sx={{ height: '100%' }} 
                onClick={() => router.push(module.path)}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: module.color, 
                      width: 60, 
                      height: 60, 
                      mb: 2,
                      margin: '0 auto'
                    }}
                  >
                    {module.icon}
                  </Avatar>
                  <Typography variant="h6" component="div" gutterBottom>
                    {module.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {module.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Sección de Configuración Rápida */}
      <Box sx={{ mt: 6, p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          Configuraciones Prioritarias
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              p: 2, 
              border: '1px solid #eee', 
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <MachinesIcon color="primary" fontSize="large" />
              <Box>
                <Typography variant="subtitle1">Configurar nueva máquina</Typography>
                <Typography variant="body2" color="text.secondary">
                  Agrega y configura equipos en el sistema
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => router.push('/administrationPanel/machine-management/crear')}
                  >
                    Ir a creación
                  </Button>
                </Box>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              p: 2, 
              border: '1px solid #eee', 
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <LimitsIcon color="primary" fontSize="large" />
              <Box>
                <Typography variant="subtitle1">Definir nuevos límites</Typography>
                <Typography variant="body2" color="text.secondary">
                  Establece parámetros técnicos y rangos aceptables
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => router.push('/administrationPanel/limits-management/crear')}
                  >
                    Configurar límites
                  </Button>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default ConfigDashboard;