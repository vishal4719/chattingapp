type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
const installPromptListeners = new Set<() => void>();

export function serviceWorkerSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

export function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIos && isSafari;
}

export function hasDeferredInstallPrompt(): boolean {
  return deferredInstallPrompt !== null;
}

export function subscribeToInstallPrompt(listener: () => void): () => void {
  installPromptListeners.add(listener);
  return () => installPromptListeners.delete(listener);
}

function notifyInstallPromptListeners(): void {
  installPromptListeners.forEach((listener) => listener());
}

export function captureInstallPrompt(event: Event): void {
  event.preventDefault();
  deferredInstallPrompt = event as BeforeInstallPromptEvent;
  notifyInstallPromptListeners();
}

export function clearInstallPrompt(): void {
  deferredInstallPrompt = null;
  notifyInstallPromptListeners();
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredInstallPrompt) return "unavailable";

  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  notifyInstallPromptListeners();

  await promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  return outcome;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!serviceWorkerSupported()) return null;

  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => registration)
      .catch(() => null);
  }

  return swRegistrationPromise;
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  const registration = await registerServiceWorker();
  if (!registration) return null;
  await navigator.serviceWorker.ready;
  return registration;
}

export function initPwa(): void {
  if (typeof window === "undefined") return;

  registerServiceWorker().catch(() => undefined);

  window.addEventListener("beforeinstallprompt", captureInstallPrompt);
  window.addEventListener("appinstalled", clearInstallPrompt);
}
