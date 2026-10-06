"use client";

import * as React from "react";
import { ImagePlus, Video, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface PhotoPickerProps {
  /** Selected files (controlled). */
  value: File[];
  onChange: (files: File[]) => void;
  /** Max number of files. Use 1 for a single photo (Verify ID). Default 5. */
  maxFiles?: number;
  /** Max size per file in MB. Default 5. */
  maxSizeMB?: number;
  /** MIME types, e.g. "image/*" or "image/*,video/mp4". Default "image/*". */
  accept?: string;
  /** On phones, open the camera directly: "environment" (back) or "user" (selfie). */
  capture?: "environment" | "user";
  /** Text inside the drop zone. */
  label?: string;
  hint?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  /** Called with a human message when a file is rejected (too big, wrong type, too many). */
  onReject?: (message: string) => void;
}

const previewCache = new WeakMap<File, string>();
function previewUrl(file: File) {
  let url = previewCache.get(file);
  if (!url) {
    url = URL.createObjectURL(file);
    previewCache.set(file, url);
  }
  return url;
}
function revokePreview(file: File) {
  const url = previewCache.get(file);
  if (url) URL.revokeObjectURL(url);
  previewCache.delete(file);
}

function matchesAccept(file: File, accept: string) {
  return accept.split(",").some((rule) => {
    const r = rule.trim();
    if (!r) return false;
    if (r.endsWith("/*")) return file.type.startsWith(r.slice(0, -1));
    if (r.startsWith(".")) return file.name.toLowerCase().endsWith(r.toLowerCase());
    return file.type === r;
  });
}

/**
 * File/photo picker with previews — used by Report Item, Claim form and Verify ID.
 * Click or drag files in; each shows a thumbnail with a remove button.
 * Uploading to R2 is not done here (SOF-14): pass `value` to the upload helper on submit.
 *
 * const [photos, setPhotos] = useState<File[]>([]);
 * <PhotoPicker id="photos" value={photos} onChange={setPhotos} onReject={(m) => toast.error(m)} />
 */
function PhotoPicker({
  value,
  onChange,
  maxFiles = 5,
  maxSizeMB = 5,
  accept = "image/*",
  capture,
  label,
  hint,
  disabled,
  id,
  className,
  onReject,
  ...aria
}: PhotoPickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const single = maxFiles === 1;
  const full = value.length >= maxFiles;

  // Preview URLs are cached per File and revoked when a file is removed or the picker unmounts.
  const shown = React.useRef<File[]>([]);
  const unmountTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  React.useEffect(() => {
    shown.current.filter((f) => !value.includes(f)).forEach(revokePreview);
    shown.current = value;
  }, [value]);
  React.useEffect(() => {
    clearTimeout(unmountTimer.current); // StrictMode re-mount: keep the URLs
    return () => {
      const files = shown.current;
      unmountTimer.current = setTimeout(() => files.forEach(revokePreview), 0);
    };
  }, []);
  const previews = value.map((file) => ({ file, url: previewUrl(file) }));

  function reject(message: string) {
    setError(message);
    onReject?.(message);
  }

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    const incoming = Array.from(list);
    const ok: File[] = [];
    for (const f of incoming) {
      if (!matchesAccept(f, accept)) {
        reject(`${f.name} isn't a supported file type.`);
        continue;
      }
      if (f.size > maxSizeMB * 1024 * 1024) {
        reject(`${f.name} is over ${maxSizeMB} MB.`);
        continue;
      }
      ok.push(f);
    }
    if (single) {
      if (ok[0]) onChange([ok[0]]);
      return;
    }
    const room = maxFiles - value.length;
    if (ok.length > room) reject(`You can add up to ${maxFiles} files.`);
    if (room > 0 && ok.length) onChange([...value, ...ok.slice(0, room)]);
  }

  function remove(index: number) {
    setError(null);
    onChange(value.filter((_, i) => i !== index));
  }

  const isVideoAllowed = accept.includes("video");
  const dropLabel =
    label ?? (single ? "Add a photo" : isVideoAllowed ? "Add photos or a video" : "Add photos");

  return (
    <div className={cn("flex flex-col gap-2", className)} data-slot="photo-picker">
      <div className={cn("grid gap-2", single ? "max-w-sm grid-cols-1" : "grid-cols-3 sm:grid-cols-5")}>
        {previews.map(({ file, url }, i) => (
          <div
            key={url}
            className={cn(
              "group relative overflow-hidden rounded-lg border bg-muted",
              single ? "aspect-[3/2]" : "aspect-square",
            )}
          >
            {file.type.startsWith("video/") ? (
              <video src={url} className="size-full object-cover" muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview
              <img src={url} alt={`Selected ${i + 1}: ${file.name}`} className="size-full object-cover" />
            )}
            {file.type.startsWith("video/") && (
              <span className="absolute bottom-1.5 left-1.5 rounded-sm bg-foreground/70 p-1 text-background">
                <Video className="size-3.5" aria-label="Video" />
              </span>
            )}
            {i === 0 && !single && (
              <span className="absolute top-1.5 left-1.5 rounded-sm bg-foreground/70 px-1.5 py-0.5 text-caption font-semibold text-background">
                Cover
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={disabled}
              aria-label={`Remove ${file.name}`}
              className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-foreground/70 text-background hover:bg-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}

        {!(single && value.length) && !full && (
          <button
            type="button"
            id={id}
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!disabled) addFiles(e.dataTransfer.files);
            }}
            data-invalid={aria["aria-invalid"] || undefined}
            aria-describedby={aria["aria-describedby"]}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-input bg-card p-3 text-center text-muted-foreground transition-colors outline-none hover:border-primary hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 data-[invalid]:border-danger",
              single ? "aspect-[3/2]" : value.length ? "aspect-square" : "col-span-full min-h-36",
              dragging && "border-primary bg-primary/5 text-primary",
            )}
          >
            <ImagePlus className={value.length && !single ? "size-6" : "size-8"} aria-hidden />
            <span className="text-small font-medium">{value.length && !single ? "Add" : dropLabel}</span>
            {!value.length && (
              <span className="text-caption">
                {hint ?? (single ? `Max ${maxSizeMB} MB` : `Up to ${maxFiles} files · max ${maxSizeMB} MB each`)}
              </span>
            )}
          </button>
        )}
      </div>

      {!single && value.length > 0 && (
        <p className="text-caption text-muted-foreground">
          {value.length}/{maxFiles} added · the first one is the cover
        </p>
      )}
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        accept={accept}
        capture={capture}
        multiple={!single}
        disabled={disabled}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export { PhotoPicker };
