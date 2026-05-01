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

export const loginEmployee = async (employeeId, pin) => {
    try {
        const response = await api.post('/auth/login', { employeeId, pin });
        if (response.data.success) {
            await AsyncStorage.setItem('employeeToken', response.data.token);
        }
        return response.data;
    } catch (error) {
        console.error('Login Employee API Error:', error);
        throw error;
    }
};

export default {
    registerEmployee,
    loginEmployee,
};
