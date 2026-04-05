import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useCallback } from "react";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { API_BASE } from "@/lib/api";
import { useRouter } from "expo-router";
import { Input } from "@/components/Input";

const FILTERS = ["All Posts", "#Teammates", "#Drills", "#Highlights", "#Tips"];

const TAG_COLORS: Record<string, string> = {
  "Looking for Teammates": "#0B36F4",
  "Training Tips": "#F59E0B",
  "Match Highlights": "#10B981",
  "Drills": "#8B5CF6",
  "Tips": "#EF4444",
};

type Post = {
  id: number;
  content: string;
  tag: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  username: string;
  avatar_url: string | null;
  liked: boolean;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

export default function Community() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("All Posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchPosts = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setPosts(data.posts);
    } catch (err) {
      console.error("Fetch posts error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleLike = async (postId: number) => {
    const token = await SecureStore.getItemAsync("accessToken");
    const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.ok) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                liked: data.liked,
                likes_count: data.liked ? p.likes_count + 1 : p.likes_count - 1,
              }
            : p
        )
      );
    }
  };

  const filteredPosts = posts.filter((p) => {
    const matchesFilter =
      activeFilter === "All Posts" ||
      p.tag?.toLowerCase().includes(activeFilter.replace("#", "").toLowerCase());
    const matchesSearch =
      !search ||
      p.content.toLowerCase().includes(search.toLowerCase()) ||
      p.username.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} color="#0B36F4" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Community</Text>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search here"
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, activeFilter === f && styles.filterBtnActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Posts */}
        <View style={styles.posts}>
          {filteredPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No posts yet. Be the first!</Text>
            </View>
          ) : (
            filteredPosts.map((post) => (
              <View key={post.id} style={styles.card}>
                {/* Post header */}
                <View style={styles.cardHeader}>
                  {post.avatar_url ? (
                    <Image source={{ uri: post.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitial}>
                        {post.username?.[0]?.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{post.username}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
                      {post.tag && (
                        <>
                          <Text style={styles.dot}>·</Text>
                          <Text style={[styles.tag, { color: TAG_COLORS[post.tag] || "#0B36F4" }]}>
                            {post.tag}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity>
                    <Feather name="more-horizontal" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <Text style={styles.content}>{post.content}</Text>

                {/* Image */}
                {post.image_url && (
                  <Image
                    source={{ uri: post.image_url }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                )}

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleLike(post.id)}
                  >
                    <Ionicons
                      name={post.liked ? "heart" : "heart-outline"}
                      size={20}
                      color={post.liked ? "#EF4444" : "#64748B"}
                    />
                    <Text style={styles.actionText}>{post.likes_count}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn}>
                    <Ionicons name="chatbubble-outline" size={20} color="#64748B" />
                    <Text style={styles.actionText}>{post.comments_count}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn}>
                    <Ionicons name="share-outline" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB - create post */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: "6%",
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 26,
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: "6%",
    paddingVertical: 12,
    backgroundColor: "#fff",
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 25,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Lexend_400Regular",
    color: "#0F172A",
  },
  filters: {
    paddingHorizontal: "6%",
    paddingVertical: 12,
    gap: 8,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  filterBtnActive: {
    backgroundColor: "#0B36F4",
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Lexend_500Medium",
    color: "#64748B",
  },
  filterTextActive: {
    color: "#fff",
  },
  posts: {
    paddingHorizontal: "4%",
    paddingTop: 4,
    gap: 12,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0B36F4",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 18,
    fontFamily: "Lexend_700Bold",
    color: "#fff",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
  },
  dot: {
    fontSize: 12,
    color: "#94A3B8",
  },
  tag: {
    fontSize: 12,
    fontFamily: "Lexend_500Medium",
  },
  content: {
    fontSize: 14,
    fontFamily: "Lexend_400Regular",
    color: "#334155",
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontFamily: "Lexend_400Regular",
    color: "#64748B",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
  },
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0B36F4",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
});