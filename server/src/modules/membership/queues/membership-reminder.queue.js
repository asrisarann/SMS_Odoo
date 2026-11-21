import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

/**
 * Configuration for Redis connection.
 * Can be overridden via REDIS_URL or REDIS_HOST / REDIS_PORT.
 */
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_URL = process.env.REDIS_URL || null;

const QUEUE_NAME = "membership-expiry-reminders";

let redisClient = null;
let reminderQueue = null;
let reminderWorker = null;
let isRedisConnected = false;
let registeredProcessor = null;

/**
 * Register or update the job processor function.
 */
export const setReminderProcessor = (processor) => {
  registeredProcessor = processor;
};

/**
 * Initialize Redis and BullMQ Queue.
 * If Redis is offline or not installed, gracefully falls back to an in-memory queue.
 */
export const initReminderQueue = async (jobProcessor) => {
  registeredProcessor = jobProcessor;

  try {
    const redisOptions = REDIS_URL
      ? REDIS_URL
      : {
          host: REDIS_HOST,
          port: REDIS_PORT,
          maxRetriesPerRequest: null,
          lazyConnect: true,
          enableOfflineQueue: false,
          retryStrategy: () => null, // Stop retrying if Redis is not running
        };

    redisClient = typeof redisOptions === "string" ? new IORedis(redisOptions) : new IORedis(redisOptions);

    redisClient.on("error", () => {
      // Catch connection errors silently to prevent unhandled node exceptions
    });

    await redisClient.connect();
    isRedisConnected = true;

    // Initialize BullMQ Queue
    reminderQueue = new Queue(QUEUE_NAME, {
      connection: redisClient,
    });

    // Initialize BullMQ Worker
    reminderWorker = new Worker(
      QUEUE_NAME,
      async (job) => {
        if (registeredProcessor) {
          await registeredProcessor(job.data);
        }
      },
      { connection: redisClient }
    );

    reminderWorker.on("completed", (job) => {
      console.log(`[BullMQ] Reminder job completed for user ${job.data?.email}`);
    });

    reminderWorker.on("failed", (job, err) => {
      console.error(`[BullMQ] Reminder job failed for user ${job.data?.email}:`, err.message);
    });

    console.log(`[Queue] BullMQ connected to Redis for '${QUEUE_NAME}'.`);
  } catch (error) {
    isRedisConnected = false;
    console.log(`[Queue] Redis is offline (${error.message}). Using simple async in-memory queue.`);
  }
};

/**
 * Add a reminder job to the queue.
 * Dispatches to BullMQ if Redis is running; otherwise processes directly via the registered worker function.
 */
export const addReminderJob = async (jobData) => {
  if (isRedisConnected && reminderQueue) {
    const job = await reminderQueue.add("send-expiry-reminder", jobData, {
      removeOnComplete: true,
      removeOnFail: 50,
    });
    return { queued: true, jobId: job.id, type: "bullmq" };
  }

  // In-memory fallback: process directly or via registered processor
  if (registeredProcessor) {
    try {
      await registeredProcessor(jobData);
      return { queued: true, jobId: `mem-${Date.now()}`, type: "in-memory" };
    } catch (err) {
      console.error(`[InMemoryQueue] Failed processing reminder for ${jobData.email}:`, err.message);
      return { queued: false, error: err.message };
    }
  }

  return { queued: false, error: "No processor registered" };
};

/**
 * Check if Redis is currently connected for BullMQ.
 */
export const isRedisActive = () => isRedisConnected;

/**
 * Gracefully close Redis, Queue, and Worker on server shutdown.
 */
export const closeReminderQueue = async () => {
  try {
    if (reminderWorker) {
      await reminderWorker.close();
      reminderWorker = null;
    }
    if (reminderQueue) {
      await reminderQueue.close();
      reminderQueue = null;
    }
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
    }
    isRedisConnected = false;
  } catch (err) {
    console.warn("[Queue] Error closing reminder queue:", err.message);
  }
};
