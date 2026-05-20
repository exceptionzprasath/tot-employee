import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkSession } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [employee, setEmployee] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [teaCups, setTeaCups] = useState(50);
    const [snacksCount, setSnacksCount] = useState(0);
    const [shiftStartTime, setShiftStartTime] = useState(null);

    const SHIFT_DURATION = 5 * 60 * 60 * 1000; // 5 hours in ms

    const login = (employeeData) => {
        setIsAuthenticated(true);
        setEmployee(employeeData);
        setIsOnline(false); // Default to Off
        setShiftStartTime(null);
        setTeaCups(50);
        setSnacksCount(0);
    };

    const logout = async () => {
        setIsAuthenticated(false);
        setEmployee(null);
        setIsOnline(false);
        setShiftStartTime(null);
        await AsyncStorage.removeItem('employeeToken');
        await AsyncStorage.removeItem('empId');
    };

    useEffect(() => {
        const loadSession = async () => {
            try {
                const empId = await AsyncStorage.getItem('empId');
                if (empId) {
                    const response = await checkSession(empId);
                    if (response.success && response.employee) {
                        setIsAuthenticated(true);
                        setEmployee(response.employee);
                    } else {
                        logout();
                    }
                }
            } catch (error) {
                console.error('Session load error:', error);
            }
        };
        loadSession();
    }, []);

    const updateStatus = (status) => {
        const online = status === 'online';
        setIsOnline(online);

        if (online) {
            setShiftStartTime(Date.now());
        } else {
            setShiftStartTime(null);
        }

        if (employee) {
            setEmployee({ ...employee, status });
        }
    };

    const updateInventory = (teas, snacks = 0) => {
        setTeaCups(prev => Math.max(0, prev - teas));
        setSnacksCount(prev => prev + snacks);
    };

    const refillDrum = () => {
        setTeaCups(50);
    };

    useEffect(() => {
        let interval;
        if (isOnline && shiftStartTime) {
            interval = setInterval(() => {
                const elapsed = Date.now() - shiftStartTime;
                if (elapsed >= SHIFT_DURATION) {
                    updateStatus('offline');
                    Alert.alert('Shift Completed', 'Your 5-hour shift has been completed for today.');
                }
            }, 5000); // Check every 5 seconds
        }
        return () => clearInterval(interval);
    }, [isOnline, shiftStartTime]);

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            employee,
            isOnline,
            teaCups,
            snacksCount,
            login,
            logout,
            updateStatus,
            updateInventory,
            refillDrum,
            shiftStartTime,
            SHIFT_DURATION,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
