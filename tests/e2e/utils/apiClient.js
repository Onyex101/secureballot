/**
 * API Client for E2E tests
 */

const axios = require('axios');
const config = require('../config');

// Create axios instance with configuration
const apiClient = axios.create(config.apiConfig);

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = global.authToken;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common response patterns
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log detailed error information for debugging
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config.url,
        method: error.config.method
      });
    } else if (error.request) {
      console.error('API No Response:', error.request);
    } else {
      console.error('API Request Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Helper for formatting API responses in a consistent way
function formatResponse(response) {
  return {
    status: response.status,
    statusText: response.statusText,
    data: response.data
  };
}

// Wrapper for GET requests
async function get(url, params = {}, headers = {}) {
  try {
    const response = await apiClient.get(url, { params, headers });
    return formatResponse(response);
  } catch (error) {
    throw error;
  }
}

// Wrapper for POST requests
async function post(url, data = {}, headers = {}) {
  try {
    const response = await apiClient.post(url, data, { headers });
    return formatResponse(response);
  } catch (error) {
    throw error;
  }
}

// Wrapper for PUT requests
async function put(url, data = {}, headers = {}) {
  try {
    const response = await apiClient.put(url, data, { headers });
    return formatResponse(response);
  } catch (error) {
    throw error;
  }
}

// Wrapper for DELETE requests
async function del(url, params = {}, headers = {}) {
  try {
    const response = await apiClient.delete(url, { params, headers });
    return formatResponse(response);
  } catch (error) {
    throw error;
  }
}

// Store authentication token globally
function setAuthToken(token) {
  global.authToken = token;
  return token;
}

// Clear authentication token
function clearAuthToken() {
  global.authToken = null;
}

module.exports = {
  client: apiClient,
  formatResponse,
  get,
  post,
  put,
  delete: del,
  setAuthToken,
  clearAuthToken
}; 