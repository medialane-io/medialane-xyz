import { listServices, getService, type ServiceDefinition } from "@medialane/sdk";

export function canIssue(service: ServiceDefinition): boolean {
  return service.provenance === "MEDIALANE" && service.capabilities.includes("mint");
}

export function issuableServices(): ServiceDefinition[] {
  return listServices().filter(canIssue);
}

export function issuableService(id: string): ServiceDefinition | undefined {
  const service = getService(id);
  return service && canIssue(service) ? service : undefined;
}
