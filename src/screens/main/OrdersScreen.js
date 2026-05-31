import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    StatusBar,
    Platform,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid } from 'react-native';
import { getNearbyOrders, getOrderHistory, getActiveOrders } from '../../services/orderService';
import { 
    listenToPlacedOrders,
    listenToEmployeeProgressOrders,
    listenToEmployeeHistoryOrders
} from '../../config/firestore';
import { COLORS, SIZES, SHADOWS } from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';


const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

const OrdersScreen = ({ navigation }) => {
    const { employee } = useAuth();
    const [activeTab, setActiveTab] = useState('active'); // 'active', 'progress', 'history'
    const [activeOrders, setActiveOrders] = useState([]);
    const [progressOrders, setProgressOrders] = useState([]);
    const [historyOrders, setHistoryOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const requestLocationPermission = async () => {
        if (Platform.OS === 'ios') return true;
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            return false;
        }
    };

    useEffect(() => {
        let unsubscribe;
        setLoading(true);

        const empId = employee?.empId || 'EMP001';

        if (activeTab === 'active') {
            // Placed/unassigned orders
            unsubscribe = listenToPlacedOrders(
                (orders) => {
                    setActiveOrders(orders);
                    setLoading(false);
                },
                () => setLoading(false)
            );
        } else if (activeTab === 'progress') {
            // In progress / confirmed orders accepted by this rider
            unsubscribe = listenToEmployeeProgressOrders(
                empId,
                (orders) => {
                    setProgressOrders(orders);
                    setLoading(false);
                },
                () => setLoading(false)
            );
        } else if (activeTab === 'history') {
            // Delivered/history orders completed by this rider
            unsubscribe = listenToEmployeeHistoryOrders(
                empId,
                (orders) => {
                    setHistoryOrders(orders);
                    setLoading(false);
                },
                () => setLoading(false)
            );
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [activeTab, employee]);

    const loadOrders = async () => {
        setLoading(true);
        // Visual refresh triggers tab recalculation (real-time listeners do the actual data syncing)
        setTimeout(() => setLoading(false), 500);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'placed': return '#FF9800'; // Orange
            case 'confirmed': return '#4CAF50'; // Green
            case 'delivered': return '#2196F3'; // Blue
            default: return COLORS.mediumGray;
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderActiveOrder = ({ item, index }) => (
        <Animatable.View animation="fadeInUp" delay={index * 100}>
            <TouchableOpacity
                style={styles.orderCard}
                onPress={() => navigation.navigate('OrderDetail', { order: item })}>

                <View style={styles.orderHeader}>
                    <View style={styles.orderIdBadge}>
                        <Text style={styles.orderId}>#{item.id}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {item.status.replace('_', ' ').toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.orderInfo}>
                    <View style={styles.infoRow}>
                        <Icon name="person-outline" size={14} color={COLORS.mediumGray} />
                        <Text style={styles.infoText}>{item.customerName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Icon name="cart-outline" size={14} color={COLORS.mediumGray} />
                        <Text style={styles.infoText}>{item.items?.length} items</Text>
                        {item.firstTeaFree ? (
                            <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 8, borderWidth: 1, borderColor: '#2E7D3230', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Icon name="gift-outline" size={12} color="#2E7D32" />
                                <Text style={{ color: '#2E7D32', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>FREE TEA</Text>
                            </View>
                        ) : item.paymentMode === 'online' ? (
                            <View style={{ backgroundColor: '#4CAF5020', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 }}>
                                <Text style={{ color: '#4CAF50', fontSize: 10, fontWeight: '700' }}>Received from App</Text>
                            </View>
                        ) : (
                            <View style={{ backgroundColor: '#FF3D0015', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 8, borderWidth: 1, borderColor: '#FF3D0030' }}>
                                <Text style={{ color: '#FF3D00', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>COD</Text>
                            </View>
                        )}
                        <Text style={styles.amountText}>₹{item.totalAmount}</Text>
                    </View>
                </View>

                <View style={styles.orderFooter}>
                    <View style={styles.distanceRow}>
                        <Icon name="navigate" size={14} color={COLORS.accent} />
                        <Text style={styles.distanceText}>{item.distance} km</Text>
                    </View>
                    <Icon name="chevron-forward" size={18} color={COLORS.mediumGray} />
                </View>
            </TouchableOpacity>
        </Animatable.View>
    );

    const renderHistoryOrder = ({ item, index }) => (
        <Animatable.View animation="fadeInUp" delay={index * 100}>
            <View style={styles.historyCard}>
                <View style={styles.historyLeft}>
                    <View style={[
                        styles.historyIcon,
                        { backgroundColor: item.status === 'delivered' ? COLORS.success + '15' : COLORS.error + '15' }
                    ]}>
                        <Icon
                            name={item.status === 'delivered' ? 'checkmark-circle' : 'close-circle'}
                            size={20}
                            color={item.status === 'delivered' ? COLORS.success : COLORS.error}
                        />
                    </View>
                    <View>
                        <Text style={styles.historyId}>#{item.id}</Text>
                        <Text style={styles.historyCustomer}>{item.customerName}</Text>
                        {item.firstTeaFree ? (
                            <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4, marginBottom: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#2E7D3230', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Icon name="gift-outline" size={12} color="#2E7D32" />
                                <Text style={{ color: '#2E7D32', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>FREE TEA</Text>
                            </View>
                        ) : item.paymentMode === 'online' ? (
                            <View style={{ backgroundColor: '#4CAF5020', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, marginBottom: 4, alignSelf: 'flex-start' }}>
                                <Text style={{ color: '#4CAF50', fontSize: 10, fontWeight: '700' }}>Received from App</Text>
                            </View>
                        ) : (
                            <View style={{ backgroundColor: '#FF3D0015', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4, marginBottom: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#FF3D0030' }}>
                                <Text style={{ color: '#FF3D00', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>COD</Text>
                            </View>
                        )}
                        <Text style={styles.historyDate}>{formatDate(item.createdAt)}</Text>
                    </View>
                </View>
                <View style={styles.historyRight}>
                    <Text style={styles.historyAmount}>₹{item.totalAmount}</Text>
                    <Text style={styles.historyEarning}>+₹{item.earnings || Math.round(item.totalAmount * 0.2)}</Text>
                </View>
            </View>
        </Animatable.View>

    );

    const orders = activeTab === 'active' 
        ? activeOrders 
        : activeTab === 'progress' 
        ? progressOrders 
        : historyOrders;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.darkBg} translucent />

            {/* Header */}
            <View style={[styles.header, { paddingTop: STATUSBAR_HEIGHT + 20 }]}>
                <View>
                    <Text style={styles.headerTitle}>My Orders</Text>
                    <Text style={styles.headerSubtitle}>Manage your deliveries</Text>
                </View>
                <TouchableOpacity style={styles.refreshButton} onPress={loadOrders}>
                    <Icon name="refresh" size={20} color={COLORS.white} />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'active' && styles.tabActive]}
                    onPress={() => setActiveTab('active')}>
                    <Icon
                        name="time-outline"
                        size={18}
                        color={activeTab === 'active' ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
                        Active
                    </Text>
                    {activeOrders.length > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{activeOrders.length}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'progress' && styles.tabActive]}
                    onPress={() => setActiveTab('progress')}>
                    <Icon
                        name="play-outline"
                        size={18}
                        color={activeTab === 'progress' ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text style={[styles.tabText, activeTab === 'progress' && styles.tabTextActive]}>
                        In Progress
                    </Text>
                    {progressOrders.length > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{progressOrders.length}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && styles.tabActive]}
                    onPress={() => setActiveTab('history')}>
                    <Icon
                        name="checkmark-done-outline"
                        size={18}
                        color={activeTab === 'history' ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                        History
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Order List */}
            <FlatList
                data={orders}
                keyExtractor={(item) => item.id}
                renderItem={(activeTab === 'active' || activeTab === 'progress') ? renderActiveOrder : renderHistoryOrder}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Icon name="receipt-outline" size={60} color={COLORS.mediumGray} />
                        <Text style={styles.emptyTitle}>
                            {activeTab === 'active' 
                                ? 'No Active Orders' 
                                : activeTab === 'progress' 
                                ? 'No Orders In Progress' 
                                : 'No Order History'}
                        </Text>
                        <Text style={styles.emptyText}>
                            {activeTab === 'active'
                                ? 'Active orders will appear here'
                                : activeTab === 'progress'
                                ? 'Your accepted orders will appear here'
                                : 'Completed orders will appear here'}
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        backgroundColor: COLORS.darkBg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SIZES.padding,
        paddingBottom: SIZES.paddingL,
        borderBottomLeftRadius: SIZES.radiusXL,
        borderBottomRightRadius: SIZES.radiusXL,
    },
    headerTitle: {
        fontSize: SIZES.xxlarge,
        fontWeight: '700',
        color: COLORS.white,
    },
    headerSubtitle: {
        fontSize: SIZES.small,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    refreshButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: SIZES.padding,
        paddingTop: SIZES.padding,
        gap: 12,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SIZES.paddingS,
        borderRadius: SIZES.radius,
        backgroundColor: COLORS.white,
        gap: 6,
        ...SHADOWS.small,
    },
    tabActive: {
        backgroundColor: COLORS.primary + '15',
    },
    tabText: {
        fontSize: SIZES.medium,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    tabTextActive: {
        color: COLORS.primary,
    },
    badge: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.white,
    },
    listContent: {
        padding: SIZES.padding,
        paddingBottom: 100,
    },
    orderCard: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.paddingS,
        ...SHADOWS.small,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SIZES.paddingS,
    },
    orderIdBadge: {
        backgroundColor: COLORS.darkBg,
        paddingHorizontal: SIZES.paddingS,
        paddingVertical: 4,
        borderRadius: SIZES.radius,
    },
    orderId: {
        fontSize: SIZES.small,
        fontWeight: '600',
        color: COLORS.white,
    },
    statusBadge: {
        paddingHorizontal: SIZES.paddingS,
        paddingVertical: 4,
        borderRadius: SIZES.radius,
    },
    statusText: {
        fontSize: SIZES.xs,
        fontWeight: '700',
    },
    orderInfo: {
        paddingVertical: SIZES.paddingS,
        borderBottomWidth: 1,
        borderColor: COLORS.lightGray,
        gap: 6,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    infoText: {
        flex: 1,
        fontSize: SIZES.small,
        color: COLORS.textSecondary,
    },
    amountText: {
        fontSize: SIZES.regular,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SIZES.paddingS,
    },
    distanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    distanceText: {
        fontSize: SIZES.small,
        fontWeight: '600',
        color: COLORS.accent,
    },
    historyCard: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.paddingS,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    historyLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SIZES.paddingS,
    },
    historyIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyId: {
        fontSize: SIZES.medium,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    historyCustomer: {
        fontSize: SIZES.small,
        color: COLORS.textSecondary,
    },
    historyDate: {
        fontSize: SIZES.xs,
        color: COLORS.mediumGray,
    },
    historyRight: {
        alignItems: 'flex-end',
    },
    historyAmount: {
        fontSize: SIZES.regular,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    historyEarning: {
        fontSize: SIZES.small,
        fontWeight: '600',
        color: COLORS.blue,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: SIZES.paddingXL * 2,
    },
    emptyTitle: {
        fontSize: SIZES.large,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginTop: SIZES.padding,
    },
    emptyText: {
        fontSize: SIZES.regular,
        color: COLORS.textSecondary,
        marginTop: SIZES.paddingS,
    },
});

export default OrdersScreen;
