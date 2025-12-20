import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';

// Mock types since we aren't importing the library
const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
};

export const configureGoogleSignIn = () => {
  if (Platform.OS === 'web') return;
  // In Expo Go, we cannot use native Google Sign In.
  // This function is a placeholder until you create a Development Build.
  console.log('Google Sign In authentication configured (Placeholder for Expo Go)');
};

export const signInWithGoogle = async () => {
  try {
    // Check if we are in Expo Go
    const isExpoGo = typeof  Constants !== 'undefined' && Constants.appOwnership === 'expo';
    
    // For now, in Expo Go, we will just show an alert.
    // To test this properly, you need: npx expo run:android
    Alert.alert(
      'Development Build Required',
      'Native Google Sign-In requires a custom Development Client. It does not work in Expo Go.\n\nPlease build a dev client: npx expo run:android'
    );
    return null;

    /* 
    // UNCOMMENT THIS BLOCK ONCE YOU HAVE A CUSTOM DEV CLIENT
    
    // Dynamic import to avoid crash in Expo Go
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');

    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    if (userInfo.data?.idToken) {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: userInfo.data.idToken,
      });

      if (error) throw error;
      return data;
    } else {
      throw new Error('No ID token present!');
    } 
    */

  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  }
};
