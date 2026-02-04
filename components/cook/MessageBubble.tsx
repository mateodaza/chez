import React from "react";
import { View, Text, Pressable } from "react-native";
import { colors, spacing, borderRadius } from "@/constants/theme";
import type { ChatMessage } from "./types";

// Format timestamp for display
function formatMessageTime(date: Date): string {
  const now = new Date();
  const messageDate = new Date(date);
  const isToday = messageDate.toDateString() === now.toDateString();

  if (isToday) {
    // Today: "2:30 PM"
    return messageDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
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
    // This week: "Monday"
    return messageDate.toLocaleDateString("en-US", { weekday: "long" });
  }

  // Older: "Jan 15"
  return messageDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface MessageBubbleProps {
  message: ChatMessage;
  isChef: boolean;
  isSpeaking: boolean;
  isLastMessage: boolean;
  onRememberThis: (msg: ChatMessage) => void;
  onStopSpeaking: () => void;
  onFeedback: (
    msgId: string,
    dbId: string | undefined,
    feedback: "helpful" | "not_helpful",
    intent?: string
  ) => void;
}

export const MessageBubble = React.memo(
  ({
    message: msg,
    isChef: _isChef,
    isSpeaking,
    isLastMessage,
    onRememberThis: _onRememberThis,
    onStopSpeaking,
    onFeedback,
  }: MessageBubbleProps) => {
    return (
      <View
        style={{
          alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
          maxWidth: "85%",
        }}
      >
        <View
          style={{
            backgroundColor:
              msg.role === "user" ? colors.primary : colors.surface,
            padding: spacing[3],
            borderRadius: borderRadius.lg,
            borderBottomRightRadius: msg.role === "user" ? 4 : borderRadius.lg,
            borderBottomLeftRadius:
              msg.role === "assistant" ? 4 : borderRadius.lg,
            borderWidth: msg.role === "assistant" ? 1 : 0,
            borderColor:
              msg.role === "assistant" ? colors.border : "transparent",
          }}
        >
          <Text
            selectable
            style={{
              color: msg.role === "user" ? "#fff" : colors.textPrimary,
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            {msg.content}
          </Text>

          {/* Timestamp */}
          <Text
            style={{
              fontSize: 11,
              color:
                msg.role === "user"
                  ? "rgba(255,255,255,0.7)"
                  : "rgba(0,0,0,0.5)",
              marginTop: spacing[1],
              alignSelf: "flex-end",
            }}
          >
            {formatMessageTime(msg.timestamp)}
          </Text>
        </View>

        {/* Remember button removed - intent detection handles this automatically */}

        {/* Speaking indicator */}
        {msg.role === "assistant" && isSpeaking && isLastMessage && (
          <Pressable
            onPress={onStopSpeaking}
            style={{
              marginTop: spacing[1],
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[1],
            }}
          >
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              Speaking...
            </Text>
            <Text style={{ fontSize: 12, color: colors.error }}>Stop</Text>
          </Pressable>
        )}

        {/* Feedback buttons - ONLY ON LAST MESSAGE */}
        {msg.role === "assistant" &&
          isLastMessage &&
          msg.dbId &&
          !msg.feedback && (
            <View
              style={{
                flexDirection: "row",
                gap: spacing[2],
                marginTop: spacing[2],
              }}
            >
              <Pressable
                onPress={() =>
                  onFeedback(msg.id, msg.dbId, "helpful", msg.intent)
                }
                style={{
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[1],
                  borderRadius: borderRadius.full,
                  backgroundColor: "#FFEDD5",
                  borderWidth: 1,
                  borderColor: colors.primaryLight,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.primary,
                    fontWeight: "600",
                  }}
                >
                  Helpful
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  onFeedback(msg.id, msg.dbId, "not_helpful", msg.intent)
                }
                style={{
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[1],
                  borderRadius: borderRadius.full,
                  backgroundColor: colors.surfaceElevated,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    fontWeight: "600",
                  }}
                >
                  Not helpful
                </Text>
              </Pressable>
            </View>
          )}

        {msg.feedback && isLastMessage && (
          <Text
            style={{
              fontSize: 11,
              color: colors.textMuted,
              marginTop: spacing[1],
            }}
          >
            {msg.feedback === "helpful"
              ? "Thanks for the feedback!"
              : "Thanks, we'll improve"}
          </Text>
        )}
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.feedback === nextProps.message.feedback &&
      prevProps.message.timestamp.getTime() ===
        nextProps.message.timestamp.getTime() &&
      prevProps.isSpeaking === nextProps.isSpeaking &&
      prevProps.isLastMessage === nextProps.isLastMessage
    );
  }
);

MessageBubble.displayName = "MessageBubble";
