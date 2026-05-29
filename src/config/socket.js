import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

let socket = null;
let locationInterval = null;

/**
 * Initialize socket and connect as a rider.
 * Called when employee goes online.
 */
export const initSocket = () => {
    if (!socket) {
        socket = io(API_BASE_URL, {
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            extraHeaders: {
                'ngrok-skip-browser-warning': 'true',
            },
        });

        socket.on('connect', () => {
            console.log('[Socket] Connected:', socket.id);
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
 * Start sending location updates every 5 seconds.
 */
export const startLocationUpdates = (getLocation) => {
    stopLocationUpdates(); // Clear any existing interval

    locationInterval = setInterval(async () => {
        try {
            const position = await getLocation();
            if (socket && socket.connected && position) {
                socket.emit('rider_update_location', {
                    lat: position.latitude,
                    lng: position.longitude,
                });
            }
        } catch (err) {
            console.log('[Socket] Location update error:', err.message);
        }
    }, 5000); // Every 5 seconds

    console.log('[Socket] Started 5-second location updates');
};

/**
 * Stop location update interval.
 */
export const stopLocationUpdates = () => {
    if (locationInterval) {
        clearInterval(locationInterval);
        locationInterval = null;
        console.log('[Socket] Stopped location updates');
    }
};

/**
 * Emit rider_go_offline.
 */
export const emitGoOffline = () => {
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
    stopLocationUpdates();
    if (socket) {
        socket.emit('rider_go_offline');
        socket.disconnect();
        socket = null;
        console.log('[Socket] Disconnected and cleaned up');
    }
};

/**
 * Get the socket instance (for adding event listeners).
 */
export const getSocket = () => {
    return socket;
};
