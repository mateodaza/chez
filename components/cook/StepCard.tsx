import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, shadows } from "@/constants/theme";
import type { Step } from "./types";

interface StepCardProps {
  step: Step;
  totalSteps: number;
  height: number;
  isCompleted: boolean;
  timerActive: boolean;
  onToggleComplete: (stepNumber: number) => void;
  onStartTimer: (step: Step) => void;
  isChef?: boolean;
}

export function StepCard({
  step,
  totalSteps,
  height,
  isCompleted,
  timerActive,
  onToggleComplete,
  onStartTimer,
  isChef = false,
}: StepCardProps) {
  const hasTimer = step.duration_minutes !== null;

  return (
    <View
      style={{
        height,
        padding: spacing[4],
        justifyContent: "center",
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: isCompleted ? "#FFF7ED" : colors.surface,
          borderRadius: borderRadius["2xl"],
          padding: spacing[6],
          justifyContent: "space-between",
          borderWidth: isCompleted ? 2 : 1,
          borderColor: isCompleted ? colors.primary : colors.border,
          ...shadows.md,
        }}
      >
        {/* Step number badge */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              backgroundColor: isCompleted ? colors.primary : colors.terracotta,
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[2],
              borderRadius: borderRadius.full,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
              Step {step.step_number} of {totalSteps}
            </Text>
          </View>

          {/* Completion checkbox */}
          <Pressable
            onPress={() => onToggleComplete(step.step_number)}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              borderWidth: 3,
              borderColor: isCompleted ? colors.primary : colors.border,
              backgroundColor: isCompleted ? colors.primary : "transparent",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {isCompleted && (
              <Ionicons name="checkmark" size={28} color="#fff" />
            )}
          </Pressable>
        </View>

        {/* Instruction text */}
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            paddingVertical: spacing[4],
          }}
        >
          <Text
            style={{
              fontSize: 24,
              lineHeight: 36,
              color: isCompleted ? colors.textMuted : colors.textPrimary,
              textDecorationLine: isCompleted ? "line-through" : "none",
            }}
          >
            {step.instruction}
          </Text>

          {/* Temperature badge + Equipment badges */}
          {(step.temperature_value != null ||
            (isChef && (step.equipment?.length ?? 0) > 0)) && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing[2],
                marginTop: spacing[4],
              }}
            >
              {step.temperature_value != null && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing[1],
                    backgroundColor: "#FED7AA",
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[1],
                    borderRadius: borderRadius.full,
                  }}
                >
                  <Ionicons
                    name="thermometer-outline"
                    size={16}
                    color={colors.primaryDark}
                  />
                  <Text
                    style={{
                      color: colors.primaryDark,
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    {step.temperature_value}°{step.temperature_unit || "F"}
                  </Text>
                </View>
              )}
              {isChef &&
                step.equipment?.map((eq) => (
                  <View
                    key={eq}
                    style={{
                      backgroundColor: "#FFE4E6",
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[1],
                      borderRadius: borderRadius.full,
                    }}
                  >
                    <Text
                      style={{
                        color: "#9F1239",
                        fontWeight: "500",
                        fontSize: 13,
                      }}
                    >
                      {eq}
                    </Text>
                  </View>
                ))}
            </View>
          )}
        </View>

        {/* Timer button */}
        {hasTimer && (
          <Pressable
            onPress={() => onStartTimer(step)}
            disabled={timerActive}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing[2],
              backgroundColor: timerActive ? colors.surfaceElevated : "#FFEDD5",
              paddingVertical: spacing[4],
              borderRadius: borderRadius.xl,
              borderWidth: 1,
              borderColor: timerActive ? colors.border : colors.primaryLight,
            }}
          >
            <Ionicons
              name="timer-outline"
              size={24}
              color={timerActive ? colors.textMuted : colors.primary}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: timerActive ? colors.textMuted : colors.primary,
              }}
            >
              {timerActive
                ? "Timer running"
                : `Set ${step.duration_minutes}m timer`}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
