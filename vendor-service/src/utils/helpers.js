const { v4: uuidv4 } = require('uuid');

/**
 * Generate unique document ID
 */
const generateDocumentId = () => {
  return `doc-${uuidv4()}`;
};

/**
 * Validate file type
 */
const isValidFileType = (mimetype) => {
  const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  return validTypes.includes(mimetype);
};

/**
 * Validate file size (max 5MB)
 */
const isValidFileSize = (size) => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  return size <= maxSize;
};

/**
 * Get file extension from mimetype
 */
const getFileExtension = (mimetype) => {
  const extensions = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
  };
  return extensions[mimetype] || 'unknown';
};

/**
 * Format error response
 */
const formatErrorResponse = (code, message, details = null) => {
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details) {
    response.error.details = details;
  }

  return response;
};

/**
 * Format success response
 */
const formatSuccessResponse = (data, message = null) => {
  const response = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  return response;
};

module.exports = {
  generateDocumentId,
  isValidFileType,
  isValidFileSize,
  getFileExtension,
  formatErrorResponse,
  formatSuccessResponse,
};
