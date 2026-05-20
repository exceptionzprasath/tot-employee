import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    SafeAreaView,
    Platform,
    TouchableOpacity,
    Switch,
    FlatList,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';
import { COLORS, SIZES, SHADOWS } from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';
import { getActiveOrders, acceptOrder, updateOrderStatus } from '../../services/orderService';
import { getEmployeeStats } from '../../services/authService';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

const HomeScreen = ({ navigation }) => {
    const {
        employee,
        isOnline,
        updateStatus,
        teaCups,
        snacksCount,
        refillDrum,
        shiftStartTime,
        SHIFT_DURATION
    } = useAuth();
    const [timeLeft, setTimeLeft] = useState('');
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        let timer;
        if (isOnline && shiftStartTime) {
            timer = setInterval(() => {
                const elapsed = Date.now() - shiftStartTime;
                const remaining = Math.max(0, SHIFT_DURATION - elapsed);

                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }, 1000);
        } else {
            setTimeLeft('');
        }
        return () => clearInterval(timer);
    }, [isOnline, shiftStartTime]);

    const loadData = async () => {
        try {
            const [ordersRes, statsRes] = await Promise.all([
                getActiveOrders(),
                getEmployeeStats(employee?.empId),
            ]);

            if (ordersRes.success) setOrders(ordersRes.data);
            if (statsRes.success) setStats(statsRes.stats);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleOnline = (value) => {
        updateStatus(value ? 'online' : 'offline');
        if (!value) {
            Alert.alert('Offline Mode', 'You will not receive new orders while offline.');
        }
    };

    const handleAcceptOrder = async (orderId) => {
        const response = await acceptOrder(orderId);
        if (response.success) {
            Alert.alert('Order Accepted', 'Order has been assigned to you!');
            loadData();
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return COLORS.pending;
            case 'accepted': return COLORS.accepted;
            case 'preparing': return COLORS.preparing;
            case 'on_the_way': return COLORS.onTheWay;
            case 'delivered': return COLORS.delivered;
            default: return COLORS.mediumGray;
        }
    };

    const renderOrderCard = ({ item, index }) => (
        <Animatable.View animation="fadeInUp" delay={index * 100}>
            <TouchableOpacity
                style={styles.orderCard}
                onPress={() => navigation.navigate('OrderDetail', { order: item })}>

                <View style={styles.orderHeader}>
                    <View style={styles.orderIdBadge}>
                        <Text style={styles.orderId}>#{item.id}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {item.status.replace('_', ' ').toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.customerInfo}>
                    <Icon name="person" size={16} color={COLORS.primary} />
                    <Text style={styles.customerName}>{item.customerName}</Text>
                </View>

                <View style={styles.orderDetails}>
                    <View style={styles.detailRow}>
                        <Icon name="location-outline" size={14} color={COLORS.mediumGray} />
                        <Text style={styles.detailText} numberOfLines={1}>
                            {item.customerLocation?.address || 'Address not available'}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Icon name="cart-outline" size={14} color={COLORS.mediumGray} />
                        <Text style={styles.detailText}>
                            {item.items?.length || 0} items • ₹{item.totalAmount}
                        </Text>
                    </View>
                </View>

                <View style={styles.orderFooter}>
                    <View style={styles.distanceInfo}>
                        <Icon name="navigate" size={14} color={COLORS.accent} />
                        <Text style={styles.distanceText}>{item.distance} km</Text>
                        <Text style={styles.timeText}>~{item.estimatedTime} min</Text>
                    </View>

                    {item.status === 'pending' && (
                        <TouchableOpacity
                            style={styles.acceptButton}
                            onPress={() => handleAcceptOrder(item.id)}>
                            <Icon name="checkmark" size={16} color={COLORS.white} />
                            <Text style={styles.acceptText}>Accept</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        </Animatable.View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.darkBg} translucent />

            {/* Header */}
            <View style={[styles.header, { paddingTop: STATUSBAR_HEIGHT + 10 }]}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.greeting}>Welcome back,</Text>
                        <Text style={styles.employeeName}>{employee?.name || 'Employee'}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        {isOnline && timeLeft !== '' && (
                            <Animatable.View
                                animation="pulse"
                                iterationCount="infinite"
                                style={styles.timerBadge}>
                                <Icon name="time-outline" size={12} color={COLORS.online} />
                                <Text style={styles.timerText}>{timeLeft}</Text>
                            </Animatable.View>
                        )}
                        <View style={styles.onlineToggle}>
                            <Text style={[styles.onlineLabel, { color: isOnline ? COLORS.online : COLORS.offline }]}>
                                {isOnline ? 'On' : 'Off'}
                            </Text>
                            <Switch
                                value={isOnline}
                                onValueChange={handleToggleOnline}
                                trackColor={{ false: COLORS.gray, true: COLORS.online + '50' }}
                                thumbColor={isOnline ? COLORS.online : COLORS.mediumGray}
                                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                            />
                        </View>
                    </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Icon name="receipt" size={20} color={COLORS.primary} />
                        <Text style={styles.statValue}>{stats?.todayOrders || 0}</Text>
                        <Text style={styles.statLabel}>Orders</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Icon name="cash" size={20} color={COLORS.secondary} />
                        <Text style={styles.statValue}>₹{stats?.todayEarnings || 0}</Text>
                        <Text style={styles.statLabel}>Earnings</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Icon name="star" size={20} color={COLORS.warning} />
                        <Text style={styles.statValue}>{stats?.rating || '4.8'}</Text>
                        <Text style={styles.statLabel}>Rating</Text>
                    </View>
                </View>
            </View>



            {/* Active Orders */}
            <View style={styles.content}>
                {/* Inventory Bar */}
                <Animatable.View
                    animation="fadeInDown"
                    delay={400}
                    style={styles.inventoryBar}>
                    <TouchableOpacity
                        onLongPress={() => {
                            Alert.alert('Refill Drum', 'Do you want to refill the tea drum to 50 cups?', [
                                { text: 'Cancel' },
                                { text: 'Refill', onPress: refillDrum }
                            ]);
                        }}
                        activeOpacity={0.8}
                        style={styles.barContent}>

                        <View style={styles.inventoryStat}>
                            <View style={[styles.statCircle, { backgroundColor: teaCups > 10 ? COLORS.online : COLORS.error }]}>
                                <Icon name="water" size={16} color={COLORS.white} />
                            </View>
                            <View>
                                <Text style={styles.statValueText}>{teaCups}</Text>
                                <Text style={styles.statLabelText}>Tea Count</Text>
                            </View>
                        </View>

                        <View style={styles.statDividerVertical} />

                        <View style={styles.inventoryStat}>
                            <View style={[styles.statCircle, { backgroundColor: teaCups > 10 ? COLORS.primary : COLORS.error }]}>
                                <Icon name="cafe" size={16} color={COLORS.white} />
                            </View>
                            <View>
                                <Text style={styles.statValueText}>{teaCups}</Text>
                                <Text style={styles.statLabelText}>Tea Cups</Text>
                            </View>
                        </View>

                        <View style={styles.statDividerVertical} />

                        <View style={styles.inventoryStat}>
                            <View style={[styles.statCircle, { backgroundColor: COLORS.secondary }]}>
                                <Icon name="fast-food" size={16} color={COLORS.textPrimary} />
                            </View>
                            <View>
                                <Text style={styles.statValueText}>{snacksCount}</Text>
                                <Text style={styles.statLabelText}>Snacks Count</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Animatable.View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Active Orders</Text>
                    <TouchableOpacity onPress={loadData}>
                        <Icon name="refresh" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={orders}
                    keyExtractor={(item) => item.id}
                    renderItem={renderOrderCard}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.orderList}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Icon name="cafe-outline" size={60} color={COLORS.mediumGray} />
                            <Text style={styles.emptyTitle}>No Active Orders</Text>
                            <Text style={styles.emptyText}>
                                {isOnline ? 'New orders will appear here' : 'Go online to receive orders'}
                            </Text>
                            {!isOnline && (
                                <TouchableOpacity
                                    style={styles.goOnlineButton}
                                    onPress={() => handleToggleOnline(true)}>
                                    <Text style={styles.goOnlineText}>Go Online</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />
            </View>
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
        paddingHorizontal: SIZES.padding,
        paddingBottom: SIZES.padding,
        borderBottomLeftRadius: SIZES.radiusXL,
        borderBottomRightRadius: SIZES.radiusXL,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SIZES.padding,
    },
    greeting: {
        fontSize: SIZES.medium,
        color: 'rgba(255,255,255,0.7)',
    },
    employeeName: {
        fontSize: SIZES.xlarge,
        fontWeight: '700',
        color: COLORS.white,
    },
    inventoryBar: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 12,
        marginBottom: SIZES.padding,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: COLORS.lightGray,
    },
    barContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    inventoryStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        justifyContent: 'center',
    },
    statCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValueText: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.textPrimary,
        lineHeight: 18,
    },
    statLabelText: {
        fontSize: 9,
        fontWeight: '600',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
    },
    statDividerHorizontal: {
        width: '100%',
        height: 1,
        backgroundColor: COLORS.lightGray,
    },
    statDividerVertical: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.lightGray,
    },
    onlineToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    onlineLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    headerRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(251, 192, 45, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(251, 192, 45, 0.3)',
    },
    timerText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.online,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    statsRow: {
        flexDirection: 'row',
        gap: SIZES.paddingS,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: SIZES.radius,
        padding: SIZES.paddingS,
        alignItems: 'center',
    },
    statValue: {
        fontSize: SIZES.large,
        fontWeight: '700',
        color: COLORS.white,
        marginTop: 4,
    },
    statLabel: {
        fontSize: SIZES.xs,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 2,
    },
    content: {
        flex: 1,
        paddingHorizontal: SIZES.padding,
        paddingTop: SIZES.padding,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SIZES.paddingS,
    },
    sectionTitle: {
        fontSize: SIZES.large,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    orderList: {
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SIZES.paddingS,
        paddingVertical: 4,
        borderRadius: SIZES.radius,
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: SIZES.xs,
        fontWeight: '700',
    },
    customerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: SIZES.paddingS,
    },
    customerName: {
        fontSize: SIZES.regular,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    orderDetails: {
        paddingVertical: SIZES.paddingS,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: COLORS.lightGray,
        gap: 6,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: SIZES.small,
        color: COLORS.textSecondary,
        flex: 1,
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SIZES.paddingS,
    },
    distanceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    distanceText: {
        fontSize: SIZES.small,
        fontWeight: '600',
        color: COLORS.accent,
    },
    timeText: {
        fontSize: SIZES.small,
        color: COLORS.textSecondary,
        marginLeft: 8,
    },
    acceptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.accent,
        paddingVertical: SIZES.paddingS,
        paddingHorizontal: SIZES.padding,
        borderRadius: SIZES.radius,
        gap: 4,
    },
    acceptText: {
        fontSize: SIZES.medium,
        fontWeight: '600',
        color: COLORS.white,
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
        marginBottom: SIZES.paddingL,
    },
    goOnlineButton: {
        backgroundColor: COLORS.secondary,
        paddingVertical: SIZES.paddingS,
        paddingHorizontal: SIZES.paddingXL,
        borderRadius: SIZES.radius,
        ...SHADOWS.small,
    },
    goOnlineText: {
        color: COLORS.textPrimary,
        fontWeight: '700',
        fontSize: SIZES.medium,
    },
});

export default HomeScreen;
