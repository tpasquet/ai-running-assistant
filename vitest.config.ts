import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.test.ts",
        "**/__tests__/**",
        "**/tools/**",
        "**/nodes/**",
        "**/mocks/**",
        "**/api/**",
        "**/types/**",
        "src/index.ts",
        "vitest.config.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 40,
        branches: 70,
        statements: 70,
      },
    },
  },
});
