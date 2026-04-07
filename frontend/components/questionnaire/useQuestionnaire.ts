import { useState, useEffect } from "react";
import { QUESTIONS, TOTAL_QUESTIONS } from "./questions.config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Answers = {
  pos1: string;
  pos2: string;
  pos3: string;
  experience: string;
  often: string;
  uni_team: string;
  intensity: string;
  rule: number;
  serve: number;
  serve_receive: number;
  spike_receive: number;
  set: number;
  spike: number;
  block: number;
};

const DEFAULT_ANSWERS: Answers = {
  pos1: "",
  pos2: "",
  pos3: "",
  experience: "",
  often: "",
  uni_team: "",
  intensity: "",
  rule: 5,
  serve: 5,
  serve_receive: 5,
  spike_receive: 5,
  set: 5,
  spike: 5,
  block: 5,
};

const DRAFT_KEY = "questionnaire_draft";

export function useQuestionnaire() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const [loaded, setLoaded] = useState(false);

  // Load saved draft on mount
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then(raw => {
      if (raw) {
        try {
          const { step: savedStep, answers: savedAnswers } = JSON.parse(raw);
          setStep(savedStep ?? 0);
          setAnswers(savedAnswers ?? DEFAULT_ANSWERS);
        } catch {
          // ignore in case of corrupted draft
        }
      }
      setLoaded(true);
    });
  }, []);

  // Save draft upon step/answers change
  useEffect(() => {
    if (!loaded) return; // don't save before we've loaded
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ step, answers }));
  }, [step, answers, loaded]);

  const current = QUESTIONS[step];
  const total = TOTAL_QUESTIONS;
  const progress = ((step + 1) / total) * 100;

  const setAnswer = (key: string, value: string | number) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const canAdvance = () => {
    if (current.type === "radio") {
      return !!answers[current.key as keyof Answers];
    }
    return true;
  };

  const clearDraft = async () => {
    await AsyncStorage.removeItem(DRAFT_KEY);
  };

  return { step, setStep, answers, setAnswer, current, total, progress, canAdvance, loaded, clearDraft };
}