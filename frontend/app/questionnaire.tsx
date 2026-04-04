import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuestionnaire } from "@/components/questionnaire/useQuestionnaire";
import { ProgressBar } from "@/components/questionnaire/ProgressBar";
import { QuestionNav } from "@/components/questionnaire/QuestionNav";
import { RadioQuestion } from "@/components/questionnaire/RadioQuestion";
import { SliderQuestion } from "@/components/questionnaire/SliderQuestion";
import { API_BASE } from "@/lib/api";
import * as SecureStore from "expo-secure-store";

export default function Questionnaire() {
  const router = useRouter();
  const { step, setStep, answers, setAnswer, current, total, progress, canAdvance } = useQuestionnaire();

  const handleNext = async () => {
    console.log("handleNext called, step:", step, "total:", total);
    if (step < total - 1) {
      setStep(s => s + 1);
      return;
    }

    try {
      const token = await SecureStore.getItemAsync("accessToken");
      console.log("token:", token);

      if (!token) {
        alert("Session expired. Please log in again.");
        router.replace("/login");
        return;
      }

      const res = await fetch(`${API_BASE}/auth/submit-questionnaire`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(answers),
      });

      console.log("res status:", res.status);
      const data = await res.json();
      console.log("response data:", data);

      if (data.ok) {
        router.replace("/tabs/home");
      } else {
        alert(data.message || "Submission failed");
      }
    } catch (err) {
      console.log("submit error:", err);
      alert("Cannot connect to server");
    }
  };
  const renderQuestion = () => {
    if (current.type === "radio")
      return (
        <RadioQuestion
          config={current}
          value={answers[current.key as keyof typeof answers] as string}
          onChange={v => setAnswer(current.key, v)}
        />
      );
    if (current.type === "slider")
      return (
        <SliderQuestion
          config={current}
          value={answers[current.key as keyof typeof answers] as number}
          onChange={v => setAnswer(current.key, v)}
        />
      );
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Questionnaire</Text>
        <TouchableOpacity onPress={() => router.replace("/tabs/home")}>
          <Text style={styles.doLater}>Do later</Text>
        </TouchableOpacity>
      </View>

      <ProgressBar progress={progress} step={step} total={total} />
      <View style={styles.content}>{renderQuestion()}</View>
      <QuestionNav
        onBack={step > 0 ? () => setStep(s => s - 1) : undefined}
        onNext={handleNext}
        isLast={step === total - 1}
        disabled={!canAdvance()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: "6%",
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  doLater: {
    fontSize: 14,
    fontFamily: "Lexend_500Medium",
    color: "#94A3B8",
    top: -3,
    
  },
  content: {
    flex: 1,
  },
});