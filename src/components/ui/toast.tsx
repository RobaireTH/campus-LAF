"use client";

import { Toaster as Sonner, toast, type ToasterProps } from "sonner";
import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from "lucide-react";

/**
 * Toast notifications. <Toaster /> is mounted once in the root layout; anywhere in a
 * client component call:
 *
 *   toast.success("Item posted — it's under review")
 *   toast.error("Couldn't upload photo", { description: "Max 5 MB per photo" })
 *   toast.promise(save(), { loading: "Saving…", success: "Saved", error: "Try again" })
 *
 * Styling lives here so every toast matches the tokens. SOF-32 (shared states) reuses this.
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      offset={16}
      mobileOffset={12}
      icons={{
        success: <CircleCheck className="size-5 text-success" />,
        error: <OctagonX className="size-5 text-danger" />,
        warning: <TriangleAlert className="size-5 text-warning" />,
        info: <Info className="size-5 text-primary" />,
        loading: <LoaderCircle className="size-5 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !border !border-border !bg-card !text-card-foreground !shadow-pop !font-sans !gap-3 !p-4",
          title: "!text-small !font-semibold",
          description: "!text-small !text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground !rounded-md",
          cancelButton: "!bg-muted !text-foreground !rounded-md",
        },
      }}
      {...props}
    />
  );
}

export { Toaster, toast };
