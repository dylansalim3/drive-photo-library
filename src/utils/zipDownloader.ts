import { downloadZip } from "client-zip";

export interface ZipDownloadProgress {
  current: number;
  total: number;
  currentFileName: string;
  percent: number;
}

export interface ZipDownloadOptions {
  items: Array<{ id: string; name: string; path?: string }>;
  zipName: string;
  onProgress?: (progress: ZipDownloadProgress) => void;
  signal?: AbortSignal;
}

/**
 * Disambiguates duplicate paths within the zip archive so extractors
 * don't overwrite files with identical names in the same folder.
 */
function disambiguatePaths(
  items: Array<{ id: string; name: string; path?: string }>,
): Array<{ id: string; name: string; path: string }> {
  const seen = new Map<string, number>();
  return items.map((item) => {
    let p = (item.path || item.name).trim();
    // Normalize path separators to forward slash
    p = p.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!p) p = item.name;

    if (seen.has(p)) {
      const count = seen.get(p)! + 1;
      seen.set(p, count);
      const lastDot = p.lastIndexOf(".");
      const lastSlash = p.lastIndexOf("/");
      if (lastDot > lastSlash) {
        p = `${p.slice(0, lastDot)} (${count})${p.slice(lastDot)}`;
      } else {
        p = `${p} (${count})`;
      }
    } else {
      seen.set(p, 0);
    }
    return { id: item.id, name: item.name, path: p };
  });
}

/**
 * Downloads a list of files and bundles them into a ZIP archive,
 * preserving folder hierarchies and streaming files directly to the browser.
 */
export async function downloadAsZip({
  items,
  zipName,
  onProgress,
  signal,
}: ZipDownloadOptions): Promise<void> {
  if (items.length === 0) return;

  const preparedItems = disambiguatePaths(items);
  const total = preparedItems.length;

  async function* getFiles() {
    for (let i = 0; i < preparedItems.length; i++) {
      if (signal?.aborted) {
        throw new Error("Download cancelled");
      }

      const item = preparedItems[i];
      onProgress?.({
        current: i + 1,
        total,
        currentFileName: item.name,
        percent: Math.round(((i + 1) / total) * 100),
      });

      const response = await fetch(
        `/api/media/file?id=${encodeURIComponent(item.id)}&download=1`,
        { signal },
      );

      if (!response.ok) {
        throw new Error(`Failed to download ${item.name} (${response.status})`);
      }

      const blob = await response.blob();
      yield {
        name: item.path,
        input: blob,
      };
    }
  }

  const zipResponse = downloadZip(getFiles());
  const zipBlob = await zipResponse.blob();

  if (signal?.aborted) {
    throw new Error("Download cancelled");
  }

  const filename = zipName.toLowerCase().endsWith(".zip") ? zipName : `${zipName}.zip`;
  const blobUrl = URL.createObjectURL(zipBlob);

  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 15000);
}
