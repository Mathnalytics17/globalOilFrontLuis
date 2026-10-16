# Manejo de errores y retroalimentación

## Objetivo

Las personas usuarias deben recibir mensajes claros, seguros y accionables. Un error no debe mostrar rutas internas, trazas, nombres de recursos ajenos, permisos concretos ni detalles de infraestructura.

La política vive en `src/shared/utils/errors.js` y se aplica a todas las respuestas de `apiClient`.

## Qué verá la persona usuaria

| Situación | Título | Mensaje y acción |
| --- | --- | --- |
| Sin conexión o tiempo de espera | Sin conexión con el servicio | Verifique su conexión e inténtelo nuevamente. Se ofrece **Reintentar**. |
| Sesión vencida | La sesión finalizó | Inicie sesión nuevamente para continuar. |
| Recurso ajeno, inexistente o no accesible (403/404) | Recurso no disponible | El recurso solicitado no está disponible. Se ofrece volver a una vista segura. |
| Conflicto de datos (409) | No se pudo aplicar el cambio | Actualice la información e inténtelo de nuevo. |
| Límite de intentos (429) | Demasiados intentos | Espere un momento antes de volver a intentarlo. |
| Fallo del servidor (5xx) | El servicio no está disponible | Inténtelo nuevamente en unos minutos. Si continúa, contacte a soporte. |
| Validación (400/422) | Revise la información | Se muestra el primer mensaje de validación útil; el formulario debe señalar el campo cuando tenga ese detalle. |

Los estados 403 y 404 comparten intencionalmente el mismo texto. No se confirma si existe un recurso que el usuario no puede consultar.

## Cuándo usar cada mecanismo

### Estado de pantalla

Use `AppErrorState` cuando la pantalla no puede funcionar sin la respuesta: cargar una máquina, un lote, una edición o una vista de detalle. Debe recibir `onRetry` si la operación puede reintentarse y una acción `onBack` hacia una ruta segura.

```jsx
<AppErrorState
  error={loadError}
  fallback="No fue posible cargar el lote."
  onRetry={loadData}
  onBack={() => router.push('/muestras/lotes')}
  backLabel="Volver a lotes"
/>
```

No agregue un toast adicional para el mismo fallo: duplicar el aviso confunde y oculta la acción de recuperación.

### Toast

Use un toast para confirmaciones breves (guardar, crear, desactivar) o para errores de una acción puntual cuando la pantalla sigue siendo utilizable. Para fallos de API use `notifyApiError`, no lea `error.response.data.detail` directamente:

```jsx
import { notifyApiError, notifySuccess } from '@shared/ui/notifications';

try {
  await service.save(payload);
  notifySuccess('Cambios guardados.');
} catch (error) {
  notifyApiError(error, 'No se pudieron guardar los cambios.', { scope: 'machine-save' });
}
```

`scope` evita que el mismo fallo repetido llene la esquina de la pantalla. Los estilos globales de `_app.js` y `pages/globals.css` mantienen una jerarquía visual consistente para éxito, advertencia, información y error.

### Validación local

Antes de enviar un formulario, indique el campo y la corrección concreta: por ejemplo, “Seleccione una empresa” o “El nombre es obligatorio”. No use mensajes genéricos como “Error” para datos que el usuario puede corregir.

## Reglas de implementación

1. Todas las llamadas HTTP deben pasar por `src/infrastructure/api/apiClient.js`.
2. Nunca presentar `error.message`, trazas, una URL del backend o un texto técnico al usuario.
3. No distinguir visualmente entre “no existe” y “no tiene acceso” para recursos con control de acceso.
4. No mostrar un toast y una pantalla de error por la misma carga fallida.
5. Mantener el detalle técnico en consola/observabilidad, no en la interfaz.
6. Una ruta que identifica un objeto debe ser segura también en el backend; la interfaz solo mejora la experiencia, no autoriza nada.

## Componentes compartidos

- `getErrorPresentation(error, fallback)`: clasifica el error y produce título, texto y si puede reintentarse.
- `getApiErrorMessage(error, fallback)`: compatibilidad para vistas existentes que necesitan solo el texto.
- `notifyApiError(error, fallback, options)`: toast seguro, consistente y deduplicado.
- `AppErrorState`: pantalla de error con volver/reintentar.
- `AppErrorBoundary`: última barrera para errores de renderizado inesperados; no muestra la traza al usuario.

## Verificación manual

1. Desconecte temporalmente el backend: debe aparecer “Sin conexión con el servicio” y **Reintentar**.
2. Abra una URL de objeto de otra empresa: debe aparecer “Recurso no disponible”, sin nombre del objeto ni explicación de permisos.
3. Envíe un formulario vacío: debe indicar qué dato falta.
4. Fuerce varios clics sobre una acción: el mismo error no debe apilar toasts idénticos.
5. Provoque una respuesta 500: no deben aparecer detalles del servidor ni instrucciones para revisar consola.
