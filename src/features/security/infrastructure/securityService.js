
import apiClient from '@infrastructure/api/apiClient';

const unwrap = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeParams = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined));

export const securityService = {
  unwrap,

  permissions: {
    async list(params = {}) {
      const { data } = await apiClient.get('/security/permissions/', { params: normalizeParams(params) });
      return unwrap(data);
    },
    async seedDefaults() {
      const { data } = await apiClient.post('/security/permissions/seed-defaults/');
      return data;
    },
  },

  roles: {
    async list(params = {}) {
      const { data } = await apiClient.get('/security/roles/', { params: normalizeParams(params) });
      return unwrap(data);
    },
    async assignable(params = {}) {
      const { data } = await apiClient.get('/security/roles/assignable/', { params: normalizeParams(params) });
      return unwrap(data);
    },
    async create(payload) {
      const { data } = await apiClient.post('/security/roles/', payload);
      return data;
    },
    async update(id, payload) {
      const { data } = await apiClient.patch(`/security/roles/${id}/`, payload);
      return data;
    },
    async remove(id) {
      const { data } = await apiClient.delete(`/security/roles/${id}/`);
      return data;
    },
    async matrix() {
      const { data } = await apiClient.get('/security/roles/matrix/');
      return data;
    },
    async roleMatrix(id) {
      const { data } = await apiClient.get(`/security/roles/${id}/matrix/`);
      return data;
    },
    async updateMatrix(id, permissionCodes = []) {
      const { data } = await apiClient.put(`/security/roles/${id}/matrix/`, {
        permissions: permissionCodes,
        permission_codes: permissionCodes,
      });
      return data;
    },
  },

  userProfiles: {
    async list(params = {}) {
      const { data } = await apiClient.get('/security/user-profiles/', { params: normalizeParams(params) });
      return unwrap(data);
    },
    async update(id, payload) {
      const { data } = await apiClient.patch(`/security/user-profiles/${id}/`, payload);
      return data;
    },
  },

  invitations: {
    async list(params = {}) {
      const { data } = await apiClient.get('/security/invitations/', { params: normalizeParams(params) });
      return unwrap(data);
    },
    async create(payload) {
      const { data } = await apiClient.post('/security/invitations/', payload);
      return data;
    },
    async resend(id) {
      const { data } = await apiClient.post(`/security/invitations/${id}/resend/`);
      return data;
    },
    async revoke(id) {
      const { data } = await apiClient.post(`/security/invitations/${id}/revoke/`);
      return data;
    },
    async accept(payload) {
      const { data } = await apiClient.post('/security/invitations/accept/', payload, { _skipAuthRefresh: true });
      return data;
    },
    async validate(token) {
      const { data } = await apiClient.get('/security/invitations/validate/', {
        params: { token },
        _skipAuthRefresh: true,
      });
      return data;
    },
  },

  users: {
    async list(params = {}) {
      const { data } = await apiClient.get('/users/', { params: normalizeParams(params) });
      return unwrap(data);
    },
    async getById(id) {
      const { data } = await apiClient.get(`/users/${id}/`);
      return data;
    },
    async update(id, payload) {
      const { data } = await apiClient.patch(`/users/${id}/`, payload);
      return data;
    },
    async remove(id) {
      const { data } = await apiClient.delete(`/users/${id}/`);
      return data;
    },
    async block(id, reason = '') {
      const { data } = await apiClient.post(`/security/users/${id}/block/`, { reason, motivo: reason });
      return data;
    },
    async unblock(id) {
      const { data } = await apiClient.post(`/security/users/${id}/unblock/`);
      return data;
    },
    async readOnly(id, reason = '') {
      const { data } = await apiClient.post(`/security/users/${id}/read-only/`, { reason, motivo: reason });
      return data;
    },
    async restoreWrite(id) {
      const { data } = await apiClient.post(`/security/users/${id}/restore-write/`);
      return data;
    },
  },

  audit: {
    async list(params = {}) {
      const { data } = await apiClient.get('/security/audit-logs/', { params: normalizeParams(params) });
      return unwrap(data);
    },
  },
};

export default securityService;
