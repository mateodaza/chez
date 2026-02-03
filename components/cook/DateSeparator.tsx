import React from "react";
import { View, Text } from "react-native";
import { colors, spacing } from "@/constants/theme";

interface DateSeparatorProps {
  date: Date;
}

export function formatDateSeparator(date: Date): string {
  const now = new Date();
  const messageDate = new Date(date);
  const isToday = messageDate.toDateString() === now.toDateString();

  if (isToday) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = messageDate.toDateString() === yesterday.toDateString();

  if (isYesterday) {
    return "Yesterday";
  }

  const isThisWeek =
    now.getTime() - messageDate.getTime() < 7 * 24 * 60 * 60 * 1000;

  if (isThisWeek) {
    // This week: "Monday, Jan 15"
    return messageDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }

  // Older: "January 15, 2024"
  return messageDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function DateSeparator({ date }: DateSeparatorProps) {
  return (
    <View
      style={{
        alignItems: "center",
        marginVertical: spacing[3],
      }}
    >
      <View
        style={{
          backgroundColor: colors.surface,
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[1],
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: colors.textMuted,
            fontWeight: "600",
          }}
        >
          {formatDateSeparator(date)}
        </Text>
      </View>
    </View>
  );
}
