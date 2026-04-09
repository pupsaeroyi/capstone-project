import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { r } from "@/utils/responsive";

type ChatRow = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  isRead?: boolean;
  isTyping?: boolean;
  lastMessageType?: "text" | "photo";
  isGroup?: boolean;
  groupMemberCount?: number;
  senderPrefix?: string;
};

const PRIVATE_CHATS: ChatRow[] = [
  {
    id: "1",
    name: "Marcus Jin",
    lastMessage: "See you at the court at 6...",
    time: "2:45 PM",
    unreadCount: 2,
  },
  {
    id: "2",
    name: "Sarah Chen",
    lastMessage: "Is the session still on for ton...",
    time: "1:12 PM",
    isRead: true,
  },
  {
    id: "3",
    name: "Samyan Spikers",
    lastMessage: "Who has the extra ball?",
    senderPrefix: "Leo",
    time: "Yesterday",
    isGroup: true,
    groupMemberCount: 6,
  },
  {
    id: "4",
    name: "Elena Rodriguez",
    lastMessage: "Elena is typing...",
    time: "Yesterday",
    isTyping: true,
  },
  {
    id: "5",
    name: "Jordan Smith",
    lastMessage: "Great game last weekend!",
    time: "Monday",
  },
  {
    id: "6",
    name: "Kimberly Way",
    lastMessage: "Sent a photo",
    time: "Last Week",
    lastMessageType: "photo",
  },
];

const GROUP_CHATS: ChatRow[] = [
  {
    id: "g1",
    name: "Samyan Spikers",
    lastMessage: "Who has the extra ball?",
    senderPrefix: "Leo",
    time: "Yesterday",
    isGroup: true,
    groupMemberCount: 6,
  },
  {
    id: "g2",
    name: "Beach Court Crew",
    lastMessage: "Game on Sunday at 10am",
    senderPrefix: "Priya",
    time: "Tuesday",
    isGroup: true,
    groupMemberCount: 4,
    unreadCount: 5,
  },
];

const AVATAR_COLORS = [
  "#FBBF24",
  "#F87171",
  "#60A5FA",
  "#34D399",
  "#A78BFA",
  "#FB923C",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({
  name,
  isGroup,
  memberCount,
}: {
  name: string;
  isGroup?: boolean;
  memberCount?: number;
}) {
  const size = r(52);
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: getAvatarColor(name),
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
      </View>
      {isGroup && memberCount ? (
        <View style={styles.groupBadge}>
          <Text style={styles.groupBadgeText}>+{memberCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ChatRowItem({ chat }: { chat: ChatRow }) {
  const hasUnread = !!chat.unreadCount && chat.unreadCount > 0;

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7}>
      <Avatar
        name={chat.name}
        isGroup={chat.isGroup}
        memberCount={chat.groupMemberCount}
      />

      <View style={styles.middleCol}>
        <Text style={styles.name} numberOfLines={1}>
          {chat.name}
        </Text>

        {chat.isTyping ? (
          <Text style={[styles.preview, styles.typingText]} numberOfLines={1}>
            {chat.lastMessage}
          </Text>
        ) : chat.lastMessageType === "photo" ? (
          <View style={styles.photoRow}>
            <MaterialIcons name="image" size={r(14)} color="#64748B" />
            <Text style={styles.preview} numberOfLines={1}>
              {chat.lastMessage}
            </Text>
          </View>
        ) : (
          <Text style={styles.preview} numberOfLines={1}>
            {chat.senderPrefix ? `${chat.senderPrefix}:` : ""}
            {chat.lastMessage}
          </Text>
        )}
      </View>

      <View style={styles.rightCol}>
        <Text style={[styles.time, hasUnread && styles.timeActive]}>
          {chat.time}
        </Text>
        {hasUnread ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{chat.unreadCount}</Text>
          </View>
        ) : chat.isRead ? (
          <MaterialIcons name="done-all" size={r(16)} color="#CBD5E1" />
        ) : (
          <View style={styles.rightPlaceholder} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const [activeTab, setActiveTab] = useState<"private" | "group">("private");
  const data = activeTab === "private" ? PRIVATE_CHATS : GROUP_CHATS;

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
          editable={false}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "private" && styles.tabActive]}
          onPress={() => setActiveTab("private")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "private" && styles.tabTextActive,
            ]}
          >
            Private Chat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "group" && styles.tabActive]}
          onPress={() => setActiveTab("group")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "group" && styles.tabTextActive,
            ]}
          >
            Group Chat
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chat list */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <ChatRowItem chat={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
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

  // List
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
  typingText: {
    color: "#0B36F4",
    fontStyle: "italic",
    fontFamily: "Lexend_400Regular",
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: r(4),
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

  // Avatar
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#FFFFFF",
    fontSize: r(18),
    fontFamily: "Lexend_700Bold",
  },
  groupBadge: {
    position: "absolute",
    bottom: -2,
    right: -4,
    backgroundColor: "#0B36F4",
    borderRadius: r(11),
    paddingHorizontal: r(6),
    paddingVertical: r(2),
    borderWidth: 2,
    borderColor: "#FFFFFF",
    minWidth: r(24),
    alignItems: "center",
  },
  groupBadgeText: {
    color: "#FFFFFF",
    fontSize: r(9),
    fontFamily: "Lexend_700Bold",
  },
});
