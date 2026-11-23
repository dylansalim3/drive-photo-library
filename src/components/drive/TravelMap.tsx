import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  RiCompass3Line,
  RiFocus3Line,
  RiImageLine,
  RiMapPinLine,
  RiVideoLine,
} from "@remixicon/react";
import type { DriveFile } from "@/api";
import { formatCoordinates, formatCamera, formatResolution } from "@/utils/exifFormatter";

export interface TravelMapProps {
  files: DriveFile[];
  onSelectFile: (file: DriveFile) => void;
}

export interface GeoCluster {
  id: string;
  latitude: number;
  longitude: number;
  files: DriveFile[];
}

/** Group photos within ~0.02 degrees (~2km) into regional clusters */
function clusterGeoFiles(files: DriveFile[]): GeoCluster[] {
  const CLUSTER_THRESHOLD = 0.02; // Roughly ~2km
  const clusters: GeoCluster[] = [];

  for (const file of files) {
    const lat = file.imageMediaMetadata?.location?.latitude;
    const lng = file.imageMediaMetadata?.location?.longitude;
    if (lat == null || lng == null) continue;

    let matched = false;
    for (const cluster of clusters) {
      const dLat = Math.abs(cluster.latitude - lat);
      const dLng = Math.abs(cluster.longitude - lng);
      if (dLat < CLUSTER_THRESHOLD && dLng < CLUSTER_THRESHOLD) {
        cluster.files.push(file);
        // Re-weight center
        cluster.latitude = (cluster.latitude * (cluster.files.length - 1) + lat) / cluster.files.length;
        cluster.longitude = (cluster.longitude * (cluster.files.length - 1) + lng) / cluster.files.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      clusters.push({
        id: `cluster-${file.id}`,
        latitude: lat,
        longitude: lng,
        files: [file],
      });
    }
  }

  return clusters;
}

export function TravelMap({ files, onSelectFile }: TravelMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const geoFiles = useMemo(() => {
    return files.filter(
      (f) =>
        f.imageMediaMetadata?.location?.latitude != null &&
        f.imageMediaMetadata?.location?.longitude != null,
    );
  }, [files]);

  const clusters = useMemo(() => clusterGeoFiles(geoFiles), [geoFiles]);
  const [selectedCluster, setSelectedCluster] = useState<GeoCluster | null>(null);

  // Auto-select first cluster if available
  useEffect(() => {
    if (clusters.length > 0 && !selectedCluster) {
      setSelectedCluster(clusters[0]);
    } else if (clusters.length === 0) {
      setSelectedCluster(null);
    }
  }, [clusters, selectedCluster]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing map if re-initializing
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Default center: Tokyo or world center if no coordinates
    const defaultCenter: [number, number] =
      clusters.length > 0 ? [clusters[0].latitude, clusters[0].longitude] : [20, 0];
    const defaultZoom = clusters.length > 0 ? 12 : 2;

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // Run once on mount

  // Sync markers when clusters change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old markers
    for (const m of markersRef.current) {
      m.remove();
    }
    markersRef.current = [];

    if (clusters.length === 0) return;

    const bounds = L.latLngBounds([]);

    clusters.forEach((cluster) => {
      const latLng: [number, number] = [cluster.latitude, cluster.longitude];
      bounds.extend(latLng);

      const firstFile = cluster.files[0];
      const count = cluster.files.length;
      const countBadge =
        count > 1
          ? `<span class="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white shadow-md border-2 border-white ring-1 ring-black/10">${count}</span>`
          : "";

      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        html: `
          <div class="relative flex size-11 items-center justify-center rounded-2xl bg-white p-1 shadow-xl ring-2 ring-accent-500/80 transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer">
            <img src="/api/media/thumbnail?id=${encodeURIComponent(firstFile.id)}" alt="${firstFile.name}" class="size-full rounded-xl object-cover" />
            ${countBadge}
          </div>
        `,
      });

      const marker = L.marker(latLng, { icon: customIcon }).addTo(map);
      marker.on("click", () => {
        setSelectedCluster(cluster);
        map.setView(latLng, Math.max(map.getZoom(), 14), { animate: true });
      });

      markersRef.current.push(marker);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [clusters]);

  const handleCenterOnSelected = () => {
    if (!mapInstanceRef.current || !selectedCluster) return;
    mapInstanceRef.current.setView(
      [selectedCluster.latitude, selectedCluster.longitude],
      Math.max(mapInstanceRef.current.getZoom(), 14),
      { animate: true },
    );
  };

  return (
    <div className="relative flex flex-col h-[75vh] min-h-[500px] w-full rounded-3xl border border-border-button-default overflow-hidden bg-background-secondary-default shadow-md">
      {/* Map Header Status Banner */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-border-button-default bg-background-primary-default/90 px-3.5 py-1.5 backdrop-blur-md shadow-lg text-caption-1-medium text-text-primary">
          <RiCompass3Line className="size-4 text-accent-500" />
          <span>
            {geoFiles.length} of {files.length} items with GPS metadata
          </span>
          <span className="text-text-tertiary">·</span>
          <span className="text-text-secondary">{clusters.length} locations</span>
        </div>

        {selectedCluster && (
          <button
            type="button"
            onClick={handleCenterOnSelected}
            className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-border-button-default bg-background-primary-default/90 px-3 py-1.5 backdrop-blur-md shadow-lg text-caption-1-medium text-text-primary hover:bg-background-secondary-default transition-colors outline-none"
          >
            <RiFocus3Line className="size-4 text-accent-500" />
            <span className="hidden sm:inline">Center Selection</span>
          </button>
        )}
      </div>

      {/* Main Map Canvas */}
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Empty State Banner if no coordinates */}
      {geoFiles.length === 0 && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-background-primary-default/80 backdrop-blur-sm text-center">
          <div className="flex size-14 items-center justify-center rounded-3xl bg-accent-500/10 text-accent-500 mb-3 border border-accent-500/20">
            <RiMapPinLine className="size-7" />
          </div>
          <p className="text-title-2-semibold text-text-primary">No GPS coordinates recorded</p>
          <p className="mt-1 max-w-md text-body-2-regular text-text-secondary">
            None of the photos in this folder contain embedded GPS coordinates. Photos captured on phones or cameras with location services enabled will appear pinned here automatically.
          </p>
        </div>
      )}

      {/* Bottom Floating Cluster Inspector Drawer */}
      {selectedCluster && selectedCluster.files.length > 0 && (
        <div className="absolute bottom-3 left-3 right-3 z-10 rounded-2xl border border-border-button-default bg-background-primary-default/95 p-3 backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-secondary">
            <div className="flex items-center gap-2 min-w-0">
              <RiMapPinLine className="size-4 text-accent-500 shrink-0" />
              <p className="truncate text-caption-1-bold text-text-primary">
                {formatCoordinates(selectedCluster.latitude, selectedCluster.longitude)}
              </p>
              <span className="shrink-0 rounded-full bg-accent-500/10 px-2 py-0.5 text-caption-2-medium text-accent-500 border border-accent-500/20">
                {selectedCluster.files.length} {selectedCluster.files.length === 1 ? "photo" : "photos"}
              </span>
            </div>
          </div>

          {/* Horizontal Thumbnail Strip */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
            {selectedCluster.files.map((file) => {
              const camera = formatCamera(
                file.imageMediaMetadata?.cameraMake,
                file.imageMediaMetadata?.cameraModel,
              );
              const resolution = formatResolution(
                file.imageMediaMetadata?.width,
                file.imageMediaMetadata?.height,
              );

              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => onSelectFile(file)}
                  className="group relative flex shrink-0 flex-col items-center gap-1.5 rounded-xl border border-border-secondary bg-background-secondary-default/50 p-1.5 hover:border-accent-500 transition-all outline-none"
                >
                  <div className="relative size-16 sm:size-20 overflow-hidden rounded-lg bg-black/10">
                    <img
                      src={`/api/media/thumbnail?id=${encodeURIComponent(file.id)}`}
                      alt={file.name}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute top-1 left-1 rounded-sm bg-black/60 p-0.5 text-white backdrop-blur-xs">
                      {file.isVideo ? <RiVideoLine className="size-3" /> : <RiImageLine className="size-3" />}
                    </div>
                  </div>
                  <div className="w-16 sm:w-20 text-left">
                    <p className="truncate text-[11px] font-medium text-text-primary">{file.name}</p>
                    <p className="truncate text-[10px] text-text-tertiary">
                      {camera || resolution || "Preview"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
