import type { DetectedLearning } from "@/types/database";

export interface Step {
  id: string;
  step_number: number;
  instruction: string;
  duration_minutes: number | null;
  timer_label: string | null;
  temperature_value?: number | null;
  temperature_unit?: string | null;
  equipment?: string[];
  techniques?: string[];
}

export interface MasterRecipeWithVersion {
  id: string;
  title: string;
  current_version_id: string | null;
  forked_from_id?: string | null; // Set if this is a forked recipe
  current_version: {
    id: string;
    version_number: number;
    steps: Step[];
  } | null;
}

export interface ChatMessage {
  id: string;
  dbId?: string;
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
  feedback?: "helpful" | "not_helpful" | null;
  intent?: string;
}

export interface ActiveTimer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  stepNumber: number;
}

export type LearningType =
  | "substitution"
  | "preference"
  | "timing"
  | "technique"
  | "addition"
  | "modification"
  | "tip";

export type { DetectedLearning };
