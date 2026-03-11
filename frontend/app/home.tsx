import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { Input } from "@/components/Input";
import { useState, useEffect } from "react";
import { Button } from "@/components/Button";
import { useRouter } from "expo-router";
import { FilterButton } from "@/components/FilterButton";
import  MenuButton  from "@/components/MenuButton";
import SideMenu from "@/components/SideMenu";
import { getSavedToken, fetchMe } from "@/lib/auth";
import { User } from "@/types/user";

const { width } = Dimensions.get("window");

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await getSavedToken();

        if (token) {
          const { res, data } = await fetchMe(token);

          if (res.ok && data.ok) {
            setUser(data.user);
          }
        }
      } catch (err) {
        console.log("Home: failed to fetch user", err);
      }
    };

    loadUser();
  }, []);


  //Mock Data as placeholder until backend is ready
  const venues = [
    {
      venue_id: 1,
      venue_name: "Ocean Front",
      court_count: 4,
      open_time: "16:00",
      close_time: "23:00",
    },
    {
      venue_id: 2,
      venue_name: "Chula Sports Complex",
      court_count: 3,
      open_time: "17:00",
      close_time: "22:00",
    },
    {
      venue_id: 3,
      venue_name: "Sunset Beach Volley",
      court_count: 5,
      open_time: "16:00",
      close_time: "23:30",
    },
  ];

  const matches = [
    {
      match_post_id: 1,
      venue_id: 1,
      court_no: 4,
      date: "2026-06-04",
      start_time: "18:30",
      end_time: "20:00",
      max_players: 12,
      slot_left: 4,
      created_at: "2026-06-03T12:00:00",
    },
    {
      match_post_id: 2,
      venue_id: 2,
      court_no: 1,
      date: "2026-06-04",
      start_time: "19:30",
      end_time: "21:00",
      max_players: 12,
      slot_left: 6,
      created_at: "2026-06-03T13:00:00",
    },

    {
      match_post_id: 3,
      venue_id: 3,
      court_no: 4,
      date: "2026-06-04",
      start_time: "20:00",
      end_time: "22:00",
      max_players: 12,
      slot_left: 5,
      created_at: "2026-06-03T14:00:00",
    },
  ];

  const match_players = [
    {
      match_id: 1,
      user_id: 11,
      avatar: "https://i.pravatar.cc/150?img=1",
    },
    {
      match_id: 1,
      user_id: 12,
      avatar: "https://i.pravatar.cc/150?img=2",
    },
    {
      match_id: 1,
      user_id: 13,
      avatar: "https://i.pravatar.cc/150?img=3",
    },
  ];

  function getFeaturedMatch(matches: any[]) {
    return [...matches].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }
  const featuredMatch = getFeaturedMatch(matches);
  const featuredVenue = venues.find(v => v.venue_id === featuredMatch.venue_id);
  const [menuOpen, setMenuOpen] = useState(false);

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

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerCard}>
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.greetingName}>
              {user?.username ?? "Player"}
            </Text>
          </View>
            <MenuButton onPress={() => setMenuOpen(true)} />
        </View>

        <View style={styles.searchRow}>
          <Input
            placeholder="Search courts or matches..."
            showSearchIcon
            style={styles.searchBar}
          />
          <FilterButton onPress={() => {}} />
        </View>
      </View>

      <View style={styles.featuredCard}>

        {/* Date display */}
        <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>{formatDate(featuredMatch.date)}</Text>
        </View>

        {/* Title */}
        <Text style={styles.featuredTitle}>{featuredVenue?.venue_name}</Text>
        <Text style={styles.featuredLocation}>Court {featuredMatch.court_no}</Text>

        <Text style={styles.featuredTime}>{featuredMatch.start_time} - {featuredMatch.end_time}</Text>

        <Text style={styles.featuredText}>{featuredMatch.slot_left} slots left</Text>
      </View>

      <View style={styles.sectionHeader}> 
        <Text style={styles.title}>Available Sessions</Text>
        <Text style={styles.seeMore}>See More</Text>
      </View>
      

      {matches.map((match) => (
        <View key={match.match_post_id} style={styles.card}>
          <Text style={styles.court}>{match.court_no}</Text>
          <Text style={styles.meta}>{match.start_time} - {match.end_time}</Text>
          <Text style={styles.players}>{match.slot_left} slots left</Text>
        </View>
      ))}

      <Text style={styles.title}>Courts</Text>

      {venues.map((venue) => (
        <View key={venue.venue_id} style={styles.card}>
          <Text style={styles.court}>{venue.venue_name}</Text>
        </View>
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
  container: {
    backgroundColor: "#FFFFFF",
    
  },

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
    marginRight: 10,
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

  content: {
    backgroundColor: "#F1F5F9",
    paddingBottom: 120,
    paddingHorizontal: "6%",
  },

  sectionHeader: {
    flexDirection: "row",
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
});