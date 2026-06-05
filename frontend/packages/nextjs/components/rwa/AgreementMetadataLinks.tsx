"use client";

import {
  DEMO_AGREEMENT_IPFS_CID,
  gatewayUrlsForIpfs,
  localAgreementMetadataUrl,
} from "~~/lib/rwa/agreementLinks";

type Props = {
  agreementUrl?: string | null;
  agreementMetadataHash?: string | null;
  gatewayHost?: string;
};

export function AgreementMetadataLinks({ agreementUrl, agreementMetadataHash, gatewayHost }: Props) {
  const ipfsUrl = agreementUrl ?? `ipfs://${DEMO_AGREEMENT_IPFS_CID}`;
  const gateways = gatewayUrlsForIpfs(ipfsUrl, gatewayHost);
  const localUrl = localAgreementMetadataUrl();

  return (
    <div className="text-sm space-y-2">
      <p>
        <span className="font-semibold">agreementMetadataHash</span>{" "}
        <code className="break-all">{agreementMetadataHash ?? "—"}</code>
      </p>
      <p className="opacity-80">
        This is <code>keccak256(JSON)</code> of the demo agreement file — not a transaction hash. It will not appear on
        Arbiscan; verify by downloading the JSON and hashing it locally.
      </p>
      <p className="font-mono break-all">On-chain url: {ipfsUrl}</p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <a href={localUrl} target="_blank" rel="noreferrer" className="link link-primary">
            View agreement JSON (app-hosted, always works with yarn start)
          </a>
        </li>
        {gateways.map(url => (
          <li key={url}>
            <a href={url} target="_blank" rel="noreferrer" className="link link-primary">
              IPFS gateway: {url}
            </a>
          </li>
        ))}
      </ul>
      {gateways.length > 0 && (
        <p className="opacity-70 text-xs">
          If IPFS gateways time out, run <code>yarn pin:demo-agreement</code> with <code>PINATA_JWT</code> once, then retry
          the links.
        </p>
      )}
    </div>
  );
}
