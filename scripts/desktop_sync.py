#!/usr/bin/env python3
"""
Drive Photo Library (DPL) — Desktop Ingestion & Automation CLI
Synchronizes vacation staging media from Google Drive Photo Library to local storage/NAS,
verifies download integrity, and marks files as synced on the server.

Usage:
    python desktop_sync.py --url https://your-dpl.pages.dev --username alice --password secret --dest /Volumes/Photos/Travel
"""

import argparse
import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional


def format_bytes(num_bytes: int) -> str:
    """Formats bytes into human-readable string."""
    units = ["B", "KB", "MB", "GB", "TB"]
    size = float(num_bytes)
    for unit in units:
        if size < 1024.0 or unit == units[-1]:
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{num_bytes} B"


class DPLSyncClient:
    def __init__(self, base_url: str, username: str, password: str, verbose: bool = False):
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self.verbose = verbose
        
        # Cookie jar handles session cookies (dpl_session) automatically
        self.cookie_jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cookie_jar)
        )
        # Identify script in headers
        self.opener.addheaders = [
            ("User-Agent", "DPL-Desktop-Sync/1.0"),
            ("Accept", "application/json"),
        ]

    def _log(self, msg: str):
        print(f"[DPL Sync] {msg}")

    def _debug(self, msg: str):
        if self.verbose:
            print(f"[DEBUG] {msg}")

    def login(self) -> bool:
        """Authenticates with the DPL server and stores session cookie."""
        login_url = f"{self.base_url}/api/auth/login"
        self._debug(f"Attempting login to {login_url} as '{self.username}'...")
        payload = json.dumps({"username": self.username, "password": self.password}).encode("utf-8")
        req = urllib.request.Request(
            login_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with self.opener.open(req) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("ok"):
                    self._log(f"Successfully authenticated as '{self.username}'.")
                    return True
                else:
                    self._log(f"Authentication failed: {data.get('error', 'Unknown error')}")
                    return False
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            self._log(f"Login failed (HTTP {e.code}): {err_body}")
            return False
        except Exception as e:
            self._log(f"Network error during login: {e}")
            return False

    def fetch_pending_tree(self, filter_status: str = "not-sync", folder_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Queries /api/tree to fetch recursive file structure for ingestion."""
        params = {"filter": filter_status}
        if folder_id:
            params["folderId"] = folder_id
        
        query_str = urllib.parse.urlencode(params)
        tree_url = f"{self.base_url}/api/tree?{query_str}"
        self._debug(f"Fetching media tree from {tree_url}...")
        
        req = urllib.request.Request(tree_url, method="GET")
        try:
            with self.opener.open(req) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if not data.get("ok"):
                    self._log(f"Failed to fetch tree: {data.get('error')}")
                    return []
                items = data.get("items", [])
                self._log(f"Found {len(items)} item(s) pending sync in '{data.get('folderName', 'Root')}'.")
                return items
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            self._log(f"Tree query failed (HTTP {e.code}): {err_body}")
            return []
        except Exception as e:
            self._log(f"Error fetching tree: {e}")
            return []

    def download_file(
        self,
        item: Dict[str, Any],
        dest_base_dir: str,
        chunk_size: int = 65536,
    ) -> bool:
        """
        Streams a single media file directly to local destination, preserving directory structure.
        Uses Range passthrough and temporary download file for atomic consistency.
        """
        file_id = item["id"]
        rel_path = item["path"]
        expected_size = int(item.get("size", 0))
        target_path = os.path.join(dest_base_dir, rel_path)
        temp_path = f"{target_path}.dpl_part"

        # Check if destination file already exists with identical size
        if os.path.exists(target_path):
            existing_size = os.path.getsize(target_path)
            if existing_size == expected_size:
                self._debug(f"File '{rel_path}' already exists locally ({format_bytes(existing_size)}). Skipping download.")
                return True

        # Ensure directory exists
        os.makedirs(os.path.dirname(target_path), exist_ok=True)

        download_url = f"{self.base_url}/api/media/file?id={urllib.parse.quote(file_id)}&download=1"
        req = urllib.request.Request(download_url, method="GET")

        start_time = time.time()
        downloaded_bytes = 0

        try:
            with self.opener.open(req) as resp, open(temp_path, "wb") as f_out:
                while True:
                    chunk = resp.read(chunk_size)
                    if not chunk:
                        break
                    f_out.write(chunk)
                    downloaded_bytes += len(chunk)
                    
                    if expected_size > 0 and self.verbose:
                        percent = (downloaded_bytes / expected_size) * 100
                        sys.stdout.write(f"\r  -> Downloading {rel_path}: {percent:.1f}% ({format_bytes(downloaded_bytes)})")
                        sys.stdout.flush()

            if self.verbose:
                sys.stdout.write("\n")

            # Validate byte size
            if expected_size > 0 and downloaded_bytes != expected_size:
                self._log(f"Size mismatch for '{rel_path}': expected {expected_size} B, got {downloaded_bytes} B.")
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                return False

            # Atomic rename from temporary file
            if os.path.exists(target_path):
                os.remove(target_path)
            os.rename(temp_path, target_path)

            elapsed = max(time.time() - start_time, 0.001)
            speed = downloaded_bytes / elapsed
            self._log(f"Downloaded '{rel_path}' ({format_bytes(downloaded_bytes)}) at {format_bytes(int(speed))}/s.")
            return True

        except Exception as e:
            self._log(f"Error downloading '{rel_path}': {e}")
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass
            return False

    def mark_synced(self, file_id: str, file_name: str) -> bool:
        """Notifies the server to mark the file synced and move it to Travel Archive."""
        sync_url = f"{self.base_url}/api/files/{urllib.parse.quote(file_id)}/mark-synced"
        req = urllib.request.Request(sync_url, data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
        try:
            with self.opener.open(req) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("ok"):
                    self._debug(f"Marked '{file_name}' as synced on server.")
                    return True
                else:
                    self._log(f"Failed to mark '{file_name}' as synced: {data.get('error')}")
                    return False
        except Exception as e:
            self._log(f"Network error marking '{file_name}' as synced: {e}")
            return False


def main():
    parser = argparse.ArgumentParser(
        description="Drive Photo Library Desktop Ingestion CLI — Syncs vacation media to local storage/NAS and marks files synced in Google Drive."
    )
    parser.add_argument(
        "--url",
        default=os.environ.get("DPL_URL", "http://localhost:8788"),
        help="Base URL of the DPL deployment (or env DPL_URL)",
    )
    parser.add_argument(
        "--username",
        default=os.environ.get("DPL_USERNAME"),
        help="DPL account username (or env DPL_USERNAME)",
    )
    parser.add_argument(
        "--password",
        default=os.environ.get("DPL_PASSWORD"),
        help="DPL account password (or env DPL_PASSWORD)",
    )
    parser.add_argument(
        "--dest",
        default=os.environ.get("DPL_DEST", "./Travel_Library"),
        help="Target local directory / NAS mount path (default: ./Travel_Library)",
    )
    parser.add_argument(
        "--filter",
        default="not-sync",
        choices=["not-sync", "all", "synced"],
        help="Filter status of files to ingest (default: 'not-sync')",
    )
    parser.add_argument(
        "--folder-id",
        default=None,
        help="Optional specific Drive folder ID to sync",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview pending files and total sizes without downloading or marking synced",
    )
    parser.add_argument(
        "--no-mark-synced",
        action="store_true",
        help="Download files without marking them as synced in Google Drive",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable detailed progress logging",
    )

    args = parser.parse_args()

    if not args.username or not args.password:
        parser.error("Username and password are required. Set via --username/--password or DPL_USERNAME/DPL_PASSWORD environment variables.")

    print("=" * 60)
    print("  Drive Photo Library — Desktop Ingestion Tool")
    print(f"  Target Server: {args.url}")
    print(f"  Destination  : {os.path.abspath(args.dest)}")
    print(f"  Filter       : {args.filter}")
    if args.dry_run:
        print("  MODE         : DRY-RUN (No files will be modified)")
    print("=" * 60)

    client = DPLSyncClient(
        base_url=args.url,
        username=args.username,
        password=args.password,
        verbose=args.verbose,
    )

    if not client.login():
        sys.exit(1)

    items = client.fetch_pending_tree(filter_status=args.filter, folder_id=args.folder_id)
    if not items:
        print("[DPL Sync] No pending media items found. Everything is up-to-date!")
        sys.exit(0)

    total_bytes = sum(int(item.get("size", 0)) for item in items)
    print(f"\nDiscovered {len(items)} file(s) totaling {format_bytes(total_bytes)}.\n")

    if args.dry_run:
        print("Dry Run Preview:")
        for idx, item in enumerate(items, start=1):
            target = os.path.join(args.dest, item["path"])
            size_str = format_bytes(int(item.get("size", 0)))
            print(f"  [{idx}/{len(items)}] {item['path']} ({size_str}) -> {target}")
        print("\nDry run completed. Run without --dry-run to execute download and sync.")
        sys.exit(0)

    # Ingestion execution
    start_total_time = time.time()
    downloaded_count = 0
    synced_count = 0
    failed_count = 0

    for idx, item in enumerate(items, start=1):
        print(f"[{idx}/{len(items)}] Processing: {item['path']} ({format_bytes(int(item.get('size', 0)))})")
        
        success = client.download_file(item, dest_base_dir=args.dest)
        if success:
            downloaded_count += 1
            if not args.no_mark_synced:
                if client.mark_synced(item["id"], item["name"]):
                    synced_count += 1
                else:
                    print(f"  [Warning] Downloaded {item['name']}, but failed to mark as synced.")
        else:
            failed_count += 1

    elapsed_total = max(time.time() - start_total_time, 0.001)
    print("\n" + "=" * 60)
    print("  Ingestion Summary")
    print(f"  Total Processed : {len(items)}")
    print(f"  Downloaded      : {downloaded_count}")
    print(f"  Marked Synced   : {synced_count}")
    print(f"  Failed          : {failed_count}")
    print(f"  Total Time      : {elapsed_total:.1f} seconds")
    print("=" * 60)

    if failed_count > 0:
        sys.exit(2)


if __name__ == "__main__":
    main()
