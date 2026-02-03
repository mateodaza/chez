import { useRef, useState, useEffect, useMemo, type ElementRef } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants/theme";
import type { ChatMessage, LearningType } from "./types";
import { MessageBubble } from "./MessageBubble";
import { DateSeparator } from "./DateSeparator";
import { TypingIndicator } from "./TypingIndicator";
import { LearningToast } from "./LearningToast";

type ListItem =
  | { type: "message"; data: ChatMessage; index: number }
  | { type: "separator"; data: Date };

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

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
  // Learning toast props
  showLearningToast: boolean;
  currentLearningType: LearningType;
  onLearningToastComplete: () => void;
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
  showLearningToast,
  currentLearningType,
  onLearningToastComplete,
}: ChatModalProps) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<ElementRef<typeof FlashList<ListItem>> | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState(44);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isNearBottomRef = useRef(true);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Scroll to bottom when modal opens
  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: false });
        isNearBottomRef.current = true;
      }, 100);
    }
  }, [visible, messages.length]);

  // Auto-scroll only when near bottom and new messages arrive
  useEffect(() => {
    if (messages.length > 0 && isNearBottomRef.current) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Combine messages with date separators
  const listItems = useMemo(() => {
    const items: ListItem[] = [];
    let lastDate: Date | null = null;

    messages.forEach((msg, index) => {
      const msgDate = new Date(msg.timestamp);

      // Add date separator if date changed
      if (!lastDate || !isSameDay(lastDate, msgDate)) {
        items.push({ type: "separator", data: msgDate });
        lastDate = msgDate;
      }

      // Add message
      items.push({ type: "message", data: msg, index });
    });

    return items;
  }, [messages]);

  // Calculate header height for scroll inset
  const chatHeaderHeight = useMemo(() => {
    return insets.top + 60; // top safe area + title + close button
  }, [insets.top]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{
          flex: 1,
          backgroundColor: "#FFFFFF",
          position: "relative",
        }}
        keyboardVerticalOffset={0}
      >
        {/* Chat header - Absolutely positioned for scroll-under effect */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: insets.top + spacing[2],
            paddingHorizontal: spacing[4],
            paddingBottom: spacing[3],
            backgroundColor: "rgba(255, 255, 255, 0.85)",
            borderBottomWidth: 1,
            borderBottomColor: "rgba(0, 0, 0, 0.06)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 4,
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
        <FlashList
          ref={listRef}
          data={listItems}
          renderItem={({ item }) => {
            if (item.type === "separator") {
              return <DateSeparator date={item.data} />;
            }
            return (
              <MessageBubble
                message={item.data}
                isChef={isChef}
                isSpeaking={isSpeaking}
                isLastMessage={item.index === messages.length - 1}
                onRememberThis={onRememberThis}
                onStopSpeaking={onStopSpeaking}
                onFeedback={onFeedback}
              />
            );
          }}
          keyExtractor={(item, _index) =>
            item.type === "separator"
              ? `separator-${item.data.getTime()}`
              : item.data.id
          }
          getItemType={(item) => item.type}
          contentContainerStyle={{
            paddingTop: chatHeaderHeight + spacing[4],
            paddingHorizontal: spacing[4],
            paddingBottom: spacing[4],
          }}
          scrollIndicatorInsets={{
            top: chatHeaderHeight,
            bottom: 0,
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
          keyboardShouldPersistTaps="handled"
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } =
              e.nativeEvent;
            const distanceFromBottom =
              contentSize.height - layoutMeasurement.height - contentOffset.y;

            // Update refs and state
            const isNearBottom = distanceFromBottom < 100;
            isNearBottomRef.current = isNearBottom;
            setShowScrollButton(!isNearBottom);
          }}
          scrollEventThrottle={16}
        />

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Pressable
            onPress={() => {
              listRef.current?.scrollToEnd({ animated: true });
              isNearBottomRef.current = true;
              setShowScrollButton(false);
            }}
            style={{
              position: "absolute",
              bottom: isKeyboardVisible ? 90 : 140,
              right: spacing[4],
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.primary,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <Ionicons name="arrow-down" size={24} color="#fff" />
          </Pressable>
        )}

        {/* Chat input */}
        <View
          style={{
            paddingHorizontal: spacing[2],
            paddingTop: spacing[2],
            paddingBottom: isKeyboardVisible
              ? spacing[2]
              : Math.max(insets.bottom, spacing[2]) + spacing[2],
            borderTopWidth: 1,
            borderTopColor: "rgba(0, 0, 0, 0.06)",
            backgroundColor: "rgba(255, 255, 255, 0.85)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              gap: spacing[2],
              backgroundColor: isRecording
                ? "#FED7AA"
                : isTranscribing
                  ? "#FFEDD5"
                  : "rgba(255, 255, 255, 0.85)",
              borderRadius: 24,
              padding: 4,
              alignItems: "flex-end",
              borderWidth: isRecording || isTranscribing ? 2 : 1,
              borderColor: isRecording
                ? colors.primary
                : isTranscribing
                  ? colors.primaryLight
                  : "rgba(0, 0, 0, 0.12)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 2,
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
                    ? colors.primaryLight
                    : "#E5E5E5",
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
              onChangeText={(text) => {
                setQuestion(text);
                // Reset height when text is cleared
                if (text === "") {
                  setInputHeight(44);
                }
              }}
              onContentSizeChange={(e) => {
                if (!isRecording && !isTranscribing) {
                  const height = e.nativeEvent.contentSize.height;
                  const newHeight = Math.max(44, Math.min(120, height));
                  setInputHeight(newHeight);
                }
              }}
              placeholder="Ask anything..."
              placeholderTextColor={colors.textMuted}
              editable={!isRecording && !isTranscribing}
              multiline
              style={{
                flex: 1,
                height: inputHeight,
                maxHeight: 120,
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[2],
                fontSize: 16,
                color:
                  isRecording || isTranscribing
                    ? colors.primary
                    : colors.textPrimary,
              }}
              returnKeyType="default"
              blurOnSubmit={false}
            />

            {/* Send button */}
            <Pressable
              onPress={onSendQuestion}
              disabled={!question.trim() || isRecording || isTranscribing}
              style={{
                backgroundColor:
                  question.trim() && !isRecording && !isTranscribing
                    ? colors.primary
                    : "#E5E5E5",
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

        {/* Learning Toast - positioned absolutely on top of everything */}
        <LearningToast
          visible={showLearningToast}
          learningType={currentLearningType}
          onComplete={onLearningToastComplete}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}
