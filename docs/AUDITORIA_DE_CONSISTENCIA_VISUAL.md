# Auditoría de consistencia visual y responsive

Fecha: 14 de octubre de 2026.

## Criterio aplicado

La interfaz usa una escala compacta: controles de 36 px, botones de acción de
36–38 px, iconos para acciones destructivas o de fila y tablas con
desplazamiento horizontal solo dentro de su contenedor. En móvil, las cabeceras
y grupos de acciones se apilan, sin que la página desborde horizontalmente.

No hay botones de «Volver» dentro de las vistas: la navegación contextual se
realiza mediante las migas de pan superiores.

## Vistas activas revisadas

| Área | Rutas | Resultado |
| --- | --- | --- |
| Escalas de comparación | `/configuracion-tecnica/escalas`, `/create`, `/edit/[id]` | Corregida. El formulario separa datos, estado y acciones; el control de estado es un interruptor compacto; reordenar y eliminar usan iconos de fila. |
| Pruebas técnicas | `/configuracion-tecnica/pruebas/crear-prueba`, `/editar-prueba/[id]` | Normalizada. Se aplicó la escala compacta a guardar, agregar, acciones internas e iconos; se eliminó la navegación «Volver» visual. |
| Tipos de gestión | `/configuracion-tecnica/tipos-gestion-muestras` | Corregida. Las casillas ya no heredan el ancho total de los campos y los filtros, tarjetas y tabla usan el módulo técnico común. |
| Catálogos, campos, unidades y condiciones | `/configuracion-tecnica/catalogos`, `/campos-muestra`, `/unidades-condiciones` | Revisadas: emplean `TechnicalConfigShell` y `TechnicalConfig.module.css`, con tarjetas, formularios y tablas compactos. |
| Límites, equipos y métodos | `/configuracion-tecnica/limites/**`, `/equipos-metodos` | Revisadas: se mantienen los contenedores de tabla y las acciones compactas del sistema. |
| Notificaciones y comentarios técnicos | `/configuracion-tecnica/notificaciones`, `/comentarios` | Revisadas: controles de 40 px o menos, rejillas que se apilan en móvil y acciones consistentes. |
| Lotes y recepción de muestras | `/muestras`, `/muestras/lotes/**`, `/muestras/nuevo-lote`, `/muestras/laboratorio` | Normalizadas por primitivas globales: filtros, tarjetas, tablas y áreas de acción adaptan su ancho por breakpoint. |
| Asignación, resultados, revisión e interpretación | `/muestras/asignacion-pruebas`, `/resultados`, `/revision-resultados`, `/interpretacion` | Corregidas con reglas de operación: botones compactos, matriz con desplazamiento contenido y editores que se convierten en tarjetas en pantallas estrechas. |
| Máquinas | `/machines`, `/create-machine`, `/edit-machine`, `/detail-machine`, `/historico` | Revisadas. Se retiraron los retornos internos y se comparten acciones, estados de error, tarjetas y tablas responsive. |
| Empresas | `/managment-companies/**` | Revisadas: las rutas actuales usan las páginas `CreateCompanyPage` y sus componentes comunes. |
| Reportes | `/reportes/**` | Revisadas bajo las primitivas globales de cabecera, tarjetas, filtros y tablas. |

## Componentes antiguos sin ruta activa

Se encontraron variantes heredadas que no están importadas por ninguna ruta de
`pages/`: `TipoGestionMuestraForm.jsx`, `TipoGestionMuestraList.jsx`,
`CompanyCreatePage.jsx`, `SampleBatchesPage.jsx` y duplicados de
`PruebaForm`. No se usan para renderizar la aplicación actual. Se conservaron
sin tocar su lógica para no borrar referencias históricas; la normalización
global evita que sus controles heredados vuelvan a generar casillas gigantes si
una ruta los reincorpora accidentalmente.

## Piezas comunes que previenen regresiones

- `pages/globals.css`: tamaño de controles, tablas encapsuladas, responsive y
  compatibilidad de pantallas heredadas.
- `TechnicalConfig.module.css`: formularios, interruptores, acciones, tablas y
  estados del área de configuración.
- `src/shared/ui/PageHeader.jsx`, `MetricStrip.jsx`, `OverflowMenu.jsx`: misma
  jerarquía visual para títulos, métricas y acciones por fila.
- `src/shared/ui/GlobalOilLoader.jsx`: cargador de Global Oil en lugar del
  indicador de Next.js.

La guía para las nuevas pantallas está en
`frontend/docs/GUIA_DE_COMPONENTES_Y_RESPONSIVIDAD.md`.

## Filtros

Se revisaron los filtros de las vistas activas. Los que ya filtran sobre el
arreglo visible (empresas, máquinas, seguridad, unidades, condiciones,
notificaciones, límites, reportes y flujos de resultados) conservan ese
comportamiento. Se corrigieron los que presentaban el conjunto original pese a
tener texto de búsqueda:

| Vista | Corrección |
| --- | --- |
| Catálogo de pruebas | Busca localmente por nombre, acrónimo, método, equipo, condición y unidad; pagina después de filtrar. |
| Catálogos técnicos | Busca localmente por nombre, código, descripción y tipo de muestra; pagina después de filtrar. |
| Lotes de muestras | Aplica búsqueda, estado, tipo y rango de fechas al conjunto recibido antes de renderizar y paginar. |
| Ingreso a laboratorio | Filtra localmente lotes disponibles e ingresos por lote, cliente, contacto, gestión y receptor; muestra un estado de cero coincidencias. |

El principio a conservar es: un filtro no depende exclusivamente de que la API
reconozca un parámetro; el cliente vuelve a validar el conjunto que presenta.
