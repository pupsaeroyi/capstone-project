import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Platform, Modal, Pressable, Image, Switch } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { r } from "@/utils/responsive";
import { authFetch, API_BASE } from "@/lib/api";

type VenueOption = { venue_id: number; venue_name: string; thumbnail_url: string; is_free: boolean };
type PickerTarget = "date" | "start" | "end" | null;

export default function CreateSessionScreen() {
  const { venue_id: paramVenueId, venue_name: paramVenueName } = useLocalSearchParams<{ venue_id: string; venue_name: string }>();
  const router = useRouter();

  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | undefined>(paramVenueId);
  const [selectedVenueName, setSelectedVenueName] = useState<string | undefined>(paramVenueName);
  const [venueImage, setVenueImage] = useState<string>("");
  const [venuePickerOpen, setVenuePickerOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/venues`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          const list = data.venues.map((v: any) => ({ venue_id: v.venue_id, venue_name: v.venue_name, thumbnail_url: v.thumbnail_url || "", is_free: !!v.is_free }));
          setVenues(list);
          if (paramVenueId) {
            const match = list.find((v: VenueOption) => v.venue_id.toString() === paramVenueId);
            if (match) setVenueImage(match.thumbnail_url);
          }
        }
      })
      .catch(err => console.error("Failed to fetch venues:", err));
  }, [paramVenueId]);

  const [sessionName, setSessionName] = useState("");
  const [skillLevel, setSkillLevel] = useState("all");
  const [maxPlayers, setMaxPlayers] = useState("12");
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000));
  const [sessionType, setSessionType] = useState<"casual" | "ranked">("casual");
  const [mbtiMatching, setMbtiMatching] = useState(true);
  const [bookingFee, setBookingFee] = useState("150");
  const [submitting, setSubmitting] = useState(false);

  const selectedVenue = venues.find((v) => v.venue_id.toString() === selectedVenueId);
  const venueIsFree = !!selectedVenue?.is_free;

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
    { value: "all", label: "All" },
    { value: "beginner", label: "Beg." },
    { value: "intermediate", label: "Int." },
    { value: "advanced", label: "Adv." },
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
      Alert.alert("Invalid", "Please select a court");
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
          session_type: sessionType,
          mbti_matching: mbtiMatching,
          booking_fee: venueIsFree ? 0 : Math.max(0, parseInt(bookingFee || "0", 10) || 0),
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
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

  const pickerMode = activePicker === "date" ? "date" : "time";

  const selectVenue = (v: VenueOption) => {
    setSelectedVenueId(v.venue_id.toString());
    setSelectedVenueName(v.venue_name);
    setVenueImage(v.thumbnail_url);
    setVenuePickerOpen(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="chevron-back" size={28} color="#000" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>New Session</Text>
        <View style={{ width: r(24) }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        {/* Venue Image */}
        <Image
          source={venueImage ? { uri: venueImage } : require("@/assets/images/default-court.jpg")}
          style={styles.venueImage}
        />

        {/* Session Name */}
        <Text style={styles.label}>Session Name</Text>
        <TextInput
          style={styles.input}
          value={sessionName}
          onChangeText={setSessionName}
          placeholder="Sunday Morning Smash"
          placeholderTextColor="#94A3B8"
        />

        {/* Court Selection */}
        <Text style={styles.label}>Court Selection</Text>
        <TouchableOpacity style={styles.courtSelectRow} onPress={() => setVenuePickerOpen(true)}>
          <Text style={[styles.courtSelectText, !selectedVenueName && { color: "#94A3B8" }]} numberOfLines={1}>
            {selectedVenueName || "Select a Court"}
          </Text>
          <View style={styles.courtSelectIcon}>
            <MaterialIcons name="location-on" size={r(18)} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Date & Time Card */}
        <View style={styles.dateTimeCard}>
          <Text style={styles.dateTimeTitle}>Date & Time</Text>

          <TouchableOpacity style={styles.dateTimeRow} onPress={() => openPicker("date")}>
            <MaterialIcons name="calendar-today" size={r(22)} color="#0B36F4" />
            <Text style={styles.dateTimeLabel}>Date</Text>
            <Text style={styles.dateTimeValue}>{formatDate(date)}</Text>
          </TouchableOpacity>

          <View style={styles.Divider} />

          <TouchableOpacity style={styles.dateTimeRow} onPress={() => openPicker("start")}>
            <MaterialCommunityIcons name="clock-time-five-outline" size={r(22)} color="#0B36F4" />
            <Text style={styles.dateTimeLabel}>Start Time</Text>
            <Text style={styles.dateTimeValue}>{formatTime(startTime)}</Text>
          </TouchableOpacity>

          <View style={styles.Divider} />

          <TouchableOpacity style={styles.dateTimeRow} onPress={() => openPicker("end")}>
            <MaterialCommunityIcons name="clock-time-eight-outline" size={r(22)} color="#0B36F4" />
            <Text style={styles.dateTimeLabel}>End Time</Text>
            <Text style={styles.dateTimeValue}>{formatTime(endTime)}</Text>
          </TouchableOpacity>

        </View>

        {/* Skill Level */}
        <Text style={styles.label}>Skill Level</Text>
        <View style={styles.skillRow}>
          {skillLevels.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={[styles.skillChip, skillLevel === level.value && styles.skillChipActive]}
              onPress={() => setSkillLevel(level.value)}
            >
              <Text style={[styles.skillChipText, skillLevel === level.value && styles.skillChipTextActive]}>
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Casual / Ranked Toggle */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeButton, sessionType === "casual" && styles.typeButtonActive]}
            onPress={() => setSessionType("casual")}
          >
            <Text style={[styles.typeButtonText, sessionType === "casual" && styles.typeButtonTextActive]}>Casual</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, sessionType === "ranked" && styles.typeButtonActive]}
            onPress={() => setSessionType("ranked")}
          >
            <Text style={[styles.typeButtonText, sessionType === "ranked" && styles.typeButtonTextActive]}>Ranked</Text>
          </TouchableOpacity>
        </View>

        {/* MBTI Matching */}
        <View style={styles.mbtiCard}>
          <View style={styles.mbtiHeader}>
            <View style={styles.mbtiIconCircle}>
              <MaterialIcons name="psychology" size={r(18)} color="#0B36F4" />
            </View>
            <Text style={styles.mbtiTitle}>MBTI Matching</Text>
          </View>
          <View style={styles.mbtiContent}>
            <Text style={styles.mbtiDesc}>Prioritize teammates with compatible personality types for better chemistry.</Text>
            <Switch
              value={mbtiMatching}
              onValueChange={setMbtiMatching}
              trackColor={{ false: "#E2E8F0", true: "#0B36F4" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

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

        {/* Booking Fee */}
        <Text style={styles.label}>Booking Fee (THB / person)</Text>
        {venueIsFree ? (
          <View style={styles.freeCard}>
            <MaterialIcons name="school" size={r(18)} color="#10B981" />
            <Text style={styles.freeCardText}>This is a free university venue — no fee.</Text>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={bookingFee}
              onChangeText={(t) => setBookingFee(t.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              placeholder="0 for free"
              placeholderTextColor="#94A3B8"
              maxLength={5}
            />

            <View style={styles.feePresetRow}>
              {["0", "100", "150", "200", "300"].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.feePreset, bookingFee === p && styles.feePresetActive]}
                   onPress={() => setBookingFee(p)}
                >
                  <Text style={[styles.feePresetText, bookingFee === p && styles.feePresetTextActive]}>
                    {p === "0" ? "Free" : `฿${p}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

          </>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitText}>
            {submitting ? "Creating..." : "Create Session"}
          </Text>
          {!submitting && <MaterialIcons name="send" size={r(20)} color="#FFFFFF" />}
        </TouchableOpacity>
      </ScrollView>

      {/* Venue Picker Modal */}
      <Modal visible={venuePickerOpen} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalBackdrop} onPress={() => setVenuePickerOpen(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Court</Text>
              <TouchableOpacity onPress={() => setVenuePickerOpen(false)}>
                <Ionicons name="close" size={r(24)} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: r(400) }}>
              {venues.map((v) => (
                <TouchableOpacity key={v.venue_id} style={styles.venueOptionRow} onPress={() => selectVenue(v)}>
                  <MaterialIcons name="location-on" size={r(18)} color="#0B36F4" />
                  <Text style={styles.venueOptionText} numberOfLines={1}>{v.venue_name}</Text>
                  {selectedVenueId === v.venue_id.toString() && (
                    <Ionicons name="checkmark-circle" size={r(20)} color="#0B36F4" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date/Time Pickers */}
      {Platform.OS === "ios" && (
        <Modal visible={activePicker !== null} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <Pressable style={styles.modalBackdrop} onPress={() => setActivePicker(null)} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setActivePicker(null)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {activePicker === "date" ? "Select Date" : "Select Time"}
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
                style={{ width: "100%" }}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === "android" && activePicker === "date" && (
        <DateTimePicker value={date} mode="date" minimumDate={new Date()} onChange={(e, s) => handleAndroidChange("date", e, s)} />
      )}
      {Platform.OS === "android" && activePicker === "start" && (
        <DateTimePicker value={startTime} mode="time" is24Hour onChange={(e, s) => handleAndroidChange("start", e, s)} />
      )}
      {Platform.OS === "android" && activePicker === "end" && (
        <DateTimePicker value={endTime} mode="time" is24Hour onChange={(e, s) => handleAndroidChange("end", e, s)} />
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

  venueImage: {
    width: "100%",
    height: r(160),
    borderRadius: r(16),
    marginBottom: r(16),
  },
  label: {
    fontSize: r(13),
    fontFamily: "Lexend_600SemiBold",
    color: "#64748B",
    marginBottom: r(6),
    marginTop: r(14),
  },
  input: {
    backgroundColor: "#FFFFFF",
    padding: r(14),
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: r(15),
    fontFamily: "Lexend_500Medium",
    color: "#0F172A",
  },

  courtSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: r(14),
    paddingVertical: r(10),
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  courtSelectText: {
    flex: 1,
    fontSize: r(15),
    fontFamily: "Lexend_500Medium",
    color: "#0F172A",
  },
  courtSelectIcon: {
    width: r(32),
    height: r(32),
    borderRadius: 28,
    backgroundColor: "#0B36F4",
    justifyContent: "center",
    alignItems: "center",
  },

  dateTimeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: r(16),
    marginTop: r(16),
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dateTimeTitle: {
    fontSize: r(13),
    fontFamily: "Lexend_600SemiBold",
    color: "#64748B",
    marginBottom: r(12),
  },

  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: r(10),
    gap: r(10),
  },

  Divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: r(4),
  },

  dateTimeLabel: {
    fontSize: r(15),
    fontFamily: "Lexend_500Medium",
    color: "#0F172A",
    flex: 1,
  },
  dateTimeValue: {
    fontSize: r(14),
    fontFamily: "Lexend_500Medium",
    color: "#0B36F4",
  },

  skillRow: {
    flexDirection: "row",
    gap: r(8),
  },
  skillChip: {
    flex: 1,
    paddingVertical: r(10),
    borderRadius: r(20),
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  skillChipActive: {
    backgroundColor: "#0B36F4",
    borderColor: "#0B36F4",
  },
  skillChipText: {
    fontSize: r(13),
    fontFamily: "Lexend_600SemiBold",
    color: "#64748B",
  },
  skillChipTextActive: {
    color: "#FFFFFF",
  },

  typeToggle: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: r(24),
    padding: r(4),
    marginTop: r(18),
  },
  typeButton: {
    flex: 1,
    paddingVertical: r(12),
    borderRadius: r(20),
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: "#0B36F4",
  },
  typeButtonText: {
    fontSize: r(14),
    fontFamily: "Lexend_600SemiBold",
    color: "#64748B",
  },
  typeButtonTextActive: {
    color: "#FFFFFF",
  },

  mbtiCard: {
    backgroundColor: "#EEF2FF",
    borderColor: "#CED7FD",
    borderWidth: 1,
    borderRadius: 28,
    padding: r(18),
    marginTop: r(16),
  },
  mbtiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(8),
    marginBottom: r(8),
  },
  mbtiIconCircle: {
    width: r(28),
    height: r(28),
    borderRadius: r(14),
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  mbtiTitle: {
    fontSize: r(15),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
  },
  mbtiContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(12),
  },
  mbtiDesc: {
    flex: 1,
    fontSize: r(12),
    fontFamily: "Lexend_400Regular",
    color: "#64748B",
    lineHeight: r(18),
  },

  freeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(8),
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: r(14),
    paddingVertical: r(12),
    borderRadius: r(12),
  },
  freeCardText: {
    fontSize: r(13),
    fontFamily: "Lexend_500Medium",
    color: "#065F46",
    flex: 1,
  },

  feePresetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: r(8),
    justifyContent: "space-between", 
  },
  feePreset: {
    paddingHorizontal: r(14),
    paddingVertical: r(8),
    borderRadius: r(18),
    backgroundColor: "#F1F5F9",
  },
  feePresetActive: {
    backgroundColor: "#0B36F4",
  },
  feePresetText: {
    fontSize: r(13),
    fontFamily: "Lexend_600SemiBold",
    color: "#64748B",
  },
  feePresetTextActive: {
    color: "#FFFFFF",
  },

  submitButton: {
    flexDirection: "row",
    backgroundColor: "#0B36F4",
    borderRadius: r(28),
    paddingVertical: r(16),
    alignItems: "center",
    justifyContent: "center",
    marginTop: r(24),
    gap: r(6),
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: r(16),
    fontFamily: "Lexend_700Bold",
    color: "#FFFFFF",
  },

  venueOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(10),
    padding: r(16),
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  venueOptionText: {
    flex: 1,
    fontSize: r(14),
    fontFamily: "Lexend_500Medium",
    color: "#0F172A",
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
});
