import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isOldEnoughToClose,
  jobAgeDays,
  shouldMarkPossiblyClosed,
} from "./possibly-closed";

describe("possibly-closed", () => {
  it("uses latencyDays when present", () => {
    assert.equal(
      jobAgeDays({
        postedDate: null,
        latencyDays: 12,
        firstSeenAt: "2020-01-01T00:00:00.000Z",
      }),
      12
    );
  });

  it("marks closed only when listing age is at least 30 days", () => {
    const young = {
      postedDate: null,
      latencyDays: 10,
      firstSeenAt: "2026-01-01T00:00:00.000Z",
    };
    const old = {
      postedDate: null,
      latencyDays: 31,
      firstSeenAt: "2026-01-01T00:00:00.000Z",
    };

    assert.equal(isOldEnoughToClose(young), false);
    assert.equal(isOldEnoughToClose(old), true);
    assert.equal(shouldMarkPossiblyClosed(young), false);
    assert.equal(shouldMarkPossiblyClosed(old), true);
  });

  it("does not close listings with unknown age", () => {
    assert.equal(
      isOldEnoughToClose({
        postedDate: null,
        latencyDays: null,
        firstSeenAt: "not-a-date",
      }),
      false
    );
  });
});
