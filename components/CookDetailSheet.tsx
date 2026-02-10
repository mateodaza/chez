import { View, Text, Pressable, Modal, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "@/constants/theme";
import type { CompletedMeal } from "@/lib/supabase/queries";

interface CookDetailSheetProps {
  visible: boolean;
  meal: CompletedMeal | null;
  /** Signed URL for the cook photo (resolved from storage path) */
  photoUrl: string | null;
  onClose: () => void;
  onCookAgain: (recipeId: string) => void;
}

export function CookDetailSheet({
  visible,
  meal,
  photoUrl,
  onClose,
  onCookAgain,
}: CookDetailSheetProps) {
  const insets = useSafeAreaInsets();

  if (!meal) return null;

  const hasPhoto = !!photoUrl;
  const hasRating = meal.rating != null && meal.rating > 0;
  const hasTags = meal.tags.length > 0;
  const hasNotes = !!meal.notes;
  const hasAnyFeedback = hasRating || hasTags || hasNotes;

  const d = new Date(meal.completedAt);
  const day = d.getDate();
  const suffix =
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
          ? "rd"
          : "th";
  const dateStr = `${d.toLocaleDateString(undefined, { month: "long" })} ${day}${suffix} ${d.getFullYear()}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[5],
          paddingBottom: spacing[8],
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: spacing[4],
          }}
        >
          <View style={{ width: 32 }} />
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.textSecondary,
            }}
          >
            Cook Details
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Photo */}
        {hasPhoto ? (
          <View
            style={{
              width: "100%",
              aspectRatio: 4 / 3,
              borderRadius: borderRadius.xl,
              overflow: "hidden",
              backgroundColor: colors.surface,
              marginBottom: spacing[5],
            }}
          >
            <Image
              source={{ uri: photoUrl! }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View
            style={{
              width: "100%",
              aspectRatio: 16 / 9,
              borderRadius: borderRadius.xl,
              backgroundColor: colors.surface,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: spacing[5],
            }}
          >
            <Ionicons name="restaurant" size={40} color={colors.primaryLight} />
          </View>
        )}

        {/* Recipe title */}
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: colors.textPrimary,
            marginBottom: spacing[1],
          }}
        >
          {meal.recipeTitle}
        </Text>

        {/* Date */}
        <Text
          style={{
            fontSize: 14,
            color: colors.textMuted,
            marginBottom: spacing[5],
          }}
        >
          {dateStr}
        </Text>

        {/* Rating */}
        {hasRating && (
          <View style={{ marginBottom: spacing[4] }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.textSecondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: spacing[2],
              }}
            >
              Rating
            </Text>
            <View style={{ flexDirection: "row", gap: spacing[1] }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= (meal.rating ?? 0) ? "star" : "star-outline"}
                  size={24}
                  color={star <= (meal.rating ?? 0) ? "#f59e0b" : colors.border}
                />
              ))}
            </View>
          </View>
        )}

        {/* Tags */}
        {hasTags && (
          <View style={{ marginBottom: spacing[4] }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.textSecondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: spacing[2],
              }}
            >
              Feedback
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing[2],
              }}
            >
              {meal.tags.map((tag) => (
                <View
                  key={tag}
                  style={{
                    backgroundColor: colors.surface,
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[1],
                    borderRadius: borderRadius.full,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      fontWeight: "500",
                    }}
                  >
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        {hasNotes && (
          <View style={{ marginBottom: spacing[4] }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.textSecondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: spacing[2],
              }}
            >
              Notes
            </Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                padding: spacing[4],
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  color: colors.textPrimary,
                  lineHeight: 22,
                }}
              >
                {meal.notes}
              </Text>
            </View>
          </View>
        )}

        {/* Empty state for no feedback */}
        {!hasAnyFeedback && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              padding: spacing[5],
              alignItems: "center",
              gap: spacing[2],
              marginBottom: spacing[4],
            }}
          >
            <Ionicons
              name="chatbubble-outline"
              size={24}
              color={colors.textMuted}
            />
            <Text
              style={{
                fontSize: 14,
                color: colors.textMuted,
                textAlign: "center",
              }}
            >
              No rating or notes for this cook
            </Text>
          </View>
        )}

        {/* Cook Again button */}
        <Pressable
          onPress={() => onCookAgain(meal.recipeId)}
          style={{
            backgroundColor: colors.primary,
            paddingVertical: spacing[4],
            borderRadius: borderRadius.lg,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: spacing[2],
            marginTop: spacing[2],
          }}
        >
          <Ionicons name="restaurant-outline" size={20} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
            Cook Again
          </Text>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}
