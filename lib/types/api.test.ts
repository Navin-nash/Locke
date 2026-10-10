import { describe, expect, it } from "vitest";

import { CreateCaseBody, ResumeBody, RunBody } from "./api";

describe("CreateCaseBody", () => {
  it("accepts text, a url, or a screenshot-only submission", () => {
    expect(CreateCaseBody.safeParse({ text: "hi" }).success).toBe(true);
    expect(CreateCaseBody.safeParse({ url: "https://a.com/job" }).success).toBe(true);
    expect(CreateCaseBody.safeParse({ hasScreenshot: true }).success).toBe(true);
  });

  it("rejects an empty body and hasScreenshot:false alone", () => {
    expect(CreateCaseBody.safeParse({}).success).toBe(false);
    expect(CreateCaseBody.safeParse({ hasScreenshot: false }).success).toBe(false);
  });

  it("rejects over-long text and non-http urls", () => {
    expect(CreateCaseBody.safeParse({ text: "x".repeat(20001) }).success).toBe(false);
    expect(CreateCaseBody.safeParse({ url: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("RunBody", () => {
  it("accepts no image or a supported one, rejects other mimes and >4 MB", () => {
    expect(RunBody.safeParse({}).success).toBe(true);
    expect(RunBody.safeParse({ image: { mime: "image/png", base64: "AAAA" } }).success).toBe(true);
    expect(RunBody.safeParse({ image: { mime: "image/gif", base64: "AAAA" } }).success).toBe(false);
    expect(RunBody.safeParse({ image: { mime: "image/png", base64: "A".repeat(4 * 1024 * 1024 + 1) } }).success).toBe(false);
  });
});

describe("ResumeBody", () => {
  it("accepts an answer or skip:true only", () => {
    expect(ResumeBody.safeParse({ answer: "Acme" }).success).toBe(true);
    expect(ResumeBody.safeParse({ skip: true }).success).toBe(true);
    expect(ResumeBody.safeParse({}).success).toBe(false);
    expect(ResumeBody.safeParse({ answer: "x".repeat(501) }).success).toBe(false);
  });
});
