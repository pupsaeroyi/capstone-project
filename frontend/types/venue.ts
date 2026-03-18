export type VenueSession = {
  session_id: number;
  sport: string;
  player_count: number;
  max_players: number;
  start_time: string;
  end_time: string;
};

export type Venue = {
  venue_id: number;
  venue_name: string;
  latitude: number;
  longitude: number;
  court_count: number;
  rating: number;
  review_count: number;
  thumbnail_url: string;
  distance_km: number;
  active_sessions: VenueSession[];
  tags: string[];
  condition_label: string;
  player_count: number;
};

export type MarkerVariant = "active" | "selected" | "inactive";
