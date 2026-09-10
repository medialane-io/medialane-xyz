import { listServices, getService, type ServiceDefinition } from "@medialane/sdk";

const COLLECTION_ID_MINT_SERVICES = new Set(["mip-erc721", "ip-erc721"]);

export function canIssueToAList(service: ServiceDefinition): boolean {
  return (
    service.provenance === "MEDIALANE" &&
    service.capabilities.includes("mint") &&
    COLLECTION_ID_MINT_SERVICES.has(service.id)
  );
}

export function issuableServices(): ServiceDefinition[] {
  return listServices().filter(canIssueToAList);
}

export function issuableService(id: string): ServiceDefinition | undefined {
  const service = getService(id);
  return service && canIssueToAList(service) ? service : undefined;
}
