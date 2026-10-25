import { appDialog } from '@shared/ui/AppDialogProvider';
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Plus,
  Trash2,
  Copy,
  Save,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";

import { sampleCatalogsService } from "@features/samples/infrastructure/sampleCatalogsService";
import { sampleBatchesService } from "@features/samples/infrastructure/sampleBatchesService";
import { sampleManagementTypesService } from "@features/samples/infrastructure/sampleManagementTypesService";
import { authService } from "@features/auth/infrastructure/authService";
import BulkSamplesExcelTab from "@features/samples/components/BulkSamplesExcelTab";
import PageHeader from '@shared/ui/PageHeader';
import MetricStrip from '@shared/ui/MetricStrip';
import { notifyApiError } from '@shared/ui/notifications';
import { getApiFieldErrors } from '@shared/utils/errors';
import DynamicSampleTechnicalFields, {
  buildDynamicAttributesPayload,
  createDynamicAttributes,
  validateDynamicAttributes,
} from "@features/samples/components/DynamicSampleTechnicalFields";

const EMPTY_LOTE_FORM = {
  tipo_cliente: "registrado",
  cliente_empresa: "",
  cliente_ocasional_nombre: "",
  contacto_nombre: "",
  contacto_telefono: "",
  contacto_email: "",
  fecha_envio: "",
  tipo_gestion: "",
  observaciones: "",
};

const MANUAL_SAMPLE_PAGE_SIZE = 6;

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const isUnknownValue = (value) =>
  ["desconocido", "desconocida", "n/a", "na", "no aplica", "sin dato"].includes(
    normalizeText(value)
  );

const getImportedValue = (source = {}, keys = []) => {
  for (const key of keys) {
    const value = key.split('.').reduce((acc, part) => acc?.[part], source);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
};

const catalogAppliesToSampleType = (catalog, sampleType) => {
  const catalogType = normalizeText(catalog?.tipo_muestra || catalog?.tipoMuestra || "ambos");
  const type = normalizeText(sampleType || "aceite");
  return catalog?.activo !== false && !catalog?.deleted_at && (catalogType === "ambos" || catalogType === type);
};

const findCatalog = (catalogs, sampleType, keys = []) => {
  const normalizedKeys = keys.map(normalizeText);

  return catalogs.find((catalog) => {
    if (!catalogAppliesToSampleType(catalog, sampleType)) return false;

    const candidates = [
      catalog?.codigo,
      catalog?.nombre,
      catalog?.slug,
      catalog?.key,
      catalog?.campo,
    ].map(normalizeText);

    return candidates.some((candidate) =>
      normalizedKeys.some(
        (key) => candidate === key || candidate.includes(key) || key.includes(candidate)
      )
    );
  });
};

const findCatalogItem = (catalog, rawValue) => {
  if (!catalog || rawValue === undefined || rawValue === null || rawValue === "") return null;

  const text = normalizeText(rawValue);
  const items = Array.isArray(catalog.items) ? catalog.items : [];

  return (
    items.find((item) => String(item.id) === String(rawValue)) ||
    items.find((item) =>
      [item?.codigo, item?.nombre, item?.valor, item?.label].some(
        (candidate) => normalizeText(candidate) === text
      )
    ) ||
    items.find((item) =>
      [item?.codigo, item?.nombre, item?.valor, item?.label].some((candidate) => {
        const candidateText = normalizeText(candidate);
        return candidateText && (candidateText.includes(text) || text.includes(candidateText));
      })
    ) ||
    null
  );
};


const getActiveCatalogItems = (catalog) =>
  (catalog?.items || []).filter((item) => item.activo !== false && !item.deleted_at);

const catalogAllowsUnknown = (catalog) => catalog?.permite_desconocido !== false;

const shouldForceUnknownForCatalog = (catalog) =>
  Boolean(catalog?.id) && catalogAllowsUnknown(catalog) && getActiveCatalogItems(catalog).length === 0;

const firstErrorMessage = (errors) => {
  const entries = Object.entries(errors || {});
  if (!entries.length) return "Revise los campos marcados antes de continuar";
  const [key, message] = entries[0];
  if (key.startsWith("muestras.")) return `Muestra ${Number(key.split(".")[1] || 0) + 1}: ${message}`;
  return String(message || "Revise los campos marcados antes de continuar");
};

const findExistingAttributeByField = (existing, field, keys = []) => {
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) return null;
  const candidates = [field, `${field}_id`, `${field}Id`, ...keys].map(normalizeText);

  for (const [rawKey, value] of Object.entries(existing)) {
    const key = normalizeText(rawKey);
    if (candidates.some((candidate) => key === candidate || key.includes(candidate) || candidate.includes(key))) {
      return value;
    }
  }

  return null;
};

const normalizeTechnicalAttributes = (source = {}, sampleType = "aceite", catalogs = []) => {
  const existing = source.atributos_tecnicos || source.atributosTecnicos || {};
  const normalized = {};

  if (Array.isArray(existing)) {
    existing.forEach((attribute) => {
      const fieldId =
        attribute?.campo_tecnico ||
        attribute?.campo_tecnico_id ||
        attribute?.campoTecnico ||
        attribute?.sample_field_id;
      const catalogId = attribute?.catalogo || attribute?.catalogo_id || attribute?.catalog || attribute?.catalog_id;
      const key = fieldId || catalogId;
      if (!key) return;
      normalized[key] = {
        item: attribute?.item || attribute?.item_id || attribute?.catalogo_item || "",
        desconocido: Boolean(attribute?.desconocido),
        observacion: attribute?.observacion || "",
      };
      if (catalogId && String(catalogId) !== String(key)) {
        normalized[catalogId] = normalized[key];
      }
    });
  } else if (existing && typeof existing === "object") {
    Object.entries(existing).forEach(([catalogId, value]) => {
      if (value && typeof value === "object") {
        const attribute = {
          item: value?.item || value?.item_id || value?.catalogo_item || "",
          desconocido: Boolean(value?.desconocido),
          observacion: value?.observacion || "",
        };
        const fieldId = value?.campo_tecnico_muestra || value?.campo_tecnico || value?.campo_tecnico_id;
        normalized[fieldId || catalogId] = attribute;
        if (fieldId && String(fieldId) !== String(catalogId)) {
          normalized[catalogId] = attribute;
        }
      } else if (value !== undefined && value !== null && value !== "") {
        normalized[catalogId] = {
          item: value,
          desconocido: false,
          observacion: "",
        };
      }
    });
  }

  // Excel also returns generic flags such as `campo_grasa_desconocido`.
  // Resolve them using the configured field ID, not a hard-coded list of
  // legacy aliases. This is what makes newly created technical fields behave
  // exactly like the built-in ones after importing a spreadsheet.
  catalogs
    .filter((catalog) => catalog?.sample_field_id && catalogAppliesToSampleType(catalog, sampleType))
    .forEach((catalog) => {
      const key = catalog.sample_field_id || catalog.id;
      if (normalized[key] || normalized[catalog.id]) return;

      const code = catalog?.sample_field?.codigo || catalog?.codigo;
      if (!code) return;
      const rawValue = source[code] ?? source[`${code}_id`];
      const markedUnknown = Boolean(source[`${code}_desconocido`]) || isUnknownValue(rawValue);
      const forceUnknown = shouldForceUnknownForCatalog(catalog);
      if (!markedUnknown && !forceUnknown) return;

      const attribute = {
        item: "",
        desconocido: true,
        observacion: "",
      };
      normalized[key] = attribute;
      if (String(catalog.id) !== String(key)) {
        normalized[catalog.id] = attribute;
      }
    });

  const technicalFieldAliases = {
    aceite: [
      {
        field: "grado_viscosidad",
        unknownField: "grado_viscosidad_desconocido",
        keys: ["grado_viscosidad", "grado de viscosidad", "viscosidad"],
      },
      {
        field: "nivel_desempeno",
        unknownField: "nivel_desempeno_desconocido",
        keys: ["nivel_desempeno", "nivel de desempeno", "nivel de desempeño", "desempeno", "desempeño"],
      },
      {
        field: "uso",
        unknownField: "uso_desconocido",
        keys: ["uso", "aplicacion", "aplicación"],
      },
    ],
    grasa: [
      {
        field: "nlgi",
        unknownField: "nlgi_desconocido",
        keys: ["nlgi"],
      },
      {
        field: "espesante",
        unknownField: "espesante_desconocido",
        keys: ["espesante", "tipo de espesante"],
      },
      {
        field: "aditivo",
        unknownField: "aditivo_desconocido",
        keys: ["aditivo", "aditivos"],
      },
    ],
  };

  (technicalFieldAliases[sampleType] || []).forEach(({ field, unknownField, keys }) => {
    const existingValue = findExistingAttributeByField(existing, field, keys);
    const rawFromExisting =
      existingValue && typeof existingValue === "object"
        ? existingValue.item_nombre || existingValue.item_name || existingValue.nombre || existingValue.valor || existingValue.item || existingValue.item_id
        : existingValue;
    const rawValue = source[field] ?? source[`${field}_id`] ?? source[`${field}Id`] ?? rawFromExisting;
    const markedUnknown =
      Boolean(source[unknownField]) ||
      isUnknownValue(rawValue) ||
      Boolean(existingValue?.desconocido);
    const catalog = findCatalog(catalogs, sampleType, keys);

    if (!catalog?.id) return;
    const key = catalog.sample_field_id || catalog.id;
    if (normalized[key] || normalized[catalog.id]) {
      const current = normalized[key] || normalized[catalog.id];
      if (shouldForceUnknownForCatalog(catalog) && !current.item) {
        normalized[key] = {
          ...current,
          desconocido: true,
          item: "",
        };
        normalized[catalog.id] = normalized[key];
      }
      return;
    }

    const forceUnknown = shouldForceUnknownForCatalog(catalog);
    const item = findCatalogItem(catalog, rawValue);
    normalized[key] = {
      item: markedUnknown || forceUnknown ? "" : item?.id || (/^\d+$/.test(String(rawValue || "")) ? rawValue : ""),
      desconocido: markedUnknown || forceUnknown,
      observacion:
        markedUnknown && rawValue && !isUnknownValue(rawValue)
          ? String(rawValue)
          : !forceUnknown && !item && rawValue && !/^\d+$/.test(String(rawValue || ""))
          ? `No se encontró coincidencia para: ${rawValue}`
          : "",
    };
    if (String(catalog.id) !== String(key)) {
      normalized[catalog.id] = normalized[key];
    }
  });

  (technicalFieldAliases[sampleType] || []).forEach(({ field, keys }) => {
    const catalog = findCatalog(catalogs, sampleType, keys);
    const key = catalog?.sample_field_id || catalog?.id;
    if (!catalog?.id || normalized[key] || normalized[catalog.id]) return;
    if (shouldForceUnknownForCatalog(catalog)) {
      normalized[key] = {
        item: "",
        desconocido: true,
        observacion: "",
      };
      if (String(catalog.id) !== String(key)) {
        normalized[catalog.id] = normalized[key];
      }
    }
  });

  return normalized;
};

const createEmptyMuestra = () => ({
  tempId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,

  fecha_toma: "",
  tipo_muestra: "aceite",
  condicion: "usada",

  equipo_modo: "catalogo",
  punto_muestreo: "",
  referencia_equipo: "",
  equipo_placa: "",
  punto_manual: "",
  lubricante_catalogo: "",
  lubricante_nuevo: "",
  frecuencia_cambio_muestra: "",
  unidad_frecuencia_cambio_muestra: "horas",
  frecuencia_analisis_muestra: "",
  unidad_frecuencia_analisis_muestra: "horas",

  periodo_servicio_aceite: "",
  unidad_periodo_aceite: "horas",

  periodo_servicio_equipo: "",
  unidad_periodo_equipo: "horas",

  fabricante: "",
  referencia_marca: "",

  grado_viscosidad: "",
  grado_viscosidad_desconocido: false,

  nivel_desempeno: "",
  nivel_desempeno_desconocido: false,

  uso: "",
  uso_desconocido: false,

  nlgi: "",
  nlgi_desconocido: false,

  aditivo: "",
  aditivo_desconocido: false,

  espesante: "",
  espesante_desconocido: false,

  observaciones: "",
  atributos_tecnicos: createDynamicAttributes(),
});

const NuevoLoteMuestrasPage = () => {
  const router = useRouter();
  const [selectedMuestras, setSelectedMuestras] = useState([]);
  const [form, setForm] = useState(EMPTY_LOTE_FORM);
  const [muestras, setMuestras] = useState([createEmptyMuestra()]);
  const [saving, setSaving] = useState(false);
  const [samplesInputMode, setSamplesInputMode] = useState("manual");
  const [manualSamplePage, setManualSamplePage] = useState(1);
  // Estado persistente del Excel: queda en la página padre para que no se pierda al cambiar de tab.
  const [excelImportState, setExcelImportState] = useState({
    selectedFile: null,
    preview: null,
    appliedRowsCount: 0,
  });

  const [clientes, setClientes] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [puntosMuestreo, setPuntosMuestreo] = useState([]);
  const [lubricantes, setLubricantes] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [tiposGestion, setTiposGestion] = useState([]);
  const [loadingTiposGestion, setLoadingTiposGestion] = useState(false);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingTechnicalCatalogs, setLoadingTechnicalCatalogs] = useState(true);
  const [dynamicTechnicalCatalogs, setDynamicTechnicalCatalogs] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadInitialOptions();
    loadTechnicalCatalogs();
    loadTiposGestion(null);
  }, []);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(muestras.length / MANUAL_SAMPLE_PAGE_SIZE));
    if (manualSamplePage > totalPages) setManualSamplePage(totalPages);
  }, [manualSamplePage, muestras.length]);

  const isGlobalUser = (user = currentUser) => (
    user?.role === "GLOBAL" || user?.is_superuser || user?.is_staff
  );

  const selectedCompanyId = form.tipo_cliente === "registrado"
    ? form.cliente_empresa
    : "";

  const maquinasFiltradas = useMemo(() => {
    if (!selectedCompanyId) return isGlobalUser() ? maquinas : maquinas.filter((machine) => String(machine.empresa || machine.empresa_id || machine.empresa_info?.id || "") === String(currentUser?.empresa_id || ""));
    return maquinas.filter((machine) => String(machine.empresa || machine.empresa_id || machine.empresa_info?.id || "") === String(selectedCompanyId));
  }, [maquinas, selectedCompanyId, currentUser]);

  const puntosFiltrados = useMemo(() => {
    const companyId = selectedCompanyId || currentUser?.empresa_id;
    return puntosMuestreo.filter((point) => !companyId || String(point.empresa_id) === String(companyId));
  }, [puntosMuestreo, selectedCompanyId, currentUser]);

  const getCompanyName = (cliente) => {
    return (
      cliente?.nombre ||
      cliente?.name ||
      cliente?.razon_social ||
      cliente?.razonSocial ||
      cliente?.empresa ||
      cliente?.id
    );
  };

  const getCompanyContactData = (cliente) => {
    const contactoPrincipal = Array.isArray(cliente?.contactos)
      ? cliente.contactos.find((contacto) => contacto?.principal) || cliente.contactos[0]
      : null;

    return {
      contacto_nombre:
        cliente?.contacto_nombre ||
        cliente?.nombre_contacto ||
        cliente?.contact_name ||
        cliente?.representante ||
        cliente?.representante_legal ||
        contactoPrincipal?.nombre ||
        contactoPrincipal?.name ||
        "",

      contacto_telefono:
        cliente?.contacto_telefono ||
        cliente?.telefono_contacto ||
        cliente?.telefono ||
        cliente?.phone ||
        cliente?.celular ||
        cliente?.mobile ||
        contactoPrincipal?.telefono ||
        contactoPrincipal?.phone ||
        "",

      contacto_email:
        cliente?.contacto_email ||
        cliente?.email_contacto ||
        cliente?.correo_contacto ||
        cliente?.correo ||
        cliente?.email ||
        contactoPrincipal?.correo ||
        contactoPrincipal?.email ||
        "",
    };
  };

  const loadTiposGestion = async (empresaId = null) => {
    setLoadingTiposGestion(true);

    try {
      const data = await sampleManagementTypesService.getAvailableForCompany(empresaId);
      setTiposGestion(Array.isArray(data) ? data : []);
    } catch (error) {
      setTiposGestion([]);
      notifyApiError(error, "No se pudieron cargar los tipos de gestión.", { scope: "sample-management-types" });
    } finally {
      setLoadingTiposGestion(false);
    }
  };

  const loadTechnicalCatalogs = async () => {
    setLoadingTechnicalCatalogs(true);

    try {
      const dynamicData = await sampleCatalogsService.getAllSampleFormCatalogs();
      setDynamicTechnicalCatalogs(Array.isArray(dynamicData) ? dynamicData : []);
    } catch (error) {
      setDynamicTechnicalCatalogs([]);
      notifyApiError(error, "No se pudieron cargar los catálogos técnicos de aceites/grasas.", { scope: "sample-technical-catalogs" });
    } finally {
      setLoadingTechnicalCatalogs(false);
    }
  };

  const handleTipoClienteChange = (tipoCliente) => {
    if (tipoCliente === "ocasional" && !isGlobalUser()) return;
    setForm((prev) => ({
      ...prev,
      tipo_cliente: tipoCliente,
      cliente_empresa: "",
      cliente_ocasional_nombre: tipoCliente === "registrado" ? "" : prev.cliente_ocasional_nombre,
      tipo_gestion: "",
    }));

    setErrors((prev) => ({
      ...prev,
      tipo_cliente: undefined,
      cliente_empresa: undefined,
      cliente_ocasional_nombre: undefined,
      tipo_gestion: undefined,
    }));

    if (tipoCliente === "ocasional") {
      loadTiposGestion(null);
    } else {
      setTiposGestion([]);
    }
  };

  const handleClienteEmpresaChange = (empresaId) => {
    const cliente = clientes.find((item) => String(item.id) === String(empresaId));
    const contactData = getCompanyContactData(cliente);

    setForm((prev) => ({
      ...prev,
      cliente_empresa: empresaId,
      contacto_nombre: contactData.contacto_nombre,
      contacto_telefono: contactData.contacto_telefono,
      contacto_email: contactData.contacto_email,
      tipo_gestion: "",
    }));

    setErrors((prev) => ({
      ...prev,
      cliente_empresa: undefined,
      contacto_nombre: undefined,
      contacto_telefono: undefined,
      contacto_email: undefined,
      tipo_gestion: undefined,
    }));

    if (empresaId) {
      loadTiposGestion(empresaId);
    } else {
      setTiposGestion([]);
    }
  };

  const getTipoGestionLabel = (tipo) => {
    return tipo?.nombre || "Sin nombre";
  };

  const loadInitialOptions = async () => {
    setLoadingOptions(true);

    try {
      const [options, user] = await Promise.all([
        sampleCatalogsService.getBatchCreationOptions(),
        authService.getCurrentUser().catch(() => null),
      ]);

      setCurrentUser(user);
      const externalCompany = user?.empresa_id
        ? {
            id: user.empresa_id,
            nombre: user.empresa,
          }
        : null;
      const companies = options.companies || [];
      setClientes(companies.length ? companies : (externalCompany ? [externalCompany] : []));
      setMaquinas(options.machines || []);
      setPuntosMuestreo(options.samplingPoints || []);
      setLubricantes(options.lubricants || []);
      if (user && !isGlobalUser(user) && user.empresa_id) {
        setForm((prev) => ({
          ...prev,
          tipo_cliente: "registrado",
          cliente_empresa: String(user.empresa_id),
          cliente_ocasional_nombre: "",
        }));
        loadTiposGestion(user.empresa_id);
      }

      if (options.hasPartialFailure && isGlobalUser(user)) {
        toast.warning("Algunos catálogos no pudieron cargarse");
      }
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron cargar algunos catálogos");
    } finally {
      setLoadingOptions(false);
    }
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const updateMuestra = (index, field, value) => {
    setMuestras((prev) =>
      prev.map((muestra, i) => {
        if (i !== index) return muestra;

        const updated = { ...muestra, [field]: value };

        if (field === "condicion" && value === "nueva") {
          updated.equipo_modo = "catalogo";
          updated.referencia_equipo = "";
          updated.punto_muestreo = "";
          updated.equipo_placa = "";
          updated.punto_manual = "";
          updated.periodo_servicio_aceite = "";
          updated.periodo_servicio_equipo = "";
        }

        if (field === "punto_muestreo" && value) {
          const point = puntosMuestreo.find((item) => String(item.id) === String(value));
          updated.equipo_modo = "catalogo";
          updated.referencia_equipo = point ? String(point.maquina) : "";
          updated.equipo_placa = "";
          updated.punto_manual = "";
          if (point?.lubricante_catalogo) updated.lubricante_catalogo = String(point.lubricante_catalogo);
          if (point?.lubricante_catalogo_info) {
            updated.fabricante = point.lubricante_catalogo_info.fabricante || '';
            updated.referencia_marca = point.lubricante_catalogo_info.referencia || '';
          }
          updated.frecuencia_cambio_muestra = point?.frecuencia_cambio ?? "";
          updated.unidad_frecuencia_cambio_muestra = point?.unidad_frecuencia_cambio || "horas";
          updated.frecuencia_analisis_muestra = point?.frecuencia_analisis ?? "";
          updated.unidad_frecuencia_analisis_muestra = point?.unidad_frecuencia_analisis || "horas";
        }

        if (field === "referencia_equipo" && value) {
          updated.equipo_modo = "catalogo";
          updated.equipo_placa = "";
        }

        if (field === "equipo_placa" && value) {
          updated.equipo_modo = "manual";
          updated.referencia_equipo = "";
          updated.punto_muestreo = "";
        }

        if (field === "tipo_muestra") {
          updated.atributos_tecnicos = createDynamicAttributes();
        }

        if (field === "tipo_muestra" && value === "aceite") {
          updated.nlgi = "";
          updated.nlgi_desconocido = false;
          updated.aditivo = "";
          updated.aditivo_desconocido = false;
          updated.espesante = "";
          updated.espesante_desconocido = false;
        }

        if (field === "tipo_muestra" && value === "grasa") {
          updated.grado_viscosidad = "";
          updated.grado_viscosidad_desconocido = false;
          updated.nivel_desempeno = "";
          updated.nivel_desempeno_desconocido = false;
          updated.uso = "";
          updated.uso_desconocido = false;
        }

        if (field.endsWith("_desconocido") && value === true) {
          const originalField = field.replace("_desconocido", "");
          updated[originalField] = "";
        }

        return updated;
      })
    );

    setErrors((prev) => ({ ...prev, [`muestras.${index}.${field}`]: undefined }));
  };

  const addMuestra = () => setMuestras((prev) => [...prev, createEmptyMuestra()]);

  const duplicateMuestra = (index) => {
    setMuestras((prev) => {
      const selected = prev[index];
      const copy = {
        ...selected,
        tempId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      };
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });
  };

  const removeMuestra = (index) => {
    if (muestras.length === 1) {
      toast.warning("El lote debe tener al menos una muestra");
      return;
    }

    const muestraToRemove = muestras[index];
    setMuestras((prev) => prev.filter((_, i) => i !== index));
    setSelectedMuestras((prev) => prev.filter((id) => id !== muestraToRemove.tempId));
  };

  const isEmptyMuestra = (muestra) => {
    if (!muestra) return true;

    const hasDynamicAttributes = Object.values(muestra.atributos_tecnicos || {}).some((value) => {
      if (!value) return false;
      if (typeof value !== "object") return Boolean(value);
      return Boolean(value.item || value.desconocido || value.observacion);
    });

    return (
      !hasDynamicAttributes &&
      !muestra.fecha_toma &&
      (!muestra.tipo_muestra || muestra.tipo_muestra === "aceite") &&
      (!muestra.condicion || muestra.condicion === "usada") &&
      !muestra.referencia_equipo &&
      !muestra.equipo_placa?.trim?.() &&
      !muestra.periodo_servicio_aceite &&
      !muestra.periodo_servicio_equipo &&
      !muestra.fabricante &&
      !muestra.referencia_marca?.trim?.() &&
      !muestra.grado_viscosidad &&
      !muestra.nivel_desempeno &&
      !muestra.uso &&
      !muestra.nlgi &&
      !muestra.aditivo &&
      !muestra.espesante &&
      !muestra.observaciones?.trim?.()
    );
  };

  const getMuestrasToSubmit = () => {
    const cleaned = muestras.filter((muestra) => !isEmptyMuestra(muestra));
    return cleaned.length > 0 ? cleaned : muestras;
  };

  const validateTechnicalFields = (muestra, index, nextErrors) => {
    if (dynamicTechnicalCatalogs.length > 0) {
      const dynamicErrors = validateDynamicAttributes(muestra, dynamicTechnicalCatalogs);
      Object.entries(dynamicErrors).forEach(([catalogId, message]) => {
        nextErrors[`muestras.${index}.atributos_tecnicos.${catalogId}`] = message;
      });
      return;
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.tipo_cliente) nextErrors.tipo_cliente = "Seleccione el tipo de cliente";

    if (form.tipo_cliente === "registrado" && !form.cliente_empresa) {
      nextErrors.cliente_empresa = "Seleccione una empresa registrada";
    }

    if (form.tipo_cliente === "ocasional" && !form.cliente_ocasional_nombre.trim()) {
      nextErrors.cliente_ocasional_nombre = "Ingrese el nombre del cliente ocasional";
    }

    if (!form.contacto_nombre.trim()) nextErrors.contacto_nombre = "Ingrese el contacto";
    if (!form.fecha_envio) nextErrors.fecha_envio = "Seleccione la fecha de envío";
    if (!form.tipo_gestion) nextErrors.tipo_gestion = "Seleccione el tipo de gestión";

    const muestrasToValidate = getMuestrasToSubmit();

    if (!muestrasToValidate.length) {
      nextErrors.muestras = "Debe agregar al menos una muestra";
    }

    muestrasToValidate.forEach((muestra, index) => {
      if (!muestra.fecha_toma) nextErrors[`muestras.${index}.fecha_toma`] = "Fecha requerida";
      if (!muestra.tipo_muestra) nextErrors[`muestras.${index}.tipo_muestra`] = "Tipo requerido";
      if (!muestra.condicion) nextErrors[`muestras.${index}.condicion`] = "Condición requerida";

      if (!muestra.referencia_marca.trim()) {
        nextErrors[`muestras.${index}.referencia_marca`] = "Ingrese la referencia/marca";
      }

      validateTechnicalFields(muestra, index, nextErrors);

      if (
        muestra.condicion === "usada" &&
        ((muestra.equipo_modo === "catalogo" && !muestra.punto_muestreo) ||
          (muestra.equipo_modo === "manual" && !muestra.equipo_placa.trim()))
      ) {
        nextErrors[`muestras.${index}.punto_muestreo`] = "Una muestra usada debe seleccionar un punto de medida o usar identificación manual";
      }

      if (muestra.periodo_servicio_aceite && Number(muestra.periodo_servicio_aceite) < 0) {
        nextErrors[`muestras.${index}.periodo_servicio_aceite`] = "No puede ser negativo";
      }

      if (muestra.periodo_servicio_equipo && Number(muestra.periodo_servicio_equipo) < 0) {
        nextErrors[`muestras.${index}.periodo_servicio_equipo`] = "No puede ser negativo";
      }
    });

    setErrors(nextErrors);
    return {
      isValid: Object.keys(nextErrors).length === 0,
      nextErrors,
    };
  };

  const buildTechnicalPayload = (muestra) => {
    return {
      tipo_muestra: muestra.tipo_muestra,
      referencia_marca: muestra.referencia_marca.trim() || null,
      fabricante: muestra.fabricante?.trim?.() || null,
    };
  };

  const buildPayload = (estado = "registrado") => ({
    tipo_cliente: form.tipo_cliente,
    cliente_empresa: form.tipo_cliente === "registrado" && form.cliente_empresa ? form.cliente_empresa : null,
    cliente_ocasional_nombre: form.tipo_cliente === "ocasional" ? form.cliente_ocasional_nombre.trim() : null,
    contacto_nombre: form.contacto_nombre.trim(),
    contacto_telefono: form.contacto_telefono.trim() || null,
    contacto_email: form.contacto_email.trim() || null,
    fecha_envio: form.fecha_envio,
    tipo_gestion: form.tipo_gestion,
    estado,
    observaciones: form.observaciones.trim() || null,

    muestras: getMuestrasToSubmit().map((muestra) => {
      const tech = buildTechnicalPayload(muestra);

      return {
        fecha_toma: muestra.fecha_toma,
        fecha_envio: form.fecha_envio,
        tipo_muestra: muestra.tipo_muestra,
        condicion: muestra.condicion,

        referencia_equipo:
          muestra.condicion === "usada" &&
          muestra.equipo_modo === "catalogo" &&
          muestra.referencia_equipo
            ? muestra.referencia_equipo
            : null,
        punto_muestreo:
          muestra.condicion === "usada" && muestra.equipo_modo === "catalogo" && muestra.punto_muestreo
            ? muestra.punto_muestreo : null,
        punto_muestreo_manual:
          muestra.condicion === "usada" && muestra.equipo_modo === "manual" && muestra.punto_manual.trim()
            ? muestra.punto_manual.trim()
            : null,
        equipo_placa:
          muestra.condicion === "usada" &&
          muestra.equipo_modo === "manual" &&
          muestra.equipo_placa.trim()
            ? muestra.equipo_placa.trim()
            : null,

        periodo_servicio_aceite:
          muestra.condicion === "usada" && muestra.periodo_servicio_aceite
            ? Number(muestra.periodo_servicio_aceite)
            : null,
        unidad_periodo_aceite:
          muestra.condicion === "usada" && muestra.periodo_servicio_aceite
            ? muestra.unidad_periodo_aceite
            : null,

        periodo_servicio_equipo:
          muestra.condicion === "usada" && muestra.periodo_servicio_equipo
            ? Number(muestra.periodo_servicio_equipo)
            : null,
        unidad_periodo_equipo:
          muestra.condicion === "usada" && muestra.periodo_servicio_equipo
            ? muestra.unidad_periodo_equipo
            : null,

        // Campos planos para backend nuevo.
        referencia_marca: tech.referencia_marca,
        campos_adicionales: {
          fabricante: tech.fabricante,
          frecuencia_cambio_muestra: muestra.frecuencia_cambio_muestra === "" ? null : Number(muestra.frecuencia_cambio_muestra),
          unidad_frecuencia_cambio_muestra: muestra.unidad_frecuencia_cambio_muestra,
          frecuencia_analisis_muestra: muestra.frecuencia_analisis_muestra === "" ? null : Number(muestra.frecuencia_analisis_muestra),
          unidad_frecuencia_analisis_muestra: muestra.unidad_frecuencia_analisis_muestra,
        },
        lubricante_catalogo: muestra.lubricante_catalogo || null,
        lubricante_nuevo: muestra.lubricante_nuevo?.trim() || null,

        // Configuracion tecnica de aceites/grasas basada en Campos tecnicos de muestra.
        atributos_tecnicos: buildDynamicAttributesPayload(
          muestra,
          dynamicTechnicalCatalogs
        ),

        contacto_cliente: form.contacto_nombre.trim(),
        observaciones: muestra.observaciones.trim() || null,
      };
    }),
  });
  const normalizeExcelRowToMuestra = (row, index) => {
    const source =
      row?.muestra ||
      row?.sample ||
      row?.data ||
      row?.payload ||
      row;

    const tipoMuestra = String(
      source.tipo_muestra ||
      source.tipo ||
      source.tipoMuestra ||
      "aceite"
    ).toLowerCase();

    const finalTipoMuestra = tipoMuestra === "grasa" ? "grasa" : "aceite";

    const condicion = String(
      source.condicion ||
      source.estado_muestra ||
      "usada"
    ).toLowerCase();
    const importedUnknownFlags = Object.fromEntries(
      Object.entries(source).filter(([key, value]) =>
        key.endsWith("_desconocido") && Boolean(value)
      )
    );

    return {
      ...createEmptyMuestra(),
      // Keep every dynamic unknown flag from Excel. DynamicSampleTechnicalFields
      // resolves it using the field's code, so this works for fields created
      // later as well as the original technical fields.
      ...importedUnknownFlags,

      tempId: source.tempId || row.tempId || `excel_${Date.now()}_${index}`,

      fecha_toma:
        source.fecha_toma ||
        source.fechaToma ||
        source.fecha_toma_muestra ||
        "",

      tipo_muestra: finalTipoMuestra,
      condicion: condicion === "nueva" ? "nueva" : "usada",
      equipo_modo:
        source.equipo_placa || source.placa || source.placa_manual
          ? "manual"
          : "catalogo",

      referencia_equipo: source.referencia_equipo
        ? String(source.referencia_equipo)
        : source.maquina
        ? String(source.maquina)
        : "",

      punto_muestreo: source.punto_muestreo
        ? String(source.punto_muestreo)
        : "",

      equipo_placa:
        source.equipo_placa ||
        source.placa ||
        source.placa_manual ||
        "",

      punto_manual:
        source.punto_muestreo_manual ||
        source.punto_manual ||
        "",

      lubricante_catalogo: source.lubricante_catalogo
        ? String(source.lubricante_catalogo)
        : "",

      periodo_servicio_aceite:
        source.periodo_servicio_aceite ??
        source.periodo_aceite ??
        "",

      unidad_periodo_aceite:
        source.unidad_periodo_aceite ||
        source.unidad_aceite ||
        "horas",

      periodo_servicio_equipo:
        source.periodo_servicio_equipo ??
        source.periodo_equipo ??
        "",

      unidad_periodo_equipo:
        source.unidad_periodo_equipo ||
        source.unidad_equipo ||
        "horas",

      fabricante: source.fabricante
        ? String(source.fabricante)
        : source.fabricante_id
        ? String(source.fabricante_id)
        : "",

      referencia_marca:
        source.referencia_marca ||
        source.referencia ||
        source.marca ||
        "",

      grado_viscosidad: source.grado_viscosidad
        ? String(source.grado_viscosidad)
        : source.grado_viscosidad_id
        ? String(source.grado_viscosidad_id)
        : "",

      grado_viscosidad_desconocido:
        Boolean(source.grado_viscosidad_desconocido) ||
        isUnknownValue(source.grado_viscosidad),

      nivel_desempeno: source.nivel_desempeno
        ? String(source.nivel_desempeno)
        : source.nivel_desempeno_id
        ? String(source.nivel_desempeno_id)
        : "",

      nivel_desempeno_desconocido:
        Boolean(source.nivel_desempeno_desconocido) ||
        isUnknownValue(source.nivel_desempeno),

      uso: source.uso
        ? String(source.uso)
        : source.uso_id
        ? String(source.uso_id)
        : "",

      uso_desconocido:
        Boolean(source.uso_desconocido) ||
        isUnknownValue(source.uso),

      nlgi: source.nlgi
        ? String(source.nlgi)
        : source.nlgi_id
        ? String(source.nlgi_id)
        : "",

      nlgi_desconocido:
        Boolean(source.nlgi_desconocido) ||
        isUnknownValue(source.nlgi),

      aditivo: (() => {
        const raw = getImportedValue(source, ["aditivo", "aditivo_id", "grasa_aditivo", "grasa_aditivo_id", "campos_adicionales.aditivo"]);
        return isUnknownValue(raw) ? "" : raw ? String(raw) : "";
      })(),

      aditivo_desconocido: (() => {
        const raw = getImportedValue(source, ["aditivo", "aditivo_id", "grasa_aditivo", "grasa_aditivo_id", "campos_adicionales.aditivo"]);
        return finalTipoMuestra === "grasa" && (!raw || Boolean(source.aditivo_desconocido) || isUnknownValue(raw));
      })(),

      espesante: (() => {
        const raw = getImportedValue(source, ["espesante", "espesante_id", "grasa_espesante", "grasa_espesante_id", "campos_adicionales.espesante"]);
        return isUnknownValue(raw) ? "" : raw ? String(raw) : "";
      })(),

      espesante_desconocido: (() => {
        const raw = getImportedValue(source, ["espesante", "espesante_id", "grasa_espesante", "grasa_espesante_id", "campos_adicionales.espesante"]);
        return finalTipoMuestra === "grasa" && (!raw || Boolean(source.espesante_desconocido) || isUnknownValue(raw));
      })(),

      observaciones:
        source.observaciones ||
        source.observacion ||
        "",

      atributos_tecnicos: normalizeTechnicalAttributes(
        source,
        finalTipoMuestra,
        dynamicTechnicalCatalogs
      ),
    };
  };
  const handleUseImportedRows = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    toast.warning("No hay filas válidas para cargar");
    return;
  }

  if (loadingTechnicalCatalogs) {
    toast.warning("Espere a que carguen los catálogos técnicos de aceites/grasas");
    return;
  }

  const hasManualSamples = muestras.some((muestra) => !isEmptyMuestra(muestra));

  if (hasManualSamples) {
    const confirmed = await appDialog.confirm(
      "Ya tienes muestras cargadas manualmente. Al importar el Excel, esas muestras serán reemplazadas por las filas válidas del archivo.",
      {
        title: "Reemplazar muestras manuales",
        description: "Esta acción solo reemplaza las muestras que todavía están cargadas en este formulario.",
        confirmLabel: "Importar y reemplazar",
        cancelLabel: "Conservar manuales",
        tone: "warning",
      }
    );

    if (!confirmed) return;
  }

  const normalizedRows = rows.map((row, index) =>
    normalizeExcelRowToMuestra(row, index)
  );

  setMuestras(normalizedRows);
  setSelectedMuestras([]);
  setSamplesInputMode("excel");
  setExcelImportState((prev) => ({ ...prev, appliedRowsCount: normalizedRows.length }));

  setErrors((prev) => {
    const next = { ...prev };

    delete next.muestras;

    Object.keys(next).forEach((key) => {
      if (key.startsWith("muestras.")) {
        delete next[key];
      }
    });

    return next;
  });

  toast.success(`${normalizedRows.length} muestra(s) cargada(s) desde Excel`);
};

  const handleSubmit = async (estado = "registrado") => {
    const validation = validate();
    if (!validation.isValid) {
      toast.error(firstErrorMessage(validation.nextErrors));
      setTimeout(() => {
        const firstError = document.querySelector('[data-has-error="true"]');
        firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    setSaving(true);

    try {
      const payload = buildPayload(estado);
      const created = await sampleBatchesService.create(payload);

      toast.success(estado === "borrador" ? "Borrador guardado correctamente" : "Lote registrado correctamente");
      router.push("/muestras/lotes");
    } catch (error) {
      const apiFieldErrors = getApiFieldErrors(error);
      if (Object.keys(apiFieldErrors).length) {
        setErrors((current) => ({ ...current, ...apiFieldErrors }));
      }
      notifyApiError(error, "No se pudo registrar el lote. Revise la información e inténtelo nuevamente.", { scope: 'sample-batch-create' });
    } finally {
      setSaving(false);
    }
  };

  const totalMuestras = muestras.length;

  const resumenTipos = useMemo(() => {
    const aceites = muestras.filter((m) => m.tipo_muestra === "aceite").length;
    const grasas = muestras.filter((m) => m.tipo_muestra === "grasa").length;
    return { aceites, grasas };
  }, [muestras]);

  const manualTotalPages = Math.max(1, Math.ceil(muestras.length / MANUAL_SAMPLE_PAGE_SIZE));
  const safeManualPage = Math.min(manualSamplePage, manualTotalPages);
  const manualStart = (safeManualPage - 1) * MANUAL_SAMPLE_PAGE_SIZE;
  const visibleMuestras = muestras.slice(manualStart, manualStart + MANUAL_SAMPLE_PAGE_SIZE);

  return (
    <div className="go-page sample-batch-create">
      <div className="go-shell">

        <PageHeader
          title="Nuevo lote de muestras"
          subtitle="Complete la información general y agregue las muestras que serán recibidas por el laboratorio."
          actions={(
            <>
              <button disabled={saving} onClick={() => handleSubmit("borrador")} className="go-ghost">
                <Save size={16} /> Guardar borrador
              </button>
              <button disabled={saving} onClick={() => handleSubmit("registrado")} className="go-primary">
                <CheckCircle size={16} /> Registrar lote
              </button>
            </>
          )}
        />

        <MetricStrip
          items={[
            { label: 'Total muestras', value: totalMuestras },
            { label: 'Aceites', value: resumenTipos.aceites },
            { label: 'Grasas', value: resumenTipos.grasas },
          ]}
        />

        {Object.keys(errors).length > 0 && (
          <div className="rounded-xl border border-red-700/60 bg-red-950/30 px-4 py-3 text-sm text-red-100">
            <p className="font-semibold">Hay {Object.keys(errors).length} campo(s) por revisar.</p>
            <p className="mt-1 text-red-100/90">{firstErrorMessage(errors)}</p>
          </div>
        )}

        <section className="go-card sample-batch-section space-y-5">
          <div>
            <h2 className="text-xl font-bold">Información General del Lote</h2>
            <p className="text-gray-400 text-sm mt-1">Datos comunes para todas las muestras del lote.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Tipo de cliente" error={errors.tipo_cliente}>
              <div className="flex bg-[#17191c] border border-[#353940] rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleTipoClienteChange("registrado")}
                  className={`flex-1 px-4 py-3 text-sm font-semibold ${
                    form.tipo_cliente === "registrado" ? "bg-red-600 text-white" : "text-gray-300 hover:bg-[#333]"
                  }`}
                >
                  Cliente registrado
                </button>

                <button
                  type="button"
                  onClick={() => handleTipoClienteChange("ocasional")}
                  disabled={!isGlobalUser()}
                  className={`flex-1 px-4 py-3 text-sm font-semibold ${
                    form.tipo_cliente === "ocasional" ? "bg-red-600 text-white" : "text-gray-300 hover:bg-[#333]"
                  } ${!isGlobalUser() ? "hidden" : ""}`}
                >
                  Cliente ocasional
                </button>
              </div>
            </Field>

            {form.tipo_cliente === "registrado" ? (
              <Field label="Cliente / Empresa" error={errors.cliente_empresa}>
                <select
                  value={form.cliente_empresa}
                  onChange={(e) => handleClienteEmpresaChange(e.target.value)}
                  className="input-dark"
                  disabled={loadingOptions}
                >
                  <option value="">Seleccione una empresa</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>{getCompanyName(cliente)}</option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Nombre cliente ocasional" error={errors.cliente_ocasional_nombre}>
                <input
                  value={form.cliente_ocasional_nombre}
                  onChange={(e) => updateForm("cliente_ocasional_nombre", e.target.value)}
                  className="input-dark"
                  placeholder="Ej: Taller El Rápido"
                />
              </Field>
            )}

            <Field label="Contacto" error={errors.contacto_nombre}>
              <input value={form.contacto_nombre} onChange={(e) => updateForm("contacto_nombre", e.target.value)} className="input-dark" placeholder="Nombre del contacto" />
            </Field>

            <Field label="Teléfono">
              <input value={form.contacto_telefono} onChange={(e) => updateForm("contacto_telefono", e.target.value)} className="input-dark" placeholder="+57 300 000 0000" />
            </Field>

            <Field label="Correo">
              <input type="email" value={form.contacto_email} onChange={(e) => updateForm("contacto_email", e.target.value)} className="input-dark" placeholder="correo@empresa.com" />
            </Field>

            <Field label="Fecha de envío" error={errors.fecha_envio}>
              <input type="date" value={form.fecha_envio} onChange={(e) => updateForm("fecha_envio", e.target.value)} className="input-dark" />
            </Field>

            <Field label="Tipo de gestión" error={errors.tipo_gestion}>
              <select
                value={form.tipo_gestion}
                onChange={(e) => updateForm("tipo_gestion", e.target.value)}
                className="input-dark"
                disabled={loadingTiposGestion || (form.tipo_cliente === "registrado" && !form.cliente_empresa)}
              >
                <option value="">
                  {form.tipo_cliente === "registrado" && !form.cliente_empresa
                    ? "Seleccione primero una empresa"
                    : loadingTiposGestion
                    ? "Cargando tipos de gestión..."
                    : "Seleccione un tipo de gestión"}
                </option>

                {tiposGestion.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>{getTipoGestionLabel(tipo)}</option>
                ))}
              </select>
            </Field>

            <div className="md:col-span-2">
              <Field label="Observaciones generales">
                <textarea value={form.observaciones} onChange={(e) => updateForm("observaciones", e.target.value)} className="input-dark min-h-[100px]" placeholder="Observaciones generales del lote" />
              </Field>
            </div>
          </div>
        </section>

        <section className="go-card sample-batch-section space-y-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Muestras del Lote</h2>
              <p className="text-gray-400 text-sm mt-1">
                Agregue muestras manualmente o use una plantilla Excel validada para lotes grandes.
              </p>
            </div>

            {samplesInputMode === "manual" && (
              <button onClick={addMuestra} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold">
                <Plus size={16} />
                Agregar muestra
              </button>
            )}
          </div>

          <div className="sample-mode-switch">
            <button
              type="button"
              onClick={() => setSamplesInputMode("manual")}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                samplesInputMode === "manual" ? "bg-red-600 text-white" : "text-gray-300 hover:bg-[#333]"
              }`}
            >
              Ingreso manual
            </button>
            <button
              type="button"
              onClick={() => setSamplesInputMode("excel")}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                samplesInputMode === "excel" ? "bg-red-600 text-white" : "text-gray-300 hover:bg-[#333]"
              }`}
            >
              Ingreso masivo por Excel
            </button>
          </div>

          {errors.muestras && (
            <div className="rounded-lg border border-red-700/60 bg-red-900/20 px-4 py-3 text-sm text-red-200">
              {errors.muestras}
            </div>
          )}

          {samplesInputMode === "manual" ? (
            <div className="space-y-4">
              {muestras.length > MANUAL_SAMPLE_PAGE_SIZE && (
                <div className="sample-page-controls">
                  <span className="text-sm text-gray-300">
                    Mostrando {manualStart + 1}-{Math.min(manualStart + MANUAL_SAMPLE_PAGE_SIZE, muestras.length)} de {muestras.length} muestras
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg border border-[#353940] disabled:opacity-40"
                      disabled={safeManualPage <= 1}
                      onClick={() => setManualSamplePage((page) => Math.max(1, page - 1))}
                    >
                      Anterior
                    </button>
                    <span className="px-3 py-2 text-sm text-gray-300">Página {safeManualPage} / {manualTotalPages}</span>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg border border-[#353940] disabled:opacity-40"
                      disabled={safeManualPage >= manualTotalPages}
                      onClick={() => setManualSamplePage((page) => Math.min(manualTotalPages, page + 1))}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}

              {visibleMuestras.map((muestra, offset) => {
                const index = manualStart + offset;
                return (
                <MuestraRow
                  key={muestra.tempId}
                  index={index}
                  muestra={muestra}
                  updateMuestra={updateMuestra}
                  duplicateMuestra={duplicateMuestra}
                  removeMuestra={removeMuestra}
                  maquinas={maquinas}
                  maquinasFiltradas={maquinasFiltradas}
                  puntosFiltrados={puntosFiltrados}
                  lubricantes={lubricantes}
                  selectedCompanyId={selectedCompanyId}
                  dynamicTechnicalCatalogs={dynamicTechnicalCatalogs}
                  errors={errors}
                  loadingOptions={loadingOptions || loadingTechnicalCatalogs}
                />
                );
              })}
            </div>
          ) : (
            <BulkSamplesExcelTab
              form={form}
              state={excelImportState}
              onStateChange={setExcelImportState}
              onUseRows={handleUseImportedRows}
            />
          )}
        </section>
      </div>

      <style jsx global>{`
        .input-dark {
          width: 100%;
          background: #17191c;
          border: 1px solid #444;
          color: white;
          border-radius: 0.5rem;
          padding: 0.75rem;
          outline: none;
        }

        .input-dark:focus {
          border-color: #dc2626;
          box-shadow: 0 0 0 1px #dc2626;
        }

        .input-dark::placeholder { color: #777; }
        .input-dark:disabled { opacity: 0.6; cursor: not-allowed; }
        .input-dark::-webkit-calendar-picker-indicator { filter: invert(1); opacity: .9; cursor: pointer; }
      `}</style>
    </div>
  );
};

const MuestraRow = ({
  index,
  muestra,
  updateMuestra,
  duplicateMuestra,
  removeMuestra,
  maquinas,
  maquinasFiltradas,
  puntosFiltrados,
  lubricantes,
  selectedCompanyId,
  dynamicTechnicalCatalogs,
  errors,
  loadingOptions,
}) => {
  const isAceite = muestra.tipo_muestra === "aceite";
  const isGrasa = muestra.tipo_muestra === "grasa";
  const isUsada = muestra.condicion === "usada";
  const selectedPoint = puntosFiltrados.find((point) => String(point.id) === String(muestra.punto_muestreo));
  const getError = (field) => errors[`muestras.${index}.${field}`];

  return (
    <div className="border border-white/[0.07] rounded-xl bg-[#222] overflow-visible">
      <div className="flex items-center justify-between px-4 py-3 bg-[#2f2f2f] border-b border-[#3a3a3a] rounded-t-xl">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold">{index + 1}</span>
          <div>
            <p className="font-semibold">Muestra {index + 1}</p>
            <p className="text-xs text-gray-400">{isAceite ? "Aceite" : "Grasa"} · {muestra.condicion === "nueva" ? "Nueva" : "Usada"}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => duplicateMuestra(index)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600" title="Duplicar muestra">
            <Copy size={16} />
          </button>

          <button onClick={() => removeMuestra(index)} className="p-2 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-200" title="Eliminar muestra">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Field label="Tipo" error={getError("tipo_muestra")}>
          <select value={muestra.tipo_muestra} onChange={(e) => updateMuestra(index, "tipo_muestra", e.target.value)} className="input-dark">
            <option value="aceite">Aceite</option>
            <option value="grasa">Grasa</option>
          </select>
        </Field>

        <Field label="Condición" error={getError("condicion")}>
          <select value={muestra.condicion} onChange={(e) => updateMuestra(index, "condicion", e.target.value)} className="input-dark">
            <option value="usada">Usada</option>
            <option value="nueva">Nueva</option>
          </select>
        </Field>

        <Field label="Fecha toma" error={getError("fecha_toma")}>
          <input type="datetime-local" value={muestra.fecha_toma} onChange={(e) => updateMuestra(index, "fecha_toma", e.target.value)} className="input-dark" />
        </Field>

        {isUsada && (
          <div className="md:col-span-4 rounded-lg border border-[#353940] bg-[#141518] p-4">
            <p className="mb-1 text-sm font-semibold text-gray-200">Contexto del activo</p>
            <p className="mb-4 text-xs text-gray-500">Seleccione primero el equipo y el punto. Sus valores son predeterminados; puede cambiarlos solo para esta muestra.</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Identificación del equipo">
                <div className="inline-flex overflow-hidden rounded-md border border-gray-600 bg-[#111]">
                  <button type="button" onClick={() => updateMuestra(index, "equipo_modo", "catalogo")} className={`px-3 py-2 text-sm font-semibold ${muestra.equipo_modo !== "manual" ? "bg-red-600 text-white" : "text-gray-300"}`}>Equipo registrado</button>
                  <button type="button" onClick={() => updateMuestra(index, "equipo_modo", "manual")} className={`px-3 py-2 text-sm font-semibold ${muestra.equipo_modo === "manual" ? "bg-red-600 text-white" : "text-gray-300"}`}>Identificación manual</button>
                </div>
              </Field>
              {muestra.equipo_modo !== "manual" ? <Field label="Máquina"><select value={muestra.referencia_equipo} onChange={(e) => updateMuestra(index, "referencia_equipo", e.target.value)} className="input-dark"><option value="">Seleccione máquina</option>{maquinasFiltradas.map((machine) => <option key={machine.id} value={machine.id}>{machine.codigo_equipo || machine.nombre}</option>)}</select></Field> : <Field label="Máquina / identificación manual"><input value={muestra.equipo_placa} onChange={(e) => updateMuestra(index, "equipo_placa", e.target.value)} className="input-dark" placeholder="Ej: PKI203" /></Field>}
              {muestra.equipo_modo !== "manual" ? <Field label="Punto de medida" error={getError("punto_muestreo")}><select value={muestra.punto_muestreo} onChange={(e) => updateMuestra(index, "punto_muestreo", e.target.value)} className="input-dark" disabled={!muestra.referencia_equipo || loadingOptions}><option value="">Seleccione punto de medida</option>{puntosFiltrados.filter((point) => String(point.maquina) === String(muestra.referencia_equipo)).map((point) => <option key={point.id} value={point.id}>{point.nombre}{point.lubricante ? ` · ${point.lubricante}` : ''}</option>)}</select>{selectedPoint && <span className="mt-1 block text-xs text-gray-400">Predeterminado: {selectedPoint.lubricante || 'sin lubricante'} · cambio {selectedPoint.frecuencia_cambio ? `${selectedPoint.frecuencia_cambio} ${selectedPoint.unidad_frecuencia_cambio}` : 'sin definir'} · análisis {selectedPoint.frecuencia_analisis ? `${selectedPoint.frecuencia_analisis} ${selectedPoint.unidad_frecuencia_analisis}` : 'sin definir'}.</span>}</Field> : <Field label="Punto de medida manual"><input value={muestra.punto_manual} onChange={(e) => updateMuestra(index, "punto_manual", e.target.value)} className="input-dark" placeholder="Ej: Reductor lado motor" /><span className="mt-1 block text-xs text-gray-400">{form.tipo_cliente === 'ocasional' ? 'Se conservará como identificación manual en la muestra.' : 'Al guardar se creará o reutilizará este punto para la máquina manual.'}</span></Field>}
            </div>
          </div>
        )}

        <div className="md:col-span-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-300">Campos técnicos para {isAceite ? "aceite" : "grasa"}</p>
              <p className="text-xs text-gray-500 mt-1">Si no conocen un dato, marque &quot;Desconocido&quot;.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Fabricante">
              <input
                value={muestra.fabricante}
                onChange={(e) => updateMuestra(index, "fabricante", e.target.value)}
                className="input-dark"
                placeholder="Ej: Mobil, Shell, Terpel"
              />
            </Field>

            <Field label="Referencia / marca" error={getError("referencia_marca")}>
              <input
                value={muestra.referencia_marca}
                onChange={(e) => updateMuestra(index, "referencia_marca", e.target.value)}
                className="input-dark"
                placeholder="Ej: Mobilgear 600 XP"
              />
            </Field>
            <Field label="Lubricante registrado">
              <select value={muestra.lubricante_catalogo} onChange={(e) => { const item = lubricantes.find((entry) => String(entry.id) === e.target.value); updateMuestra(index, "lubricante_catalogo", e.target.value); if (item) { updateMuestra(index, "fabricante", item.fabricante); updateMuestra(index, "referencia_marca", item.referencia); } }} className="input-dark">
                <option value="">Seleccione un lubricante</option>
                {lubricantes.map((item) => <option key={item.id} value={item.id}>{item.fabricante} · {item.referencia}</option>)}
              </select>
            </Field>
            {isUsada && <Field label="Frecuencia de cambio para esta muestra"><div className="grid grid-cols-[1fr_110px] gap-2"><input type="number" min="0" value={muestra.frecuencia_cambio_muestra} onChange={(e) => updateMuestra(index, "frecuencia_cambio_muestra", e.target.value)} className="input-dark" placeholder="Predeterminada del punto" /><select value={muestra.unidad_frecuencia_cambio_muestra} onChange={(e) => updateMuestra(index, "unidad_frecuencia_cambio_muestra", e.target.value)} className="input-dark"><option value="horas">Horas</option><option value="dias">Días</option><option value="meses">Meses</option></select></div></Field>}
            {isUsada && <Field label="Frecuencia de análisis para esta muestra"><div className="grid grid-cols-[1fr_110px] gap-2"><input type="number" min="0" value={muestra.frecuencia_analisis_muestra} onChange={(e) => updateMuestra(index, "frecuencia_analisis_muestra", e.target.value)} className="input-dark" placeholder="Predeterminada del punto" /><select value={muestra.unidad_frecuencia_analisis_muestra} onChange={(e) => updateMuestra(index, "unidad_frecuencia_analisis_muestra", e.target.value)} className="input-dark"><option value="horas">Horas</option><option value="dias">Días</option><option value="meses">Meses</option></select></div></Field>}
          </div>
        </div>
        <DynamicSampleTechnicalFields
          catalogs={dynamicTechnicalCatalogs}
          muestra={muestra}
          index={index}
          errors={errors}
          updateMuestra={updateMuestra}
          disabled={loadingOptions}
        />

        {isUsada && (
          <>
            <Field label="Periodo aceite">
              <input type="number" min="0" value={muestra.periodo_servicio_aceite} onChange={(e) => updateMuestra(index, "periodo_servicio_aceite", e.target.value)} className="input-dark" placeholder="Ej: 250" />
            </Field>

            <Field label="Unidad aceite">
              <select value={muestra.unidad_periodo_aceite} onChange={(e) => updateMuestra(index, "unidad_periodo_aceite", e.target.value)} className="input-dark">
                <option value="horas">Horas</option>
                <option value="km">Kilómetros</option>
                <option value="millas">Millas</option>
                <option value="dias">Días</option>
              </select>
            </Field>

            <Field label="Periodo equipo">
              <input type="number" min="0" value={muestra.periodo_servicio_equipo} onChange={(e) => updateMuestra(index, "periodo_servicio_equipo", e.target.value)} className="input-dark" placeholder="Ej: 5000" />
            </Field>

            <Field label="Unidad equipo">
              <select value={muestra.unidad_periodo_equipo} onChange={(e) => updateMuestra(index, "unidad_periodo_equipo", e.target.value)} className="input-dark">
                <option value="horas">Horas</option>
                <option value="km">Kilómetros</option>
                <option value="millas">Millas</option>
                <option value="dias">Días</option>
              </select>
            </Field>
          </>
        )}

        <div className="md:col-span-4">
          <Field label="Observaciones de la muestra">
            <textarea value={muestra.observaciones} onChange={(e) => updateMuestra(index, "observaciones", e.target.value)} className="input-dark min-h-[80px]" placeholder="Observaciones específicas de esta muestra" />
          </Field>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, error, children }) => (
  <label className="block" data-has-error={error ? "true" : undefined}>
    <span className="block text-sm font-semibold text-gray-300 mb-2">{label}</span>
    {children}
    {error && (
      <span className="mt-2 flex items-center gap-1 text-xs text-red-400">
        <AlertCircle size={13} />
        {error}
      </span>
    )}
  </label>
);

const SummaryCard = ({ title, value }) => (
  <div className="bg-[#141518] border border-white/[0.07] rounded-xl p-5">
    <p className="text-gray-400 text-sm">{title}</p>
    <p className="text-3xl font-bold text-white mt-2">{value}</p>
  </div>
);

export default NuevoLoteMuestrasPage;
