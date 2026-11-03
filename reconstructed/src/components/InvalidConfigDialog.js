/**
 * components/InvalidConfigDialog.tsx
 *
 * 配置文件 JSON 无效时的对话框（退出修复 / 重置）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/InvalidConfigDialog.tsx
 * pieces: chunk-zenpc8qn.js (3)
 * attribution: fingerprint 3
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";
import { getBaseRenderOptions } from "../utils/renderOptions.js";
import { render } from "../ink/hooks/useTerminalHooks.js";
import { AppRoot } from "./AppRoot.js";
import { writeFileSync_DEPRECATED, jsonStringify } from "../utils/slowOperations.js";

//@ chunk-zenpc8qn.js:15109-16165 fingerprint = InvalidConfigDialog (0.687)
function InvalidConfigDialog(t0) {
  let $ = w(19),
    { filePath: filePath, errorDescription: errorDescription, onExit: onExit, onReset: onReset } = t0,
    u;
  if ($[0] !== onExit || $[1] !== onReset)
    ((u = (value) => {
      if (value === "exit") onExit();
      else onReset();
    }),
      ($[0] = onExit),
      ($[1] = onReset),
      ($[2] = u));
  else u = $[2];
  let handleSelect = u,
    f;
  if ($[3] !== filePath)
    ((f = r(Text, {
      children: [
        "The configuration file at ",
        e(Text, { bold: !0, children: filePath }),
        " contains invalid JSON.",
      ],
    })),
      ($[3] = filePath),
      ($[4] = f));
  else f = $[4];
  let p;
  if ($[5] !== errorDescription)
    ((p = e(Text, { children: errorDescription })), ($[5] = errorDescription), ($[6] = p));
  else p = $[6];
  let m;
  if ($[7] !== f || $[8] !== p)
    ((m = r(Box, { flexDirection: "column", gap: 1, children: [f, p] })), ($[7] = f), ($[8] = p), ($[9] = m));
  else m = $[9];
  let R;
  if ($[10] === MEMO_CACHE_SENTINEL)
    ((R = e(Text, { bold: !0, children: "Choose an option:" })), ($[10] = R));
  else R = $[10];
  let x;
  if ($[11] === MEMO_CACHE_SENTINEL)
    ((x = [
      { label: "Exit and fix manually", value: "exit" },
      { label: "Reset with default configuration", value: "reset" },
    ]),
      ($[11] = x));
  else x = $[11];
  let c;
  if ($[12] !== handleSelect || $[13] !== onExit)
    ((c = r(Box, {
      flexDirection: "column",
      children: [R, e(ModelSelector, { options: x, onChange: handleSelect, onCancel: onExit })],
    })),
      ($[12] = handleSelect),
      ($[13] = onExit),
      ($[14] = c));
  else c = $[14];
  let P;
  if ($[15] !== onExit || $[16] !== m || $[17] !== c)
    ((P = r(Dialog, { title: "Configuration error", color: "error", onCancel: onExit, children: [m, c] })),
      ($[15] = onExit),
      ($[16] = m),
      ($[17] = c),
      ($[18] = P));
  else P = $[18];
  return P;
}
//@ chunk-zenpc8qn.js:16165-16178 fingerprint = SAFE_ERROR_THEME_NAME (1)
var SAFE_ERROR_THEME_NAME = "dark";
//@ chunk-zenpc8qn.js:16178-16505 fingerprint = showInvalidConfigDialog (1)
async function showInvalidConfigDialog({ error: error }) {
  let renderOptions = { ...getBaseRenderOptions(!1), theme: SAFE_ERROR_THEME_NAME };
  await new Promise(async (resolve) => {
    let { unmount: unmount } = await render(
      e(AppRoot, {
        children: e(InvalidConfigDialog, {
          filePath: error.filePath,
          errorDescription: error.message,
          onExit: () => {
            (unmount(), resolve(), process.exit(1));
          },
          onReset: () => {
            (writeFileSync_DEPRECATED(error.filePath, jsonStringify(error.defaultConfig, null, 2), {
              flush: !1,
              encoding: "utf8",
            }),
              unmount(),
              resolve(),
              process.exit(0));
          },
        }),
      }),
      renderOptions,
    );
  });
}
