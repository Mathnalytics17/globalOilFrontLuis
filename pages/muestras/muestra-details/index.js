import React from 'react';

const MuestraDetails = () => {
    const muestra = {
        id: 1,
        nombre: 'Muestra de Petróleo',
        descripcion: 'Esta es una muestra de petróleo crudo extraído del pozo X.',
        propiedades: {
            densidad: '0.85 g/cm³',
            viscosidad: '10 cP',
            temperatura: '25°C',
        },
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Detalles de la Muestra</h1>
            <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
                <h2>{muestra.nombre}</h2>
                <p>{muestra.descripcion}</p>
                <h3>Propiedades Técnicas:</h3>
                <ul>
                    <li><strong>Densidad:</strong> {muestra.propiedades.densidad}</li>
                    <li><strong>Viscosidad:</strong> {muestra.propiedades.viscosidad}</li>
                    <li><strong>Temperatura:</strong> {muestra.propiedades.temperatura}</li>
                </ul>
            </div>
        </div>
    );
};

export default MuestraDetails;