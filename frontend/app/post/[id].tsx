import { View, Text, StyleSheet, FlatList,TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { API_BASE } from "@/lib/api";
import {r} from "@/utils/responsive";

const TAG_COLORS: Record<string, string> = {
  Friends: "#0B36F4",
  Drills: "#8B5CF6",
  Highlights: "#10B981",
  Tips: "#EF4444",
  "Looking for Teammates": "#0B36F4",
  "Training Tips": "#F59E0B",
  "Match Highlights": "#10B981",
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

type Comment = {
  id: number;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
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

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  const fetchPost = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        const found = data.posts.find((p: Post) => p.id === Number(id));
        if (found) setPost(found);
      }
    } catch (err) {
      console.error("Fetch post error:", err);
    }
  }, [id]);

  const fetchComments = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/posts/${id}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setComments(data.comments);
    } catch (err) {
      console.error("Fetch comments error:", err);
    } finally {
      setLoadingComments(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [fetchPost, fetchComments]);

  const handleLike = async () => {
    if (!post) return;
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/posts/${post.id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setPost((prev) =>
          prev
            ? {
                ...prev,
                liked: data.liked,
                likes_count: data.liked
                  ? prev.likes_count + 1
                  : prev.likes_count - 1,
              }
            : prev
        );
      }
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || sending) return;
    setSending(true);
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/posts/${id}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        // Optimistically append comment
        const newComment: Comment = {
          id: data.comment.id,
          content: data.comment.content,
          created_at: data.comment.created_at,
          username: "You",
          avatar_url: null,
          can_delete: true,
        };
        setComments((prev) => [...prev, newComment]);
        setPost((prev) =>
          prev ? { ...prev, comments_count: prev.comments_count + 1 } : prev
        );
        setCommentText("");
      }
    } catch (err) {
      console.error("Send comment error:", err);
    } finally {
      setSending(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post || deletingPost) return;

    try {
      setDeletingPost(true);
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/posts/${post.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.ok) {
        router.replace("/tabs/community");
        return;
      }

      Alert.alert("Delete Post", data.message || "Failed to delete post");
    } catch (err) {
      console.error("Delete post error:", err);
      Alert.alert("Delete Post", "Failed to delete post");
    } finally {
      setDeletingPost(false);
    }
  };

  const confirmDeletePost = () => {
    Alert.alert(
      "Delete Post",
      "This will permanently remove your post and its comments.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: handleDeletePost,
        },
      ]
    );
  };

  const handleDeleteComment = async (commentId: number) => {
    if (deletingCommentId === commentId) return;

    try {
      setDeletingCommentId(commentId);
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_BASE}/posts/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.ok) {
        setComments((prev) => prev.filter((comment) => comment.id !== commentId));
        setPost((prev) =>
          prev
            ? {
                ...prev,
                comments_count: Math.max(prev.comments_count - 1, 0),
              }
            : prev
        );
        return;
      }

      Alert.alert("Delete Comment", data.message || "Failed to delete comment");
    } catch (err) {
      console.error("Delete comment error:", err);
      Alert.alert("Delete Comment", "Failed to delete comment");
    } finally {
      setDeletingCommentId((current) => (current === commentId ? null : current));
    }
  };

  const confirmDeleteComment = (commentId: number) => {
    Alert.alert("Delete Comment", "Delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDeleteComment(commentId),
      },
    ]);
  };

  const ListHeader = () => {
    if (!post) return null;
    return (
      <View style={styles.postCard}>
        {/* Author row */}
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
                  <Text
                    style={[
                      styles.tagLabel,
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
              onPress={confirmDeletePost}
              disabled={deletingPost}
            >
              {deletingPost ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <MaterialIcons name="delete-outline" size={r(22)} color="#EF4444" />
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

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Ionicons
              name={post.liked ? "heart" : "heart-outline"}
              size={20}
              color={post.liked ? "#EF4444" : "#64748B"}
            />
            <Text style={styles.actionText}>{post.likes_count}</Text>
          </TouchableOpacity>
          <View style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={20} color="#64748B" />
            <Text style={styles.actionText}>{post.comments_count}</Text>
          </View>
        </View>

        {/* Comments heading */}
        <Text style={styles.commentsHeading}>Comments</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {loadingComments ? (
          <View style={styles.loadingWrap}>
            <ListHeader />
            <ActivityIndicator color="#0B36F4" style={{ marginTop: 32 }} />
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={<ListHeader />}
            ListEmptyComponent={
              <View style={styles.emptyComments}>
                <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                {item.avatar_url ? (
                  <Image
                    source={{ uri: item.avatar_url }}
                    style={styles.commentAvatar}
                  />
                ) : (
                  <View style={styles.commentAvatarPlaceholder}>
                    <Text style={styles.commentAvatarInitial}>
                      {item.username?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.commentBubble}>
                  <View style={styles.commentMeta}>
                    <Text style={styles.commentUsername}>{item.username}</Text>
                    <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
                  </View>
                  <Text style={styles.commentContent}>{item.content}</Text>
                </View>
                {item.can_delete ? (
                  <TouchableOpacity
                    style={styles.commentDeleteBtn}
                    onPress={() => confirmDeleteComment(item.id)}
                    disabled={deletingCommentId === item.id}
                  >
                    {deletingCommentId === item.id ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <MaterialIcons name="delete-outline" size={22} color="#EF4444" />
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Comment input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            placeholderTextColor="#94A3B8"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!commentText.trim() || sending) && styles.sendBtnDisabled,
            ]}
            onPress={handleSendComment}
            disabled={!commentText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 17,
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
  },

  postCard: {
    backgroundColor: "#fff",
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

  userInfo: { flex: 1 },

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

  dot: { fontSize: 12, color: "#94A3B8" },

  tagLabel: {
    fontSize: 12,
    fontFamily: "Lexend_500Medium",
  },

  content: {
    fontSize: 15,
    fontFamily: "Lexend_400Regular",
    color: "#334155",
    lineHeight: 24,
    marginBottom: 12,
  },

  postImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    marginBottom: 16,
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

  commentsHeading: {
    fontSize: 15,
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
    paddingTop: 2,
  },

  listContent: {
    paddingBottom: 12,
  },

  loadingWrap: {
    flex: 1,
  },

  emptyComments: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#fff",
  },

  emptyText: {
    fontSize: 14,
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
  },

  commentRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },

  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  commentAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0B36F4",
    alignItems: "center",
    justifyContent: "center",
  },

  commentAvatarInitial: {
    fontSize: 14,
    fontFamily: "Lexend_700Bold",
    color: "#fff",
  },

  commentBubble: { flex: 1 },
  commentDeleteBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },

  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },

  commentUsername: {
    fontSize: 13,
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
  },

  commentTime: {
    fontSize: 12,
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
  },

  commentContent: {
    fontSize: 14,
    fontFamily: "Lexend_400Regular",
    color: "#334155",
    lineHeight: 21,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 10,
    paddingBottom: r(30),
  },

  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Lexend_400Regular",
    color: "#0F172A",
  },

  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0B36F4",
    alignItems: "center",
    justifyContent: "center",
  },

  sendBtnDisabled: {
    backgroundColor: "#C7D2FE",
  },
});
