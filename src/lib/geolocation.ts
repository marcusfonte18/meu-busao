/**
 * Geolocation helper: usa @capacitor/geolocation no app nativo e navigator.geolocation na web.
 * No Android/iOS o WebView não trata permissão sozinho; o plugin solicita e retorna a posição.
 */

export type Position = { latitude: number; longitude: number };

const defaultOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 300000,
};

export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return cap?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
}

function isNative(): boolean {
  return isNativePlatform();
}

/** Solicita permissão de localização. No app nativo usa o plugin; na web não faz nada. */
export async function requestLocationPermission(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    await Geolocation.requestPermissions();
  } catch {
    // Ignora se o usuário negar ou serviço desativado
  }
}

/**
 * Retorna a posição atual. No app usa @capacitor/geolocation; na web usa navigator.geolocation.
 */
export function getCurrentPosition(
  options: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number } = {}
): Promise<Position> {
  const opts = { ...defaultOptions, ...options };

  if (isNative()) {
    return (async () => {
      const { Geolocation } = await import("@capacitor/geolocation");
      await requestLocationPermission();
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: opts.enableHighAccuracy ?? true,
        timeout: opts.timeout ?? 15000,
        maximumAge: opts.maximumAge ?? 300000,
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    })();
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      reject,
      opts
    );
  });
}
