import { test, expect } from "bun:test";
import { PAID_UPSTREAM_MARKERS } from "@medialane/sdk";
import pkg from "../../../package.json";

const PAID_UPSTREAM_PACKAGES = ["@avnu/avnu-sdk"];

test("the app holds no direct dependency on a paid upstream SDK", () => {
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  for (const name of PAID_UPSTREAM_PACKAGES) {
    expect(deps).not.toContain(name);
  }
});

test("no app source reaches a paid upstream or an RPC node directly", async () => {
  const glob = new Bun.Glob("**/*.{ts,tsx}");
  const offenders: string[] = [];
  for await (const file of glob.scan({ cwd: `${import.meta.dir}/../..`, absolute: true })) {
    if (file.includes(".test.")) continue;
    const source = await Bun.file(file).text();
    for (const marker of PAID_UPSTREAM_MARKERS) {
      if (source.includes(marker)) offenders.push(`${file}: ${marker}`);
    }
  }
  expect(offenders).toEqual([]);
});
