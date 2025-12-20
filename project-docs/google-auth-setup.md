# Google Sign-In Setup Guide for BrainSprint (Supabase + Expo)

Follow these steps to enable Google Sign-In.

## Phase 1: Google Cloud Console

1.  **Create a Project**: Go to [Google Cloud Console](https://console.cloud.google.com/) and create a new project (e.g., "BrainSprint App").
2.  **OAuth Consent Screen**:
    *   Go to **APIs & Services > OAuth consent screen**.
    *   Select **External** (unless you are an org).
    *   Fill in app name, support email, and developer email.
    *   Save and Continue (Scopes can be left default for now).
3.  **Create Credentials (WEB)** - *Required for Supabase*:
    *   Go to **Credentials > Create Credentials > OAuth client ID**.
    *   Select **Web application**.
    *   Name it "Supabase Auth".
    *   **Authorized Redirect URIs**: You will get this URL from Supabase (see Phase 2). For now, you can leave it or add `https://<YOUR_SUPABASE_ID>.supabase.co/auth/v1/callback`.
    *   **Click Create**.
    *   **Copy** the `Client ID` and `Client Secret`. **You need these for Supabase.**

4.  **Create Credentials (ANDROID)** - *Required for the App*:
    *   Go to **Credentials > Create Credentials > OAuth client ID**.
    *   Select **Android**.
    *   **Package name**: `com.brainsprint.app` (or whatever is in your `app.json` for `android.package`).
    *   **SHA-1 Certificate fingerprint**: You need to generate this from your local keystore (for development) or Play Store (for production).
        *   *Command to get debug SHA-1*: `cd android && ./gradlew signingReport` (You must run `npx expo run:android` at least once or create the android folder via `npx expo prebuild` to run this).
    *   Click Create.

## Phase 2: Supabase Dashboard

1.  Go to your Supabase Project > **Authentication > Providers**.
2.  Select **Google**.
3.  **Enable** Google Sign-in.
4.  **Client ID**: Paste the **Web Client ID** from Phase 1 (Step 3).
5.  **Client Secret**: Paste the **Web Client Secret** from Phase 1 (Step 3).
6.  **Callback URL**: Copy the URL shown here (e.g., `https://xyz.supabase.co/auth/v1/callback`).
    *   *Back to Google Cloud Console*: Go to your "Supabase Auth" Web Client ID and add this URL to "Authorized redirect URIs".
7.  **Skip nonce checks**: Turn this **ON** (Required for iOS/Android Google Login flows often).
8.  Click **Save**.

## Phase 3: Project Configuration

1.  **Update .env**:
    Add the **Web Client ID** (from Phase 1, Step 3) to your `.env` file:
    ```env
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id-here
    ```

2.  **Verify app.json**:
    Ensure your Android package name matches what you put in Google Cloud.
    ```json
    "android": {
      "package": "com.brainsprint.app"
    }
    ```

3.  **Build Custom Dev Client** (Required for Native Login):
    Since `react-native-google-signin` includes native code, you cannot use Expo Go.
    *   Run `npx expo prebuild` to generate native folders.
    *   Run `npx expo run:android` to build and install the debug app on your device/emulator.

**Note:** The app will use the **Web Client ID** to request a token from Google, which Supabase validates. The Android Client ID in Google Cloud simply validates that *your specific Android app* is allowed to make that request.
