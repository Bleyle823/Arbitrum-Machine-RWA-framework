"use client";

import { useEffect, useState } from "react";
import { type RwaManifest, fetchRwaManifest } from "~~/lib/rwa/manifest";

export function useRwaManifest() {
  const [manifest, setManifest] = useState<RwaManifest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRwaManifest().then(m => {
      setManifest(m);
      setLoading(false);
    });
  }, []);

  return { manifest, loading };
}
