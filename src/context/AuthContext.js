import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import messaging from '@react-native-firebase/messaging';
import { checkSession } from '../services/authService';
import {
    emitGoOnline,
    emitGoOffline,
    startLocationUpdates,
    stopLocationUpdates,
    disconnectSocket,
} from '../config/socket';

const AuthContext = createContext();

// Helper: get current GPS position as a Promise
const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            (error) => {
                console.error('GPS Error:', error);
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 5000,
            }
        );
    });
};

// Helper: request location permission on Android
const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: 'Location Permission',
                message: 'Thambioru Tea needs access to your location to receive nearby orders.',
                buttonPositive: 'Allow',
                buttonNegative: 'Deny',
            }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // iOS handles via Info.plist
};

// Helper: request push notification permission (required for Android 13+ and iOS)
const requestNotificationPermission = async () => {
    if (Platform.OS === 'android') {
        const androidVersion = parseInt(Platform.Version, 10);
        if (androidVersion >= 33) {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                    {
                        title: 'Notification Permission',
                        message: 'Thambioru Tea needs permission to send you order alerts when the app is in the background.',
                        buttonPositive: 'Allow',
                        buttonNegative: 'Deny',
                    }
                );
                const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
                console.log('[FCM] Android 13+ Notification permission status:', hasPermission ? 'GRANTED' : 'DENIED');
                return hasPermission;
            } catch (err) {
                console.warn('[FCM] Android 13+ Notification Permission Error:', err);
                return false;
            }
        }
    }

    try {
        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
            console.log('[FCM] Notification permission granted:', authStatus);
            return true;
        }
        return false;
    } catch (err) {
        console.error('[FCM] Permission request error:', err);
        return false;
    }
};

// Helper: get FCM token
const getFcmToken = async () => {
    try {
        const token = await messaging().getToken();
        console.log('[FCM] Token retrieved successfully:', token);
        return token;
    } catch (err) {
        console.error('[FCM] Error getting token:', err);
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [employee, setEmployee] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [teaCups, setTeaCups] = useState(50);
    const [snacksCount, setSnacksCount] = useState(0);
    const [shiftStartTime, setShiftStartTime] = useState(null);
    const [currentLocation, setCurrentLocation] = useState(null);

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
        // Clean up socket before logging out
        disconnectSocket();
        setIsAuthenticated(false);
        setEmployee(null);
        setIsOnline(false);
        setShiftStartTime(null);
        setCurrentLocation(null);
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

    const updateStatus = async (status) => {
        const online = status === 'online';

        if (online) {
            // Request location permission first
            const hasPermission = await requestLocationPermission();
            if (!hasPermission) {
                Alert.alert('Permission Denied', 'Location permission is required to go online and receive nearby orders.');
                return;
            }

            // Request push notification permissions
            await requestNotificationPermission();

            try {
                // Get current GPS position
                const location = await getCurrentPosition();
                setCurrentLocation(location);

                // Fetch FCM Token
                const fcmToken = await getFcmToken();

                // Emit rider_go_online with location and FCM token
                emitGoOnline(employee, location, fcmToken);

                // Start 5-second location update interval
                startLocationUpdates(getCurrentPosition);

                setIsOnline(true);
                setShiftStartTime(Date.now());
                console.log(`[Auth] Rider went ONLINE at [${location.latitude}, ${location.longitude}] with token [${fcmToken ? 'RETRIEVED' : 'NONE'}]`);
            } catch (error) {
                console.error('Failed to get location:', error);
                Alert.alert('Location Error', 'Could not get your current location. Please make sure GPS is enabled.');
                return;
            }
        } else {
            // Going offline
            emitGoOffline();
            setIsOnline(false);
            setShiftStartTime(null);
            setCurrentLocation(null);
            console.log('[Auth] Rider went OFFLINE');
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
            currentLocation,
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
