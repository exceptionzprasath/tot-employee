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
    const { employee, isOnline, logout, updateStatus, refillDrum } = useAuth();
    const [isDocsVisible, setIsDocsVisible] = React.useState(false);

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

    const handleRefillRequest = () => {
        Alert.alert(
            'Refill Request',
            'Would you like to request a tea refill for your drum?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Request Refill',
                    onPress: () => {
                        refillDrum();
                        Alert.alert('Success', 'Refill request sent! Your drum is now marked as full.');
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
                            <Text style={styles.profileId}>ID: {employee?.id || 'EMP001'}</Text>
                            <View style={styles.ratingRow}>
                                <Icon name="star" size={14} color={COLORS.secondary} />
                                <Text style={styles.profileRating}>{employee?.rating || '4.8'}</Text>
                                <Text style={styles.profileDeliveries}>{employee?.totalOrders || 156} deliveries</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.editButton}>
                            <Icon name="create-outline" size={18} color={COLORS.white} />
                        </TouchableOpacity>
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

                    {/* Quick Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{employee?.todayOrders || 12}</Text>
                            <Text style={styles.statLabel}>Today</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>₹{employee?.todayEarnings || 850}</Text>
                            <Text style={styles.statLabel}>Earned</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>6.5h</Text>
                            <Text style={styles.statLabel}>Hours</Text>
                        </View>
                    </View>

                    {/* Refill Request Section */}
                    <Animatable.View animation="fadeInUp" delay={100} style={styles.refillCard}>
                        <View style={styles.refillInfo}>
                            <View style={styles.refillIconContainer}>
                                <Icon name="water-outline" size={24} color={COLORS.white} />
                            </View>
                            <View>
                                <Text style={styles.refillTitle}>Drum Refill</Text>
                                <Text style={styles.refillSubtitle}>Request tea stock refill</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.refillButton}
                            onPress={handleRefillRequest}>
                            <Text style={styles.refillButtonText}>Request Now</Text>
                        </TouchableOpacity>
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
                                        } else {
                                            Alert.alert('Info', `${item.title} coming soon`)
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
