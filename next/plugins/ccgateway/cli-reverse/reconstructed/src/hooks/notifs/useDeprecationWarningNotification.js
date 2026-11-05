/**
 * hooks/notifs/useDeprecationWarningNotification.tsx
 *
 * 所用模型即将弃用时的高优先级警告通知。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useDeprecationWarningNotification.tsx
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getDeprecationStatusLine } from "../../utils/model/deprecation.js";

//@ chunk-czq1j3j2.js:1806113-1806451 fingerprint (2.1.88 match: useDeprecationWarningNotification, 0.753)
var useDeprecationWarningNotification = {
  id: "model-deprecation-warning",
  deps: (noticeState) => [
    noticeState.mainLoopModel,
    noticeState.userSpecifiedModel,
    noticeState.addNotification,
  ],
  setup() {
    let lastWarning = null;
    return ({ addNotification, mainLoopModel, userSpecifiedModel }) => {
      let deprecationWarning = getDeprecationStatusLine(userSpecifiedModel ?? mainLoopModel);
      if (deprecationWarning && deprecationWarning !== lastWarning) {
        lastWarning = deprecationWarning;
        addNotification({
          key: "model-deprecation-warning",
          kind: "warning",
          text: deprecationWarning,
          color: "warning",
          priority: "high",
        });
      }
      if (!deprecationWarning) lastWarning = null;
    };
  },
};
export { useDeprecationWarningNotification };
