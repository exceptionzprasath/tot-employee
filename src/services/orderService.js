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
    // In a real app, you'd fetch orders assigned to this employee
    // For now, let's just return a placeholder or fetch nearby
    try {
        // This is a simplified version; employees would usually have a dedicated "My Orders" endpoint
        // For this task, we focus on fetching nearby unaccepted orders
        return { success: true, data: [] };
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
