import axios from 'axios';

// Central source of truth for the backend URL
export const API_BASE_URL = 'https://settlo-tot-backend-production.up.railway.app';
// export const API_BASE_URL = 'https://bb02-2401-4900-cae3-415a-1159-c7a3-12ff-9421.ngrok-free.app';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
