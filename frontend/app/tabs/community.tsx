import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, RefreshControl, ActivityIndicator, Modal, Animated, Keyboard, Platform, KeyboardAvoidingView, Pressable, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect, useCallback, useRef } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { API_BASE } from "@/lib/api";
import { r } from "@/utils/responsive";

const FILTERS = ["All Posts", "#Friends", "#Drills", "#Highlights", "#Tips"];

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
  can_delete: boolean;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Search Sheet
function SearchSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(800)).current;
  const inputRef = useRef<TextInput>(null);
  
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);

  const loadRecents = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/api/search/recent`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setRecentSearches(data.recents);
    } catch (err) {
      console.error(err);
    }
  };

  const saveRecent = async (userId: number) => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      await fetch(`${API_BASE}/api/search/recent`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ searched_id: userId }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteRecent = async (userId: number) => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");

      await fetch(`${API_BASE}/api/search/recent/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setRecentSearches((prev) =>
        prev.filter((u) => u.id !== userId)
      );
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (visible) {
      setQuery("");
      setResults([]);
      loadRecents(); 
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 20,
      }).start(() => {
        setTimeout(() => inputRef.current?.focus(), 50);
      });
    } else {
      Animated.timing(slideAnim, {
        toValue: 800,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const token = await SecureStore.getItemAsync("accessToken");
        const res = await fetch(
          `${API_BASE}/api/users/search?q=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.ok) setResults(data.users);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const sendFriendRequest = async (requestedId: number) => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/api/friends/request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestedId }),
      });
      const data = await res.json();
      if (data.ok) {
        setResults((prev) =>
          prev.map((u) =>
            u.id === requestedId ? { ...u, friend_status: "pending" } : u
          )
        );
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      {/* Dim overlay */}
      <Pressable style={sheet.overlay} onPress={handleClose} />

      <Animated.View
        style={[
          sheet.panel,
          { paddingTop: insets.top + 12, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Search bar row */}
        <View style={sheet.searchRow}>
          <View style={sheet.searchBox}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              ref={inputRef}
              style={sheet.searchInput}
              placeholder="Search players"
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={handleClose} style={sheet.cancelBtn}>
            <Text style={sheet.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={sheet.divider} />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Empty query → recent searches */}
            {query.length === 0 && (
              <View style={sheet.section}>
                <Text style={sheet.sectionLabel}>Recent</Text>
                {recentSearches.length === 0 ? (
                  <Text style={sheet.hint}>No recent searches</Text>
                ) : (
                  recentSearches.map((user) => (
                    <TouchableOpacity key={user.id} style={sheet.recentRow} onPress={() => {
                          handleClose();
                          router.push({
                            pathname: "/viewprofile",
                            params: { userId: user.id },
                          });
                        }}>
                      {user.avatar_url ? (
                        <Image source={{ uri: user.avatar_url }} style={sheet.recentAvatar} />
                      ) : (
                        <View style={sheet.recentIcon}>
                          <Text style={{ color: "#fff", fontFamily: "Lexend_700Bold" }}>
                            {user.username[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={sheet.recentText}>{user.username}</Text>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation(); 
                          deleteRecent(user.id);
                        }}
                        style={{ padding: 4 }}
                      >
                        <Ionicons name="close" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Loading spinner */}
            {loading && (
              <ActivityIndicator
                style={{ marginTop: 40 }}
                color="#0B36F4"
                size="small"
              />
            )}

            {/* Results */}
            {!loading && query.length > 0 && results.length === 0 && (
              <View style={sheet.emptyWrap}>
                <Ionicons name="person-outline" size={40} color="#CBD5E1" />
                <Text style={sheet.emptyText}>{`No players found for "${query}"`}</Text>
              </View>
            )}

            {!loading &&
              results.map((user, idx) => (
                <TouchableOpacity key={user.id} onPress={() => {
                    saveRecent(user.id);
                    handleClose();
                    router.push({
                      pathname: "/viewprofile",
                      params: { userId: user.id },
                    });
                  }}>
                  <View style={sheet.userRow}>
                    {/* Avatar */}
                    {user.avatar_url ? (
                      <Image
                        source={{ uri: user.avatar_url }}
                        style={sheet.avatar}
                      />
                    ) : (
                      <View style={sheet.avatarPlaceholder}>
                        <Text style={sheet.avatarInitial}>
                          {user.username?.[0]?.toUpperCase()}
                        </Text>
                      </View>
                    )}

                    {/* Name + subtitle */}
                    <View style={sheet.userInfo}>
                      <Text style={sheet.userName}>{user.username}</Text>
                      {user.full_name ? (
                        <Text style={sheet.userSub}>{user.full_name}</Text>
                      ) : null}
                    </View>

                    {/* Action button */}
                    {user.friend_status === "accepted" ? (
                      <TouchableOpacity
                        style={sheet.msgBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleClose();
                          router.push("/tabs/chat");
                        }}
                      >
                        <Text style={sheet.msgBtnText}>Message</Text>
                      </TouchableOpacity>
                    ) : user.friend_status === "pending" ? (
                      <View style={sheet.pendingBtn}>
                        <Text style={sheet.pendingText}>Pending</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={sheet.addBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            sendFriendRequest(user.id);
                          }}
                      >
                        <MaterialIcons name="person-add-alt-1" size={r(18)} color="#fff" />
                        <Text style={sheet.addBtnText}>Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Separator (skip last) */}
                  {idx < results.length - 1 && <View style={sheet.sep} />}
                </TouchableOpacity>
              ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// Main screen component
export default function Community() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("All Posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setUnreadCount(data.count);
    } catch (err) {
      console.error("Unread count error:", err);
    }
  }, []);

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
      setLoadingPosts(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
      fetchUnreadCount();
    }, [fetchPosts, fetchUnreadCount])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleDeletePost = async (postId: number) => {
    if (deletingPostId === postId) return;

    try {
      setDeletingPostId(postId);
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.ok) {
        setPosts((prev) => prev.filter((post) => post.id !== postId));
        return;
      }

      Alert.alert("Delete Post", data.message || "Failed to delete post");
    } catch (err) {
      console.error("Delete post error:", err);
      Alert.alert("Delete Post", "Failed to delete post");
    } finally {
      setDeletingPostId((current) => (current === postId ? null : current));
    }
  };

  const confirmDeletePost = (postId: number) => {
    Alert.alert(
      "Delete Post",
      "This will permanently remove your post and its comments.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeletePost(postId),
        },
      ]
    );
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
    return (
      activeFilter === "All Posts" ||
      p.tag?.toLowerCase().includes(activeFilter.replace("#", "").toLowerCase())
    );
  });

  if (loadingPosts) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} color="#0B36F4" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.screenContent}>
        <View style={styles.topSection}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Social</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setSearchOpen(true)}>
                <Ionicons name="search" size={22} color="#0B36F4" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  setUnreadCount(0);
                  router.push("/notifications" as any);
                }}
              >
                <MaterialIcons name="notifications" size={22} color="#0B36F4" />
                {unreadCount > 0 && (
                  <View style={styles.notifDot}>
                    {unreadCount > 9 ? (
                      <Text style={styles.notifDotText}>9+</Text>
                    ) : (
                      <Text style={styles.notifDotText}>{unreadCount}</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
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
                style={[
                  styles.filterBtn,
                  activeFilter === f && styles.filterBtnActive,
                ]}
                onPress={() => setActiveFilter(f)}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === f && styles.filterTextActive,
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Posts */}
          <View style={styles.postsSection}>
            <View style={styles.posts}>
            {filteredPosts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No posts yet. Be the first!</Text>
              </View>
            ) : (
              filteredPosts.map((post) => (
                <View key={post.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    {post.avatar_url ? (
                      <Image
                        source={{ uri: post.avatar_url }}
                        style={styles.avatar}
                      />
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
                            <Text
                              style={[
                                styles.tag,
                                { color: TAG_COLORS[post.tag] || "#0B36F4" },
                              ]}
                            >
                              {post.tag}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    {post.can_delete ? (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => confirmDeletePost(post.id)}
                        disabled={deletingPostId === post.id}
                      >
                        {deletingPostId === post.id ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <MaterialIcons name="delete-outline" size={22} color="#EF4444" />
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <Text style={styles.content}>{post.content}</Text>

                  {post.image_url && (
                    <Image
                      source={{ uri: post.image_url }}
                      style={styles.postImage}
                      resizeMode="cover"
                    />
                  )}

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

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => router.push(`/post/${post.id}`)}
                    >
                      <Ionicons
                        name="chatbubble-outline"
                        size={20}
                        color="#64748B"
                      />
                      <Text style={styles.actionText}>{post.comments_count}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            </View>
          </View>
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/create-post")}
        >
          <Ionicons name="newspaper-outline" size={18} color="#fff" />
          
          <Text style={styles.fabText}>New Post</Text>
        </TouchableOpacity>

        {/* search sheet */}
        <SearchSheet visible={searchOpen} onClose={() => setSearchOpen(false)} />
        </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  screenContent: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: "#F1F5F9",
  },
  container: { 
    flex: 1, 
    backgroundColor: "#F1F5F9"
   },
  topSection: {
    backgroundColor: "#FFFFFF",
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

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E7EBFE",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  notifDotText: {
    color: "#FFFFFF",
    fontFamily: "Lexend_700Bold",
    fontSize: 9,
    lineHeight: 11,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  filters: {
    paddingHorizontal: "6%",
    paddingVertical: 10,
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
  filterBtnActive: { backgroundColor: "#0B36F4" },
  filterText: {
    fontSize: 13,
    fontFamily: "Lexend_500Medium",
    color: "#64748B",
  },
  filterTextActive: { color: "#fff" },
  postsSection: {
    flexGrow: 1,
    backgroundColor: "#F1F5F9",
  },
  posts: {
    paddingHorizontal: "4%",
    paddingTop: 12,
    gap: 12,
    paddingBottom: 120,
    backgroundColor: "#F1F5F9",
    flexGrow: 1,
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
    borderRadius: 22 
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
    flex: 1 
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
    color: "#94A3B8" 
  },

  tag: { 
    fontSize: 12, 
    fontFamily: "Lexend_500Medium" 
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
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyText: {
    fontSize: 14,
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
  },

  fab: {
    position: "absolute",
    bottom: 60,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0B36F4",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 25,
    elevation: 6,
  },

  fabText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Lexend_500Medium",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});

const sheet = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  panel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingHorizontal: "5%",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 26,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Lexend_400Regular",
    color: "#0F172A",
    padding: 0,
  },
  cancelBtn: { 
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Lexend_500Medium",
    color: "#0B36F4",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginBottom: 4,
  },
  section: { paddingTop: 16 },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Lexend_600SemiBold",
    color: "#94A3B8",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  hint: {
    fontSize: 14,
    fontFamily: "Lexend_400Regular",
    color: "#CBD5E1",
    marginTop: 8,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0B36F4",
    alignItems: "center",
    justifyContent: "center",
  },

  recentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  recentText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Lexend_400Regular",
    color: "#0F172A",
  },
  /* User result row */
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  sep: {
    height: 1,
    backgroundColor: "#F8FAFC",
    marginLeft: 68,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0B36F4",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 20,
    fontFamily: "Lexend_700Bold",
    color: "#fff",
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: 15,
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
  },
  userSub: {
    fontSize: 13,
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0B36F4",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: "Lexend_600SemiBold",
    color: "#fff",
  },
  msgBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  msgBtnText: {
    fontSize: 13,
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
  },
  pendingBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pendingText: {
    fontSize: 13,
    fontFamily: "Lexend_600SemiBold",
    color: "#94A3B8",
  },
  
  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },

  emptyText: {
    fontSize: 14,
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
    textAlign: "center",
  },
});
