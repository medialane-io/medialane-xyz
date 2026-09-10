import { test, expect } from "bun:test";
import { parseRecipients, invalidRecipients, interimKeyFor, newDerivationSalt } from "./provisioning";

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

const SALT = "0123456789abcdef0123456789abcdef";

test("a recipient always derives the same key from the same secret and salt", () => {
  const r = { scheme: "email", value: "a@x.com" };
  expect(interimKeyFor(SECRET, r, SALT).walletAddress).toBe(interimKeyFor(SECRET, r, SALT).walletAddress);
});

test("different recipients derive different wallets", () => {
  const a = interimKeyFor(SECRET, { scheme: "email", value: "a@x.com" }, SALT);
  const b = interimKeyFor(SECRET, { scheme: "email", value: "b@x.com" }, SALT);
  expect(a.walletAddress).not.toBe(b.walletAddress);
});

test("a different secret derives a different wallet for the same recipient", () => {
  const r = { scheme: "email", value: "a@x.com" };
  const other = new Uint8Array(32).fill(9);
  expect(interimKeyFor(SECRET, r, SALT).walletAddress).not.toBe(interimKeyFor(other, r, SALT).walletAddress);
});

test("the same secret and recipient derive nothing without the right salt", () => {
  const r = { scheme: "email", value: "a@x.com" };
  const other = "fedcba9876543210fedcba9876543210";
  expect(interimKeyFor(SECRET, r, SALT).walletAddress).not.toBe(interimKeyFor(SECRET, r, other).walletAddress);
});

test("a salt is random and long enough to resist guessing", () => {
  const a = newDerivationSalt();
  expect(a.length).toBe(32);
  expect(a).not.toBe(newDerivationSalt());
});

test("refuses to derive from a salt that is too short", () => {
  expect(() => interimKeyFor(SECRET, { scheme: "email", value: "a@x.com" }, "abc")).toThrow();
});
