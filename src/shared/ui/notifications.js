import { toast } from 'react-toastify';

import { getErrorPresentation } from '@shared/utils/errors';

const defaultOptions = {
  autoClose: 4200,
  closeOnClick: false,
};

const notificationId = (presentation, scope) => `${scope || 'global'}:${presentation.kind}:${presentation.message}`;

/**
 * Shows one safe, consistent notification for an API failure.
 * Page-level loading failures should use AppErrorState instead, so the user
 * has a visible recovery action and does not receive a duplicate toast.
 */
export const notifyApiError = (error, fallback, options = {}) => {
  const presentation = error?.userPresentation || getErrorPresentation(error, fallback);
  return toast.error(presentation.message, {
    ...defaultOptions,
    ...options,
    toastId: options.toastId || notificationId(presentation, options.scope),
  });
};

export const notifySuccess = (message, options = {}) => toast.success(message, { ...defaultOptions, ...options });
export const notifyWarning = (message, options = {}) => toast.warning(message, { ...defaultOptions, ...options });
export const notifyInfo = (message, options = {}) => toast.info(message, { ...defaultOptions, ...options });
