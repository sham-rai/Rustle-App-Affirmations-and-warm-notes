import { Redirect } from 'expo-router';

// "/" opens on Today.
export default function Index() {
  return <Redirect href="/today" />;
}
