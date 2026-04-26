import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import TabNavigator from './src/navigation/TabNavigator';
import { ContactsProvider } from './src/context/ContactsContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ContactsProvider>
        <NavigationContainer>
          <View style={styles.container}>
            <StatusBar style="dark" />
            <TabNavigator />
          </View>
        </NavigationContainer>
      </ContactsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF6FF',
  },
});
