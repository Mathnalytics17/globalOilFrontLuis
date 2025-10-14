import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  Typography
} from "@mui/material";
import { Close, Warning } from "@mui/icons-material";

export default function AdvertenciaModal({ onClose }) {
  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: '#d9d9d9'
        }
      }}
    >
      {/* Header con botón de cerrar */}
      <DialogTitle sx={{ 
        pb: 1, 
        position: 'relative',
        textAlign: 'center'
      }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'gray.600',
            '&:hover': { color: 'black' }
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', px: 4 }}>
        {/* Icono de advertencia */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Warning sx={{ fontSize: 56, color: 'black' }} />
        </Box>

        {/* Título */}
        <Typography 
          variant="h5" 
          component="h2" 
          sx={{ 
            color: 'error.main', 
            fontWeight: 'bold', 
            mb: 2 
          }}
        >
          ¡ADVERTENCIA!
        </Typography>

        {/* Mensaje */}
        <Typography 
          variant="body2" 
          sx={{ color: 'text.primary', lineHeight: 1.5 }}
        >
          Crear una cuenta no garantiza el acceso. Debes elegir la empresa
          correcta y esperar la aprobación del administrador, quien también
          definirá tu rol.
        </Typography>
      </DialogContent>

      {/* Botón de acción */}
      <DialogActions sx={{ justifyContent: 'center', pb: 3, px: 4 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            bgcolor: '#3a3a3a',
            color: 'white',
            px: 4,
            py: 1,
            '&:hover': {
              bgcolor: '#222222'
            }
          }}
        >
          Continuar
        </Button>
      </DialogActions>
    </Dialog>
  );
}