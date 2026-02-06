/**
 * OnboardingContext
 *
 * Provides a way for onboarding screens to signal completion
 * to the root layout, avoiding redirect loops.
 */

import { createContext, useContext, useCallback, useState } from "react";
import type { ReactNode } from "react";

interface OnboardingContextType {
  isComplete: boolean;
  markComplete: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({
  children,
  onComplete,
}: {
  children: ReactNode;
  onComplete: () => void;
}) {
  const [isComplete, setIsComplete] = useState(false);

  const markComplete = useCallback(() => {
    setIsComplete(true);
    onComplete();
  }, [onComplete]);

  return (
    <OnboardingContext.Provider value={{ isComplete, markComplete }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextType {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
