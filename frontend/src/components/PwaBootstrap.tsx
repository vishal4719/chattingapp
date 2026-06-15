import { useEffect } from "react";
import { initPwa } from "../lib/pwa";

export function PwaBootstrap() {
  useEffect(() => {
    initPwa();
  }, []);

  return null;
}
