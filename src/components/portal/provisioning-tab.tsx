"use client";

import { useState } from "react";
import useSWR from "swr";
import { useAccount } from "@starknet-react/core";
import { Loader2, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Label } from "@/src/components/ui/label";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Textarea } from "@/src/components/ui/textarea";
import { portalFetcher } from "@/src/lib/portal/fetcher";
import {
  parseRecipients,
  invalidRecipients,
  interimKeyFor,
  newDerivationSalt,
  buildAndSignDeployment,
  PROVISIONING_SECRET_MESSAGE,
  type Recipient,
} from "@/src/lib/provisioning";

interface ProvisioningRow {
  id: string;
  walletAddress: string;
  recipientScheme: string;
  recipientValue: string;
  status: "DEPLOYED" | "HANDOFF" | "TRANSFERRED";
}

const STATUS_LABEL: Record<ProvisioningRow["status"], string> = {
  DEPLOYED: "Ready",
  HANDOFF: "Claiming",
  TRANSFERRED: "Theirs",
};

const short = (a: string) => `${a.slice(0, 8)}…${a.slice(-6)}`;

export function ProvisioningTab({ address }: { address: string }) {
  const { account } = useAccount();
  const { data, isLoading, mutate } = useSWR<{ data: ProvisioningRow[] }>(
    `/api/portal/provisioning?address=${address}`,
    portalFetcher,
  );

  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  const recipients = parseRecipients(raw);
  const invalid = invalidRecipients(recipients);
  const ready = recipients.length > 0 && invalid.length === 0 && Boolean(account);

  async function provision() {
    if (!account) return;
    setBusy(true);
    setError(null);
    setDone(null);

    try {
      setProgress("Confirm in your wallet to unlock provisioning");
      const signature = await account.signMessage({
        types: {
          StarknetDomain: [
            { name: "name", type: "shortstring" },
            { name: "version", type: "shortstring" },
            { name: "chainId", type: "shortstring" },
            { name: "revision", type: "shortstring" },
          ],
          Provisioning: [{ name: "purpose", type: "shortstring" }],
        },
        primaryType: "Provisioning",
        domain: { name: "Medialane", version: "1", chainId: "SN_MAIN", revision: "1" },
        message: { purpose: PROVISIONING_SECRET_MESSAGE.slice(0, 31) },
      });

      const secret = new TextEncoder().encode(
        Array.isArray(signature) ? signature.join("") : String(signature),
      );

      let created = 0;
      for (const [index, recipient] of recipients.entries()) {
        setProgress(`Creating account ${index + 1} of ${recipients.length}`);
        const ok = await provisionOne(secret, recipient, address);
        if (ok) created += 1;
      }

      setDone(created);
      setRaw("");
      await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not finish provisioning.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const rows = data?.data ?? [];

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Provision accounts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each person gets a Medialane account and their own wallet, ready before they ever sign
            in. They reach it with the address you give here.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recipients">Recipients</Label>
          <Textarea
            id="recipients"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={"one@example.com\ntwo@example.com"}
            rows={6}
            disabled={busy}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            {recipients.length} recipient{recipients.length === 1 ? "" : "s"}
            {invalid.length > 0 ? ` · ${invalid.length} not a valid address` : ""}
          </p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {done !== null ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Provisioned {done} account{done === 1 ? "" : "s"}.
          </p>
        ) : null}

        <Button onClick={provision} disabled={!ready || busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
          {busy ? progress ?? "Working…" : "Provision"}
        </Button>

        {!account ? (
          <p className="text-xs text-muted-foreground">Connect your wallet to provision accounts.</p>
        ) : null}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Provisioned</h3>
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing provisioned yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.recipientValue}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {short(row.walletAddress)}
                  </p>
                </div>
                <Badge variant={row.status === "TRANSFERRED" ? "default" : "secondary"}>
                  {row.status === "TRANSFERRED" ? (
                    <ShieldCheck className="mr-1 h-3 w-3" />
                  ) : null}
                  {STATUS_LABEL[row.status]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

async function provisionOne(
  secret: Uint8Array,
  recipient: Recipient,
  address: string,
): Promise<boolean> {
  const derivationSalt = newDerivationSalt();
  const interim = interimKeyFor(secret, recipient, derivationSalt);
  const deployment = await buildAndSignDeployment(address, interim);

  const res = await fetch(`/api/portal/provisioning?address=${address}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipientScheme: recipient.scheme,
      recipientValue: recipient.value,
      interimOwnerPubkey: interim.publicKey,
      derivationSalt,
      deployment,
    }),
  });

  return res.ok;
}
