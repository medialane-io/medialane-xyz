import { test, expect } from "bun:test";
import { issuableServices, issuableService, canIssue } from "./services";
import { getService } from "@medialane/sdk";

test("a task can target any service the registry says can mint", () => {
  const ids = issuableServices().map((s) => s.id);
  expect(ids).toContain("ip-erc721");
  expect(ids).toContain("mip-erc721");
  expect(ids).toContain("ip-tickets");
  expect(ids).toContain("ip-club");
});

test("marketplaces cannot be issued through", () => {
  const ids = issuableServices().map((s) => s.id);
  expect(ids).not.toContain("medialane-marketplace-erc721");
  expect(ids).not.toContain("medialane-marketplace-erc1155");
});

test("external services cannot be issued through", () => {
  const ids = issuableServices().map((s) => s.id);
  expect(ids.some((id) => id.startsWith("external-"))).toBe(false);
  expect(ids).not.toContain("unruggable-erc20");
});

test("a service without mint is excluded", () => {
  expect(canIssue(getService("ip-sponsorship")!)).toBe(false);
  expect(canIssue(getService("creator-coin")!)).toBe(false);
  expect(canIssue(getService("drop-collection")!)).toBe(false);
});

test("every targetable service can be rendered", () => {
  for (const service of issuableServices()) {
    expect(service.displayName.length).toBeGreaterThan(0);
    expect(service.description.length).toBeGreaterThan(0);
  }
});

test("resolving by id honours the same rule", () => {
  expect(issuableService("ip-erc721")?.id).toBe("ip-erc721");
  expect(issuableService("medialane-marketplace-erc721")).toBeUndefined();
  expect(issuableService("nonsense")).toBeUndefined();
});

test("the rule reads the definition rather than a hardcoded list", () => {
  expect(canIssue(getService("ip-tickets")!)).toBe(true);
  expect(canIssue(getService("external-erc721")!)).toBe(false);
});
