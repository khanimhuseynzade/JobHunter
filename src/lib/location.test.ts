import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDisplayLocation } from "./location";

describe("formatDisplayLocation", () => {
  it("prefers Warsaw, Poland when multiple cities exist", () => {
    assert.equal(
      formatDisplayLocation("Remote · Warszawa · Kraków · Poland"),
      "Warsaw, Poland"
    );
  });

  it("strips regions from comma-separated locations", () => {
    assert.equal(
      formatDisplayLocation("Warsaw, Mazowieckie, Poland"),
      "Warsaw, Poland"
    );
    assert.equal(
      formatDisplayLocation("London, England, United Kingdom"),
      "London, United Kingdom"
    );
    assert.equal(
      formatDisplayLocation("Cracow, Małopolskie, Poland"),
      "Kraków, Poland"
    );
  });

  it("normalizes Warszawa and implies Poland for Polish cities", () => {
    assert.equal(formatDisplayLocation("Warszawa · hybrid"), "Warsaw, Poland");
    assert.equal(
      formatDisplayLocation("Remote · Warszawa · remote"),
      "Warsaw, Poland"
    );
    assert.equal(formatDisplayLocation("Kraków · hybrid"), "Kraków, Poland");
  });

  it("handles country-only and remote-only", () => {
    assert.equal(formatDisplayLocation("Poland"), "Poland");
    assert.equal(formatDisplayLocation("Remote"), "Remote");
    assert.equal(formatDisplayLocation("United Kingdom"), "United Kingdom");
  });

  it("keeps a single foreign city + country", () => {
    assert.equal(
      formatDisplayLocation("Dublin, County Dublin, Ireland"),
      "Dublin, Ireland"
    );
    assert.equal(
      formatDisplayLocation("Berlin, Berlin, Germany"),
      "Berlin, Germany"
    );
  });

  it("returns dash for empty", () => {
    assert.equal(formatDisplayLocation(""), "—");
    assert.equal(formatDisplayLocation("   "), "—");
  });
});
