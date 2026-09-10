"use client";

import { useState } from "react";
import useSWR from "swr";
import { useAccount } from "@starknet-react/core";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { portalFetcher } from "@/src/lib/portal/fetcher";

export interface CollectionOption {
  collectionId: string | null;
  contractAddress: string;
  name: string | null;
}

export function CollectionPicker({
  serviceId,
  owner,
  value,
  onChange,
  disabled,
}: {
  serviceId: string;
  owner: string;
  value: string;
  onChange: (collectionId: string) => void;
  disabled?: boolean;
}) {
  const { account } = useAccount();
  const { data, isLoading, mutate } = useSWR<{ collections?: CollectionOption[]; data?: CollectionOption[] }>(
    `/api/portal/collections?service=${serviceId}`,
    portalFetcher,
  );

  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [error, setError] = useState<string | null>(null);

  const collections = (data?.collections ?? data?.data ?? []).filter((c) => c.collectionId);

  async function create() {
    if (!account) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/intents/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CREATE_COLLECTION",
          owner,
          name: name.trim(),
          symbol: symbol.trim(),
          baseUri: "",
          service: serviceId,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Could not prepare the collection");

      const tx = await account.execute(body.data.calls);
      await account.waitForTransaction(tx.transaction_hash);

      const created = await waitForCollection(serviceId, collections.length, mutate);
      if (created?.collectionId) onChange(created.collectionId);

      setCreating(false);
      setName("");
      setSymbol("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the collection.");
    } finally {
      setBusy(false);
    }
  }

  if (creating) {
    return (
      <div className="space-y-3 rounded-xl border border-border/60 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="col-name">Collection name</Label>
            <Input id="col-name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="col-symbol">Symbol</Label>
            <Input id="col-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} disabled={busy} />
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex gap-2">
          <Button onClick={create} disabled={busy || !name.trim() || !symbol.trim()} size="sm">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {busy ? "Creating" : "Create"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCreating(false)} disabled={busy}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="collection">Collection</Label>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your collections…</p>
      ) : (
        <div className="flex gap-2">
          <select
            id="collection"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || collections.length === 0}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">
              {collections.length === 0 ? "No collections yet" : "Choose a collection"}
            </option>
            {collections.map((c) => (
              <option key={c.collectionId!} value={c.collectionId!}>
                {c.name ?? `Collection ${c.collectionId}`}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => setCreating(true)} disabled={disabled}>
            <Plus className="mr-1.5 h-4 w-4" />
            New
          </Button>
        </div>
      )}
    </div>
  );
}

async function waitForCollection(
  serviceId: string,
  previousCount: number,
  mutate: () => Promise<unknown>,
): Promise<CollectionOption | null> {
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise((r) => setTimeout(r, 3000));
    const refreshed = (await mutate()) as { collections?: CollectionOption[]; data?: CollectionOption[] } | undefined;
    const rows = (refreshed?.collections ?? refreshed?.data ?? []).filter((c) => c.collectionId);
    if (rows.length > previousCount) return rows[rows.length - 1];
  }
  return null;
}
