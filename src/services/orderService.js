import api from './api';

export const getNearbyOrders = async (lat, lng) => {
    try {
        const response = await api.get(`/orders/nearby?lat=${lat}&lng=${lng}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching nearby orders:', error);
        return { success: false, message: 'Failed to fetch orders' };
    }
};

export const getActiveOrders = async () => {
    try {
        // Fetch nearby orders (we use a default location since the backend radius is huge for testing)
        // In production, HomeScreen should pass the actual location here.
        const response = await api.get(`/orders/nearby?lat=11.45&lng=77.37`);
        return response.data;
    } catch (error) {
        return { success: false, data: [] };
    }
};

export const getOrderHistory = async () => {
    try {
        // Mocking for now as we don't have a history endpoint for employees yet
        return { success: true, data: [] };
    } catch (error) {
        return { success: false, data: [] };
    }
};

export const getOrderById = async (orderId) => {
    try {
        const response = await api.get(`/orders/${orderId}`);
        return response.data;
    } catch (error) {
        return { success: false, message: 'Order not found' };
    }
};

export const updateOrderStatus = async (orderId, status) => {
    try {
        const response = await api.patch(`/orders/${orderId}/status`, { status });
        return response.data;
    } catch (error) {
        return { success: false, message: 'Failed to update status' };
    }
};

export const acceptOrder = async (orderId, employeeData) => {
    try {
        const response = await api.post(`/orders/${orderId}/accept`, employeeData);
        return response.data;
    } catch (error) {
        console.error('Accept Order Error:', error);
        return { success: false, message: 'Failed to accept order' };
    }
};

export const recordOfflineSale = async (employeeId, cupsSold, paymentMode) => {
    try {
        const response = await api.post(`/employees/${employeeId}/offline-sale`, { cupsSold, paymentMode });
        return response.data;
    } catch (error) {
        console.error('Record Offline Sale Error:', error);
        return { success: false, message: 'Failed to record offline sale' };
    }
};
