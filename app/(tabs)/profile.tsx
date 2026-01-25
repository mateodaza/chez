import { useState, useEffect } from "react";
import { ScrollView, Text, View, Pressable, Alert } from "react-native";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function ProfileScreen() {
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
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, gap: 24 }}
    >
      <View
        style={{
          backgroundColor: "#f3f4f6",
          padding: 24,
          borderRadius: 12,
          borderCurve: "continuous",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "#f97316",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 32, color: "white" }}>
            {user?.email?.[0]?.toUpperCase() || "?"}
          </Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>
          {user?.email || "Loading..."}
        </Text>
        <Pressable
          onPress={handleSignOut}
          style={{
            backgroundColor: "#ef4444",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
            borderCurve: "continuous",
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Sign Out</Text>
        </Pressable>
      </View>

      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>Settings</Text>

        <View
          style={{
            backgroundColor: "#f3f4f6",
            borderRadius: 12,
            borderCurve: "continuous",
            overflow: "hidden",
          }}
        >
          <SettingRow label="Cooking Skill" value="Home Cook" />
          <SettingRow label="Dietary Restrictions" value="None" />
          <SettingRow label="Preferred Units" value="Imperial" />
          <SettingRow label="Voice Enabled" value="On" last />
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>Subscription</Text>
        <View
          style={{
            backgroundColor: "#fef3c7",
            padding: 16,
            borderRadius: 12,
            borderCurve: "continuous",
            gap: 8,
          }}
        >
          <Text style={{ fontWeight: "600" }}>Free Plan</Text>
          <Text style={{ color: "#666" }}>3 imports remaining this month</Text>
          <Pressable
            style={{
              backgroundColor: "#f97316",
              padding: 12,
              borderRadius: 8,
              borderCurve: "continuous",
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              Upgrade to Pro
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function SettingRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: "#e5e7eb",
      }}
    >
      <Text>{label}</Text>
      <Text style={{ color: "#666" }}>{value}</Text>
    </View>
  );
}
