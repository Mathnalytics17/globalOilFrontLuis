# Lubricantes, puntos de medida y recepción de muestras

## Regla de negocio

Un **punto de medida** es la configuración habitual de una máquina: lubricante
predeterminado, frecuencia de cambio y frecuencia de análisis. Una **muestra**
es una evidencia histórica: puede usar esa configuración como valor inicial,
pero nunca modifica el punto automáticamente.

## Flujo de recepción

1. Para una muestra usada se elige primero la máquina y después uno de sus
   puntos de medida. El listado de puntos queda filtrado por la máquina elegida.
2. Al seleccionar el punto se proponen su fabricante, referencia / marca y
   frecuencias. El operador puede ajustarlos para esa muestra sin cambiar el
   punto.
3. Un lubricante se identifica solamente por **fabricante + referencia / marca**
   (por ejemplo, Petrobras + Hydra 68). Se administra en Configuración técnica
   / Lubricantes. También se puede crear directamente desde el formulario de un
   punto de medida, completando ambos campos.
4. En identificación manual se puede registrar la máquina y el punto como
   texto. La máquina existente se reutiliza cuando la identificación coincide;
   el punto manual no crea automáticamente un punto maestro.

## Datos que no se deben confundir

- **Frecuencia de cambio / análisis**: planificación del punto de medida.
- **Periodo de aceite / equipo**: lectura real en la fecha de toma de la
  muestra.

## Persistencia y compatibilidad

La migración `activesTree.0011_lubricant_catalog` añade el catálogo por empresa
y una referencia opcional desde el punto de medida. El campo de texto histórico
`PuntoMuestreo.lubricante` se conserva para no perder puntos ya creados.

## Puesta en marcha

Ejecute la migración con el entorno Python/Docker que ya utiliza el backend:

```powershell
docker compose exec backend python manage.py migrate
```

No se publica ni se inicia el frontend desde este cambio. El proceso de
desarrollo en el puerto 3000 sigue siendo responsabilidad de quien lo ejecuta.
