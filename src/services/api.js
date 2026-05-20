import axios from 'axios';

const api = axios.create({
    baseURL: 'https://settlo-tot-backend.vercel.app/api',
    // baseURL: 'https://310f-2405-201-e02c-b031-f511-8729-8935-38f0.ngrok-free.app/api',

    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
