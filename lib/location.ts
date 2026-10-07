import * as Location from "expo-location";

export async function getCurrentPlace() {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== "granted") throw new Error("Location permission was denied.");
  const pos = await Location.getCurrentPositionAsync({});
  const { latitude, longitude } = pos.coords;
  let city: string | null = null;
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    city = [place?.city, place?.region].filter(Boolean).join(", ") || null;
  } catch {
    // City label is optional.
  }
  return { lat: latitude, lng: longitude, city };
}
