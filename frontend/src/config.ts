// Configuration file for managing environment-specific settings.
// VITE_API_URL should be set in the .env file when deploying the frontend separately.
// For example: VITE_API_URL="https://your-backend-service.onrender.com"
export const API_BASE = import.meta.env.VITE_API_URL || '';
