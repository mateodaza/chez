import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  Dimensions,
  FlatList,
  type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";
import { Analytics } from "@/lib/analytics";
import { shareCompletedCook } from "@/lib/share";
import { pickCookPhoto, uploadCookPhoto } from "@/lib/cook-photos";
import type { Json } from "@/types/database";
import * as TTS from "@/lib/tts";
import { playTimerAlarm } from "@/lib/timer-sound";
import { colors, spacing, borderRadius } from "@/constants/theme";
import { useSubscription, useCookingModeWithLoading } from "@/hooks";

// Components & Types
import {
  StepCard,
  TimerOverlay,
  ChatModal,
  CompletionModal,
  RememberModal,
  LearningConfirmModal,
  type Step,
  type MasterRecipeWithVersion,
  type ChatMessage,
  type ActiveTimer,
  type LearningType,
  type DetectedLearning,
  type VersionLearning,
} from "@/components/cook";
import { LoadingOverlay } from "@/components/LoadingOverlay";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function CookScreen() {
  const params = useLocalSearchParams<{
    id: string;
    versionId?: string | string[];
  }>();
  const id = params.id;
  // Normalize versionId - could be string or string[] from deep links
  const versionId = Array.isArray(params.versionId)
    ? params.versionId[0]
    : params.versionId;
  const insets = useSafeAreaInsets();
  // Use subscription status for feature gating (learnings, versions), not cooking mode preference
  const { isChef } = useSubscription();
  const { cookingMode, isLoading: isModeLoading } = useCookingModeWithLoading();
  const flatListRef = useRef<FlatList>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSubmittingRef = useRef(false);

  // Recipe and session state
  const [recipe, setRecipe] = useState<MasterRecipeWithVersion | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [masterRecipeId, setMasterRecipeId] = useState<string | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const pendingCookStartRef = useRef<string | null>(null); // recipe ID awaiting mode load

  // Step tracking
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);

  // Rate limit state
  const [rateLimit, setRateLimit] = useState<{
    current: number;
    limit: number;
    remaining: number;
    tier: "free" | "chef";
  } | null>(null);

  // TTS state
  const [ttsEnabled, _setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Timer state
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);

  // Voice recording state
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionRating, setCompletionRating] = useState(0);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionTags, setCompletionTags] = useState<string[]>([]);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [isCreatingVersion, _setIsCreatingVersion] = useState(false);

  // Photo proof state
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Remember/Learning state
  const [showRememberModal, setShowRememberModal] = useState(false);
  const [rememberMessage, setRememberMessage] = useState<ChatMessage | null>(
    null
  );
  const [rememberType, setRememberType] =
    useState<LearningType>("substitution");
  const [isSavingLearning, setIsSavingLearning] = useState(false);
  const [detectedLearnings, setDetectedLearnings] = useState<
    DetectedLearning[]
  >([]);
  const [_versionLearnings, setVersionLearnings] = useState<VersionLearning[]>(
    []
  );
  const [wantsToSaveVersion, setWantsToSaveVersion] = useState(true);
  const [_usedSourceLinkId, _setUsedSourceLinkId] = useState<string | null>(
    null
  );

  // Learning toast state
  const [showLearningToast, setShowLearningToast] = useState(false);
  const [currentLearningType, setCurrentLearningType] =
    useState<LearningType>("substitution");

  // Learning confirmation modal state (for low-confidence learnings)
  const [showLearningConfirmModal, setShowLearningConfirmModal] =
    useState(false);
  const [pendingLearning, setPendingLearning] = useState<{
    type: LearningType;
    content: string;
    confidence: number;
    stepNumber?: number; // Optional - kept for session context only
    original: DetectedLearning;
  } | null>(null);

  // Calculate header and bottom bar heights from actual insets
  const headerHeight = useMemo(() => {
    return insets.top + 72; // top safe area + content + padding
  }, [insets.top]);

  const bottomBarHeight = useMemo(() => {
    // paddingVertical(12) + button(64) + paddingBottom override(insets.bottom + 8)
    return 84 + insets.bottom;
  }, [insets.bottom]);

  // Step card height = exact visible area between header and bottom bar
  const stepCardHeight = useMemo(() => {
    return SCREEN_HEIGHT - headerHeight - bottomBarHeight;
  }, [headerHeight, bottomBarHeight]);

  // Fetch recipe and create/resume session
  useEffect(() => {
    const fetchRecipeAndSession = async () => {
      if (!id) return;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const { data: recipeData, error: recipeError } = await supabase
          .from("master_recipes")
          .select(
            `
            id, title, current_version_id, forked_from_id,
            current_version:master_recipe_versions!fk_current_version(
              id, version_number, steps
            )
          `
          )
          .eq("id", id)
          .single();

        if (recipeError || !recipeData) throw new Error("Recipe not found");

        // SIMPLIFIED VERSION MODEL — only v1 (Original) and v2 (My Version) allowed
        // Fetch both explicitly by version_number to enforce the contract

        const [{ data: v1Data }, { data: myVersion }] = await Promise.all([
          supabase
            .from("master_recipe_versions")
            .select("id, version_number, steps, learnings")
            .eq("master_recipe_id", id)
            .eq("version_number", 1)
            .single(),
          supabase
            .from("master_recipe_versions")
            .select("id, version_number, steps, learnings")
            .eq("master_recipe_id", id)
            .eq("version_number", 2)
            .single(),
        ]);

        // Determine version: honor explicit versionId param with validation,
        // otherwise fall back to v2 > v1 heuristic
        let versionData = myVersion || v1Data;
        if (versionId) {
          const { data: selectedVersion } = await supabase
            .from("master_recipe_versions")
            .select("id, version_number, steps, learnings")
            .eq("id", versionId)
            .eq("master_recipe_id", id)
            .in("version_number", [1, 2])
            .single();
          if (selectedVersion) {
            versionData = selectedVersion;
          }
        }

        const versionSteps = (versionData?.steps ?? []) as unknown as Step[];
        const recipeWithVersion: MasterRecipeWithVersion = {
          ...recipeData,
          current_version: versionData
            ? {
                id: versionData.id,
                version_number: versionData.version_number,
                steps: versionSteps,
              }
            : null,
        };

        setRecipe(recipeWithVersion);
        setMasterRecipeId(recipeWithVersion.id);

        if (versionSteps.length === 0) {
          setError("No steps found for this recipe");
          setLoading(false);
          return;
        }

        const sortedSteps = [...versionSteps].sort(
          (a, b) => a.step_number - b.step_number
        );
        setSteps(sortedSteps);

        // Load version-level learnings if My Version exists
        if (myVersion?.learnings) {
          const learnings = myVersion.learnings as unknown as VersionLearning[];
          setVersionLearnings(learnings);
        }

        // SIMPLIFIED: Sessions are per-RECIPE (not per-version)
        // This ensures chat history persists across version switches
        const { data: existingSession } = await supabase
          .from("cook_sessions")
          .select("*")
          .eq("master_recipe_id", recipeWithVersion.id)
          .eq("user_id", user.id)
          .eq("is_complete", false)
          .order("started_at", { ascending: false })
          .limit(1)
          .single();

        const selectedVersionId = versionData?.id || null;
        setActiveVersionId(selectedVersionId);

        if (existingSession) {
          setSessionId(existingSession.id);
          // Update session version_id if it's stale/null and we have a selected version
          if (
            selectedVersionId &&
            existingSession.version_id !== selectedVersionId
          ) {
            await supabase
              .from("cook_sessions")
              .update({ version_id: selectedVersionId })
              .eq("id", existingSession.id);
          }
          if (existingSession.completed_steps) {
            const stepsArray = existingSession.completed_steps as number[];
            setCompletedSteps(new Set(stepsArray));
          }
          if (existingSession.detected_learnings) {
            setDetectedLearnings(
              existingSession.detected_learnings as unknown as DetectedLearning[]
            );
          }

          // Load all chat messages for this session
          const { data: messagesData } = await supabase
            .from("cook_session_messages")
            .select("*")
            .eq("session_id", existingSession.id)
            .order("created_at", { ascending: true });

          if (messagesData) {
            setMessages(
              messagesData.map((m) => ({
                id: m.id,
                dbId: m.id,
                role: m.role as "assistant" | "user",
                content: m.content,
                timestamp: new Date(m.created_at || Date.now()),
                feedback: m.feedback as "helpful" | "not_helpful" | null,
                intent:
                  (m as unknown as { intent?: string }).intent || undefined,
              }))
            );
          }
        } else {
          // Check if user has already completed this recipe before
          const { count: completedCount } = await supabase
            .from("cook_sessions")
            .select("*", { count: "exact", head: true })
            .eq("master_recipe_id", recipeWithVersion.id)
            .eq("user_id", user.id)
            .eq("is_complete", true);

          if (completedCount && completedCount > 0) {
            const shouldRecook = await new Promise<boolean>((resolve) => {
              Alert.alert(
                "Cook Again?",
                `You've cooked this recipe ${completedCount} time${completedCount > 1 ? "s" : ""} before. Start a fresh cook?`,
                [
                  {
                    text: "Go Back",
                    style: "cancel",
                    onPress: () => resolve(false),
                  },
                  { text: "Cook Again", onPress: () => resolve(true) },
                ],
                { cancelable: false }
              );
            });

            if (!shouldRecook) {
              router.back();
              return;
            }
          }

          // Create new session for this recipe (not tied to specific version)
          const { data: newSession, error: sessionError } = await supabase
            .from("cook_sessions")
            .insert({
              master_recipe_id: recipeWithVersion.id,
              version_id: selectedVersionId,
              user_id: user.id,
              started_at: new Date().toISOString(),
              is_complete: false,
              completed_steps: [],
            })
            .select()
            .single();

          if (sessionError || !newSession) {
            console.error("Failed to create session:", sessionError);
          } else {
            setSessionId(newSession.id);
            // Defer analytics until cooking mode prefs are loaded to avoid mislabeling
            if (!isModeLoading) {
              Analytics.cookStarted(recipeWithVersion.id, cookingMode);
            } else {
              pendingCookStartRef.current = recipeWithVersion.id;
            }
            const welcomeMsg = `Let's make ${recipeWithVersion.title}! Swipe up to see each step. Tap me if you need help or want to make a substitution.`;
            addAssistantMessage(welcomeMsg, true);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching recipe:", err);
        setError(err instanceof Error ? err.message : "Failed to load recipe");
        setLoading(false);
      }
    };

    fetchRecipeAndSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, versionId]); // addAssistantMessage intentionally omitted

  // Fire deferred cook_started event once cooking mode prefs are loaded
  useEffect(() => {
    if (!isModeLoading && pendingCookStartRef.current) {
      Analytics.cookStarted(pendingCookStartRef.current, cookingMode);
      pendingCookStartRef.current = null;
    }
  }, [isModeLoading, cookingMode]);

  // Timer interval effect
  // Note: addAssistantMessage and speakText intentionally omitted from deps
  // to avoid restarting interval on every render
  useEffect(() => {
    if (activeTimers.length > 0 && !timerIntervalRef.current) {
      timerIntervalRef.current = setInterval(() => {
        setActiveTimers(
          (prev) =>
            prev
              .map((timer) => {
                const newRemaining = timer.remainingSeconds - 1;
                if (newRemaining <= 0) {
                  const msg = `Timer done! ${timer.label} is ready.`;
                  addAssistantMessage(msg);
                  playTimerAlarm();
                  if (ttsEnabled) speakText(msg);
                  triggerHaptic("success");
                  return null;
                }
                return { ...timer, remainingSeconds: newRemaining };
              })
              .filter(Boolean) as ActiveTimer[]
        );
      }, 1000);
    } else if (activeTimers.length === 0 && timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimers.length, ttsEnabled]);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      TTS.stop();
    };
  }, []);

  // Track previous learnings length to only show toast for NEW learnings
  const prevLearningsLengthRef = useRef(0);

  // Initialize ref when modal opens to prevent showing toast for existing learnings
  useEffect(() => {
    if (chatModalVisible) {
      prevLearningsLengthRef.current = detectedLearnings.length;
      setShowLearningToast(false); // Hide any visible toast when modal opens
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatModalVisible]); // Only run when modal visibility changes, not when detectedLearnings changes

  // Watch for new learnings and show toast (only for NEW additions, Chef mode only)
  useEffect(() => {
    // Skip learning toasts in Casual mode
    if (!isChef) return;

    const currentLength = detectedLearnings.length;
    if (currentLength > prevLearningsLengthRef.current) {
      const latestLearning = detectedLearnings[currentLength - 1];
      setCurrentLearningType(latestLearning.type);
      // Reset toast to trigger re-render
      setShowLearningToast(false);
      setTimeout(() => setShowLearningToast(true), 50);
      triggerHaptic("success");
    }
    prevLearningsLengthRef.current = currentLength;
  }, [detectedLearnings, isChef]);

  // Fetch initial rate limit status when session is ready
  useEffect(() => {
    const fetchRateLimit = async () => {
      if (!sessionId) return;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase.rpc("get_rate_limit_status", {
          p_user_id: user.id,
        });

        if (!error && data) {
          const rateLimitData = data as {
            current: number;
            limit: number;
            remaining: number;
            tier: string;
          };
          setRateLimit({
            current: rateLimitData.current,
            limit: rateLimitData.limit,
            remaining: rateLimitData.remaining,
            tier: rateLimitData.tier === "chef" ? "chef" : "free",
          });
        }
      } catch (err) {
        console.error("Failed to fetch rate limit:", err);
      }
    };

    fetchRateLimit();
  }, [sessionId]);

  // Recording duration tracker
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setRecordingDuration(0);
    }
    return () => {
      if (recordingIntervalRef.current)
        clearInterval(recordingIntervalRef.current);
    };
  }, [isRecording]);

  // Message helpers
  const addAssistantMessage = useCallback(
    (
      content: string,
      skipSave = false,
      extra?: { dbId?: string; intent?: string; animate?: boolean }
    ) => {
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        dbId: extra?.dbId,
        role: "assistant",
        content,
        timestamp: new Date(),
        intent: extra?.intent,
        animate: extra?.animate,
      };
      setMessages((prev) => [...prev, newMessage]);

      if (sessionId && !skipSave) {
        supabase
          .from("cook_session_messages")
          .insert({
            session_id: sessionId,
            role: "assistant",
            content,
            current_step: currentStepIndex + 1,
          })
          .then(({ error }) => {
            if (error) console.error("[Cook] Failed to save message:", error);
          });
      }
    },
    [sessionId, currentStepIndex]
  );

  const addUserMessage = useCallback(
    (content: string, skipSave = false) => {
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newMessage]);

      if (sessionId && !skipSave) {
        supabase
          .from("cook_session_messages")
          .insert({
            session_id: sessionId,
            role: "user",
            content,
            current_step: currentStepIndex + 1,
          })
          .then(({ error }) => {
            if (error) console.error("[Cook] Failed to save message:", error);
          });
      }
    },
    [sessionId, currentStepIndex]
  );

  // TTS helpers
  const speakText = useCallback((text: string) => {
    TTS.stop();
    TTS.speak(text, {
      voice: "nova",
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    TTS.stop();
    setIsSpeaking(false);
  }, []);

  // Haptics - provides premium feel for key interactions
  const triggerHaptic = (
    type: "light" | "medium" | "success" | "error" = "light"
  ) => {
    if (type === "success") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === "error") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (type === "medium") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Step completion - incremental: marking step N marks all steps 1..N
  const handleToggleStep = async (stepNumber: number) => {
    const isUnchecking = completedSteps.has(stepNumber);

    setCompletedSteps((prev) => {
      const next = new Set(prev);

      // Trigger appropriate haptic based on action
      triggerHaptic(isUnchecking ? "light" : "success");

      if (isUnchecking) {
        // Unchecking: remove this step and all steps AFTER it
        for (let i = stepNumber; i <= steps.length; i++) {
          next.delete(i);
        }
      } else {
        // Checking: mark this step AND all steps BEFORE it
        for (let i = 1; i <= stepNumber; i++) {
          next.add(i);
        }
      }

      if (sessionId) {
        const completedArray = Array.from(next).sort((a, b) => a - b);
        supabase
          .from("cook_sessions")
          .update({
            current_step: Math.max(...completedArray, 0) + 1,
            completed_steps: completedArray,
          })
          .eq("id", sessionId)
          .then(({ error }) => {
            if (error) console.error("[Cook] Failed to save step:", error);
          });
      }

      return next;
    });

    // Auto-advance to next step after marking complete (not when unchecking)
    if (!isUnchecking && stepNumber < steps.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: stepNumber, // stepNumber is 1-indexed, so this is the next 0-indexed step
          animated: true,
        });
      }, 500);
    }
  };

  // Timer management
  const handleStartTimer = (step: Step) => {
    if (!step.duration_minutes) return;

    const existingTimer = activeTimers.find(
      (t) => t.stepNumber === step.step_number
    );
    if (existingTimer) return;

    triggerHaptic("light");
    const label = step.timer_label || `Step ${step.step_number}`;

    setActiveTimers((prev) => [
      ...prev,
      {
        id: `${step.id}-${Date.now()}`,
        label,
        totalSeconds: step.duration_minutes! * 60,
        remainingSeconds: step.duration_minutes! * 60,
        stepNumber: step.step_number,
      },
    ]);

    const msg = `Starting ${step.duration_minutes} minute timer for ${label}.`;
    addAssistantMessage(msg);
    if (ttsEnabled) speakText(msg);
  };

  const handleCancelTimer = (timerId: string) => {
    setActiveTimers((prev) => prev.filter((t) => t.id !== timerId));
    triggerHaptic("light");
  };

  // Voice input
  const toggleVoiceInput = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert(
          "Permission needed",
          "Please allow microphone access to use voice input."
        );
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      triggerHaptic("light");
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorder.stop();
      setIsRecording(false);
      setIsTranscribing(true);

      const uri = audioRecorder.uri;
      if (!uri) {
        setIsTranscribing(false);
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { data: sessionData } = await supabase.auth.refreshSession();
      if (!sessionData?.session) {
        setIsTranscribing(false);
        return;
      }

      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
      const response = await fetch(`${supabaseUrl}/functions/v1/whisper`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ audio: base64 }),
      });

      if (response.ok) {
        const { text } = await response.json();
        if (text) {
          setQuestion(text);
          sendMessage(text);
        }
      }

      setIsTranscribing(false);
    } catch (err) {
      console.error("Failed to stop recording:", err);
      setIsRecording(false);
      setIsTranscribing(false);
    }
  };

  // Chat
  const sendMessage = async (text: string) => {
    if (!text.trim() || !sessionId) return;

    const userQuestion = text.trim();
    addUserMessage(userQuestion, true);
    setQuestion("");
    triggerHaptic("light");
    setIsTyping(true);

    try {
      const { data: sessionData } = await supabase.auth.refreshSession();
      if (!sessionData?.session) throw new Error("Not authenticated");

      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
      const response = await fetch(`${supabaseUrl}/functions/v1/cook-chat-v2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: userQuestion,
          step_number: currentStepIndex + 1, // Current visible step (1-indexed)
          version_id: activeVersionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Chat failed:", {
          status: response.status,
          error: data.error,
          code: data.code,
          details: data.details,
          data: data,
        });

        // Handle rate limit exceeded with Alert
        if (response.status === 429 && data.code === "RATE_LIMIT_EXCEEDED") {
          triggerHaptic("error");
          setRateLimit({
            current: data.current as number,
            limit: data.limit as number,
            remaining: 0,
            tier: (data.tier as string) === "chef" ? "chef" : "free",
          });

          const isFreeTier = data.tier === "free";
          Alert.alert(
            "Daily Limit Reached",
            `You've used all ${data.limit} messages for today.${isFreeTier ? "\n\nUpgrade to Chef tier for 500 messages/day!" : "\n\nYour limit resets at midnight."}`,
            isFreeTier
              ? [
                  { text: "Later", style: "cancel" },
                  {
                    text: "Upgrade",
                    onPress: () => router.push("/paywall"),
                  },
                ]
              : [{ text: "OK" }]
          );

          addAssistantMessage(
            `You've reached your daily limit (${data.current}/${data.limit}). ${isFreeTier ? "Upgrade to Chef tier for more messages!" : "Try again tomorrow."}`
          );
          throw new Error(`Chat failed: ${response.status} - ${data.error}`);
        }

        // Other error handling
        let errorMessage = "Sorry, something went wrong. Please try again.";
        if (response.status === 500) {
          errorMessage =
            data.details || data.error || "Server error. Please try again.";
        } else if (response.status === 401) {
          errorMessage = "Session expired. Please restart the app.";
        } else if (response.status === 429) {
          errorMessage =
            data.error || "Rate limit exceeded. Please try again later.";
        }

        addAssistantMessage(errorMessage);
        throw new Error(`Chat failed: ${response.status} - ${data.error}`);
      }

      const assistantResponse =
        data.response || "Sorry, I couldn't process that.";
      const voiceResponse = data.voice_response || assistantResponse;

      addAssistantMessage(assistantResponse, true, {
        dbId: data.message_id,
        intent: data.intent,
        animate: true,
      });

      // Track chat message with intent
      Analytics.chatMessageSent(data.intent || "unknown");

      if (ttsEnabled && voiceResponse) speakText(voiceResponse);

      // Handle detected learnings based on confidence (Chef mode only)
      if (isChef && data.detected_learning) {
        const learning = data.detected_learning as DetectedLearning;
        const confidence = learning.confidence ?? 0.75; // Default to medium if not provided

        if (confidence >= 0.8) {
          // High confidence: auto-save (triggers toast via useEffect)
          setDetectedLearnings((prev) => [...prev, learning]);

          // Also apply to My Version
          const learningContent =
            learning.context || learning.modification || "";
          // Version-level: only need content, step_number is optional context
          if (learningContent) {
            applyLearningToVersion({
              type: learning.type,
              content: learningContent,
            });
          } else {
            console.warn(
              "⚠️ Skipping applyLearningToVersion - missing content"
            );
          }
        } else {
          // Low confidence: show confirmation modal
          setPendingLearning({
            type: learning.type,
            content: learning.context || learning.modification,
            confidence,
            stepNumber: learning.step_number,
            original: learning,
          });
          setShowLearningConfirmModal(true);
        }
      }

      // Update rate limit state for UI warnings
      if (data.rate_limit && typeof data.rate_limit.current === "number") {
        setRateLimit({
          current: data.rate_limit.current,
          limit: data.rate_limit.limit,
          remaining: data.rate_limit.remaining,
          tier: data.rate_limit.tier === "chef" ? "chef" : "free",
        });
      }
    } catch (err) {
      console.error("Chat error:", err);
      // Only add error message if we haven't already added one above
      if (err instanceof Error && !err.message.includes("Chat failed:")) {
        addAssistantMessage("Sorry, something went wrong. Please try again.");
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendQuestion = () => {
    if (question.trim()) sendMessage(question);
  };

  // Feedback
  const handleFeedback = async (
    msgId: string,
    dbId: string | undefined,
    feedback: "helpful" | "not_helpful"
  ) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback } : m))
    );

    if (dbId) {
      await supabase
        .from("cook_session_messages")
        .update({ feedback })
        .eq("id", dbId);
    }
  };

  // Remember this
  const handleRememberThis = (msg: ChatMessage) => {
    setRememberMessage(msg);
    setRememberType("substitution");
    setShowRememberModal(true);
  };

  // Map learning type to valid database label
  const mapLearningTypeToLabel = (type: LearningType): string => {
    switch (type) {
      case "substitution":
        return "substitution_used";
      case "preference":
        return "preference_expressed";
      case "timing":
        return "doneness_preference";
      case "technique":
        return "technique_learned";
      case "addition":
        return "modification_made";
      case "modification":
        return "modification_made";
      case "tip":
        return "technique_learned"; // tips are learned techniques/best practices
      default:
        return "modification_made";
    }
  };

  // Learning confirmation modal handlers
  const handleConfirmLearning = async (editedLearning: {
    type: LearningType;
    content: string;
  }) => {
    if (!pendingLearning || !sessionId) return;

    // Get user first - needed for both RPC and memory insert
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("No user found for learning confirmation");
      return;
    }

    // Create the final learning object with edited values
    const confirmedLearning: DetectedLearning = {
      ...pendingLearning.original,
      type: editedLearning.type,
      context: editedLearning.content,
      modification: editedLearning.content,
      confidence: 1.0, // User confirmed = 100% confidence
    };

    try {
      // 1. Persist to session's detected_learnings array
      const { error: rpcError } = await supabase.rpc(
        "append_detected_learning",
        {
          p_session_id: sessionId,
          p_user_id: user.id,
          p_learning: confirmedLearning as unknown as Json,
        }
      );

      if (rpcError) {
        console.error(
          "Failed to save confirmed learning to session:",
          rpcError
        );
      }

      // 2. Persist to user_cooking_memory for RAG
      const memoryType =
        confirmedLearning.type === "preference" ? "preference" : "cooking_note";
      const memoryLabel = mapLearningTypeToLabel(confirmedLearning.type);

      const { data: memoryData, error: memoryError } = await supabase
        .from("user_cooking_memory")
        .insert({
          user_id: user.id,
          content: confirmedLearning.context,
          memory_type: memoryType,
          source_session_id: sessionId,
          label: memoryLabel,
          metadata: {
            master_recipe_id: masterRecipeId,
            recipe_title: recipe?.title,
            learning_type: confirmedLearning.type,
            original: confirmedLearning.original,
            modification: confirmedLearning.modification,
            step_number: confirmedLearning.step_number,
            confirmed_by_user: true,
          },
        })
        .select("id")
        .single();

      if (memoryError) {
        console.error("Failed to save learning to memory:", memoryError);
      } else if (memoryData) {
        // 3. Generate embedding via edge function (async, non-blocking)
        supabase.functions
          .invoke("embed-memory", {
            body: {
              memory_id: memoryData.id,
              content: confirmedLearning.context,
            },
          })
          .then(({ error }) => {
            if (error) console.warn("Embedding generation failed:", error);
          });
      }
    } catch (err) {
      console.error("Error persisting confirmed learning:", err);
    }

    // 3. Add to local detected learnings (triggers toast via useEffect)
    setDetectedLearnings((prev) => [...prev, confirmedLearning]);

    // 4. Apply learning to My Version (creates v2 if needed for outsourced recipes)
    await applyLearningToVersion({
      type: editedLearning.type,
      content: editedLearning.content,
    });

    // Close modal and clear pending
    setShowLearningConfirmModal(false);
    setPendingLearning(null);
  };

  const handleDismissLearning = () => {
    setShowLearningConfirmModal(false);
    setPendingLearning(null);
  };

  const extractSubstitutionFromMessage = (content: string) => {
    const patterns = [
      /(?:using|used|use)\s+(.+?)\s+(?:instead of|not)\s+(.+)/i,
      /(?:swap|swapped|substitute|substituted)\s+(.+?)\s+(?:for|with)\s+(.+)/i,
      /(.+?)\s+(?:instead of|rather than)\s+(.+)/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return { replacement: match[1].trim(), original: match[2].trim() };
      }
    }
    return { replacement: null, original: null };
  };

  const updateStepsWithSubstitution = (
    original: string,
    replacement: string
  ) => {
    const regex = new RegExp(`\\b${original}\\b`, "gi");
    setSteps((prev) =>
      prev.map((step) => {
        if (regex.test(step.instruction)) {
          return {
            ...step,
            instruction: step.instruction.replace(
              regex,
              `${replacement} (instead of ${original})`
            ),
          };
        }
        return step;
      })
    );
  };

  const saveLearningToSession = async () => {
    if (!sessionId || !rememberMessage) return;

    setIsSavingLearning(true);
    triggerHaptic("light");

    try {
      // Get current user for RPC call
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "Not authenticated");
        return;
      }
      let original: string | null = null;
      let modification = rememberMessage.content;
      let context = rememberMessage.content;

      if (rememberType === "substitution") {
        const extracted = extractSubstitutionFromMessage(
          rememberMessage.content
        );
        if (extracted.original && extracted.replacement) {
          original = extracted.original;
          modification = extracted.replacement;
          context = `Uses ${extracted.replacement} instead of ${extracted.original}`;
          updateStepsWithSubstitution(
            extracted.original,
            extracted.replacement
          );
        }
      }

      const learning: DetectedLearning = {
        type: rememberType,
        original,
        modification,
        context,
        step_number: currentStepIndex + 1,
        detected_at: new Date().toISOString(),
        confidence: 1.0, // User manually saved = 100% confidence
      };

      // 1. Persist to session's detected_learnings array
      const { error } = await supabase.rpc("append_detected_learning", {
        p_session_id: sessionId,
        p_user_id: user.id,
        p_learning: learning as unknown as Json,
      });

      if (error) {
        Alert.alert("Error", "Could not save this to your version.");
        return;
      }

      // 2. Persist to user_cooking_memory for RAG (same as handleConfirmLearning)
      const memoryType =
        rememberType === "preference" ? "preference" : "cooking_note";
      const memoryLabel = mapLearningTypeToLabel(rememberType);

      const { error: memoryError } = await supabase
        .from("user_cooking_memory")
        .insert({
          user_id: user.id,
          content: learning.context,
          memory_type: memoryType,
          source_session_id: sessionId,
          label: memoryLabel,
          metadata: {
            master_recipe_id: masterRecipeId,
            recipe_title: recipe?.title,
            learning_type: learning.type,
            original: learning.original,
            modification: learning.modification,
            step_number: learning.step_number,
            manual_save: true,
          },
        });

      if (memoryError) {
        // Log but don't fail - primary save to session already succeeded
        console.warn(
          "[Remember] Failed to save to cooking memory:",
          memoryError
        );
      }

      // 3. Apply to version-level learnings (for Compare/VersionToggle)
      await applyLearningToVersion({
        type: learning.type,
        content: learning.context,
      });

      setDetectedLearnings((prev) => [...prev, learning]);
      setShowRememberModal(false);
      setRememberMessage(null);

      const msg = "Got it! I'll remember that for your version.";
      addAssistantMessage(msg);
      if (ttsEnabled) speakText(msg);
    } catch (err) {
      console.error("[Remember] Error:", err);
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setIsSavingLearning(false);
    }
  };

  // Navigation
  const handleExit = () => {
    stopSpeaking();

    if (activeTimers.length > 0) {
      Alert.alert(
        "Timers Running",
        `You have ${activeTimers.length} active timer${activeTimers.length > 1 ? "s" : ""}. They will stop if you exit.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Exit Anyway",
            style: "destructive",
            onPress: () => {
              if (timerIntervalRef.current)
                clearInterval(timerIntervalRef.current);
              setActiveTimers([]);
              TTS.clearCache();
              router.back();
            },
          },
        ]
      );
    } else {
      Alert.alert(
        "Exit Cooking?",
        "Your progress is saved. You can continue later.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Exit",
            style: "destructive",
            onPress: () => {
              TTS.clearCache();
              router.back();
            },
          },
        ]
      );
    }
  };

  /**
   * SIMPLIFIED: Apply learning to My Version (v2)
   * Learnings are stored at version level, not per-step
   */
  const applyLearningToVersion = async (learning: {
    type: LearningType;
    content: string;
  }) => {
    if (!masterRecipeId) return;

    try {
      // Step 1: Get or create My Version (v2)
      const v2Result = await supabase
        .from("master_recipe_versions")
        .select("id, learnings")
        .eq("master_recipe_id", masterRecipeId)
        .eq("version_number", 2)
        .single();

      let v2 = v2Result.data;
      const v2Error = v2Result.error;

      if (v2Error && v2Error.code === "PGRST116") {
        // v2 doesn't exist - create from v1
        const { data: v1 } = await supabase
          .from("master_recipe_versions")
          .select("*")
          .eq("master_recipe_id", masterRecipeId)
          .eq("version_number", 1)
          .single();

        if (!v1) {
          console.error("❌ Cannot find v1 to create v2");
          return;
        }

        const { data: newV2, error: createError } = await supabase
          .from("master_recipe_versions")
          .insert({
            master_recipe_id: masterRecipeId,
            version_number: 2,
            title: v1.title,
            description: v1.description,
            mode: v1.mode,
            cuisine: v1.cuisine,
            category: v1.category,
            prep_time_minutes: v1.prep_time_minutes,
            cook_time_minutes: v1.cook_time_minutes,
            servings: v1.servings,
            servings_unit: v1.servings_unit,
            ingredients: v1.ingredients,
            steps: v1.steps,
            learnings: [],
            parent_version_id: v1.id,
            based_on_source_id: v1.based_on_source_id,
            created_from_mode: "cook_session",
            created_from_title: "My personalized version",
          })
          .select("id, learnings")
          .single();

        if (createError || !newV2) {
          console.error("❌ Failed to create v2:", createError);
          return;
        }

        v2 = newV2;

        // Update master recipe to point to v2
        await supabase
          .from("master_recipes")
          .update({ current_version_id: v2.id })
          .eq("id", masterRecipeId);
      }

      if (!v2) {
        console.error("❌ No v2 available");
        return;
      }

      // Step 2: Add the learning to version-level learnings array
      const existingLearnings =
        (v2.learnings as VersionLearning[] | null) || [];
      const newLearning: VersionLearning = {
        type: learning.type,
        content: learning.content,
        added_at: new Date().toISOString(),
      };
      const updatedLearnings = [...existingLearnings, newLearning];

      // Step 3: Save to database
      const { error: updateError } = await supabase
        .from("master_recipe_versions")
        .update({ learnings: updatedLearnings as unknown as Json })
        .eq("id", v2.id);

      if (updateError) {
        console.error("Failed to save learning:", updateError);
      } else {
        // Update local state
        setVersionLearnings(updatedLearnings);
      }
    } catch (err) {
      console.error("Error in applyLearningToVersion:", err);
    }
  };

  /**
   * Delete a learning from My Version (v2)
   */
  const _handleDeleteLearning = async (learningIndex: number) => {
    if (!masterRecipeId) return;

    try {
      // Get v2
      const { data: v2, error: v2Error } = await supabase
        .from("master_recipe_versions")
        .select("id, learnings")
        .eq("master_recipe_id", masterRecipeId)
        .eq("version_number", 2)
        .single();

      if (v2Error || !v2) {
        console.error("❌ Cannot find v2 to delete learning");
        return;
      }

      // Remove the learning
      const existingLearnings =
        (v2.learnings as VersionLearning[] | null) || [];
      const updatedLearnings = [...existingLearnings];
      updatedLearnings.splice(learningIndex, 1);

      // Save to database
      const { error: updateError } = await supabase
        .from("master_recipe_versions")
        .update({ learnings: updatedLearnings as unknown as Json })
        .eq("id", v2.id);

      if (updateError) {
        console.error("Failed to delete learning:", updateError);
      } else {
        setVersionLearnings(updatedLearnings);
        triggerHaptic("light");
      }
    } catch (err) {
      console.error("Error deleting learning:", err);
    }
  };

  // Completion
  const handleComplete = async () => {
    if (isSessionComplete) {
      router.back();
      return;
    }

    stopSpeaking();
    triggerHaptic("success");

    // Refresh detected learnings from session (in case any were added)
    if (sessionId) {
      const { data: sessionData } = await supabase
        .from("cook_sessions")
        .select("detected_learnings")
        .eq("id", sessionId)
        .single();

      if (sessionData?.detected_learnings) {
        setDetectedLearnings(
          sessionData.detected_learnings as unknown as DetectedLearning[]
        );
      }
    }

    setShowCompletionModal(true);
  };

  const handleShareCompletedCook = useCallback(() => {
    if (!recipe) return;
    shareCompletedCook(recipe.title, recipe.id, activeVersionId || undefined);
  }, [recipe, activeVersionId]);

  const handleAddPhoto = useCallback(async () => {
    try {
      const uri = await pickCookPhoto();
      if (!uri) return; // User cancelled or picker failed
      if (!sessionId || !masterRecipeId) {
        console.warn("[Cook] Photo picked but no session/recipe ID");
        return;
      }
      setPhotoUri(uri);
      setIsUploadingPhoto(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await uploadCookPhoto(uri, user.id, sessionId, masterRecipeId);
    } catch (err) {
      console.warn("[Cook] Photo flow error:", err);
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [sessionId, masterRecipeId]);

  const handleSubmitCompletion = async (skipFeedback = false) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      if (sessionId && masterRecipeId) {
        // SIMPLIFIED: Learnings are already applied in real-time via applyLearningToVersion
        // We just need to mark the session complete and update recipe stats

        await supabase
          .from("cook_sessions")
          .update({
            is_complete: true,
            completed_at: new Date().toISOString(),
            outcome_rating: skipFeedback
              ? null
              : completionRating > 0
                ? completionRating
                : null,
            outcome_notes: skipFeedback ? null : completionNotes || null,
            outcome_tags: skipFeedback ? [] : completionTags,
          })
          .eq("id", sessionId);

        const { data: masterData } = await supabase
          .from("master_recipes")
          .select("times_cooked, user_rating")
          .eq("id", masterRecipeId)
          .single();

        await supabase
          .from("master_recipes")
          .update({
            times_cooked: (masterData?.times_cooked || 0) + 1,
            last_cooked_at: new Date().toISOString(),
            status: "cooked",
            user_rating:
              !skipFeedback && completionRating > 0
                ? completionRating
                : masterData?.user_rating,
          })
          .eq("id", masterRecipeId);

        setIsSessionComplete(true);
        // Track cook session completion
        Analytics.cookCompleted(masterRecipeId, 0); // Duration calculated server-side if needed
      }

      setShowCompletionModal(false);
      router.back();
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const toggleCompletionTag = (tag: string) => {
    setCompletionTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Handle viewable items change
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentStepIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  // Render step card
  const renderStepCard = ({ item: step }: { item: Step }) => (
    <StepCard
      step={step}
      totalSteps={steps.length}
      height={stepCardHeight}
      isCompleted={completedSteps.has(step.step_number)}
      timerActive={activeTimers.some((t) => t.stepNumber === step.step_number)}
      onToggleComplete={handleToggleStep}
      onStartTimer={handleStartTimer}
      isChef={isChef}
    />
  );

  // Loading state
  if (loading) {
    return <LoadingOverlay visible type="cook" />;
  }

  // Error state
  if (error || !recipe || steps.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: spacing[4],
          backgroundColor: colors.background,
        }}
      >
        <Text
          style={{
            color: colors.error,
            textAlign: "center",
            marginBottom: spacing[4],
          }}
        >
          {error || "No steps found for this recipe"}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: spacing[6],
            paddingVertical: spacing[3],
            borderRadius: borderRadius.lg,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const allStepsComplete = completedSteps.size === steps.length;
  const progress = (completedSteps.size / steps.length) * 100;

  return (
    <>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header with progress - Glassmorphic (absolutely positioned) */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            paddingTop: insets.top,
            paddingHorizontal: spacing[4],
            paddingBottom: spacing[3],
            backgroundColor: "rgba(255, 255, 255, 0.85)",
            borderBottomWidth: 1,
            borderBottomColor: "rgba(0, 0, 0, 0.06)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 6,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: spacing[2],
            }}
          >
            <Pressable
              onPress={handleExit}
              style={{ padding: spacing[2] }}
              hitSlop={8}
            >
              <Ionicons name="close" size={28} color={colors.textSecondary} />
            </Pressable>

            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.textPrimary,
                flex: 1,
                textAlign: "center",
              }}
              numberOfLines={1}
            >
              {recipe.title}
            </Text>

            <Pressable
              onPress={allStepsComplete ? handleComplete : undefined}
              style={{
                backgroundColor: allStepsComplete
                  ? colors.success
                  : colors.surface,
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[2],
                borderRadius: borderRadius.full,
              }}
            >
              <Text
                style={{
                  color: allStepsComplete ? "#fff" : colors.textSecondary,
                  fontWeight: "600",
                  fontSize: 14,
                }}
              >
                {allStepsComplete
                  ? "Done"
                  : `${steps.length - completedSteps.size} left`}
              </Text>
            </Pressable>
          </View>

          {/* Progress bar */}
          <View
            style={{
              height: 4,
              backgroundColor: colors.border,
              borderRadius: 2,
            }}
          >
            <View
              style={{
                height: 4,
                backgroundColor: allStepsComplete
                  ? colors.success
                  : colors.primary,
                borderRadius: 2,
                width: `${progress}%`,
              }}
            />
          </View>
        </View>

        {/* Timer Overlay */}
        <TimerOverlay
          timers={activeTimers}
          topOffset={insets.top + 70}
          onCancelTimer={handleCancelTimer}
        />

        {/* TikTok-style vertical step pager */}
        <FlatList
          ref={flatListRef}
          data={steps}
          renderItem={renderStepCard}
          keyExtractor={(item) => String(item.step_number)}
          pagingEnabled
          snapToInterval={stepCardHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: stepCardHeight,
            offset: stepCardHeight * index,
            index,
          })}
          contentContainerStyle={{
            paddingTop: headerHeight,
            paddingBottom: bottomBarHeight,
          }}
          scrollIndicatorInsets={{
            top: headerHeight,
            bottom: bottomBarHeight,
          }}
          ListFooterComponent={
            <View
              style={{
                height: stepCardHeight,
                padding: spacing[4],
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderRadius: borderRadius["2xl"],
                  borderCurve: "continuous",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: spacing[4],
                  padding: spacing[6],
                }}
              >
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: allStepsComplete ? "#DCFCE7" : "#FFF7ED",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name={allStepsComplete ? "checkmark-circle" : "restaurant"}
                    size={40}
                    color={allStepsComplete ? colors.success : colors.primary}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: colors.textPrimary,
                    textAlign: "center",
                  }}
                >
                  {allStepsComplete
                    ? "You did it!"
                    : `${steps.length - completedSteps.size} step${steps.length - completedSteps.size !== 1 ? "s" : ""} left`}
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    color: colors.textSecondary,
                    textAlign: "center",
                    lineHeight: 22,
                  }}
                >
                  {allStepsComplete
                    ? "Rate your cook, add a photo, and save your progress."
                    : "You can still finish even if you didn't check every step."}
                </Text>
                <Pressable
                  onPress={handleComplete}
                  style={{
                    backgroundColor: allStepsComplete
                      ? colors.success
                      : colors.primary,
                    paddingHorizontal: spacing[8],
                    paddingVertical: spacing[4],
                    borderRadius: borderRadius.full,
                    marginTop: spacing[2],
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 18,
                      fontWeight: "700",
                    }}
                  >
                    Complete Cook
                  </Text>
                </Pressable>
              </View>
            </View>
          }
        />

        {/* Step indicator dots - right edge with glassmorphic pill */}
        {steps.length > 1 && (
          <View
            style={{
              position: "absolute",
              right: spacing[2],
              top: headerHeight + 20,
              bottom: bottomBarHeight + 20,
              justifyContent: "center",
              alignItems: "center",
              zIndex: 5,
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                borderRadius: 12,
                borderCurve: "continuous",
                paddingVertical: spacing[2],
                paddingHorizontal: 6,
                gap: spacing[2],
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              {steps.map((step, index) => (
                <Pressable
                  key={step.step_number}
                  onPress={() => {
                    flatListRef.current?.scrollToIndex({
                      index,
                      animated: true,
                    });
                    triggerHaptic("light");
                  }}
                  hitSlop={6}
                  style={{
                    width: index === currentStepIndex ? 10 : 8,
                    height: index === currentStepIndex ? 10 : 8,
                    borderRadius: 5,
                    backgroundColor: completedSteps.has(step.step_number)
                      ? colors.success
                      : index === currentStepIndex
                        ? colors.primary
                        : colors.border,
                    opacity: index === currentStepIndex ? 1 : 0.7,
                  }}
                />
              ))}
            </View>
          </View>
        )}

        {/* Bottom controls - Glassmorphic */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            paddingBottom: insets.bottom + spacing[2],
            backgroundColor: "rgba(255, 255, 255, 0.85)",
            borderTopWidth: 1,
            borderTopColor: "rgba(0, 0, 0, 0.06)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.18,
            shadowRadius: 20,
            elevation: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
          }}
        >
          {/* Previous Step button — always visible, disabled on step 1 */}
          <Pressable
            onPress={() => {
              if (currentStepIndex <= 0) return;
              flatListRef.current?.scrollToIndex({
                index: currentStepIndex - 1,
                animated: true,
              });
              triggerHaptic("light");
            }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor:
                currentStepIndex > 0 ? colors.surface : colors.surfaceElevated,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: currentStepIndex > 0 ? colors.border : "transparent",
              opacity: currentStepIndex > 0 ? 1 : 0.3,
            }}
          >
            <Ionicons name="chevron-up" size={32} color={colors.textPrimary} />
          </Pressable>

          {/* Ask Chez button */}
          <Pressable
            onPress={() => setChatModalVisible(true)}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing[2],
              backgroundColor: colors.primary,
              height: 64,
              borderRadius: borderRadius.full,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 17 }}>
              Ask Chez
            </Text>
            {messages.length > 1 && (
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.3)",
                  paddingHorizontal: spacing[2],
                  paddingVertical: 2,
                  borderRadius: borderRadius.full,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}
                >
                  {messages.length}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Next Step button — always visible, disabled on last step */}
          <Pressable
            onPress={() => {
              if (currentStepIndex >= steps.length - 1) return;
              flatListRef.current?.scrollToIndex({
                index: currentStepIndex + 1,
                animated: true,
              });
              triggerHaptic("light");
            }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor:
                currentStepIndex < steps.length - 1
                  ? colors.primary
                  : colors.surfaceElevated,
              justifyContent: "center",
              alignItems: "center",
              opacity: currentStepIndex < steps.length - 1 ? 1 : 0.3,
            }}
          >
            <Ionicons
              name="chevron-down"
              size={32}
              color={
                currentStepIndex < steps.length - 1 ? "#fff" : colors.textMuted
              }
            />
          </Pressable>
        </View>
      </View>

      {/* Modals */}
      <ChatModal
        visible={chatModalVisible}
        onClose={() => setChatModalVisible(false)}
        messages={messages}
        question={question}
        setQuestion={setQuestion}
        onSendQuestion={handleSendQuestion}
        onRememberThis={handleRememberThis}
        onFeedback={handleFeedback}
        isTyping={isTyping}
        isSpeaking={isSpeaking}
        onStopSpeaking={stopSpeaking}
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        recordingDuration={recordingDuration}
        onToggleVoice={toggleVoiceInput}
        isChef={isChef}
        showLearningToast={showLearningToast}
        currentLearningType={currentLearningType}
        onLearningToastComplete={() => setShowLearningToast(false)}
        rateLimit={rateLimit}
      />

      <CompletionModal
        visible={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        detectedLearnings={detectedLearnings}
        wantsToSaveVersion={wantsToSaveVersion}
        setWantsToSaveVersion={setWantsToSaveVersion}
        completionRating={completionRating}
        setCompletionRating={setCompletionRating}
        completionTags={completionTags}
        toggleCompletionTag={toggleCompletionTag}
        completionNotes={completionNotes}
        setCompletionNotes={setCompletionNotes}
        isCreatingVersion={isCreatingVersion}
        onSubmit={handleSubmitCompletion}
        onShare={handleShareCompletedCook}
        onAddPhoto={handleAddPhoto}
        photoUri={photoUri}
        isUploadingPhoto={isUploadingPhoto}
        isChef={isChef}
      />

      <RememberModal
        visible={showRememberModal}
        onClose={() => {
          setShowRememberModal(false);
          setRememberMessage(null);
        }}
        message={rememberMessage}
        learningType={rememberType}
        setLearningType={setRememberType}
        isSaving={isSavingLearning}
        onSave={saveLearningToSession}
      />

      {/* Learning confirmation modal for low-confidence learnings */}
      {pendingLearning && (
        <LearningConfirmModal
          visible={showLearningConfirmModal}
          learning={pendingLearning}
          recipeName={recipe?.title}
          onConfirm={handleConfirmLearning}
          onDismiss={handleDismissLearning}
        />
      )}
    </>
  );
}
