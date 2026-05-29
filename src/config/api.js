import { API_BASE_URL } from '../services/api';

export { API_BASE_URL };

export const API_ENDPOINTS = {
    // Auth
    LOGIN: '/api/employee/login',
    LOGOUT: '/api/employee/logout',

    // Orders
    ORDERS: '/api/orders',
    ORDER_BY_ID: (id) => `/api/orders/${id}`,
    ORDER_STATUS: (id) => `/api/orders/${id}/status`,

    // Employee
    EMPLOYEE_PROFILE: '/api/employee/profile',
    EMPLOYEE_STATUS: '/api/employee/status',
    EMPLOYEE_LOCATION: '/api/employee/location',
    EMPLOYEE_STATS: '/api/employee/stats',

    // Vehicles
    VEHICLES: '/api/vehicles',
    VEHICLE_STATUS: (id) => `/api/vehicles/${id}/status`,

    // Health
    HEALTH: '/api/health',
};

export const PAYMENT_CONFIG = {
    UPI_ID: '9361016097@naviaxis',
    MERCHANT_NAME: 'Thambioru Tea',
};

export const GOOGLE_MAPS_API_KEY = 'AIzaSyBO86Y_HqbJDWjCfBljLC72qiazTSk4i1o';

export default {
    API_BASE_URL,
    API_ENDPOINTS,
    PAYMENT_CONFIG,
    GOOGLE_MAPS_API_KEY,
};
