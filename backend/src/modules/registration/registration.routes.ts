import type { FastifyInstance } from "fastify";
import { requireAuth, requirePermission } from "../../common/auth/middleware.js";
import { audit } from "../../common/audit/audit.service.js";
import { completeDocumentSchema, presignDocumentSchema } from "../documents/document-upload.schema.js";
import * as documentUploadService from "../documents/document-upload.service.js";
import { createRegistrationSchema, reviewRegistrationSchema } from "./registration.schema.js";
import * as registrationService from "./registration.service.js";

export async function registrationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  app.post("/", { preHandler: [requirePermission("registration.write")] }, async (request, reply) => {
    const input = createRegistrationSchema.parse(request.body);
    const registration = await registrationService.createRegistration(request.auth!, input);

    await audit(request, {
      action: "registration.create",
      targetType: "student_registration",
      targetId: registration.id
    });

    return reply.status(201).send({ registration });
  });

  app.post("/:id/submit", { preHandler: [requirePermission("registration.write")] }, async (request, reply) => {
    const registrationId = String((request.params as { id: string }).id);
    const registration = await registrationService.submitRegistration(request.auth!, registrationId);

    await audit(request, {
      action: "registration.submit",
      targetType: "student_registration",
      targetId: registration.id
    });

    return reply.send({ registration });
  });

  app.post("/:id/documents/presign", { preHandler: [requirePermission("document.upload")] }, async (request, reply) => {
    const registrationId = String((request.params as { id: string }).id);
    const input = presignDocumentSchema.parse(request.body);
    const result = await documentUploadService.presignRegistrationDocument(request.auth!, registrationId, input);

    await audit(request, {
      action: "document.presign_upload",
      targetType: "registration_document",
      targetId: result.documentId,
      metadata: { documentType: input.documentType, byteSize: input.byteSize }
    });

    return reply.send(result);
  });

  app.post("/:id/documents/complete", { preHandler: [requirePermission("document.upload")] }, async (request, reply) => {
    const registrationId = String((request.params as { id: string }).id);
    const input = completeDocumentSchema.parse(request.body);
    const document = await documentUploadService.completeRegistrationDocument(request.auth!, registrationId, input.documentId);

    await audit(request, {
      action: "document.complete_upload",
      targetType: "registration_document",
      targetId: document.id
    });

    return reply.send({ document });
  });

  app.post("/:id/verify", { preHandler: [requirePermission("registration.verify")] }, async (request, reply) => {
    const registrationId = String((request.params as { id: string }).id);
    const registration = await registrationService.verifyRegistration(request.auth!, registrationId);

    await audit(request, {
      action: "registration.verify",
      targetType: "student_registration",
      targetId: registration.id
    });

    return reply.send({ registration });
  });

  app.post("/:id/reject", { preHandler: [requirePermission("registration.verify")] }, async (request, reply) => {
    const registrationId = String((request.params as { id: string }).id);
    const input = reviewRegistrationSchema.required({ reason: true }).parse(request.body);
    await registrationService.rejectRegistration(request.auth!, registrationId, input.reason);

    await audit(request, {
      action: "registration.reject",
      targetType: "student_registration",
      targetId: registrationId,
      metadata: { reason: input.reason }
    });

    return reply.status(204).send();
  });
}
