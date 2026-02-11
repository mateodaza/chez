import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ElementRef,
} from "react";
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
import * as Haptics from "expo-haptics";
import { colors, spacing } from "@/constants/theme";
import type { ChatMessage, LearningType } from "./types";
import { MessageBubble } from "./MessageBubble";
import { DateSeparator } from "./DateSeparator";
import { TypingIndicator } from "./TypingIndicator";
import { LearningToast } from "./LearningToast";
import { PaywallContent } from "@/components/PaywallContent";

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
  // Rate limit props
  rateLimit?: {
    current: number;
    limit: number;
    remaining: number;
  } | null;
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
  rateLimit,
}: ChatModalProps) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<ElementRef<typeof FlashList<ListItem>> | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const isNearBottomRef = useRef(true);
  const prevRemainingRef = useRef<number | undefined>(rateLimit?.remaining);
  const hitZeroRef = useRef(false);

  // Rate limit exhausted check
  const isRateLimitExhausted = rateLimit?.remaining === 0;

  // Detect when remaining transitions from >0 to 0 (not already 0 on mount)
  useEffect(() => {
    const prev = prevRemainingRef.current;
    const curr = rateLimit?.remaining;
    if (prev !== undefined && prev > 0 && curr === 0) {
      hitZeroRef.current = true;
    }
    prevRemainingRef.current = curr;
  }, [rateLimit?.remaining]);

  // Auto-show paywall only after a fresh transition to 0 + AI fully done
  useEffect(() => {
    if (hitZeroRef.current && !isTyping && !isSpeaking && visible) {
      // 4.5s delay: ~3s typing animation + 1.5s reading time
      const timer = setTimeout(() => {
        hitZeroRef.current = false;
        setShowPaywall(true);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [isTyping, isSpeaking, visible]);

  // Haptic-enabled send handler
  const handleSend = useCallback(() => {
    if (
      !question.trim() ||
      isRecording ||
      isTranscribing ||
      isRateLimitExhausted
    )
      return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSendQuestion();
  }, [
    question,
    isRecording,
    isTranscribing,
    isRateLimitExhausted,
    onSendQuestion,
  ]);

  // Haptic-enabled voice toggle handler
  const handleVoiceToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleVoice();
  }, [onToggleVoice]);

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

  // Keep scrolling during typing animation so text stays visible
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg?.animate || !isNearBottomRef.current) return;

    const interval = setInterval(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 200);

    // Match MessageBubble's dynamic animation: ~3s total + buffer
    const chunks = lastMsg.content.split(/(\s+)/).length;
    const msPerChunk = Math.max(16, Math.floor(3000 / chunks));
    const timeout = setTimeout(
      () => clearInterval(interval),
      chunks * msPerChunk + 500
    );

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [messages]);

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
          backgroundColor: colors.surface,
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

        {/* Chat messages + scroll button container */}
        <View style={{ flex: 1 }}>
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
            extraData={{ isTyping, rateLimit }}
            contentContainerStyle={{
              paddingTop: chatHeaderHeight + spacing[4],
              paddingHorizontal: spacing[4],
              paddingBottom: spacing[4],
            }}
            scrollIndicatorInsets={{
              top: chatHeaderHeight,
              bottom: 0,
            }}
            ItemSeparatorComponent={() => (
              <View style={{ height: spacing[3] }} />
            )}
            ListEmptyComponent={
              !isTyping ? (
                <View
                  style={{
                    alignItems: "center",
                    paddingTop: spacing[8],
                    paddingHorizontal: spacing[4],
                    gap: spacing[4],
                  }}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={40}
                    color={colors.textMuted}
                  />
                  <Text
                    style={{
                      fontSize: 15,
                      color: colors.textSecondary,
                      textAlign: "center",
                      lineHeight: 22,
                    }}
                  >
                    Ask me anything about this recipe. Substitutions,
                    techniques, or timing.
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      gap: spacing[2],
                    }}
                  >
                    {(isChef
                      ? [
                          "Swap an ingredient",
                          "I don't have this",
                          "Remember this for next time",
                        ]
                      : [
                          "What can I substitute?",
                          "How do I know when it's done?",
                          "Make this easier",
                        ]
                    ).map((chip) => (
                      <Pressable
                        key={chip}
                        onPress={() => {
                          setQuestion(chip);
                          // Small delay so the question appears in the input first
                          setTimeout(() => onSendQuestion(), 50);
                        }}
                        style={{
                          paddingHorizontal: spacing[3],
                          paddingVertical: spacing[2],
                          borderRadius: 20,
                          backgroundColor: "#FFF7ED",
                          borderWidth: 1,
                          borderColor: colors.primaryLight,
                          borderCurve: "continuous",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            color: colors.primary,
                            fontWeight: "500",
                          }}
                        >
                          {chip}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null
            }
            ListFooterComponent={
              <>
                {isTyping && <TypingIndicator />}
                {rateLimit && rateLimit.remaining === 0 ? (
                  <View
                    style={{
                      marginTop: spacing[3],
                      padding: spacing[4],
                      backgroundColor: "#FFF7ED",
                      borderRadius: 16,
                      borderCurve: "continuous",
                      borderWidth: 1,
                      borderColor: colors.primaryLight,
                      alignItems: "center",
                      gap: spacing[2],
                    }}
                  >
                    <Ionicons name="flash" size={24} color={colors.primary} />
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: colors.textPrimary,
                        textAlign: "center",
                      }}
                    >
                      Daily limit reached
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.textSecondary,
                        textAlign: "center",
                      }}
                    >
                      Upgrade to Chef for 500 messages/day
                    </Text>
                    <Pressable
                      onPress={() => {
                        setShowPaywall(true);
                      }}
                      style={{
                        marginTop: spacing[1],
                        backgroundColor: colors.primary,
                        paddingHorizontal: spacing[5],
                        paddingVertical: spacing[2],
                        borderRadius: 20,
                        borderCurve: "continuous",
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 14,
                          fontWeight: "600",
                        }}
                      >
                        Upgrade to Chef
                      </Text>
                    </Pressable>
                  </View>
                ) : rateLimit && rateLimit.remaining <= 3 ? (
                  <View
                    style={{
                      marginTop: spacing[3],
                      padding: spacing[3],
                      backgroundColor: "#FFF7ED",
                      borderRadius: 12,
                      borderCurve: "continuous",
                      borderWidth: 1,
                      borderColor: colors.primaryLight,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing[2],
                    }}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={16}
                      color={colors.primary}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: colors.textSecondary,
                        fontWeight: "500",
                      }}
                    >
                      {rateLimit.remaining} message
                      {rateLimit.remaining === 1 ? "" : "s"} left today
                    </Text>
                    <Pressable
                      onPress={() => {
                        setShowPaywall(true);
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.primary,
                          fontWeight: "600",
                        }}
                      >
                        Upgrade
                      </Text>
                    </Pressable>
                  </View>
                ) : rateLimit && rateLimit.remaining <= 5 ? (
                  <View style={{ marginTop: spacing[3], alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textMuted,
                        fontWeight: "500",
                      }}
                    >
                      {rateLimit.remaining} message
                      {rateLimit.remaining === 1 ? "" : "s"} left today
                    </Text>
                  </View>
                ) : null}
              </>
            }
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
                bottom: spacing[3],
                right: spacing[4],
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.primary,
                justifyContent: "center",
                alignItems: "center",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
              }}
            >
              <Ionicons name="arrow-down" size={24} color="#fff" />
            </Pressable>
          )}
        </View>

        {/* State label (transcribing only — speaking uses MessageBubble indicator, thinking uses dots) */}
        {isTranscribing && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: spacing[1],
              gap: spacing[1],
            }}
          >
            <Ionicons name="ear" size={14} color={colors.primary} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "500",
                color: colors.primary,
              }}
            >
              Transcribing...
            </Text>
          </View>
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
              onPress={handleVoiceToggle}
              disabled={isTranscribing || isRateLimitExhausted}
              style={{
                backgroundColor: isRecording
                  ? colors.primary
                  : isTranscribing
                    ? colors.primaryLight
                    : colors.border,
                width: 44,
                height: 44,
                borderRadius: 22,
                justifyContent: "center",
                alignItems: "center",
                opacity: isRateLimitExhausted ? 0.5 : 1,
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
                isRateLimitExhausted
                  ? "Daily limit reached"
                  : isRecording
                    ? `Recording... ${recordingDuration}s`
                    : isTranscribing
                      ? "Transcribing..."
                      : question
              }
              onChangeText={(text) => {
                if (isRateLimitExhausted) return;
                setQuestion(text);
              }}
              placeholder="Ask anything..."
              placeholderTextColor={colors.textMuted}
              editable={
                !isRecording && !isTranscribing && !isRateLimitExhausted
              }
              multiline
              style={{
                flex: 1,
                minHeight: 44,
                maxHeight: 200,
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[2],
                fontSize: 16,
                color: isRateLimitExhausted
                  ? colors.textMuted
                  : isRecording || isTranscribing
                    ? colors.primary
                    : colors.textPrimary,
              }}
              returnKeyType="default"
              blurOnSubmit={false}
            />

            {/* Send button */}
            <Pressable
              onPress={handleSend}
              disabled={
                !question.trim() ||
                isRecording ||
                isTranscribing ||
                isRateLimitExhausted
              }
              style={{
                backgroundColor:
                  question.trim() &&
                  !isRecording &&
                  !isTranscribing &&
                  !isRateLimitExhausted
                    ? colors.primary
                    : colors.border,
                width: 44,
                height: 44,
                borderRadius: 22,
                justifyContent: "center",
                alignItems: "center",
                opacity: isRateLimitExhausted ? 0.5 : 1,
              }}
            >
              <Ionicons
                name="arrow-up"
                size={22}
                color={
                  question.trim() &&
                  !isRecording &&
                  !isTranscribing &&
                  !isRateLimitExhausted
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

      {/* Nested paywall modal — appears on top of chat without closing it */}
      <Modal
        visible={showPaywall}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaywall(false)}
      >
        <PaywallContent onDismiss={() => setShowPaywall(false)} />
      </Modal>
    </Modal>
  );
}
