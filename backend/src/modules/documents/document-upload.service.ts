import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import type { AuthContext } from "../../common/auth/middleware.js";
import { prisma } from "../../common/db/prisma.js";
import { forbidden, HttpError, notFound } from "../../common/errors.js";
import { s3 } from "../../common/storage/s3.js";
import { env } from "../../config/env.js";
import type { PresignDocumentInput } from "./document-upload.schema.js";

const safeFileSegment = (fileName: string): string => {
  const extension = extname(fileName).toLowerCase();
  return `${randomUUID()}${extension || ".bin"}`;
};

function canAccessRegistration(auth: AuthContext, registration: { student: { userId: string | null } }): boolean {
  if (auth.roles.includes("admin") || auth.roles.includes("super_admin")) {
    return true;
  }

  return auth.roles.includes("student") && registration.student.userId === auth.userId;
}

export async function presignRegistrationDocument(
  auth: AuthContext,
  registrationId: string,
  input: PresignDocumentInput
) {
  if (input.byteSize > env.MAX_UPLOAD_BYTES) {
    throw new HttpError(413, "File is larger than the allowed upload size.", "upload_too_large");
  }

  if (!auth.universityId) {
    throw forbidden();
  }

  const registration = await prisma.studentRegistration.findFirst({
    where: {
      id: registrationId,
      universityId: auth.universityId
    },
    include: {
      student: {
        select: { userId: true }
      }
    }
  });

  if (!registration) {
    throw notFound("Registration");
  }

  if (!canAccessRegistration(auth, registration)) {
    throw forbidden();
  }

  if (registration.status === "verified") {
    throw new HttpError(409, "Verified registrations cannot accept new documents.", "registration_locked");
  }

  const previous = await prisma.registrationDocument.findFirst({
    where: {
      registrationId,
      documentType: input.documentType
    },
    orderBy: { version: "desc" },
    select: { version: true }
  });

  const version = (previous?.version ?? 0) + 1;
  const objectKey = [
    "universities",
    auth.universityId,
    "registrations",
    registrationId,
    input.documentType,
    `v${version}`,
    safeFileSegment(input.fileName)
  ].join("/");

  const document = await prisma.registrationDocument.create({
    data: {
      universityId: auth.universityId,
      registrationId,
      documentType: input.documentType,
      objectKey,
      fileName: input.fileName,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      sha256Hash: input.sha256Hash.toLowerCase(),
      version,
      status: "pending",
      uploadedBy: auth.userId
    }
  });

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: objectKey,
    ContentType: input.mimeType,
    ContentLength: input.byteSize,
    Metadata: {
      documentId: document.id,
      registrationId,
      sha256: input.sha256Hash.toLowerCase()
    }
  });

  return {
    documentId: document.id,
    objectKey,
    uploadUrl: await getSignedUrl(s3, command, { expiresIn: 900 }),
    requiredHeaders: {
      "Content-Type": input.mimeType
    },
    expiresInSeconds: 900
  };
}

export async function completeRegistrationDocument(auth: AuthContext, registrationId: string, documentId: string) {
  if (!auth.universityId) {
    throw forbidden();
  }

  const document = await prisma.registrationDocument.findFirst({
    where: {
      id: documentId,
      registrationId,
      universityId: auth.universityId
    },
    include: {
      registration: {
        include: {
          student: {
            select: { userId: true }
          }
        }
      }
    }
  });

  if (!document) {
    throw notFound("Document");
  }

  if (!canAccessRegistration(auth, document.registration)) {
    throw forbidden();
  }

  return prisma.registrationDocument.update({
    where: { id: document.id },
    data: { status: "submitted" },
    select: {
      id: true,
      registrationId: true,
      documentType: true,
      status: true,
      uploadedAt: true
    }
  });
}
