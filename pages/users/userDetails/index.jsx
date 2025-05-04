import { useState } from "react";
import { Card, CardContent, Typography, Button, Grid, Avatar } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";

// Datos de ejemplo
const userExample = {
  id: 1,
  name: "Juan Pérez",
  email: "juan@example.com",
  role: "Administrador",
  avatar: "https://via.placeholder.com/150",
};

export default function UserDetail({ user = userExample, onBack }) {
  return (
    <Card sx={{ maxWidth: 600, margin: "auto", mt: 4, p: 2, boxShadow: 3 }}>
      <CardContent>
        <Button startIcon={<ArrowBack />} onClick={onBack} sx={{ mb: 2 }}>
          Volver
        </Button>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Avatar src={user.avatar} sx={{ width: 80, height: 80 }} />
          </Grid>
          <Grid item>
            <Typography variant="h5" gutterBottom>
              {user.name}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              {user.email}
            </Typography>
            <Typography variant="body1" color="primary">
              {user.role}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}