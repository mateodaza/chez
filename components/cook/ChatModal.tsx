import { useRef } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "@/constants/theme";
import type { ChatMessage } from "./types";

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  question: string;
  setQuestion: (text: string) => void;
  onSendQuestion: () => void;
  onRememberThis: (msg: ChatMessage) => void;
  onFeedback: (
    msgId: string,
    dbId: string | undefined,
    feedback: "helpful" | "not_helpful",
    intent?: string
  ) => void;
  isTyping: boolean;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  isRecording: boolean;
  isTranscribing: boolean;
  recordingDuration: number;
  onToggleVoice: () => void;
  isChef?: boolean;
}

export function ChatModal({
  visible,
  onClose,
  messages,
  question,
  setQuestion,
  onSendQuestion,
  onRememberThis,
  onFeedback,
  isTyping,
  isSpeaking,
  onStopSpeaking,
  isRecording,
  isTranscribing,
  recordingDuration,
  onToggleVoice,
  isChef = false,
}: ChatModalProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.background }}
        keyboardVerticalOffset={0}
      >
        {/* Chat header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: insets.top + spacing[2],
            paddingHorizontal: spacing[4],
            paddingBottom: spacing[3],
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ width: 44 }} />
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.textPrimary,
            }}
          >
            Ask Chez
          </Text>
          <Pressable onPress={onClose} style={{ padding: spacing[2] }}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Chat messages */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
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
                  borderBottomRightRadius:
                    msg.role === "user" ? 4 : borderRadius.lg,
                  borderBottomLeftRadius:
                    msg.role === "assistant" ? 4 : borderRadius.lg,
                }}
              >
                <Text
                  style={{
                    color: msg.role === "user" ? "#fff" : colors.textPrimary,
                    fontSize: 15,
                    lineHeight: 22,
                  }}
                >
                  {msg.content}
                </Text>
              </View>

              {/* Remember button for user messages (Chef mode only) */}
              {isChef && msg.role === "user" && (
                <Pressable
                  onPress={() => onRememberThis(msg)}
                  style={{
                    marginTop: spacing[1],
                    paddingHorizontal: spacing[2],
                    paddingVertical: spacing[1],
                    borderRadius: borderRadius.sm,
                    backgroundColor: "#fef3c7",
                    alignSelf: "flex-end",
                  }}
                >
                  <Text style={{ fontSize: 11, color: "#92400e" }}>
                    Remember this
                  </Text>
                </Pressable>
              )}

              {/* Speaking indicator */}
              {msg.role === "assistant" &&
                isSpeaking &&
                msg.id === messages[messages.length - 1]?.id && (
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
                    <Text style={{ fontSize: 12, color: colors.error }}>
                      Stop
                    </Text>
                  </Pressable>
                )}

              {/* Feedback buttons */}
              {msg.role === "assistant" && msg.dbId && !msg.feedback && (
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
                      backgroundColor: "#dcfce7",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#166534" }}>
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
                      backgroundColor: "#fee2e2",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#991b1b" }}>
                      Not helpful
                    </Text>
                  </Pressable>
                </View>
              )}

              {msg.feedback && (
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
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <View style={{ alignSelf: "flex-start", maxWidth: "85%" }}>
              <View
                style={{
                  backgroundColor: colors.surface,
                  padding: spacing[3],
                  borderRadius: borderRadius.lg,
                  borderBottomLeftRadius: 4,
                  flexDirection: "row",
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 18, opacity: 0.6 }}>•</Text>
                <Text style={{ fontSize: 18, opacity: 0.4 }}>•</Text>
                <Text style={{ fontSize: 18, opacity: 0.2 }}>•</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Chat input */}
        <View
          style={{
            padding: spacing[3],
            paddingBottom: insets.bottom + spacing[2],
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surfaceElevated,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              gap: spacing[2],
              backgroundColor: isRecording
                ? "#fef3c7"
                : isTranscribing
                  ? "#dbeafe"
                  : colors.surface,
              borderRadius: borderRadius.full,
              padding: 4,
              alignItems: "center",
              borderWidth: isRecording || isTranscribing ? 2 : 0,
              borderColor: isRecording ? colors.primary : "#3b82f6",
            }}
          >
            {/* Mic button */}
            <Pressable
              onPress={onToggleVoice}
              disabled={isTranscribing}
              style={{
                backgroundColor: isRecording
                  ? colors.primary
                  : isTranscribing
                    ? "#3b82f6"
                    : colors.border,
                width: 44,
                height: 44,
                borderRadius: 22,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                name={
                  isRecording ? "stop" : isTranscribing ? "hourglass" : "mic"
                }
                size={22}
                color={
                  isRecording || isTranscribing ? "#fff" : colors.textSecondary
                }
              />
            </Pressable>

            <TextInput
              value={
                isRecording
                  ? `Recording... ${recordingDuration}s`
                  : isTranscribing
                    ? "Transcribing..."
                    : question
              }
              onChangeText={setQuestion}
              placeholder="Ask anything..."
              placeholderTextColor={colors.textMuted}
              editable={!isRecording && !isTranscribing}
              style={{
                flex: 1,
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[2],
                fontSize: 16,
                color: isRecording
                  ? colors.primary
                  : isTranscribing
                    ? "#3b82f6"
                    : colors.textPrimary,
              }}
              onSubmitEditing={onSendQuestion}
              returnKeyType="send"
            />

            {/* Send button */}
            <Pressable
              onPress={onSendQuestion}
              disabled={!question.trim() || isRecording || isTranscribing}
              style={{
                backgroundColor:
                  question.trim() && !isRecording && !isTranscribing
                    ? colors.primary
                    : colors.border,
                width: 44,
                height: 44,
                borderRadius: 22,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="arrow-up"
                size={22}
                color={
                  question.trim() && !isRecording && !isTranscribing
                    ? "#fff"
                    : colors.textMuted
                }
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
