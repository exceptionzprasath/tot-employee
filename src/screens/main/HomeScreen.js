import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    Platform,
    TouchableOpacity,
    Switch,
    FlatList,
    Alert,
    Modal,
    TextInput,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';
import { COLORS, SIZES, SHADOWS } from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';
import { acceptOrder } from '../../services/orderService';
import { listenToPlacedOrders } from '../../config/firestore';
import { getSocket, initSocket } from '../../config/socket';

const { width } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

const HomeScreen = ({ navigation }) => {
    const {
        employee,
        isOnline,
        updateStatus,
        teaCups,
        snacksCount,
        boxNumber,
        currentCan,
        teasSold,
        totalTeasSold,
        canIndex,
        canRequestStatus,
        preparedCanId,
        canHistory,
        requestNextCanFromOffice,
        swapCanAtOffice,
        shiftStartTime,
        SHIFT_DURATION
    } = useAuth();

    const [timeLeft, setTimeLeft] = useState('');
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Online Modals & Forms
    const [showOnlineModal, setShowOnlineModal] = useState(false);
    const [inputBox, setInputBox] = useState('');
    const [inputCan, setInputCan] = useState('');

    // Low Tea / Swap Cans Flow states
    const [showLowTeaModal, setShowLowTeaModal] = useState(false);
    const [etaOptions] = useState(['5 mins', '10 mins', '15 mins', '20 mins']);
    const [selectedEta, setSelectedEta] = useState('10 mins');
    const [showSwapModal, setShowSwapModal] = useState(false);
    const [scannedCanCode, setScannedCanCode] = useState('');

    useEffect(() => {
        // Firestore real-time listener for placed orders
        const unsubscribe = listenToPlacedOrders(
            (placedOrders) => {
                setOrders(placedOrders);
                setLoading(false);
            },
            (error) => {
                console.error('Firestore listener error:', error);
                setLoading(false);
            }
        );

        // Socket.io real-time listeners for dispatch
        const socket = getSocket() || initSocket();
        if (socket) {
            socket.on('new_order', (data) => {
                setOrders(prev => {
                    const exists = prev.find(o => o.id === data.order.id);
                    if (exists) return prev;
                    return [data.order, ...prev];
                });
            });

            socket.on('order_accepted', (data) => {
                setOrders(prev => prev.filter(o => o.id !== data.orderId));
            });

            socket.on('order_expired', (data) => {
                setOrders(prev => prev.filter(o => o.id !== data.orderId));
            });
        }

        return () => {
            unsubscribe();
            if (socket) {
                socket.off('new_order');
                socket.off('order_accepted');
                socket.off('order_expired');
            }
        };
    }, []);

    // ⏰ 30-Second Ticking Timer for Placed Orders
    useEffect(() => {
        const orderTimer = setInterval(() => {
            const now = Date.now();
            const valid = orders.filter(o => {
                const age = now - new Date(o.createdAt).getTime();
                return age <= 30000 && (o.status === 'placed' || o.status === 'pending');
            });
            setFilteredOrders(valid);
        }, 1000);
        return () => clearInterval(orderTimer);
    }, [orders]);

    // Shift Countdown Timer (Ticking down to 3:00 PM / 8 hour duration)
    useEffect(() => {
        let timer;
        if (isOnline && shiftStartTime) {
            timer = setInterval(() => {
                const elapsed = Date.now() - shiftStartTime;
                const remaining = Math.max(0, SHIFT_DURATION - elapsed);

                if (remaining === 0) {
                    setTimeLeft('00:00:00');
                    clearInterval(timer);
                    return;
                }

                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

                const format = (num) => String(num).padStart(2, '0');
                setTimeLeft(`${format(hours)}:${format(minutes)}:${format(seconds)}`);
            }, 1000);
        } else {
            setTimeLeft('');
        }
        return () => clearInterval(timer);
    }, [isOnline, shiftStartTime]);

    // Monitor low tea to trigger warning overlay
    useEffect(() => {
        if (isOnline && teaCups <= 10 && canRequestStatus === 'none') {
            setShowLowTeaModal(true);
        }
    }, [teaCups, isOnline, canRequestStatus]);

    const handleToggleOnline = (value) => {
        if (value) {
            // Show prompt to set Box and Can number
            setInputBox(boxNumber); // Box stays same per day
            setInputCan('');
            setShowOnlineModal(true);
        } else {
            Alert.alert('Go Offline', 'Are you sure you want to go offline?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Offline', onPress: () => updateStatus('offline') }
            ]);
        }
    };

    const handleConfirmOnline = async () => {
        if (!inputBox.trim() || !inputCan.trim()) {
            Alert.alert('Required Fields', 'Please enter Box Number and Can Number.');
            return;
        }

        setShowOnlineModal(false);
        const success = await updateStatus('online', inputBox.trim(), inputCan.trim());
        if (success) {
            Alert.alert('Online', 'Shift started successfully! Happy selling ☕');
        }
    };

    const handleRequestCan = async () => {
        setShowLowTeaModal(false);
        const success = await requestNextCanFromOffice(selectedEta);
        if (success) {
            Alert.alert('Request Sent', `Office notified. ETA to office is set to ${selectedEta}.`);
        } else {
            Alert.alert('Error', 'Failed to contact office. Please try again.');
        }
    };

    const handleReachedOffice = () => {
        if (canRequestStatus === 'prepared') {
            setScannedCanCode('');
            setShowSwapModal(true);
        } else {
            Alert.alert('Please Wait', 'The office is still preparing your next Can. You will be notified once ready.');
        }
    };

    const handleSwapCan = async () => {
        if (!scannedCanCode.trim()) {
            Alert.alert('Required', 'Please enter the next Can Serial Number.');
            return;
        }

        const result = await swapCanAtOffice(scannedCanCode.trim());
        if (result.success) {
            setShowSwapModal(false);
            Alert.alert('Success', `Can ${scannedCanCode.trim()} added successfully! Inventory reset to 120.`);
        } else {
            Alert.alert('Error', result.message || 'Can serial number does not match prepared Can.');
        }
    };

    const handleAcceptOrder = async (orderId) => {
        const response = await acceptOrder(orderId, {
            employeeId: employee?.empId,
            employeeName: employee?.name,
            employeePhone: employee?.phone || employee?.mobile,
            employeeAvatar: employee?.selfieUrl || null,
        });

        if (response.success) {
            Alert.alert('Order Accepted', 'Order assigned successfully!');
            // Extract the updated order object from the backend response or local state
            const acceptedOrderObj = response.data || orders.find(o => o.id === orderId);
            if (acceptedOrderObj) {
                navigation.navigate('OrderDetail', { order: acceptedOrderObj });
            } else {
                navigation.navigate('Orders');
            }
        } else if (response.message?.includes('already')) {
            Alert.alert('Too Late!', 'This order was already accepted by another rider.');
            setOrders(prev => prev.filter(o => o.id !== orderId));
        }
    };

    const renderOrderCard = ({ item }) => {
        const remainingTime = Math.max(0, 30 - Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 1000));

        return (
            <Animatable.View animation="slideInUp" duration={400} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                    <View style={styles.orderIdBadge}>
                        <Text style={styles.orderId}>#{item.id}</Text>
                    </View>
                    <View style={[styles.timerBadge, { backgroundColor: remainingTime <= 10 ? COLORS.error + '20' : COLORS.online + '20' }]}>
                        <Icon name="alarm-outline" size={14} color={remainingTime <= 10 ? COLORS.error : COLORS.online} />
                        <Text style={[styles.timerText, { color: remainingTime <= 10 ? COLORS.error : COLORS.online }]}>{remainingTime}s left</Text>
                    </View>
                </View>

                <View style={styles.customerInfo}>
                    <Icon name="person-outline" size={16} color={COLORS.mediumGray} />
                    <Text style={styles.customerName}>{item.customerName || 'Customer'}</Text>
                </View>

                <View style={styles.orderDetails}>
                    <View style={styles.detailRow}>
                        <Icon name="map-outline" size={14} color={COLORS.mediumGray} />
                        <Text style={styles.detailText} numberOfLines={1}>{item.customerLocation?.address || 'Erode'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Icon name="cafe-outline" size={14} color={COLORS.mediumGray} />
                        <Text style={styles.detailText}>
                            Items: {item.items?.map(it => `${it.quantity}x ${it.name}`).join(', ')}
                        </Text>
                    </View>
                </View>

                <View style={styles.orderFooter}>
                    <View style={styles.distanceInfo}>
                        <Icon name="navigate-outline" size={16} color={COLORS.accent} />
                        <Text style={styles.distanceText}>{item.distance || '0.5'} km away</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleAcceptOrder(item.id)}
                    >
                        <Icon name="checkmark" size={18} color={COLORS.white} />
                        <Text style={styles.acceptText}>Accept</Text>
                    </TouchableOpacity>
                </View>
            </Animatable.View>
        );
    };

    // Calculate overall shift progress dial parameters
    const totalTeasSoldInShift = totalTeasSold;
    const shiftTarget = 360; // 3 Cans * 120 = 360
    const salesPercentage = Math.round(Math.min(100, (totalTeasSoldInShift / shiftTarget) * 100));

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.darkBg} translucent />

            {/* Shift Dashboard Header */}
            <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 44 : STATUSBAR_HEIGHT + 10 }]}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.shiftBadge}>FULL TIME SHIFT</Text>
                        <Text style={styles.shiftTimeLabel}>7:00 AM - 3:00 PM</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <View style={styles.onlineToggle}>
                            <Text style={[styles.onlineLabel, { color: isOnline ? COLORS.online : COLORS.offline }]}>
                                {isOnline ? 'Online' : 'Offline'}
                            </Text>
                            <Switch
                                value={isOnline}
                                onValueChange={handleToggleOnline}
                                trackColor={{ false: COLORS.gray, true: COLORS.online + '50' }}
                                thumbColor={isOnline ? COLORS.online : COLORS.mediumGray}
                                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                            />
                        </View>
                    </View>
                </View>

                {isOnline && (
                    <Animatable.View animation="fadeInUp" duration={500} style={styles.dashboardContainer}>
                        {/* Progress Dial Widget */}
                        <View style={styles.progressSection}>
                            <View style={styles.progressCircle}>
                                <Text style={styles.progressCircleSub}>TEA TARGET</Text>
                                <Text style={styles.progressCircleValue}>{shiftTarget}</Text>
                                <Text style={styles.progressCircleDesc}>({canIndex}/3 Cans)</Text>
                                <View style={styles.progressSoldBadge}>
                                    <Text style={styles.progressSoldText}>{totalTeasSoldInShift} Teas Sold</Text>
                                </View>
                            </View>
                            <View style={styles.circularProgressBarContainer}>
                                <Text style={styles.progressPercentageText}>{salesPercentage}% Complete</Text>
                                <View style={styles.linearProgressBar}>
                                    <View style={[styles.linearProgressActive, { width: `${salesPercentage}%` }]} />
                                </View>
                            </View>
                        </View>

                        {/* Dial Grid Stats */}
                        <View style={styles.statsGrid}>
                            <View style={styles.gridCard}>
                                <Icon name="hourglass-outline" size={18} color={COLORS.accent} />
                                <Text style={styles.gridValue}>{timeLeft || '08:00:00'}</Text>
                                <Text style={styles.gridLabel}>Time Left</Text>
                            </View>
                            <View style={styles.gridCard}>
                                <Icon name="cafe-outline" size={18} color={COLORS.secondary} />
                                <Text style={styles.gridValue}>{canIndex}/3</Text>
                                <Text style={styles.gridLabel}>Cans Used</Text>
                            </View>
                            <View style={styles.gridCard}>
                                <Icon name="star" size={18} color={COLORS.warning} />
                                <Text style={styles.gridValue}>4.8</Text>
                                <Text style={styles.gridLabel}>Rider Rating</Text>
                            </View>
                        </View>

                        {/* Active Box and Can Info Cards */}
                        <View style={styles.equipmentRow}>
                            <View style={styles.equipmentCard}>
                                <View style={styles.equipmentIconContainer}>
                                    <Icon name="cube" size={24} color={COLORS.accent} />
                                </View>
                                <View style={styles.equipmentTextContainer}>
                                    <Text style={styles.equipmentLabel}>CURRENT BOX</Text>
                                    <Text style={styles.equipmentValue}>{boxNumber || '—'}</Text>
                                </View>
                            </View>
                            <View style={styles.equipmentCard}>
                                <View style={[styles.equipmentIconContainer, { backgroundColor: '#E0F7FA' }]}>
                                    <Icon name="water" size={24} color="#00ACC1" />
                                </View>
                                <View style={styles.equipmentTextContainer}>
                                    <Text style={styles.equipmentLabel}>CURRENT CAN</Text>
                                    <Text style={styles.equipmentValue}>{currentCan || '—'}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Tea Remaining Progress Bar */}
                        <View style={styles.teaRemainingCard}>
                            <View style={styles.teaRemainingHeader}>
                                <Text style={styles.teaRemainingTitle}>Tea Remaining in Can</Text>
                                <Text style={[styles.teaRemainingValue, { color: teaCups <= 10 ? COLORS.error : '#00ACC1' }]}>
                                    {teaCups}/120 Cups
                                </Text>
                            </View>
                            <View style={styles.teaProgressBarBg}>
                                <View style={[
                                    styles.teaProgressBarActive,
                                    {
                                        width: `${(teaCups / 120) * 100}%`,
                                        backgroundColor: teaCups <= 10 ? COLORS.error : '#00ACC1'
                                    }
                                ]} />
                            </View>
                        </View>
                    </Animatable.View>
                )}
            </View>

            {/* Active Orders List or Flow Overlays */}
            <View style={styles.content}>
                {isOnline && canRequestStatus !== 'none' ? (
                    /* Swap Can Flow Overlay Banners */
                    <Animatable.View animation="fadeIn" style={styles.flowCard}>
                        {canRequestStatus === 'requested' ? (
                            <View style={styles.flowCardInner}>
                                <Animatable.Image
                                    animation="pulse"
                                    iterationCount="infinite"
                                    source={require('../../assets/logo.png')} // fallback or generic icon
                                    style={styles.flowImage}
                                    defaultSource={require('../../assets/logo.png')}
                                />
                                <Icon name="navigate-circle-outline" size={48} color={COLORS.accent} />
                                <Text style={styles.flowTitle}>Request Sent to Office</Text>
                                <Text style={styles.flowSub}>Next can is being prepared. You can head towards the office now.</Text>
                                <View style={styles.flowInfoBox}>
                                    <Text style={styles.flowInfoText}>ETA to Office: 12 mins</Text>
                                </View>
                                <TouchableOpacity style={styles.flowBtn} onPress={handleReachedOffice}>
                                    <Text style={styles.flowBtnText}>Reached Office</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.flowCardInner}>
                                <Icon name="business-outline" size={48} color={COLORS.online} />
                                <Text style={styles.flowTitle}>Reached Office</Text>
                                <Text style={styles.flowSub}>Prepared Can is ready for swap: {preparedCanId}</Text>
                                <TouchableOpacity style={[styles.flowBtn, { backgroundColor: COLORS.online }]} onPress={handleReachedOffice}>
                                    <Text style={styles.flowBtnText}>Swap New Can</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </Animatable.View>
                ) : (
                    /* Default: Show active order cards */
                    <View style={{ flex: 1 }}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Active Orders ({filteredOrders.length})</Text>
                            <TouchableOpacity onPress={() => {}}>
                                <Icon name="refresh" size={20} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={filteredOrders}
                            keyExtractor={(item) => item.id}
                            renderItem={renderOrderCard}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.orderList}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Icon name="cafe-outline" size={60} color={COLORS.mediumGray} />
                                    <Text style={styles.emptyTitle}>No Orders Available</Text>
                                    <Text style={styles.emptyText}>
                                        {isOnline ? 'Riders nearby will see orders placed in last 30s' : 'Go online to receive nearby orders'}
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
                )}
            </View>

            {/* 1. Go Online Modal (Prompt for Box No. & Can No.) */}
            <Modal visible={showOnlineModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Shift Equipment Set</Text>
                        <Text style={styles.modalSub}>Enter Box and Can Numbers to go online.</Text>

                        <Text style={styles.modalLabel}>Box Number (Locked for today)</Text>
                        <TextInput
                            style={[styles.modalInput, boxNumber !== '' && { backgroundColor: COLORS.lightGray, color: COLORS.mediumGray }]}
                            placeholder="e.g. BOX123"
                            value={inputBox}
                            onChangeText={setInputBox}
                            editable={boxNumber === ''}
                        />

                        <Text style={styles.modalLabel}>Can Number (Active)</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. CAN456"
                            value={inputCan}
                            onChangeText={setInputCan}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowOnlineModal(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirmOnline}>
                                <Text style={styles.modalConfirmText}>Go Online</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 2. Low Tea Alert Modal */}
            <Modal visible={showLowTeaModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Icon name="warning-outline" size={48} color={COLORS.error} style={{ alignSelf: 'center', marginBottom: 12 }} />
                        <Text style={styles.modalTitle}>Tea Running Low!</Text>
                        <Text style={styles.modalSub}>Only {teaCups} teas left. Request your next Can from the office?</Text>

                        <Text style={styles.modalLabel}>ETA to Office</Text>
                        <View style={styles.etaGrid}>
                            {etaOptions.map((eta) => (
                                <TouchableOpacity
                                    key={eta}
                                    style={[styles.etaOption, selectedEta === eta && styles.etaOptionSelected]}
                                    onPress={() => setSelectedEta(eta)}
                                >
                                    <Text style={[styles.etaOptionText, selectedEta === eta && { color: COLORS.white }]}>{eta}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLowTeaModal(false)}>
                                <Text style={styles.modalCancelText}>Not Now</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleRequestCan}>
                                <Text style={styles.modalConfirmText}>Request Next Can</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 3. Swap Can / Add New Can Modal */}
            <Modal visible={showSwapModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add New Can</Text>
                        <Text style={styles.modalSub}>Enter the Serial Number of the next prepared Can.</Text>

                        <Text style={styles.modalLabel}>Expected Can: {preparedCanId}</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. CAN457"
                            value={scannedCanCode}
                            onChangeText={setScannedCanCode}
                            autoFocus
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowSwapModal(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: COLORS.online }]} onPress={handleSwapCan}>
                                <Text style={styles.modalConfirmText}>Confirm & Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    shiftBadge: {
        fontSize: SIZES.small,
        fontWeight: '800',
        color: COLORS.secondary,
        letterSpacing: 1,
    },
    shiftTimeLabel: {
        fontSize: SIZES.medium,
        fontWeight: '600',
        color: COLORS.white,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    onlineToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 6,
    },
    onlineLabel: {
        fontSize: SIZES.xs,
        fontWeight: '800',
    },
    dashboardContainer: {
        marginTop: 8,
        gap: 12,
    },
    progressSection: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
    },
    progressCircle: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    progressCircleSub: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '700',
        letterSpacing: 1,
    },
    progressCircleValue: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.white,
    },
    progressCircleDesc: {
        fontSize: 11,
        color: COLORS.secondary,
        fontWeight: '600',
    },
    progressSoldBadge: {
        backgroundColor: COLORS.secondary,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginTop: 6,
    },
    progressSoldText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    circularProgressBarContainer: {
        width: '100%',
        marginTop: 10,
        alignItems: 'center',
    },
    progressPercentageText: {
        fontSize: SIZES.small,
        color: COLORS.white,
        fontWeight: '600',
        marginBottom: 4,
    },
    linearProgressBar: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.15)',
        width: '100%',
        borderRadius: 3,
        overflow: 'hidden',
    },
    linearProgressActive: {
        height: '100%',
        backgroundColor: COLORS.secondary,
        borderRadius: 3,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    gridCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        gap: 2,
    },
    gridValue: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.white,
        marginTop: 2,
    },
    gridLabel: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '600',
    },
    equipmentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    equipmentCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        ...SHADOWS.small,
    },
    equipmentIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FFE8E8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    equipmentTextContainer: {
        flex: 1,
    },
    equipmentLabel: {
        fontSize: 8,
        color: COLORS.textSecondary,
        fontWeight: '700',
    },
    equipmentValue: {
        fontSize: 12,
        color: COLORS.textPrimary,
        fontWeight: '800',
    },
    teaRemainingCard: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: 10,
    },
    teaRemainingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    teaRemainingTitle: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
    },
    teaRemainingValue: {
        fontSize: 11,
        fontWeight: '800',
    },
    teaProgressBarBg: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    teaProgressBarActive: {
        height: '100%',
        borderRadius: 4,
    },
    content: {
        flex: 1,
        padding: SIZES.padding,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: SIZES.large,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    orderList: {
        paddingBottom: 40,
    },
    orderCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: SIZES.padding,
        marginBottom: SIZES.paddingS,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: COLORS.lightGray,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SIZES.paddingS,
    },
    orderIdBadge: {
        backgroundColor: COLORS.darkBg,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    orderId: {
        fontSize: SIZES.small,
        fontWeight: '700',
        color: COLORS.white,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 4,
    },
    timerText: {
        fontSize: SIZES.xs,
        fontWeight: '800',
    },
    customerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: SIZES.paddingS,
    },
    customerName: {
        fontSize: SIZES.regular,
        fontWeight: '700',
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
        fontWeight: '700',
        color: COLORS.accent,
    },
    acceptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.accent,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 10,
        gap: 4,
    },
    acceptText: {
        fontSize: SIZES.regular,
        fontWeight: '700',
        color: COLORS.white,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: SIZES.paddingXL * 2,
    },
    emptyTitle: {
        fontSize: SIZES.large,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: SIZES.padding,
    },
    emptyText: {
        fontSize: SIZES.regular,
        color: COLORS.textSecondary,
        marginTop: SIZES.paddingS,
        marginBottom: SIZES.paddingL,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    goOnlineButton: {
        backgroundColor: COLORS.secondary,
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 12,
        ...SHADOWS.small,
    },
    goOnlineText: {
        color: COLORS.textPrimary,
        fontWeight: '800',
        fontSize: SIZES.medium,
    },
    // Swap Flow styles
    flowCard: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 24,
        ...SHADOWS.small,
        marginVertical: 20,
    },
    flowCardInner: {
        alignItems: 'center',
        gap: 12,
        width: '100%',
    },
    flowImage: {
        width: 140,
        height: 140,
        borderRadius: 70,
        marginBottom: 10,
    },
    flowTitle: {
        fontSize: SIZES.xlarge,
        fontWeight: '800',
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    flowSub: {
        fontSize: SIZES.regular,
        color: COLORS.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 10,
        lineHeight: 20,
    },
    flowInfoBox: {
        backgroundColor: COLORS.accent + '15',
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 8,
        marginTop: 6,
    },
    flowInfoText: {
        fontSize: SIZES.medium,
        fontWeight: '700',
        color: COLORS.accent,
    },
    flowBtn: {
        backgroundColor: COLORS.accent,
        paddingVertical: 14,
        paddingHorizontal: 36,
        borderRadius: 16,
        marginTop: 16,
        width: '100%',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    flowBtnText: {
        fontSize: SIZES.medium,
        fontWeight: '800',
        color: COLORS.white,
    },
    // Modal general styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        ...SHADOWS.medium,
    },
    modalTitle: {
        fontSize: SIZES.large,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: 6,
    },
    modalSub: {
        fontSize: SIZES.small,
        color: COLORS.textSecondary,
        marginBottom: 16,
    },
    modalLabel: {
        fontSize: SIZES.small,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 6,
    },
    modalInput: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: SIZES.medium,
        color: COLORS.textPrimary,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: COLORS.lightGray,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 10,
    },
    modalCancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
    modalCancelText: {
        fontSize: SIZES.regular,
        color: COLORS.mediumGray,
        fontWeight: '700',
    },
    modalConfirmBtn: {
        backgroundColor: COLORS.secondary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        ...SHADOWS.small,
    },
    modalConfirmText: {
        fontSize: SIZES.regular,
        color: COLORS.textPrimary,
        fontWeight: '800',
    },
    etaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    etaOption: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: COLORS.lightGray,
    },
    etaOptionSelected: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.accent,
    },
    etaOptionText: {
        fontSize: SIZES.small,
        color: COLORS.textPrimary,
        fontWeight: '700',
    },
});

export default HomeScreen;
