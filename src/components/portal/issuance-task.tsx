"use client";

import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import {
  parseRecipients,
  invalidRecipients,
  interimKeyFor,
  newDerivationSalt,
  buildAndSignDeployment,
  PROVISIONING_SECRET_MESSAGE,
  type Recipient,
} from "@/src/lib/provisioning";

type Call = { contractAddress: string; entrypoint: string; calldata: string[] };

export function IssuanceTask({ serviceId, address }: { serviceId: string; address: string }) {
  const { account } = useAccount();

  const [raw, setRaw] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [collectionId, setCollectionId] = useState("");

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<number | null>(null);

  const recipients = parseRecipients(raw);
  const invalid = invalidRecipients(recipients);
  const ready =
    recipients.length > 0 &&
    invalid.length === 0 &&
    name.trim().length > 0 &&
    collectionId.trim().length > 0 &&
    Boolean(account);

  async function run() {
    if (!account) return;
    setBusy(true);
    setError(null);
    setIssued(null);

    try {
      setProgress("Confirm in your wallet to begin");
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

      for (const [index, recipient] of recipients.entries()) {
        setProgress(`Preparing account ${index + 1} of ${recipients.length}`);
        await provisionOne(secret, recipient, address);
      }

      setProgress("Preparing the asset");
      const tokenUri = await pinMetadata({ name, description, image });

      setProgress("Preparing the issuance");
      const batches = await fetchMintCalls({
        service: serviceId,
        owner: address,
        recipients: recipients.map((r) => r.value),
        tokenUri,
        collectionId: collectionId.trim(),
      });

      for (const [index, batch] of batches.entries()) {
        setProgress(`Confirm batch ${index + 1} of ${batches.length} in your wallet`);
        const tx = await account.execute(batch);
        await account.waitForTransaction(tx.transaction_hash);
      }

      setIssued(recipients.length);
      setRaw("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not finish issuing.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Asset name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="collection">Collection</Label>
          <Input
            id="collection"
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value)}
            disabled={busy}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Image</Label>
        <Input
          id="image"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="ipfs://… or https://…"
          disabled={busy}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recipients">Recipients</Label>
        <Textarea
          id="recipients"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={"one@example.com\ntwo@example.com"}
          rows={8}
          disabled={busy}
          className="font-mono text-sm"
        />
        {recipients.length > 0 && invalid.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {recipients.length} {recipients.length === 1 ? "person" : "people"}
          </p>
        ) : null}
        {invalid.length > 0 ? (
          <p className="text-sm text-destructive">
            Check these: {invalid.map((r) => r.value).join(", ")}
          </p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {issued !== null ? (
        <p className="inline-flex items-center gap-2 text-sm text-primary">
          <Check className="h-4 w-4" />
          Issued to {issued} {issued === 1 ? "person" : "people"}
        </p>
      ) : null}

      <Button onClick={run} disabled={!ready || busy} className="w-full sm:w-auto">
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {progress ?? "Working"}
          </>
        ) : (
          "Issue"
        )}
      </Button>

      {!account ? (
        <p className="text-sm text-muted-foreground">Connect your wallet to issue.</p>
      ) : null}
    </div>
  );
}

async function provisionOne(secret: Uint8Array, recipient: Recipient, address: string) {
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

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? body?.error ?? `Could not prepare ${recipient.value}`);
  }
}

async function pinMetadata(input: { name: string; description: string; image: string }) {
  const metadata: Record<string, string> = { name: input.name };
  if (input.description) metadata.description = input.description;
  if (input.image) metadata.image = input.image;

  const res = await fetch("/api/portal/metadata/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? "Could not prepare the asset");
  return body.data.url as string;
}

async function fetchMintCalls(input: {
  service: string;
  owner: string;
  recipients: string[];
  tokenUri: string;
  collectionId: string;
}): Promise<Call[][]> {
  const res = await fetch("/api/portal/issuance/mint-calls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (body?.error === "recipients_not_provisioned") {
      throw new Error(`No wallet yet for ${(body.recipients ?? []).join(", ")}`);
    }
    throw new Error(body?.error ?? "Could not prepare the issuance");
  }
  return body.data.batches as Call[][];
}
