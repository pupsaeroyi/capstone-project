import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Platform, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { r } from "@/utils/responsive";
import { haversineKm } from "@/utils/distance";
import { Venue } from "@/types/venue";
import { API_BASE } from "@/lib/api";
import MapSearchBar from "@/components/map/MapSearchBar";
import MapFloatingButtons from "@/components/map/MapFloatingButtons";
import VenueBottomSheet from "@/components/map/VenueBottomSheet";
import SideMenu from "@/components/SideMenu";

const BANGKOK_REGION = {
  latitude: 13.7563,
  longitude: 100.5018,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

// Conditionally import react-native-maps (not available on web)
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== "web") {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
}

// Lazy-loaded MapMarker to avoid SSR issues
let MapMarkerComponent: any = null;
if (Platform.OS !== "web") {
  MapMarkerComponent = require("@/components/map/MapMarker").default;
}

export default function MapScreen() {
  const mapRef = useRef<any>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Request location permission on mount and capture position once
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      try {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (err) {
        console.log("Initial location fetch failed:", err);
      }
    })();
  }, []);

  // Fetch venues from API
  useEffect(() => {
    fetch(`${API_BASE}/venues`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) setVenues(data.venues);
      })
      .catch(err => console.error("Failed to fetch venues:", err));
  }, []);

  // Enrich venues with user-relative distance (null if no user location yet)
  const enrichedVenues = useMemo<Venue[]>(() => {
    if (!userLocation) {
      return venues.map(v => ({ ...v, distance_km: null }));
    }
    return venues.map(v => ({
      ...v,
      distance_km: haversineKm(
        userLocation.latitude,
        userLocation.longitude,
        v.latitude,
        v.longitude
      ),
    }));
  }, [venues, userLocation]);

  const selectedVenue = enrichedVenues.find(v => v.venue_id === selectedVenueId) ?? null;

  const handleMarkerPress = useCallback((venue: Venue) => {
    setSelectedVenueId(venue.venue_id);
    mapRef.current?.animateToRegion(
      {
        latitude: venue.latitude,
        longitude: venue.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      500
    );
  }, []);

  const handleMyLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      mapRef.current?.animateToRegion(
        {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        800
      );
    } catch (err) {
      console.log("Location error:", err);
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const getMarkerVariant = (venue: Venue) => {
    if (selectedVenue?.venue_id === venue.venue_id) return "selected";
    if (venue.active_sessions.length > 0) return "active";
    return "inactive";
  };

  // Web fallback
  if (Platform.OS === "web") {
    return (
      <View style={styles.webFallback}>
        <Text style={styles.webFallbackTitle}>Court Discovery Map</Text>
        <Text style={styles.webFallbackText}>
          The interactive map is available on iOS and Android.{"\n"}
          Please open this app on your phone via Expo Go.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full-screen map */}
      {MapView && (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={BANGKOK_REGION}
          showsUserLocation
          showsMyLocationButton={false}
          onPress={() => setSelectedVenueId(null)}
        >
          {enrichedVenues.map((venue) => {
            const variant = getMarkerVariant(venue);
            return (
              <Marker
                key={venue.venue_id}
                coordinate={{
                  latitude: venue.latitude,
                  longitude: venue.longitude,
                }}
                onPress={(e: any) => {
                  e.stopPropagation();
                  handleMarkerPress(venue);
                }}
                tracksViewChanges
              >
                {MapMarkerComponent && (
                  <MapMarkerComponent
                    variant={variant}
                    activeCount={venue.active_sessions.length}
                  />
                )}
              </Marker>
            );
          })}
        </MapView>
      )}

      {/* Loading indicator for location */}
      {locationLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#0B36F4" />
        </View>
      )}

      {/* Top search bar */}
      <MapSearchBar
        onMenuPress={() => setMenuVisible(true)}
        onFilterPress={() => {}}
      />

      {/* Floating action buttons */}
      <MapFloatingButtons onMyLocationPress={handleMyLocation} bottomSheetOpen={!!selectedVenue} />

      {/* Bottom sheet */}
      <VenueBottomSheet
        venue={selectedVenue}
        onClose={() => setSelectedVenueId(null)}
      />

      {/* Side menu */}
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0F0",
  },
  loadingOverlay: {
    position: "absolute",
    top: "50%",
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: r(20),
    padding: r(12),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 20,
  },

  // Web fallback
  webFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: r(32),
  },
  webFallbackTitle: {
    fontSize: r(22),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
    marginBottom: r(12),
  },
  webFallbackText: {
    fontSize: r(14),
    fontFamily: "Lexend_400Regular",
    color: "#64748B",
    textAlign: "center",
    lineHeight: r(22),
  },
});
