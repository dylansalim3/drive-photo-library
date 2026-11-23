import { useRef, useState, type ChangeEvent } from "react";
import {
  RiAddLine,
  RiCloseLine,
  RiFolderAddLine,
  RiFolderUploadLine,
  RiUpload2Line,
} from "@remixicon/react";

export interface MobileFabSheetProps {
  onNewFolder: () => void;
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function MobileFabSheet({
  onNewFolder,
  onFilesSelected,
  disabled,
}: MobileFabSheetProps) {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = "";
      setOpen(false);
    }
  };

  const handleFolderChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = "";
      setOpen(false);
    }
  };

  return (
    <>
      {/* Hidden Native File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory is standard for folder picking
        webkitdirectory=""
        directory=""
        onChange={handleFolderChange}
        className="hidden"
      />

      {/* Floating Action Button (Mobile Thumb Zone) */}
      <div className="fixed bottom-6 right-5 z-40 sm:hidden pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          disabled={disabled}
          title="Add photos, videos or folders"
          aria-label="Add or upload"
          className="flex size-14 items-center justify-center rounded-full bg-accent-500 text-white shadow-xl hover:bg-accent-600 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50"
        >
          <RiAddLine className="size-7" />
        </button>
      </div>

      {/* Bottom Action Sheet */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Upload options"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs sm:hidden animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full rounded-t-3xl border-t border-border-button-default bg-background-primary-default p-5 shadow-2xl flex flex-col gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-2 border-b border-border-secondary">
              <p className="text-body-medium font-semibold text-text-primary">Add to Drive</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="text-text-secondary hover:text-text-primary outline-none"
              >
                <RiCloseLine className="size-5" />
              </button>
            </div>

            {/* Action 1: Upload Photos & Videos */}
            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
              }}
              className="flex items-center gap-3.5 rounded-2xl border border-border-button-default bg-background-secondary-default p-3.5 text-start hover:bg-background-tertiary-default active:scale-[0.98] transition-all outline-none"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
                <RiUpload2Line className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-body-medium font-medium text-text-primary">Upload photos & videos</p>
                <p className="text-caption-1-regular text-text-secondary">Select media from device</p>
              </div>
            </button>

            {/* Action 2: Upload Entire Folder */}
            <button
              type="button"
              onClick={() => {
                folderInputRef.current?.click();
              }}
              className="flex items-center gap-3.5 rounded-2xl border border-border-button-default bg-background-secondary-default p-3.5 text-start hover:bg-background-tertiary-default active:scale-[0.98] transition-all outline-none"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
                <RiFolderUploadLine className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-body-medium font-medium text-text-primary">Upload entire folder</p>
                <p className="text-caption-1-regular text-text-secondary">Upload a directory with subfolders</p>
              </div>
            </button>

            {/* Action 3: New Folder */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNewFolder();
              }}
              className="flex items-center gap-3.5 rounded-2xl border border-border-button-default bg-background-secondary-default p-3.5 text-start hover:bg-background-tertiary-default active:scale-[0.98] transition-all outline-none"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
                <RiFolderAddLine className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-body-medium font-medium text-text-primary">New folder</p>
                <p className="text-caption-1-regular text-text-secondary">Create a new subfolder here</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
