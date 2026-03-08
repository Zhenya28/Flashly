import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography } from '@/components/ui/Typography';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { ArrowRight, Zap } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface HeroCardProps {
  dueCards: number;
  onStartLearning: () => void;
}

export function HeroCard({ dueCards, onStartLearning }: HeroCardProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Theme.heroGradientStart, Theme.heroGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.topRow}>
          <View style={styles.textContent}>
            <Typography variant="small" color="rgba(255,255,255,0.8)" style={{ marginBottom: 4 }}>
              Gotowy do nauki?
            </Typography>
            <Typography variant="h2" color="#FFFFFF" style={{ marginBottom: 8 }}>
              Rozpocznij sesję
            </Typography>
            <Typography variant="body" color="rgba(255,255,255,0.9)">
              Masz <Typography variant="bodySemi" color="#FFFFFF">{dueCards} fiszek</Typography> do powtórki.
            </Typography>
          </View>

          <View style={styles.iconBadge}>
            <Zap size={24} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onStartLearning}
          style={styles.button}
        >
          <Typography variant="bodySemi" color="#FFFFFF" style={{ marginRight: 8 }}>
            Ucz się teraz
          </Typography>
          <ArrowRight size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  gradient: {
    padding: Spacing.lg,
    paddingVertical: 32,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textContent: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  iconBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  button: {
    marginTop: Spacing.lg,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
});
