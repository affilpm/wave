// config.js
const config = {
    development: {
      API_URL: 'http://localhost:8000/', // Development API URL
    },
    production: {
      API_URL: 'https://your-production-api-url.com/', // Production API URL
    },
  };
  
  const environment = process.env.NODE_ENV || 'development'; // Default to 'development'
  
  export const API_URL = config[environment].API_URL;