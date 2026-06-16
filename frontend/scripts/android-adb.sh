#!/usr/bin/env bash
# Resolve adb from PATH or Android SDK (Android Studio default on macOS).
if command -v adb >/dev/null 2>&1; then
  ADB=adb
elif [ -x "$HOME/Library/Android/sdk/platform-tools/adb" ]; then
  ADB="$HOME/Library/Android/sdk/platform-tools/adb"
elif [ -n "$ANDROID_HOME" ] && [ -x "$ANDROID_HOME/platform-tools/adb" ]; then
  ADB="$ANDROID_HOME/platform-tools/adb"
else
  echo "adb not found. Install Android Studio or add platform-tools to PATH."
  echo "  export PATH=\"\$HOME/Library/Android/sdk/platform-tools:\$PATH\""
  exit 1
fi

exec "$ADB" "$@"
