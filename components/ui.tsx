import { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

export const colors = {
  primary: "#0E9F8E",
  primaryDark: "#0A7A6D",
  bg: "#F5F7F8",
  card: "#FFFFFF",
  text: "#14202B",
  muted: "#6B7885",
  border: "#E1E6EA",
  danger: "#D64545",
  warn: "#E49B0F",
};

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={styles.screen}>{children}</View>
  );
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {body}
    </KeyboardAvoidingView>
  );
}

export const H1 = ({ children }: { children: ReactNode }) => <Text style={styles.h1}>{children}</Text>;
export const Muted = ({ children, style }: { children: ReactNode; style?: object }) => (
  <Text style={[styles.muted, style]}>{children}</Text>
);
export const Label = ({ children }: { children: ReactNode }) => <Text style={styles.label}>{children}</Text>;

export function Card({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: ViewStyle }) {
  const content = <View style={[styles.card, style]}>{children}</View>;
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
}) {
  const bg = variant === "primary" ? colors.primary : variant === "danger" ? colors.danger : "transparent";
  const fg = variant === "secondary" ? colors.primary : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: bg, borderColor: variant === "secondary" ? colors.primary : bg },
        (disabled || loading) && { opacity: 0.5 },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Input({ label, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        style={[styles.input, props.multiline && { height: 90, textAlignVertical: "top" }, props.style]}
      />
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      <Text style={{ color: selected ? "#fff" : colors.text, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + "22" }]}>
      <Text style={{ color, fontWeight: "700", fontSize: 12 }}>{text}</Text>
    </View>
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(Math.max(min, value - step))} style={styles.stepBtn}>
        <Text style={styles.stepText}>−</Text>
      </Pressable>
      <Text style={{ minWidth: 56, textAlign: "center", fontWeight: "600", color: colors.text }}>
        {format ? format(value) : value}
      </Text>
      <Pressable onPress={() => onChange(Math.min(max, value + step))} style={styles.stepBtn}>
        <Text style={styles.stepText}>+</Text>
      </Pressable>
    </View>
  );
}

export function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 3 }}>
      <Text style={{ color: colors.muted, fontWeight: bold ? "700" : "400" }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: bold ? "700" : "500" }}>{value}</Text>
    </View>
  );
}

export const Toggle = Switch;

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  h1: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: 4 },
  muted: { color: colors.muted, fontSize: 14 },
  label: { fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    marginTop: 8,
  },
  buttonText: { fontSize: 16, fontWeight: "700" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    color: colors.text,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    marginRight: 8,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, alignSelf: "flex-start" },
  stepper: { flexDirection: "row", alignItems: "center" },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { fontSize: 20, color: colors.text, lineHeight: 22 },
});
