import { z } from "zod";

export const presignDocumentSchema = z.object({
  documentType: z.enum(["waec", "jamb", "admission_letter", "birth_certificate", "lga_identification"]),
  fileName: z.string().min(1).max(180),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  byteSize: z.number().int().positive(),
  sha256Hash: z.string().regex(/^[a-f0-9]{64}$/i)
});

export const completeDocumentSchema = z.object({
  documentId: z.string().uuid()
});

export type PresignDocumentInput = z.infer<typeof presignDocumentSchema>;
export type CompleteDocumentInput = z.infer<typeof completeDocumentSchema>;
