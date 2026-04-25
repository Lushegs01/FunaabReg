import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
  universityCode: z.string().trim().min(2).max(24).optional()
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(40)
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(40)
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
