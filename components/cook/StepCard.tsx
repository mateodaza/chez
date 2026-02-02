import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "@/constants/theme";
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
          backgroundColor: isCompleted ? "#f0fdf4" : colors.surfaceElevated,
          borderRadius: borderRadius["2xl"],
          padding: spacing[6],
          justifyContent: "space-between",
          borderWidth: isCompleted ? 2 : 0,
          borderColor: "#86efac",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
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
              backgroundColor: isCompleted ? "#22c55e" : colors.primary,
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
              borderColor: isCompleted ? "#22c55e" : "#d1d5db",
              backgroundColor: isCompleted ? "#22c55e" : "transparent",
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
              color: isCompleted ? "#6b7280" : "#111827",
              textDecorationLine: isCompleted ? "line-through" : "none",
            }}
          >
            {step.instruction}
          </Text>

          {/* Temperature badge (always shown) + Equipment badges (Chef only) */}
          {(step.temperature_value != null ||
            (isChef && step.equipment?.length)) && (
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
                    backgroundColor: "#fef3c7",
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[1],
                    borderRadius: borderRadius.full,
                  }}
                >
                  <Ionicons
                    name="thermometer-outline"
                    size={16}
                    color="#92400e"
                  />
                  <Text style={{ color: "#92400e", fontWeight: "600" }}>
                    {step.temperature_value}°{step.temperature_unit || "F"}
                  </Text>
                </View>
              )}
              {isChef &&
                step.equipment?.map((eq) => (
                  <View
                    key={eq}
                    style={{
                      backgroundColor: "#e0e7ff",
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[1],
                      borderRadius: borderRadius.full,
                    }}
                  >
                    <Text style={{ color: "#3730a3", fontWeight: "500" }}>
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
              backgroundColor: timerActive ? "#e5e7eb" : "#dbeafe",
              paddingVertical: spacing[4],
              borderRadius: borderRadius.xl,
            }}
          >
            <Ionicons
              name="timer-outline"
              size={24}
              color={timerActive ? "#9ca3af" : "#1e40af"}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: timerActive ? "#9ca3af" : "#1e40af",
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
