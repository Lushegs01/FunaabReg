import { z } from "zod";

export const createRegistrationSchema = z.object({
  academicSessionId: z.string().uuid()
});

export const submitRegistrationSchema = z.object({
  registrationId: z.string().uuid()
});

export const reviewRegistrationSchema = z.object({
  reason: z.string().trim().min(5).max(500).optional()
});

export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;
