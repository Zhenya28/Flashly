import React, { useEffect, useCallback, useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Alert, StyleSheet, Switch, Platform, Modal, TextInput, Pressable, KeyboardAvoidingView } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  LogOut,
  Bell,
  Target,
  Minus,
  Plus,
  ChevronRight,
  BarChart3,
  Settings,
  Pencil,
  RefreshCw,
} from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { useThemeStore } from '@/store/themeStore';

import { Typography } from '@/components/ui/Typography';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { ProfileService } from '@/services/profile';
import { StreakCard } from '@/components/features/stats';
import { ThemeSwitcher } from '@/components/features/profile';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function ProfileScreen() {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme, shadows);
  const router = useRouter();
  const { user, logout, checkAuth } = useAuthStore();
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();
  const {
    stats,
    settings,
    isLoading,
    fetchStats,
    fetchSettings,
    updateDailyGoal,
    updateNotificationTime
  } = useProfileStore();

  const [localDailyGoal, setLocalDailyGoal] = useState(10);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchStats(), fetchSettings()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchStats, fetchSettings]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
      fetchSettings();
    }, [fetchStats, fetchSettings])
  );

  useEffect(() => {
    if (settings) {
      setLocalDailyGoal(settings.dailyGoal);
      setNotificationsEnabled(settings.notificationTime !== null);
    }
  }, [settings]);

  const handleLogout = () => {
    Alert.alert(
      'Wylogowanie',
      'Czy na pewno chcesz się wylogować?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Wyloguj',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (e) {
              console.error('Logout error:', e);
            }
          }
        }
      ]
    );
  };

  const handleDailyGoalChange = (increment: boolean) => {
    const newGoal = increment
      ? Math.min(localDailyGoal + 5, 50)
      : Math.max(localDailyGoal - 5, 5);
    setLocalDailyGoal(newGoal);
    updateDailyGoal(newGoal);
  };

  const toggleNotifications = (value: boolean) => {
    Haptics.selectionAsync();
    setNotificationsEnabled(value);
    updateNotificationTime(value ? '09:00' : null);
  };

  const avatarUrlProp = user?.avatar_url || ProfileService.generateDiceBearAvatar(user?.email || 'default');
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrlProp);

  useEffect(() => {
    if (user?.avatar_url) {
      setCurrentAvatarUrl(user.avatar_url);
    }
  }, [user?.avatar_url]);

  return (
    <GradientBackground variant="subtle">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Theme.primary}
            />
          }
        >
          {/* Profile Header (Avatar) */}
          <Animated.View
            entering={FadeInDown.delay(50).duration(500)}
            style={styles.profileSection}
          >
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: currentAvatarUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={300}
                />
              </View>

              <TouchableOpacity 
                style={styles.refreshAvatarButton} 
                onPress={async () => {
                  try {
                    const newSeed = `${user?.email || 'user'}-${Date.now()}`;
                    const newAvatarUrl = ProfileService.generateDiceBearAvatar(newSeed);
                    setCurrentAvatarUrl(newAvatarUrl); // Immediate local update
                    
                    await ProfileService.updateProfile({ avatar_url: newAvatarUrl });
                    await checkAuth(); // Sync with backend
                    Alert.alert('Sukces', 'Avatar został odświeżony');
                  } catch (e) {
                    Alert.alert('Błąd', 'Nie udało się zmienić avatara');
                    // Revert on error if needed, or just let checkAuth fix it eventually
                  }
                }}
                activeOpacity={0.7}
              >
                <RefreshCw size={14} color={Theme.primary} />
                <Typography variant="caption" color={Theme.primary} style={{ marginLeft: 4 }}>
                  Zmień avatar
                </Typography>
              </TouchableOpacity>

              <View style={styles.profileInfo}>
                <TouchableOpacity
                  style={styles.nameRow}
                  onPress={() => {
                    setEditName(user?.name || '');
                    setShowEditProfile(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Typography variant="h1" color={Theme.text}>
                    {user?.name || 'Użytkownik'}
                  </Typography>
                  <Pencil size={18} color={Theme.textMuted} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
                <Typography variant="body" color={Theme.textMuted} style={styles.email}>
                  {user?.email || 'Brak e-mail'}
                </Typography>
              </View>
            </View>
          </Animated.View>

          {/* Activity Section */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(500)}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <BarChart3 size={20} color={Theme.primary} />
              <Typography variant="h3" color={Theme.text}>Aktywność</Typography>
            </View>
            <StreakCard 
              streak={stats?.currentStreak || 0}
              todayCompleted={stats ? (stats.weeklyProgress[(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)] > 0) : false}
            />
          </Animated.View>

          {/* Settings Section */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(500)}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Settings size={20} color={Theme.primary} />
              <Typography variant="h3" color={Theme.text}>Ustawienia</Typography>
            </View>

            <GlassCard variant="default">
              {/* Daily Goal */}
              <View style={styles.settingRow}>
                <View style={styles.linkLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: Theme.primaryMuted }]}>
                    <Target size={22} color={Theme.primary} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Typography variant="bodySemi" color={Theme.text}>Cel dzienny</Typography>
                    <Typography variant="caption" color={Theme.textMuted}>Fiszki na dzień</Typography>
                  </View>
                </View>
                <View style={styles.goalControl}>
                  <TouchableOpacity
                    onPress={() => handleDailyGoalChange(false)}
                    style={[styles.goalButton, localDailyGoal <= 5 && styles.goalButtonDisabled]}
                    disabled={localDailyGoal <= 5}
                  >
                    <Minus size={16} color={Theme.text} />
                  </TouchableOpacity>
                  <Typography variant="h4" color={Theme.text} style={styles.goalValue}>
                    {localDailyGoal}
                  </Typography>
                  <TouchableOpacity
                    onPress={() => handleDailyGoalChange(true)}
                    style={[styles.goalButton, localDailyGoal >= 50 && styles.goalButtonDisabled]}
                    disabled={localDailyGoal >= 50}
                  >
                    <Plus size={16} color={Theme.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </GlassCard>

            {/* Theme Switcher — standalone card (has its own container) */}
            <View style={{ marginTop: Spacing.md }}>
              <ThemeSwitcher value={themeMode} onChange={setThemeMode} />
            </View>

            <GlassCard variant="default" style={{ marginTop: Spacing.md }}>
              {/* Notifications */}
              <View style={styles.settingRow}>
                <View style={styles.linkLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: Theme.warningLight }]}>
                    <Bell size={22} color={Theme.warning} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Typography variant="bodySemi" color={Theme.text}>
                      Powiadomienia
                    </Typography>
                    {notificationsEnabled ? (
                      <View style={styles.timeSubtitle}>
                        <Typography variant="caption" color={Theme.textMuted}>
                          Codziennie o
                        </Typography>
                        <TouchableOpacity
                          onPress={() => setShowTimePicker(true)}
                          activeOpacity={0.7}
                          style={styles.timeBadge}
                        >
                           <Typography variant="caption" color={Theme.primary} style={styles.timeBadgeText}>
                             {settings?.notificationTime?.substring(0, 5) || '09:00'}
                           </Typography>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Typography variant="caption" color={Theme.textMuted}>Przypomnienia o nauce</Typography>
                    )}
                  </View>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={toggleNotifications}
                  trackColor={{ false: Theme.border, true: Theme.primary }}
                  thumbColor={Platform.OS === 'ios' ? '#fff' : Theme.primary}
                />
              </View>
            </GlassCard>

            {/* Time Picker Modal */}
            {showTimePicker && Platform.OS === 'ios' && settings && (
             <Modal visible={showTimePicker} transparent animationType="fade">
                <Pressable style={styles.modalOverlay} onPress={() => setShowTimePicker(false)}>
                  <GlassCard variant="default" style={{ width: 300 }}>
                    <View style={styles.pickerDoneButton}>
                      <TouchableOpacity onPress={async () => {
                        setShowTimePicker(false);
                      }}>
                        <Typography variant="bodySemi" color={Theme.primary}>Gotowe</Typography>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={new Date(`2000-01-01T${settings?.notificationTime || '09:00:00'}`)}
                      mode="time"
                      display="spinner"
                      onChange={(e, date) => {
                        if (date) {
                          const timeStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
                          updateNotificationTime(timeStr);
                        }
                      }}
                      style={{ height: 180 }}
                      textColor={Theme.text}
                    />
                  </GlassCard>
                </Pressable>
             </Modal>
            )}
          </Animated.View>

          {/* Logout */}
          <MotiLogout onPress={handleLogout} style={styles.logoutButton} theme={Theme}>
            <LogOut size={20} color={Theme.destructive} />
            <Typography variant="bodySemi" color={Theme.destructive}>
              Wyloguj się
            </Typography>
          </MotiLogout>

          <Typography variant="caption" color={Theme.textMuted} style={styles.versionText}>
            Wersja 1.0.0
          </Typography>

        </ScrollView>
      </SafeAreaView>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditProfile}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowEditProfile(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <Typography variant="h3" color={Theme.text} style={{ marginBottom: Spacing.md, textAlign: 'center' }}>
                Zmień imię
              </Typography>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Wpisz nowe imię"
                placeholderTextColor={Theme.textMuted}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => setShowEditProfile(false)}
                  activeOpacity={0.7}
                >
                  <Typography variant="bodySemi" color={Theme.textSecondary}>Anuluj</Typography>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButtonSave}
                  onPress={async () => {
                    if (editName.trim()) {
                      setShowEditProfile(false);
                      try {
                        await ProfileService.updateProfile({ full_name: editName.trim() });
                        await checkAuth();
                        Alert.alert('Sukces', 'Imię zostało zaktualizowane');
                      } catch (e) {
                        Alert.alert('Błąd', 'Nie udało się zaktualizować imienia');
                      }
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Typography variant="bodySemi" color="#FFFFFF">Zapisz</Typography>
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </GradientBackground>
  );
}

// Wrapper for Moti/Animated button
const MotiLogout = ({ onPress, children, style, theme }: any) => (
  <TouchableOpacity onPress={onPress} style={style} activeOpacity={0.8}>
    {children}
  </TouchableOpacity>
);

const getStyles = (Theme: any, shadows: any) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    paddingTop: Spacing.xl,
  },
  
  // Profile Section
  profileSection: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.xs,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Theme.backgroundAlt,
    borderWidth: 4,
    borderColor: Theme.card,
    ...shadows.md,
  },

  profileInfo: {
    alignItems: 'center',
  },
  email: {
    marginTop: Spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginTop: 0,
    marginBottom: Spacing.md,
  },

  // Sections
  section: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionLast: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },

  // Link Row
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingDivider: {
    height: 1,
    backgroundColor: Theme.borderLight,
    marginHorizontal: Spacing.lg,
  },

  // Goal Control
  goalControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.backgroundAlt,
    borderRadius: Radius.lg,
    padding: Spacing.xs,
  },
  goalButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalButtonDisabled: {
    opacity: 0.5,
  },
  goalValue: {
    minWidth: 48,
    textAlign: 'center',
  },

  // Time subtitle with badge
  timeSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeBadge: {
    backgroundColor: Theme.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  timeBadgeText: {
    fontWeight: '600',
  },
  pickerContainer: {
    paddingBottom: Spacing.md,
  },
  pickerDoneButton: {
    alignItems: 'flex-end',
    paddingRight: Spacing.lg,
    paddingBottom: Spacing.sm,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    backgroundColor: Theme.destructiveLight,
    borderRadius: Radius.xl,
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing.lg, 
  },
  versionText: {
    textAlign: 'center',
  },

  // Edit Name Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Theme.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
    ...shadows.card,
  },
  modalInput: {
    backgroundColor: Theme.backgroundAlt,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: Theme.text,
    borderWidth: 1,
    borderColor: Theme.border,
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    backgroundColor: Theme.backgroundAlt,
    alignItems: 'center',
  },
  modalButtonSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    backgroundColor: Theme.primary,
    alignItems: 'center',
  },

});
