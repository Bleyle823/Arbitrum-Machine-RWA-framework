"use client";

import Link from "next/link";
import { CopyButton } from "~~/components/rwa/CopyButton";

export function ContractIdBadge({ contractId }: { contractId: bigint | string }) {
  const id = contractId.toString();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="text-xs break-all">{id}</code>
      <CopyButton value={id} />
      <Link href={`/rwa/contracts/${id}`} className="btn btn-xs btn-primary">
        Open
      </Link>
    </div>
  );
}
