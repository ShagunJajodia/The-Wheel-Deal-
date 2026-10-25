import { afterEach, vi } from "vitest";
import { cleanup, configure } from "@testing-library/react";

// The first render in each test file is slow while workers compete for CPU (cold jsdom, Tailwind,
// React Query), and findBy*/waitFor give up after 1s by default. That made the first test of a file
// flaky under the full suite while passing alone.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
