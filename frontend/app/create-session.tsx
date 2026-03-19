import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { r } from "@/utils/responsive";
import { authFetch, API_BASE } from "@/lib/api";

type VenueOption = { venue_id: number; venue_name: string };

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

  const skillLevels = [
    { value: "all", label: "All Levels" },
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
    { value: "pro", label: "Pro" },
  ];

  // Picker visibility (Android shows inline, iOS shows modal)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

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
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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
        <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
          <MaterialIcons name="calendar-today" size={r(18)} color="#64748B" />
          <Text style={styles.pickerText}>{formatDate(date)}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            minimumDate={new Date()}
            onChange={(_, selected) => {
              setShowDatePicker(Platform.OS === "ios");
              if (selected) setDate(selected);
            }}
          />
        )}

        {/* Start Time */}
        <Text style={styles.label}>Start Time</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => setShowStartPicker(true)}>
          <MaterialIcons name="schedule" size={r(18)} color="#64748B" />
          <Text style={styles.pickerText}>{formatTime(startTime)}</Text>
        </TouchableOpacity>
        {showStartPicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            is24Hour
            onChange={(_, selected) => {
              setShowStartPicker(Platform.OS === "ios");
              if (selected) setStartTime(selected);
            }}
          />
        )}

        {/* End Time */}
        <Text style={styles.label}>End Time</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => setShowEndPicker(true)}>
          <MaterialIcons name="schedule" size={r(18)} color="#64748B" />
          <Text style={styles.pickerText}>{formatTime(endTime)}</Text>
        </TouchableOpacity>
        {showEndPicker && (
          <DateTimePicker
            value={endTime}
            mode="time"
            is24Hour
            onChange={(_, selected) => {
              setShowEndPicker(Platform.OS === "ios");
              if (selected) setEndTime(selected);
            }}
          />
        )}

        {/* Max Players */}
        <Text style={styles.label}>Max Players</Text>
        <TextInput
          style={styles.input}
          value={maxPlayers}
          onChangeText={setMaxPlayers}
          keyboardType="number-pad"
          placeholder="12"
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
  backButton: {
    padding: r(4),
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
});
