export function formatExposureTime(seconds?: number): string | null {
  if (seconds == null || seconds <= 0) return null;
  if (seconds < 1) {
    const fraction = Math.round(1 / seconds);
    return `1/${fraction}s`;
  }
  return seconds >= 10 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`;
}

export function formatAperture(aperture?: number): string | null {
  if (aperture == null || aperture <= 0) return null;
  return `ƒ/${aperture.toFixed(1).replace(/\.0$/, "")}`;
}

export function formatFocalLength(focalLength?: number): string | null {
  if (focalLength == null || focalLength <= 0) return null;
  return `${Math.round(focalLength)} mm`;
}

export function formatIso(iso?: number): string | null {
  if (iso == null || iso <= 0) return null;
  return `ISO ${iso}`;
}

export function formatCamera(make?: string, model?: string): string | null {
  const cleanMake = make?.trim();
  const cleanModel = model?.trim();
  if (!cleanMake && !cleanModel) return null;
  if (!cleanMake) return cleanModel!;
  if (!cleanModel) return cleanMake;

  if (cleanModel.toLowerCase().startsWith(cleanMake.toLowerCase())) {
    return cleanModel;
  }
  return `${cleanMake} ${cleanModel}`;
}

export function formatResolution(width?: number, height?: number): string | null {
  if (!width || !height) return null;
  const mp = (width * height) / 1_000_000;
  return `${width} × ${height} (${mp.toFixed(1)} MP)`;
}

export function formatCoordinates(lat?: number, lng?: number): string | null {
  if (lat == null || lng == null) return null;
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}`;
  const lngStr = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
  return `${latStr}, ${lngStr}`;
}

export function formatAltitude(altitude?: number): string | null {
  if (altitude == null) return null;
  return `${Math.round(altitude)} m`;
}

export function formatDuration(durationMillis?: string | number): string | null {
  if (durationMillis == null) return null;
  const ms = typeof durationMillis === "string" ? parseInt(durationMillis, 10) : durationMillis;
  if (isNaN(ms) || ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function getOpenStreetMapUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
}
