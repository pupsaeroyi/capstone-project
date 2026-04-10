import { View, Text, StyleSheet, ScrollView, FlatList, Dimensions, TouchableOpacity, RefreshControl, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Input } from "@/components/Input";
import { useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { FilterButton } from "@/components/FilterButton";
import  MenuButton  from "@/components/MenuButton";
import SideMenu from "@/components/SideMenu";
import { useAuth } from "@/context/AuthContext";
import { API_BASE, authFetch } from "@/lib/api";
import { r } from "@/utils/responsive";

const { width } = Dimensions.get("window");

type SessionWithVenue = {
  session_id: number;
  sport: string;
  session_name: string | null;
  skill_level: string;
  player_count: number;
  max_players: number;
  start_time: string;
  end_time: string;
  venue_id: number;
  venue_name: string;
  thumbnail_url: string;
};

type VenueBasic = {
  venue_id: number;
  venue_name: string;
  court_count: number;
  thumbnail_url: string;
};

export default function Home() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState<SessionWithVenue[]>([]);
  const [venues, setVenues] = useState<VenueBasic[]>([]);
  const [toRate, setToRate] = useState<{ session_id: number; session_name: string | null; venue_name: string; end_time: string }[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshOffset, setRefreshOffset] = useState(0);
  const [rateIndex, setRateIndex] = useState(0);



  const fetchHomeData = async () => {

    try {
      const res = await fetch(`${API_BASE}/venues`);
      const data = await res.json();

      if (data.ok) {
        const venueList: VenueBasic[] = [];
        const allSessions: SessionWithVenue[] = [];

        for (const v of data.venues) {
          venueList.push({ venue_id: v.venue_id, venue_name: v.venue_name, court_count: v.court_count });

          for (const s of v.active_sessions) {
            allSessions.push({ ...s, venue_id: v.venue_id, venue_name: v.venue_name });
          }
        }

        setVenues(venueList);
        setSessions(allSessions.sort((a, b) =>
              new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          )
        );
      }
    } catch (err) {
      console.error("Failed to fetch venues:", err);
    } finally {
      setRefreshing(false); 
    }
  };

  const fetchToRate = useCallback(async () => {
    try {
      const data = await authFetch("/sessions/to-rate");
      if (data.ok) setToRate(data.sessions);
    } catch (err) {
      console.error("Failed to fetch to-rate:", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHomeData();
      fetchToRate();
    }, [fetchToRate])
  );

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => setRefreshOffset(80), 100);
      return () => clearTimeout(t);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomeData();
    fetchToRate();
  };

  const featuredSession = sessions[0] || null;

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning 👋";
    if (hour < 17) return "Good Afternoon 👋";
    if (hour < 21) return "Good Evening 👋";
    return "Good Night 👋";
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <View style={{ flex: 1,backgroundColor: "#FFFFFF" }}>
       <View style={styles.bottomBackground} />
      <ScrollView
        style={{flex:1}}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B36F4" progressViewOffset={refreshOffset} />
        }
      >
      <View style={styles.headerCard}>
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.greetingName}>
              {profile?.username ?? user?.username ?? "Player"}
            </Text>
          </View>
            <MenuButton onPress={() => setMenuOpen(true)} />
        </View>

        <View style={styles.searchRow}>
          <Input
            placeholder="Search courts or matches"
            showSearchIcon
            style={styles.searchBar}
          />
        </View>
      </View>

      {featuredSession && (
        <TouchableOpacity
          style={styles.featuredCard}
          onPress={() => router.push(`/session/${featuredSession.session_id}`)}
          activeOpacity={0.8}
        >
          <View style={styles.dateDisplay}>
            <Text style={styles.dateText}>{formatDate(featuredSession.start_time)}</Text>
          </View>
          <Text style={styles.featuredTitle}>{featuredSession.venue_name}</Text>
          <Text style={styles.featuredLocation}>{featuredSession.sport}</Text>
          <Text style={styles.featuredTime}>
            {formatTime(featuredSession.start_time)} - {formatTime(featuredSession.end_time)}
          </Text>
          <Text style={styles.featuredText}>
            {featuredSession.max_players - featuredSession.player_count} slots left
          </Text>
        </TouchableOpacity>
      )}

      {toRate.length > 0 && (
        <View style={styles.toRateBanner}>
          <View style={styles.toRateHeader}>
            <MaterialIcons name="star-rate" size={r(20)} color="#F59E0B" />
            <Text style={styles.toRateTitle}>Rate Your Match</Text>
          </View>
          <FlatList
            data={toRate}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={width * 0.76 + r(10)}
            decelerationRate="fast"
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            keyExtractor={(item) => item.session_id.toString()}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / (width * 0.76 + r(10)));
              setRateIndex(index);
            }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.toRateCard}
                activeOpacity={0.7}
                onPress={() => router.push(`/session/${item.session_id}` as any)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.toRateVenue} numberOfLines={1}>{item.venue_name}</Text>
                  {item.session_name && (
                    <Text style={styles.toRateName} numberOfLines={1}>{item.session_name}</Text>
                  )}
                </View>
                <View style={styles.toRateButton}>
                  <Text style={styles.toRateButtonText}>Rate</Text>
                  <MaterialIcons name="chevron-right" size={r(16)} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            )}
          />
          {toRate.length > 1 && (
            <View style={styles.dotsRow}>
              {toRate.map((_, i) => (
                <View key={i} style={[styles.dot, i === rateIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.title}>Available Sessions</Text>
        <TouchableOpacity onPress={() => router.push("/sessions")}>
          <Text style={styles.seeMore}>See More</Text>
        </TouchableOpacity>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialIcons name="event-busy" size={32} color="#CBD5E1" />
          <Text style={styles.emptyText}>No active sessions right now</Text>
        </View>
      ) : (
        sessions.map((session) => (
          <TouchableOpacity
            key={session.session_id}
            style={styles.card}
            onPress={() => router.push(`/session/${session.session_id}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.court}>{session.venue_name}</Text>
            <Text style={styles.meta}>
              {formatTime(session.start_time)} - {formatTime(session.end_time)}
            </Text>
            <Text style={styles.players}>
              {session.max_players - session.player_count} slots left
            </Text>
          </TouchableOpacity>
        ))
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.title}>Courts</Text>
      </View>

      {venues.map((venue) => (
        <TouchableOpacity
          key={venue.venue_id}
          style={styles.card}
          onPress={() => router.push({ pathname: "/venue/[id]", params: { id: venue.venue_id.toString(), venue_name: venue.venue_name } })}
          activeOpacity={0.7}
        >
          <Text style={styles.court}>{venue.venue_name}</Text>
          <Text style={styles.courtSub}>{venue.court_count} court{venue.court_count !== 1 ? "s" : ""}</Text>
        </TouchableOpacity>
      ))}

      {/* DEV tools */}
      {__DEV__ && (
      <Text
      style={{ fontSize: 12, color: "#999" }}
      onPress={() =>router.replace("/login")
      }
      >
        Back to Login
        </Text>
      )}
      

    </ScrollView>

    <SideMenu
      visible={menuOpen}
      onClose={() => setMenuOpen(false)}
    />

  </View>

  );
}

const styles = StyleSheet.create({

  headerCard: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingTop: 48,
    paddingHorizontal: "7%",
    marginHorizontal: "-7%",
    shadowColor: "#FFFFFF",
    elevation: 3,
  },

  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  greetingText: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Lexend_400Regular",
  },
  
  greetingName: {
    fontSize: 24,
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
  },

  searchRow: {
    flexDirection: "row",
    flex: 1,
  },

  searchBar: {
    marginBottom: 30,
    flex: 1,
  },

  featuredCard: {
    backgroundColor: "#0B36F4",
    borderRadius: 32,
    padding: 20,
    marginBottom: 30,
  },

  featuredTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },

  featuredLocation: {
    color: "#E2E8F0",
    fontSize: 14,
    marginBottom: 4,
    fontFamily: "Lexend_500Medium",
  },

  featuredTime: {
    color: "#FFFFFF",
    fontSize: 14,
    marginBottom: 4,
  },

  featuredText: {
    color: "#FFFFFF",
    fontSize: 14,
  },

  bottomBackground: {
    position: "absolute",
    top: r(360),
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#F1F5F9",
  },

  content: {
    flexGrow: 1,
    backgroundColor: "#F1F5F9",
    paddingBottom: 120,
    paddingHorizontal: "6%",
  },

  sectionHeader: {
    flexDirection: "row",
    marginTop: 24,
    marginBottom: 16,
    justifyContent: "space-between",
    alignItems: "baseline",
  },

  title: {
    fontSize: 18,
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
  },

  seeMore: {
    fontSize: 14,
    fontFamily: "Lexend_600SemiBold",
    color: "#0B36F4",
  },

  card: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },

  court: {
    fontSize: 16,
    fontWeight: "600",
  },

  meta: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },

  emptyCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 24,
    marginBottom: 14,
    alignItems: "center",
    gap: 8,
  },

  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    fontFamily: "Lexend_400Regular",
  },

  courtSub: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Lexend_400Regular",
    marginTop: 4,
  },

  players: {
    fontSize: 14,
    marginTop: 4,
  },

  dateDisplay: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },

  dateText: {
    color: "#0B36F4",
    fontSize: 12,
    fontFamily: "Lexend_700Bold",
  },

  toRateBanner: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: r(16),
    marginBottom: r(8),
    borderWidth: 1,
    borderColor: "#FDE68A",
  },

  toRateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(8),
    marginBottom: r(12),
  },

  toRateTitle: {
    fontSize: r(16),
    fontFamily: "Lexend_700Bold",
    color: "#92400E",
  },

  toRateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: r(12),
    padding: r(12),
    marginRight: r(10),
    width: width * 0.76,
    gap: r(10),
  },

  toRateVenue: {
    fontSize: r(14),
    fontFamily: "Lexend_600SemiBold",
    color: "#92400E",
  },

  toRateName: {
    fontSize: r(12),
    fontFamily: "Lexend_400Regular",
    color: "#B45309",
    marginTop: r(2),
  },

  toRateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(4),
    backgroundColor: "#F59E0B",
    paddingHorizontal: r(16),
    paddingVertical: r(10),
    borderRadius: r(20),
  },

  toRateButtonText: {
    fontSize: r(13),
    fontFamily: "Lexend_700Bold",
    color: "#FFFFFF",
  },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: r(6),
    marginTop: r(10),
  },

  dot: {
    width: r(6),
    height: r(6),
    borderRadius: r(3),
    backgroundColor: "#E5D5A0",
  },

  dotActive: {
    backgroundColor: "#92400E",
    width: r(16),
  },
});