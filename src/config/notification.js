import { NativeModules, Platform } from 'react-native';

const { ShiftNotification } = NativeModules;

/**
 * Native Bridge for Ongoing Status Bar Notifications (Chronometer + Progress Bar)
 */
export const startShiftNotification = (
    startTimeMs, 
    durationMs, 
    boxNumber = '', 
    currentCan = '', 
    teaCups = 120, 
    teasSold = 0, 
    totalTeasSold = 0, 
    canIndex = 1
) => {
    if (Platform.OS !== 'android') return;
    if (!ShiftNotification) {
        console.warn('[ShiftNotification] Native module is not registered.');
        return;
    }
    
    try {
        ShiftNotification.showShiftNotification(
            startTimeMs,
            durationMs,
            boxNumber,
            currentCan,
            teaCups,
            teasSold,
            totalTeasSold,
            canIndex
        );
        console.log('[Notification] Native shift notification started.');
    } catch (err) {
        console.error('[Notification] Error showing active notification:', err);
    }
};

export const updateShiftNotification = (
    boxNumber = '', 
    currentCan = '', 
    teaCups = 120, 
    teasSold = 0, 
    totalTeasSold = 0, 
    canIndex = 1,
    startTimeMs,
    durationMs
) => {
    if (Platform.OS !== 'android') return;
    if (!ShiftNotification) return;

    try {
        ShiftNotification.updateShiftNotification(
            boxNumber,
            currentCan,
            teaCups,
            teasSold,
            totalTeasSold,
            canIndex,
            startTimeMs,
            durationMs
        );
        console.log('[Notification] Native shift notification updated.');
    } catch (err) {
        console.error('[Notification] Error updating active notification:', err);
    }
};

export const stopShiftNotification = () => {
    if (Platform.OS !== 'android') return;
    if (!ShiftNotification) return;

    try {
        ShiftNotification.dismissShiftNotification();
        console.log('[Notification] Native shift notification dismissed.');
    } catch (err) {
        console.error('[Notification] Error dismissing active notification:', err);
    }
};
