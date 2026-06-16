#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
ADB="$DIR/android-adb.sh"

echo "=== PandaMind Android debug logs ==="
echo "Connect phone via USB, enable USB debugging, then use the app."
echo "Press Ctrl+C to stop."
echo ""

DEVICES=$("$ADB" devices | grep -v "List of devices" | grep "device$" | wc -l | tr -d ' ')
if [ "$DEVICES" = "0" ]; then
  echo "No device detected. Check:"
  echo "  1. USB cable (data, not charge-only)"
  echo "  2. Phone: Settings → Developer options → USB debugging ON"
  echo "  3. Accept 'Allow USB debugging' prompt on phone"
  "$ADB" devices
  exit 1
fi

"$ADB" devices
echo ""
echo "--- logcat (Capacitor / WebView / Chromium / errors) ---"
echo ""

"$ADB" logcat -c 2>/dev/null || true
"$ADB" logcat -v time \
  Capacitor:V \
  Capacitor/Console:V \
  chromium:V \
  cr_*:V \
  WebView:V \
  Console:V \
  SystemWebChromeClient:V \
  AndroidRuntime:E \
  *:S
