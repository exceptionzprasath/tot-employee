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
    const { employee, totalTeasSold, shiftStartTime } = useAuth();
    const [period, setPeriod] = useState('today');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (employee) {
            loadStats();
        }
    }, [employee]);

    const loadStats = async () => {
        try {
            const empId = employee?.empId || employee?.id;
            if (empId) {
                const response = await getEmployeeStats(empId);
                if (response.success) {
                    setStats(response.stats);
                }
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEarningsData = () => {
        const isPartTime = employee?.employeeType === 'Part Time';
        const teaRate = 2.50;

        if (isPartTime) {
            // Part-time calculations (no hours constraints)
            const todayTeas = totalTeasSold || 0;
            const weekTeas = stats ? (stats.weeklyOrders * 120) : todayTeas;
            const monthTeas = stats ? (stats.monthlyOrders * 120) : todayTeas;

            switch (period) {
                case 'today':
                    return { orders: stats?.todayOrders || 0, earnings: todayTeas * teaRate, credits: todayTeas };
                case 'week':
                    return { orders: stats?.weeklyOrders || 0, earnings: weekTeas * teaRate, credits: weekTeas };
                case 'month':
                    return { orders: stats?.monthlyOrders || 0, earnings: monthTeas * teaRate, credits: monthTeas };
                default:
                    return { orders: 0, earnings: 0, credits: 0 };
            }
        } else {
            // Full-time calculations (fixed salary, ₹250 bonus if 360 cups sold within 6 hours of shift start)
            const todayStr = new Date().toISOString().split('T')[0];
            const todayLog = employee?.workHistory?.[todayStr];
            const todayTeas = todayLog ? parseInt(todayLog.sales || 0, 10) : (totalTeasSold || 0);
            
            let achievedIncentive = false;
            let timeElapsedMs = 0;
            
            if (todayLog && todayLog.offline !== '—') {
                achievedIncentive = todayLog.incentiveEarned === true || (todayLog.sales >= 360 && (todayLog.incentiveAmount || 0) > 0);
                timeElapsedMs = todayLog.durationMs || 0;
            } else if (shiftStartTime) {
                timeElapsedMs = Date.now() - shiftStartTime;
                // Check if sold >= 360 teas and elapsed time <= 6 hours
                if (todayTeas >= 360 && timeElapsedMs > 0 && timeElapsedMs <= 6 * 60 * 60 * 1000) {
                    achievedIncentive = true;
                }
            }

            const todayEarnings = achievedIncentive ? 250 : 0;
            const weekEarnings = stats ? stats.weeklyEarnings : 0;
            const monthEarnings = stats ? stats.monthlyEarnings : 0;

            switch (period) {
                case 'today':
                    return { 
                        orders: stats?.todayOrders || 0, 
                        earnings: todayEarnings, 
                        credits: todayTeas,
                        incentiveDetails: {
                            achieved: achievedIncentive,
                            targetCups: 360,
                            currentCups: todayTeas,
                            hoursElapsed: timeElapsedMs / (1000 * 60 * 60)
                        }
                    };
                case 'week':
                    return { orders: stats?.weeklyOrders || 0, earnings: weekEarnings, credits: stats ? 320 : 0 };
                case 'month':
                    return { orders: stats?.monthlyOrders || 0, earnings: monthEarnings, credits: stats ? 1250 : 0 };
                default:
                    return { orders: 0, earnings: 0, credits: 0 };
            }
        }
    };

    const data = getEarningsData();

    const getRecentTransactions = () => {
        const list = [];
        const isPartTime = employee?.employeeType === 'Part Time';
        
        // Load the workHistory map from employee record
        const workHistory = employee?.workHistory || {};
        
        Object.keys(workHistory)
            .sort((a, b) => new Date(b) - new Date(a)) // Sort newest first
            .slice(0, 5) // Take top 5
            .forEach((dateStr, idx) => {
                const log = workHistory[dateStr];
                const sales = parseInt(log.sales || 0, 10);
                
                if (isPartTime) {
                    list.push({
                        id: String(idx),
                        type: 'delivery',
                        orderId: `${sales} Teas Sold`,
                        amount: sales * 2.50,
                        time: dateStr
                    });
                } else {
                    const hitTarget = sales >= 360;
                    list.push({
                        id: String(idx),
                        type: hitTarget ? 'bonus' : 'delivery',
                        orderId: hitTarget ? `Target Bonus!` : `${sales} Teas Sold`,
                        description: hitTarget ? `Target Bonus (360 Teas!)` : `Shift Completed`,
                        amount: hitTarget ? 250 : 0,
                        time: dateStr
                    });
                }
            });
            
        if (list.length === 0) {
            return [
                {
                    id: 'welcome',
                    type: 'bonus',
                    description: 'Employee Account Activated',
                    amount: 0,
                    time: employee?.dateOfJoining || 'Account Created'
                }
            ];
        }
        
        return list;
    };

    const recentTransactions = getRecentTransactions();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.darkBg} translucent />

            {/* Header */}
            <View style={[styles.header, { paddingTop: STATUSBAR_HEIGHT + 20 }]}>
                <View>
                    <Text style={styles.headerTitle}>Earnings</Text>
                    <Text style={styles.headerSubtitle}>Track your income</Text>
                </View>
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
                    <Text style={styles.earningsLabel}>
                        {employee?.employeeType === 'Full Time' ? 'Target Incentive Bonus' : 'Total Earnings'}
                    </Text>
                    <Text style={styles.earningsAmount}>₹{data.earnings}</Text>
                    <View style={styles.earningsBreakdown}>
                        <View style={styles.breakdownItem}>
                            <Icon name={employee?.employeeType === 'Part Time' ? "trending-up-outline" : "gift-outline"} size={20} color={COLORS.primary} />
                            <Text style={styles.breakdownValue}>
                                {employee?.employeeType === 'Part Time' ? '₹2.50' : (data.earnings > 0 ? '₹250' : '₹0')}
                            </Text>
                            <Text style={styles.breakdownLabel}>
                                {employee?.employeeType === 'Part Time' ? 'Per Tea Rate' : 'Bonus Earned'}
                            </Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.breakdownItem}>
                            <Icon name="cafe-outline" size={20} color={COLORS.error} />
                            <Text style={styles.breakdownValue}>{data.credits}</Text>
                            <Text style={styles.breakdownLabel}>Cups Sold</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.breakdownItem}>
                            <Icon name="receipt-outline" size={20} color={COLORS.accent} />
                            <Text style={styles.breakdownValue}>{data.orders}</Text>
                            <Text style={styles.breakdownLabel}>Orders</Text>
                        </View>
                    </View>

                    {/* Dynamic Full Time Incentive Progress Display */}
                    {employee?.employeeType === 'Full Time' && period === 'today' && (
                        <View style={{ width: '100%', marginTop: 15, padding: 12, backgroundColor: COLORS.primary + '08', borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary + '15' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 4 }}>
                                ⚡ Full-Time Speed Target
                            </Text>
                            <Text style={{ fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 }}>
                                Sell 3 cans (360 cups of tea) within 6 hours of starting your shift to get a special ₹250 cash bonus!
                            </Text>
                            <View style={{ height: 6, backgroundColor: COLORS.gray, borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
                                <View style={{ height: '100%', width: `${Math.min(100, (totalTeasSold / 360) * 100)}%`, backgroundColor: COLORS.primary }} />
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                                <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textPrimary }}>
                                    Progress: {totalTeasSold}/360 cups
                                </Text>
                                <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textPrimary }}>
                                    {data.incentiveDetails?.achieved ? '🎉 Achieved ₹250!' : (shiftStartTime ? `${(data.incentiveDetails?.hoursElapsed || 0).toFixed(1)}h elapsed` : 'Start shift to track')}
                                </Text>
                            </View>
                        </View>
                    )}
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
                        <View style={[styles.statIcon, { backgroundColor: COLORS.error + '15' }]}>
                            <Icon name="cafe-outline" size={20} color={COLORS.error} />
                        </View>
                        <Text style={styles.statValue}>{data.credits}</Text>
                        <Text style={styles.statLabel}>Cups Sold Today</Text>
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
