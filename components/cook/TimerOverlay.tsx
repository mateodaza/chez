import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing, borderRadius } from "@/constants/theme";
import type { ActiveTimer } from "./types";

interface TimerOverlayProps {
  timers: ActiveTimer[];
  topOffset: number;
  onCancelTimer: (timerId: string) => void;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function TimerOverlay({
  timers,
  topOffset,
  onCancelTimer,
}: TimerOverlayProps) {
  if (timers.length === 0) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: topOffset,
        left: 0,
        right: 0,
        zIndex: 10,
        gap: spacing[1],
      }}
    >
      {timers.map((timer) => {
        const isUrgent = timer.remainingSeconds < 60;
        const progress = 1 - timer.remainingSeconds / timer.totalSeconds;

        return (
          <View
            key={timer.id}
            style={{
              marginHorizontal: spacing[4],
              backgroundColor: isUrgent ? "#fef2f2" : "#f0fdf4",
              borderRadius: borderRadius.xl,
              borderCurve: "continuous",
              borderWidth: 2,
              borderColor: isUrgent ? "#fca5a5" : "#86efac",
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            {/* Progress bar background */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: `${progress * 100}%`,
                backgroundColor: isUrgent
                  ? "rgba(239, 68, 68, 0.1)"
                  : "rgba(34, 197, 94, 0.1)",
              }}
            />

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
                gap: spacing[3],
              }}
            >
              <Ionicons
                name="timer"
                size={28}
                color={isUrgent ? "#dc2626" : "#16a34a"}
              />

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontWeight: "800",
                    fontSize: 28,
                    fontVariant: ["tabular-nums"],
                    color: isUrgent ? "#dc2626" : "#16a34a",
                  }}
                >
                  {formatTime(timer.remainingSeconds)}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    color: isUrgent ? "#b91c1c" : "#15803d",
                    marginTop: 2,
                  }}
                >
                  {timer.label}
                </Text>
              </View>

              <Pressable
                onPress={() => onCancelTimer(timer.id)}
                hitSlop={8}
                style={{
                  backgroundColor: isUrgent
                    ? "rgba(220, 38, 38, 0.12)"
                    : "rgba(22, 163, 74, 0.12)",
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[2],
                  borderRadius: borderRadius.full,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: isUrgent ? "#dc2626" : "#16a34a",
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}
