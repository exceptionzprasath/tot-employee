import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    Platform,
    TouchableOpacity,
    Alert,
    Linking,
    Modal,
    Image,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';
import { COLORS, SIZES, SHADOWS } from '../../utils/colors';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { updateOrderStatus, acceptOrder } from '../../services/orderService';
import { PAYMENT_CONFIG, GOOGLE_MAPS_API_KEY } from '../../config/api';

const { width } = Dimensions.get('window');

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

// Calculate distance between two coordinates in km using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return Math.round(d * 10) / 10; // Round to 1 decimal place
};

const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
};

const OrderDetailScreen = ({ route, navigation }) => {
    const { order } = route.params;
    const { updateInventory, currentLocation, employee } = useAuth();
    const [currentStatus, setCurrentStatus] = useState(order.status);
    const [loading, setLoading] = useState(false);
    const [visualProgress, setVisualProgress] = useState(0);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [isMapExpanded, setIsMapExpanded] = useState(false);

    useEffect(() => {
        let interval;
        if (currentStatus === 'accepted' || currentStatus === 'preparing' || currentStatus === 'on_the_way') {
            interval = setInterval(() => {
                setVisualProgress(prev => {
                    const next = prev + 0.05;
                    return next > 1 ? 1 : next;
                });
            }, 5000);
        } else if (currentStatus === 'delivered') {
            setVisualProgress(1);
        } else {
            setVisualProgress(0);
        }
        return () => clearInterval(interval);
    }, [currentStatus]);

    const statusFlow = ['placed', 'confirmed', 'delivered'];

    const getStatusColor = (status) => {
        switch (status) {
            case 'placed': return '#FF9800'; // Orange
            case 'confirmed': return '#4CAF50'; // Green
            case 'delivered': return '#2196F3'; // Blue
            default: return COLORS.mediumGray;
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'placed': return 'Order Placed';
            case 'confirmed': return 'Confirmed';
            case 'delivered': return 'Delivered';
            default: return status;
        }
    };

    const getNextStatusAction = () => {
        switch (currentStatus) {
            case 'placed': return { label: 'Accept Order', icon: 'checkmark' };
            case 'confirmed': return { label: 'Mark Delivered', icon: 'checkmark-done' };
            default: return null;
        }
    };

    const handleUpdateStatus = async () => {
        if (currentStatus === 'delivered') return;

        setLoading(true);
        try {
            if (currentStatus === 'placed') {
                // ACCEPTING ORDER
                const employeeInfo = {
                    employeeId: employee?.empId || 'EMP001',
                    employeeName: employee?.name || 'Partner',
                    employeePhone: employee?.phone || employee?.mobile || '',
                    employeeAvatar: employee?.selfieUrl || null
                };

                const response = await acceptOrder(order.id, employeeInfo);
                if (response.success) {
                    setCurrentStatus('confirmed');
                    Alert.alert('Success', 'Order accepted successfully');
                }
            } else if (currentStatus === 'confirmed') {
                // MARKING DELIVERED
                const response = await updateOrderStatus(order.id, 'delivered');
                if (response.success) {
                    setCurrentStatus('delivered');
                    
                    // Update Inventory
                    let teaCount = 0;
                    let snackCount = 0;
                    order.items?.forEach(item => {
                        const name = item.name.toLowerCase();
                        if (name.includes('tea') || name.includes('coffee')) {
                            teaCount += (item.quantity || 1);
                        } else {
                            snackCount += (item.quantity || 1);
                        }
                    });
                    updateInventory(teaCount, snackCount);

                    // Show payment modal or finish immediately if pre-paid online
                    if (order.paymentMode === 'online') {
                        setTimeout(() => {
                            Alert.alert('Delivery Successful', 'Order marked as delivered successfully. Payment was pre-paid online.', [
                                { text: 'OK', onPress: () => navigation.goBack() }
                            ]);
                        }, 800);
                    } else {
                        setTimeout(() => setShowPaymentModal(true), 800);
                    }
                }
            }
        } catch (error) {
            console.error('Update Status Error:', error);
            Alert.alert('Error', 'Failed to update order status');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPayment = (mode) => {
        if (mode === 'upi') {
            setShowPaymentModal(false);
            setShowQRModal(true);
        } else {
            setShowPaymentModal(false);
            Alert.alert('Cash Payment', 'Please collect ₹' + order.totalAmount + ' from customer.', [
                { text: 'Collected', onPress: () => navigation.goBack() }
            ]);
        }
    };

    const upiUrl = `upi://pay?pa=${PAYMENT_CONFIG.UPI_ID}&pn=${PAYMENT_CONFIG.MERCHANT_NAME}&am=${order.totalAmount}&cu=INR`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}`;

    const { latitude, longitude } = order.customerLocation || { latitude: 0, longitude: 0 };

    // Real-time distance and estimated time calculation based on rider's current GPS location
    const currentDistance = (currentLocation && currentLocation.latitude && currentLocation.longitude)
        ? calculateDistance(currentLocation.latitude, currentLocation.longitude, latitude, longitude)
        : (parseFloat(order.distance) || 0.5);

    const currentEstTime = (currentLocation && currentLocation.latitude && currentLocation.longitude)
        ? Math.max(1, Math.round(currentDistance * 4))
        : (parseInt(order.estimatedTime, 10) || 2);

    // If currentLocation is available, we overlay a path and markers for both rider and customer.
    // When no center/zoom is provided, Google Maps Static API automatically fits all markers and paths perfectly.
    const staticMapUrl = (currentLocation && currentLocation.latitude && currentLocation.longitude)
        ? `https://maps.googleapis.com/maps/api/staticmap?size=600x300&markers=color:red%7C${latitude},${longitude}&markers=color:blue%7C${currentLocation.latitude},${currentLocation.longitude}&path=color:0x1976D2ff%7Cweight:5%7C${currentLocation.latitude},${currentLocation.longitude}%7C${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
        : `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=600x300&markers=color:red%7C${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;

    const expandedMapUrl = (currentLocation && currentLocation.latitude && currentLocation.longitude)
        ? `https://maps.googleapis.com/maps/api/staticmap?size=800x800&markers=color:red%7C${latitude},${longitude}&markers=color:blue%7C${currentLocation.latitude},${currentLocation.longitude}&path=color:0x1976D2ff%7Cweight:5%7C${currentLocation.latitude},${currentLocation.longitude}%7C${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
        : `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=17&size=800x800&markers=color:red%7C${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;

    const handleCallCustomer = () => {
        Linking.openURL(`tel:${order.customerPhone}`);
    };

    const handleNavigate = () => {
        const { latitude, longitude } = order.customerLocation;
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`);
    };

    const nextAction = getNextStatusAction();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.darkBg} translucent />

            {/* Header */}
            <View style={[styles.header, { paddingTop: STATUSBAR_HEIGHT + 10 }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={22} color={COLORS.white} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Order #{order.id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentStatus) + '30' }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(currentStatus) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(currentStatus) }]}>
                            {getStatusLabel(currentStatus)}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.helpButton}>
                    <Icon name="help-circle-outline" size={22} color={COLORS.white} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Status Timeline */}
                <Animatable.View animation="fadeInUp" style={styles.timelineCard}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle}>Order Progress</Text>
                        <Text style={styles.progressPercent}>{Math.round(visualProgress * 100)}%</Text>
                    </View>

                    {/* Progress Bar Body */}
                    <View style={styles.progressBarContainer}>
                        <View style={[
                            styles.progressBarFill,
                            {
                                width: `${visualProgress * 100}%`,
                                backgroundColor: getStatusColor(currentStatus)
                            }
                        ]} />
                    </View>

                    <View style={styles.timeline}>
                        {statusFlow.map((status, index) => {
                            const isCompleted = statusFlow.indexOf(currentStatus) >= index;
                            const isCurrent = currentStatus === status;
                            return (
                                <View key={status} style={styles.timelineItem}>
                                    <View style={[
                                        styles.timelineDot,
                                        isCompleted && { backgroundColor: getStatusColor(status) },
                                        isCurrent && styles.timelineDotCurrent,
                                    ]}>
                                        {isCompleted && <Icon name="checkmark" size={12} color={COLORS.white} />}
                                    </View>
                                    <Text style={[
                                        styles.timelineLabel,
                                        isCompleted && styles.timelineLabelActive,
                                    ]}>
                                        {getStatusLabel(status)}
                                    </Text>
                                    {index < statusFlow.length - 1 && (
                                        <View style={[
                                            styles.timelineLine,
                                            statusFlow.indexOf(currentStatus) > index && styles.timelineLineActive,
                                        ]} />
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </Animatable.View>

                {/* Order Info */}
                <Animatable.View animation="fadeInUp" delay={100} style={styles.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={styles.cardTitle}>Order Info</Text>
                        {order.paymentMode === 'online' ? (
                            <View style={{ backgroundColor: '#4CAF5020', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Icon name="checkmark-circle" size={14} color="#4CAF50" />
                                <Text style={{ color: '#4CAF50', fontSize: 11, fontWeight: '700' }}>Received from App</Text>
                            </View>
                        ) : (
                            <View style={{ backgroundColor: '#FF980020', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Icon name="wallet" size={14} color="#FF9800" />
                                <Text style={{ color: '#FF9800', fontSize: 11, fontWeight: '700' }}>Collect COD (Cash/QR)</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Icon name="navigate-outline" size={20} color={COLORS.mediumGray} />
                            <Text style={styles.infoValue}>{currentDistance} km</Text>
                            <Text style={styles.infoLabel}>Distance</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Icon name="time-outline" size={20} color={COLORS.mediumGray} />
                            <Text style={styles.infoValue}>{currentEstTime} min</Text>
                            <Text style={styles.infoLabel}>Est. Time</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Icon name="cash-outline" size={20} color={COLORS.mediumGray} />
                            <Text style={styles.infoValue}>₹{Math.round(order.totalAmount * 0.2)}</Text>
                            <Text style={styles.infoLabel}>Your Earning</Text>
                        </View>
                    </View>
                </Animatable.View>

                {/* Customer Info */}
                <Animatable.View animation="fadeInUp" delay={200} style={styles.card}>
                    <Text style={styles.cardTitle}>Customer Details</Text>
                    <View style={styles.customerRow}>
                        <View style={styles.customerAvatar}>
                            <Text style={styles.avatarText}>
                                {order.customerName?.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.customerInfo}>
                            <Text style={styles.customerName}>{order.customerName}</Text>
                            <Text style={styles.customerPhone}>{order.customerPhone}</Text>
                        </View>
                        <TouchableOpacity style={styles.actionButton} onPress={handleCallCustomer}>
                            <Icon name="call" size={20} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.addressRow}>
                        <Icon name="location" size={18} color={COLORS.primary} />
                        <Text style={styles.addressText}>{order.customerLocation?.address}</Text>
                    </View>

                    <View style={styles.mapWrapper}>
                        <TouchableOpacity
                            style={styles.mapContainer}
                            activeOpacity={0.9}
                            onPress={() => setIsMapExpanded(true)}>
                            <Image
                                source={{ uri: staticMapUrl }}
                                style={styles.miniMap}
                                resizeMode="cover"
                            />
                            <View style={styles.mapOverlay}>
                                <TouchableOpacity style={styles.expandBtn} onPress={() => setIsMapExpanded(true)}>
                                    <Icon name="expand-outline" size={18} color={COLORS.white} />
                                </TouchableOpacity>
                                {currentLocation && (
                                    <View style={styles.mapRouteBadge}>
                                        <Icon name="time-outline" size={12} color={COLORS.white} />
                                        <Text style={styles.mapRouteBadgeText}>{currentEstTime} mins ({currentDistance} km)</Text>
                                    </View>
                                )}
                                <TouchableOpacity style={styles.directionsBtn} onPress={handleNavigate}>
                                    <Icon name="navigate" size={18} color={COLORS.white} />
                                    <Text style={styles.directionsText}>Go</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </View>
                </Animatable.View>

                {/* Order Items */}
                <Animatable.View animation="fadeInUp" delay={300} style={styles.card}>
                    <Text style={styles.cardTitle}>Order Items</Text>
                    {order.items?.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                            <View style={styles.itemQuantity}>
                                <Text style={styles.quantityText}>{item.quantity}x</Text>
                            </View>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                        </View>
                    ))}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {order.paymentMode === 'online' && (
                                <View style={{ backgroundColor: '#4CAF5020', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                                    <Text style={{ color: '#4CAF50', fontSize: 12, fontWeight: '700' }}>Received from App</Text>
                                </View>
                            )}
                            <Text style={styles.totalAmount}>₹{order.totalAmount}</Text>
                        </View>
                    </View>
                </Animatable.View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Action */}
            {nextAction && currentStatus !== 'delivered' && (
                <Animatable.View animation="slideInUp" style={styles.bottomAction}>
                    <Button
                        title={nextAction.label}
                        onPress={handleUpdateStatus}
                        loading={loading}
                        variant="success"
                        icon={<Icon name={nextAction.icon} size={20} color={COLORS.white} />}
                        style={styles.actionBtn}
                    />
                </Animatable.View>
            )}
            {/* Payment Selection Modal */}
            <Modal
                visible={showPaymentModal}
                transparent
                animationType="fade">
                <View style={styles.modalOverlay}>
                    <Animatable.View animation="zoomIn" duration={400} style={styles.paymentModal}>
                        <Icon name="wallet-outline" size={50} color={COLORS.primary} />
                        <Text style={styles.modalTitle}>Collect Payment</Text>
                        <Text style={styles.modalSubtitle}>Select payment method for ₹{order.totalAmount}</Text>

                        <View style={styles.paymentOptions}>
                            <TouchableOpacity
                                style={[styles.paymentOption, { borderColor: COLORS.secondary }]}
                                onPress={() => handleSelectPayment('upi')}>
                                <Icon name="qr-code" size={30} color={COLORS.secondary} />
                                <Text style={styles.paymentOptionText}>UPI / QR</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.paymentOption, { borderColor: COLORS.success }]}
                                onPress={() => handleSelectPayment('cash')}>
                                <Icon name="cash" size={30} color={COLORS.success} />
                                <Text style={styles.paymentOptionText}>Cash</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.closeModalBtn}
                            onPress={() => setShowPaymentModal(false)}>
                            <Text style={styles.closeModalText}>Cancel</Text>
                        </TouchableOpacity>
                    </Animatable.View>
                </View>
            </Modal>

            {/* QR Code Modal */}
            <Modal
                visible={showQRModal}
                transparent
                animationType="slide">
                <View style={styles.modalOverlay}>
                    <Animatable.View animation="fadeInUp" style={styles.qrModal}>
                        <View style={styles.qrHeader}>
                            <Text style={styles.qrTitle}>Scan to Pay</Text>
                            <TouchableOpacity onPress={() => setShowQRModal(false)}>
                                <Icon name="close" size={24} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.qrContainer}>
                            <Image
                                source={{ uri: qrImageUrl }}
                                style={styles.qrImage}
                                resizeMode="contain"
                            />
                            <View style={styles.qrLogoOverlay}>
                                <Image
                                    source={require('../../assets/logo.png')}
                                    style={styles.qrLogo}
                                />
                            </View>
                        </View>

                        <Text style={styles.upiIdText}>Dynamic Spot QR Code</Text>
                        <Text style={styles.amountText}>Amount: ₹{order.totalAmount}</Text>

                        <View style={styles.qrFooter}>
                            <Button
                                title="Payment Received"
                                variant="success"
                                onPress={() => {
                                    setShowQRModal(false);
                                    navigation.goBack();
                                }}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </Animatable.View>
                </View>
            </Modal>

            {/* Expanded Map Modal */}
            <Modal
                visible={isMapExpanded}
                transparent
                animationType="slide">
                <View style={[styles.modalOverlay, { padding: 0 }]}>
                    <Animatable.View animation="zoomIn" style={styles.expandedMapCard}>
                        <View style={styles.expandedMapHeader}>
                            <View>
                                <Text style={styles.expandedMapTitle}>Delivery Location</Text>
                                <Text style={styles.expandedMapSubtitle}>{order.customerLocation?.address}</Text>
                            </View>
                            <TouchableOpacity style={styles.closeExpandedBtn} onPress={() => setIsMapExpanded(false)}>
                                <Icon name="close" size={24} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.expandedMapImageWrapper}>
                            <Image
                                source={{ uri: expandedMapUrl }}
                                style={styles.expandedMapImage}
                                resizeMode="cover"
                            />
                        </View>

                        <View style={styles.expandedMapFooter}>
                            <Button
                                title="Open in Google Maps"
                                variant="info"
                                onPress={handleNavigate}
                                icon={<Icon name="navigate-outline" size={20} color={COLORS.white} />}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </Animatable.View>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SIZES.padding,
        paddingBottom: SIZES.paddingL,
        borderBottomLeftRadius: SIZES.radiusXL,
        borderBottomRightRadius: SIZES.radiusXL,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: SIZES.large,
        fontWeight: '700',
        color: COLORS.white,
        marginBottom: 4,
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
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: SIZES.small,
        fontWeight: '600',
    },
    helpButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: SIZES.padding,
        paddingTop: SIZES.padding,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.paddingS,
        ...SHADOWS.small,
    },
    cardTitle: {
        fontSize: SIZES.regular,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: SIZES.paddingS,
    },
    timelineCard: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.paddingS,
        ...SHADOWS.small,
    },
    timeline: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    timelineItem: {
        alignItems: 'center',
        flex: 1,
        position: 'relative',
    },
    timelineDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.gray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timelineDotCurrent: {
        borderWidth: 2,
        borderColor: COLORS.white,
        ...SHADOWS.small,
    },
    timelineLabel: {
        fontSize: SIZES.xs,
        color: COLORS.mediumGray,
        marginTop: 4,
        textAlign: 'center',
    },
    timelineLabelActive: {
        color: COLORS.textPrimary,
        fontWeight: '500',
    },
    timelineLine: {
        position: 'absolute',
        top: 12,
        right: -50,
        width: 40,
        height: 2,
        backgroundColor: COLORS.gray,
    },
    timelineLineActive: {
        backgroundColor: COLORS.success,
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SIZES.paddingS,
    },
    customerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SIZES.paddingS,
    },
    avatarText: {
        fontSize: SIZES.large,
        fontWeight: '600',
        color: COLORS.white,
    },
    customerInfo: {
        flex: 1,
    },
    customerName: {
        fontSize: SIZES.regular,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    customerPhone: {
        fontSize: SIZES.small,
        color: COLORS.textSecondary,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: SIZES.paddingS,
        borderTopWidth: 1,
        borderColor: COLORS.lightGray,
        gap: 8,
    },
    addressText: {
        flex: 1,
        fontSize: SIZES.small,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    mapWrapper: {
        marginTop: SIZES.paddingS,
        borderRadius: SIZES.radius,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.lightGray,
    },
    mapContainer: {
        width: '100%',
        height: 120,
        backgroundColor: COLORS.lightGray,
        position: 'relative',
    },
    miniMap: {
        width: '100%',
        height: '100%',
    },
    mapOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.1)',
        padding: 8,
        justifyContent: 'space-between',
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    expandBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'flex-start',
    },
    directionsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.info,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
        ...SHADOWS.small,
    },
    directionsText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: 12,
    },
    expandedMapCard: {
        width: '100%',
        height: '80%',
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        position: 'absolute',
        bottom: 0,
        padding: SIZES.paddingL,
    },
    expandedMapHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SIZES.padding,
    },
    expandedMapTitle: {
        fontSize: SIZES.large,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    expandedMapSubtitle: {
        fontSize: SIZES.small,
        color: COLORS.textSecondary,
        maxWidth: width * 0.7,
    },
    closeExpandedBtn: {
        padding: 4,
    },
    expandedMapImageWrapper: {
        flex: 1,
        borderRadius: SIZES.radiusL,
        overflow: 'hidden',
        backgroundColor: COLORS.lightGray,
        marginBottom: SIZES.padding,
    },
    expandedMapImage: {
        width: '100%',
        height: '100%',
    },
    expandedMapFooter: {
        marginBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SIZES.paddingS,
        borderBottomWidth: 1,
        borderColor: COLORS.lightGray,
    },
    itemQuantity: {
        backgroundColor: COLORS.lightGray,
        paddingHorizontal: SIZES.paddingS,
        paddingVertical: 4,
        borderRadius: SIZES.radius,
        marginRight: SIZES.paddingS,
    },
    quantityText: {
        fontSize: SIZES.small,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    itemName: {
        flex: 1,
        fontSize: SIZES.regular,
        color: COLORS.textPrimary,
    },
    itemPrice: {
        fontSize: SIZES.regular,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: SIZES.paddingS,
        marginTop: SIZES.paddingXS,
    },
    totalLabel: {
        fontSize: SIZES.regular,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    totalAmount: {
        fontSize: SIZES.xlarge,
        fontWeight: '700',
        color: COLORS.primary,
    },
    infoGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    infoItem: {
        alignItems: 'center',
    },
    infoValue: {
        fontSize: SIZES.large,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: 4,
    },
    infoLabel: {
        fontSize: SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SIZES.paddingS,
    },
    progressPercent: {
        fontSize: SIZES.small,
        fontWeight: '700',
        color: COLORS.primary,
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: COLORS.lightGray,
        borderRadius: 3,
        marginBottom: SIZES.paddingL,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SIZES.padding,
    },
    paymentModal: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radiusXL,
        padding: SIZES.paddingL,
        width: '100%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: SIZES.xlarge,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: SIZES.paddingS,
    },
    modalSubtitle: {
        fontSize: SIZES.regular,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: SIZES.paddingL,
    },
    paymentOptions: {
        flexDirection: 'row',
        gap: 15,
        width: '100%',
    },
    paymentOption: {
        flex: 1,
        height: 100,
        borderWidth: 2,
        borderRadius: SIZES.radiusL,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    paymentOptionText: {
        fontSize: SIZES.medium,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    closeModalBtn: {
        marginTop: SIZES.paddingL,
        padding: SIZES.paddingS,
    },
    closeModalText: {
        color: COLORS.mediumGray,
        fontWeight: '600',
    },
    qrModal: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: SIZES.radiusXL,
        borderTopRightRadius: SIZES.radiusXL,
        padding: SIZES.paddingL,
        width: '100%',
        position: 'absolute',
        bottom: 0,
    },
    qrHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SIZES.paddingL,
    },
    qrTitle: {
        fontSize: SIZES.large,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    qrContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SIZES.padding,
        backgroundColor: COLORS.offWhite,
        borderRadius: SIZES.radiusL,
        marginBottom: SIZES.paddingL,
        position: 'relative',
    },
    qrImage: {
        width: 250,
        height: 250,
    },
    qrLogoOverlay: {
        position: 'absolute',
        backgroundColor: COLORS.white,
        padding: 4,
        borderRadius: 8,
    },
    qrLogo: {
        width: 40,
        height: 40,
    },
    upiIdText: {
        fontSize: SIZES.regular,
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontWeight: '500',
    },
    amountText: {
        fontSize: SIZES.large,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: SIZES.paddingL,
    },
    qrFooter: {
        flexDirection: 'row',
        marginBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    bottomAction: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        padding: SIZES.padding,
        borderTopWidth: 1,
        borderColor: COLORS.lightGray,
        ...SHADOWS.medium,
    },
    actionBtn: {
        marginBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    mapRouteBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 4,
    },
    mapRouteBadgeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '600',
    },
});

export default OrderDetailScreen;
