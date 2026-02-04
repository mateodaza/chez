import { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { supabase } from "@/lib/supabase";
import { colors, spacing, borderRadius } from "@/constants/theme";

interface ModelBreakdown {
  model: string;
  count: number;
  cost: number;
  percentage: string;
}

interface Metrics {
  totalUsers: number;
  recipesImported: number;
  messagesLast24h: number;
  avgMessagesPerUser: number | string;
  topIntents: [string, number][];
  // AI Cost metrics
  totalCostMonth: string;
  avgCostPerRequest: string;
  totalRequestsMonth: number;
  modelBreakdown: ModelBreakdown[];
  // Session metrics
  sessionsLast7d: number;
  completionRate: string;
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text
        style={styles.metricValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics>({
    totalUsers: 0,
    recipesImported: 0,
    messagesLast24h: 0,
    avgMessagesPerUser: 0,
    topIntents: [],
    totalCostMonth: "0",
    avgCostPerRequest: "0",
    totalRequestsMonth: 0,
    modelBreakdown: [],
    sessionsLast7d: 0,
    completionRate: "0",
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setError(null);

    try {
      const { data, error: fnError } =
        await supabase.functions.invoke("admin-metrics");

      if (fnError) {
        // Server-side auth check - redirect if not admin
        const errorMessage = fnError.message || "";
        if (
          errorMessage.includes("403") ||
          errorMessage.includes("Forbidden")
        ) {
          router.replace("/");
          return;
        }
        throw fnError;
      }

      setMetrics(data);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load metrics";
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading metrics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard title="Total Users" value={metrics.totalUsers} />
          <MetricCard title="Recipes" value={metrics.recipesImported} />
          <MetricCard
            title="Messages (24h)"
            value={metrics.messagesLast24h}
            subtitle="Chat messages"
          />
          <MetricCard
            title="Avg/User"
            value={metrics.avgMessagesPerUser}
            subtitle="Messages per user"
          />
        </View>

        {/* AI Cost Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Costs (This Month)</Text>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Total Cost</Text>
            <Text style={styles.costValue}>${metrics.totalCostMonth}</Text>
          </View>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Avg per Request</Text>
            <Text style={styles.costValue}>${metrics.avgCostPerRequest}</Text>
          </View>
          <View style={[styles.costRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.costLabel}>Total Requests</Text>
            <Text style={styles.costValue}>{metrics.totalRequestsMonth}</Text>
          </View>
        </View>

        {/* Model Breakdown Section */}
        <View style={[styles.section, { marginTop: spacing[4] }]}>
          <Text style={styles.sectionTitle}>Model Usage (30 days)</Text>
          {(metrics.modelBreakdown?.length ?? 0) === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No AI requests yet</Text>
            </View>
          ) : (
            metrics.modelBreakdown?.map((model) => (
              <View key={model.model} style={styles.modelRow}>
                <View style={styles.modelInfo}>
                  <Text style={styles.modelName}>{model.model}</Text>
                  <Text style={styles.modelStats}>
                    {model.count} requests · ${model.cost.toFixed(4)}
                  </Text>
                </View>
                <View style={styles.modelPercentage}>
                  <Text style={styles.percentageText}>{model.percentage}%</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Session Metrics */}
        <View style={[styles.section, { marginTop: spacing[4] }]}>
          <Text style={styles.sectionTitle}>Cook Sessions (7 days)</Text>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Sessions Started</Text>
            <Text style={styles.costValue}>{metrics.sessionsLast7d}</Text>
          </View>
          <View style={[styles.costRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.costLabel}>Completion Rate</Text>
            <Text style={styles.costValue}>{metrics.completionRate}%</Text>
          </View>
        </View>

        {/* Top Intents Section */}
        <View style={[styles.section, { marginTop: spacing[4] }]}>
          <Text style={styles.sectionTitle}>Top Intents (7 days)</Text>
          {(metrics.topIntents?.length ?? 0) === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No chat data yet</Text>
            </View>
          ) : (
            metrics.topIntents?.map(([intent, count]) => (
              <View key={intent} style={styles.intentRow}>
                <Text style={styles.intentName}>{intent}</Text>
                <Text style={styles.intentCount}>{count}</Text>
              </View>
            ))
          )}
        </View>

        {/* Pull to refresh hint */}
        <Text style={styles.refreshHint}>Pull down to refresh</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing[4],
    paddingTop: spacing[5],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing[3],
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[6],
  },
  errorText: {
    color: colors.error,
    textAlign: "center",
    fontSize: 16,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  metricCard: {
    backgroundColor: colors.surface,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    width: "47%",
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing[1],
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    lineHeight: 32,
    includeFontPadding: false,
  },
  metricSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing[1],
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing[3],
  },
  intentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  intentName: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  intentCount: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  emptyState: {
    paddingVertical: spacing[4],
    alignItems: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  refreshHint: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing[4],
  },
  // Cost section styles
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  costLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  costValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  // Model breakdown styles
  modelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  modelStats: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  modelPercentage: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
});
