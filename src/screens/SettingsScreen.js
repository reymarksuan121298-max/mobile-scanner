import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';
import { useApp } from '../context/AppContext';
import apiClient from '../services/api';

export default function SettingsScreen() {
  const {
    settings,
    updateAppSettings,
    customToken,
    customBaseUrl,
    saveApiCredentials,
    showToast,
  } = useApp();

  const [baseUrlInput, setBaseUrlInput] = useState(customBaseUrl || APP_CONFIG.defaultBaseUrl);
  const [tokenInput, setTokenInput] = useState(customToken || APP_CONFIG.defaultToken);
  const [isTesting, setIsTesting] = useState(false);

  const handleToggleVibrate = (val) => {
    updateAppSettings({ ...settings, vibrateOnScan: val });
  };

  const handleToggleSound = (val) => {
    updateAppSettings({ ...settings, soundOnScan: val });
  };

  const handleToggleAutoOpen = (val) => {
    updateAppSettings({ ...settings, autoOpenDetails: val });
  };

  const handleSaveApi = async () => {
    await saveApiCredentials(tokenInput, baseUrlInput);
  };

  const handleResetDefaults = () => {
    Alert.alert(
      'Reset API Defaults',
      'Reset API Base URL and Bearer token to factory default configuration?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            setBaseUrlInput(APP_CONFIG.defaultBaseUrl);
            setTokenInput(APP_CONFIG.defaultToken);
            await saveApiCredentials('', '');
          },
        },
      ]
    );
  };

  const handleSelectPreset = (preset) => {
    setBaseUrlInput(preset.baseUrl);
    setTokenInput(preset.token);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      // Test ping to unclaimedReceipts or claim endpoint
      const res = await apiClient.get(`${APP_CONFIG.endpoints.unclaimedReceipts}?isClaim=0`);
      Alert.alert('Connection Successful', `Connected to API Server!\n\nStatus: 200 OK\nBase URL: ${baseUrlInput}\nReceipts Available: ${res.data?.data?.length || 0}`);
    } catch (err) {
      Alert.alert('Connection Failed', err.message || 'Could not establish connection to the specified API server.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SETTINGS & CONFIGURATION</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Scanning Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SCANNER PREFERENCES</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLabelCol}>
              <Text style={styles.settingLabel}>Haptic Vibration</Text>
              <Text style={styles.settingSub}>Vibrate upon successful QR code detection</Text>
            </View>
            <Switch
              value={settings.vibrateOnScan}
              onValueChange={handleToggleVibrate}
              trackColor={{ false: COLORS.border, true: COLORS.accent }}
              thumbColor={settings.vibrateOnScan ? COLORS.primary : '#F4F3F4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabelCol}>
              <Text style={styles.settingLabel}>Audio Tone Feedback</Text>
              <Text style={styles.settingSub}>Play beeper chime on scan</Text>
            </View>
            <Switch
              value={settings.soundOnScan}
              onValueChange={handleToggleSound}
              trackColor={{ false: COLORS.border, true: COLORS.accent }}
              thumbColor={settings.soundOnScan ? COLORS.primary : '#F4F3F4'}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingLabelCol}>
              <Text style={styles.settingLabel}>Auto-Open Ticket Card</Text>
              <Text style={styles.settingSub}>Directly transition to ticket details upon scanning</Text>
            </View>
            <Switch
              value={settings.autoOpenDetails}
              onValueChange={handleToggleAutoOpen}
              trackColor={{ false: COLORS.border, true: COLORS.accent }}
              thumbColor={settings.autoOpenDetails ? COLORS.primary : '#F4F3F4'}
            />
          </View>
        </View>

        {/* API Server Configuration */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>API SERVER CONFIGURATION</Text>
            <TouchableOpacity onPress={handleResetDefaults}>
              <Text style={styles.resetText}>RESET DEFAULTS</Text>
            </TouchableOpacity>
          </View>

          {/* Environment Presets */}
          <View style={styles.presetsContainer}>
            <Text style={styles.presetLabel}>SERVER ENVIRONMENT PRESETS</Text>
            <View style={styles.presetButtonsRow}>
              {APP_CONFIG.serverPresets?.map((preset) => {
                const isSelected = baseUrlInput.trim() === preset.baseUrl.trim();
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[styles.presetBtn, isSelected && styles.presetBtnActive]}
                    onPress={() => handleSelectPreset(preset)}
                  >
                    <Text style={[styles.presetBtnTitle, isSelected && styles.presetBtnTitleActive]}>
                      {preset.name}
                    </Text>
                    <Text style={[styles.presetBtnSub, isSelected && styles.presetBtnSubActive]} numberOfLines={1}>
                      {preset.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>BASE API URL</Text>
            <TextInput
              style={styles.input}
              value={baseUrlInput}
              onChangeText={setBaseUrlInput}
              placeholder="https://stl-ldn-api.com"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>BEARER AUTHENTICATION TOKEN</Text>
            <TextInput
              style={[styles.input, styles.tokenInput]}
              value={tokenInput}
              onChangeText={setTokenInput}
              placeholder="Bearer 66338|..."
              autoCapitalize="none"
              autoCorrect={false}
              multiline={true}
              numberOfLines={2}
            />
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTestConnection}
              disabled={isTesting}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.testBtnText}>⚡ TEST PING</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveApi}>
              <Text style={styles.saveBtnText}>SAVE API CONFIG</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info Card */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>LUCKY BETPLAY CORPORATION</Text>
          <Text style={styles.aboutSub}>STL Claim Operations • QR Terminal</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0 (Pure React Native Build 100)</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  resetText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.danger,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  settingLabelCol: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  settingSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  presetsContainer: {
    gap: 6,
    marginBottom: 4,
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  presetBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EFF6FF',
  },
  presetBtnTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  presetBtnTitleActive: {
    color: COLORS.primary,
  },
  presetBtnSub: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  presetBtnSubActive: {
    color: COLORS.primaryLight,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  tokenInput: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  testBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 11,
  },
  saveBtn: {
    flex: 1.5,
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: COLORS.accent,
    fontWeight: '900',
    fontSize: 11,
  },
  aboutCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  aboutTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  aboutSub: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  aboutVersion: {
    color: '#94A3B8',
    fontSize: 9,
    marginTop: 4,
  },
});
