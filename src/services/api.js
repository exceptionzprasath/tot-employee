import axios from 'axios';

const api = axios.create({
    baseURL: 'https://settlo-tot-backend.vercel.app/api',
    // baseURL: 'https://e5d9-2401-4900-ca83-9396-dda8-d19-849f-372e.ngrok-free.app/api',

    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
