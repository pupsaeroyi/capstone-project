import { useState, useEffect, useRef, useCallback, useRef as useAnimRef } from "react";
import {View, Text,StyleSheet, FlatList,TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Animated} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { io, Socket } from "socket.io-client";
import { r } from "@/utils/responsive";
import { authFetch, API_BASE } from "@/lib/api";
import { getSavedToken } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

type Message = {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_username: string;
  sender_avatar?: string;
  content: string;
  sent_at: string;
};

type TypingUser = { userId: number; username: string };

const COLORS = ["#FBBF24","#F87171","#60A5FA","#34D399","#A78BFA","#FB923C"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

// Message Bubble
function Bubble({ msg, isMine, showName }: { msg: Message; isMine: boolean; showName: boolean }) {
  const time = new Date(msg.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const size = r(30);

  return (
    <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
      {!isMine && (
        <View style={[styles.avatarCircleSmall, { width: size, height: size, borderRadius: size / 2 }]}>
            {msg.sender_avatar ? (
            <Image
                source={{ uri: msg.sender_avatar }}
                style={styles.avatarImageSmall}
            />
            ) : (
            <View style={styles.avatarPlaceholderSmall}>
                <Text style={styles.avatarInitialSmall}>
                {msg.sender_username[0].toUpperCase()}
                </Text>
            </View>
            )}
        </View>
        )}

      <View style={[styles.bubbleWrap, isMine && styles.bubbleWrapMine]}>
        {showName && !isMine && (
          <Text style={styles.senderName}>{msg.sender_username}</Text>
        )}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{msg.content}</Text>
        </View>
        <Text style={[styles.timeText, isMine && styles.timeTextMine]}>{time}</Text>
      </View>
    </View>
  );
}

const DOT_COLORS = ["#0B36F4", "#60A5FA", "#A78BFA"];

function AnimatedDot({ color, delay }: { color: string; delay: number }) {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(bounceAnim, {
          toValue: -6,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(600 - delay),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        width: r(7),
        height: r(7),
        borderRadius: r(4),
        backgroundColor: color,
        transform: [{ translateY: bounceAnim }],
        marginHorizontal: r(2),
      }}
    />
  );
}

function TypingIndicator({ typingUsers }: { typingUsers: TypingUser[] }) {
  if (typingUsers.length === 0) return null;
  const names = typingUsers.map(u => u.username).join(", ");
  const label = typingUsers.length === 1 ? `${names} is typing...` : `${names} are typing...`;
  
  return (
    <View style={styles.typingRow}>
      <View style={styles.typingDots}>
        {DOT_COLORS.map((color, i) => (
          <AnimatedDot key={i} color={color} delay={i * 150} />
        ))}
      </View>
      <Text style={styles.typingText}>{label}</Text>
    </View>
  );
}
// Main Screen
export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const convId = parseInt(id ?? "0", 10);
  const router = useRouter();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [convInfo, setConvInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [sending, setSending] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  // Load conversation info and messages
  useEffect(() => {
    if (!convId) return;

    const load = async () => {
      try {
        const [convData, msgData] = await Promise.all([
          authFetch(`/conversations/${convId}`),
          authFetch(`/conversations/${convId}/messages?limit=50`),
        ]);
        if (convData.ok) setConvInfo(convData.conversation);
        if (msgData.ok) setMessages(msgData.messages);
      } catch (err) {
        console.error("Load chat error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [convId]);

  // Socket setup
  useEffect(() => {
    if (!convId || !user) return;

    let socket: Socket;

    (async () => {
      const token = await getSavedToken();
      socket = io(API_BASE, {
        auth: { token },
        transports: ["websocket"],
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join_conversation", convId);
      });

      socket.on("new_message", (msg: Message) => {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Scroll to bottom
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        // Mark as read
        socket.emit("mark_read", { conversationId: convId });
      });

      socket.on("user_typing", ({ userId, username }: TypingUser) => {
        if (userId === user.id) return;
        setTypingUsers(prev => {
          if (prev.find(u => u.userId === userId)) return prev;
          return [...prev, { userId, username }];
        });
      });

      socket.on("user_stop_typing", ({ userId }: { userId: number }) => {
        setTypingUsers(prev => prev.filter(u => u.userId !== userId));
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected");
      });
    })();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave_conversation", convId);
        socketRef.current.disconnect();
      }
    };
  }, [convId, user]);

  // Typing events
  const handleTextChange = useCallback((val: string) => {
    setText(val);
    const socket = socketRef.current;
    if (!socket) return;

    if (val.length > 0) {
      socket.emit("typing", { conversationId: convId });
      isTyping.current = true;
    }

    if (typingTimer.current) clearTimeout(typingTimer.current);

    // immediate stop when input is cleared 
    if (val.length === 0) {
        isTyping.current = false;
        socket.emit("stop_typing", { conversationId: convId });
        return;
    }

    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      socket.emit("stop_typing", { conversationId: convId });
    }, 2000);
  }, [convId]);

  // Send message
  const handleSend = useCallback(() => {
    const content = text.trim();
    if (!content || !socketRef.current) return;

    setSending(true);
    socketRef.current.emit("send_message", { conversationId: convId, content });
    setText("");
    isTyping.current = false;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    socketRef.current.emit("stop_typing", { conversationId: convId });
    setSending(false);
  }, [text, convId]);

  // ── Header title ───────────────────────────────────────────────────────────
  const headerTitle = convInfo
    ? convInfo.is_group
      ? (convInfo.group_name || convInfo.session_name || "Group Chat")
      : convInfo.participants?.find((p: any) => p.id !== user?.id)?.username ?? "Chat"
    : "Chat";

  const participantCount = convInfo?.participants?.length ?? 0;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#0B36F4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={r(26)} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
          {convInfo?.is_group && (
            <Text style={styles.headerSub}>{participantCount} members</Text>
          )}
        </View>
        <TouchableOpacity hitSlop={10}>
          <MaterialIcons name="more-vert" size={r(22)} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item, index }) => {
            const isMine = item.sender_id === user?.id;
            const prevMsg = messages[index - 1];
            const showName = convInfo?.is_group && !isMine &&
              (!prevMsg || prevMsg.sender_id !== item.sender_id);
            return <Bubble msg={item} isMine={isMine} showName={showName} />;
          }}
          showsVerticalScrollIndicator={false}
        />

        {/* Typing indicator */}
        <TypingIndicator typingUsers={typingUsers} />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#94A3B8"
            value={text}
            onChangeText={handleTextChange}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            <Ionicons name="send" size={r(18)} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  centered: {
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: r(16),
    paddingVertical: r(12),
    backgroundColor: "#FFFFFF",
    gap: r(12),
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  headerCenter: {
    flex: 1,
  },

  headerTitle: {
    fontSize: r(16),
    fontFamily: "Lexend_700Bold",
    color: "#0F172A",
  },

  headerSub: {
    fontSize: r(12),
    fontFamily: "Lexend_400Regular",
    color: "#64748B",
    marginTop: r(1),
  },

  msgList: {
    paddingHorizontal: r(16),
    paddingTop: r(12),
    paddingBottom: r(8),
    gap: r(4),
  },

  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: r(8),
    marginBottom: r(6),
  },

  bubbleRowMine: {
    flexDirection: "row-reverse",
  },

  miniAvatar: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  miniAvatarText: {
    color: "#FFF",
    fontSize: r(11),
    fontFamily: "Lexend_700Bold",
  },

  bubbleWrap: {
    maxWidth: "75%",
    gap: r(2),
  },

  bubbleWrapMine: {
    alignItems: "flex-end",
  },

  senderName: {
    fontSize: r(11),
    fontFamily: "Lexend_600SemiBold",
    color: "#0B36F4",
    marginLeft: r(2),
  },

  bubble: {
    borderRadius: r(18),
    paddingHorizontal: r(14),
    paddingVertical: r(10),
  },

  bubbleMine: {
    backgroundColor: "#0B36F4",
    borderBottomRightRadius: r(4),
  },

  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: r(4),
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  bubbleText: {
    fontSize: r(15),
    fontFamily: "Lexend_400Regular",
    color: "#0F172A",
    lineHeight: r(22),
  },

  bubbleTextMine: {
    color: "#FFFFFF",
  },

  timeText: {
    fontSize: r(10),
    fontFamily: "Lexend_400Regular",
    color: "#94A3B8",
    marginLeft: r(4),
  },

  timeTextMine: {
    marginLeft: 0,
    marginRight: r(4),
  },

  // Typing indicator
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: r(20),
    paddingBottom: r(4),
    gap: r(6),
  },

  typingDots: {
    flexDirection: "row",
  },

  dot: {
    width: r(6),
    height: r(6),
    borderRadius: r(3),
    backgroundColor: "#0B36F4",
  },

  typingText: {
    fontSize: r(12),
    fontFamily: "Lexend_400Regular",
    color: "#64748B",
    fontStyle: "italic",
  },

  // Input
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: r(10),
    paddingHorizontal: r(16),
    paddingVertical: r(10),
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingBottom: r(30),
  },

  input: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: r(24),
    paddingHorizontal: r(16),
    paddingVertical: r(10),
    fontSize: r(15),
    fontFamily: "Lexend_400Regular",
    color: "#0F172A",
    maxHeight: r(120),
  },

  sendBtn: {
    width: r(42),
    height: r(42),
    borderRadius: r(21),
    backgroundColor: "#0B36F4",
    alignItems: "center",
    justifyContent: "center",
  },

  sendBtnDisabled: {
    opacity: 0.4,
  },
  avatarCircleSmall: {
   overflow: "hidden",
  },

  avatarImageSmall: {
    width: "100%",
    height: "100%",
},

    avatarPlaceholderSmall: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0B36F4",
    alignItems: "center",
    justifyContent: "center",
    },

    avatarInitialSmall: {
    color: "#FFFFFF",
    fontFamily: "Lexend_700Bold",
    fontSize: r(12),
    },
});