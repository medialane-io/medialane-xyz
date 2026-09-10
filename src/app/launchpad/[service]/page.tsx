"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { usePortalAuth } from "@/src/hooks/use-portal-auth";
import { issuableService } from "@/src/lib/services";
import { IssuanceTask } from "@/src/components/portal/issuance-task";

export default function LaunchpadServicePage({ params }: { params: Promise<{ service: string }> }) {
  const { service: serviceId } = use(params);
  const { session, isLoading } = usePortalAuth();
  const service = issuableService(serviceId);

  if (!service) notFound();
  if (isLoading) return null;

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">Sign in to use the Launchpad.</p>
          <Link href="/account" className="text-sm text-primary hover:underline">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 max-w-3xl pt-28 pb-16">
      <Link
        href="/launchpad"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Launchpad
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{service.displayName}</h1>
        <p className="mt-2 text-muted-foreground">{service.description}</p>
      </div>

      <IssuanceTask serviceId={service.id} address={session.address} />
    </div>
  );
}
