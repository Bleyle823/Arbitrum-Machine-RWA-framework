import { DEMO_AGREEMENT_IPFS_CID, DEMO_AGREEMENT_LOCAL_PATH } from "./demoProductionAssets";

const DEFAULT_GATEWAYS = ["https://ipfs.io", "https://dweb.link", "https://cloudflare-ipfs.com"] as const;

export function ipfsCidFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/^ipfs:\/\/(.+)$/i);
  return m ? m[1] : null;
}

export function gatewayUrlsForIpfs(url?: string | null, extraGateway?: string): string[] {
  const cid = ipfsCidFromUrl(url) ?? (url?.startsWith("baf") ? url : null);
  if (!cid) return [];
  const hosts = [...DEFAULT_GATEWAYS];
  if (extraGateway) {
    const host = extraGateway.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!hosts.some(h => h.includes(host))) hosts.unshift(`https://${host}`);
  }
  return hosts.map(host => `${host}/ipfs/${cid}`);
}

export function localAgreementMetadataUrl(origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${DEMO_AGREEMENT_LOCAL_PATH}`;
}

export { DEMO_AGREEMENT_IPFS_CID, DEMO_AGREEMENT_LOCAL_PATH };
