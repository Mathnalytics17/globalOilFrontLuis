import React from 'react';

const Unauthorized = () => {
    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Acceso no autorizado</h1>
            <p style={styles.message}>
                No tienes permiso para acceder a esta página. Por favor, verifica tus credenciales o contacta al administrador.
            </p>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f8f9fa',
        color: '#343a40',
        textAlign: 'center',
        padding: '20px',
    },
    title: {
        fontSize: '2rem',
        marginBottom: '1rem',
    },
    message: {
        fontSize: '1rem',
    },
};

export default Unauthorized;