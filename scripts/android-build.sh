#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# An existing Android Studio/SDK setup takes precedence over this workspace's tools.
if [[ -z "${JAVA_HOME:-}" ]]; then
  for jdk in "$HOME"/.local/share/fieldbook-android/jdk-*/; do
    [[ -x "$jdk/bin/java" ]] && export JAVA_HOME="${jdk%/}" && break
  done
fi
export ANDROID_HOME="${ANDROID_HOME:-$HOME/.local/share/fieldbook-android/sdk}"
export PATH="${JAVA_HOME:+$JAVA_HOME/bin:}$ANDROID_HOME/platform-tools:$PATH"
npm run build:android
npx cap sync android
cd android
./gradlew assembleDebug -PfieldbookVersionCode="$(date +%s)"
