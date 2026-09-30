# Seeing the app on a phone (one-off setup, PO)

Profiles live in `app/eas.json`: `development` (dev client, installs from a link, loads JavaScript from your Mac), `preview` (a store build that goes to TestFlight), `production`. Every `eas` command runs from `app/`, next to `app.json`. Secrets for a build come from EAS environment variables, never from the repo.

## Setup, once

1. `npm i -g eas-cli` is done. `cd app`, then `eas login`.
2. `eas init` (creates the EAS project and writes `extra.eas.projectId` into `app.json`; commit that change).
3. `eas update:configure` (adds the Update URL to `app.json`; commit).
4. Apple Developer Program membership (paid) is needed for both routes below; EAS asks you to sign in with that Apple ID on the first build and registers the bundle ID `app.rustle`, the App Group `group.app.rustle` and the certificates.
5. Optional for a first look: `app/.env.local` with the dev Supabase project's URL and anon key. Without it the app runs in the "not connected" state.

## Route A: development build (day to day)

A development build is Rustle's own shell with the native pieces compiled in. The screens come from your Mac while it runs, so a code change shows in seconds and the build is redone only when native code or a native dependency changes.

1. `eas device:create` (from `app/`): register the iPhone once by opening the link on the phone and installing the profile.
2. `eas build --platform ios --profile development`. Takes about 15 to 25 minutes on EAS. When it finishes, open the build link or QR on the phone and install.
3. On the Mac, from the repo root: `npm run dev`. Phone and Mac on the same Wi-Fi; if the phone cannot connect, `npm run dev -- --tunnel`.
4. Open the Rustle app on the phone; it shows the dev-client screen. Scan the QR from the terminal with the phone camera, or pick the server from the list in the app.

## Route B: TestFlight (for testers and for the real notification and widget behaviour)

1. In expo.dev → project → Environment variables, add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for the `preview` environment once the dev Supabase project exists.
2. `eas build --platform ios --profile preview`.
3. `eas submit --platform ios --profile preview --latest`. First run: EAS creates the App Store Connect record. Wait for Apple's processing email (usually 10–30 minutes), then add yourself as an internal tester in App Store Connect → TestFlight.
4. Install the TestFlight app on the phone, accept the invite, install Rustle.

Android equivalent later: `eas build --platform android --profile development` (or `preview` and internal testing in Play Console).
