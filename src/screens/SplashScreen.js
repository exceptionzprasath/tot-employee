import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, StatusBar, Dimensions } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { COLORS } from '../utils/colors';

const { width } = Dimensions.get('window');

const SplashScreen = ({ onFinish }) => {
    const [step, setStep] = useState(1);

    useEffect(() => {
        // Step 1: Show Foodman (Company) logo
        const timer1 = setTimeout(() => {
            setStep(2);
        }, 2500);

        // Step 2: Show App logo
        const timer2 = setTimeout(() => {
            onFinish();
        }, 5000);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {step === 1 && (
                <Animatable.View
                    animation="zoomIn"
                    duration={1000}
                    style={styles.logoContainer}
                >
                    <Animatable.View animation="fadeOut" delay={2000} duration={500}>
                        <Image
                            source={require('../assets/foodman.png')}
                            style={styles.companyLogo}
                            resizeMode="contain"
                        />
                    </Animatable.View>
                </Animatable.View>
            )}

            {step === 2 && (
                <Animatable.View
                    animation="fadeIn"
                    duration={800}
                    style={styles.logoContainer}
                >
                    <Image
                        source={require('../assets/logo.png')}
                        style={styles.appLogo}
                        resizeMode="contain"
                    />
                    <Animatable.Text
                        animation="fadeInUp"
                        delay={500}
                        style={styles.tagline}
                    >
                        Premium Tea & Snacks
                    </Animatable.Text>
                </Animatable.View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    companyLogo: {
        width: width * 0.8,
        height: width * 0.8,
    },
    appLogo: {
        width: width * 0.7,
        height: width * 0.7,
    },
    tagline: {
        marginTop: 20,
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.primary,
        letterSpacing: 1.2,
    }
});

export default SplashScreen;
