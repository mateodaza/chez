import { Stack, useLocalSearchParams, router } from "expo-router";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import * as TTS from "@/lib/tts";

interface Step {
  id: string;
  step_number: number;
  instruction: string;
  duration_minutes: number | null;
  timer_label: string | null;
}

interface Recipe {
  id: string;
  title: string;
}

interface ChatMessage {
  id: string;
  dbId?: string; // Database ID for updating feedback
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
  feedback?: "helpful" | "not_helpful" | null;
  intent?: string; // The intent classification from cook-chat
}

interface ActiveTimer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  stepNumber: number;
}

export default function CookModeScreen() {
  const { id: recipeId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // State
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [hasPlayedIntro, setHasPlayedIntro] = useState(false);

  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionRating, setCompletionRating] = useState(0);
  const [completionTags, setCompletionTags] = useState<string[]>([]);
  const [completionChanges, setCompletionChanges] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const isSubmittingRef = useRef(false); // Guard against double-tap

  // Step progress state
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepsExpanded, setStepsExpanded] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const ttsEnabledRef = useRef(true);

  // Timer state
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Voice input state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const isRecordingRef = useRef(false);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasPermissionRef = useRef<boolean | null>(null); // Cache permission state
  const maxRecordingSeconds = 30; // Auto-stop after 30 seconds

  const toggleVoiceInput = async () => {
    if (isRecordingRef.current) {
      // Stop recording
      await stopRecording();
    } else {
      // Start recording
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      // Stop any TTS that might be playing
      await TTS.stop();
      setIsSpeaking(false);

      // Check cached permission or request if needed
      if (hasPermissionRef.current === null) {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        hasPermissionRef.current = status.granted;
      }

      if (!hasPermissionRef.current) {
        // Re-check in case user granted permission in settings
        const status = await AudioModule.requestRecordingPermissionsAsync();
        hasPermissionRef.current = status.granted;
        if (!status.granted) {
          Alert.alert(
            "Microphone Permission",
            "Please allow microphone access to use voice input.",
            [{ text: "OK" }]
          );
          return;
        }
      }

      // Configure audio mode for recording
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      // Start recording
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordingDuration(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log("[Voice] Recording started");

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const next = prev + 1;
          // Auto-stop at max duration
          if (next >= maxRecordingSeconds) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      isRecordingRef.current = false;
      Alert.alert("Recording Error", "Could not start voice recording");
    }
  };

  const stopRecording = async () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;

    // Clear duration timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    console.log("[Voice] Stopping recording...");

    try {
      setIsRecording(false);
      setRecordingDuration(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Stop recording
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      console.log("[Voice] Recording stopped, URI:", uri);

      // Reset audio mode
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });

      if (!uri) {
        console.error("No recording URI");
        return;
      }

      // Show transcribing state
      setIsTranscribing(true);

      // Read the audio file as base64
      console.log("[Voice] Reading audio file...");
      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log("[Voice] Audio size:", audioBase64.length, "bytes");

      // Get fresh auth token (refresh if needed)
      const { data: sessionData, error: sessionError } =
        await supabase.auth.refreshSession();
      if (sessionError || !sessionData?.session) {
        console.error("[Voice] Auth error:", sessionError);
        setIsTranscribing(false);
        Alert.alert("Error", "Not authenticated. Please log in again.");
        return;
      }
      console.log("[Voice] Got fresh session token");

      // Call whisper edge function
      console.log("[Voice] Calling Whisper API...");
      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
      const response = await fetch(`${supabaseUrl}/functions/v1/whisper`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ audio: audioBase64 }),
      });

      console.log("[Voice] Whisper response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Voice] Whisper error:", errorText);
        throw new Error(`Transcription failed: ${errorText}`);
      }

      const data = await response.json();
      const transcript = data.text?.trim() || "";
      console.log("[Voice] Transcript:", transcript);

      setIsTranscribing(false);

      // Clean up the temp file
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

      if (transcript) {
        // Send as message
        sendMessage(transcript);
      }
    } catch (error) {
      console.error("Voice input error:", error);
      setIsTranscribing(false);
      Alert.alert("Voice Input Error", "Could not transcribe audio");
    }
  };

  // Keep ref in sync with state
  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled;
  }, [ttsEnabled]);

  // Cleanup TTS and voice recording on unmount
  useEffect(() => {
    return () => {
      TTS.stop();
      // Clear recording timer first
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      // Stop any active recording and reset audio mode
      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        (async () => {
          try {
            await audioRecorder.stop();
            await setAudioModeAsync({
              playsInSilentMode: true,
              allowsRecording: false,
            });
          } catch {
            // Ignore cleanup errors
          }
        })();
      }
    };
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Fetch recipe and steps
  useEffect(() => {
    async function fetchData() {
      if (!recipeId) return;

      try {
        const { data: recipeData, error: recipeError } = await supabase
          .from("recipes")
          .select("id, title")
          .eq("id", recipeId)
          .single();

        if (recipeError) throw recipeError;
        setRecipe(recipeData);

        const { data: stepsData, error: stepsError } = await supabase
          .from("recipe_steps")
          .select("*")
          .eq("recipe_id", recipeId)
          .order("step_number");

        if (stepsError) throw stepsError;
        setSteps(stepsData || []);

        // TODO: Re-enable preload after TTS playback is working
        // Preload intro audio while we set up the session (fire and forget)
        // const introMessage = `Hey! I'm here to help you cook ${recipeData.title}. This recipe has ${stepsData?.length || 0} steps. I'll keep track of your timers and answer any questions you have along the way. Just ask me anything! Ready when you are.`;
        // TTS.preload(introMessage, "nova").catch(() => {
        //   // Preload is optional - ignore errors
        // });

        // Create or resume session
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: existingSession } = await supabase
            .from("cook_sessions")
            .select("id, current_step, completed_steps, is_complete")
            .eq("user_id", user.id)
            .eq("recipe_id", recipeId)
            .eq("is_complete", false)
            .order("started_at", { ascending: false })
            .limit(1)
            .single();

          if (existingSession && !existingSession.is_complete) {
            setSessionId(existingSession.id);

            // Restore completed steps from array (preferred) or derive from current_step (legacy)
            const savedSteps = existingSession.completed_steps as
              | number[]
              | null;
            if (
              savedSteps &&
              Array.isArray(savedSteps) &&
              savedSteps.length > 0
            ) {
              setCompletedSteps(new Set(savedSteps));
            } else {
              // Legacy fallback: derive from current_step
              const currentStep = existingSession.current_step ?? 1;
              if (currentStep > 1) {
                const restored = new Set<number>();
                for (let i = 1; i < currentStep; i++) {
                  restored.add(i);
                }
                setCompletedSteps(restored);
              }
            }

            const completedCount =
              savedSteps?.length ?? (existingSession.current_step ?? 1) - 1;

            // Load previous messages from this session
            const { data: previousMessages } = await supabase
              .from("cook_session_messages")
              .select("id, role, content, created_at")
              .eq("session_id", existingSession.id)
              .order("created_at", { ascending: true });

            if (previousMessages && previousMessages.length > 0) {
              // Restore previous messages (skip saving since they're already in DB)
              const restoredMessages: ChatMessage[] = previousMessages.map(
                (msg) => ({
                  id: msg.id,
                  role: msg.role as "user" | "assistant",
                  content: msg.content,
                  timestamp: msg.created_at
                    ? new Date(msg.created_at)
                    : new Date(),
                })
              );
              setMessages(restoredMessages);
              setHasPlayedIntro(true);

              // Add a short "continuing" message without replaying old content
              const continueMessage = `Welcome back! Ready to continue where you left off.`;
              if (ttsEnabledRef.current) {
                setIsTyping(true);
                TTS.speak(continueMessage, {
                  voice: "nova",
                  onStart: () => {
                    setIsTyping(false);
                    // Don't add to messages - it's ephemeral
                    setIsSpeaking(true);
                  },
                  onDone: () => setIsSpeaking(false),
                  onError: () => setIsTyping(false),
                });
              }
            } else {
              // No previous messages - show welcome back with progress
              const remainingCount = (stepsData?.length || 0) - completedCount;
              const welcomeBackMessage = `Welcome back! You're continuing with ${recipeData.title}. You've completed ${completedCount} step${completedCount !== 1 ? "s" : ""}, ${remainingCount} to go. I'm here if you need any help!`;
              setHasPlayedIntro(true);

              // Show typing indicator, then message and TTS
              if (ttsEnabledRef.current) {
                setIsTyping(true);
                TTS.speak(welcomeBackMessage, {
                  voice: "nova",
                  onStart: () => {
                    setIsTyping(false);
                    addAssistantMessage(welcomeBackMessage);
                    setIsSpeaking(true);
                  },
                  onDone: () => setIsSpeaking(false),
                  onError: () => {
                    setIsTyping(false);
                    addAssistantMessage(welcomeBackMessage);
                  },
                });
              } else {
                addAssistantMessage(welcomeBackMessage);
              }
            }
          } else {
            // New session - create it
            const { data: session, error: sessionError } = await supabase
              .from("cook_sessions")
              .insert({
                user_id: user.id,
                recipe_id: recipeId,
                current_step: 1,
              })
              .select("id")
              .single();

            if (!sessionError && session) {
              setSessionId(session.id);
            }

            // Add intro message and play TTS for new sessions
            const introMessage = `Hey! I'm here to help you cook ${recipeData.title}. This recipe has ${stepsData?.length || 0} steps. I'll keep track of your timers and answer any questions you have along the way. Just ask me anything! Ready when you are.`;
            setHasPlayedIntro(true);

            // Show typing indicator, then message and TTS
            if (ttsEnabledRef.current) {
              setIsTyping(true);
              TTS.speak(introMessage, {
                voice: "nova",
                onStart: () => {
                  setIsTyping(false);
                  addAssistantMessage(introMessage);
                  setIsSpeaking(true);
                },
                onDone: () => setIsSpeaking(false),
                onError: () => {
                  setIsTyping(false);
                  addAssistantMessage(introMessage);
                },
              });
            } else {
              addAssistantMessage(introMessage);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching cook mode data:", err);
        setError(err instanceof Error ? err.message : "Failed to load recipe");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [recipeId]);

  // Note: Intro TTS is now triggered directly in fetchData after session setup

  // Timer tick effect
  useEffect(() => {
    if (activeTimers.length > 0 && !timerIntervalRef.current) {
      timerIntervalRef.current = setInterval(() => {
        setActiveTimers((prev) => {
          const updated = prev.map((timer) => {
            if (timer.remainingSeconds <= 0) return timer;
            return { ...timer, remainingSeconds: timer.remainingSeconds - 1 };
          });

          updated.forEach((timer, index) => {
            if (
              timer.remainingSeconds === 0 &&
              prev[index].remainingSeconds > 0
            ) {
              triggerHaptic("success");
              const completionMessage = `${timer.label} timer is done! Time to check on it.`;
              addAssistantMessage(completionMessage);

              if (ttsEnabledRef.current) {
                TTS.speak(completionMessage, {
                  voice: "nova",
                  onStart: () => setIsSpeaking(true),
                  onDone: () => setIsSpeaking(false),
                });
              }
            }
          });

          return updated.filter((t) => t.remainingSeconds > 0);
        });
      }, 1000);
    }

    if (activeTimers.length === 0 && timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [activeTimers.length]);

  const addAssistantMessage = (
    content: string,
    skipSave = false,
    options?: { dbId?: string; intent?: string }
  ) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      dbId: options?.dbId,
      role: "assistant" as const,
      content,
      timestamp: new Date(),
      feedback: null,
      intent: options?.intent,
    };
    setMessages((prev) => [...prev, newMessage]);

    // Save to database for session continuity (fire and forget)
    if (sessionId && !skipSave) {
      supabase
        .from("cook_session_messages")
        .insert({
          session_id: sessionId,
          role: "assistant",
          content,
          current_step: Math.max(...Array.from(completedSteps), 0) + 1,
        })
        .then(({ error }) => {
          if (error) console.error("[Cook] Failed to save message:", error);
        });
    }
  };

  const addUserMessage = (content: string, skipSave = false) => {
    const newMessage = {
      id: `msg-${Date.now()}`,
      role: "user" as const,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);

    // Save to database for session continuity (fire and forget)
    if (sessionId && !skipSave) {
      supabase
        .from("cook_session_messages")
        .insert({
          session_id: sessionId,
          role: "user",
          content,
          current_step: Math.max(...Array.from(completedSteps), 0) + 1,
        })
        .then(({ error }) => {
          if (error) console.error("[Cook] Failed to save message:", error);
        });
    }
  };

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

  const triggerHaptic = (type: "light" | "success" = "light") => {
    if (Platform.OS === "ios") {
      if (type === "success") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleToggleStep = async (stepNumber: number) => {
    triggerHaptic("light");

    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }

      // Persist completed steps array to database
      if (sessionId) {
        const completedArray = Array.from(next).sort((a, b) => a - b);
        const maxCompleted = Math.max(...completedArray, 0);
        supabase
          .from("cook_sessions")
          .update({
            current_step: maxCompleted + 1,
            completed_steps: completedArray,
          })
          .eq("id", sessionId)
          .then(({ error }) => {
            if (error)
              console.error("[Cook] Failed to save step progress:", error);
          });
      }

      return next;
    });
  };

  const handleStartTimer = (step: Step) => {
    if (!step.duration_minutes) return;

    const existingTimer = activeTimers.find(
      (t) => t.stepNumber === step.step_number
    );
    if (existingTimer) {
      const message = `Timer for ${step.timer_label || `Step ${step.step_number}`} is already running.`;
      addAssistantMessage(message);
      return;
    }

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

    const message = `Starting ${step.duration_minutes} minute timer for ${label}. I'll let you know when it's done!`;
    addAssistantMessage(message);

    if (ttsEnabled) {
      speakText(message);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !sessionId) return;

    const userQuestion = text.trim();
    // Add user message locally (skip DB save - edge function handles it)
    addUserMessage(userQuestion, true);
    setQuestion("");
    triggerHaptic("light");
    setIsTyping(true);

    try {
      // Get fresh auth token
      const { data: sessionData, error: sessionError } =
        await supabase.auth.refreshSession();
      if (sessionError || !sessionData?.session) {
        throw new Error("Not authenticated");
      }

      // Calculate current step from completed steps
      const currentStep = Math.max(...Array.from(completedSteps), 0) + 1;

      // Call cook-chat edge function
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
          current_step: currentStep,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Cook Chat] Error:", errorText);
        throw new Error(`Chat failed: ${response.status}`);
      }

      const data = await response.json();
      const assistantResponse =
        data.response || "Sorry, I couldn't process that.";
      const voiceResponse = data.voice_response || assistantResponse;

      // Add assistant message locally (skip DB save - edge function handled it)
      // Include dbId and intent for feedback functionality
      addAssistantMessage(assistantResponse, true, {
        dbId: data.message_id,
        intent: data.intent,
      });

      // Speak the shorter voice response
      if (ttsEnabled) {
        speakText(voiceResponse);
      }
    } catch (error) {
      console.error("[Cook Chat] Error:", error);
      const fallbackResponse =
        "Sorry, I'm having trouble connecting right now. For timers, just tap the timer buttons below each step.";
      addAssistantMessage(fallbackResponse);
      if (ttsEnabled) {
        speakText(fallbackResponse);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendQuestion = () => {
    sendMessage(question);
  };

  // Handle feedback on assistant messages
  const handleFeedback = async (
    messageId: string,
    dbId: string | undefined,
    feedback: "helpful" | "not_helpful",
    intent?: string
  ) => {
    if (!dbId || !sessionId) return;

    triggerHaptic("light");

    // Update local state immediately for responsiveness
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, feedback } : msg))
    );

    // Update database
    await supabase
      .from("cook_session_messages")
      .update({ feedback })
      .eq("id", dbId);

    // If helpful and it's a memory-worthy intent, create a memory
    if (feedback === "helpful" && intent) {
      const memoryWorthyIntents = [
        "substitution_request",
        "troubleshooting",
        "technique_question",
        "temperature_question",
        "ingredient_question",
        "preference_statement",
        "modification_report",
      ];

      if (memoryWorthyIntents.includes(intent)) {
        // Find the corresponding user question
        const msgIndex = messages.findIndex((m) => m.id === messageId);
        const userQuestion = msgIndex > 0 ? messages[msgIndex - 1] : null;
        const assistantAnswer = messages.find((m) => m.id === messageId);

        if (userQuestion && assistantAnswer) {
          // Map intent to memory label
          const intentToLabel: Record<string, string> = {
            substitution_request: "substitution_used",
            troubleshooting: "problem_solved",
            technique_question: "technique_learned",
            temperature_question: "doneness_preference",
            ingredient_question: "ingredient_discovery",
            preference_statement: "preference_expressed",
            modification_report: "modification_made",
          };

          const memoryContent = `Q: ${userQuestion.content}\nA: ${assistantAnswer.content}`;

          // Get user ID and guard against null before creating memory
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user?.id) {
            console.error(
              "[Memory] Cannot create memory: no authenticated user"
            );
            return;
          }

          // Fire and forget - create memory in background, then generate embedding
          supabase
            .from("user_cooking_memory")
            .insert({
              user_id: user.id,
              content: memoryContent,
              memory_type: "qa_exchange",
              label: intentToLabel[intent] || null,
              source_session_id: sessionId,
              source_message_id: dbId,
              metadata: {
                recipe_id: recipeId,
                recipe_title: recipe?.title,
                intent,
              },
            })
            .select("id")
            .single()
            .then(async ({ data, error }) => {
              if (error) {
                console.error("[Memory] Failed to create:", error);
                return;
              }
              console.log(
                "[Memory] Created from feedback, generating embedding..."
              );

              // Call embed-memory Edge Function to generate embedding
              const { error: embedError } = await supabase.functions.invoke(
                "embed-memory",
                {
                  body: { memory_id: data.id, content: memoryContent },
                }
              );

              if (embedError) {
                console.error("[Memory] Embedding failed:", embedError);
              } else {
                console.log("[Memory] Embedding generated successfully");
              }
            });
        }
      }
    }
  };

  const handleExit = () => {
    stopSpeaking();

    // If timers are running, ask user what to do
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
              // Clear timers
              if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
              }
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

  const handleComplete = async () => {
    if (isSessionComplete) {
      router.back();
      return;
    }

    stopSpeaking();
    triggerHaptic("success");

    const completionMessage =
      "Great job! You've completed the recipe. How did it turn out?";
    addAssistantMessage(completionMessage);

    if (ttsEnabled) {
      speakText(completionMessage);
    }

    // Show completion modal for rating and feedback
    setShowCompletionModal(true);
  };

  const handleSubmitCompletion = async (skipFeedback = false) => {
    // Guard against double-tap
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      if (sessionId && recipeId) {
        // Update session with feedback (or just mark complete if skipping)
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
            changes_made: skipFeedback ? null : completionChanges || null,
            outcome_tags: skipFeedback ? [] : completionTags,
          })
          .eq("id", sessionId);

        // Update recipe stats
        const { data: recipeData } = await supabase
          .from("recipes")
          .select("times_cooked, user_rating")
          .eq("id", recipeId)
          .single();

        await supabase
          .from("recipes")
          .update({
            times_cooked: (recipeData?.times_cooked || 0) + 1,
            last_cooked_at: new Date().toISOString(),
            status: "cooked",
            // Update recipe rating if user rated this session (only if not skipping)
            user_rating:
              !skipFeedback && completionRating > 0
                ? completionRating
                : recipeData?.user_rating,
          })
          .eq("id", recipeId);

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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Loading..." }} />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      </>
    );
  }

  if (error || !recipe || steps.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: "Error" }} />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <Text style={{ color: "#ef4444", textAlign: "center" }}>
            {error || "No steps found for this recipe"}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{
              marginTop: 16,
              backgroundColor: "#f97316",
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>Go Back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  // Check if all steps are completed
  const allStepsComplete = completedSteps.size === steps.length;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Cook Mode",
          headerRight: () => (
            <Pressable onPress={handleExit}>
              <Text style={{ color: "#6b7280", fontWeight: "600" }}>Exit</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={90}
      >
        <View
          style={{
            flex: 1,
            paddingBottom: insets.bottom,
          }}
        >
          {/* Progress Bar + Steps Panel */}
          <View
            style={{
              backgroundColor: "#f9fafb",
              borderBottomWidth: 1,
              borderBottomColor: "#e5e7eb",
            }}
          >
            {/* Progress Header */}
            <Pressable
              onPress={() => setStepsExpanded(!stepsExpanded)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 12,
              }}
            >
              <View style={{ flex: 1, gap: 6 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    {completedSteps.size}/{steps.length} steps
                  </Text>
                  <Text style={{ fontSize: 12, color: "#6b7280" }}>
                    {Math.round((completedSteps.size / steps.length) * 100)}%
                  </Text>
                </View>
                {/* Progress Bar */}
                <View
                  style={{
                    height: 4,
                    backgroundColor: "#e5e7eb",
                    borderRadius: 2,
                  }}
                >
                  <View
                    style={{
                      height: 4,
                      backgroundColor:
                        completedSteps.size === steps.length
                          ? "#22c55e"
                          : "#f97316",
                      borderRadius: 2,
                      width: `${(completedSteps.size / steps.length) * 100}%`,
                    }}
                  />
                </View>
              </View>
              <Text style={{ fontSize: 18, color: "#6b7280", marginLeft: 12 }}>
                {stepsExpanded ? "▼" : "▶"}
              </Text>
            </Pressable>

            {/* Collapsible Step List */}
            {stepsExpanded && (
              <ScrollView
                style={{ maxHeight: 200 }}
                contentContainerStyle={{
                  paddingHorizontal: 12,
                  paddingBottom: 12,
                  gap: 6,
                }}
              >
                {steps.map((step) => {
                  const isCompleted = completedSteps.has(step.step_number);
                  const hasTimer = step.duration_minutes !== null;
                  const timerActive = activeTimers.some(
                    (t) => t.stepNumber === step.step_number
                  );

                  return (
                    <Pressable
                      key={step.id}
                      onPress={() => handleToggleStep(step.step_number)}
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: 10,
                        backgroundColor: isCompleted ? "#f0fdf4" : "white",
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isCompleted ? "#86efac" : "#e5e7eb",
                      }}
                    >
                      {/* Checkbox */}
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 4,
                          borderWidth: 2,
                          borderColor: isCompleted ? "#22c55e" : "#d1d5db",
                          backgroundColor: isCompleted
                            ? "#22c55e"
                            : "transparent",
                          justifyContent: "center",
                          alignItems: "center",
                          marginTop: 1,
                        }}
                      >
                        {isCompleted && (
                          <Text
                            style={{
                              color: "white",
                              fontSize: 14,
                              fontWeight: "bold",
                            }}
                          >
                            ✓
                          </Text>
                        )}
                      </View>

                      {/* Step Content */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            color: isCompleted ? "#6b7280" : "#111827",
                            textDecorationLine: isCompleted
                              ? "line-through"
                              : "none",
                            lineHeight: 20,
                          }}
                        >
                          <Text style={{ fontWeight: "600" }}>
                            Step {step.step_number}:{" "}
                          </Text>
                          {step.instruction}
                        </Text>

                        {/* Timer button inline */}
                        {hasTimer && (
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              if (!timerActive) handleStartTimer(step);
                            }}
                            disabled={timerActive}
                            style={{
                              marginTop: 6,
                              backgroundColor: timerActive
                                ? "#e5e7eb"
                                : "#dbeafe",
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 12,
                              alignSelf: "flex-start",
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Text style={{ fontSize: 12 }}>⏱️</Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: timerActive ? "#9ca3af" : "#1e40af",
                                fontWeight: "500",
                              }}
                            >
                              {timerActive
                                ? "Timer running"
                                : `${step.duration_minutes}m`}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Active Timers Bar */}
          {activeTimers.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                padding: 12,
                backgroundColor: "#fffbeb",
                borderBottomWidth: 1,
                borderBottomColor: "#fcd34d",
              }}
            >
              {activeTimers.map((timer) => (
                <View
                  key={timer.id}
                  style={{
                    backgroundColor:
                      timer.remainingSeconds < 60 ? "#fef2f2" : "#f0fdf4",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    borderWidth: 1,
                    borderColor:
                      timer.remainingSeconds < 60 ? "#fca5a5" : "#86efac",
                  }}
                >
                  <Text style={{ fontSize: 14 }}>
                    {timer.remainingSeconds < 60 ? "🔴" : "🟢"}
                  </Text>
                  <Text
                    style={{
                      fontWeight: "600",
                      color:
                        timer.remainingSeconds < 60 ? "#dc2626" : "#16a34a",
                    }}
                  >
                    {timer.label}: {formatTime(timer.remainingSeconds)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Chat Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 12 }}
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
                      msg.role === "user" ? "#f97316" : "#f3f4f6",
                    padding: 14,
                    borderRadius: 16,
                    borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                    borderBottomLeftRadius: msg.role === "assistant" ? 4 : 16,
                  }}
                >
                  <Text
                    style={{
                      color: msg.role === "user" ? "white" : "#111827",
                      fontSize: 15,
                      lineHeight: 22,
                    }}
                  >
                    {msg.content}
                  </Text>
                </View>
                {msg.role === "assistant" &&
                  isSpeaking &&
                  msg.id === messages[messages.length - 1]?.id && (
                    <Pressable
                      onPress={stopSpeaking}
                      style={{
                        marginTop: 6,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: "#6b7280" }}>
                        Speaking...
                      </Text>
                      <Text style={{ fontSize: 12, color: "#dc2626" }}>
                        Stop
                      </Text>
                    </Pressable>
                  )}
                {/* Feedback buttons for assistant messages with dbId */}
                {msg.role === "assistant" && msg.dbId && !msg.feedback && (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    <Pressable
                      onPress={() =>
                        handleFeedback(msg.id, msg.dbId, "helpful", msg.intent)
                      }
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        backgroundColor: "#dcfce7",
                      }}
                    >
                      <Text style={{ fontSize: 12, color: "#166534" }}>
                        👍 Helpful
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        handleFeedback(
                          msg.id,
                          msg.dbId,
                          "not_helpful",
                          msg.intent
                        )
                      }
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        backgroundColor: "#fee2e2",
                      }}
                    >
                      <Text style={{ fontSize: 12, color: "#991b1b" }}>
                        👎 Not helpful
                      </Text>
                    </Pressable>
                  </View>
                )}
                {/* Show feedback status if already given */}
                {msg.role === "assistant" && msg.feedback && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      marginTop: 6,
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
              <View
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "85%",
                }}
              >
                <View
                  style={{
                    backgroundColor: "#f3f4f6",
                    padding: 14,
                    borderRadius: 16,
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

          {/* Bottom Controls */}
          <View
            style={{
              padding: 12,
              paddingBottom: 12,
              borderTopWidth: 1,
              borderTopColor: "#e5e7eb",
              backgroundColor: "white",
              gap: 12,
            }}
          >
            {/* TTS Toggle */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <Pressable
                onPress={handleToggleTts}
                style={{
                  backgroundColor: ttsEnabled ? "#dbeafe" : "#f3f4f6",
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 14 }}>{ttsEnabled ? "🔊" : "🔇"}</Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    color: ttsEnabled ? "#1e40af" : "#6b7280",
                  }}
                >
                  {ttsEnabled ? "Voice On" : "Voice Off"}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleComplete}
                disabled={!allStepsComplete && !isSessionComplete}
                style={{
                  backgroundColor:
                    allStepsComplete || isSessionComplete
                      ? "#f0fdf4"
                      : "#f3f4f6",
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  borderWidth: 1,
                  borderColor:
                    allStepsComplete || isSessionComplete
                      ? "#86efac"
                      : "#e5e7eb",
                  opacity: allStepsComplete || isSessionComplete ? 1 : 0.6,
                }}
              >
                <Text style={{ fontSize: 14 }}>
                  {allStepsComplete ? "✓" : "○"}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    color:
                      allStepsComplete || isSessionComplete
                        ? "#16a34a"
                        : "#9ca3af",
                  }}
                >
                  {allStepsComplete
                    ? "Done Cooking"
                    : `${steps.length - completedSteps.size} left`}
                </Text>
              </Pressable>
            </View>

            {/* Chat Input */}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                backgroundColor: isRecording
                  ? "#fef3c7"
                  : isTranscribing
                    ? "#dbeafe"
                    : "#f3f4f6",
                borderRadius: 24,
                padding: 4,
                alignItems: "center",
                borderWidth: isRecording || isTranscribing ? 2 : 0,
                borderColor: isRecording ? "#f97316" : "#3b82f6",
              }}
            >
              {/* Microphone button (tap to toggle) */}
              <Pressable
                onPress={toggleVoiceInput}
                disabled={isTranscribing}
                style={{
                  backgroundColor: isRecording
                    ? "#f97316"
                    : isTranscribing
                      ? "#3b82f6"
                      : "#e5e7eb",
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 18 }}>
                  {isRecording ? "⏹️" : isTranscribing ? "..." : "🎤"}
                </Text>
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
                placeholder="Ask Chez anything..."
                placeholderTextColor="#9ca3af"
                editable={!isRecording && !isTranscribing}
                style={{
                  flex: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 16,
                  color: isRecording
                    ? "#f97316"
                    : isTranscribing
                      ? "#3b82f6"
                      : "#111827",
                }}
                onSubmitEditing={handleSendQuestion}
                returnKeyType="send"
              />
              <Pressable
                onPress={handleSendQuestion}
                disabled={!question.trim() || isRecording || isTranscribing}
                style={{
                  backgroundColor:
                    question.trim() && !isRecording && !isTranscribing
                      ? "#f97316"
                      : "#d1d5db",
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontSize: 18 }}>↑</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Completion Modal */}
      <Modal
        visible={showCompletionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#fff",
            paddingTop: insets.top + 16,
            paddingHorizontal: 20,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: "#111827",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Great job! 🎉
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: "#6b7280",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            How did it turn out?
          </Text>

          {/* Star Rating */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              marginBottom: 24,
            }}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => setCompletionRating(star)}
                style={{ padding: 4 }}
              >
                <Text style={{ fontSize: 32 }}>
                  {star <= completionRating ? "⭐" : "☆"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Quick Tags */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#374151",
              marginBottom: 12,
            }}
          >
            Quick feedback
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 24,
            }}
          >
            {[
              "Perfect",
              "Made adjustments",
              "Had issues",
              "Will make again",
            ].map((tag) => (
              <Pressable
                key={tag}
                onPress={() => toggleCompletionTag(tag)}
                style={{
                  backgroundColor: completionTags.includes(tag)
                    ? "#f97316"
                    : "#f3f4f6",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: completionTags.includes(tag) ? "#fff" : "#374151",
                    fontWeight: "500",
                  }}
                >
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* What did you change? */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#374151",
              marginBottom: 8,
            }}
          >
            What did you change? (optional)
          </Text>
          <TextInput
            value={completionChanges}
            onChangeText={setCompletionChanges}
            placeholder="Added more garlic, cooked longer..."
            placeholderTextColor="#9ca3af"
            multiline
            style={{
              backgroundColor: "#f3f4f6",
              borderRadius: 12,
              padding: 12,
              fontSize: 15,
              color: "#111827",
              minHeight: 60,
              marginBottom: 16,
              textAlignVertical: "top",
            }}
          />

          {/* Notes */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#374151",
              marginBottom: 8,
            }}
          >
            Notes (optional)
          </Text>
          <TextInput
            value={completionNotes}
            onChangeText={setCompletionNotes}
            placeholder="Any other thoughts about this cook..."
            placeholderTextColor="#9ca3af"
            multiline
            style={{
              backgroundColor: "#f3f4f6",
              borderRadius: 12,
              padding: 12,
              fontSize: 15,
              color: "#111827",
              minHeight: 60,
              marginBottom: 24,
              textAlignVertical: "top",
            }}
          />

          {/* Buttons */}
          <View style={{ gap: 12 }}>
            <Pressable
              onPress={() => handleSubmitCompletion(false)}
              style={{
                backgroundColor: "#f97316",
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Save & Finish
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleSubmitCompletion(true)}
              style={{
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#6b7280",
                  fontSize: 16,
                  fontWeight: "500",
                }}
              >
                Skip feedback
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
