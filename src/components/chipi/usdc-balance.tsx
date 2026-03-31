"use client";

import { useGetTokenBalance, Chain, ChainToken } from "@chipi-stack/nextjs";
import { authClient } from "@/src/lib/auth-client";

export function UsdcBalance({ walletPublicKey }: { walletPublicKey: string }) {
    const { data: usdcBalance } = useGetTokenBalance({
        params: {
            chain: "STARKNET" as Chain,
            chainToken: "USDC" as ChainToken,
            walletPublicKey,
        },
        getBearerToken: () => authClient.token().then(t => t?.token ?? ""),
    });

    return (
        <div className="flex items-baseline gap-1">
            <span className="text-4xl text-muted-foreground">$</span>
            <span className="text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                {!isNaN(Number(usdcBalance?.balance))
                    ? Number(usdcBalance?.balance).toFixed(2)
                    : "0.00"}
            </span>
            <span className="text-xl text-muted-foreground font-medium">USD</span>
        </div>
    );
}
