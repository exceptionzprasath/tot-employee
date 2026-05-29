import axios from 'axios';

// Central source of truth for the backend URL
// export const API_BASE_URL = 'https://settlo-tot-backend-production.up.railway.app';
export const API_BASE_URL = 'https://1518-2401-4900-cae6-f00f-d4ca-e29d-6347-fc2a.ngrok-free.app';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
