import { Worker } from "bullmq";
import { queueConnection } from "./queues.js";

export const transcriptWorker = new Worker(
  "transcript",
  async (job) => {
    const { transcriptId, requestedBy } = job.data as {
      transcriptId: string;
      requestedBy: string;
    };

    // Production implementation renders PDF, uploads immutable object,
    // stores sha256 hash, and creates transcript_versions row in one job.
    return {
      transcriptId,
      requestedBy,
      status: "queued_for_renderer"
    };
  },
  {
    connection: queueConnection,
    concurrency: 4
  }
);
