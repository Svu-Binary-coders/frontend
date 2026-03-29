"use client";

import { useEffect, useState } from "react";

export const useFingerprint = () => {
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    const getFingerprint = async () => {
      const { Thumbmark } = await import("@thumbmarkjs/thumbmarkjs");
      const tm = new Thumbmark();
      const result = await tm.get();
      setFingerprint(result.thumbmark);
    };

    getFingerprint();
  }, []);

  return fingerprint;
};