import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { API_BASE } from "@/lib/api";

const TAGS = ["Friends", "Drills", "Highlights", "Tips"];

const TAG_COLORS: Record<string, string> = {
  Friends: "#0B36F4",
  Drills: "#8B5CF6",
  Highlights: "#10B981",
  Tips: "#EF4444",
};

export default function CreatePost() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLocalImageUri(result.assets[0].uri);
    }
  };

  const uploadPostImage = async (uri: string, token: string): Promise<string | null> => {
    const formData = new FormData();
    const name = uri.split("/").pop() || "post.jpg";
    const ext = (name.split(".").pop() || "jpg").toLowerCase();
    const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

    formData.append("file", {
      uri,
      name,
      type,
    } as any);

    const res = await fetch(`${API_BASE}/upload/post-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!data.ok) {
      console.error("Post image upload failed:", data.message);
      return null;
    }
    return data.url;
  };

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      if (!token) {
        setSubmitting(false);
        return;
      }

      let image_url: string | null = null;
      if (localImageUri) {
        image_url = await uploadPostImage(localImageUri, token);
      }

      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.trim(),
          tag: selectedTag,
          image_url,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        router.back();
      }
    } catch (err) {
      console.error("Create post error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const canPost = content.trim().length > 0 && !submitting;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>New Post</Text>
        <TouchableOpacity
          style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canPost}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postBtnText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tag selector */}
          <View style={styles.tagRow}>
            {TAGS.map((tag) => {
              const active = selectedTag === tag;
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagPill,
                    active && { backgroundColor: TAG_COLORS[tag] },
                  ]}
                  onPress={() =>
                    setSelectedTag(active ? null : tag)
                  }
                >
                  <Text
                    style={[
                      styles.tagText,
                      active && styles.tagTextActive,
                    ]}
                  >
                    #{tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Text input */}
          <TextInput
            style={styles.input}
            placeholder="What's on your mind?"
            placeholderTextColor="#94A3B8"
            multiline
            value={content}
            onChangeText={setContent}
            autoFocus
            textAlignVertical="top"
          />

          {/* Image preview */}
          {localImageUri && (
            <View style={styles.imagePreviewWrap}>
              <Image
                source={{ uri: localImageUri }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImage}
                onPress={() => setLocalImageUri(null)}
              >
                <Ionicons name="close-circle" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Bottom toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolbarBtn} onPress={pickImage}>
            <Ionicons name="image-outline" size={22} color="#64748B" />
            <Text style={styles.toolbarText}>Photo</Text>
          </TouchableOpacity>
          <Text style={styles.charCount}>{content.length}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
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

  title: {
    fontSize: 17,
    fontFamily: "Lexend_600SemiBold",
    color: "#0F172A",
  },

  postBtn: {
    backgroundColor: "#0B36F4",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },

  postBtnDisabled: {
    backgroundColor: "#C7D2FE",
  },

  postBtnText: {
    fontSize: 14,
    fontFamily: "Lexend_600SemiBold",
    color: "#fff",
  },

  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },

  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },

  tagPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },

  tagText: {
    fontSize: 13,
    fontFamily: "Lexend_500Medium",
    color: "#64748B",
  },

  tagTextActive: {
    color: "#fff",
  },

  input: {
    fontSize: 16,
    fontFamily: "Lexend_400Regular",
    color: "#0F172A",
    lineHeight: 26,
    minHeight: 160,
  },

  imagePreviewWrap: {
    marginTop: 16,
    position: "relative",
  },

  imagePreview: {
    width: "100%",
    height: 220,
    borderRadius: 12,
  },

  removeImage: {
    position: "absolute",
    top: 8,
    right: 8,
  },

  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  toolbarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  toolbarText: {
    fontSize: 14,
    fontFamily: "Lexend_400Regular",
    color: "#64748B",
  },

  charCount: {
    fontSize: 13,
    fontFamily: "Lexend_400Regular",
    color: "#CBD5E1",
  },
});
