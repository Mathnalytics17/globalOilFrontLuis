# Límites y experiencia unificada

## Decisión de modelo

`Editable al asignar` deja de ser un origen de límite. Era ambiguo porque
permitía cambiar valores, pero no definía una evaluación técnica completa.
Las configuraciones nuevas usan solamente:

- **Catálogo técnico**: la regla cambia por combinación de datos técnicos.
- **Regla base**: la regla definida para todas las muestras; una asignación
  autorizada puede ajustar sus valores sin perder la operación ni el semáforo.
- **Escala / valor esperado**: evaluación cualitativa o booleana.
- **Informativo**: se registra, pero no define estado técnico.

Las configuraciones históricas con `asignacion` se normalizan a `directo`
cuando se vuelven a guardar. El backend conserva soporte de lectura para no
invalidar registros anteriores durante la transición.

## Importación de matrices

La plantilla entrega una hoja **Matriz de limites** y una hoja **Guía**. La
guía explica cada columna, cuándo usar `NA` y que `0` es un valor válido. La
importación es transaccional: ante un error no se aplica ninguna fila.

Los errores deben mostrarse al usuario como `fila + columna + corrección`, no
como JSON de la API. El backend ya conserva los errores estructurados para que
la interfaz pueda presentarlos de esa forma.

## Navegación y carga

- La miga de pan es la única navegación de regreso dentro de páginas
  autenticadas; no se agregan botones `Volver` en encabezados.
- No se agregan botones genéricos `Recargar`. Las vistas cargan al entrar y se
  actualizan después de guardar, eliminar o restaurar. Un `Reintentar` solo
  procede dentro de un error recuperable.
- Para cargas nuevas se usa `GlobalOilLoader`; no usar texto aislado
  `Cargando...`.
- En menos de 1280px la navegación es drawer superpuesto. Las vistas no deben
  asumir el ancho del sidebar ni imponer un ancho fijo al contenido.

## Reglas visuales

Las cabeceras usan `go-page-heading`, acciones compactas y tablas con
contenedor horizontal controlado. Formularios y tarjetas deben usar columnas
`minmax(0, 1fr)` y cambiar a una sola columna antes de que el sidebar o un
drawer reduzcan el espacio disponible.
