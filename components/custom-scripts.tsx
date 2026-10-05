"use client";

import Script from "next/script";
import { useCmsSettings } from "@/components/cms-settings-context";

type CustomScript = { type: "url" | "inline"; value: string };

export function CustomScripts() {
  const settings = useCmsSettings();
  const scripts: CustomScript[] = (settings?.header?.customScripts || []).filter(
    (s) => s && (s.type === "url" ? s.value?.trim() : s.value?.trim())
  );

  if (!scripts.length) return null;

  return (
    <>
      {scripts.map((s, i) => {
        const key = `custom-script-${i}`;
        if (s.type === "url" && s.value?.trim().startsWith("http")) {
          return <Script key={key} src={s.value.trim()} strategy="afterInteractive" />;
        }
        if (s.type === "inline" && s.value?.trim()) {
          return (
            <script
              key={key}
              type="text/javascript"
              dangerouslySetInnerHTML={{ __html: s.value.trim() }}
            />
          );
        }
        return null;
      })}
    </>
  );
}
