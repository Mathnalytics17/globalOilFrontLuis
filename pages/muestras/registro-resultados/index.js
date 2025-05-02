import React, { useState } from 'react';
import { Tabs, Tab, Box, Typography } from '@mui/material';

const RegistroResultados = () => {
    const [activeTab, setActiveTab] = useState(0);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Box sx={{ width: '100%', padding: 2 }}>
            <Typography variant="h4" gutterBottom>
                Registro de Resultados
            </Typography>
            <Tabs value={activeTab} onChange={handleTabChange} indicatorColor="primary" textColor="primary">
                <Tab label="Resultados Generales" />
                <Tab label="Resultados Detallados" />
                <Tab label="Historial" />
            </Tabs>
            <Box sx={{ marginTop: 2 }}>
                {activeTab === 0 && (
                    <Box>
                        <Typography variant="h6">Resultados Generales</Typography>
                        <p>Aquí puedes ver un resumen general de los resultados.</p>
                    </Box>
                )}
                {activeTab === 1 && (
                    <Box>
                        <Typography variant="h6">Resultados Detallados</Typography>
                        <p>Aquí puedes ver los resultados detallados.</p>
                    </Box>
                )}
                {activeTab === 2 && (
                    <Box>
                        <Typography variant="h6">Historial</Typography>
                        <p>Aquí puedes ver el historial de resultados.</p>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default RegistroResultados;