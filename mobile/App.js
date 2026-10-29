import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import AuthScreen from './src/screens/AuthScreen';
import NewComplaintScreen from './src/screens/NewComplaintScreen';
import MyComplaintsScreen from './src/screens/MyComplaintsScreen';
import TrackCaseScreen from './src/screens/TrackCaseScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const TOKEN_KEY = '@aicte_citizen_token';
const USER_KEY = '@aicte_citizen_user';

export default function App() {
  const [token, setToken] = useState(null);
  const [citizen, setCitizen] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tabs: 'new' | 'my' | 'track' | 'profile'
  const [activeTab, setActiveTab] = useState('new');
  const [prefilledTrackCaseId, setPrefilledTrackCaseId] = useState('');

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const savedUser = await AsyncStorage.getItem(USER_KEY);
      if (savedToken && savedUser) {
        setToken(savedToken);
        setCitizen(JSON.parse(savedUser));
      }
    } catch (e) {
      console.warn('Session restore error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (newToken, userProfile) => {
    setToken(newToken);
    setCitizen(userProfile);
    setActiveTab('new');
    try {
      await AsyncStorage.setItem(TOKEN_KEY, newToken);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userProfile));
    } catch (e) {
      console.warn('Save session error', e);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      setToken(null);
      setCitizen(null);
    } catch (e) {
      console.warn('Logout error', e);
    }
  };

  const handleComplaintCreated = (caseId) => {
    setPrefilledTrackCaseId(caseId);
    setActiveTab('my');
  };

  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.splashText}>AICTE Grievance Portal...</Text>
      </View>
    );
  }

  // If not logged in, enforce Resend Email Authentication first
  if (!token || !citizen) {
    return (
      <>
        <StatusBar style="light" />
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Screen Body */}
      <View style={styles.body}>
        {activeTab === 'new' && (
          <NewComplaintScreen
            token={token}
            citizen={citizen}
            onComplaintCreated={handleComplaintCreated}
          />
        )}
        {activeTab === 'my' && (
          <MyComplaintsScreen
            token={token}
            onTrackExternal={(caseId) => {
              setPrefilledTrackCaseId(caseId);
              setActiveTab('track');
            }}
          />
        )}
        {activeTab === 'track' && (
          <TrackCaseScreen initialCaseId={prefilledTrackCaseId} />
        )}
        {activeTab === 'profile' && (
          <ProfileScreen citizen={citizen} onLogout={handleLogout} />
        )}
      </View>

      {/* Modern Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('new')}
        >
          <Ionicons
            name={activeTab === 'new' ? 'add-circle' : 'add-circle-outline'}
            size={24}
            color={activeTab === 'new' ? '#0284c7' : '#94a3b8'}
          />
          <Text style={[styles.tabLabel, activeTab === 'new' && styles.tabLabelActive]}>
            File Complaint
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('my')}
        >
          <Ionicons
            name={activeTab === 'my' ? 'folder-open' : 'folder-open-outline'}
            size={24}
            color={activeTab === 'my' ? '#0284c7' : '#94a3b8'}
          />
          <Text style={[styles.tabLabel, activeTab === 'my' && styles.tabLabelActive]}>
            My Complaints
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('track')}
        >
          <Ionicons
            name={activeTab === 'track' ? 'search' : 'search-outline'}
            size={24}
            color={activeTab === 'track' ? '#0284c7' : '#94a3b8'}
          />
          <Text style={[styles.tabLabel, activeTab === 'track' && styles.tabLabelActive]}>
            Track Any
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons
            name={activeTab === 'profile' ? 'person' : 'person-outline'}
            size={24}
            color={activeTab === 'profile' ? '#0284c7' : '#94a3b8'}
          />
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>
            Account
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  body: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#0284c7',
    fontWeight: '700',
  },
});
