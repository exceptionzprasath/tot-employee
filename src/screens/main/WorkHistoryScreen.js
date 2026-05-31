import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    SafeAreaView,
    Platform,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES, SHADOWS } from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

const WorkHistoryScreen = ({ navigation }) => {
    const { employee } = useAuth();
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState({});
    
    // Calendar view states
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDateKey, setSelectedDateKey] = useState('');

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-indexed

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Load work history logs on mount & check for context updates
    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                // Fetch direct from AsyncStorage to get the latest offline patches
                const storedHist = await AsyncStorage.getItem('work_history');
                if (storedHist) {
                    const parsed = JSON.parse(storedHist);
                    setHistory(parsed);
                } else if (employee?.workHistory) {
                    setHistory(employee.workHistory);
                }
            } catch (err) {
                console.log('Error loading history in screen:', err);
                if (employee?.workHistory) {
                    setHistory(employee.workHistory);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();

        // Default select today
        const todayStr = new Date().toISOString().split('T')[0];
        setSelectedDateKey(todayStr);
    }, [employee]);

    // Helper: Formats selected date to user-friendly text (e.g. "Sunday, 31 May 2026")
    const getFormattedSelectedDateText = () => {
        if (!selectedDateKey) return '';
        const parts = selectedDateKey.split('-');
        if (parts.length !== 3) return selectedDateKey;
        const dateObj = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
        
        const options = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };
        return dateObj.toLocaleDateString('en-US', options);
    };

    // Helper: Generate date key string from year, month, day (Zero-padded matching UTC split)
    const getDateKey = (yr, mon, dy) => {
        const mm = String(mon + 1).padStart(2, '0');
        const dd = String(dy).padStart(2, '0');
        return `${yr}-${mm}-${dd}`;
    };

    // Generate days grid for 42-day calendar block (dimmed padding for trailing/leading days)
    const generateCalendarCells = () => {
        const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

        const cells = [];

        // 1. Previous month trailing days
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const dayNum = daysInPrevMonth - i;
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            const key = getDateKey(prevYear, prevMonth, dayNum);
            cells.push({
                dayNum,
                isCurrentMonth: false,
                dateKey: key,
                year: prevYear,
                month: prevMonth,
            });
        }

        // 2. Active selected month days
        for (let i = 1; i <= daysInMonth; i++) {
            const key = getDateKey(currentYear, currentMonth, i);
            cells.push({
                dayNum: i,
                isCurrentMonth: true,
                dateKey: key,
                year: currentYear,
                month: currentMonth,
            });
        }

        // 3. Next month leading days (fill up to total 42 grid cells)
        const nextDaysCount = 42 - cells.length;
        for (let i = 1; i <= nextDaysCount; i++) {
            const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
            const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
            const key = getDateKey(nextYear, nextMonth, i);
            cells.push({
                dayNum: i,
                isCurrentMonth: false,
                dateKey: key,
                year: nextYear,
                month: nextMonth,
            });
        }

        return cells;
    };

    const handleMonthChange = (direction) => {
        const newDate = new Date(currentYear, currentMonth + direction, 1);
        setCurrentDate(newDate);
    };

    const selectedDayData = history[selectedDateKey];
    const cells = generateCalendarCells();
    const todayKey = new Date().toISOString().split('T')[0];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.darkBg} translucent />

            {/* Header */}
            <View style={styles.header}>
                <SafeAreaView>
                    <View style={[styles.headerContent, { paddingTop: STATUSBAR_HEIGHT + 10 }]}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}>
                            <Icon name="arrow-back" size={24} color={COLORS.white} />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>Work History</Text>
                            <Text style={styles.headerSubtitle}>Shift logs & tea sales</Text>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* 📅 Premium Custom Calendar Container */}
                <Animatable.View 
                    animation="fadeInUp" 
                    duration={500} 
                    style={styles.calendarCard}
                >
                    {/* Calendar Month Header */}
                    <View style={styles.calendarHeader}>
                        <TouchableOpacity 
                            style={styles.monthNavBtn} 
                            onPress={() => handleMonthChange(-1)}
                        >
                            <Icon name="chevron-back" size={20} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        
                        <Text style={styles.calendarMonthText}>
                            {monthNames[currentMonth]} {currentYear}
                        </Text>
                        
                        <TouchableOpacity 
                            style={styles.monthNavBtn} 
                            onPress={() => handleMonthChange(1)}
                        >
                            <Icon name="chevron-forward" size={20} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {/* Week Days Label Row */}
                    <View style={styles.weekDaysRow}>
                        {weekDays.map((day, idx) => (
                            <Text key={idx} style={styles.weekDayLabel}>
                                {day}
                            </Text>
                        ))}
                    </View>

                    {/* Days Grid */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    ) : (
                        <View style={styles.daysGrid}>
                            {cells.map((cell, idx) => {
                                const hasData = !!history[cell.dateKey];
                                const isSelected = selectedDateKey === cell.dateKey;
                                const isToday = todayKey === cell.dateKey;

                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            styles.dayCell,
                                            isSelected && styles.dayCellSelected,
                                            !cell.isCurrentMonth && styles.dayCellDimmed,
                                            isToday && !isSelected && styles.dayCellToday,
                                        ]}
                                        onPress={() => setSelectedDateKey(cell.dateKey)}
                                    >
                                        <Text style={[
                                            styles.dayText,
                                            isSelected && styles.dayTextSelected,
                                            !cell.isCurrentMonth && styles.dayTextDimmed,
                                            isToday && !isSelected && styles.dayTextToday,
                                        ]}>
                                            {cell.dayNum}
                                        </Text>

                                        {/* Dot Indicator for Active Shift History */}
                                        {hasData && (
                                            <View style={[
                                                styles.historyDot,
                                                isSelected && styles.historyDotSelected
                                            ]} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </Animatable.View>

                {/* 📊 Selected Date Stats Panels */}
                <Animatable.View 
                    animation="fadeInUp" 
                    delay={150} 
                    duration={500} 
                    style={styles.statsContainer}
                >
                    <View style={styles.statsHeaderRow}>
                        <Icon name="calendar-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.statsTitle}>
                            {getFormattedSelectedDateText() || 'Selected Date Stats'}
                        </Text>
                    </View>

                    {selectedDayData ? (
                        <View style={styles.statsGridContainer}>
                            {/* Duration Card */}
                            <View style={styles.statCard}>
                                <View style={[styles.statIconWrapper, { backgroundColor: COLORS.primary + '10' }]}>
                                    <Icon name="hourglass-outline" size={22} color={COLORS.primary} />
                                </View>
                                <Text style={styles.statLabel}>Duration</Text>
                                <Text style={styles.statVal}>{selectedDayData.duration || '0h 0m'}</Text>
                            </View>

                            {/* Cups Sold Card */}
                            <View style={styles.statCard}>
                                <View style={[styles.statIconWrapper, { backgroundColor: COLORS.secondary + '15' }]}>
                                    <Icon name="cafe-outline" size={22} color={COLORS.secondaryDark} />
                                </View>
                                <Text style={styles.statLabel}>Cups Sold</Text>
                                <Text style={styles.statVal}>{selectedDayData.sales || 0} Cups</Text>
                            </View>

                            {/* On-Duty Time Card */}
                            <View style={styles.statCard}>
                                <View style={[styles.statIconWrapper, { backgroundColor: '#1976D210' }]}>
                                    <Icon name="log-in-outline" size={22} color="#1976D2" />
                                </View>
                                <Text style={styles.statLabel}>On Duty</Text>
                                <Text style={styles.statVal}>{selectedDayData.onduty || '—'}</Text>
                            </View>

                            {/* Off-Duty Time Card */}
                            <View style={styles.statCard}>
                                <View style={[styles.statIconWrapper, { backgroundColor: COLORS.offline + '20' }]}>
                                    <Icon name="log-out-outline" size={22} color={COLORS.darkGray} />
                                </View>
                                <Text style={styles.statLabel}>Off Duty</Text>
                                <Text style={styles.statVal}>{selectedDayData.offline || '—'}</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.emptyHistoryCard}>
                            <Icon name="cafe-outline" size={48} color={COLORS.mediumGray} />
                            <Text style={styles.emptyHistoryTitle}>No Shift Log Found</Text>
                            <Text style={styles.emptyHistorySub}>
                                You did not record a shift on this day. Tap days highlighted with dots to review logs.
                            </Text>
                        </View>
                    )}
                </Animatable.View>
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
        paddingBottom: 40,
        borderBottomLeftRadius: SIZES.radiusXL,
        borderBottomRightRadius: SIZES.radiusXL,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SIZES.paddingL,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    headerTitle: {
        fontSize: SIZES.xxlarge,
        fontWeight: '700',
        color: COLORS.white,
    },
    headerSubtitle: {
        fontSize: SIZES.medium,
        color: 'rgba(255,255,255,0.8)',
    },
    scrollContent: {
        paddingHorizontal: SIZES.padding,
        paddingTop: 10,
        paddingBottom: 40,
    },
    calendarCard: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radiusLarge,
        padding: SIZES.padding,
        marginTop: -30,
        ...SHADOWS.medium,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    monthNavBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarMonthText: {
        fontSize: SIZES.regular + 1,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    weekDaysRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    weekDayLabel: {
        width: '13%',
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
    },
    dayCell: {
        width: '13%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        borderRadius: 20,
        position: 'relative',
    },
    dayCellSelected: {
        backgroundColor: COLORS.primary,
    },
    dayCellDimmed: {
        opacity: 0.35,
    },
    dayCellToday: {
        borderWidth: 1.5,
        borderColor: COLORS.primary,
    },
    dayText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    dayTextSelected: {
        color: COLORS.white,
        fontWeight: '700',
    },
    dayTextDimmed: {
        color: COLORS.mediumGray,
    },
    dayTextToday: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    historyDot: {
        position: 'absolute',
        bottom: 4,
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: COLORS.secondaryDark,
    },
    historyDotSelected: {
        backgroundColor: COLORS.white,
    },
    loadingContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsContainer: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radiusLarge,
        padding: SIZES.paddingL,
        marginTop: 16,
        ...SHADOWS.small,
    },
    statsHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
        paddingBottom: 10,
        marginBottom: 16,
    },
    statsTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statsGridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    statCard: {
        width: '47%',
        backgroundColor: COLORS.lightGray,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EEE',
    },
    statIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    statVal: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    emptyHistoryCard: {
        paddingVertical: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyHistoryTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: 10,
    },
    emptyHistorySub: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
        paddingHorizontal: SIZES.padding,
        marginTop: 4,
        lineHeight: 18,
    },
});

export default WorkHistoryScreen;
