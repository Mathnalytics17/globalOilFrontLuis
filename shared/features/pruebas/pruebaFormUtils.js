export const createTempId = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const emptyPruebaForm = {
  nombre_variable: "",
  condicion: "",
  acronimo: "",
  unidad_medida: "",
  activo: true,
};

export const emptyGrupo = (index = 0, submetodo = null) => ({
  temp_id: createTempId("grupo"),
  submetodo: submetodo?.id || null,
  etiqueta: submetodo?.nombre || `Grupo ${index + 1}`,
  descripcion: "",
  orden: index + 1,
  activo: true,
  resultados: [],
  separadores: [],
  disposiciones: [emptyDisposicion(0)],
});

export const emptyResultado = (index = 0, unidad = "") => ({
  temp_id: createTempId("res"),
  nombre: "",
  acronimo: "",
  unidad_medida: unidad || "",
  tipo_dato: "numerico",
  orden: index + 1,
  activo: true,
});

export const emptySeparador = (index = 0) => ({
  temp_id: createTempId("sep"),
  simbolo: "/",
  orden: index + 1,
  activo: true,
});

export const emptyDisposicion = (index = 0) => ({
  temp_id: createTempId("disp"),
  nombre: `Disposición ${index + 1}`,
  orden: index + 1,
  activo: true,
  items: [],
});

export const normalizePruebaForForm = (data) => {
  const grupos = (data.grupos_resultado || []).map((grupo, index) => ({
    temp_id: String(grupo.id || createTempId("grupo")),
    id: grupo.id,
    submetodo: grupo.submetodo || null,
    etiqueta: grupo.etiqueta || `Grupo ${index + 1}`,
    descripcion: grupo.descripcion || "",
    orden: grupo.orden || index + 1,
    activo: grupo.activo !== false,
    resultados: (grupo.resultados || []).map((res, resIndex) => ({
      temp_id: String(res.id || createTempId("res")),
      id: res.id,
      nombre: res.nombre || "",
      acronimo: res.acronimo || "",
      unidad_medida: res.unidad_medida || "",
      tipo_dato: res.tipo_dato || "numerico",
      orden: res.orden || resIndex + 1,
      activo: res.activo !== false,
    })),
    separadores: (grupo.separadores || []).map((sep, sepIndex) => ({
      temp_id: String(sep.id || createTempId("sep")),
      id: sep.id,
      simbolo: sep.simbolo || "/",
      orden: sep.orden || sepIndex + 1,
      activo: sep.activo !== false,
    })),
    disposiciones: (grupo.disposiciones || []).map((disp, dispIndex) => ({
      temp_id: String(disp.id || createTempId("disp")),
      id: disp.id,
      nombre: disp.nombre || `Disposición ${dispIndex + 1}`,
      orden: disp.orden || dispIndex + 1,
      activo: disp.activo !== false,
      items: (disp.items || []).map((item, itemIndex) => ({
        tipo: item.tipo,
        resultado: item.resultado ? String(item.resultado) : null,
        separador: item.separador ? String(item.separador) : null,
        orden: item.orden || itemIndex + 1,
      })),
    })),
  }));

  return {
    form: {
      nombre_variable: data.nombre_variable || "",
      condicion: data.condicion || "",
      acronimo: data.acronimo || "",
      unidad_medida: data.unidad_medida || "",
      activo: data.activo !== false,
    },
    grupos,
  };
};

export const buildPruebaPayload = ({ form, grupos }) => ({
  nombre_variable: form.nombre_variable.trim(),
  condicion: form.condicion.trim() || null,
  acronimo: form.acronimo.trim().toUpperCase(),
  unidad_medida: form.unidad_medida.trim() || null,
  metodo: null,
  activo: form.activo !== false,
  grupos_resultado: grupos.map((grupo, grupoIndex) => ({
    temp_id: grupo.temp_id,
    submetodo: grupo.submetodo || null,
    etiqueta: grupo.etiqueta.trim() || `Grupo ${grupoIndex + 1}`,
    descripcion: grupo.descripcion?.trim() || null,
    orden: grupoIndex + 1,
    activo: grupo.activo !== false,
    resultados: grupo.resultados.map((res, resIndex) => ({
      temp_id: String(res.temp_id || res.id || resIndex + 1),
      nombre: res.nombre.trim(),
      acronimo: res.acronimo.trim() || null,
      unidad_medida: res.unidad_medida?.trim() || null,
      tipo_dato: res.tipo_dato || "numerico",
      orden: resIndex + 1,
      activo: res.activo !== false,
    })),
    separadores: grupo.separadores.map((sep, sepIndex) => ({
      temp_id: String(sep.temp_id || sep.id || sepIndex + 1),
      simbolo: sep.simbolo.trim(),
      orden: sepIndex + 1,
      activo: sep.activo !== false,
    })),
    disposiciones: grupo.disposiciones.map((disp, dispIndex) => ({
      nombre: disp.nombre.trim() || `Disposición ${dispIndex + 1}`,
      orden: dispIndex + 1,
      activo: disp.activo !== false,
      items: disp.items.map((item, itemIndex) => ({
        tipo: item.tipo,
        resultado: item.tipo === "resultado" ? String(item.resultado) : null,
        separador: item.tipo === "separador" ? String(item.separador) : null,
        orden: itemIndex + 1,
      })),
    })),
  })),
});

export const getBackendErrorMessage = (error, fallback = "Ocurrió un error") => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data[0] || fallback;
  const firstKey = Object.keys(data)[0];
  const firstValue = data[firstKey];
  if (Array.isArray(firstValue)) return firstValue[0] || fallback;
  if (typeof firstValue === "string") return firstValue;
  return fallback;
};
