import { test, expect } from "bun:test";
import { parseRecipients, invalidRecipients, interimKeyFor } from "./provisioning";

const SECRET = new Uint8Array(32).fill(7);

test("splits recipients on newlines, commas and semicolons", () => {
  const out = parseRecipients("a@x.com\nb@x.com, c@x.com; d@x.com");
  expect(out.map((r) => r.value)).toEqual(["a@x.com", "b@x.com", "c@x.com", "d@x.com"]);
});

test("drops blanks and duplicates, ignoring case", () => {
  const out = parseRecipients("a@x.com\n\n A@X.com \n b@x.com");
  expect(out.map((r) => r.value)).toEqual(["a@x.com", "b@x.com"]);
});

test("reports addresses that are not valid emails", () => {
  const bad = invalidRecipients(parseRecipients("good@x.com\nnot-an-email\nalso bad@"));
  expect(bad.map((r) => r.value)).toEqual(["not-an-email", "also bad@"]);
});

test("a recipient always derives the same key from the same secret", () => {
  const r = { scheme: "email", value: "a@x.com" };
  expect(interimKeyFor(SECRET, r).walletAddress).toBe(interimKeyFor(SECRET, r).walletAddress);
});

test("different recipients derive different wallets", () => {
  const a = interimKeyFor(SECRET, { scheme: "email", value: "a@x.com" });
  const b = interimKeyFor(SECRET, { scheme: "email", value: "b@x.com" });
  expect(a.walletAddress).not.toBe(b.walletAddress);
});

test("a different secret derives a different wallet for the same recipient", () => {
  const r = { scheme: "email", value: "a@x.com" };
  const other = new Uint8Array(32).fill(9);
  expect(interimKeyFor(SECRET, r).walletAddress).not.toBe(interimKeyFor(other, r).walletAddress);
});
