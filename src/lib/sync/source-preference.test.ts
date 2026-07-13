import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickKeeperJob } from "./company-role-duplicates";
import { isLinkedInJob, sourcePreferenceScore } from "./source-preference";

describe("sourcePreferenceScore", () => {
  it("prefers company careers over LinkedIn and boards", () => {
    const company = {
      sourceType: "company",
      sourceName: "Revolut careers",
      applyUrl: "https://www.revolut.com/careers",
    };
    const linkedin = {
      sourceType: "board",
      sourceName: "LinkedIn",
      applyUrl: "https://www.linkedin.com/jobs/view/123",
    };
    const jjit = {
      sourceType: "board",
      sourceName: "Just Join IT",
      applyUrl: "https://justjoin.it/job-offer/acme-product-designer",
    };

    assert.ok(sourcePreferenceScore(company) > sourcePreferenceScore(linkedin));
    assert.ok(sourcePreferenceScore(linkedin) > sourcePreferenceScore(jjit));
  });

  it("detects LinkedIn apply URLs", () => {
    assert.equal(
      isLinkedInJob({
        sourceType: "board",
        sourceName: "Just Join IT",
        applyUrl: "https://www.linkedin.com/jobs/view/123",
      }),
      true
    );
  });
});

describe("pickKeeperJob", () => {
  const base = {
    company: "Acme",
    role: "Product Designer",
    status: null as string | null,
    lastSeenAt: "2026-07-01T00:00:00.000Z",
  };

  it("keeps company careers over a newer Just Join IT listing", () => {
    const keeper = pickKeeperJob([
      {
        ...base,
        id: "board",
        sourceType: "board",
        sourceName: "Just Join IT",
        applyUrl: "https://justjoin.it/job-offer/acme-product-designer",
        lastSeenAt: "2026-07-13T00:00:00.000Z",
      },
      {
        ...base,
        id: "company",
        sourceType: "company",
        sourceName: "Acme careers",
        applyUrl: "https://acme.com/careers/product-designer",
        lastSeenAt: "2026-07-01T00:00:00.000Z",
      },
    ]);

    assert.equal(keeper.id, "company");
  });

  it("keeps LinkedIn over a newer Just Join IT listing", () => {
    const keeper = pickKeeperJob([
      {
        ...base,
        id: "board",
        sourceType: "board",
        sourceName: "Just Join IT",
        applyUrl: "https://justjoin.it/job-offer/acme-product-designer",
        lastSeenAt: "2026-07-13T00:00:00.000Z",
      },
      {
        ...base,
        id: "linkedin",
        sourceType: "board",
        sourceName: "LinkedIn",
        applyUrl: "https://www.linkedin.com/jobs/view/123",
        lastSeenAt: "2026-07-01T00:00:00.000Z",
      },
    ]);

    assert.equal(keeper.id, "linkedin");
  });
});
