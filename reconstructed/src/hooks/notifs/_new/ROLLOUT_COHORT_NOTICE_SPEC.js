/**
 * hooks/notifs/_new/ROLLOUT_COHORT_NOTICE_SPEC.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: sole-consumer-new 1
 */
import { useStartupNotification } from "../useStartupNotification.js";

//@ chunk-18hwfzwa.js:1785931-1786045 sole-consumer-new
var ROLLOUT_COHORT_NOTICE_SPEC = {
  id: "rollout-cohort-notice",
  deps: (h) => [h.addNotification, h.removeNotification, h.storageV5],
  setup: () => useStartupNotification,
};

export { ROLLOUT_COHORT_NOTICE_SPEC };
