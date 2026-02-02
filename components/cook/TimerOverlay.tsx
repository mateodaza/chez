import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing, borderRadius } from "@/constants/theme";
import type { ActiveTimer } from "./types";

interface TimerOverlayProps {
  timers: ActiveTimer[];
  topOffset: number;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function TimerOverlay({ timers, topOffset }: TimerOverlayProps) {
  if (timers.length === 0) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: topOffset,
        left: spacing[4],
        right: spacing[4],
        zIndex: 10,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing[2],
      }}
    >
      {timers.map((timer) => (
        <View
          key={timer.id}
          style={{
            backgroundColor:
              timer.remainingSeconds < 60 ? "#fef2f2" : "#f0fdf4",
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[2],
            borderRadius: borderRadius.full,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[2],
            borderWidth: 2,
            borderColor: timer.remainingSeconds < 60 ? "#fca5a5" : "#86efac",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons
            name="timer-outline"
            size={18}
            color={timer.remainingSeconds < 60 ? "#dc2626" : "#16a34a"}
          />
          <Text
            style={{
              fontWeight: "700",
              fontSize: 16,
              color: timer.remainingSeconds < 60 ? "#dc2626" : "#16a34a",
            }}
          >
            {formatTime(timer.remainingSeconds)}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: timer.remainingSeconds < 60 ? "#dc2626" : "#16a34a",
            }}
          >
            {timer.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
