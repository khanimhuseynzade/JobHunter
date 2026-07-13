import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  matchesRole,
  normalizeTitleForMatch,
  normalizeRoleForDedupe,
  stripSeniorityPrefix,
} from "./match";

describe("matchesRole", () => {
  it("matches seniority-prefixed titles", () => {
    assert.equal(matchesRole("Senior Product Designer"), true);
    assert.equal(matchesRole("Lead UX Designer"), true);
    assert.equal(matchesRole("Staff UI Engineer"), true);
  });

  it("matches alias forms", () => {
    assert.equal(matchesRole("Product Design"), true);
    assert.equal(matchesRole("User Experience Designer"), true);
    assert.equal(matchesRole("UI/UX Designer"), true);
  });

  it("rejects unrelated designer roles", () => {
    assert.equal(matchesRole("Senior Graphic Designer"), false);
    assert.equal(matchesRole("Motion Designer"), false);
    assert.equal(matchesRole("Brand Designer"), false);
  });

  it("rejects non-design roles", () => {
    assert.equal(matchesRole("Software Engineer"), false);
    assert.equal(matchesRole("Product Manager"), false);
  });

  it("uses word boundaries to reduce false positives", () => {
    assert.equal(matchesRole("Product Designer"), true);
    assert.equal(matchesRole("Anti-UI Designership Program"), false);
  });
});

describe("normalizeRoleForDedupe", () => {
  it("strips seniority for dedupe keys", () => {
    assert.equal(
      normalizeRoleForDedupe("Senior Product Designer"),
      normalizeRoleForDedupe("Product Designer")
    );
  });
});

describe("stripSeniorityPrefix", () => {
  it("removes stacked seniority prefixes", () => {
    assert.equal(stripSeniorityPrefix("Senior Lead Product Designer"), "Product Designer");
  });
});

describe("normalizeTitleForMatch", () => {
  it("normalizes slashes and spacing", () => {
    assert.equal(normalizeTitleForMatch("UX/UI Designer"), "ux ui designer");
  });
});
