export const makeTempId = (prefix = "tmp") =>
  `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const emptyDivision = (name = "Principal") => {
  const compId = makeTempId("cmp");
  return {
    localId: makeTempId("div"),
    temp_id: makeTempId("divtmp"),
    nombre: name,
    es_principal: name === "Principal",
    orden: 1,
    activo: true,
    componentes: [
      {
        localId: compId,
        temp_id: compId,
        nombre: "Resultado",
        acronimo: "",
        tipo_dato: "numerico",
        opciones_resultado: null,
        etiqueta_verdadero: "Sí",
        etiqueta_falso: "No",
        orden: 1,
        activo: true,
      },
    ],
    separadores: [],
    disposiciones: [
      {
        localId: makeTempId("disp"),
        temp_id: makeTempId("disptmp"),
        nombre: "Disposición principal",
        orden: 1,
        activo: true,
        items: [{ tipo: "componente", componente: compId, orden: 1 }],
      },
    ],
  };
};

export const emptyResultado = (index = 1) => ({
  localId: makeTempId("res"),
  temp_id: makeTempId("restmp"),
  nombre: index === 1 ? "Resultado principal" : `Resultado ${index}`,
  acronimo: "",
  descripcion: "",
  unidad_medida: "",
  unidad_catalogo: "",
  orden: index,
  activo: true,
  divisiones: [emptyDivision("Principal")],
});

const activeByOrder = (items = []) => (items || [])
  .filter((item) => item?.activo !== false)
  .sort((a, b) => (a.orden || 0) - (b.orden || 0));

const normalizeDivision = (division, divIndex) => {
  const componentes = activeByOrder(division.componentes).map((comp, compIndex) => ({
    localId: `cmp_db_${comp.id || divIndex}_${compIndex}`,
    temp_id: `cmp_db_${comp.id || divIndex}_${compIndex}`,
    nombre: comp.nombre || "",
    acronimo: comp.acronimo || "",
    tipo_dato: ({ texto: "comentario", opcion: "escala", escala_ordinal: "escala" }[comp.tipo_dato] || comp.tipo_dato || "numerico"),
    escala_comparacion: comp.escala_comparacion || "",
    opciones_resultado: comp.opciones_resultado ?? null,
    etiqueta_verdadero: comp.etiqueta_verdadero || "Sí",
    etiqueta_falso: comp.etiqueta_falso || "No",
    requiere_valor: comp.tipo_dato === "comentario" ? false : comp.requiere_valor !== false,
    permite_observacion: comp.permite_observacion !== false,
    orden: comp.orden || compIndex + 1,
    activo: comp.activo !== false,
    originalId: comp.id,
  }));

  const separadores = activeByOrder(division.separadores).map((sep, sepIndex) => ({
    localId: `sep_db_${sep.id || divIndex}_${sepIndex}`,
    temp_id: `sep_db_${sep.id || divIndex}_${sepIndex}`,
    simbolo: sep.simbolo || "",
    orden: sep.orden || sepIndex + 1,
    activo: sep.activo !== false,
    originalId: sep.id,
  }));

  const componentByOriginalId = new Map(componentes.map((item) => [String(item.originalId), item.temp_id]));
  const separatorByOriginalId = new Map(separadores.map((item) => [String(item.originalId), item.temp_id]));

  const disposiciones = activeByOrder(division.disposiciones).map((disp, dispIndex) => ({
    localId: `disp_db_${disp.id || divIndex}_${dispIndex}`,
    temp_id: `disp_db_${disp.id || divIndex}_${dispIndex}`,
    nombre: disp.nombre || "Disposición principal",
    orden: disp.orden || dispIndex + 1,
    activo: disp.activo !== false,
    items: activeByOrder(disp.items).map((item, itemIndex) => ({
      tipo: item.tipo,
      componente: item.tipo === "componente" ? componentByOriginalId.get(String(item.componente)) : null,
      separador: item.tipo === "separador" ? separatorByOriginalId.get(String(item.separador)) : null,
      orden: item.orden || itemIndex + 1,
    })).filter((item) => (item.tipo === "componente" ? item.componente : item.separador)),
  }));

  return {
    localId: `div_db_${division.id || divIndex}`,
    temp_id: `div_db_${division.id || divIndex}`,
    nombre: division.nombre || (division.es_principal ? "Principal" : `Sección ${divIndex + 1}`),
    es_principal: Boolean(division.es_principal),
    orden: division.orden || divIndex + 1,
    activo: division.activo !== false,
    componentes,
    separadores,
    disposiciones: disposiciones.length ? disposiciones : [{
      localId: makeTempId("disp"),
      temp_id: makeTempId("disptmp"),
      nombre: "Disposición principal",
      orden: 1,
      activo: true,
      items: componentes.map((component, index) => ({
        tipo: "componente",
        componente: component.temp_id,
        orden: index + 1,
      })),
    }],
  };
};

export const normalizePruebaForForm = (data) => ({
  nombre_variable: data?.nombre_variable || "",
  condicion: data?.condicion || "",
  condicion_catalogo: data?.condicion_catalogo || data?.condicion_catalogo_info?.id || "",
  acronimo: data?.acronimo || "",
  unidad_medida: data?.unidad_medida || "",
  unidad_catalogo: data?.unidad_catalogo || data?.unidad_catalogo_info?.id || "",
  activo: data?.activo !== false,
  submetodos_tecnicos: (data?.submetodos_tecnicos_configurados || [])
    .filter((item) => item.activo !== false)
    .map((item) => item.submetodo),
  resultados: activeByOrder(data?.resultados).map((resultado, resultIndex) => {
    const divisions = activeByOrder(resultado.divisiones);
    return {
      localId: `res_db_${resultado.id || resultIndex}`,
      temp_id: `res_db_${resultado.id || resultIndex}`,
      nombre: resultado.nombre || "",
      acronimo: resultado.acronimo || "",
      descripcion: resultado.descripcion || "",
      unidad_medida: resultado.unidad_medida || resultado.unidad_catalogo_info?.simbolo || "",
      unidad_catalogo: resultado.unidad_catalogo || resultado.unidad_catalogo_info?.id || "",
      orden: resultado.orden || resultIndex + 1,
      activo: resultado.activo !== false,
      divisiones: (divisions.length ? divisions : [emptyDivision("Principal")])
        .map((division, divIndex) => normalizeDivision(division, divIndex)),
    };
  }),
});

const payloadDivisions = (resultado) => {
  const divisions = activeByOrder(resultado.divisiones);
  const source = divisions.length ? divisions : [emptyDivision("Principal")];
  const hasPrincipal = source.some((division) => division.es_principal);

  return source.map((division, divIndex) => ({
    temp_id: division.temp_id || division.localId,
    nombre: division.nombre?.trim() || null,
    es_principal: hasPrincipal ? Boolean(division.es_principal) : divIndex === 0,
    orden: divIndex + 1,
    activo: division.activo !== false,
    componentes: activeByOrder(division.componentes).map((component, compIndex) => ({
      temp_id: component.temp_id || component.localId,
      nombre: component.nombre.trim(),
      acronimo: component.acronimo?.trim() || null,
      tipo_dato: component.tipo_dato || "numerico",
      escala_comparacion: component.tipo_dato === "escala" ? component.escala_comparacion || null : null,
      opciones_resultado: component.opciones_resultado ?? null,
      etiqueta_verdadero: component.etiqueta_verdadero || "Sí",
      etiqueta_falso: component.etiqueta_falso || "No",
      requiere_valor: component.tipo_dato === "comentario" ? false : component.requiere_valor !== false,
      permite_observacion: component.permite_observacion !== false,
      orden: compIndex + 1,
      activo: component.activo !== false,
    })),
    separadores: activeByOrder(division.separadores).map((separator, sepIndex) => ({
      temp_id: separator.temp_id || separator.localId,
      simbolo: separator.simbolo.trim(),
      orden: sepIndex + 1,
      activo: separator.activo !== false,
    })),
    disposiciones: activeByOrder(division.disposiciones).map((disp, dispIndex) => ({
      temp_id: disp.temp_id || disp.localId,
      nombre: disp.nombre?.trim() || "Disposición principal",
      orden: dispIndex + 1,
      activo: disp.activo !== false,
      items: activeByOrder(disp.items).map((item, itemIndex) => ({
        tipo: item.tipo,
        componente: item.tipo === "componente" ? item.componente : null,
        separador: item.tipo === "separador" ? item.separador : null,
        orden: itemIndex + 1,
      })),
    })),
  }));
};

export const buildPruebaPayload = (form) => ({
  nombre_variable: form.nombre_variable.trim(),
  condicion: form.condicion?.trim() || null,
  condicion_catalogo: form.condicion_catalogo || null,
  acronimo: form.acronimo.trim(),
  unidad_medida: form.unidad_medida?.trim() || null,
  unidad_catalogo: form.unidad_catalogo || null,
  metodo: null,
  activo: form.activo !== false,
  submetodos_tecnicos: form.submetodos_tecnicos || [],
  resultados: activeByOrder(form.resultados).map((resultado, resultIndex) => ({
    temp_id: resultado.temp_id || resultado.localId,
    nombre: resultado.nombre.trim(),
    acronimo: resultado.acronimo?.trim() || null,
    descripcion: resultado.descripcion?.trim() || null,
    unidad_medida: resultado.unidad_medida?.trim() || null,
    unidad_catalogo: resultado.unidad_catalogo || null,
    orden: resultIndex + 1,
    activo: resultado.activo !== false,
    divisiones: payloadDivisions(resultado),
  })),
});

export const getDivisionPreview = (division, dispositionIndex = 0) => {
  const disposition = division.disposiciones?.[dispositionIndex];
  if (!disposition || !disposition.items?.length) return "Sin disposición";

  return disposition.items.map((item) => {
    if (item.tipo === "componente") {
      const component = division.componentes.find((candidate) => candidate.temp_id === item.componente || candidate.localId === item.componente);
      return component?.acronimo || component?.nombre || "?";
    }
    const separator = division.separadores.find((candidate) => candidate.temp_id === item.separador || candidate.localId === item.separador);
    return separator?.simbolo || "?";
  }).join(" ");
};
