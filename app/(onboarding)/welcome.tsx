import { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  Image,
  type ViewToken,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
  type SharedValue,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Text, Button } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface FeatureSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
}

const featureSlides: FeatureSlide[] = [
  {
    id: "recipes",
    icon: "restaurant",
    title: "All Your Recipes",
    description:
      "Drop a TikTok link. Paste a YouTube video. Or write your own. Everything lives here.",
    color: colors.primary,
  },
  {
    id: "cooking",
    icon: "hand-left",
    title: "Cook Hands-Free",
    description:
      "We track where you are and remember your changes. Walk away, come back, keep going.",
    color: "#10B981", // Green
  },
  {
    id: "grocery",
    icon: "cart",
    title: "Smart Shopping",
    description:
      "Tap a recipe, get a list. Items sorted by aisle. Check them off as you shop.",
    color: "#6366F1", // Indigo
  },
  {
    id: "chef",
    icon: "ribbon",
    title: "Make It Yours",
    description:
      "Tweak any recipe. Save your version. The original stays untouched.",
    color: "#F59E0B", // Amber
  },
];

function SlideItem({
  item,
  index,
  scrollX,
}: {
  item: FeatureSlide;
  index: number;
  scrollX: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1, 0.8],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <View style={styles.slideContainer}>
      <Animated.View style={[styles.slideContent, animatedStyle]}>
        <View
          style={[styles.iconCircle, { backgroundColor: `${item.color}15` }]}
        >
          <Ionicons name={item.icon} size={48} color={item.color} />
        </View>
        <Text variant="h2" style={styles.slideTitle}>
          {item.title}
        </Text>
        <Text
          variant="body"
          color="textSecondary"
          style={styles.slideDescription}
        >
          {item.description}
        </Text>
      </Animated.View>
    </View>
  );
}

function PaginationDot({
  index,
  scrollX,
}: {
  index: number;
  scrollX: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const width = interpolate(
      scrollX.value,
      inputRange,
      [8, 24, 8],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.4, 1, 0.4],
      Extrapolation.CLAMP
    );

    return {
      width,
      opacity,
    };
  });

  return <Animated.View style={[styles.paginationDot, animatedStyle]} />;
}

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);

  const isLastSlide = currentIndex === featureSlides.length - 1;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleNext = () => {
    if (isLastSlide) {
      router.replace("/(onboarding)/mode-select");
    } else {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  const handleSkip = () => {
    router.replace("/(onboarding)/mode-select");
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing[4], paddingBottom: insets.bottom },
      ]}
    >
      {/* Header with logo and skip */}
      <View style={styles.header}>
        <Image
          source={require("@/assets/chez-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Button variant="ghost" size="sm" onPress={handleSkip}>
          Skip
        </Button>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={featureSlides}
        renderItem={({ item, index }) => (
          <SlideItem item={item} index={index} scrollX={scrollX} />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(event) => {
          scrollX.value = event.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      {/* Pagination and CTA */}
      <View style={styles.footer}>
        <View style={styles.pagination}>
          {featureSlides.map((_, index) => (
            <PaginationDot key={index} index={index} scrollX={scrollX} />
          ))}
        </View>

        <Button onPress={handleNext} fullWidth>
          {isLastSlide ? "Get Started" : "Next"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[4],
  },
  logo: {
    width: 100,
    height: 34,
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[8],
  },
  slideContent: {
    alignItems: "center",
    maxWidth: 320,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[8],
  },
  slideTitle: {
    textAlign: "center",
    marginBottom: spacing[4],
  },
  slideDescription: {
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[6],
    gap: spacing[6],
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing[2],
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
