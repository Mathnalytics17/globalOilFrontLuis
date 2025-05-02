// pages/404.js
import { useRouter } from 'next/router';
import { Button, Typography, Box, Container } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';

export default function Custom404() {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/dashboard'); // Redirige al Home
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          gap: 3,
        }}
      >
        {/* Título y mensaje */}
        <Typography variant="h1" sx={{ fontSize: '4rem', fontWeight: 'bold' }}>
          404
        </Typography>
        <Typography variant="h5" color="textSecondary">
          ¡Página no encontrada!
        </Typography>
        <Typography variant="body1">
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </Typography>

        {/* Botón para regresar al Home */}
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={handleGoHome}
          sx={{ mt: 3 }}
        >
          Volver al Inicio
        </Button>
      </Box>
    </Container>
  );
}