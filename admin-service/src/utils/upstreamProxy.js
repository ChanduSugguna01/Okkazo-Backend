const axios = require('axios');
const { createApiError } = require('./ApiError');

const buildUpstreamHeaders = (user) => ({
  'x-auth-id': user?.authId || '',
  'x-user-id': user?.userId || '',
  'x-user-email': user?.email || '',
  'x-user-username': user?.username || '',
  'x-user-role': user?.role || 'ADMIN',
});

const buildForwardQuery = (query = {}) => {
  const forwarded = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value == null) return;

    const normalized = String(value).trim();
    if (!normalized) return;

    forwarded.append(key, normalized);
  });

  return forwarded.toString();
};

const extractUpstreamMessage = (error, fallbackMessage = 'Failed to fetch upstream data') => {
  const responseData = error?.response?.data;

  if (responseData && typeof responseData === 'object' && responseData.message) {
    return responseData.message;
  }

  if (typeof responseData === 'string' && responseData.trim()) {
    try {
      const parsed = JSON.parse(responseData);
      if (parsed?.message) {
        return parsed.message;
      }
    } catch (_ignored) {
      // Keep fallback behavior for non-JSON payloads.
    }
  }

  return error?.message || fallbackMessage;
};

const requestUpstream = async ({
  baseUrl,
  path,
  method = 'GET',
  user,
  query,
  body,
  timeout = 15000,
  responseType = 'json',
  fallbackMessage = 'Failed to fetch upstream data',
  unwrapData = true,
}) => {
  const queryString = buildForwardQuery(query);
  const targetUrl = `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await axios({
      method,
      url: targetUrl,
      headers: buildUpstreamHeaders(user),
      timeout,
      responseType,
      data: body,
    });

    if (!unwrapData) {
      return response;
    }

    return response.data?.data || response.data;
  } catch (error) {
    const statusCode = error?.response?.status || 502;
    const message = extractUpstreamMessage(error, fallbackMessage);
    throw createApiError(statusCode, message);
  }
};

module.exports = {
  buildUpstreamHeaders,
  buildForwardQuery,
  extractUpstreamMessage,
  requestUpstream,
};
