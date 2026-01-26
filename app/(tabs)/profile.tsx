import { useState, useEffect } from "react";
import { ScrollView, View, Alert, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Text, Button, Card } from "@/components/ui";
import { colors, spacing, layout } from "@/constants/theme";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing[4],
          paddingBottom: insets.bottom + spacing[8],
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text variant="h1">Profile</Text>
      </View>

      {/* Profile Card */}
      <Card variant="elevated" padding={6}>
        <View style={styles.profileContent}>
          <View style={styles.avatar}>
            <Text variant="display" color="textOnPrimary">
              {user?.email?.[0]?.toUpperCase() || "?"}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text variant="label">{user?.email || "Loading..."}</Text>
            <Text variant="caption" color="textMuted">
              Free Plan
            </Text>
          </View>
        </View>
      </Card>

      {/* Settings */}
      <View style={styles.section}>
        <Text variant="label" color="textSecondary" style={styles.sectionTitle}>
          Preferences
        </Text>
        <Card variant="outlined" padding={0}>
          <SettingRow
            icon="flame-outline"
            label="Cooking Skill"
            value="Home Cook"
          />
          <SettingRow
            icon="leaf-outline"
            label="Dietary Restrictions"
            value="None"
          />
          <SettingRow
            icon="scale-outline"
            label="Preferred Units"
            value="Imperial"
          />
          <SettingRow
            icon="mic-outline"
            label="Voice Enabled"
            value="On"
            last
          />
        </Card>
      </View>

      {/* Subscription */}
      <View style={styles.section}>
        <Text variant="label" color="textSecondary" style={styles.sectionTitle}>
          Subscription
        </Text>
        <Card variant="elevated" style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <View style={styles.planBadge}>
              <Text variant="buttonSmall" color="textOnPrimary">
                FREE
              </Text>
            </View>
            <Text variant="h4">Free Plan</Text>
          </View>
          <View style={styles.usageRow}>
            <Ionicons name="cloud-upload-outline" size={16} color="#92400E" />
            <Text variant="body" color="#78350F">
              3 imports remaining this month
            </Text>
          </View>
          <Button
            onPress={() =>
              Alert.alert("Coming Soon", "Upgrade functionality coming soon!")
            }
          >
            Upgrade to Pro
          </Button>
        </Card>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text variant="label" color="textSecondary" style={styles.sectionTitle}>
          Account
        </Text>
        <Card variant="outlined" padding={0}>
          <Pressable style={styles.actionRow} onPress={handleSignOut}>
            <View style={styles.actionContent}>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text variant="body" color="error">
                Sign Out
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.error} />
          </Pressable>
        </Card>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text variant="caption" color="textMuted">
          CHEZ v1.0.0
        </Text>
        <Text variant="caption" color="textMuted">
          Made with care for home cooks
        </Text>
      </View>
    </ScrollView>
  );
}

function SettingRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.settingRow, !last && styles.settingRowBorder]}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={20} color={colors.textSecondary} />
        <Text variant="body">{label}</Text>
      </View>
      <Text variant="body" color="textMuted">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: layout.screenPaddingHorizontal,
    gap: spacing[5],
    paddingBottom: spacing[8],
  },
  header: {
    gap: spacing[1],
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
    gap: spacing[1],
  },
  section: {
    gap: spacing[2],
  },
  sectionTitle: {
    marginLeft: spacing[1],
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[4],
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  subscriptionCard: {
    backgroundColor: "#FEF3C7",
    gap: spacing[3],
  },
  subscriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  planBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: 4,
  },
  usageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[4],
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  appInfo: {
    alignItems: "center",
    gap: spacing[1],
    paddingTop: spacing[4],
  },
});
