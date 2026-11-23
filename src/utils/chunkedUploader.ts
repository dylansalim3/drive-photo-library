import { initResumableUpload } from "@/api";

export const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024; // 8 MiB (multiple of 256 KiB)

export type UploadState = "idle" | "initializing" | "uploading" | "paused" | "completed" | "failed" | "cancelled";

export interface ChunkedUploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percent: number;
  speedBytesPerSec: number;
}

export interface ChunkedUploaderOptions {
  file: File;
  folderId?: string;
  folderPath?: string;
  chunkSize?: number;
  onProgress?: (progress: ChunkedUploadProgress) => void;
  onStateChange?: (state: UploadState, error?: Error) => void;
}

export class ChunkedUploader {
  private file: File;
  private folderId?: string;
  private folderPath?: string;
  private chunkSize: number;
  private onProgress?: (progress: ChunkedUploadProgress) => void;
  private onStateChange?: (state: UploadState, error?: Error) => void;

  private uploadUrl: string | null = null;
  private state: UploadState = "idle";
  private uploadedBytes = 0;
  private abortController: AbortController | null = null;
  private isPaused = false;
  private isCancelled = false;
  private lastTime = 0;
  private lastBytes = 0;

  constructor(options: ChunkedUploaderOptions) {
    this.file = options.file;
    this.folderId = options.folderId;
    this.folderPath = options.folderPath;
    this.chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
    this.onProgress = options.onProgress;
    this.onStateChange = options.onStateChange;
  }

  public getState(): UploadState {
    return this.state;
  }

  public getUploadedBytes(): number {
    return this.uploadedBytes;
  }

  private setState(newState: UploadState, err?: Error) {
    this.state = newState;
    this.onStateChange?.(newState, err);
  }

  public async start(): Promise<unknown> {
    if (this.state === "uploading") return;

    this.isPaused = false;
    this.isCancelled = false;
    this.setState("initializing");

    try {
      if (!this.uploadUrl) {
        const init = await initResumableUpload({
          fileName: this.file.name,
          mimeType: this.file.type || "application/octet-stream",
          size: this.file.size,
          folderId: this.folderId,
          folderPath: this.folderPath,
        });
        this.uploadUrl = init.uploadUrl;
      }

      this.setState("uploading");
      this.lastTime = Date.now();
      this.lastBytes = this.uploadedBytes;

      return await this.uploadChunks();
    } catch (err) {
      if (!this.isCancelled && !this.isPaused) {
        this.setState("failed", err instanceof Error ? err : new Error(String(err)));
      }
      throw err;
    }
  }

  public pause() {
    if (this.state !== "uploading") return;
    this.isPaused = true;
    this.abortController?.abort();
    this.abortController = null;
    this.setState("paused");
  }

  public async resume(): Promise<unknown> {
    if (this.state !== "paused") return;
    this.isPaused = false;
    this.isCancelled = false;
    this.setState("uploading");

    try {
      // Query Google Drive for the byte offset to resume from
      await this.syncUploadOffset();
      return await this.uploadChunks();
    } catch (err) {
      if (!this.isPaused && !this.isCancelled) {
        this.setState("failed", err instanceof Error ? err : new Error(String(err)));
      }
      throw err;
    }
  }

  public cancel() {
    this.isPaused = false;
    this.isCancelled = true;
    this.setState("cancelled");
    this.abortController?.abort();
    this.abortController = null;
  }

  private async syncUploadOffset(): Promise<number> {
    if (!this.uploadUrl) return 0;
    try {
      const res = await fetch(this.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Range": `bytes */${this.file.size}`,
        },
      });

      if (res.status === 308) {
        const range = res.headers.get("Range");
        if (range) {
          const match = range.match(/bytes=0-(\d+)/);
          if (match) {
            this.uploadedBytes = parseInt(match[1], 10) + 1;
            return this.uploadedBytes;
          }
        }
      } else if (res.status === 200 || res.status === 201) {
        this.uploadedBytes = this.file.size;
        return this.uploadedBytes;
      }
    } catch {
      // ignore
    }
    return this.uploadedBytes;
  }

  private async uploadChunks(): Promise<unknown> {
    if (!this.uploadUrl) throw new Error("No resumable upload URL initialized.");

    const total = this.file.size;

    while (this.uploadedBytes < total) {
      if (this.isPaused || this.isCancelled) {
        return;
      }

      const start = this.uploadedBytes;
      const end = Math.min(start + this.chunkSize, total);
      const chunk = this.file.slice(start, end);

      this.abortController = new AbortController();

      let attempts = 0;
      let success = false;
      let lastErr: unknown = null;

      while (attempts < 3 && !success && !this.isPaused && !this.isCancelled) {
        attempts++;
        try {
          const res = await fetch(this.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Length": String(chunk.size),
              "Content-Range": `bytes ${start}-${end - 1}/${total}`,
            },
            body: chunk,
            signal: this.abortController.signal,
          });

          if (res.status === 308) {
            // Chunk accepted, resume incomplete
            const range = res.headers.get("Range");
            if (range) {
              const match = range.match(/bytes=0-(\d+)/);
              if (match) {
                this.uploadedBytes = parseInt(match[1], 10) + 1;
              } else {
                this.uploadedBytes = end;
              }
            } else {
              this.uploadedBytes = end;
            }
            success = true;
          } else if (res.status === 200 || res.status === 201) {
            // Entire file upload complete!
            this.uploadedBytes = total;
            success = true;
            this.setState("completed");
            this.reportProgress(total, total);
            return await res.json();
          } else {
            const text = await res.text();
            throw new Error(`Upload chunk error (${res.status}): ${text}`);
          }
        } catch (err) {
          if (this.isPaused || this.isCancelled) {
            return;
          }
          lastErr = err;
          // Exponential backoff
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempts)));
          // Check remote status
          await this.syncUploadOffset();
        }
      }

      if (!success) {
        throw lastErr instanceof Error ? lastErr : new Error("Failed to upload chunk after retries.");
      }

      this.reportProgress(this.uploadedBytes, total);
    }

    this.setState("completed");
  }

  private reportProgress(current: number, total: number) {
    const now = Date.now();
    const elapsedSec = (now - this.lastTime) / 1000;
    let speed = 0;
    if (elapsedSec > 0.5) {
      speed = (current - this.lastBytes) / elapsedSec;
      this.lastTime = now;
      this.lastBytes = current;
    }
    const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 100;
    this.onProgress?.({
      uploadedBytes: current,
      totalBytes: total,
      percent,
      speedBytesPerSec: speed,
    });
  }
}
