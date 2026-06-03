"use client";

import { useState } from "react";
import { type Address, keccak256 } from "viem";

export type PinataUploadResult = {
  cid: string;
  ipfsUrl: string;
  gatewayUrl: string;
  hashDigest: bigint;
};

export function PinataUploadField({
  onUploaded,
  initiator,
}: {
  onUploaded: (result: PinataUploadResult) => void;
  initiator?: Address;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<PinataUploadResult | null>(null);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const data = new FormData();
      data.set("file", file);
      const res = await fetch("/api/pinata/upload", { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      const buf = await file.arrayBuffer();
      const hashDigest = BigInt(keccak256(new Uint8Array(buf)));
      const result: PinataUploadResult = {
        cid: json.cid,
        ipfsUrl: json.ipfsUrl,
        gatewayUrl: json.gatewayUrl,
        hashDigest,
      };
      setLast(result);
      onUploaded(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const uploadJson = async () => {
    setUploading(true);
    setError(null);
    try {
      const payload = {
        type: "rwa-agreement",
        createdAt: new Date().toISOString(),
        initiator: initiator ?? null,
      };
      const canonical = JSON.stringify(payload);
      const res = await fetch("/api/pinata/upload-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: canonical,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      const hashDigest = BigInt(keccak256(new TextEncoder().encode(canonical)));
      const result: PinataUploadResult = {
        cid: json.cid,
        ipfsUrl: json.ipfsUrl,
        gatewayUrl: json.gatewayUrl,
        hashDigest,
      };
      setLast(result);
      onUploaded(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm opacity-80">
        Upload agreement to Pinata (server API). On-chain <code>url</code> will be <code>ipfs://CID</code>;{" "}
        <code>hashDigest</code> = keccak256 of file bytes (or canonical JSON).
      </p>
      <input
        type="file"
        className="file-input file-input-bordered w-full max-w-md"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) uploadFile(f);
        }}
        disabled={uploading}
      />
      <button type="button" className="btn btn-sm btn-outline" disabled={uploading} onClick={uploadJson}>
        {uploading ? "Uploading…" : "Upload sample JSON metadata"}
      </button>
      {error && <p className="text-error text-sm">{error}</p>}
      {last && (
        <div className="text-sm space-y-1">
          <p>
            <a href={last.gatewayUrl} target="_blank" rel="noreferrer" className="link">
              Gateway preview
            </a>
          </p>
          <p>
            IPFS URL: <code>{last.ipfsUrl}</code>
          </p>
        </div>
      )}
    </div>
  );
}
