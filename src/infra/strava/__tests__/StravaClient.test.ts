import { describe, it, expect, vi, beforeEach } from "vitest";
import { StravaClient } from "../StravaClient.js";
import { StravaRateLimitError } from "../../../shared/errors/AppError.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("StravaClient", () => {
  let client: StravaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new StravaClient("test-access-token");
  });

  it("fetches a page of activities", async () => {
    const mockActivities = [{ id: 1, type: "Run", distance: 10000 }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockActivities,
      headers: { get: () => null },
    });

    const result = await client.getActivities({
      after: new Date("2024-01-01"),
      page: 1,
      perPage: 100,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("after="),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-access-token",
        }),
      })
    );
    expect(result).toEqual(mockActivities);
  });

  it("fetches a single activity by id", async () => {
    const mockActivity = { id: 123456, type: "Run", distance: 5000 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockActivity,
      headers: { get: () => null },
    });

    const result = await client.getActivity(123456);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.strava.com/api/v3/activities/123456",
      expect.anything()
    );
    expect(result).toEqual(mockActivity);
  });

  it("throws StravaRateLimitError on 429", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: { get: (h: string) => (h === "X-RateLimit-Reset" ? "60" : null) },
    });

    await expect(client.getActivity(1)).rejects.toThrow(StravaRateLimitError);
  });

  it("throws AppError on non-200 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => null },
    });

    await expect(client.getActivity(1)).rejects.toThrow("Strava API error: 401");
  });
});
