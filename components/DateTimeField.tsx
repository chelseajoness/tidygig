import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Platform, Pressable, Text, View } from "react-native";
import { fmtDateTime } from "../lib/format";
import { colors, Label } from "./ui";

export function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
}) {
  if (Platform.OS === "ios") {
    return (
      <View style={{ marginBottom: 12 }}>
        <Label>{label}</Label>
        <View style={{ alignItems: "flex-start" }}>
          <DateTimePicker
            mode="datetime"
            display="compact"
            value={value}
            minimumDate={new Date()}
            onChange={(_e, d) => d && onChange(d)}
          />
        </View>
      </View>
    );
  }

  const openAndroid = () => {
    DateTimePickerAndroid.open({
      value,
      mode: "date",
      minimumDate: new Date(),
      onChange: (_e, date) => {
        if (!date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: "time",
          onChange: (_e2, time) => {
            if (!time) return;
            const next = new Date(date);
            next.setHours(time.getHours(), time.getMinutes(), 0, 0);
            onChange(next);
          },
        });
      },
    });
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <Label>{label}</Label>
      <Pressable
        onPress={openAndroid}
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: "#fff" }}
      >
        <Text style={{ fontSize: 16, color: colors.text }}>{fmtDateTime(value.toISOString())}</Text>
      </Pressable>
    </View>
  );
}
