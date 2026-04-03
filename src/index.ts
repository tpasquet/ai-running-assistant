/**
 * RunCoach AI - Entry point
 * Iteration 1: AI layer with mock data
 */

import { startServer } from "./api/server.js";

// Start the Fastify server
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
