import { z } from "zod";

import { HttpUrl } from "./domain";

/**
 * `POST /api/cases` body (SPEC §9). At least one of `text`, `url`, or `hasScreenshot: true`.
 * The image itself is never sent here; it goes to `/run`. `hasScreenshot` is stored as `input.hadScreenshot`.
 */
export const CreateCaseBody = z
  .object({
    text: z.string().max(20000).optional(),
    url: HttpUrl.optional(),
    hasScreenshot: z.boolean().optional(),
  })
  .refine((b) => Boolean(b.text?.trim()) || b.url !== undefined || b.hasScreenshot === true, {
    message: "provide text, a url, or a screenshot",
  });
export type CreateCaseBody = z.infer<typeof CreateCaseBody>;

/** `POST /api/cases/[id]/run` body. The image is transcribed once and never stored or traced. */
export const RunBody = z.object({
  image: z
    .object({
      mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
      base64: z.string().min(1).max(4 * 1024 * 1024),
    })
    .optional(),
});
export type RunBody = z.infer<typeof RunBody>;

/** `POST /api/cases/[id]/resume` body: answer the `needs_input` question, or skip it. */
export const ResumeBody = z.union([
  z.object({ answer: z.string().min(1).max(500) }),
  z.object({ skip: z.literal(true) }),
]);
export type ResumeBody = z.infer<typeof ResumeBody>;
