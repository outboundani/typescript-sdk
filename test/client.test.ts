import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { OutboundIQ, VERSION, outboundiq } from "../src/index";

describe("client wiring", () => {
  it("the factory returns a fully wired client", () => {
    const oiq = outboundiq({ apiKey: "k" });
    expect(oiq).toBeInstanceOf(OutboundIQ);
    expect(oiq.assignment).toBeDefined();
    expect(oiq.dials).toBeDefined();
    expect(oiq.custom.campaigns).toBeDefined();
    expect(oiq.custom.dispos).toBeDefined();
    expect(oiq.custom.anis).toBeDefined();
    expect(oiq.nrm).toBeDefined();
    expect(oiq.liveFeed.ringcx).toBeDefined();
  });

  it("VERSION matches package.json", () => {
    const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      version: string;
    };
    expect(VERSION).toBe(pkg.version);
  });
});
