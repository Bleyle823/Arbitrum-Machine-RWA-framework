import { DEMO_AGREEMENT_IPFS_CID } from "./demoAssets.js";

export const IPFS_GATEWAYS = ["https://ipfs.io", "https://dweb.link", "https://cloudflare-ipfs.com"] as const;

export function ipfsCidFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/^ipfs:\/\/(.+)$/i);
  return m ? m[1] : null;
}

export function gatewayUrlsForIpfs(url?: string | null, extraGateway?: string): string[] {
  const cid = ipfsCidFromUrl(url) ?? (url?.startsWith("baf") ? url : null);
  if (!cid) return [];
  const hosts: string[] = [...IPFS_GATEWAYS];
  if (extraGateway) {
    const host = extraGateway.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!hosts.some(h => h.includes(host))) {
      hosts.unshift(`https://${host}`);
    }
  }
  return hosts.map(host => `${host}/ipfs/${cid}`);
}

export function localAgreementMetadataPath(): string {
  return "/demo-agreement-metadata.json";
}

export function localAgreementMetadataUrl(origin = ""): string {
  return `${origin}${localAgreementMetadataPath()}`;
}

export { DEMO_AGREEMENT_IPFS_CID };
