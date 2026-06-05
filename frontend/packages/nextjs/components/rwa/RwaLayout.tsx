"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectedWalletBadge } from "~~/components/rwa/WalletRoleHint";

const links = [
  { href: "/rwa", label: "Dashboard" },
  { href: "/rwa/machines", label: "Machines" },
  { href: "/rwa/contracts", label: "Contracts" },
  { href: "/rwa/vault", label: "Vault" },
  { href: "/rwa/invest", label: "Transfers" },
  { href: "/rwa/yield", label: "Yield" },
];

export function RwaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { address } = useAccount();

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-bold">RWA App</h1>
          <Link href="/debug" className="btn btn-ghost btn-sm">
            Debug contracts
          </Link>
        </div>
        <p className="text-sm">
          Connected: <ConnectedWalletBadge address={address} />
        </p>
        <ul className="menu menu-horizontal bg-base-200 rounded-box flex-wrap gap-1">
          {links.map(l => (
            <li key={l.href}>
              <Link href={l.href} className={pathname === l.href ? "active" : ""}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {children}
    </div>
  );
}
