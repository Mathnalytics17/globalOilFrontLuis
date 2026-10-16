# Búsqueda de texto completo en selectores

Todos los controles HTML `select` del frontend comparten el comportamiento
instalado por `src/shared/ui/NativeSelectSearch.jsx` desde `pages/_app.js`.

Con un selector enfocado, el usuario puede escribir una frase completa para
buscar una coincidencia dentro de las opciones, sin distinguir mayúsculas ni
tildes. Por ejemplo, `colombia` encuentra `Colombia` y `petrobras` encuentra
`PETROBRAS HYDRA 68`. La coincidencia actualiza el valor real del selector y
emite sus eventos `input` y `change`, por lo que conserva los formularios y
validaciones existentes.

La búsqueda se reinicia al quitar el foco, presionar Escape o pausar más de
2,2 segundos; Backspace elimina el último carácter de la búsqueda activa.
