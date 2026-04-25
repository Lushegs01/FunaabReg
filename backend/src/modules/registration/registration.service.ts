import type { Prisma } from "@prisma/client";
import type { AuthContext } from "../../common/auth/middleware.js";
import { prisma } from "../../common/db/prisma.js";
import { forbidden, HttpError, notFound } from "../../common/errors.js";
import type { CreateRegistrationInput } from "./registration.schema.js";

async function getStudentForAuth(auth: AuthContext) {
  if (!auth.universityId) {
    throw forbidden();
  }

  const student = await prisma.student.findFirst({
    where: {
      userId: auth.userId,
      universityId: auth.universityId
    }
  });

  if (!student) {
    throw notFound("Student profile");
  }

  return student;
}

export async function createRegistration(auth: AuthContext, input: CreateRegistrationInput) {
  const student = await getStudentForAuth(auth);

  const session = await prisma.academicSession.findFirst({
    where: {
      id: input.academicSessionId,
      universityId: auth.universityId!
    }
  });

  if (!session) {
    throw notFound("Academic session");
  }

  return prisma.studentRegistration.upsert({
    where: {
      universityId_studentId_academicSessionId: {
        universityId: auth.universityId!,
        studentId: student.id,
        academicSessionId: session.id
      }
    },
    create: {
      universityId: auth.universityId!,
      studentId: student.id,
      academicSessionId: session.id,
      status: "draft"
    },
    update: {}
  });
}

export async function submitRegistration(auth: AuthContext, registrationId: string) {
  const student = await getStudentForAuth(auth);
  const registration = await prisma.studentRegistration.findFirst({
    where: {
      id: registrationId,
      universityId: auth.universityId!,
      studentId: student.id
    },
    include: {
      documents: {
        select: { documentType: true, status: true }
      }
    }
  });

  if (!registration) {
    throw notFound("Registration");
  }

  const requiredDocuments = ["waec", "jamb", "admission_letter"];
  const uploadedTypes = new Set(
    registration.documents.map((document: { documentType: string }) => document.documentType)
  );
  const missing = requiredDocuments.filter((type) => !uploadedTypes.has(type));

  if (missing.length > 0) {
    throw new HttpError(422, "Required documents are missing.", "missing_documents");
  }

  return prisma.studentRegistration.update({
    where: { id: registration.id },
    data: {
      status: "submitted",
      submittedAt: new Date()
    }
  });
}

export async function verifyRegistration(auth: AuthContext, registrationId: string) {
  if (!auth.universityId || !(auth.roles.includes("admin") || auth.roles.includes("super_admin"))) {
    throw forbidden();
  }

  const registration = await prisma.studentRegistration.findFirst({
    where: {
      id: registrationId,
      universityId: auth.universityId
    }
  });

  if (!registration) {
    throw notFound("Registration");
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.studentRegistration.update({
      where: { id: registration.id },
      data: {
        status: "verified",
        verifiedBy: auth.userId,
        verifiedAt: new Date(),
        rejectionReason: null
      }
    });

    await tx.student.update({
      where: { id: registration.studentId },
      data: { recordStatus: "verified" }
    });

    return updated;
  });
}

export async function rejectRegistration(auth: AuthContext, registrationId: string, reason: string) {
  if (!auth.universityId || !(auth.roles.includes("admin") || auth.roles.includes("super_admin"))) {
    throw forbidden();
  }

  const registration = await prisma.studentRegistration.findFirst({
    where: {
      id: registrationId,
      universityId: auth.universityId
    }
  });

  if (!registration) {
    throw notFound("Registration");
  }

  return prisma.studentRegistration.update({
    where: { id: registration.id },
    data: {
      status: "rejected",
      verifiedBy: auth.userId,
      verifiedAt: new Date(),
      rejectionReason: reason
    }
  });
}
