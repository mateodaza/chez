# Shipyard Hackathon Prep - TODO List

**Goal:** Increase winning chances from 70% → 95%
**Timeline:** 2-3 days before RevenueCat integration
**Current Status:** 85% ready - need critical polish

---

## Phase 1: CRITICAL - Demo Killers (7 hours) 🔴

**Must complete before demo submission**

### 1.1 Add Analytics Tracking + Admin Dashboard (4 hours)

**Priority:** 🔴 CRITICAL
**Why:** Judges will ask "how do you measure success?" - you need an answer AND you need to see real numbers

**Implementation:**

```bash
npm install @supabase/supabase-js
```

**Files to create:**

- `lib/analytics.ts` (tracking helper)
- `app/(admin)/dashboard.tsx` (admin metrics screen)

**Files to modify:**

- `app/(tabs)/index.tsx` (add tracking)
- `app/import.tsx` (track imports)
- `app/cook/[id].tsx` (track cooking events)
- `app/recipe/[id].tsx` (track version saves)

**Events to track:**

```typescript
// lib/analytics.ts
export const trackEvent = async (
  eventName: string,
  properties?: Record<string, any>
) => {
  await supabase.from('analytics_events').insert({
    event_name: eventName,
    properties,
    user_id: (await supabase.auth.getUser()).data.user?.id,
    created_at: new Date().toISOString(),
  });
};

// Key events:
- user_signed_up
- recipe_imported (source: tiktok/instagram/youtube/manual)
- cook_started (recipe_id, mode: casual/chef)
- cook_completed (recipe_id, duration_minutes)
- chat_message_sent (intent_type)
- my_version_created (learning_type)
- paywall_shown
- subscription_started
```

**Database migration:**

```sql
-- Create in Supabase SQL Editor
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  properties JSONB,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_analytics_events_user ON public.analytics_events(user_id, created_at DESC);
CREATE INDEX idx_analytics_events_name ON public.analytics_events(event_name, created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
```

**Admin Dashboard (1 hour):**

```tsx
// app/(admin)/dashboard.tsx
import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const ADMIN_USER_ID = "YOUR_USER_ID_HERE"; // Replace with your UUID
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    recipesImported: 0,
    messagesLast24h: 0,
    avgMessagesPerUser: 0,
    topIntents: [],
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAdmin();
    fetchMetrics();
  }, []);

  const checkAdmin = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id !== ADMIN_USER_ID) {
      router.replace("/");
    }
  };

  const fetchMetrics = async () => {
    setRefreshing(true);

    // Total users
    const { count: users } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    // Recipes imported
    const { count: recipes } = await supabase
      .from("recipes")
      .select("*", { count: "exact", head: true });

    // Messages last 24h
    const { count: messages } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "chat_message_sent")
      .gte("created_at", new Date(Date.now() - 86400000).toISOString());

    // Top intents (last 7 days)
    const { data: intents } = await supabase
      .from("analytics_events")
      .select("properties")
      .eq("event_name", "chat_message_sent")
      .gte("created_at", new Date(Date.now() - 604800000).toISOString());

    const intentCounts = (intents || []).reduce((acc, { properties }) => {
      const intent = properties?.intent_type || "unknown";
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {});

    setMetrics({
      totalUsers: users || 0,
      recipesImported: recipes || 0,
      messagesLast24h: messages || 0,
      avgMessagesPerUser: users ? (messages / users).toFixed(1) : 0,
      topIntents: Object.entries(intentCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
    });

    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, padding: 20, backgroundColor: "#fff" }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={fetchMetrics} />
      }
    >
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 20 }}>
        Admin Dashboard
      </Text>

      <MetricCard title="Total Users" value={metrics.totalUsers} />
      <MetricCard title="Recipes Imported" value={metrics.recipesImported} />
      <MetricCard title="Messages (24h)" value={metrics.messagesLast24h} />
      <MetricCard title="Avg Msgs/User" value={metrics.avgMessagesPerUser} />

      <Text
        style={{
          fontSize: 18,
          fontWeight: "600",
          marginTop: 20,
          marginBottom: 10,
        }}
      >
        Top Intents (7 days)
      </Text>
      {metrics.topIntents.map(([intent, count]) => (
        <View
          key={intent}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            padding: 12,
            backgroundColor: "#F5F5F5",
            borderRadius: 8,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 14 }}>{intent}</Text>
          <Text style={{ fontSize: 14, fontWeight: "600" }}>{count}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <View
      style={{
        backgroundColor: "#F5F5F5",
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontSize: 14, color: "#666" }}>{title}</Text>
      <Text style={{ fontSize: 32, fontWeight: "700", marginTop: 4 }}>
        {value}
      </Text>
    </View>
  );
}
```

**Acceptance criteria:**

- ✅ 10+ events tracked across key user actions
- ✅ Admin dashboard shows live metrics (total users, recipes, messages, top intents)
- ✅ Pull-to-refresh updates metrics
- ✅ Only accessible to your user ID
- ✅ Events include user_id and timestamp

---

### 1.2 Fix Rate Limit UX (2 hours)

**Priority:** 🔴 CRITICAL
**Why:** Users will hit 429 errors with no context and churn

**Files to modify:**

- `app/cook/[id].tsx` (lines 650-700)
- `components/ui/RateLimitBanner.tsx` (create new)

**Implementation:**

**Step 1:** Create rate limit banner component

```tsx
// components/ui/RateLimitBanner.tsx
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants/theme";

interface RateLimitBannerProps {
  current: number;
  limit: number;
  tier: "free" | "chef";
}

export function RateLimitBanner({
  current,
  limit,
  tier,
}: RateLimitBannerProps) {
  const percentage = (current / limit) * 100;
  const isWarning = percentage >= 80;

  if (percentage < 70) return null; // Only show when close to limit

  return (
    <View
      style={{
        backgroundColor: isWarning ? "#FEF2F2" : "#FFFBEB",
        padding: spacing[3],
        margin: spacing[4],
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[2],
      }}
    >
      <Ionicons
        name={isWarning ? "alert-circle" : "information-circle"}
        size={20}
        color={isWarning ? colors.error : colors.warning}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "600" }}>
          {isWarning
            ? `${limit - current} messages left today`
            : "Getting close to limit"}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          {tier === "free"
            ? "Upgrade to Chef for 500 messages/day"
            : "Resets at midnight UTC"}
        </Text>
      </View>
    </View>
  );
}
```

**Step 2:** Add to cook screen

```tsx
// app/cook/[id].tsx - add after line 500
const [rateLimit, setRateLimit] = useState<{
  current: number;
  limit: number;
} | null>(null);

// Update handleSendQuestion to track rate limit
const response = await fetch(/* ... */);
const data = await response.json();

if (response.status === 429) {
  Alert.alert(
    "Daily Limit Reached",
    `You've used all ${data.limit} messages for today. Upgrade to Chef mode for 500 messages/day, or try again tomorrow.`,
    [
      { text: "Upgrade to Chef", onPress: () => router.push("/settings") },
      { text: "OK" },
    ]
  );
  return;
}

// Track remaining messages
if (data.rate_limit) {
  setRateLimit(data.rate_limit);
}
```

**Step 3:** Display banner above chat input

```tsx
// app/cook/[id].tsx - add before ChatModal component
{
  rateLimit && (
    <RateLimitBanner
      current={rateLimit.current}
      limit={rateLimit.limit}
      tier={userTier}
    />
  );
}
```

**Acceptance criteria:**

- ✅ Banner shows when user reaches 70% of limit
- ✅ Warning at 80% of limit
- ✅ 429 error shows clear message with "Upgrade" CTA
- ✅ Shows when limit resets (midnight UTC)

---

### 1.3 Polish Onboarding Flow (1 hour)

**Priority:** 🔴 CRITICAL
**Why:** First impression matters - judges and users will drop off if confused

**Files to modify:**

- `app/(onboarding)/welcome.tsx`
- `app/(onboarding)/mode-select.tsx`
- `app/(tabs)/index.tsx`

**Changes:**

**Step 1:** Add skip button to welcome slides

```tsx
// app/(onboarding)/welcome.tsx - add to header (line 207)
<View style={styles.header}>
  <Button variant="ghost" size="sm" onPress={handleSkip}>
    Skip
  </Button>
  <Text style={{ fontSize: 12, color: colors.textMuted }}>
    {currentIndex + 1} / {featureSlides.length}
  </Text>
</View>
```

**Step 2:** Pre-select "Casual" mode

```tsx
// app/(onboarding)/mode-select.tsx - set initial selection
const [selectedMode, setSelectedMode] = useState<"casual" | "chef">("casual");
```

**Step 3:** Add helpful empty state to home

```tsx
// app/(tabs)/index.tsx - replace empty state with helpful CTA
{
  filteredRecipes.length === 0 && (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: spacing[6],
      }}
    >
      <Ionicons name="restaurant-outline" size={64} color={colors.textMuted} />
      <Text variant="h3" style={{ marginTop: spacing[4], textAlign: "center" }}>
        Your recipe library is empty
      </Text>
      <Text
        variant="body"
        color="textSecondary"
        style={{ marginTop: spacing[2], textAlign: "center" }}
      >
        Import your first recipe from TikTok, Instagram, or YouTube
      </Text>
      <Button
        onPress={() => router.push("/(tabs)/import")}
        style={{ marginTop: spacing[4] }}
      >
        Import Recipe
      </Button>
    </View>
  );
}
```

**Acceptance criteria:**

- ✅ Users can skip welcome slides
- ✅ Casual mode pre-selected (faster onboarding)
- ✅ Empty home state guides users to import

---

## Phase 2: HIGH IMPACT - Demo Polish (4 hours) 🟠

**Strong recommend - will improve judge impression significantly**

### 2.1 Add Subscription Status UI (2 hours)

**Priority:** 🟠 HIGH
**Why:** Judges need to see freemium model in action

**Files to modify:**

- `app/(tabs)/settings.tsx`
- `components/SubscriptionCard.tsx` (create new)

**Implementation:**

**Step 1:** Create subscription card component

```tsx
// components/SubscriptionCard.tsx
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "@/constants/theme";
import { useRouter } from "expo-router";

interface SubscriptionCardProps {
  tier: "free" | "chef";
  recipesImported: number;
  recipesLimit: number;
  messagesUsed: number;
  messagesLimit: number;
}

export function SubscriptionCard({
  tier,
  recipesImported,
  recipesLimit,
  messagesUsed,
  messagesLimit,
}: SubscriptionCardProps) {
  const router = useRouter();
  const isFree = tier === "free";

  return (
    <View
      style={{
        backgroundColor: isFree ? colors.surface : "#FFF7ED",
        borderRadius: borderRadius.xl,
        padding: spacing[4],
        borderWidth: isFree ? 1 : 2,
        borderColor: isFree ? colors.border : colors.primary,
        marginBottom: spacing[4],
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>
            {isFree ? "Free Plan" : "Chef Plan ⭐"}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginTop: spacing[1],
            }}
          >
            {isFree ? "Limited access" : "Unlimited everything"}
          </Text>
        </View>
        {isFree && (
          <Pressable
            onPress={() => router.push("/paywall")}
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[2],
              borderRadius: borderRadius.full,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Upgrade</Text>
          </Pressable>
        )}
      </View>

      {isFree && (
        <View style={{ marginTop: spacing[4], gap: spacing[3] }}>
          {/* Recipes limit */}
          <View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: spacing[1],
              }}
            >
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                Recipes imported
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "600" }}>
                {recipesImported} / {recipesLimit}
              </Text>
            </View>
            <View
              style={{
                height: 6,
                backgroundColor: colors.border,
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${(recipesImported / recipesLimit) * 100}%`,
                  height: "100%",
                  backgroundColor:
                    recipesImported >= recipesLimit
                      ? colors.error
                      : colors.primary,
                }}
              />
            </View>
          </View>

          {/* Messages limit */}
          <View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: spacing[1],
              }}
            >
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                AI messages today
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "600" }}>
                {messagesUsed} / {messagesLimit}
              </Text>
            </View>
            <View
              style={{
                height: 6,
                backgroundColor: colors.border,
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${(messagesUsed / messagesLimit) * 100}%`,
                  height: "100%",
                  backgroundColor:
                    messagesUsed >= messagesLimit
                      ? colors.error
                      : colors.primary,
                }}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
```

**Step 2:** Add to settings screen

```tsx
// app/(tabs)/settings.tsx - add after SafeAreaView
const [subscriptionStatus, setSubscriptionStatus] = useState({
  tier: "free" as "free" | "chef",
  recipesImported: 2,
  recipesLimit: 5,
  messagesUsed: 15,
  messagesLimit: 50,
});

// Fetch from Supabase on mount
useEffect(() => {
  fetchSubscriptionStatus();
}, []);

return (
  <SafeAreaView>
    <ScrollView>
      <SubscriptionCard {...subscriptionStatus} />
      {/* existing settings */}
    </ScrollView>
  </SafeAreaView>
);
```

**Acceptance criteria:**

- ✅ Shows subscription tier (Free/Chef)
- ✅ Shows recipes imported progress bar
- ✅ Shows AI messages remaining
- ✅ "Upgrade" button visible for free users

---

### 2.2 Differentiate Chef vs Casual Mode (2 hours)

**Priority:** 🟠 HIGH
**Why:** Judges will ask "what's the difference?" - need to show clear value

**Files to modify:**

- `app/cook/[id].tsx`
- `app/(onboarding)/mode-select.tsx`

**Changes:**

**Step 1:** Update mode-select descriptions

```tsx
// app/(onboarding)/mode-select.tsx
const modes = [
  {
    id: "casual",
    title: "Casual Cook",
    description: "Simple cooking with AI help. Perfect for everyday meals.",
    features: [
      "Voice-guided cooking",
      "Ask Chez anything",
      "Save favorite recipes",
    ],
    icon: "home-outline" as const,
  },
  {
    id: "chef",
    title: "Chef Mode",
    description: "Full power: version history, learnings, and analytics.",
    features: [
      "Everything in Casual, plus:",
      "My Version (save adaptations)",
      "Version history & comparisons",
      "Learning analytics",
    ],
    icon: "ribbon-outline" as const,
  },
];
```

**Step 2:** Hide learnings in Casual mode

```tsx
// app/cook/[id].tsx - line ~1100
const shouldShowLearnings = isChef; // Only show in Chef mode

// Update learning toast logic
useEffect(() => {
  if (!shouldShowLearnings) return; // Skip if Casual mode

  // existing learning detection logic
}, [detectedLearnings, shouldShowLearnings]);
```

**Step 3:** Simplify completion modal for Casual

```tsx
// components/cook/CompletionModal.tsx
{
  isChef && detectedLearnings.length > 0 && (
    <View>
      <Text>Your adaptations were saved to My Version</Text>
      {/* show learnings list */}
    </View>
  );
}

{
  !isChef && (
    <Text>Upgrade to Chef to save your adaptations automatically</Text>
  );
}
```

**Acceptance criteria:**

- ✅ Casual mode: simpler, no learning toasts
- ✅ Chef mode: shows learning toasts, version comparison
- ✅ Mode-select screen clearly explains differences

---

## Phase 3: SCALE READINESS - Pre-Launch (6 hours) 🟡

**Do before Eitan's 10K user surge**

### 3.1 Add Offline Support for Critical Operations (4 hours)

**Priority:** 🟡 MEDIUM
**Why:** Network failures will lose user sessions

**Files to modify:**

- `lib/offline-queue.ts` (create new)
- `app/cook/[id].tsx`

**Implementation:**

**Step 1:** Create offline queue

```typescript
// lib/offline-queue.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

interface QueuedOperation {
  id: string;
  type: "update_session" | "save_version" | "chat_message";
  data: any;
  timestamp: number;
}

export class OfflineQueue {
  private static QUEUE_KEY = "@offline_queue";

  static async enqueue(operation: Omit<QueuedOperation, "id" | "timestamp">) {
    const queue = await this.getQueue();
    queue.push({
      ...operation,
      id: Math.random().toString(36),
      timestamp: Date.now(),
    });
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
  }

  static async processQueue() {
    const queue = await this.getQueue();
    const results = await Promise.allSettled(
      queue.map((op) => this.processOperation(op))
    );

    // Remove successful operations
    const remaining = queue.filter((_, i) => results[i].status === "rejected");
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(remaining));
  }

  private static async getQueue(): Promise<QueuedOperation[]> {
    const data = await AsyncStorage.getItem(this.QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private static async processOperation(op: QueuedOperation) {
    // Implementation for each operation type
    switch (op.type) {
      case "update_session":
        return supabase.from("cook_sessions").upsert(op.data);
      case "save_version":
        return supabase.from("recipe_versions").insert(op.data);
      case "chat_message":
        return fetch("/api/chat", {
          method: "POST",
          body: JSON.stringify(op.data),
        });
    }
  }
}
```

**Step 2:** Use queue in cook screen

```tsx
// app/cook/[id].tsx - wrap session saves
try {
  await supabase.from("cook_sessions").upsert(sessionData);
} catch (error) {
  // Queue for later if network fails
  await OfflineQueue.enqueue({
    type: "update_session",
    data: sessionData,
  });
}

// Process queue when app comes online
useEffect(() => {
  const subscription = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      OfflineQueue.processQueue();
    }
  });
  return () => subscription();
}, []);
```

**Acceptance criteria:**

- ✅ Failed operations queued locally
- ✅ Queue processed when network restored
- ✅ User can continue cooking offline

---

### 3.2 Optimize Database Queries (2 hours)

**Priority:** 🟡 MEDIUM
**Why:** Recipe detail page will be slow with 10K users

**Files to modify:**

- `app/recipe/[id].tsx`

**Changes:**

**Current:** Multiple sequential queries

```tsx
// BEFORE - N+1 queries
const recipe = await supabase.from("recipes").select("*").eq("id", id).single();
const versions = await supabase
  .from("recipe_versions")
  .select("*")
  .eq("recipe_id", id);
const sources = await supabase
  .from("recipe_sources")
  .select("*")
  .eq("recipe_id", id);
```

**Optimized:** Single query with joins

```tsx
// AFTER - single query
const { data } = await supabase
  .from("recipes")
  .select(
    `
    *,
    versions:recipe_versions(*),
    sources:recipe_sources(*),
    ingredients:recipe_ingredients(*)
  `
  )
  .eq("id", id)
  .single();
```

**Acceptance criteria:**

- ✅ Recipe detail loads in <500ms
- ✅ Single database query instead of 4-5

---

## Phase 4: PERFECTIONIST POLISH - Demo Wow Factor (2 hours) ✨

**These push you from 90% → 95% win rate**

### 4.1 Welcome Tutorial Overlay (30 mins)

**Priority:** ✨ POLISH
**Why:** Judges (and users) instantly understand the app without hunting

**Files to modify:**

- `app/(onboarding)/welcome.tsx` (create overlay variant)
- `components/TutorialOverlay.tsx` (create new)

**Implementation:**

```tsx
// components/TutorialOverlay.tsx
import { View, Text, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

interface TutorialStep {
  title: string;
  description: string;
  highlight: "import" | "voice" | "my-version";
}

const steps: TutorialStep[] = [
  {
    title: "📱 Import from TikTok/Instagram",
    description: "Paste a recipe URL and Chez extracts everything",
    highlight: "import",
  },
  {
    title: "🎤 Ask Chez Anything",
    description: "Voice or text - get instant help while cooking",
    highlight: "voice",
  },
  {
    title: '⭐ Save "My Version"',
    description: "Chez learns your tweaks and personalizes recipes",
    highlight: "my-version",
  },
];

export function TutorialOverlay({
  visible,
  onComplete,
}: {
  visible: boolean;
  onComplete: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "center",
          padding: spacing[6],
        }}
      >
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={{
            backgroundColor: "#fff",
            borderRadius: borderRadius.xl,
            padding: spacing[6],
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              marginBottom: spacing[2],
            }}
          >
            {steps[currentStep].title}
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: colors.textSecondary,
              marginBottom: spacing[4],
            }}
          >
            {steps[currentStep].description}
          </Text>

          {/* Progress dots */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: spacing[2],
              marginBottom: spacing[4],
            }}
          >
            {steps.map((_, i) => (
              <View
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    i === currentStep ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>

          <Pressable
            onPress={() => {
              if (currentStep < steps.length - 1) {
                setCurrentStep(currentStep + 1);
              } else {
                onComplete();
              }
            }}
            style={{
              backgroundColor: colors.primary,
              padding: spacing[3],
              borderRadius: borderRadius.full,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              {currentStep < steps.length - 1 ? "Next" : "Got it!"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
```

**Trigger on first launch:**

```tsx
// app/(tabs)/index.tsx - show tutorial on first visit
const [showTutorial, setShowTutorial] = useState(false);

useEffect(() => {
  AsyncStorage.getItem("@tutorial_completed").then((completed) => {
    if (!completed) {
      setShowTutorial(true);
    }
  });
}, []);

const handleTutorialComplete = async () => {
  await AsyncStorage.setItem("@tutorial_completed", "true");
  setShowTutorial(false);
};

return (
  <>
    {/* existing home UI */}
    <TutorialOverlay
      visible={showTutorial}
      onComplete={handleTutorialComplete}
    />
  </>
);
```

**Acceptance criteria:**

- ✅ Shows on first launch only
- ✅ 3 steps explaining core features
- ✅ Can skip or tap through
- ✅ Saves completion to AsyncStorage

---

### 4.2 Sample Recipe Pre-loaded (15 mins)

**Priority:** ✨ CRITICAL (for demo)
**Why:** Judges see working chat immediately without importing

**Files to modify:**

- `lib/sample-recipe.ts` (create new)
- `app/(tabs)/index.tsx`

**Implementation:**

```typescript
// lib/sample-recipe.ts
export const SAMPLE_RECIPE = {
  id: "sample-recipe-001",
  user_id: "demo-user",
  title: "Garlic Butter Shrimp Pasta",
  description: "Quick 15-minute dinner with restaurant-quality flavor",
  cuisine: "Italian",
  difficulty: "Easy",
  prep_time_minutes: 5,
  cook_time_minutes: 10,
  servings: 2,
  ingredients: [
    { name: "spaghetti", amount: "8 oz", optional: false },
    {
      name: "large shrimp",
      amount: "1 lb",
      note: "peeled & deveined",
      optional: false,
    },
    { name: "butter", amount: "4 tbsp", optional: false },
    { name: "garlic", amount: "4 cloves", note: "minced", optional: false },
    { name: "lemon", amount: "1", optional: false },
    { name: "parsley", amount: "1/4 cup", note: "chopped", optional: true },
  ],
  instructions: [
    "Bring a large pot of salted water to boil. Cook spaghetti according to package directions.",
    "While pasta cooks, melt 2 tbsp butter in a large skillet over medium-high heat.",
    "Add shrimp and cook 2-3 minutes per side until pink. Remove from pan.",
    "Add remaining butter and garlic to pan. Cook 30 seconds until fragrant.",
    "Return shrimp to pan. Add pasta, lemon juice, and pasta water. Toss to combine.",
    "Garnish with parsley and serve immediately.",
  ],
  tags: ["quick", "seafood", "pasta", "date-night"],
  source_url: "https://example.com/sample",
  source_platform: "demo",
  is_sample: true, // Mark as sample recipe
};
```

**Add to new user's library:**

```tsx
// app/(tabs)/index.tsx - check if user has recipes
useEffect(() => {
  const initializeSampleRecipe = async () => {
    const { count } = await supabase
      .from("recipes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // If no recipes, add sample
    if (count === 0) {
      await supabase.from("recipes").insert({
        ...SAMPLE_RECIPE,
        user_id: user.id,
      });
      // Refresh recipes list
      fetchRecipes();
    }
  };

  initializeSampleRecipe();
}, [user]);
```

**Acceptance criteria:**

- ✅ New users see 1 recipe immediately
- ✅ Sample recipe marked with badge ("Demo Recipe")
- ✅ Can delete sample recipe if desired
- ✅ Judges can start cooking without import wait

---

### 4.3 Haptic Feedback (30 mins)

**Priority:** ✨ POLISH
**Why:** Makes app feel premium and polished

**Files to modify:**

- `app/cook/[id].tsx`
- `components/cook/ChatModal.tsx`
- `app/recipe/[id].tsx`

**Implementation:**

```tsx
import * as Haptics from "expo-haptics";

// Add to key interactions:

// 1. Voice recording start/stop
const handleStartRecording = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  // existing recording logic
};

const handleStopRecording = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // existing stop logic
};

// 2. Step completion
const handleCompleteStep = async () => {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  // existing step completion
};

// 3. Recipe saved to My Version
const handleSaveVersion = async () => {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  // existing save logic
};

// 4. Error state (rate limit, network error)
const handleError = async () => {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  // show error message
};

// 5. Message sent
const handleSendMessage = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // existing send logic
};
```

**Acceptance criteria:**

- ✅ Haptic on voice start/stop
- ✅ Haptic on step completion (success feel)
- ✅ Haptic on My Version save
- ✅ Haptic on errors (warning feel)
- ✅ Haptic on message sent

---

### 4.4 Smooth Transitions & Microinteractions (45 mins)

**Priority:** ✨ POLISH
**Why:** Removes "janky" feel, makes app feel native

**Files to modify:**

- `app/recipe/[id].tsx` (skeleton loader)
- `components/cook/StepCard.tsx` (expand animation)
- `app/(tabs)/index.tsx` (staggered list animation)

**Implementation:**

**1. Skeleton loader for recipe detail:**

```tsx
// components/SkeletonLoader.tsx (create new)
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate
} from 'react-native-reanimated';

export function SkeletonBox({ width, height }: { width: number | string; height: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width, height, backgroundColor: colors.border, borderRadius: 8 },
        animatedStyle,
      ]}
    />
  );
}

// Use in recipe/[id].tsx
{isLoading ? (
  <View>
    <SkeletonBox width="100%" height={200} />
    <SkeletonBox width="80%" height={30} />
    <SkeletonBox width="60%" height={20} />
  </View>
) : (
  // actual recipe UI
)}
```

**2. Staggered list animation:**

```tsx
// app/(tabs)/index.tsx - animate recipe cards on mount
import { FadeInDown } from "react-native-reanimated";

<FlatList
  data={filteredRecipes}
  renderItem={({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <RecipeCard recipe={item} />
    </Animated.View>
  )}
/>;
```

**3. Step expand animation:**

```tsx
// components/cook/StepCard.tsx - smooth expand/collapse
const height = useSharedValue(0);

const animatedStyle = useAnimatedStyle(() => ({
  height: withTiming(height.value, { duration: 300 }),
  overflow: "hidden",
}));

useEffect(() => {
  height.value = isExpanded ? 200 : 0; // adjust based on content
}, [isExpanded]);
```

**Acceptance criteria:**

- ✅ Recipe detail shows skeleton while loading
- ✅ Recipe list animates in with stagger
- ✅ Step cards expand/collapse smoothly
- ✅ No jarring layout shifts

---

## Phase 5: REVENUECAT INTEGRATION (Separate Day) 💰

**Do this as standalone implementation after Phase 1-4**

### 5.1 RevenueCat Setup (3 hours)

**See RevenueCat docs for full implementation**

**Key steps:**

1. Install SDK: `npm install react-native-purchases`
2. Configure App Store Connect + Google Play
3. Set up entitlements in RevenueCat dashboard
4. Implement paywall screen
5. Handle purchase flow
6. Sync with Supabase user table

**Files to create:**

- `app/paywall.tsx` (paywall screen)
- `lib/purchases.ts` (RevenueCat wrapper)
- `hooks/useSubscription.ts` (subscription state)

---

## Quick Wins (30 mins each) ⚡

**Do these if you have extra time:**

1. ✅ Add skeleton loader to recipe detail (instead of blank screen)
2. ✅ Show "Times Cooked" stat in profile
3. ✅ Better error message for rate limit (show reset time)
4. ✅ Add search bar to recipes list (filter by name)
5. ✅ Show loading spinner on import button

---

## Testing Checklist Before Demo

- [ ] Can sign up + complete onboarding in <60 seconds
- [ ] Can import TikTok recipe successfully
- [ ] Can start cooking and complete recipe
- [ ] AI chat works (ask 3-5 questions)
- [ ] Voice input/output works
- [ ] My Version saves learning
- [ ] Rate limit warning shows at 80%
- [ ] Analytics events tracked in Supabase
- [ ] Subscription status displays in settings
- [ ] No crashes when hitting rate limit
- [ ] App works offline (session preserved)

---

## Timeline Estimate

**Day 1 (8 hours):**

- ✅ Phase 1: Critical fixes (7 hours - includes admin dashboard)
- ✅ Phase 2: Start subscription UI (1 hour)

**Day 2 (9 hours):**

- ✅ Phase 2: Finish demo polish (3 hours)
- ✅ Phase 3: Offline support (4 hours)
- ✅ Phase 4: Perfectionist polish (2 hours)

**Day 3 (6 hours):**

- ✅ Phase 4: Finish perfectionist polish + testing (2 hours)
- ✅ Phase 5: RevenueCat integration (4 hours)

**Total: 25 hours over 3 days**

---

## Success Metrics

**Before (70% win chance):**

- No analytics
- Rate limits crash app
- Onboarding takes 60+ seconds
- No subscription visibility

**After (95% win chance):**

- ✅ 10+ events tracked
- ✅ Rate limit UX polished
- ✅ Onboarding <30 seconds (with tutorial)
- ✅ Clear freemium model shown
- ✅ Sample recipe pre-loaded (instant demo)
- ✅ Haptic feedback (premium feel)
- ✅ Smooth animations (no jank)
- ✅ Ready for 10K users

---

## Notes for Tomorrow

**Start with Phase 1.1 (Analytics)** - this is the biggest gap and judges will definitely ask about it.

**Skip Quick Wins initially** - focus on Phases 1-2 first.

**Test after each phase** - don't wait until end to test everything.

**Ask for help if stuck** - don't spend >30 mins on one issue.

---

_Created: Feb 3, 2026_
_Last Updated: Feb 3, 2026_
_Status: Ready to execute_
