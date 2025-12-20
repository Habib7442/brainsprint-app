import { Redirect } from 'expo-router';
import WelcomeScreen from '../components/auth/WelcomeScreen';
import { useAuthStore } from '../store/useAuthStore';

export default function Index() {
  const { session } = useAuthStore();

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <WelcomeScreen />;
}
