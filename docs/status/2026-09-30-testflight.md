# TestFlight, first time (one-off setup, PO)

Profiles live in `eas.json`: `development` (dev client, installs from a link), `preview` (a store build that goes to TestFlight), `production`. Secrets for a build come from EAS environment variables, never from the repo.

1. `npm i -g eas-cli` is done. From the repo root: `eas login`.
2. `cd app && eas init` (creates the EAS project and writes `extra.eas.projectId` into `app.json`; commit that change).
3. `eas update:configure` (adds the Update URL to `app.json`; commit).
4. In expo.dev → project → Environment variables, add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for the `preview` environment once the dev Supabase project exists. Without them the app runs in the "not connected" state, which is fine for a first look.
5. `eas build --platform ios --profile preview`. First run: sign in with the Apple Developer account, let EAS register the bundle ID `app.rustle`, the App Group `group.app.rustle` and the certificates.
6. `eas submit --platform ios --profile preview --latest`. First run: EAS creates the App Store Connect record. Wait for Apple's processing email (usually 10–30 minutes), then add yourself as an internal tester in App Store Connect → TestFlight.
7. Install the TestFlight app on the phone, accept the invite, install Rustle.

Android equivalent later: `eas build --platform android --profile preview` and internal testing in Play Console.
