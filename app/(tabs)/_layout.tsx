import { isLiquidGlassAvailable, GlassView } from "expo-glass-effect";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, useColorScheme, View, Dimensions, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useCallback } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Colors from "@/constants/colors";
import { KawaiiBackground } from "@/components/KawaiiBackground";
import { TabNavContext } from "@/lib/tab-nav-context";
import * as Haptics from "expo-haptics";

import LogScreen from "./index";
import GamesScreen from "./games";
import HistoryScreen from "./history";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2;

const SPRING_CONFIG = {
  damping: 22,
  stiffness: 250,
  mass: 0.8,
  overshootClamping: false,
};

const TAB_SCREENS = [
  { key: "log", title: "Log", icon: "trophy" as const, Component: LogScreen },
  { key: "games", title: "Games", icon: "game-controller" as const, Component: GamesScreen },
  { key: "history", title: "History", icon: "time" as const, Component: HistoryScreen },
];

function SwipeableTabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const colors = isDark ? Colors.dark : Colors.light;

  const [activeIndex, setActiveIndex] = useState(0);
  const translateX = useSharedValue(0);
  const panStartX = useSharedValue(0);

  const goToTab = useCallback(
    (index: number) => {
      "worklet";
      const clamped = Math.max(0, Math.min(index, TAB_SCREENS.length - 1));
      translateX.value = withSpring(-clamped * SCREEN_WIDTH, SPRING_CONFIG);
      runOnJS(setActiveIndex)(clamped);
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    },
    [translateX]
  );

  const goToTabJS = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, TAB_SCREENS.length - 1));
      translateX.value = withSpring(-clamped * SCREEN_WIDTH, SPRING_CONFIG);
      setActiveIndex(clamped);
    },
    [translateX]
  );

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onStart(() => {
      panStartX.value = translateX.value;
    })
    .onUpdate((e) => {
      const proposed = panStartX.value + e.translationX;
      const maxX = 0;
      const minX = -(TAB_SCREENS.length - 1) * SCREEN_WIDTH;
      // Rubber-band at edges
      if (proposed > maxX) {
        translateX.value = proposed * 0.3;
      } else if (proposed < minX) {
        translateX.value = minX + (proposed - minX) * 0.3;
      } else {
        translateX.value = proposed;
      }
    })
    .onEnd((e) => {
      const currentPos = -translateX.value / SCREEN_WIDTH;
      let targetIndex: number;

      if (Math.abs(e.velocityX) > 500) {
        // Fast swipe — go in that direction
        targetIndex = e.velocityX > 0 ? Math.floor(currentPos) : Math.ceil(currentPos);
      } else if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        // Threshold crossed
        targetIndex = e.translationX > 0 ? Math.floor(currentPos) : Math.ceil(currentPos);
      } else {
        // Snap back
        targetIndex = Math.round(currentPos);
      }

      targetIndex = Math.max(0, Math.min(targetIndex, TAB_SCREENS.length - 1));
      goToTab(targetIndex);
    });

  const pagerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const useGlass = isIOS && isLiquidGlassAvailable();

  const tabBarContent = (
    <>
      {TAB_SCREENS.map((tab, i) => {
        const isActive = i === activeIndex;
        return (
          <Pressable
            key={tab.key}
            onPress={() => goToTab(i)}
            style={swipeStyles.tabItem}
          >
            <Ionicons
              name={tab.icon}
              size={24}
              color={isActive ? colors.tint : colors.tabIconDefault}
            />
            <Animated.Text
              style={[
                swipeStyles.tabLabel,
                { color: isActive ? colors.tint : colors.tabIconDefault },
              ]}
            >
              {tab.title}
            </Animated.Text>
          </Pressable>
        );
      })}
    </>
  );

  return (
    <TabNavContext.Provider value={{ goToTab: goToTabJS }}>
    <KawaiiBackground>
      <View style={swipeStyles.container}>
        {/* Swipeable pager */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              swipeStyles.pager,
              { width: SCREEN_WIDTH * TAB_SCREENS.length },
              pagerStyle,
            ]}
          >
            {TAB_SCREENS.map((tab) => (
              <View key={tab.key} style={{ width: SCREEN_WIDTH, flex: 1 }}>
                <tab.Component />
              </View>
            ))}
          </Animated.View>
        </GestureDetector>

        {/* Tab bar */}
        {useGlass ? (
          <GlassView
            glassEffectStyle="regular"
            style={[
              swipeStyles.tabBar,
              { backgroundColor: "transparent" },
            ]}
          >
            {tabBarContent}
          </GlassView>
        ) : (
          <View
            style={[
              swipeStyles.tabBar,
              {
                backgroundColor: isIOS ? "transparent" : colors.card,
                borderTopWidth: isWeb ? 1 : 0,
                borderTopColor: colors.border,
                ...(isWeb ? { height: 84 } : {}),
              },
            ]}
          >
            {isIOS && (
              <BlurView
                intensity={100}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            )}
            {isWeb && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
            )}
            {tabBarContent}
          </View>
        )}
      </View>
    </KawaiiBackground>
    </TabNavContext.Provider>
  );
}

const swipeStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
    flexDirection: "row",
  },
  tabBar: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingBottom: Platform.OS === "ios" ? 28 : 8,
    paddingTop: 8,
    elevation: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 2,
  },
  tabLabel: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 11,
  },
});

export default function TabLayout() {
  return <SwipeableTabLayout />;
}
