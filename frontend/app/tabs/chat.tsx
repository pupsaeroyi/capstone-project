import { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Image } from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { r } from "@/utils/responsive";
import { authFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getSocket } from "@/lib/socket";
import { Socket } from "socket.io-client";

type Conversation = {
  conversation_id: number;
  is_group: boolean;
  // Private chat
  other_user_id?: number;
  other_username?: string;
  other_avatar?: string;
  // Group chat
  group_name?: string;
  session_id?: number;
  session_name?: string;
  // Shared
  last_message?: string;
  last_message_at?: string;
  last_sender_id?: number;
  unread_count: number;
};

type TypingEvent = {
  userId: number;
  username: string;
  conversationId: number;
};

type StopTypingEvent = {
  conversationId: number;
};

 const AVATAR_COLORS = ["#FBBF24","#F87171","#60A5FA","#34D399","#A78BFA","#FB923C"];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-GB", { weekday: "short" });
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Avatar Component ─────────────────────────────────────────────────────────
function Avatar({ name, avatarUrl, isGroup }: { name: string; avatarUrl?: string; isGroup?: boolean }) {
  const size = r(52);

  if (isGroup) {
    return (
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(name), width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={styles.avatarInitials}>#</Text>
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={styles.avatarInitials}>
            {isGroup ? "#" : (name[0] ?? "?").toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Conversation Row ─────────────────────────────────────────────────────────
function ConvRow({
  conv,
  currentUserId,
  typingUser,
  onPress,
}: {
  conv: Conversation;
  currentUserId: number;
  typingUser?: string;
  onPress: () => void;
}) {
  const hasUnread = conv.unread_count > 0;

  const name = conv.is_group
    ? (conv.group_name || conv.session_name || "Group Chat")
    : (conv.other_username || "Unknown");

  const preview = typingUser
    ? `${typingUser} is typing...`
    : conv.last_message || "No messages yet";

  const timeStr = conv.last_message_at ? formatTime(conv.last_message_at) : "";
  
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <Avatar name={name} 
      avatarUrl={conv.is_group ? undefined : conv.other_avatar}
      isGroup={conv.is_group} />

      <View style={styles.middleCol}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text
          style={[styles.preview, hasUnread && styles.previewBold]}
          numberOfLines={1}
        >
          {preview}
        </Text>
      </View>

      <View style={styles.rightCol}>
        <Text style={[styles.time, hasUnread && styles.timeActive]}>
          {timeStr}
        </Text>
        {hasUnread ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {conv.unread_count > 99 ? "99+" : conv.unread_count}
            </Text>
          </View>
        ) : (
          <View style={styles.rightPlaceholder} />
        )}
      </View>
    </TouchableOpacity>
  );
}


export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [typingMap, setTypingMap] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<"private" | "group">("private");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let mounted = true;

    getSocket().then((s) => {
      if (!mounted) return;
      setSocket(s);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
  if (!socket) return;

  const handleTyping = ({ userId, username, conversationId }: TypingEvent) => {
    
    setTypingMap(prev => ({
      ...prev,
      [conversationId]: username
    }));
  };

  const handleStopTyping = ({ conversationId }: StopTypingEvent) => {
    setTypingMap(prev => {
      const copy = { ...prev };
      delete copy[conversationId];
      return copy;
    });
  };

  socket.on("user_typing", handleTyping);
  socket.on("user_stop_typing", handleStopTyping);

  return () => {
    socket.off("user_typing", handleTyping);
    socket.off("user_stop_typing", handleStopTyping);
  };
}, [socket]);

  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await authFetch("/conversations");
      if (data.ok) setConversations(data.conversations);
    } catch (err) {
      console.error("fetchConversations error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchConversations(true);
    }, [fetchConversations])
  );

  useEffect(() => {
    fetchConversations();
  }, []);

  const filtered = conversations.filter((c) => {
    const name = c.is_group
      ? (c.group_name || c.session_name || "")
      : (c.other_username || "");
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeTab === "private") return !c.is_group;
    return c.is_group;
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#0B36F4" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} activeOpacity={0.6}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} activeOpacity={0.6}>
            <Feather name="user-plus" size={r(20)} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons
          name="search"
          size={r(18)}
          color="#94A3B8"
          style={styles.searchIcon}
        />
        <TextInput
          placeholder="Search chats or groups..."
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(["private", "group"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab === "private" ? "Private Chat" : "Group Chat"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chat List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.conversation_id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchConversations(true);
            }}
            tintColor="#0B36F4"
          />
        }
        renderItem={({ item }) => (
          <ConvRow
            conv={item}
            currentUserId={user?.id ?? 0}
            typingUser={typingMap[item.conversation_id]}
            onPress={() =>
              router.push({
                pathname: "/chat/[id]",
                params: { id: String(item.conversation_id) },
              })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons
              name="chat-bubble-outline"
              size={r(48)}
              color="#CBD5E1"
            />
            <Text style={styles.emptyText}>
              {activeTab === "private"
                ? "No private chats yet.\nFind a player to start chatting!"
                : "Join a session to get added\nto its group chat."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: r(50),
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: r(20),
    paddingTop: r(12),
    paddingBottom: r(16),
  },
  headerTitle: {
    fontSize: r(28),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(16),
  },
  headerBtn: {
    padding: r(4),
  },
  editText: {
    fontSize: r(14),
    fontFamily: "Lexend_500Medium",
    color: "#0F172A",
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: r(20),
    marginBottom: r(14),
    backgroundColor: "#F1F5F9",
    borderRadius: r(24),
    paddingHorizontal: r(16),
    height: r(42),
  },
  searchIcon: {
    marginRight: r(8),
  },
  searchInput: {
    flex: 1,
    fontSize: r(14),
    color: "#0F172A",
    fontFamily: "Lexend_400Regular",
    padding: 0,
  },

  // Tabs
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: r(20),
    marginBottom: r(8),
    backgroundColor: "#F1F5F9",
    borderRadius: r(24),
    padding: r(4),
  },
  tab: {
    flex: 1,
    paddingVertical: r(9),
    borderRadius: r(20),
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  tabText: {
    fontSize: r(13),
    fontFamily: "Lexend_500Medium",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#0B36F4",
    fontFamily: "Lexend_600SemiBold",
  },

  listContent: {
    paddingHorizontal: r(20),
    paddingTop: r(8),
    paddingBottom: r(120),
  },
  separator: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: r(14),
    gap: r(12),
  },
  middleCol: {
    flex: 1,
    gap: r(3),
  },
  name: {
    fontSize: r(15),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
  },
  preview: {
    fontSize: r(13),
    color: "#64748B",
    fontFamily: "Lexend_400Regular",
  },
  previewBold: {
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
  },
  rightCol: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    minWidth: r(54),
    height: r(40),
    paddingVertical: r(2),
  },
  time: {
    fontSize: r(11),
    color: "#94A3B8",
    fontFamily: "Lexend_400Regular",
  },
  timeActive: {
    color: "#0B36F4",
    fontFamily: "Lexend_600SemiBold",
  },
  unreadBadge: {
    minWidth: r(20),
    height: r(20),
    borderRadius: r(10),
    backgroundColor: "#0B36F4",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: r(6),
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: r(11),
    fontFamily: "Lexend_700Bold",
  },
  rightPlaceholder: {
    height: r(16),
  },

  avatar: {
    backgroundColor: "#0B36F4",  // always blue, no random colors
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitials: {
    color: "#FFFFFF",
    fontSize: r(18),
    fontFamily: "Lexend_700Bold",
  },

  // Empty state
  emptyState: {
    paddingTop: r(80),
    alignItems: "center",
    gap: r(16),
  },
  emptyText: {
    fontSize: r(14),
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: r(22),
  },
});