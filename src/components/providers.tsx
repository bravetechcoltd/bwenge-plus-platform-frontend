"use client";

import React, { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@/lib/store";
import { ThemeProvider } from "./theme-provider";
import { AuthProvider } from "@/hooks/use-auth";

import { CoursesProvider } from "@/hooks/use-courses";
import { useLearningProgress, LearningStep,ProgressData } from "@/hooks/use-learning-progress";
import { Toaster } from "sonner";
interface LearningProgressContextType {
  courseId?: string;
  progressData?: ProgressData;
  loading: boolean;
  error: any;
  markStepComplete: (payload: {
    courseId: string;
    userId: string;
    lessonId?: string;
    assessmentId?: string;
    score?: number;
    percentage?: number;
    answers?: any;
    time_spent_seconds?: number;
    isCompleted?: boolean;
    passed?: boolean;
  }) => Promise<void>;
  getCurrentStep: (allSteps: LearningStep[], progressData: ProgressData | null) => LearningStep | null;
  updateCurrentStep: (stepId: string, time_spent_seconds?: number) => Promise<void>;
  calculateProgress: (allSteps: LearningStep[]) => number;
  isStepCompleted: (stepId: string) => boolean;
  getStepScore: (dbId: string) => number | null;
  refetch: () => void;
  markStepPending: (payload: {
    courseId: string;
    userId: string;
    lessonId?: string;
    assessmentId?: string;
  }) => Promise<void>;
  isStepPending: (stepId: string) => boolean;
  isStepFailed: (stepId: string) => boolean;
}

const LearningProgressContext = createContext<LearningProgressContextType | undefined>(undefined);

// Create a provider component
interface LearningProgressProviderProps {
  children: ReactNode;
  courseId?: string;
}

function LearningProgressProvider({ children, courseId }: LearningProgressProviderProps) {
  // Only initialize the hook if courseId is provided
  const progressHook = courseId ? useLearningProgress(courseId) : {
    progressData: undefined,
    loading: false,
    error: null,
    markStepComplete: async () => {},
    getCurrentStep: () => null,
    updateCurrentStep: async () => {},
    calculateProgress: () => 0,
    isStepCompleted: () => false,
    getStepScore: () => null,
    refetch: () => {},
    markStepPending: async () => {},
    isStepPending: () => false,
    isStepFailed: () => false,
  };

  return (
    <LearningProgressContext.Provider value={progressHook}>
      {children}
    </LearningProgressContext.Provider>
  );
}

// Hook to use the learning progress context
export function useLearningProgressContext() {
  const context = useContext(LearningProgressContext);
  if (context === undefined) {
    throw new Error("useLearningProgressContext must be used within a LearningProgressProvider");
  }
  return context;
}

export function Providers({ children }: { children: React.ReactNode }) {
    const [isClient, setIsClient] = useState(false);
  
    useEffect(() => {
      setIsClient(true);
    }, []);
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthProvider>
          <CoursesProvider>
            <LearningProgressProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem={false}
                storageKey="bwengeplus-theme"
              >
                
                {children}
                <Toaster richColors position="top-right" />
              </ThemeProvider>
            </LearningProgressProvider>
          </CoursesProvider>
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}