"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

const COPIED_FOR_MS = 2000;

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      toast.error("Could not copy the code. Select it and copy it by hand.");
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_FOR_MS);
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={copy}>
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : "Copy code"}
    </Button>
  );
}
