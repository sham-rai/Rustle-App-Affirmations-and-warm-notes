import { Redirect } from 'expo-router';

// "/" opens on Today. Hidden from the tab bar in (tabs)/_layout.tsx.
export default function TabsIndex() {
  return <Redirect href="/today" />;
}
