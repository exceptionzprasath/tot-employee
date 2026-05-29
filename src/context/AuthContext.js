import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import messaging from '@react-native-firebase/messaging';
import { checkSession } from '../services/authService';
import { API_BASE_URL } from '../config/api';
import {
    emitGoOnline,
    emitGoOffline,
    startLocationUpdates,
    stopLocationUpdates,
    disconnectSocket,
    getSocket,
    initSocket,
} from '../config/socket';
import {
    startShiftNotification,
    updateShiftNotification,
    stopShiftNotification,
} from '../config/notification';

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
        // Subscribe to all_users topic for unified broadcast notifications
        await messaging().subscribeToTopic('all_users');
        console.log('[FCM] Subscribed to topic: all_users');
        return token;
    } catch (err) {
        console.error('[FCM] Error getting token or subscribing to topic:', err);
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [employee, setEmployee] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [teaCups, setTeaCups] = useState(120);
    const [snacksCount, setSnacksCount] = useState(0);
    const [shiftStartTime, setShiftStartTime] = useState(null);
    const [currentLocation, setCurrentLocation] = useState(null);

    // Box & Can Flow States
    const [boxNumber, setBoxNumber] = useState('');
    const [currentCan, setCurrentCan] = useState('');
    const [teasSold, setTeasSold] = useState(0);
    const [totalTeasSold, setTotalTeasSold] = useState(0);
    const [canIndex, setCanIndex] = useState(1);
    const [canRequestStatus, setCanRequestStatus] = useState('none'); // 'none', 'requested', 'prepared'
    const [preparedCanId, setPreparedCanId] = useState(null);
    const [canHistory, setCanHistory] = useState([]);

    const SHIFT_DURATION = 8 * 60 * 60 * 1000; // 8 hours in ms

    const login = (employeeData) => {
        setIsAuthenticated(true);
        setEmployee(employeeData);
        setIsOnline(false); // Default to Off
        setShiftStartTime(null);
        setTeaCups(120);
        setSnacksCount(0);
    };

    const logout = async () => {
        disconnectSocket();
        stopShiftNotification();
        setIsAuthenticated(false);
        setEmployee(null);
        setIsOnline(false);
        setShiftStartTime(null);
        setCurrentLocation(null);
        setBoxNumber('');
        setCurrentCan('');
        setTeasSold(0);
        setTotalTeasSold(0);
        setCanIndex(1);
        setCanRequestStatus('none');
        setPreparedCanId(null);
        setCanHistory([]);

        await AsyncStorage.removeItem('employeeToken');
        await AsyncStorage.removeItem('empId');
        await AsyncStorage.removeItem('locked_box');
        await AsyncStorage.removeItem('locked_box_date');
        await AsyncStorage.removeItem('current_can');
        await AsyncStorage.removeItem('tea_cups');
        await AsyncStorage.removeItem('teas_sold');
        await AsyncStorage.removeItem('total_teas_sold');
        await AsyncStorage.removeItem('can_index');
        await AsyncStorage.removeItem('can_req_status');
        await AsyncStorage.removeItem('prepared_can_id');
        await AsyncStorage.removeItem('can_history');
        await AsyncStorage.removeItem('is_online');
        await AsyncStorage.removeItem('shift_start_time');
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

                        // Load Box Number if locked for today
                        const todayStr = new Date().toISOString().split('T')[0];
                        const savedBox = await AsyncStorage.getItem('locked_box');
                        const savedBoxDate = await AsyncStorage.getItem('locked_box_date');
                        if (savedBox && savedBoxDate === todayStr) {
                            setBoxNumber(savedBox);
                        }

                        // Load active session state
                        const onlineStatus = await AsyncStorage.getItem('is_online');
                        if (onlineStatus === 'true') {
                            setIsOnline(true);
                            const activeCan = await AsyncStorage.getItem('current_can') || '';
                            setCurrentCan(activeCan);
                            const cups = parseInt(await AsyncStorage.getItem('tea_cups') || '120', 10);
                            setTeaCups(cups);
                            const sold = parseInt(await AsyncStorage.getItem('teas_sold') || '0', 10);
                            setTeasSold(sold);
                            const totalSold = parseInt(await AsyncStorage.getItem('total_teas_sold') || '0', 10);
                            setTotalTeasSold(totalSold);
                            const idx = parseInt(await AsyncStorage.getItem('can_index') || '1', 10);
                            setCanIndex(idx);
                            const reqStatus = await AsyncStorage.getItem('can_req_status') || 'none';
                            setCanRequestStatus(reqStatus);
                            const prepCan = await AsyncStorage.getItem('prepared_can_id') || null;
                            setPreparedCanId(prepCan);
                            const histStr = await AsyncStorage.getItem('can_history') || '[]';
                            setCanHistory(JSON.parse(histStr));

                            const startMs = await AsyncStorage.getItem('shift_start_time');
                            if (startMs) {
                                const parsedStart = parseInt(startMs, 10);
                                setShiftStartTime(parsedStart);
                                startShiftNotification(
                                    parsedStart,
                                    SHIFT_DURATION,
                                    savedBox || '',
                                    activeCan,
                                    cups,
                                    sold,
                                    totalSold,
                                    idx
                                );
                            }

                            // Re-connect to live socket and start location tracking
                            const hasLocPerm = await requestLocationPermission();
                            if (hasLocPerm) {
                                try {
                                    const location = await getCurrentPosition();
                                    setCurrentLocation(location);
                                    const fcmToken = await getFcmToken();

                                    emitGoOnline(response.employee, location, fcmToken, {
                                        boxNumber: savedBox || '',
                                        currentCan: activeCan,
                                        teaCups: cups,
                                        teasSold: sold,
                                        totalTeasSold: totalSold,
                                        canIndex: idx,
                                        canRequestStatus: reqStatus,
                                        canHistory: JSON.parse(histStr)
                                    });
                                } catch (locErr) {
                                    console.log('[AuthContext] Session restore geolocation/socket failed:', locErr.message);
                                }
                                startLocationUpdates();
                            } else {
                                console.log('[AuthContext] Location permission not granted on restore, skipping tracking');
                            }
                        }
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

    // Centralized Socket Can Prepared Listener
    useEffect(() => {
        const socket = getSocket() || initSocket();
        if (socket && employee) {
            socket.on('can_prepared', async (data) => {
                if (data.employeeId === employee.empId) {
                    setCanRequestStatus('prepared');
                    setPreparedCanId(data.preparedCanId);
                    await AsyncStorage.setItem('can_req_status', 'prepared');
                    await AsyncStorage.setItem('prepared_can_id', data.preparedCanId);

                    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const updatedHistory = [...canHistory, { time: timeStr, event: `Can ${data.preparedCanId} Prepared by Office` }];
                    setCanHistory(updatedHistory);
                    await AsyncStorage.setItem('can_history', JSON.stringify(updatedHistory));
                }
            });
        }
        return () => {
            if (socket) {
                socket.off('can_prepared');
            }
        };
    }, [employee, canHistory]);

    const updateStatus = async (status, box = '', can = '') => {
        const online = status === 'online';

        if (online) {
            const hasPermission = await requestLocationPermission();
            if (!hasPermission) {
                Alert.alert('Permission Denied', 'Location permission is required to go online.');
                return false;
            }

            await requestNotificationPermission();

            try {
                const location = await getCurrentPosition();
                setCurrentLocation(location);

                const fcmToken = await getFcmToken();

                const todayStr = new Date().toISOString().split('T')[0];
                const finalBox = boxNumber || box;
                const finalCan = currentCan || can;

                setBoxNumber(finalBox);
                setCurrentCan(finalCan);

                const initialHistory = [
                    { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), event: 'Shift Started' },
                    { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), event: `Box ${finalBox} Assigned` },
                    { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), event: `Can ${finalCan} Assigned` }
                ];

                const currentHistory = canHistory.length > 0 ? canHistory : initialHistory;
                setCanHistory(currentHistory);

                await AsyncStorage.setItem('locked_box', finalBox);
                await AsyncStorage.setItem('locked_box_date', todayStr);
                await AsyncStorage.setItem('current_can', finalCan);
                await AsyncStorage.setItem('can_history', JSON.stringify(currentHistory));
                await AsyncStorage.setItem('is_online', 'true');
                
                const startMs = Date.now();
                setShiftStartTime(startMs);
                await AsyncStorage.setItem('shift_start_time', String(startMs));

                // Reset daily states
                setTeaCups(120);
                setTeasSold(0);
                setTotalTeasSold(0);
                setCanIndex(1);
                setCanRequestStatus('none');
                setPreparedCanId(null);

                await AsyncStorage.setItem('tea_cups', '120');
                await AsyncStorage.setItem('teas_sold', '0');
                await AsyncStorage.setItem('total_teas_sold', '0');
                await AsyncStorage.setItem('can_index', '1');
                await AsyncStorage.setItem('can_req_status', 'none');
                await AsyncStorage.removeItem('prepared_can_id');

                emitGoOnline(employee, location, fcmToken, {
                    boxNumber: finalBox,
                    currentCan: finalCan,
                    teaCups: 120,
                    teasSold: 0,
                    totalTeasSold: 0,
                    canIndex: 1,
                    canRequestStatus: 'none',
                    canHistory: currentHistory
                });

                startShiftNotification(
                    startMs,
                    SHIFT_DURATION,
                    finalBox,
                    finalCan,
                    120,
                    0,
                    0,
                    1
                );
                startLocationUpdates();
                setIsOnline(true);
                return true;
            } catch (error) {
                console.error('Failed to go online:', error);
                Alert.alert('Online Error', 'Failed to connect. Please try again.');
                return false;
            }
        } else {
            emitGoOffline();
            stopShiftNotification();
            setIsOnline(false);
            setShiftStartTime(null);
            setCurrentLocation(null);

            await AsyncStorage.setItem('is_online', 'false');
            await AsyncStorage.removeItem('shift_start_time');
            return true;
        }
    };

    const updateInventory = async (teas, snacks = 0) => {
        const newTeaCups = Math.max(0, teaCups - teas);
        const newTeasSold = teasSold + teas;
        const newTotalTeasSold = totalTeasSold + teas;

        setTeaCups(newTeaCups);
        setTeasSold(newTeasSold);
        setTotalTeasSold(newTotalTeasSold);
        setSnacksCount(prev => prev + snacks);

        await AsyncStorage.setItem('tea_cups', String(newTeaCups));
        await AsyncStorage.setItem('teas_sold', String(newTeasSold));
        await AsyncStorage.setItem('total_teas_sold', String(newTotalTeasSold));

        updateShiftNotification(
            boxNumber,
            currentCan,
            newTeaCups,
            newTeasSold,
            newTotalTeasSold,
            canIndex,
            shiftStartTime,
            SHIFT_DURATION
        );
    };

    const requestNextCanFromOffice = async (eta) => {
        try {
            const phone = employee?.phone || employee?.mobile;
            const response = await fetch(`${API_BASE_URL}/api/admin/employees/${phone}/can-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eta })
            });
            const data = await response.json();
            if (data.success) {
                setCanRequestStatus('requested');
                await AsyncStorage.setItem('can_req_status', 'requested');

                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const updatedHistory = [...canHistory, { time: timeStr, event: 'Requested New Can!' }];
                setCanHistory(updatedHistory);
                await AsyncStorage.setItem('can_history', JSON.stringify(updatedHistory));

                return true;
            }
            return false;
        } catch (err) {
            console.error('Request next can error:', err);
            return false;
        }
    };

    const swapCanAtOffice = async (newCanId) => {
        try {
            const phone = employee?.phone || employee?.mobile;
            const response = await fetch(`${API_BASE_URL}/api/admin/employees/${phone}/can-received`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scannedCanId: newCanId })
            });
            const data = await response.json();
            if (data.success) {
                setCurrentCan(newCanId);
                setTeaCups(120);
                setTeasSold(0);
                const nextIdx = canIndex + 1;
                setCanIndex(nextIdx);
                setCanRequestStatus('none');
                setPreparedCanId(null);

                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const updatedHistory = [...canHistory, { time: timeStr, event: `Can ${newCanId} Assigned` }];
                setCanHistory(updatedHistory);

                await AsyncStorage.setItem('current_can', newCanId);
                await AsyncStorage.setItem('tea_cups', '120');
                await AsyncStorage.setItem('teas_sold', '0');
                await AsyncStorage.setItem('can_index', String(nextIdx));
                await AsyncStorage.setItem('can_req_status', 'none');
                await AsyncStorage.removeItem('prepared_can_id');
                await AsyncStorage.setItem('can_history', JSON.stringify(updatedHistory));

                updateShiftNotification(
                    boxNumber,
                    newCanId,
                    120,
                    0,
                    totalTeasSold,
                    nextIdx,
                    shiftStartTime,
                    SHIFT_DURATION
                );

                return { success: true };
            } else {
                return { success: false, message: data.message || 'Can validation failed.' };
            }
        } catch (err) {
            console.error('Can swap error:', err);
            return { success: false, message: 'Server connection failed.' };
        }
    };

    const refillDrum = () => {
        // Refill is now swapped dynamically, but we keep this as placeholder capacity reset
        setTeaCups(120);
    };

    useEffect(() => {
        let interval;
        if (isOnline && shiftStartTime) {
            interval = setInterval(() => {
                const elapsed = Date.now() - shiftStartTime;
                if (elapsed >= SHIFT_DURATION) {
                    updateStatus('offline');
                    Alert.alert('Shift Completed', 'Your 8-hour shift has been completed for today.');
                }
            }, 5000);
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
            boxNumber,
            currentCan,
            teasSold,
            totalTeasSold,
            canIndex,
            canRequestStatus,
            preparedCanId,
            canHistory,
            login,
            logout,
            updateStatus,
            updateInventory,
            refillDrum,
            requestNextCanFromOffice,
            swapCanAtOffice,
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
