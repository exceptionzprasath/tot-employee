import axios from 'axios';

// Central source of truth for the backend URL
// export const API_BASE_URL = 'https://settlo-tot-backend-production.up.railway.app';
export const API_BASE_URL = 'https://7d0e-2401-4900-93d8-2205-6c24-1695-9791-101f.ngrok-free.app';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
