import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';
import Geolocation from 'react-native-geolocation-service';

let socket = null;
let watchId = null;
let activeRiderPayload = null; // Store active credentials for automatic reconnect registration

/**
 * Initialize socket and connect as a rider.
 */
export const initSocket = () => {
    if (!socket) {
        socket = io(API_BASE_URL, {
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 2000,
            extraHeaders: {
                'ngrok-skip-browser-warning': 'true',
            },
        });

        socket.on('connect', async () => {
            console.log('[Socket] Connected:', socket.id);
            // Automatic re-registration of rider status on reconnect
            if (activeRiderPayload) {
                console.log('[Socket] Auto re-registering online rider on reconnect...');
                try {
                    const payload = {
                        employeeId: activeRiderPayload.employeeData.empId,
                        employeeName: activeRiderPayload.employeeData.name,
                        employeePhone: activeRiderPayload.employeeData.phone || activeRiderPayload.employeeData.mobile,
                        lat: activeRiderPayload.lastLat || activeRiderPayload.location.latitude,
                        lng: activeRiderPayload.lastLng || activeRiderPayload.location.longitude,
                        fcmToken: activeRiderPayload.fcmToken || null,
                        ...activeRiderPayload.extraData
                    };
                    socket.emit('rider_go_online', payload);
                    console.log('[Socket] Re-emitted rider_go_online successfully');
                } catch (err) {
                    console.log('[Socket] Auto re-registration failed:', err.message);
                }
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        socket.on('connect_error', (err) => {
            console.log('[Socket] Connection error:', err.message);
        });
    }
    return socket;
};

export const emitGoOnline = (employeeData, location, fcmToken, extraData = {}) => {
    // Store credentials so we can auto-register on reconnect
    activeRiderPayload = {
        employeeData,
        location,
        fcmToken,
        extraData,
        lastLat: location.latitude,
        lastLng: location.longitude,
    };

    const s = initSocket();
    const payload = {
        employeeId: employeeData.empId,
        employeeName: employeeData.name,
        employeePhone: employeeData.phone || employeeData.mobile,
        lat: location.latitude,
        lng: location.longitude,
        fcmToken: fcmToken || null,
        ...extraData
    };

    if (s.connected) {
        s.emit('rider_go_online', payload);
        console.log('[Socket] Emitted rider_go_online immediately (already connected)');
    } else {
        console.log('[Socket] Waiting for connection before emitting rider_go_online...');
        s.once('connect', () => {
            s.emit('rider_go_online', payload);
            console.log('[Socket] Emitted rider_go_online after connect');
        });
    }
};

/**
 * Start continuous GPS tracking using Geolocation.watchPosition.
 * This uses the native GPS watcher which provides continuous updates
 * and works while the app is in foreground. Combined with the ongoing
 * ShiftNotification, the process stays alive in recent tasks.
 */
export const startLocationUpdates = () => {
    stopLocationUpdates(); // Clear any existing watcher

    watchId = Geolocation.watchPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            // Update cached position for reconnect
            if (activeRiderPayload) {
                activeRiderPayload.lastLat = lat;
                activeRiderPayload.lastLng = lng;
            }

            if (socket) {
                if (!socket.connected) {
                    console.log('[Location] Socket disconnected, reconnecting...');
                    socket.connect();
                } else {
                    socket.emit('rider_update_location', { lat, lng });
                    console.log('[Location] Live position emitted:', lat, lng);
                }
            }
        },
        (error) => {
            console.log('[Location] watchPosition error:', error.message);
        },
        {
            enableHighAccuracy: true,
            distanceFilter: 5,       // Update every 5 meters of movement
            interval: 5000,          // Android: minimum interval 5 seconds
            fastestInterval: 3000,   // Android: fastest interval 3 seconds
            showsBackgroundLocationIndicator: true,
        }
    );

    console.log('[Location] Started continuous GPS tracking (watchId:', watchId, ')');
};

/**
 * Stop GPS tracking.
 */
export const stopLocationUpdates = () => {
    if (watchId !== null) {
        Geolocation.clearWatch(watchId);
        watchId = null;
        console.log('[Location] Stopped GPS tracking');
    }
};

/**
 * Emit rider_go_offline.
 */
export const emitGoOffline = () => {
    activeRiderPayload = null;
    if (socket) {
        socket.emit('rider_go_offline');
        console.log('[Socket] Emitted rider_go_offline');
    }
    stopLocationUpdates();
};

/**
 * Fully disconnect the socket.
 */
export const disconnectSocket = () => {
    activeRiderPayload = null;
    stopLocationUpdates();
    if (socket) {
        socket.emit('rider_go_offline');
        socket.disconnect();
        socket = null;
        console.log('[Socket] Disconnected and cleaned up');
    }
};

/**
 * Get the socket instance.
 */
export const getSocket = () => {
    return socket;
};
