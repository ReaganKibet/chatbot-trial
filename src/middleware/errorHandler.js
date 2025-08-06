// Error handling middleware for Express.js
const errorHandler = (err, req, res, next) => {
    // Log the error for debugging
    console.error('Error occurred:', err);
  
    // Default error response
    let statusCode = 500;
    let message = 'Internal Server Error';
  
    // Handle specific error types
    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation Error';
    } else if (err.name === 'UnauthorizedError') {
      statusCode = 401;
      message = 'Unauthorized';
    } else if (err.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid ID format';
    } else if (err.code === 11000) {
      statusCode = 400;
      message = 'Duplicate entry';
    }
  
    // In development, send the full error
    if (process.env.NODE_ENV === 'development') {
      res.status(statusCode).json({
        success: false,
        error: {
          message: err.message,
          stack: err.stack
        }
      });
    } else {
      // In production, send generic error message
      res.status(statusCode).json({
        success: false,
        error: {
          message: message
        }
      });
    }
  };
  
  module.exports = errorHandler;