import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../../config/env.js";

export const queueConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null
});

export const emailQueue = new Queue("email", { connection: queueConnection });
export const transcriptQueue = new Queue("transcript", { connection: queueConnection });
export const verificationQueue = new Queue("verification", { connection: queueConnection });
export const fgExportQueue = new Queue("fg-export", { connection: queueConnection });

export const queues = {
  emailQueue,
  transcriptQueue,
  verificationQueue,
  fgExportQueue
};
