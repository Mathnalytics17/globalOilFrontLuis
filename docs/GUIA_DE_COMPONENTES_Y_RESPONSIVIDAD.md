# Guía de componentes y responsividad

## Principio

Una vista no debe crear su propio lenguaje visual. Debe componerse con las primitivas globales de `pages/globals.css` y los componentes de `src/shared/ui`.

## Primitivas obligatorias

| Necesidad | Usar |
| --- | --- |
| Marco de pantalla | `go-page` + `go-shell` |
| Título, descripción y acciones | `PageHeader` |
| Panel de contenido | `go-card` |
| Dos columnas de contenido | `go-grid-two` |
| Formulario | `go-form-grid`, `go-span-2` |
| Tabla | `DataTable` o `go-table-wrap` |
| Acción principal | `go-primary` |
| Acción secundaria | `go-ghost` |
| Acción destructiva | `go-danger` |
| Error que bloquea la pantalla | `AppErrorState` |
| Carga general | `GlobalOilLoader` |

## Navegación

La barra superior contiene las migas clicables. No se añaden botones “Volver” dentro de las pantallas, tarjetas o encabezados. La excepción son acciones de cancelar un formulario o cerrar un modal: no son navegación y deben decir exactamente **Cancelar** o **Cerrar**.

## Iconos

Los iconos vienen exclusivamente de `lucide-react`, siempre junto a texto cuando la acción no sea universalmente reconocible.

- Crear: `Plus`
- Editar: `Pencil`
- Guardar: `Save`
- Recargar: `RefreshCw`
- Eliminar: `Trash2`
- Desactivar/bloquear: `Power` para estado operativo y `ShieldOff` para bloquear acceso
- Reactivar: `RotateCcw`

No use iconos de una biblioteca distinta ni glifos Unicode para acciones operativas.

## Reglas responsive

- Escritorio: la navegación lateral y el contenido comparten el máximo de `go-shell`.
- Hasta 1024 px: se reducen los espacios y las acciones pueden envolver sin desbordar.
- Hasta 640 px: encabezados, formularios y tarjetas pasan a una columna; las acciones se muestran en una cuadrícula de dos columnas cuando cabe.
- Las tablas conservan sus columnas y desplazan horizontalmente dentro de `go-table-wrap`; la página nunca debe producir scroll horizontal.
- Todo control debe poder encogerse: `min-width: 0` y `max-width: 100%` ya están definidos globalmente.

## Prohibiciones

- No añadir `style` o CSS global incrustado para resolver una única página.
- No definir colores hexadecimales nuevos sin antes añadir un token `--go-*`.
- No usar alturas/anchos fijos que impidan el uso en móvil.
- No mostrar dos mecanismos para el mismo fallo (toast + pantalla de error).
