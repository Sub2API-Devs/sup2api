/**
 * hooks/notifs/useDeprecationWarningNotification.tsx
 *
 * 所用模型即将弃用时的高优先级警告通知。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useDeprecationWarningNotification.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { getDeprecationStatusLine } from "../../utils/model/deprecation.js";

//@ chunk-18hwfzwa.js:1758852-1759190 fingerprint (2.1.88 match: useDeprecationWarningNotification, 0.754)
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
