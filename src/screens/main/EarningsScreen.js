import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    Platform,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';
import { COLORS, SIZES, SHADOWS } from '../../utils/colors';
import { getEmployeeStats } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

const EarningsScreen = ({ navigation }) => {
    const { employee } = useAuth();
    const [period, setPeriod] = useState('today');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const response = await getEmployeeStats();
            if (response.success) {
                setStats(response.stats);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEarningsData = () => {
        if (!stats) return { orders: 0, earnings: 0, credits: 0 };

        switch (period) {
            case 'today':
                return { orders: stats.todayOrders, earnings: stats.todayEarnings, credits: 45 };
            case 'week':
                return { orders: stats.weeklyOrders, earnings: stats.weeklyEarnings, credits: 320 };
            case 'month':
                return { orders: stats.monthlyOrders, earnings: stats.monthlyEarnings, credits: 1250 };
            default:
                return { orders: 0, earnings: 0, credits: 0 };
        }
    };

    const data = getEarningsData();

    const recentTransactions = [
        { id: 1, type: 'delivery', orderId: 'ORD004', amount: 15, time: '2 hours ago' },
        { id: 2, type: 'delivery', orderId: 'ORD003', amount: 22, time: '4 hours ago' },
        { id: 3, type: 'credit', orderId: 'ORD003', amount: 10, time: '4 hours ago' },
        { id: 4, type: 'bonus', description: 'Peak hour bonus', amount: 50, time: 'Yesterday' },
        { id: 5, type: 'delivery', orderId: 'ORD002', amount: 18, time: 'Yesterday' },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.darkBg} translucent />

            {/* Header */}
            <View style={[styles.header, { paddingTop: STATUSBAR_HEIGHT + 20 }]}>
                <View>
                    <Text style={styles.headerTitle}>Earnings</Text>
                    <Text style={styles.headerSubtitle}>Track your income</Text>
                </View>
                <TouchableOpacity style={styles.withdrawButton}>
                    <Icon name="wallet-outline" size={18} color={COLORS.white} />
                    <Text style={styles.withdrawText}>Withdraw</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Period Selector */}
                <View style={styles.periodSelector}>
                    {['today', 'week', 'month'].map((p) => (
                        <TouchableOpacity
                            key={p}
                            style={[styles.periodButton, period === p && styles.periodButtonActive]}
                            onPress={() => setPeriod(p)}>
                            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Earnings Card */}
                <Animatable.View animation="fadeInUp" style={styles.earningsCard}>
                    <Text style={styles.earningsLabel}>Total Earnings</Text>
                    <Text style={styles.earningsAmount}>₹{data.earnings}</Text>
                    <View style={styles.earningsBreakdown}>
                        <View style={styles.breakdownItem}>
                            <Icon name="bicycle-outline" size={20} color={COLORS.primary} />
                            <Text style={styles.breakdownValue}>₹{data.earnings - data.credits}</Text>
                            <Text style={styles.breakdownLabel}>Deliveries</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.breakdownItem}>
                            <Icon name="cafe-outline" size={20} color={COLORS.error} />
                            <Text style={styles.breakdownValue}>{data.credits}</Text>
                            <Text style={styles.breakdownLabel}>Credits</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.breakdownItem}>
                            <Icon name="receipt-outline" size={20} color={COLORS.accent} />
                            <Text style={styles.breakdownValue}>{data.orders}</Text>
                            <Text style={styles.breakdownLabel}>Orders</Text>
                        </View>
                    </View>
                </Animatable.View>

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <Animatable.View animation="fadeInUp" delay={100} style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: COLORS.success + '15' }]}>
                            <Icon name="trending-up" size={20} color={COLORS.success} />
                        </View>
                        <Text style={styles.statValue}>₹{Math.round(data.earnings / (data.orders || 1))}</Text>
                        <Text style={styles.statLabel}>Avg per Order</Text>
                    </Animatable.View>
                    <Animatable.View animation="fadeInUp" delay={200} style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: COLORS.warning + '15' }]}>
                            <Icon name="star" size={20} color={COLORS.warning} />
                        </View>
                        <Text style={styles.statValue}>{stats?.rating || '4.8'}</Text>
                        <Text style={styles.statLabel}>Rating</Text>
                    </Animatable.View>
                </View>

                {/* Recent Transactions */}
                <Animatable.View animation="fadeInUp" delay={300} style={styles.transactionsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Transactions</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    {recentTransactions.map((transaction) => (
                        <View key={transaction.id} style={styles.transactionItem}>
                            <View style={[
                                styles.transactionIcon,
                                {
                                    backgroundColor:
                                        transaction.type === 'delivery' ? COLORS.primary + '15' :
                                            transaction.type === 'credit' ? COLORS.error + '15' : COLORS.secondary + '15'
                                }
                            ]}>
                                <Icon
                                    name={
                                        transaction.type === 'delivery' ? 'bicycle' :
                                            transaction.type === 'credit' ? 'cafe' : 'gift'
                                    }
                                    size={18}
                                    color={
                                        transaction.type === 'delivery' ? COLORS.primary :
                                            transaction.type === 'credit' ? COLORS.error : COLORS.secondary
                                    }
                                />
                            </View>
                            <View style={styles.transactionInfo}>
                                <Text style={styles.transactionTitle}>
                                    {transaction.type === 'delivery' ? `Order #${transaction.orderId}` :
                                        transaction.type === 'credit' ? `Credit from #${transaction.orderId}` :
                                            transaction.description}
                                </Text>
                                <Text style={styles.transactionTime}>{transaction.time}</Text>
                            </View>
                            <Text style={styles.transactionAmount}>
                                {transaction.type === 'credit' ? '' : '+₹'}{transaction.amount}
                            </Text>
                        </View>
                    ))}
                </Animatable.View>

                <View style={{ height: 100 }} />
            </ScrollView>
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
    withdrawButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.accent,
        paddingVertical: SIZES.paddingS,
        paddingHorizontal: SIZES.padding,
        borderRadius: SIZES.radius,
        gap: 6,
    },
    withdrawText: {
        fontSize: SIZES.medium,
        fontWeight: '600',
        color: COLORS.white,
    },
    periodSelector: {
        flexDirection: 'row',
        paddingHorizontal: SIZES.padding,
        paddingVertical: SIZES.padding,
        gap: 8,
    },
    periodButton: {
        flex: 1,
        paddingVertical: SIZES.paddingS,
        alignItems: 'center',
        borderRadius: SIZES.radius,
        backgroundColor: COLORS.white,
        ...SHADOWS.small,
    },
    periodButtonActive: {
        backgroundColor: COLORS.primary,
    },
    periodText: {
        fontSize: SIZES.medium,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    periodTextActive: {
        color: COLORS.white,
    },
    earningsCard: {
        backgroundColor: COLORS.white,
        marginHorizontal: SIZES.padding,
        borderRadius: SIZES.radiusLarge,
        padding: SIZES.paddingL,
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    earningsLabel: {
        fontSize: SIZES.regular,
        color: COLORS.textSecondary,
    },
    earningsAmount: {
        fontSize: 48,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginVertical: SIZES.paddingS,
    },
    earningsBreakdown: {
        flexDirection: 'row',
        width: '100%',
        paddingTop: SIZES.padding,
        borderTopWidth: 1,
        borderColor: COLORS.lightGray,
        marginTop: SIZES.padding,
    },
    breakdownItem: {
        flex: 1,
        alignItems: 'center',
    },
    breakdownValue: {
        fontSize: SIZES.large,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: 4,
    },
    breakdownLabel: {
        fontSize: SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    divider: {
        width: 1,
        height: '100%',
        backgroundColor: COLORS.lightGray,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: SIZES.padding,
        paddingTop: SIZES.padding,
        gap: SIZES.paddingS,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        alignItems: 'center',
        ...SHADOWS.small,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        fontSize: SIZES.xlarge,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: 8,
    },
    statLabel: {
        fontSize: SIZES.small,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    transactionsSection: {
        backgroundColor: COLORS.white,
        marginHorizontal: SIZES.padding,
        marginTop: SIZES.padding,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        ...SHADOWS.small,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SIZES.paddingS,
    },
    sectionTitle: {
        fontSize: SIZES.regular,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    seeAll: {
        fontSize: SIZES.small,
        color: COLORS.primary,
        fontWeight: '600',
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SIZES.paddingS,
        borderBottomWidth: 1,
        borderColor: COLORS.lightGray,
    },
    transactionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SIZES.paddingS,
    },
    transactionInfo: {
        flex: 1,
    },
    transactionTitle: {
        fontSize: SIZES.regular,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    transactionTime: {
        fontSize: SIZES.xs,
        color: COLORS.mediumGray,
    },
    transactionAmount: {
        fontSize: SIZES.regular,
        fontWeight: '600',
        color: COLORS.blue,
    },
});

export default EarningsScreen;
