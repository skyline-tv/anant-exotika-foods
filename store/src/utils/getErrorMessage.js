export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  const apiMessage = error.response?.data?.message;
  if (apiMessage) return apiMessage;

  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return 'Unable to connect to the server. Please check your connection and try again.';
  }

  if (error.message) return error.message;
  return fallback;
}

export function getFieldErrors(error) {
  const errors = error?.response?.data?.errors;
  if (!Array.isArray(errors) || errors.length === 0) return {};

  return errors.reduce((acc, item) => {
    if (item?.field) {
      acc[item.field] = item.message;
    }
    return acc;
  }, {});
}
