import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Platform, Modal, Pressable, useColorScheme } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { r } from "@/utils/responsive";
import { authFetch, API_BASE } from "@/lib/api";

type VenueOption = { venue_id: number; venue_name: string };
type PickerTarget = "date" | "start" | "end" | null;

export default function CreateSessionScreen() {
  const { venue_id: paramVenueId, venue_name: paramVenueName } = useLocalSearchParams<{ venue_id: string; venue_name: string }>();
  const router = useRouter();

  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | undefined>(paramVenueId);
  const [selectedVenueName, setSelectedVenueName] = useState<string | undefined>(paramVenueName);

  useEffect(() => {
    if (!paramVenueId) {
      fetch(`${API_BASE}/venues`)
        .then(res => res.json())
        .then(data => {
          if (data.ok) setVenues(data.venues.map((v: any) => ({ venue_id: v.venue_id, venue_name: v.venue_name })));
        })
        .catch(err => console.error("Failed to fetch venues:", err));
    }
  }, [paramVenueId]);

  const [sessionName, setSessionName] = useState("");
  const [skillLevel, setSkillLevel] = useState("all");
  const [maxPlayers, setMaxPlayers] = useState("12");
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000));
  const [submitting, setSubmitting] = useState(false);

  // --- Picker state ---
  // On iOS: one modal at a time, temp value committed on "Done"
  // On Android: inline system dialog
  const [activePicker, setActivePicker] = useState<PickerTarget>(null);
  const [tempDate, setTempDate] = useState(new Date());

  const openPicker = (target: PickerTarget) => {
    if (target === "date") setTempDate(date);
    else if (target === "start") setTempDate(startTime);
    else if (target === "end") setTempDate(endTime);
    setActivePicker(target);
  };

  const confirmPicker = () => {
    if (activePicker === "date") setDate(tempDate);
    else if (activePicker === "start") setStartTime(tempDate);
    else if (activePicker === "end") setEndTime(tempDate);
    setActivePicker(null);
  };

  const handleAndroidChange = (target: PickerTarget, _: DateTimePickerEvent, selected?: Date) => {
    setActivePicker(null);
    if (!selected) return;
    if (target === "date") setDate(selected);
    else if (target === "start") setStartTime(selected);
    else if (target === "end") setEndTime(selected);
  };

  const skillLevels = [
    { value: "all", label: "All Levels" },
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
    { value: "pro", label: "Pro" },
  ];

  const buildTimestamp = (dateObj: Date, timeObj: Date) => {
    const combined = new Date(dateObj);
    combined.setHours(timeObj.getHours(), timeObj.getMinutes(), 0, 0);
    return combined.toISOString();
  };

  const handleSubmit = async () => {
    const max = parseInt(maxPlayers, 10);
    if (isNaN(max) || max < 2) {
      Alert.alert("Invalid", "Max players must be at least 2");
      return;
    }

    const start_time = buildTimestamp(date, startTime);
    const end_time = buildTimestamp(date, endTime);

    if (new Date(end_time) <= new Date(start_time)) {
      Alert.alert("Invalid", "End time must be after start time");
      return;
    }

    if (!selectedVenueId) {
      Alert.alert("Invalid", "Please select a venue");
      return;
    }

    setSubmitting(true);
    try {
      const data = await authFetch("/sessions", {
        method: "POST",
        body: JSON.stringify({
          venue_id: parseInt(selectedVenueId, 10),
          sport: "volleyball",
          max_players: max,
          start_time,
          end_time,
          session_name: sessionName || undefined,
          skill_level: skillLevel,
        }),
      });

      if (data.ok) {
        Alert.alert("Session Created", "You've been added as the first player.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", data.message || "Failed to create session");
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

  const pickerMode = activePicker === "date" ? "date" : "time";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="chevron-back" size={28} color="#000" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Create Session</Text>
        <View style={{ width: r(24) }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        {/* Session Name */}
        <Text style={styles.label}>Session Name</Text>
        <TextInput
          style={styles.input}
          value={sessionName}
          onChangeText={setSessionName}
          placeholder="e.g. Friday Night Volleyball"
          placeholderTextColor="#94A3B8"
        />

        {/* Venue */}
        <Text style={styles.label}>Venue</Text>
        {paramVenueId ? (
          <View style={styles.readOnlyField}>
            <MaterialIcons name="location-on" size={r(18)} color="#0B36F4" />
            <Text style={styles.readOnlyText}>{paramVenueName || `Venue #${paramVenueId}`}</Text>
          </View>
        ) : (
          <View style={styles.venueList}>
            {venues.map((v) => (
              <TouchableOpacity
                key={v.venue_id}
                style={[
                  styles.venueOption,
                  selectedVenueId === v.venue_id.toString() && styles.venueOptionActive,
                ]}
                onPress={() => {
                  setSelectedVenueId(v.venue_id.toString());
                  setSelectedVenueName(v.venue_name);
                }}
              >
                <MaterialIcons
                  name="location-on"
                  size={r(16)}
                  color={selectedVenueId === v.venue_id.toString() ? "#FFFFFF" : "#0B36F4"}
                />
                <Text
                  style={[
                    styles.venueOptionText,
                    selectedVenueId === v.venue_id.toString() && styles.venueOptionTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {v.venue_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Skill Level */}
        <Text style={styles.label}>Skill Level</Text>
        <View style={styles.sportRow}>
          {skillLevels.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={[styles.sportChip, skillLevel === level.value && styles.sportChipActive]}
              onPress={() => setSkillLevel(level.value)}
            >
              <Text style={[styles.sportChipText, skillLevel === level.value && styles.sportChipTextActive]}>
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date */}
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker("date")}>
          <MaterialIcons name="calendar-today" size={r(18)} color="#64748B" />
          <Text style={styles.pickerText}>{formatDate(date)}</Text>
        </TouchableOpacity>

        {/* Start Time */}
        <Text style={styles.label}>Start Time</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker("start")}>
          <MaterialIcons name="schedule" size={r(18)} color="#64748B" />
          <Text style={styles.pickerText}>{formatTime(startTime)}</Text>
        </TouchableOpacity>

        {/* End Time */}
        <Text style={styles.label}>End Time</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker("end")}>
          <MaterialIcons name="schedule" size={r(18)} color="#64748B" />
          <Text style={styles.pickerText}>{formatTime(endTime)}</Text>
        </TouchableOpacity>

        {/* Max Players */}
        <Text style={styles.label}>Max Players</Text>
        <TextInput
          style={styles.input}
          value={maxPlayers}
          onChangeText={setMaxPlayers}
          keyboardType="number-pad"
          placeholder="12"
          placeholderTextColor="#94A3B8"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitText}>
            {submitting ? "Creating..." : "Create Session"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {Platform.OS === "ios" && (
        <Modal
          visible={activePicker !== null}
          transparent
          animationType="slide"
        >
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalBackdrop} onPress={() => setActivePicker(null)} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setActivePicker(null)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {activePicker === "date" ? "Select Date" : activePicker === "start" ? "Start Time" : "End Time"}
                </Text>
                <TouchableOpacity onPress={confirmPicker}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode={pickerMode}
                display="spinner"
                is24Hour
                locale="en-GB" 
                themeVariant="light"
                minimumDate={pickerMode === "date" ? new Date() : undefined}
                onChange={(_, selected) => { if (selected) setTempDate(selected); }}
                style={styles.spinner}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === "android" && activePicker === "date" && (
        <DateTimePicker
          value={date}
          mode="date"
          minimumDate={new Date()}
          onChange={(e, s) => handleAndroidChange("date", e, s)}
        />
      )}
      {Platform.OS === "android" && activePicker === "start" && (
        <DateTimePicker
          value={startTime}
          mode="time"
          is24Hour
          onChange={(e, s) => handleAndroidChange("start", e, s)}
        />
      )}
      {Platform.OS === "android" && activePicker === "end" && (
        <DateTimePicker
          value={endTime}
          mode="time"
          is24Hour
          onChange={(e, s) => handleAndroidChange("end", e, s)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: r(50),
    paddingBottom: r(16),
    paddingHorizontal: r(20),
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: r(18),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
  },
  form: {
    padding: r(20),
    paddingBottom: r(40),
  },
  label: {
    fontSize: r(13),
    fontFamily: "Lexend_600SemiBold",
    color: "#475569",
    marginBottom: r(6),
    marginTop: r(16),
  },
  readOnlyField: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(8),
    backgroundColor: "#FFFFFF",
    padding: r(14),
    borderRadius: r(12),
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  readOnlyText: {
    fontSize: r(15),
    fontFamily: "Lexend_500Medium",
    color: "#0F172A",
  },
  venueList: {
    gap: r(8),
  },
  venueOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(8),
    backgroundColor: "#FFFFFF",
    padding: r(14),
    borderRadius: r(12),
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  venueOptionActive: {
    backgroundColor: "#0B36F4",
    borderColor: "#0B36F4",
  },
  venueOptionText: {
    fontSize: r(14),
    fontFamily: "Lexend_500Medium",
    color: "#0F172A",
    flex: 1,
  },
  venueOptionTextActive: {
    color: "#FFFFFF",
  },
  sportRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: r(8),
  },
  sportChip: {
    paddingHorizontal: r(14),
    paddingVertical: r(8),
    borderRadius: r(20),
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sportChipActive: {
    backgroundColor: "#0B36F4",
    borderColor: "#0B36F4",
  },
  sportChipText: {
    fontSize: r(13),
    fontFamily: "Lexend_500Medium",
    color: "#64748B",
  },
  sportChipTextActive: {
    color: "#FFFFFF",
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(8),
    backgroundColor: "#FFFFFF",
    padding: r(14),
    borderRadius: r(12),
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pickerText: {
    fontSize: r(15),
    fontFamily: "Lexend_500Medium",
    color: "#0F172A",
  },
  input: {
    backgroundColor: "#FFFFFF",
    padding: r(14),
    borderRadius: r(12),
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: r(15),
    fontFamily: "Lexend_500Medium",
    color: "#0F172A",
  },
  submitButton: {
    backgroundColor: "#0B36F4",
    borderRadius: r(28),
    paddingVertical: r(16),
    alignItems: "center",
    marginTop: r(28),
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: r(16),
    fontFamily: "Lexend_700Bold",
    color: "#FFFFFF",
  },

  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",  
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
left: 0,
right: 0,
bottom: 0,
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: r(24),
    borderTopRightRadius: r(24),
    paddingBottom: r(36),
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: r(20),
    paddingVertical: r(14),
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: r(15),
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
  },
  modalCancel: {
    fontSize: r(15),
    fontFamily: "Lexend_400Regular",
    color: "#64748B",
  },
  modalDone: {
    fontSize: r(15),
    fontFamily: "Lexend_700Bold",
    color: "#0B36F4",
  },
  spinner: {
    width: "100%",
  },
});