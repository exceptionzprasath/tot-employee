import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const registerEmployee = async (formData) => {
    try {
        const response = await api.post('/auth/register', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Register Employee API Error:', error);
        throw error;
    }
};

export const checkPhoneExists = async (phone) => {
    try {
        const response = await api.post('/auth/check-phone', { phone });
        return response.data;
    } catch (error) {
        console.error('Check Phone API Error:', error);
        throw error;
    }
};

export const updateBankDetails = async (phone, bankDetails) => {
    try {
        const response = await api.patch('/auth/bank-details', { phone, bankDetails });
        return response.data;
    } catch (error) {
        console.error('Update Bank Details API Error:', error);
        throw error;
    }
};

export const updateWorkHistory = async (phone, workHistory) => {
    try {
        const response = await api.patch('/auth/work-history', { phone, workHistory });
        return response.data;
    } catch (error) {
        console.error('Update Work History API Error:', error);
        throw error;
    }
};

export const loginEmployee = async (employeeId, pin) => {
    try {
        const response = await api.post('/auth/login', { employeeId, pin });
        if (response.data.success) {
            await AsyncStorage.setItem('employeeToken', response.data.token);
            await AsyncStorage.setItem('empId', employeeId);
        }
        return response.data;
    } catch (error) {
        console.error('Login Employee API Error:', error);
        throw error;
    }
};

export const getEmployeeStats = async (empId) => {
    try {
        const response = await api.get(`/employee/stats/${empId}`);
        return response.data;
    } catch (error) {
        console.error('Get Employee Stats API Error:', error);
        throw error;
    }
};

export const checkSession = async (empId) => {
    try {
        const response = await api.get(`/auth/me/${empId}`);
        return response.data;
    } catch (error) {
        console.error('Check Session API Error:', error);
        throw error;
    }
};

export default {
    registerEmployee,
    checkPhoneExists,
    updateBankDetails,
    updateWorkHistory,
    loginEmployee,
    getEmployeeStats,
    checkSession
};
