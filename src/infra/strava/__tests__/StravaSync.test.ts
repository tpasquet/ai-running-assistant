import { describe, it, expect, vi, beforeEach } from "vitest";
import { StravaSync } from "../StravaSync.js";

// Mock sleep so tests don't actually wait
vi.mock("../../../shared/utils/sleep.js", () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
}));

const mockClient = {
  getActivities: vi.fn(),
  getActivity: vi.fn(),
} as any;

const mockRepo = {
  upsert: vi.fn(),
} as any;

describe("StravaSync", () => {
  let sync: StravaSync;

  beforeEach(() => {
    vi.clearAllMocks();
    sync = new StravaSync(mockClient, mockRepo);
  });

  it("syncs all pages until empty response", async () => {
    mockClient.getActivities
      .mockResolvedValueOnce([
        {
          id: 1, type: "Run", start_date: "2024-01-15T10:00:00Z",
          distance: 10000, moving_time: 3600, elapsed_time: 3700,
          total_elevation_gain: 100, average_speed: 2.78, max_speed: 4.0,
        },
      ])
      .mockResolvedValueOnce([]); // second page empty → stop

    await sync.syncInitial("user-1");

    expect(mockClient.getActivities).toHaveBeenCalledTimes(2);
    expect(mockRepo.upsert).toHaveBeenCalledTimes(1);
  });

  it("filters out non-running activity types", async () => {
    mockClient.getActivities
      .mockResolvedValueOnce([
        {
          id: 1, type: "Run", start_date: "2024-01-15T10:00:00Z",
          distance: 10000, moving_time: 3600, elapsed_time: 3700,
          total_elevation_gain: 100, average_speed: 2.78, max_speed: 4.0,
        },
        {
          id: 2, type: "Ride", start_date: "2024-01-14T10:00:00Z",
          distance: 30000, moving_time: 5400, elapsed_time: 5400,
          total_elevation_gain: 200, average_speed: 5.55, max_speed: 8.0,
        },
      ])
      .mockResolvedValueOnce([]);

    await sync.syncInitial("user-1");

    expect(mockRepo.upsert).toHaveBeenCalledTimes(1); // only Run
  });

  it("syncs a single activity by stravaId", async () => {
    mockClient.getActivity.mockResolvedValueOnce({
      id: 999, type: "TrailRun", start_date: "2024-01-20T08:00:00Z",
      distance: 15000, moving_time: 5400, elapsed_time: 5500,
      total_elevation_gain: 400, average_speed: 2.78, max_speed: 3.5,
    });

    await sync.syncActivity("user-1", 999);

    expect(mockClient.getActivity).toHaveBeenCalledWith(999);
    expect(mockRepo.upsert).toHaveBeenCalledTimes(1);
  });

  it("skips non-running types in syncActivity", async () => {
    mockClient.getActivity.mockResolvedValueOnce({
      id: 888, type: "Swim", start_date: "2024-01-20T08:00:00Z",
      distance: 2000, moving_time: 1800, elapsed_time: 1800,
      total_elevation_gain: 0, average_speed: 1.1, max_speed: 1.5,
    });

    await sync.syncActivity("user-1", 888);

    expect(mockRepo.upsert).not.toHaveBeenCalled();
  });
});
