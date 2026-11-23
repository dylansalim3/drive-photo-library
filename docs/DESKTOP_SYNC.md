# Desktop Ingestion & Automation Guide 🖥️

Drive Photo Library (DPL) embraces the **"Preview-First, Vacation Staging"** philosophy:
1. When you travel, take photos and record videos on your phone and upload them to DPL.
2. Items are tagged with `syncStatus = 'not-sync'` in your Google Drive `Travel Inbox`.
3. When you return home and connect to your local home network or Wi-Fi, you run the **Desktop Ingestion CLI** to download full-resolution original media to your home NAS (Synology, TrueNAS, unRAID, QNAP), local RAID array, or external hard drive.
4. Once downloaded and byte-verified, the script automatically calls `/api/files/:id/mark-synced`, moving items from `Travel Inbox` to `Travel Archive` on Google Drive.

---

## 🚀 Quick Start

### 1. Requirements
The ingestion script is self-contained and uses only the Python standard library. No `pip install` required!
- Python 3.8+ (Windows, macOS, Linux, Synology DSM, TrueNAS, Raspberry Pi).

### 2. Manual Run
```bash
python scripts/desktop_sync.py \
  --url https://drive-photo-library.pages.dev \
  --username alice \
  --password "YourSecretPassword" \
  --dest "/Volumes/Media/Photos/Travel"
```

### 3. Dry Run (Preview Only)
To inspect pending files, folder tree, and sizes without downloading anything:
```bash
python scripts/desktop_sync.py \
  --url https://drive-photo-library.pages.dev \
  --username alice \
  --password "YourSecretPassword" \
  --dest "/Volumes/Media/Photos/Travel" \
  --dry-run
```

---

## ⚙️ CLI Options & Flags

| Flag | Environment Variable | Default | Description |
|------|----------------------|---------|-------------|
| `--url` | `DPL_URL` | `http://localhost:8788` | Base URL of your deployed Cloudflare Pages site |
| `--username` | `DPL_USERNAME` | — | DPL user credentials username |
| `--password` | `DPL_PASSWORD` | — | DPL user credentials password |
| `--dest` | `DPL_DEST` | `./Travel_Library` | Target directory or NAS shared folder path |
| `--filter` | — | `not-sync` | Filter status (`not-sync`, `synced`, `all`) |
| `--folder-id` | — | `None` | Optional Drive folder ID to sync a specific folder |
| `--dry-run` | — | `False` | Preview items without downloading or changing sync status |
| `--no-mark-synced` | — | `False` | Download files without marking them synced on Google Drive |
| `--verbose`, `-v` | — | `False` | Enable progress percentage and detailed stream logs |

---

## 🤖 Automated Ingestion on NAS / Server

### Option A: Synology DSM Task Scheduler
1. Open **Synology DSM** > **Control Panel** > **Task Scheduler**.
2. Click **Create** > **Scheduled Task** > **User-defined script**.
3. Under the **Schedule** tab: Set to run daily (e.g., at 03:00 AM) or hourly.
4. Under the **Task Settings** tab, paste the following command:
```bash
export DPL_URL="https://drive-photo-library.pages.dev"
export DPL_USERNAME="dylan"
export DPL_PASSWORD="MySecurePassword123"
export DPL_DEST="/volume1/photos/Travel"

python3 /volume1/scripts/desktop_sync.py
```

---

### Option B: Linux / macOS / Raspberry Pi Cron Job
Add to your user `crontab -e`:
```cron
# Run vacation media sync every day at 2:00 AM
0 2 * * * DPL_URL="https://drive-photo-library.pages.dev" DPL_USERNAME="alice" DPL_PASSWORD="secret" /usr/bin/python3 /home/alice/scripts/desktop_sync.py --dest /mnt/nas/photos >> /var/log/dpl_sync.log 2>&1
```

---

### Option C: Systemd Timer (Linux)
Create `/etc/systemd/system/dpl-sync.service`:
```ini
[Unit]
Description=Drive Photo Library Vacation Ingestion
After=network-online.target

[Service]
Type=oneshot
User=nasuser
Environment="DPL_URL=https://drive-photo-library.pages.dev"
Environment="DPL_USERNAME=alice"
Environment="DPL_PASSWORD=secret"
Environment="DPL_DEST=/mnt/storage/photos"
ExecStart=/usr/bin/python3 /opt/dpl/scripts/desktop_sync.py
```

Create `/etc/systemd/system/dpl-sync.timer`:
```ini
[Unit]
Description=Run DPL Sync Daily

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```
Enable and start the timer:
```bash
systemctl daemon-reload
systemctl enable --now dpl-sync.timer
```

---

## 🔒 Security & Integrity Guarantees

- **Range Passthrough Streaming**: The script streams bytes directly through the `/api/media/file` endpoint without memory limits, allowing 4K/60fps video files of any size to download smoothly.
- **Atomic Writes**: Media files are written to `.dpl_part` temporary files and atomically renamed only after byte size verification against Google Drive metadata.
- **Safe Sync Progression**: Files are **only** marked as synced on Google Drive (`syncStatus = 'synced'`) *after* the local file is fully written and verified. If a network drop occurs mid-download, the partial file is cleared and the item remains in `not-sync` status for the next run.
