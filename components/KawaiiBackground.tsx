import React from "react";
import { View, StyleSheet, Image, useColorScheme } from "react-native";
import Colors from "@/constants/colors";

export function KawaiiBackground({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Image
        source={require("../assets/images/grain.png")}
        style={[StyleSheet.absoluteFillObject, { opacity: 0.15 }]}
        resizeMode="repeat"
      />
      {children}
    </View>
  );
}
