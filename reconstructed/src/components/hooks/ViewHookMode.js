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
import { escapeControlCharsForDisplay, escapeControlChars } from "../../utils/stringUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  Fragment,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
function ViewHookMode(props) {
  let $ = w(45);
  let { selectedHook, eventSupportsMatcher, onCancel } = props;
  let u;
  if ($[0] !== selectedHook.matcher) {
    u = selectedHook.matcher ? escapeControlCharsForDisplay(selectedHook.matcher) : "matches everything";
    $[0] = selectedHook.matcher;
    $[1] = u;
  } else u = $[1];
  let t = u;
  let title;
  if ($[2] !== selectedHook.config) {
    title = hookTypeLabel(selectedHook.config);
    $[2] = selectedHook.config;
    $[3] = title;
  } else title = $[3];
  const subtitle = eventSupportsMatcher ? `${selectedHook.event} \xB7 ${t}` : selectedHook.event;
  let inputGuide;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "go back",
    });
    $[4] = inputGuide;
  } else inputGuide = $[4];
  let columns;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    columns = [
      {
        bold: true,
      },
      {},
    ];
    $[5] = columns;
  } else columns = $[5];
  let M;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    M = jsxProd_default(Fragment, {
      children: "Source:",
    });
    $[6] = M;
  } else M = $[6];
  let children;
  if ($[7] !== selectedHook.source) {
    children = hookSourceDescriptionDisplayString(selectedHook.source);
    $[7] = selectedHook.source;
    $[8] = children;
  } else children = $[8];
  let t5;
  if ($[9] !== children) {
    t5 = jsxProd_default_2(FlexDirectionRow.Row, {
      children: [
        M,
        jsxProd_default(Text, {
          dimColor: true,
          children,
        }),
      ],
    });
    $[9] = children;
    $[10] = t5;
  } else t5 = $[10];
  let t6;
  if ($[11] !== selectedHook.pluginName) {
    t6 =
      selectedHook.pluginName &&
      jsxProd_default_2(FlexDirectionRow.Row, {
        children: [
          jsxProd_default(Fragment, {
            children: "Plugin:",
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: escapeControlCharsForDisplay(selectedHook.pluginName),
          }),
        ],
      });
    $[11] = selectedHook.pluginName;
    $[12] = t6;
  } else t6 = $[12];
  let _;
  if ($[13] !== selectedHook.config) {
    _ =
      "statusMessage" in selectedHook.config &&
      selectedHook.config.statusMessage &&
      jsxProd_default_2(FlexDirectionRow.Row, {
        children: [
          jsxProd_default(Fragment, {
            children: "Status message:",
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: escapeControlCharsForDisplay(selectedHook.config.statusMessage),
          }),
        ],
      });
    $[13] = selectedHook.config;
    $[14] = _;
  } else _ = $[14];
  let b;
  if ($[15] !== _ || $[16] !== t5 || $[17] !== t6) {
    b = jsxProd_default_2(FlexDirectionRow, {
      columns,
      children: [t5, t6, _],
    });
    $[15] = _;
    $[16] = t5;
    $[17] = t6;
    $[18] = b;
  } else b = $[18];
  let children_2;
  if ($[19] !== selectedHook.config) {
    children_2 = getContentFieldLabel(selectedHook.config);
    $[19] = selectedHook.config;
    $[20] = children_2;
  } else children_2 = $[20];
  let B;
  if ($[21] !== children_2) {
    B = jsxProd_default(Text, {
      dimColor: true,
      children: children_2,
    });
    $[21] = children_2;
    $[22] = B;
  } else B = $[22];
  let t10;
  if ($[23] !== selectedHook.config) {
    t10 =
      selectedHook.config.type === "script"
        ? (selectedHook.config.file ?? selectedHook.config.script ?? "")
        : getHookDisplayText(selectedHook.config);
    $[23] = selectedHook.config;
    $[24] = t10;
  } else t10 = $[24];
  let children_3;
  if ($[25] !== t10) {
    children_3 = escapeControlChars(t10);
    $[25] = t10;
    $[26] = children_3;
  } else children_3 = $[26];
  let x;
  if ($[27] !== children_3) {
    x = jsxProd_default(DiffFrame, {
      children: jsxProd_default(Text, {
        children: children_3,
      }),
    });
    $[27] = children_3;
    $[28] = x;
  } else x = $[28];
  let Y;
  if ($[29] !== B || $[30] !== x) {
    Y = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [B, x],
    });
    $[29] = B;
    $[30] = x;
    $[31] = Y;
  } else Y = $[31];
  let children_4;
  if ($[32] !== selectedHook) {
    children_4 = getHookSourceEditHint(selectedHook);
    $[32] = selectedHook;
    $[33] = children_4;
  } else children_4 = $[33];
  let X;
  if ($[34] !== children_4) {
    X = jsxProd_default(Text, {
      dimColor: true,
      children: children_4,
    });
    $[34] = children_4;
    $[35] = X;
  } else X = $[35];
  let children_5;
  if ($[36] !== b || $[37] !== Y || $[38] !== X) {
    children_5 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [b, Y, X],
    });
    $[36] = b;
    $[37] = Y;
    $[38] = X;
    $[39] = children_5;
  } else children_5 = $[39];
  let t16;
  if ($[40] !== onCancel || $[41] !== title || $[42] !== children_5 || $[43] !== subtitle) {
    t16 = jsxProd_default(Dialog, {
      title,
      subtitle,
      onCancel,
      inputGuide,
      children: children_5,
    });
    $[40] = onCancel;
    $[41] = title;
    $[42] = children_5;
    $[43] = subtitle;
    $[44] = t16;
  } else t16 = $[44];
  return t16;
}
//@ chunk-bajxb7bf.js:46942-47171 affinity
function hookTypeLabel(config) {
  switch (config.type) {
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
      return config.file !== undefined ? "Script file" : "Script";
  }
}
//@ chunk-mthxbav8.js:4203-4469 fingerprint = getContentFieldValue (0.677)
function getContentFieldValue(config) {
  switch (config.type) {
    case "command":
      return config.args === undefined ? config.command : [config.command, ...config.args].join(" ");
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
