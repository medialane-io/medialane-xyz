import { test, expect } from "bun:test";
import {
  issuanceSchema,
  ISSUANCE_DEFAULTS,
  imageRejectionReason,
  LICENSE_PRESETS,
  AI_POLICIES,
  termsSummary,
} from "./issuance-form";

function valid(overrides: Record<string, unknown> = {}) {
  return { ...ISSUANCE_DEFAULTS, collectionId: "1", name: "Q3 records", recipients: "a@x.com", ...overrides };
}

test("a complete form passes", () => {
  expect(issuanceSchema.safeParse(valid()).success).toBe(true);
});

test("a collection must be chosen", () => {
  expect(issuanceSchema.safeParse(valid({ collectionId: "" })).success).toBe(false);
});

test("a name is required", () => {
  expect(issuanceSchema.safeParse(valid({ name: "" })).success).toBe(false);
});

test("at least one recipient is required", () => {
  expect(issuanceSchema.safeParse(valid({ recipients: "" })).success).toBe(false);
});

test("an external link must be a real url", () => {
  expect(issuanceSchema.safeParse(valid({ externalUrl: "medialane.io" })).success).toBe(false);
  expect(issuanceSchema.safeParse(valid({ externalUrl: "https://medialane.io" })).success).toBe(true);
  expect(issuanceSchema.safeParse(valid({ externalUrl: "" })).success).toBe(true);
});

test("royalty stays within nought and fifty", () => {
  expect(issuanceSchema.safeParse(valid({ royalty: 51 })).success).toBe(false);
  expect(issuanceSchema.safeParse(valid({ royalty: -1 })).success).toBe(false);
  expect(issuanceSchema.safeParse(valid({ royalty: 50 })).success).toBe(true);
});

test("the defaults reserve rights rather than give them away", () => {
  expect(ISSUANCE_DEFAULTS.licenseType).toBe("All Rights Reserved");
  expect(ISSUANCE_DEFAULTS.aiPolicy).toBe("Not Allowed");
  expect(ISSUANCE_DEFAULTS.commercialUse).toBe("No");
  expect(ISSUANCE_DEFAULTS.derivatives).toBe("Not Allowed");
});

test("AI use can be granted for training only", () => {
  expect(AI_POLICIES).toContain("Training Only");
  expect(issuanceSchema.safeParse(valid({ aiPolicy: "Training Only" })).success).toBe(true);
});

test("an unknown licence is refused", () => {
  expect(issuanceSchema.safeParse(valid({ licenseType: "Whatever" })).success).toBe(false);
  expect(LICENSE_PRESETS).toContain("CC BY-SA");
});

test("an oversized image is rejected with a readable reason", () => {
  const big = new File([new Uint8Array(11 * 1024 * 1024)], "a.png", { type: "image/png" });
  expect(imageRejectionReason(big)).toBe("That file is over 10 MB.");
});

test("a non-image is rejected", () => {
  const pdf = new File([new Uint8Array(10)], "a.pdf", { type: "application/pdf" });
  expect(imageRejectionReason(pdf)).toBe("Use a JPG, PNG, GIF, WebP or SVG file.");
});

test("a normal image is accepted", () => {
  const png = new File([new Uint8Array(1024)], "a.png", { type: "image/png" });
  expect(imageRejectionReason(png)).toBeNull();
});

test("the panel summary shows the licence and the AI stance", () => {
  expect(termsSummary({ licenseType: "All Rights Reserved", aiPolicy: "Not Allowed" }))
    .toBe("All Rights Reserved · No AI use");
});

test("granting AI use reads as granted", () => {
  expect(termsSummary({ licenseType: "CC BY", aiPolicy: "Training Only" }))
    .toBe("CC BY · AI training only");
});
