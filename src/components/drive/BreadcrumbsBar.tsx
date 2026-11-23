import { RiArrowLeftLine, RiDownloadLine, RiFolderLine, RiRefreshLine } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import type { Breadcrumb } from "@/api";

export interface BreadcrumbsBarProps {
  breadcrumbs: Breadcrumb[];
  currentFolderName?: string;
  onNavigate: (folderId?: string) => void;
  onRefresh: () => void;
  loading?: boolean;
  onDownloadFolder?: () => void;
  downloadingFolder?: boolean;
}

export function BreadcrumbsBar({
  breadcrumbs,
  currentFolderName,
  onNavigate,
  onRefresh,
  loading,
  onDownloadFolder,
  downloadingFolder,
}: BreadcrumbsBarProps) {
  const isNested = breadcrumbs.length > 1;
  const parentFolder = isNested ? breadcrumbs[breadcrumbs.length - 2] : null;
  const activeName = breadcrumbs[breadcrumbs.length - 1]?.name ?? currentFolderName ?? "Root";

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
        {/* Quick Back to Parent Folder Button */}
        {isNested && parentFolder && (
          <button
            type="button"
            onClick={() => onNavigate(breadcrumbs.length === 2 ? undefined : parentFolder.id)}
            title={`Back to ${parentFolder.name}`}
            aria-label={`Back to ${parentFolder.name}`}
            className="flex items-center gap-1 rounded-xl border border-border-button-default bg-background-primary-default px-2.5 py-1.5 text-body-2-medium text-text-secondary hover:bg-background-secondary-default hover:text-text-primary transition-colors shrink-0"
          >
            <RiArrowLeftLine className="size-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}

        {/* Scrollable Breadcrumbs Path */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 overflow-x-auto text-body-2-medium no-scrollbar py-1"
        >
          {breadcrumbs.length === 0 ? (
            <span className="flex items-center gap-1 font-semibold text-text-primary">
              <RiFolderLine className="size-4 text-accent-500" />
              <span>{activeName}</span>
            </span>
          ) : (
            breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              const targetId = idx === 0 ? undefined : crumb.id;

              return (
                <span key={crumb.id || idx} className="flex items-center gap-1.5 shrink-0">
                  {idx > 0 && <span className="text-text-tertiary select-none">/</span>}
                  {isLast ? (
                    <span className="flex items-center gap-1 font-semibold text-text-primary">
                      <RiFolderLine className="size-4 text-accent-500" />
                      <span>{crumb.name}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigate(targetId)}
                      className="text-text-secondary hover:text-accent-500 transition-colors outline-none hover:underline"
                    >
                      {crumb.name}
                    </button>
                  )}
                </span>
              );
            })
          )}
        </nav>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onDownloadFolder && (
          <Button
            variant="ghost"
            size="small"
            leadingIcon={RiDownloadLine}
            aria-label={`Download ${activeName} as ZIP`}
            title={`Download '${activeName}' as ZIP archive`}
            onClick={onDownloadFolder}
            disabled={loading || downloadingFolder}
            className="text-body-2-medium"
          >
            {downloadingFolder ? "Zipping…" : "Download ZIP"}
          </Button>
        )}

        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiRefreshLine}
          aria-label="Refresh library"
          onClick={onRefresh}
          disabled={loading}
          className="shrink-0 min-h-10 min-w-10"
        />
      </div>
    </div>
  );
}
