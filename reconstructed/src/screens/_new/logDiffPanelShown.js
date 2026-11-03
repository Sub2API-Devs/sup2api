/**
 * screens/_new/logDiffPanelShown.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: sole-consumer-new 7
 */
import { j } from "../../../vendor/react/cjs/react.production.js";
import { OVe } from "../../utils/task/framework.js";
import { diffSidebarStore, takeDiffAutoOpenPending } from "../../hooks/useWorkspaceDiff.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { DIFF_SIDEBAR_MIN_COLUMNS, okt } from "../../plugins/bundled/diff/index.js";

//@ chunk-18hwfzwa.js:1821939-1821943 sole-consumer-new
j();
//@ chunk-18hwfzwa.js:1821943-1821984 sole-consumer-new
function fXs(It) {
  return It.panelFileView;
}
//@ chunk-18hwfzwa.js:1821984-1822158 sole-consumer-new
function closePanelFileView(Ot) {
  let panelFileView = Ot.panelFileView;
  if (panelFileView === null) {
    return Ot;
  }
  if (panelFileView.returnTo === "closed") {
    return { ...Ot, panelFileView: null, replTab: "convo" };
  }
  return { ...Ot, panelFileView: null };
}
//@ chunk-18hwfzwa.js:1822158-1822207 sole-consumer-new
function hXs(Ir) {
  return Ir.toolPermissionContext;
}
//@ chunk-18hwfzwa.js:1822207-1822231 sole-consumer-new
function bXs() {
  return !1;
}
/**
 * 记录 REPL 差异面板显示事件（自动或手动打开、终端宽度档），每个会话只记一次。
 */
//@ chunk-18hwfzwa.js:1822231-1822450 sole-consumer-new
function logDiffPanelShown(h, x, D) {
  if (OVe()) {
    let of = diffSidebarStore.of(h),
      ee = takeDiffAutoOpenPending(h) ? "auto_open" : "manual";
    if (x === of.lastLoggedSessionId) return;
    ((of.lastLoggedSessionId = x),
      logEvent("tengu_repl_diff_panel_shown", {
        trigger: fromEnum(ee),
        terminal_width_bucket: fromEnum(getTerminalWidthBucket(D)),
      }));
  }
}
//@ chunk-18hwfzwa.js:1822450-1822566 sole-consumer-new
function getTerminalWidthBucket(h) {
  if (h < DIFF_SIDEBAR_MIN_COLUMNS) return "under_110";
  if (h < okt) return "110_to_143";
  if (h < 200) return "144_to_199";
  return "200_plus";
}

export { logDiffPanelShown };
