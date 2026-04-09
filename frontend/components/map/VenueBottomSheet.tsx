import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, PanResponder, Dimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import { Venue } from "@/types/venue";
import { r } from "@/utils/responsive";
import { formatDistance } from "@/utils/distance";
import VenueInfoCard from "./VenueInfoCard";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = r(340);

type Props = {
  venue: Venue | null;
  onClose: () => void;
};

export default function VenueBottomSheet({ venue, onClose }: Props) {
  const router = useRouter();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (venue) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
        speed: 14,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [venue]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 8,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 80 || gesture.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: SHEET_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onClose());
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  if (!venue) return null;

  const activeCount = venue.active_sessions.length;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      {/* Drag handle */}
      <View style={styles.handleBar}>
        <View style={styles.handle} />
      </View>

      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {venue.tags.length > 0 && (
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>{venue.tags[0]}</Text>
              </View>
            )}
            {venue.distance_km !== null && (
              <Text style={styles.distance}>{formatDistance(venue.distance_km)} away</Text>
            )}
          </View>
          {venue.thumbnail_url ? (
            <Image source={{ uri: venue.thumbnail_url }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <MaterialIcons name="sports-volleyball" size={r(28)} color="#94A3B8" />
            </View>
          )}
        </View>

        {/* Venue name */}
        <Text style={styles.venueName}>{venue.venue_name}</Text>

        {/* Rating */}
        <View style={styles.ratingRow}>
          <MaterialIcons name="star" size={r(16)} color="#FBBF24" />
          <Text style={styles.ratingValue}>{venue.rating}</Text>
          <Text style={styles.reviewCount}>({venue.review_count} reviews)</Text>
        </View>

        {/* Info cards */}
        <View style={styles.infoRow}>
          <VenueInfoCard icon="groups" label={`${venue.player_count} Players Here`} />
          <VenueInfoCard icon="wb-sunny" label={venue.condition_label} />
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.8}
          onPress={() => {
            router.push({
              pathname: "/venue/[id]",
              params: { id: venue.venue_id.toString(), venue_name: venue.venue_name },
            });
          }}
        >
          <Text style={styles.ctaText}>
            {activeCount > 0
              ? `View ${activeCount} Active Session${activeCount > 1 ? "s" : ""}`
              : "View Venue Details"}
          </Text>
          <MaterialIcons name="arrow-forward" size={r(18)} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: r(24),
    borderTopRightRadius: r(24),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handleBar: {
    alignItems: "center",
    paddingVertical: r(10),
  },
  handle: {
    backgroundColor: "#E2E8F0",
    width: r(48),
    height: r(6),
    borderRadius: r(3),
  },
  content: {
    paddingHorizontal: r(20),
    paddingBottom: r(34),
  },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: r(6),
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(10),
  },
  tagBadge: {
    backgroundColor: "#E6EAFD",
    paddingHorizontal: r(10),
    paddingVertical: r(4),
    borderRadius: r(12),
  },
  tagText: {
    fontSize: r(11),
    fontFamily: "Lexend_600SemiBold",
    color: "#0B36F4",
  },
  distance: {
    fontSize: r(12),
    fontFamily: "Lexend_400Regular",
    color: "#64748B",
  },
  thumbnail: {
    width: r(64),
    height: r(64),
    borderRadius: r(32),
    backgroundColor: "#E2E8F0",
  },
  thumbnailPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },

  // Venue name
  venueName: {
    fontSize: r(20),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
    marginBottom: r(4),
  },

  // Rating
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(4),
    marginBottom: r(12),
  },
  ratingValue: {
    fontSize: r(14),
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
  },
  reviewCount: {
    fontSize: r(12),
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
  },

  // Info row
  infoRow: {
    flexDirection: "row",
    gap: r(10),
    marginBottom: r(14),
  },

  // CTA
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B36F4",
    borderRadius: r(28),
    paddingVertical: r(14),
    gap: r(8),
  },
  ctaText: {
    fontSize: r(15),
    fontFamily: "Lexend_600SemiBold",
    color: "#FFFFFF",
  },
});
