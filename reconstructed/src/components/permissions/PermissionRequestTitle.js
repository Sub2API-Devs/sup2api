/**
 * components/permissions/PermissionRequestTitle.tsx
 *
 * 权限对话框标题行（工具名、子标题、队友 WorkerBadge）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/PermissionRequestTitle.tsx
 * pieces: chunk-3v13eg2e.js (11)
 * attribution: placement 10, fingerprint 1
 */
import { init_react_production, qt, Se, yt, Oo, y, P } from "../../../vendor/react/cjs/react.production.js";
import { DialogStoreContext } from "../../state/dialogQueue.js";
import { logError } from "../../utils/log.js";
import { toApprovalLabel } from "../../utils/permissions/approvalPayloadSerialization.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";

//@ chunk-3v13eg2e.js:759-763 placement
init_react_production();
//@ chunk-3v13eg2e.js:763-767 placement
init_react_production();
//@ chunk-3v13eg2e.js:767-784 placement
/**
 * 导出值：permissionTitleRef（权限标题 ref）；位于「权限对话框标题行（工具名、子标题、队友 WorkerBadge）」模块。
 */
var permissionTitleRef = qt(null);
//@ chunk-3v13eg2e.js:784-929 placement
/**
 * 返回一个回调：调用时通知对话框存储中当前对话框已被认领（onClaimed）。
 */
function useNotifyDialogClaimed() {
  let i = Se(permissionTitleRef);
  let t = Se(DialogStoreContext);
  return () => {
    if (i === null || !t) return;
    try {
      t.getState()
        .open.find((o) => o.id === i)
        ?.onClaimed?.();
    } catch (error) {
      logError(error);
    }
  };
}
//@ chunk-3v13eg2e.js:929-1142 placement
/**
 * 订阅并返回当前询问在本轮询问计数中的位置标签（如 2/3）。
 */
function useAskPositionLabel() {
  let i = Se(permissionTitleRef);
  let t = Se(DialogStoreContext);
  let countedAsk = i === null || !t ? undefined : t.getState().open.find((d) => d.id === i)?.countedAsk;
  let askTally = countedAsk === undefined ? undefined : t?.askTally;
  return yt(askTally?.subscribe ?? noopUnsubscribe, () =>
    countedAsk === undefined || !askTally ? null : askTally.positionLabel(countedAsk),
  );
}
//@ chunk-3v13eg2e.js:1142-1375 placement
/**
 * 对话框首次显示时执行一次回调（按对话框 id 与键去重；perReveal 时每次重新显示各算一次）。
 */
function useOnFirstReveal(i, t, { perReveal: o = false } = {}) {
  let u = Se(permissionTitleRef);
  let d = Se(DialogStoreContext);
  let A = Oo(t);
  let [a] = y(() => (o && u !== null && d ? (d.getState().open.find((p) => p.id === u)?.revealSeq ?? 0) : 0));
  P(() => {
    if (u !== null && d) {
      if (!d.firstReveal(u, o ? `${i}@${a}` : i)) return;
    }
    A();
  }, [u, d, i, o, a]);
}
//@ chunk-3v13eg2e.js:1375-1402 placement
function noopUnsubscribe() {
  return () => {};
}
//@ chunk-3v13eg2e.js:1402-1461 placement
function commandNameOf(i) {
  let approvalLabel = toApprovalLabel(i);
  return approvalLabel === null ? undefined : String(approvalLabel);
}
//@ chunk-3v13eg2e.js:1461-1849 placement
/**
 * 把权限请求来源（workflow-agent、subagent、remote-agent、plugin）转换为 "from the … agent" 之类的说明。
 */
function describeRequestSource(requestSource) {
  switch (requestSource?.type) {
    case "workflow-agent": {
      let t = commandNameOf(requestSource.workflowName);
      return t !== undefined ? `from the "${t}" workflow` : "from a workflow";
    }
    case "subagent": {
      let t = commandNameOf(requestSource.agentName);
      return t !== undefined ? `from the ${t} agent` : "from a subagent";
    }
    case "remote-agent":
      return "from a remote cloud agent";
    case "plugin": {
      let t = commandNameOf(requestSource.pluginName);
      return t === undefined ? "from a plugin" : `from the ${t} plugin`;
    }
  }
  return;
}
//@ chunk-3v13eg2e.js:1849-1929 placement
/**
 * 函数 fitsWithMeta（标题加元信息能否放进宽度）；位于「权限对话框标题行（工具名、子标题、队友 WorkerBadge）」模块。
 */
function fitsWithMeta(i, requestSource, o) {
  let u = describeRequestSource(requestSource);
  return bunStringWidth(i) + (u === undefined ? 0 : 1 + bunStringWidth(`\xB7 ${u}`)) <= o;
}
//@ chunk-3v13eg2e.js:1929-3158 fingerprint = PermissionRequestTitle (0.588)
/**
 * 权限对话框标题：工具名、副标题（截断）、队友徽章、读屏 aria-label。
 */
function PermissionRequestTitle(props) {
  let $ = w(25);
  let { title, subtitle, color, requestSource, srPrefix, aside } = props;
  let color_2 = color === undefined ? "permission" : color;
  let F;
  if ($[0] !== requestSource) {
    F = describeRequestSource(requestSource);
    $[0] = requestSource;
    $[1] = F;
  } else F = $[1];
  let c = F;
  const R = srPrefix !== undefined ? `${srPrefix} ${title}` : undefined;
  let f;
  if ($[2] !== color_2 || $[3] !== R || $[4] !== title) {
    f = jsxProd_default(Text, {
      "aria-label": R,
      bold: true,
      color: color_2,
      children: title,
    });
    $[2] = color_2;
    $[3] = R;
    $[4] = title;
    $[5] = f;
  } else f = $[5];
  let g;
  if ($[6] !== c) {
    g =
      c !== undefined &&
      jsxProd_default_2(Text, {
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: "\xB7 ",
          }),
          c,
        ],
      });
    $[6] = c;
    $[7] = g;
  } else g = $[7];
  let k;
  if ($[8] !== f || $[9] !== g) {
    k = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 1,
      children: [f, g],
    });
    $[8] = f;
    $[9] = g;
    $[10] = k;
  } else k = $[10];
  let C = k;
  let N;
  if ($[11] !== aside || $[12] !== requestSource || $[13] !== title) {
    N =
      aside !== undefined &&
      fitsWithMeta(title, requestSource, aside.rowColumns - 1 - bunStringWidth(aside.text));
    $[11] = aside;
    $[12] = requestSource;
    $[13] = title;
    $[14] = N;
  } else N = $[14];
  let L = N;
  const flexGrow = L ? 1 : undefined;
  let m;
  if ($[15] !== aside || $[16] !== L || $[17] !== C) {
    m = L
      ? jsxProd_default_2(Box, {
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 1,
          children: [
            C,
            jsxProd_default(Text, {
              dimColor: true,
              children: aside.text,
            }),
          ],
        })
      : C;
    $[15] = aside;
    $[16] = L;
    $[17] = C;
    $[18] = m;
  } else m = $[18];
  let b;
  if ($[19] !== subtitle) {
    b =
      subtitle != null &&
      (typeof subtitle === "string"
        ? jsxProd_default(Text, {
            dimColor: true,
            wrap: "truncate-start",
            children: subtitle,
          })
        : subtitle);
    $[19] = subtitle;
    $[20] = b;
  } else b = $[20];
  let T;
  if ($[21] !== b || $[22] !== flexGrow || $[23] !== m) {
    T = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexGrow,
      children: [m, b],
    });
    $[21] = b;
    $[22] = flexGrow;
    $[23] = m;
    $[24] = T;
  } else T = $[24];
  return T;
}
export {
  useOnFirstReveal,
  useNotifyDialogClaimed,
  PermissionRequestTitle,
  fitsWithMeta,
  permissionTitleRef,
  useAskPositionLabel,
  describeRequestSource,
};
