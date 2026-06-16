#!/usr/bin/env bash
# Gradle/Capacitor Android requires JDK 21 (JDK 25 fails with "class file major version 69").
resolve_java_home() {
  if [ -n "${JAVA_HOME:-}" ]; then
    local ver
    ver="$("$JAVA_HOME/bin/java" -version 2>&1 | head -1)"
    if echo "$ver" | grep -qE 'version "21'; then
      echo "$JAVA_HOME"
      return 0
    fi
  fi
  if /usr/libexec/java_home -v 21 >/dev/null 2>&1; then
    /usr/libexec/java_home -v 21
    return 0
  fi
  echo "JDK 21 not found. Install Temurin 21 or set JAVA_HOME to a JDK 21 path." >&2
  return 1
}

export JAVA_HOME
JAVA_HOME="$(resolve_java_home)" || exit 1
export PATH="$JAVA_HOME/bin:$PATH"

exec "$@"
