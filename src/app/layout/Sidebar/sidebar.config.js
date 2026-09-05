import { BarChart3, ClipboardCheck, FileSpreadsheet, FileText, Folder, Gauge, Settings, Wrench } from 'lucide-react';

export const ROLE = {
  GLOBAL: 'GLOBAL',
  ADMIN: 'ADMIN',
  EMPRESA: 'EMPRESA',
  LABORATORISTA: 'LABORATORISTA',
  OPERARIO: 'OPERARIO',
};

const INTERNAL_ROLES = [ROLE.GLOBAL, ROLE.ADMIN, ROLE.LABORATORISTA];
const SAMPLE_ROLES = [...INTERNAL_ROLES, ROLE.EMPRESA, ROLE.OPERARIO];

export const SIDEBAR_NAVIGATION = [
  {
    id: 'operations-header',
    kind: 'header',
    label: 'Operación de laboratorio',
    roles: SAMPLE_ROLES,
  },
  {
    id: 'samples',
    label: 'Muestras',
    href: '/muestras',
    icon: Folder,
    roles: SAMPLE_ROLES,
    children: [
      {
        id: 'sample-lab-entry',
        label: 'Lotes de muestras',
        href: '/muestras/lotes',
        icon: Gauge,
        roles: SAMPLE_ROLES,
      },
      {
        id: 'sample-test-assignment',
        label: 'Asignación de pruebas',
        href: '/muestras/asignacion-pruebas',
        icon: ClipboardCheck,
        roles: INTERNAL_ROLES,
      },
      {
        id: 'sample-result-entry',
        label: 'Ingreso de resultados',
        href: '/muestras/resultados',
        icon: FileSpreadsheet,
        roles: INTERNAL_ROLES,
      },
      {
        id: 'sample-review-results',
        label: 'Revisión de resultados',
        href: '/muestras/revision-resultados',
        icon: ClipboardCheck,
        roles: INTERNAL_ROLES,
      },
      {
        id: 'sample-interpretation',
        label: 'Interpretación',
        href: '/muestras/interpretacion',
        icon: BarChart3,
        roles: INTERNAL_ROLES,
      },
      {
        id: 'sample-review',
        label: 'Revision de muestras',
        href: '/muestras/revision-muestras',
        icon: FileText,
        roles: INTERNAL_ROLES,
      },
    ],
  },
  {
    id: 'machines',
    label: 'Máquinas',
    href: '/machines',
    icon: Wrench,
    roles: SAMPLE_ROLES,
  },
  {
    id: 'reports',
    label: 'Reportes',
    href: '/reportes',
    icon: FileText,
    roles: [ROLE.GLOBAL, ROLE.ADMIN, ROLE.EMPRESA],
  },
  {
    id: 'technical-config',
    label: 'Configuracion tecnica',
    href: '/configuracion-tecnica',
    icon: Settings,
    roles: [ROLE.GLOBAL],
  },
];
