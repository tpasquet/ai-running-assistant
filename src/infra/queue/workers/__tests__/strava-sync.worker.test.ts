import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the worker module dependencies before importing the processor
vi.mock("../../../cache/redis.js", () => ({
  redis: { on: vi.fn(), disconnect: vi.fn() },
}));
vi.mock("../../../db/prisma.js", () => ({
  prisma: {},
}));

import { processStravaJob } from "../strava-sync.worker.js";

const mockSync = {
  syncInitial: vi.fn(),
  syncActivity: vi.fn(),
} as any;

const mockOAuth = {
  getAccessToken: vi.fn().mockResolvedValue("access-token-123"),
} as any;

const syncFactory = vi.fn().mockReturnValue(mockSync);

describe("processStravaJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    syncFactory.mockReturnValue(mockSync);
    mockOAuth.getAccessToken.mockResolvedValue("access-token-123");
  });

  it("handles initial-sync job", async () => {
    await processStravaJob(
      { data: { type: "initial-sync", userId: "user-1" } } as any,
      mockOAuth,
      syncFactory
    );

    expect(mockOAuth.getAccessToken).toHaveBeenCalledWith("user-1");
    expect(syncFactory).toHaveBeenCalledWith("access-token-123");
    expect(mockSync.syncInitial).toHaveBeenCalledWith("user-1");
    expect(mockSync.syncActivity).not.toHaveBeenCalled();
  });

  it("handles sync-activity job", async () => {
    await processStravaJob(
      {
        data: {
          type: "sync-activity",
          userId: "user-1",
          stravaActivityId: 999,
          stravaOwnerId: 42,
        },
      } as any,
      mockOAuth,
      syncFactory
    );

    expect(mockSync.syncActivity).toHaveBeenCalledWith("user-1", 999);
    expect(mockSync.syncInitial).not.toHaveBeenCalled();
  });
});
