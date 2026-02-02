import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Platform,
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
import type { Json } from "@/types/database";
import * as TTS from "@/lib/tts";
import { colors, spacing, borderRadius } from "@/constants/theme";
import { useCookingModeWithLoading } from "@/hooks";

// Components & Types
import {
  StepCard,
  TimerOverlay,
  ChatModal,
  CompletionModal,
  RememberModal,
  type Step,
  type MasterRecipeWithVersion,
  type ChatMessage,
  type ActiveTimer,
  type LearningType,
  type DetectedLearning,
} from "@/components/cook";

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
  const { cookingMode } = useCookingModeWithLoading();
  const isChef = cookingMode === "chef";
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

  // Step tracking
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);

  // TTS state
  const [ttsEnabled, setTtsEnabled] = useState(true);
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
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);

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
  const [wantsToSaveVersion, setWantsToSaveVersion] = useState(true);
  const [usedSourceLinkId, setUsedSourceLinkId] = useState<string | null>(null);

  // Calculate step card height
  const stepCardHeight = useMemo(() => {
    const headerHeight = 100;
    const bottomPadding = insets.bottom + 80;
    return SCREEN_HEIGHT - headerHeight - bottomPadding;
  }, [insets.bottom]);

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

        // If versionId was passed, fetch that specific version instead
        let versionData;
        if (versionId) {
          const { data: specificVersion, error: versionError } = await supabase
            .from("master_recipe_versions")
            .select("id, version_number, steps")
            .eq("id", versionId)
            .eq("master_recipe_id", id)
            .single();

          if (!versionError && specificVersion) {
            versionData = specificVersion;
          } else {
            // Fallback to current version
            versionData = Array.isArray(recipeData.current_version)
              ? recipeData.current_version[0]
              : recipeData.current_version;
          }
        } else {
          versionData = Array.isArray(recipeData.current_version)
            ? recipeData.current_version[0]
            : recipeData.current_version;
        }

        const recipeWithVersion: MasterRecipeWithVersion = {
          ...recipeData,
          current_version: versionData || null,
        };

        setRecipe(recipeWithVersion);
        setMasterRecipeId(recipeWithVersion.id);

        if (!versionData?.steps || versionData.steps.length === 0) {
          setError("No steps found for this recipe");
          setLoading(false);
          return;
        }

        const sortedSteps = [...(versionData.steps as Step[])].sort(
          (a, b) => a.step_number - b.step_number
        );
        setSteps(sortedSteps);

        // Check for existing session
        const { data: existingSession } = await supabase
          .from("cook_sessions")
          .select("*")
          .eq("master_recipe_id", recipeWithVersion.id)
          .eq("user_id", user.id)
          .eq("is_complete", false)
          .order("started_at", { ascending: false })
          .limit(1)
          .single();

        if (existingSession) {
          setSessionId(existingSession.id);
          if (existingSession.completed_steps) {
            const stepsArray = existingSession.completed_steps as number[];
            setCompletedSteps(new Set(stepsArray));
          }
          if (existingSession.detected_learnings) {
            setDetectedLearnings(
              existingSession.detected_learnings as unknown as DetectedLearning[]
            );
          }

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
          const { data: newSession, error: sessionError } = await supabase
            .from("cook_sessions")
            .insert({
              master_recipe_id: recipeWithVersion.id,
              version_id: versionData.id,
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
  }, [id, versionId]);

  // Timer interval effect
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
  }, [activeTimers.length, ttsEnabled]);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      TTS.stop();
    };
  }, []);

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
      extra?: { dbId?: string; intent?: string }
    ) => {
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        dbId: extra?.dbId,
        role: "assistant",
        content,
        timestamp: new Date(),
        intent: extra?.intent,
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

  const handleToggleTts = useCallback(() => {
    const newValue = !ttsEnabled;
    setTtsEnabled(newValue);
    if (!newValue) {
      TTS.stop();
      setIsSpeaking(false);
    }
  }, [ttsEnabled]);

  // Haptics
  const triggerHaptic = (type: "light" | "success" = "light") => {
    if (Platform.OS === "ios") {
      if (type === "success") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  // Step completion
  const handleToggleStep = async (stepNumber: number) => {
    triggerHaptic("light");

    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
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
      const response = await fetch(`${supabaseUrl}/functions/v1/transcribe`, {
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
      const response = await fetch(`${supabaseUrl}/functions/v1/cook-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: userQuestion,
          current_step: currentStepIndex + 1,
        }),
      });

      if (!response.ok) throw new Error(`Chat failed: ${response.status}`);

      const data = await response.json();
      const assistantResponse =
        data.response || "Sorry, I couldn't process that.";
      const voiceResponse = data.voice_response || assistantResponse;

      addAssistantMessage(assistantResponse, true, {
        dbId: data.message_id,
        intent: data.intent,
      });

      if (ttsEnabled && voiceResponse) speakText(voiceResponse);
      if (data.detected_learning) {
        setDetectedLearnings((prev) => [...prev, data.detected_learning]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      addAssistantMessage("Sorry, something went wrong. Please try again.");
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
      };

      const { error } = await supabase.rpc("append_detected_learning", {
        p_session_id: sessionId,
        p_learning: learning as unknown as Json,
      });

      if (error) {
        Alert.alert("Error", "Could not save this to your version.");
        return;
      }

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

  // Apply learnings directly to v1 for forked recipes
  const applyLearningsToForkedRecipe = async () => {
    if (!recipe?.current_version?.id || detectedLearnings.length === 0) return;

    // Fetch full version data (including ingredients)
    const { data: versionData, error: versionError } = await supabase
      .from("master_recipe_versions")
      .select("id, ingredients, steps")
      .eq("id", recipe.current_version.id)
      .single();

    if (versionError || !versionData) {
      console.error(
        "Failed to fetch version for learning application:",
        versionError
      );
      return;
    }

    // Apply learnings to ingredients and steps
    const ingredients =
      (versionData.ingredients as unknown as {
        id: string;
        item: string;
        quantity: number | null;
        unit: string | null;
        preparation: string | null;
        is_optional: boolean | null;
        sort_order: number | null;
        original_text: string | null;
      }[]) || [];

    const versionSteps = (versionData.steps as unknown as Step[]) || [];

    const modifiedIngredients = [...ingredients];
    const modifiedSteps = [...versionSteps];
    const changeNotes: string[] = [];

    for (const learning of detectedLearnings) {
      changeNotes.push(learning.context);

      if (learning.type === "substitution" && learning.original) {
        // Find and update the ingredient
        const ingredientIndex = modifiedIngredients.findIndex((ing) =>
          ing.item.toLowerCase().includes(learning.original!.toLowerCase())
        );
        if (ingredientIndex >= 0) {
          modifiedIngredients[ingredientIndex] = {
            ...modifiedIngredients[ingredientIndex],
            item: learning.modification,
            original_text: `Originally: ${learning.original}`,
          };
        }
      } else if (learning.type === "timing" && learning.step_number) {
        // Update step timing
        const stepIndex = modifiedSteps.findIndex(
          (step) => step.step_number === learning.step_number
        );
        if (stepIndex >= 0) {
          const minutesMatch = learning.modification.match(/(\d+)\s*min/i);
          if (minutesMatch) {
            modifiedSteps[stepIndex] = {
              ...modifiedSteps[stepIndex],
              duration_minutes: parseInt(minutesMatch[1], 10),
            };
          }
        }
      } else if (learning.type === "addition") {
        // Add new ingredient
        modifiedIngredients.push({
          id: `learning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          item: learning.modification,
          quantity: null,
          unit: null,
          preparation: null,
          is_optional: false,
          sort_order: modifiedIngredients.length,
          original_text: "Added based on your cooking session",
        });
      }
    }

    // Update the version directly
    const { error: updateError } = await supabase
      .from("master_recipe_versions")
      .update({
        ingredients: modifiedIngredients as unknown as Json,
        steps: modifiedSteps as unknown as Json,
        change_notes: `Updated from cooking session:\n${changeNotes.join("\n")}`,
      })
      .eq("id", recipe.current_version.id);

    if (updateError) {
      console.error("Failed to apply learnings to forked recipe:", updateError);
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

    if (sessionId) {
      const { data: sessionData } = await supabase
        .from("cook_sessions")
        .select("detected_learnings, source_link_id")
        .eq("id", sessionId)
        .single();

      if (sessionData?.detected_learnings) {
        setDetectedLearnings(
          sessionData.detected_learnings as unknown as DetectedLearning[]
        );
      }
      if (sessionData?.source_link_id) {
        setUsedSourceLinkId(sessionData.source_link_id);
      }
    }

    setShowCompletionModal(true);
  };

  const handleSubmitCompletion = async (skipFeedback = false) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      if (sessionId && masterRecipeId) {
        // For forked recipes, we apply learnings directly to v1
        // For outsourced recipes, create-my-version creates/updates My Version (v2)
        const isForkedRecipe = !!recipe?.forked_from_id;

        if (
          wantsToSaveVersion &&
          detectedLearnings.length > 0 &&
          !skipFeedback
        ) {
          setIsCreatingVersion(true);
          try {
            if (isForkedRecipe) {
              // Forked recipes: apply learnings directly to v1
              await applyLearningsToForkedRecipe();
            } else {
              // Outsourced recipes: call edge function to create/update v2
              const { data: sessionData } =
                await supabase.auth.refreshSession();
              if (sessionData?.session) {
                const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
                await fetch(`${supabaseUrl}/functions/v1/create-my-version`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessionData.session.access_token}`,
                  },
                  body: JSON.stringify({
                    session_id: sessionId,
                    master_recipe_id: masterRecipeId,
                    source_link_id: usedSourceLinkId,
                  }),
                });
              }
            }
          } catch (versionError) {
            console.error("Error saving learnings:", versionError);
          } finally {
            setIsCreatingVersion(false);
          }
        }

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
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
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
        {/* Header with progress */}
        <View
          style={{
            paddingTop: insets.top,
            paddingHorizontal: spacing[4],
            paddingBottom: spacing[3],
            backgroundColor: colors.surfaceElevated,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
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
              onPress={handleComplete}
              disabled={!allStepsComplete && !isSessionComplete}
              style={{
                backgroundColor: allStepsComplete ? "#22c55e" : colors.surface,
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[2],
                borderRadius: borderRadius.full,
                opacity: allStepsComplete || isSessionComplete ? 1 : 0.5,
              }}
            >
              <Text
                style={{
                  color: allStepsComplete ? "#fff" : colors.textMuted,
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
                backgroundColor: allStepsComplete ? "#22c55e" : colors.primary,
                borderRadius: 2,
                width: `${progress}%`,
              }}
            />
          </View>
        </View>

        {/* Timer Overlay */}
        <TimerOverlay timers={activeTimers} topOffset={insets.top + 70} />

        {/* TikTok-style vertical step pager */}
        <FlatList
          ref={flatListRef}
          data={steps}
          renderItem={renderStepCard}
          keyExtractor={(item) => item.id}
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
        />

        {/* Bottom controls */}
        <View
          style={{
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            paddingBottom: insets.bottom + spacing[2],
            backgroundColor: colors.surfaceElevated,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
          }}
        >
          {/* TTS Toggle */}
          <Pressable
            onPress={handleToggleTts}
            style={{
              backgroundColor: ttsEnabled ? "#dbeafe" : colors.surface,
              width: 48,
              height: 48,
              borderRadius: 24,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons
              name={ttsEnabled ? "volume-high" : "volume-mute"}
              size={24}
              color={ttsEnabled ? "#1e40af" : colors.textMuted}
            />
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
              paddingVertical: spacing[3],
              borderRadius: borderRadius.full,
            }}
          >
            <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
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

          {/* Swipe hint */}
          <View style={{ alignItems: "center" }}>
            <Ionicons name="chevron-up" size={20} color={colors.textMuted} />
            <Text style={{ fontSize: 10, color: colors.textMuted }}>Swipe</Text>
          </View>
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
    </>
  );
}
