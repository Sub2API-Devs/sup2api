/**
 * components/permissions/PermissionRequestTitle.tsx
 *
 * 权限对话框标题行（工具名、子标题、队友 WorkerBadge）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/PermissionRequestTitle.tsx
 * pieces: chunk-dbmqtrf0.js (11)
 * attribution: placement 10, fingerprint 1
 */
import {
  init_react_production,
  createContext,
  useContext,
  useSyncExternalStore,
  useEffectEvent,
  useState,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { DialogStoreContext } from "../../state/dialogQueue.js";
import { logError } from "../../utils/log.js";
import { toApprovalLabel } from "../../utils/permissions/approvalPayloadSerialization.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dbmqtrf0.js:764-768 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dbmqtrf0.js:764", () => {
  init_react_production();
});
//@ chunk-dbmqtrf0.js:768-772 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dbmqtrf0.js:768", () => {
  init_react_production();
});
//@ chunk-dbmqtrf0.js:772-789 placement
/**
 * 导出值：permissionTitleRef（权限标题 ref）；位于「权限对话框标题行（工具名、子标题、队友 WorkerBadge）」模块。
 */
var permissionTitleRef; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dbmqtrf0.js:772", () => {
  permissionTitleRef = createContext(null);
});
//@ chunk-dbmqtrf0.js:789-934 placement
/**
 * 返回一个回调：调用时通知对话框存储中当前对话框已被认领（onClaimed）。
 */
function useNotifyDialogClaimed() {
  let titleRef = useContext(permissionTitleRef);
  let dialogStore = useContext(DialogStoreContext);
  return () => {
    if (titleRef === null || !dialogStore) return;
    try {
      dialogStore
        .getState()
        .open.find((state) => state.id === titleRef)
        ?.onClaimed?.();
    } catch (error) {
      logError(error);
    }
  };
}
//@ chunk-dbmqtrf0.js:934-1147 placement
/**
 * 订阅并返回当前询问在本轮询问计数中的位置标签（如 2/3）。
 */
function useAskPositionLabel() {
  let titleRef = useContext(permissionTitleRef);
  let dialogStore = useContext(DialogStoreContext);
  let countedAsk =
    titleRef === null || !dialogStore
      ? undefined
      : dialogStore.getState().open.find((state) => state.id === titleRef)?.countedAsk;
  let askTally = countedAsk === undefined ? undefined : dialogStore?.askTally;
  return useSyncExternalStore(askTally?.subscribe ?? noopUnsubscribe, () =>
    countedAsk === undefined || !askTally ? null : askTally.positionLabel(countedAsk),
  );
}
//@ chunk-dbmqtrf0.js:1147-1380 placement
/**
 * 对话框首次显示时执行一次回调（按对话框 id 与键去重；perReveal 时每次重新显示各算一次）。
 */
function useOnFirstReveal(revealKey, onReveal, { perReveal = false } = {}) {
  let titleRef = useContext(permissionTitleRef);
  let dialogStore = useContext(DialogStoreContext);
  let onRevealRef = useEffectEvent(onReveal);
  let [revealSeq] = useState(() =>
    perReveal && titleRef !== null && dialogStore
      ? (dialogStore.getState().open.find((state) => state.id === titleRef)?.revealSeq ?? 0)
      : 0,
  );
  useEffect(() => {
    if (titleRef !== null && dialogStore) {
      if (!dialogStore.firstReveal(titleRef, perReveal ? `${revealKey}@${revealSeq}` : revealKey)) return;
    }
    onRevealRef();
  }, [titleRef, dialogStore, revealKey, perReveal, revealSeq]);
}
//@ chunk-dbmqtrf0.js:1380-1407 placement
function noopUnsubscribe() {
  return () => {};
}
//@ chunk-dbmqtrf0.js:1407-1467 placement
function commandNameOf(command) {
  let approvalLabel = toApprovalLabel(command);
  return approvalLabel === null ? undefined : String(approvalLabel);
}
//@ chunk-dbmqtrf0.js:1467-1858 placement
/**
 * 把权限请求来源（workflow-agent、subagent、remote-agent、plugin）转换为 "from the … agent" 之类的说明。
 */
function describeRequestSource(requestSource) {
  switch (requestSource?.type) {
    case "workflow-agent": {
      let workflowName = commandNameOf(requestSource.workflowName);
      return workflowName !== undefined ? `from the "${workflowName}" workflow` : "from a workflow";
    }
    case "subagent": {
      let agentName = commandNameOf(requestSource.agentName);
      return agentName !== undefined ? `from the ${agentName} agent` : "from a subagent";
    }
    case "remote-agent":
      return "from a remote cloud agent";
    case "plugin": {
      let pluginName = commandNameOf(requestSource.pluginName);
      return pluginName === undefined ? "from a plugin" : `from the ${pluginName} plugin`;
    }
  }
  return;
}
//@ chunk-dbmqtrf0.js:1858-1938 placement
/**
 * 函数 fitsWithMeta（标题加元信息能否放进宽度）；位于「权限对话框标题行（工具名、子标题、队友 WorkerBadge）」模块。
 */
function fitsWithMeta(title, requestSource, width) {
  let sourceText = describeRequestSource(requestSource);
  return (
    bunStringWidth(title) + (sourceText === undefined ? 0 : 1 + bunStringWidth(`\xB7 ${sourceText}`)) <= width
  );
}
//@ chunk-dbmqtrf0.js:1938-3167 fingerprint (2.1.88 match: PermissionRequestTitle, 0.589)
/**
 * 权限对话框标题：工具名、副标题（截断）、队友徽章、读屏 aria-label。
 */
function PermissionRequestTitle(props) {
  let $ = useMemoCache(25);
  let { title, subtitle, color, requestSource, srPrefix, aside } = props;
  let color_2 = color === undefined ? "permission" : color;
  let sourceLabel;
  if ($[0] !== requestSource) {
    sourceLabel = describeRequestSource(requestSource);
    $[0] = requestSource;
    $[1] = sourceLabel;
  } else sourceLabel = $[1];
  let sourceText = sourceLabel;
  const screenReaderLabel = srPrefix !== undefined ? `${srPrefix} ${title}` : undefined;
  let textElement;
  if ($[2] !== color_2 || $[3] !== screenReaderLabel || $[4] !== title) {
    textElement = jsxProd_default(Text, {
      "aria-label": screenReaderLabel,
      bold: true,
      color: color_2,
      children: title,
    });
    $[2] = color_2;
    $[3] = screenReaderLabel;
    $[4] = title;
    $[5] = textElement;
  } else textElement = $[5];
  let sourceElement;
  if ($[6] !== sourceText) {
    sourceElement =
      sourceText !== undefined &&
      jsxProd_default_2(Text, {
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: "\xB7 ",
          }),
          sourceText,
        ],
      });
    $[6] = sourceText;
    $[7] = sourceElement;
  } else sourceElement = $[7];
  let titleRow;
  if ($[8] !== textElement || $[9] !== sourceElement) {
    titleRow = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 1,
      children: [textElement, sourceElement],
    });
    $[8] = textElement;
    $[9] = sourceElement;
    $[10] = titleRow;
  } else titleRow = $[10];
  let titleRowValue = titleRow;
  let asideElement;
  if ($[11] !== aside || $[12] !== requestSource || $[13] !== title) {
    asideElement =
      aside !== undefined &&
      fitsWithMeta(title, requestSource, aside.rowColumns - 1 - bunStringWidth(aside.text));
    $[11] = aside;
    $[12] = requestSource;
    $[13] = title;
    $[14] = asideElement;
  } else asideElement = $[14];
  let asideValue = asideElement;
  const flexGrow = asideValue ? 1 : undefined;
  let headerRow;
  if ($[15] !== aside || $[16] !== asideValue || $[17] !== titleRowValue) {
    headerRow = asideValue
      ? jsxProd_default_2(Box, {
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 1,
          children: [
            titleRowValue,
            jsxProd_default(Text, {
              dimColor: true,
              children: aside.text,
            }),
          ],
        })
      : titleRowValue;
    $[15] = aside;
    $[16] = asideValue;
    $[17] = titleRowValue;
    $[18] = headerRow;
  } else headerRow = $[18];
  let subtitleElement;
  if ($[19] !== subtitle) {
    subtitleElement =
      subtitle != null &&
      (typeof subtitle === "string"
        ? jsxProd_default(Text, {
            dimColor: true,
            wrap: "truncate-start",
            children: subtitle,
          })
        : subtitle);
    $[19] = subtitle;
    $[20] = subtitleElement;
  } else subtitleElement = $[20];
  let headerColumn;
  if ($[21] !== subtitleElement || $[22] !== flexGrow || $[23] !== headerRow) {
    headerColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexGrow,
      children: [headerRow, subtitleElement],
    });
    $[21] = subtitleElement;
    $[22] = flexGrow;
    $[23] = headerRow;
    $[24] = headerColumn;
  } else headerColumn = $[24];
  return headerColumn;
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
