/**
 * components/SessionPreview.tsx
 *
 * 会话预览（在恢复前查看会话内容）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/SessionPreview.tsx
 * pieces: chunk-b79vwm1h.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { init_react_production, useState, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { isLiteLog, loadFullLog, getSessionIdFromLog } from "../utils/sessionStorage.js";
import {
  dropApiInvalidAssistantBlocks,
  dropMalformedAttachments,
  dropRetractedMessages_2 as dropRetractedMessages,
} from "../utils/transcript/deserialize.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getAllBaseTools } from "../tools.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WorkerBadge } from "./permissions/WorkerBadge.js";
import { Box, Text } from "../ink/components/Text.js";
import { Byline } from "./design-system/Byline.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { LogoHeader } from "./Messages.js";
import { ExportTranscriptView } from "../utils/exportRenderer.js";
import { formatRelativeTimeAgo } from "../utils/format.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-b79vwm1h.js:1859-1863 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-b79vwm1h.js:1859", () => {
  init_react_production();
});
//@ chunk-b79vwm1h.js:1863-1867 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-b79vwm1h.js:1863", () => {
  init_react_production();
});
//@ chunk-b79vwm1h.js:1867-4216 fingerprint (2.1.88 match: SessionPreview, 0.704)
function SessionPreview(props) {
  let $ = useMemoCache(36);
  let { log, onExit, onSelect } = props;
  let [fullLog, setFullLog] = useState(null);
  let { storageV5 } = useTheme_2();
  let loadLog;
  let t2;
  if ($[0] !== log || $[1] !== storageV5) {
    loadLog = () => {
      setFullLog(null);
      if (isLiteLog(log))
        loadFullLog(log, {
          storageV5,
        }).then(setFullLog);
    };
    t2 = [log, storageV5];
    $[0] = log;
    $[1] = storageV5;
    $[2] = loadLog;
    $[3] = t2;
  } else {
    loadLog = $[2];
    t2 = $[3];
  }
  useEffect(loadLog, t2);
  let isLoading = isLiteLog(log) && fullLog === null;
  let displayLog = fullLog ?? log;
  let displayMessages;
  if ($[4] !== displayLog.messages) {
    displayMessages = dropApiInvalidAssistantBlocks(
      dropMalformedAttachments(dropRetractedMessages(displayLog.messages)),
      {
        site: "preview",
      },
    );
    $[4] = displayLog.messages;
    $[5] = displayMessages;
  } else displayMessages = $[5];
  let messages = displayMessages;
  let sessionId;
  if ($[6] !== displayLog) {
    sessionId = getSessionIdFromLog(displayLog) || "";
    $[6] = displayLog;
    $[7] = sessionId;
  } else sessionId = $[7];
  let conversationId = sessionId;
  let t4;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    t4 = getAllBaseTools();
    $[8] = t4;
  } else t4 = $[8];
  let tools = t4;
  let t5;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    t5 = {
      context: "Confirmation",
    };
    $[9] = t5;
  } else t5 = $[9];
  useKeybinding("confirm:no", onExit, t5);
  let t6;
  if ($[10] !== fullLog || $[11] !== log || $[12] !== onSelect) {
    t6 = () => {
      onSelect(fullLog ?? log);
    };
    $[10] = fullLog;
    $[11] = log;
    $[12] = onSelect;
    $[13] = t6;
  } else t6 = $[13];
  let handleSelect = t6;
  let t7;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    t7 = {
      context: "Confirmation",
    };
    $[14] = t7;
  } else t7 = $[14];
  useKeybinding("confirm:yes", handleSelect, t7);
  if (isLoading) {
    let t8;
    if ($[15] === MEMO_CACHE_SENTINEL) {
      t8 = jsxProd_default(WorkerBadge, {
        message: "Loading session\u2026",
      });
      $[15] = t8;
    } else t8 = $[15];
    let t9;
    if ($[16] === MEMO_CACHE_SENTINEL) {
      t9 = jsxProd_default_2(Box, {
        flexDirection: "column",
        padding: 1,
        children: [
          t8,
          jsxProd_default(Text, {
            dimColor: true,
            children: jsxProd_default(Byline, {
              children: jsxProd_default(ConfigurableShortcutHint, {
                action: "confirm:no",
                context: "Confirmation",
                fallback: "Esc",
                description: "cancel",
              }),
            }),
          }),
        ],
      });
      $[16] = t9;
    } else t9 = $[16];
    return t9;
  }
  let logoHeaderElement;
  if ($[17] === MEMO_CACHE_SENTINEL) {
    logoHeaderElement = jsxProd_default(LogoHeader, {
      latchAnnouncementSlot: false,
    });
    $[17] = logoHeaderElement;
  } else logoHeaderElement = $[17];
  let source;
  if ($[18] !== conversationId || $[19] !== messages) {
    source = {
      kind: "static",
      messages,
      conversationId,
    };
    $[18] = conversationId;
    $[19] = messages;
    $[20] = source;
  } else source = $[20];
  let commands;
  if ($[21] === MEMO_CACHE_SENTINEL) {
    commands = [];
    $[21] = commands;
  } else commands = $[21];
  let t12;
  if ($[22] !== source) {
    t12 = jsxProd_default(ExportTranscriptView, {
      source,
      tools,
      commands,
      screen: "transcript",
      history: "all",
    });
    $[22] = source;
    $[23] = t12;
  } else t12 = $[23];
  let t13;
  if ($[24] !== displayLog.modified) {
    t13 = formatRelativeTimeAgo(displayLog.modified);
    $[24] = displayLog.modified;
    $[25] = t13;
  } else t13 = $[25];
  const t14 = displayLog.gitBranch ? ` \xB7 ${displayLog.gitBranch}` : "";
  let t15;
  if ($[26] !== displayLog.messageCount || $[27] !== t13 || $[28] !== t14) {
    t15 = jsxProd_default_2(Text, {
      children: [t13, " \xB7", " ", displayLog.messageCount, " messages", t14],
    });
    $[26] = displayLog.messageCount;
    $[27] = t13;
    $[28] = t14;
    $[29] = t15;
  } else t15 = $[29];
  let t16;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    t16 = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "resume",
          }),
          jsxProd_default(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Confirmation",
            fallback: "Esc",
            description: "cancel",
          }),
        ],
      }),
    });
    $[30] = t16;
  } else t16 = $[30];
  let t17;
  if ($[31] !== t15) {
    t17 = jsxProd_default_2(Box, {
      flexShrink: 0,
      flexDirection: "column",
      borderTopDimColor: true,
      borderBottom: false,
      borderLeft: false,
      borderRight: false,
      borderStyle: "single",
      paddingLeft: 2,
      children: [t15, t16],
    });
    $[31] = t15;
    $[32] = t17;
  } else t17 = $[32];
  let t18;
  if ($[33] !== t12 || $[34] !== t17) {
    t18 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [logoHeaderElement, t12, t17],
    });
    $[33] = t12;
    $[34] = t17;
    $[35] = t18;
  } else t18 = $[35];
  return t18;
}
export { SessionPreview };
