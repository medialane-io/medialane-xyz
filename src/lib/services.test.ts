import { test, expect } from "bun:test";
import { issuableServices, issuableService, canIssueToAList } from "./services";
import { getService } from "@medialane/sdk";

test("offers the services whose mint takes a collection and a token uri", () => {
  expect(issuableServices().map((s) => s.id).sort()).toEqual(["ip-erc721", "mip-erc721"]);
});

test("leaves out services that need an edition size", () => {
  expect(canIssueToAList(getService("mip-erc1155")!)).toBe(false);
});

test("leaves out services that need a tier created first", () => {
  expect(canIssueToAList(getService("ip-tickets")!)).toBe(false);
  expect(canIssueToAList(getService("ip-club")!)).toBe(false);
});

test("leaves out services that cannot mint at all", () => {
  expect(canIssueToAList(getService("medialane-marketplace-erc721")!)).toBe(false);
  expect(canIssueToAList(getService("ip-sponsorship")!)).toBe(false);
  expect(canIssueToAList(getService("creator-coin")!)).toBe(false);
});

test("leaves out external services", () => {
  expect(canIssueToAList(getService("external-erc721")!)).toBe(false);
  expect(canIssueToAList(getService("unruggable-erc20")!)).toBe(false);
});

test("every offered service can be rendered", () => {
  for (const service of issuableServices()) {
    expect(service.displayName.length).toBeGreaterThan(0);
    expect(service.description.length).toBeGreaterThan(0);
  }
});

test("resolving by id honours the same rule", () => {
  expect(issuableService("ip-erc721")?.id).toBe("ip-erc721");
  expect(issuableService("ip-tickets")).toBeUndefined();
  expect(issuableService("nonsense")).toBeUndefined();
});
