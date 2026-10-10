import { describe, expect, it } from "vitest";
import { FREE_WEBMAIL, KNOWN_ATS_HOSTS, KNOWN_JOB_BOARDS, SHORTENERS } from "./lists";

describe("static lists", () => {
  it("contain the SPEC §7 ATS hosts", () => {
    for (const h of ["boards.greenhouse.io", "job-boards.greenhouse.io", "jobs.lever.co",
      "jobs.ashbyhq.com", "careers.smartrecruiters.com", "jobs.smartrecruiters.com", "apply.workable.com"]) {
      expect(KNOWN_ATS_HOSTS).toContain(h);
    }
  });
  it("contain common job boards, webmail, and shorteners", () => {
    expect(KNOWN_JOB_BOARDS).toContain("linkedin.com");
    expect(FREE_WEBMAIL).toContain("gmail.com");
    expect(SHORTENERS).toContain("bit.ly");
  });
});
