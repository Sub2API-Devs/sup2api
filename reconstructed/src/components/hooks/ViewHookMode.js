/**
 * components/hooks/ViewHookMode.tsx
 *
 * /hooks 单个 hook 详情：命令/脚本、来源、插件、statusMessage，云会话中是否会运行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/hooks/ViewHookMode.tsx
 * pieces: chunk-bajxb7bf.js (3), chunk-mthxbav8.js (1)
 * attribution: fingerprint 3, affinity 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Mu, escapeControlChars } from "../../utils/stringUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, Fragment, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import {
  hookSourceDescriptionDisplayString,
  getHookDisplayText,
  getHookSourceEditHint,
} from "../../utils/hooks/hooksSettings.js";
import { FlexDirectionRow } from "../design-system/Table.js";
import { Text, Box } from "../../ink/components/Text.js";
import { DiffFrame } from "../FileEditToolDiff.js";
import { Dialog } from "../design-system/Dialog.js";
import { scriptHookDisplayLabel } from "../../utils/hooks/scriptHooks.js";

//@ chunk-bajxb7bf.js:44720-46942 fingerprint = ViewHookMode (0.41)
function ViewHookMode(t0) {
  let $ = w(45),
    { selectedHook: selectedHook, eventSupportsMatcher: eventSupportsMatcher, onCancel: onCancel } = t0,
    u;
  if ($[0] !== selectedHook.matcher)
    ((u = selectedHook.matcher ? Mu(selectedHook.matcher) : "matches everything"),
      ($[0] = selectedHook.matcher),
      ($[1] = u));
  else u = $[1];
  let t = u,
    f;
  if ($[2] !== selectedHook.config)
    ((f = hookTypeLabel(selectedHook.config)), ($[2] = selectedHook.config), ($[3] = f));
  else f = $[3];
  const k = eventSupportsMatcher ? `${selectedHook.event} \xB7 ${t}` : selectedHook.event;
  let C;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((C = e(KeyboardShortcutHint, { chord: "escape", action: "go back" })), ($[4] = C));
  else C = $[4];
  let D;
  if ($[5] === MEMO_CACHE_SENTINEL) ((D = [{ bold: !0 }, {}]), ($[5] = D));
  else D = $[5];
  let M;
  if ($[6] === MEMO_CACHE_SENTINEL) ((M = e(Fragment, { children: "Source:" })), ($[6] = M));
  else M = $[6];
  let g;
  if ($[7] !== selectedHook.source)
    ((g = hookSourceDescriptionDisplayString(selectedHook.source)), ($[7] = selectedHook.source), ($[8] = g));
  else g = $[8];
  let v;
  if ($[9] !== g)
    ((v = r(FlexDirectionRow.Row, { children: [M, e(Text, { dimColor: !0, children: g })] })),
      ($[9] = g),
      ($[10] = v));
  else v = $[10];
  let P;
  if ($[11] !== selectedHook.pluginName)
    ((P =
      selectedHook.pluginName &&
      r(FlexDirectionRow.Row, {
        children: [
          e(Fragment, { children: "Plugin:" }),
          e(Text, { dimColor: !0, children: Mu(selectedHook.pluginName) }),
        ],
      })),
      ($[11] = selectedHook.pluginName),
      ($[12] = P));
  else P = $[12];
  let _;
  if ($[13] !== selectedHook.config)
    ((_ =
      "statusMessage" in selectedHook.config &&
      selectedHook.config.statusMessage &&
      r(FlexDirectionRow.Row, {
        children: [
          e(Fragment, { children: "Status message:" }),
          e(Text, { dimColor: !0, children: Mu(selectedHook.config.statusMessage) }),
        ],
      })),
      ($[13] = selectedHook.config),
      ($[14] = _));
  else _ = $[14];
  let b;
  if ($[15] !== _ || $[16] !== v || $[17] !== P)
    ((b = r(FlexDirectionRow, { columns: D, children: [v, P, _] })),
      ($[15] = _),
      ($[16] = v),
      ($[17] = P),
      ($[18] = b));
  else b = $[18];
  let E;
  if ($[19] !== selectedHook.config)
    ((E = getContentFieldLabel(selectedHook.config)), ($[19] = selectedHook.config), ($[20] = E));
  else E = $[20];
  let B;
  if ($[21] !== E) ((B = e(Text, { dimColor: !0, children: E })), ($[21] = E), ($[22] = B));
  else B = $[22];
  let N;
  if ($[23] !== selectedHook.config)
    ((N =
      selectedHook.config.type === "script"
        ? (selectedHook.config.file ?? selectedHook.config.script ?? "")
        : getHookDisplayText(selectedHook.config)),
      ($[23] = selectedHook.config),
      ($[24] = N));
  else N = $[24];
  let L;
  if ($[25] !== N) ((L = escapeControlChars(N)), ($[25] = N), ($[26] = L));
  else L = $[26];
  let x;
  if ($[27] !== L) ((x = e(DiffFrame, { children: e(Text, { children: L }) })), ($[27] = L), ($[28] = x));
  else x = $[28];
  let Y;
  if ($[29] !== B || $[30] !== x)
    ((Y = r(Box, { flexDirection: "column", children: [B, x] })), ($[29] = B), ($[30] = x), ($[31] = Y));
  else Y = $[31];
  let W;
  if ($[32] !== selectedHook)
    ((W = getHookSourceEditHint(selectedHook)), ($[32] = selectedHook), ($[33] = W));
  else W = $[33];
  let X;
  if ($[34] !== W) ((X = e(Text, { dimColor: !0, children: W })), ($[34] = W), ($[35] = X));
  else X = $[35];
  let ne;
  if ($[36] !== b || $[37] !== Y || $[38] !== X)
    ((ne = r(Box, { flexDirection: "column", gap: 1, children: [b, Y, X] })),
      ($[36] = b),
      ($[37] = Y),
      ($[38] = X),
      ($[39] = ne));
  else ne = $[39];
  let ce;
  if ($[40] !== onCancel || $[41] !== f || $[42] !== ne || $[43] !== k)
    ((ce = e(Dialog, { title: f, subtitle: k, onCancel: onCancel, inputGuide: C, children: ne })),
      ($[40] = onCancel),
      ($[41] = f),
      ($[42] = ne),
      ($[43] = k),
      ($[44] = ce));
  else ce = $[44];
  return ce;
}
//@ chunk-bajxb7bf.js:46942-47171 affinity
function hookTypeLabel(m) {
  switch (m.type) {
    case "command":
      return "Command hook";
    case "prompt":
      return "Prompt hook";
    case "agent":
      return "Agent hook";
    case "http":
      return "HTTP hook";
    case "mcp_tool":
      return "MCP tool hook";
    case "script":
      return "Script hook";
  }
}
//@ chunk-bajxb7bf.js:47988-48218 fingerprint = getContentFieldLabel (0.684)
function getContentFieldLabel(config) {
  switch (config.type) {
    case "command":
      return "Command";
    case "prompt":
      return "Prompt";
    case "agent":
      return "Prompt";
    case "http":
      return "URL";
    case "mcp_tool":
      return "MCP tool";
    case "script":
      return config.file !== void 0 ? "Script file" : "Script";
  }
}
//@ chunk-mthxbav8.js:4203-4469 fingerprint = getContentFieldValue (0.677)
function getContentFieldValue(config) {
  switch (config.type) {
    case "command":
      return config.args === void 0 ? config.command : [config.command, ...config.args].join(" ");
    case "http":
      return config.url;
    case "prompt":
    case "agent":
      return config.prompt;
    case "mcp_tool":
      return `${config.server}/${config.tool}`;
    case "script":
      return config.file ?? scriptHookDisplayLabel(config.script ?? "");
  }
}

export { ViewHookMode, getContentFieldValue };
