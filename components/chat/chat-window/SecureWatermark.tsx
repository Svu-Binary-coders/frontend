"use client";

import React, { useEffect, useRef } from "react";
import { toast } from "sonner";

export default function SecureWatermark({ text }: { text: string }) {
  const watermarkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const targetNode = watermarkRef.current;
    if (!targetNode || !targetNode.parentNode) return;
    const styleObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "style"
        ) {
          toast.error("Security Alert: Watermark manipulation detected! 🚨");
          window.location.reload();
        }
      });
    });

    const deleteObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.removedNodes.length > 0) {
          mutation.removedNodes.forEach((node) => {
            if (node === targetNode) {
              toast.error("Security Breach: Watermark removed! 🚨");
              window.location.reload();
            }
          });
        }
      });
    });

    styleObserver.observe(targetNode, { attributes: true });
    deleteObserver.observe(targetNode.parentNode, { childList: true });

    return () => {
      styleObserver.disconnect();
      deleteObserver.disconnect();
    };
  }, []);

  const svgText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;"); // XSS Protection
  const svgString = `<svg width="250" height="150" xmlns="http://www.w3.org/2000/svg">
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="rgba(100, 116, 139, 0.06)" font-size="22" font-family="sans-serif" font-weight="bold" transform="rotate(-30, 125, 75)">
      ${svgText}
    </text>
  </svg>`;

  const base64Svg = typeof window !== "undefined" ? window.btoa(svgString) : "";
  const backgroundUrl = `url("data:image/svg+xml;base64,${base64Svg}")`;

  return (
    <div
      ref={watermarkRef}
      className="absolute inset-0 pointer-events-none z-[45]"
      style={{
        backgroundImage: backgroundUrl,
        backgroundRepeat: "repeat",
      }}
    />
  );
}
