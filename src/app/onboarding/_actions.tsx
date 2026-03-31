"use server";

import { auth } from "@/src/lib/auth";
import { pool } from "@/src/lib/db";
import { headers } from "next/headers";

interface WalletData {
  publicKey: string;
  encryptedPrivateKey: string;
}

export const completeOnboarding = async (walletData: WalletData) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return { error: "No Logged In User" };
    }

    await pool.query(
      'UPDATE "user" SET "walletPublicKey" = $1, "walletEncryptedPrivateKey" = $2 WHERE id = $3',
      [walletData.publicKey, walletData.encryptedPrivateKey, session.user.id]
    );

    return { success: true };
  } catch (err) {
    console.error("Server: Error in completeOnboarding:", err);
    return {
      error: err instanceof Error ? err.message : "Error updating user.",
    };
  }
};

export const getWalletData = async (): Promise<{
  publicKey: string;
  encryptedPrivateKey: string;
} | null> => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) return null;

    const row = await pool.query<{
      walletPublicKey: string | null;
      walletEncryptedPrivateKey: string | null;
    }>(
      'SELECT "walletPublicKey", "walletEncryptedPrivateKey" FROM "user" WHERE id = $1',
      [session.user.id]
    );

    const { walletPublicKey, walletEncryptedPrivateKey } = row.rows[0] ?? {};

    if (!walletPublicKey || !walletEncryptedPrivateKey) return null;

    return {
      publicKey: walletPublicKey,
      encryptedPrivateKey: walletEncryptedPrivateKey,
    };
  } catch (err) {
    console.error("Error fetching wallet data:", err);
    return null;
  }
};