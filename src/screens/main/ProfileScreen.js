import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    Platform,
    TouchableOpacity,
    Alert,
    Switch,
    Modal,
    Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';
import { COLORS, SIZES, SHADOWS } from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

const ProfileScreen = ({ navigation }) => {
    const { employee, isOnline, logout, updateStatus, refillDrum, totalTeasSold, shiftStartTime, changeEmployeeType } = useAuth();
    const [isDocsVisible, setIsDocsVisible] = React.useState(false);

    const completedShifts = employee?.workHistory ? Object.keys(employee.workHistory).length : 0;
    const totalCupsSold = employee?.workHistory 
        ? Object.values(employee.workHistory).reduce((sum, log) => sum + parseInt(log.sales || 0, 10), 0) 
        : 0;

    const getTodayStats = () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayLog = employee?.workHistory ? employee.workHistory[todayStr] : null;
        
        const cups = Math.max(totalTeasSold || 0, parseInt(todayLog?.sales || 0, 10));
        
        let duration = '—';
        if (isOnline && shiftStartTime) {
            const diffMs = Date.now() - shiftStartTime;
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            duration = `${diffHrs}h ${diffMins}m`;
        } else if (todayLog?.duration) {
            duration = todayLog.duration;
        }
        
        let earnings = 0;
        if (employee?.employeeType === 'Part Time') {
            earnings = cups * 2.50;
        } else {
            // Full-time speed target ₹250
            const hitTarget = cups >= 360;
            let achieved = false;
            if (hitTarget) {
                if (shiftStartTime) {
                    const elapsed = Date.now() - shiftStartTime;
                    if (elapsed <= 6 * 60 * 60 * 1000) {
                        achieved = true;
                    }
                } else if (todayLog) {
                    const durStr = todayLog.duration || '';
                    const match = durStr.match(/(\d+)h/);
                    if (match) {
                        const hrs = parseInt(match[1], 10);
                        if (hrs <= 6) achieved = true;
                    }
                }
            }
            earnings = achieved ? 250 : 0;
        }
        
        return { cups, duration, earnings };
    };
    
    const todayStats = getTodayStats();

    const handleOpenDoc = async (url) => {
        if (!url) {
            Alert.alert('Not Found', 'This document was not uploaded during registration.');
            return;
        }
        try {
            await Linking.openURL(url);
        } catch (error) {
            Alert.alert('Error', 'Could not open the document.');
        }
    };



    const handleShiftTypeToggle = async (newType) => {
        if (employee?.employeeType === newType) return;
        
        if (isOnline) {
            Alert.alert(
                'Shift Active ⚠️',
                'You cannot change your shift type while your shift is active. Please go offline first.'
            );
            return;
        }

        Alert.alert(
            'Change Shift Type',
            `Are you sure you want to switch your preference to ${newType}? This will immediately change your active dashboard targets and rules.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Switch',
                    onPress: async () => {
                        const success = await changeEmployeeType(newType);
                        if (success) {
                            Alert.alert('Shift Type Updated 🎉', `Your shift preference has been successfully updated to ${newType}.`);
                        }
                    }
                }
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert(
            'End Shift',
            'Are you sure you want to end your shift and logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'End Shift',
                    style: 'destructive',
                    onPress: () => {
                        logout();
                    },
                },
            ]
        );
    };

    const menuItems = [
        {
            id: 'documents',
            icon: 'document-text-outline',
            title: 'Documents',
            subtitle: 'ID, License, Registration',
        },
        {
            id: 'bank',
            icon: 'card-outline',
            title: 'Bank Details',
            subtitle: 'Payment account info',
        },
        {
            id: 'history',
            icon: 'time-outline',
            title: 'Work History',
            subtitle: 'View past shifts',
        },
        {
            id: 'notifications',
            icon: 'notifications-outline',
            title: 'Notifications',
            subtitle: 'Order alerts, updates',
        },
        {
            id: 'help',
            icon: 'help-circle-outline',
            title: 'Help & Support',
            subtitle: 'FAQs, contact us',
        },
        {
            id: 'settings',
            icon: 'settings-outline',
            title: 'Settings',
            subtitle: 'App preferences',
        },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.darkBg} translucent />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: STATUSBAR_HEIGHT + 20 }]}>
                    <View style={styles.headerTop}>
                        <Text style={styles.brandName}>THAMBI ORU TEA</Text>
                        <View style={styles.taglineRow}>
                            <View style={styles.taglineLine} />
                            <Text style={styles.tagline}>employee portal</Text>
                            <View style={styles.taglineLine} />
                        </View>
                    </View>

                    {/* Profile Card */}
                    <Animatable.View animation="fadeInUp" style={styles.profileCard}>
                        <View style={styles.avatarContainer}>
                            <Text style={styles.avatarText}>
                                {employee?.name?.charAt(0).toUpperCase() || 'E'}
                            </Text>
                            <View style={[
                                styles.onlineIndicator,
                                { backgroundColor: isOnline ? COLORS.online : COLORS.offline }
                            ]} />
                        </View>
                        <View style={styles.profileInfo}>
                             <Text style={styles.profileName}>{employee?.name || 'Employee'}</Text>
                             <Text style={styles.profileId}>ID: {employee?.empId || employee?.id || 'EMP001'}</Text>
                             <View style={styles.ratingRow}>
                                 <Text style={styles.profileDeliveries}>{totalCupsSold} cups sold ({completedShifts} shifts)</Text>
                             </View>
                         </View>
                    </Animatable.View>
                </View>

                <View style={styles.content}>
                    {/* Online Status Toggle */}
                    <View style={styles.statusCard}>
                        <View style={styles.statusLeft}>
                            <View style={[
                                styles.statusIcon,
                                { backgroundColor: isOnline ? COLORS.online + '15' : COLORS.offline + '15' }
                            ]}>
                                <Icon
                                    name={isOnline ? 'radio-button-on' : 'radio-button-off'}
                                    size={20}
                                    color={isOnline ? COLORS.online : COLORS.offline}
                                />
                            </View>
                            <View>
                                <Text style={styles.statusTitle}>Work Status</Text>
                                <Text style={[styles.statusText, { color: isOnline ? COLORS.online : COLORS.offline }]}>
                                    {isOnline ? 'Online - Receiving Orders' : 'Offline - Not Receiving Orders'}
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={isOnline}
                            onValueChange={(value) => updateStatus(value ? 'online' : 'offline')}
                            trackColor={{ false: COLORS.gray, true: COLORS.online + '50' }}
                            thumbColor={isOnline ? COLORS.online : COLORS.mediumGray}
                        />
                    </View>

                    {/* Shift Preference Selector */}
                    {employee?.registeredEmployeeType === 'Part Time' ? (
                        <View style={styles.shiftCard}>
                            <View style={styles.statusLeft}>
                                <View style={[styles.statusIcon, { backgroundColor: COLORS.primary + '15' }]}>
                                    <Icon name="time-outline" size={20} color={COLORS.primary} />
                                </View>
                                <View>
                                    <Text style={styles.statusTitle}>Shift Type</Text>
                                    <Text style={[styles.statusText, { color: COLORS.textSecondary }]}>
                                        Part-Time Shift (Fixed)
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.badgeContainer}>
                                <Text style={styles.badgeText}>Fixed</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.shiftCard}>
                            <View style={styles.statusLeft}>
                                <View style={[styles.statusIcon, { backgroundColor: COLORS.primary + '15' }]}>
                                    <Icon name="time-outline" size={20} color={COLORS.primary} />
                                </View>
                                <View>
                                    <Text style={styles.statusTitle}>Shift Preference</Text>
                                    <Text style={[styles.statusText, { color: COLORS.textSecondary }]}>
                                        {employee?.employeeType || 'Full Time'}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.toggleContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.toggleBtn,
                                        employee?.employeeType !== 'Part Time' && styles.toggleBtnActive,
                                        isOnline && { opacity: 0.6 }
                                    ]}
                                    onPress={() => handleShiftTypeToggle('Full Time')}
                                >
                                    <Text style={[
                                        styles.toggleBtnText,
                                        employee?.employeeType !== 'Part Time' && styles.toggleBtnTextActive
                                    ]}>Full-Time</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.toggleBtn,
                                        employee?.employeeType === 'Part Time' && styles.toggleBtnActive,
                                        isOnline && { opacity: 0.6 }
                                    ]}
                                    onPress={() => handleShiftTypeToggle('Part Time')}
                                >
                                    <Text style={[
                                        styles.toggleBtnText,
                                        employee?.employeeType === 'Part Time' && styles.toggleBtnTextActive
                                    ]}>Part-Time</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Quick Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{todayStats.cups}</Text>
                            <Text style={styles.statLabel}>Teas Sold</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>₹{todayStats.earnings}</Text>
                            <Text style={styles.statLabel}>Earned</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{todayStats.duration}</Text>
                            <Text style={styles.statLabel}>Duration</Text>
                        </View>
                    </View>

                    {/* Detailed Profile Card */}
                    <Animatable.View animation="fadeInUp" delay={50} style={styles.detailsCard}>
                        <Text style={styles.detailsHeader}>Personal & Vehicle Details</Text>
                        
                        <View style={styles.detailRow}>
                            <View style={styles.detailBlock}>
                                <Text style={styles.detailLabel}>Mobile Number</Text>
                                <Text style={styles.detailValue}>{employee?.phone || employee?.mobile || '—'}</Text>
                            </View>
                            <View style={styles.detailBlock}>
                                <Text style={styles.detailLabel}>Alternate Mobile</Text>
                                <Text style={styles.detailValue}>{employee?.alternateNumber || '—'}</Text>
                            </View>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailBlock}>
                                <Text style={styles.detailLabel}>Gender</Text>
                                <Text style={styles.detailValue}>{employee?.gender || '—'}</Text>
                            </View>
                            <View style={styles.detailBlock}>
                                <Text style={styles.detailLabel}>Date of Joining</Text>
                                <Text style={styles.detailValue}>{employee?.dateOfJoining || '—'}</Text>
                            </View>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailBlock}>
                                <Text style={styles.detailLabel}>Vehicle Type</Text>
                                <Text style={styles.detailValue}>{employee?.vehicleType || '—'}</Text>
                            </View>
                            <View style={styles.detailBlock}>
                                <Text style={styles.detailLabel}>Vehicle Number</Text>
                                <Text style={styles.detailValue}>{employee?.vehicleNumber || '—'}</Text>
                            </View>
                        </View>

                        {employee?.address && (
                            <View style={[styles.detailBlock, { borderTopWidth: 1, borderColor: COLORS.lightGray, paddingTop: 10, marginTop: 5 }]}>
                                <Text style={styles.detailLabel}>Address</Text>
                                <Text style={[styles.detailValue, { fontSize: 13, lineHeight: 18, fontWeight: '400' }]}>{employee?.address}</Text>
                            </View>
                        )}
                    </Animatable.View>



                    {/* Menu Items */}
                    <View style={styles.menuSection}>
                        {menuItems.map((item, index) => (
                            <Animatable.View key={item.id} animation="fadeInUp" delay={index * 50}>
                                <TouchableOpacity
                                    style={styles.menuItem}
                                    onPress={() => {
                                        if (item.id === 'documents') {
                                            setIsDocsVisible(true);
                                        } else if (item.id === 'bank') {
                                            navigation.navigate('BankDetails');
                                        } else if (item.id === 'history') {
                                            navigation.navigate('WorkHistory');
                                        } else {
                                            Alert.alert('Info', `${item.title} coming soon`);
                                        }
                                    }}>
                                    <View style={styles.menuIconContainer}>
                                        <Icon name={item.icon} size={20} color={COLORS.primary} />
                                    </View>
                                    <View style={styles.menuContent}>
                                        <Text style={styles.menuTitle}>{item.title}</Text>
                                        <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                                    </View>
                                    <Icon name="chevron-forward" size={18} color={COLORS.mediumGray} />
                                </TouchableOpacity>
                            </Animatable.View>
                        ))}
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Icon name="log-out-outline" size={20} color={COLORS.error} />
                        <Text style={styles.logoutText}>End Shift & Logout</Text>
                    </TouchableOpacity>

                    <Text style={styles.versionText}>Version 1.0.0</Text>
                </View>
            </ScrollView>

            {/* Documents Modal */}
            <Modal
                visible={isDocsVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsDocsVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>My Documents</Text>
                            <TouchableOpacity onPress={() => setIsDocsVisible(false)}>
                                <Icon name="close" size={24} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.modalBody}>
                            {[
                                { title: 'Selfie / Profile Photo', url: employee?.selfieUrl },
                                { title: 'Aadhar Card', url: employee?.aadharUrl },
                                { title: 'PAN Card', url: employee?.panCardUrl },
                                { title: 'Driving License', url: employee?.licenseUrl },
                                { title: 'RC Book', url: employee?.rcUrl },
                                { title: 'Vehicle Insurance', url: employee?.insuranceUrl },
                                { title: 'Family Aadhar', url: employee?.familyAadharUrl }
                            ].map((doc, index) => (
                                <View key={index} style={styles.docItemRow}>
                                    <View style={styles.docItemLeft}>
                                        <Icon name="document-text" size={24} color={doc.url ? COLORS.primary : COLORS.mediumGray} />
                                        <Text style={[styles.docItemTitle, !doc.url && { color: COLORS.mediumGray }]}>{doc.title}</Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={[styles.docViewBtn, !doc.url && styles.docViewBtnDisabled]}
                                        onPress={() => handleOpenDoc(doc.url)}
                                        disabled={!doc.url}
                                    >
                                        <Text style={[styles.docViewBtnText, !doc.url && { color: COLORS.mediumGray }]}>
                                            {doc.url ? 'View' : 'Missing'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
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
        paddingBottom: SIZES.paddingXL,
        borderBottomLeftRadius: SIZES.radiusXL,
        borderBottomRightRadius: SIZES.radiusXL,
    },
    headerTop: {
        alignItems: 'center',
        marginBottom: SIZES.paddingL,
    },
    brandName: {
        fontSize: SIZES.xlarge,
        fontWeight: '700',
        color: COLORS.white,
        letterSpacing: 2,
    },
    taglineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 8,
    },
    taglineLine: {
        width: 20,
        height: 1,
        backgroundColor: COLORS.secondary,
    },
    tagline: {
        fontSize: SIZES.small,
        color: COLORS.secondary,
        fontStyle: 'italic',
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SIZES.paddingS,
        position: 'relative',
    },
    avatarText: {
        fontSize: SIZES.xxlarge,
        fontWeight: '600',
        color: COLORS.white,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: COLORS.darkBg,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: SIZES.large,
        fontWeight: '600',
        color: COLORS.white,
    },
    profileId: {
        fontSize: SIZES.small,
        color: 'rgba(255,255,255,0.6)',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    profileRating: {
        fontSize: SIZES.medium,
        fontWeight: '600',
        color: COLORS.secondary,
        marginRight: 8,
    },
    profileDeliveries: {
        fontSize: SIZES.small,
        color: 'rgba(255,255,255,0.6)',
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: SIZES.padding,
        paddingTop: SIZES.padding,
        paddingBottom: 100,
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.padding,
        ...SHADOWS.small,
    },
    statusLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SIZES.paddingS,
    },
    statusIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusTitle: {
        fontSize: SIZES.regular,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    statusText: {
        fontSize: SIZES.small,
        marginTop: 2,
    },
    shiftCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.padding,
        ...SHADOWS.small,
    },
    badgeContainer: {
        backgroundColor: COLORS.mediumGray + '20',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: SIZES.small,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.lightGray,
        padding: 4,
        borderRadius: 20,
    },
    toggleBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    toggleBtnActive: {
        backgroundColor: COLORS.primary,
        ...SHADOWS.small,
    },
    toggleBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    toggleBtnTextActive: {
        color: COLORS.white,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.padding,
        ...SHADOWS.small,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: SIZES.xlarge,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    statLabel: {
        fontSize: SIZES.small,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: '100%',
        backgroundColor: COLORS.lightGray,
    },
    detailsCard: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.paddingL,
        marginBottom: SIZES.padding,
        ...SHADOWS.small,
    },
    detailsHeader: {
        fontSize: SIZES.regular + 1,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: 12,
        borderBottomWidth: 1,
        borderColor: COLORS.lightGray,
        paddingBottom: 6,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    detailBlock: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    refillCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.primary,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.padding,
        ...SHADOWS.medium,
    },
    refillInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    refillIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    refillTitle: {
        fontSize: SIZES.regular,
        fontWeight: '700',
        color: COLORS.white,
    },
    refillSubtitle: {
        fontSize: SIZES.xs,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    refillButton: {
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    refillButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
    },
    menuSection: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        overflow: 'hidden',
        marginBottom: SIZES.padding,
        ...SHADOWS.small,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SIZES.padding,
        borderBottomWidth: 1,
        borderColor: COLORS.lightGray,
    },
    menuIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SIZES.paddingS,
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: SIZES.regular,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    menuSubtitle: {
        fontSize: SIZES.small,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.error + '10',
        paddingVertical: SIZES.padding,
        borderRadius: SIZES.radius,
        gap: 8,
    },
    logoutText: {
        fontSize: SIZES.regular,
        fontWeight: '600',
        color: COLORS.error,
    },
    versionText: {
        textAlign: 'center',
        fontSize: SIZES.small,
        color: COLORS.mediumGray,
        marginTop: SIZES.paddingL,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: SIZES.radiusXL,
        borderTopRightRadius: SIZES.radiusXL,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SIZES.padding,
        borderBottomWidth: 1,
        borderColor: COLORS.lightGray,
    },
    modalTitle: {
        fontSize: SIZES.large,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    modalBody: {
        padding: SIZES.padding,
        paddingBottom: 40,
    },
    docItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: COLORS.lightGray,
    },
    docItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    docItemTitle: {
        fontSize: SIZES.regular,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    docViewBtn: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        backgroundColor: COLORS.primary + '15',
        borderRadius: 20,
    },
    docViewBtnDisabled: {
        backgroundColor: COLORS.lightGray,
    },
    docViewBtnText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: SIZES.small,
    },
});

export default ProfileScreen;
