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
import { j, y, P } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { Me } from "./design-system/ThemeProvider.js";
import { isLiteLog, loadFullLog, getSessionIdFromLog } from "../utils/sessionStorage.js";
import {
  dropApiInvalidAssistantBlocks,
  dropMalformedAttachments,
  dropRetractedMessages_2 as dropRetractedMessages,
} from "../utils/transcript/deserialize.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getAllBaseTools } from "../tools.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WorkerBadge } from "./permissions/WorkerBadge.js";
import { Box, Text } from "../ink/components/Text.js";
import { Byline } from "./design-system/Byline.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { LogoHeader } from "./Messages.js";
import { ExportTranscriptView } from "../utils/exportRenderer.js";
import { formatRelativeTimeAgo } from "../utils/format.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";

//@ chunk-b79vwm1h.js:1859-1863 placement
j();
//@ chunk-b79vwm1h.js:1863-1867 placement
j();
//@ chunk-b79vwm1h.js:1867-4216 fingerprint = SessionPreview (0.704)
function SessionPreview(t0) {
  let $ = w(36),
    { log: log, onExit: onExit, onSelect: onSelect } = t0,
    [u, m] = y(null),
    { storageV5: storageV5 } = Me(),
    _,
    F;
  if ($[0] !== log || $[1] !== storageV5)
    ((_ = () => {
      if ((m(null), isLiteLog(log))) loadFullLog(log, { storageV5: storageV5 }).then(m);
    }),
      (F = [log, storageV5]),
      ($[0] = log),
      ($[1] = storageV5),
      ($[2] = _),
      ($[3] = F));
  else ((_ = $[2]), (F = $[3]));
  P(_, F);
  let E = isLiteLog(log) && u === null,
    g = u ?? log,
    X;
  if ($[4] !== g.messages)
    ((X = dropApiInvalidAssistantBlocks(dropMalformedAttachments(dropRetractedMessages(g.messages)), {
      site: "preview",
    })),
      ($[4] = g.messages),
      ($[5] = X));
  else X = $[5];
  let B = X,
    Ve;
  if ($[6] !== g) ((Ve = getSessionIdFromLog(g) || ""), ($[6] = g), ($[7] = Ve));
  else Ve = $[7];
  let Fe = Ve,
    Se;
  if ($[8] === MEMO_CACHE_SENTINEL) ((Se = getAllBaseTools()), ($[8] = Se));
  else Se = $[8];
  let Ce = Se,
    ee;
  if ($[9] === MEMO_CACHE_SENTINEL) ((ee = { context: "Confirmation" }), ($[9] = ee));
  else ee = $[9];
  useKeybinding("confirm:no", onExit, ee);
  let M;
  if ($[10] !== u || $[11] !== log || $[12] !== onSelect)
    ((M = () => {
      onSelect(u ?? log);
    }),
      ($[10] = u),
      ($[11] = log),
      ($[12] = onSelect),
      ($[13] = M));
  else M = $[13];
  let T = M,
    qe;
  if ($[14] === MEMO_CACHE_SENTINEL) ((qe = { context: "Confirmation" }), ($[14] = qe));
  else qe = $[14];
  if ((useKeybinding("confirm:yes", T, qe), E)) {
    let te;
    if ($[15] === MEMO_CACHE_SENTINEL)
      ((te = e(WorkerBadge, { message: "Loading session\u2026" })), ($[15] = te));
    else te = $[15];
    let G;
    if ($[16] === MEMO_CACHE_SENTINEL)
      ((G = r(Box, {
        flexDirection: "column",
        padding: 1,
        children: [
          te,
          e(Text, {
            dimColor: !0,
            children: e(Byline, {
              children: e(ConfigurableShortcutHint, {
                action: "confirm:no",
                context: "Confirmation",
                fallback: "Esc",
                description: "cancel",
              }),
            }),
          }),
        ],
      })),
        ($[16] = G));
    else G = $[16];
    return G;
  }
  let te;
  if ($[17] === MEMO_CACHE_SENTINEL) ((te = e(LogoHeader, { latchAnnouncementSlot: !1 })), ($[17] = te));
  else te = $[17];
  let G;
  if ($[18] !== Fe || $[19] !== B)
    ((G = { kind: "static", messages: B, conversationId: Fe }), ($[18] = Fe), ($[19] = B), ($[20] = G));
  else G = $[20];
  let Y;
  if ($[21] === MEMO_CACHE_SENTINEL) ((Y = []), ($[21] = Y));
  else Y = $[21];
  let Te;
  if ($[22] !== G)
    ((Te = e(ExportTranscriptView, {
      source: G,
      tools: Ce,
      commands: Y,
      screen: "transcript",
      history: "all",
    })),
      ($[22] = G),
      ($[23] = Te));
  else Te = $[23];
  let ne;
  if ($[24] !== g.modified) ((ne = formatRelativeTimeAgo(g.modified)), ($[24] = g.modified), ($[25] = ne));
  else ne = $[25];
  const t14 = g.gitBranch ? ` \xB7 ${g.gitBranch}` : "";
  let re;
  if ($[26] !== g.messageCount || $[27] !== ne || $[28] !== t14)
    ((re = r(Text, { children: [ne, " \xB7", " ", g.messageCount, " messages", t14] })),
      ($[26] = g.messageCount),
      ($[27] = ne),
      ($[28] = t14),
      ($[29] = re));
  else re = $[29];
  let A;
  if ($[30] === MEMO_CACHE_SENTINEL)
    ((A = e(Text, {
      dimColor: !0,
      children: r(Byline, {
        children: [
          e(KeyboardShortcutHint, { chord: "enter", action: "resume" }),
          e(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Confirmation",
            fallback: "Esc",
            description: "cancel",
          }),
        ],
      }),
    })),
      ($[30] = A));
  else A = $[30];
  let W;
  if ($[31] !== re)
    ((W = r(Box, {
      flexShrink: 0,
      flexDirection: "column",
      borderTopDimColor: !0,
      borderBottom: !1,
      borderLeft: !1,
      borderRight: !1,
      borderStyle: "single",
      paddingLeft: 2,
      children: [re, A],
    })),
      ($[31] = re),
      ($[32] = W));
  else W = $[32];
  let K;
  if ($[33] !== Te || $[34] !== W)
    ((K = r(Box, { flexDirection: "column", children: [te, Te, W] })),
      ($[33] = Te),
      ($[34] = W),
      ($[35] = K));
  else K = $[35];
  return K;
}

export { SessionPreview };
