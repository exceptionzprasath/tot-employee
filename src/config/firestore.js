import firestore from '@react-native-firebase/firestore';

export const ordersCollection = () => firestore().collection('tot_orders');

/**
 * Listen to all 'placed' orders in realtime.
 * Returns an unsubscribe function.
 */
export const listenToPlacedOrders = (onOrders, onError) => {
    return ordersCollection()
        .where('status', '==', 'placed')
        .onSnapshot(
            snapshot => {
                const orders = snapshot.docs.map(doc => doc.data());
                onOrders(orders);
            },
            error => {
                console.error('Firestore listenToPlacedOrders error:', error);
                if (onError) onError(error);
            }
        );
};

/**
 * Listen to a specific order by ID in realtime.
 * Returns an unsubscribe function.
 */
export const listenToOrder = (orderId, onOrder, onError) => {
    return ordersCollection()
        .doc(orderId)
        .onSnapshot(
            doc => {
                if (doc.exists) {
                    onOrder(doc.data());
                }
            },
            error => {
                console.error('Firestore listenToOrder error:', error);
                if (onError) onError(error);
            }
        );
};

/**
 * Listen to a customer's orders in realtime.
 * Returns an unsubscribe function.
 */
export const listenToCustomerOrders = (customerPhone, onOrders, onError) => {
    return ordersCollection()
        .where('customerPhone', '==', customerPhone)
        .onSnapshot(
            snapshot => {
                const orders = snapshot.docs
                    .map(doc => doc.data())
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                onOrders(orders);
            },
            error => {
                console.error('Firestore listenToCustomerOrders error:', error);
                if (onError) onError(error);
            }
        );
};
