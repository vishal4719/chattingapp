import { useEffect } from "react";
import { initFcm, isNativeApp } from "../lib/fcm";

export function FcmBootstrap() {
  useEffect(() => {
    if (!isNativeApp()) return;
    initFcm().catch(() => undefined);
  }, []);

  return null;
}
