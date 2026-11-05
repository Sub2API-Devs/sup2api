/**
 * components/InvalidConfigDialog.tsx
 *
 * 配置文件 JSON 无效时的对话框（退出修复 / 重置）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/InvalidConfigDialog.tsx
 * pieces: chunk-ej15czdh.js (3)
 * attribution: fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";
import { getBaseRenderOptions } from "../utils/renderOptions.js";
import { render } from "../ink/hooks/useTerminalHooks.js";
import { AppRoot } from "./AppRoot.js";
import { writeFileSync_DEPRECATED, jsonStringify } from "../utils/slowOperations.js";

//@ chunk-ej15czdh.js:16285-17341 fingerprint (2.1.88 match: InvalidConfigDialog, 0.687)
function InvalidConfigDialog(props) {
  let $ = useMemoCache(19);
  let { filePath, errorDescription, onExit, onReset } = props;
  let t1;
  if ($[0] !== onExit || $[1] !== onReset) {
    t1 = (value) => {
      if (value === "exit") onExit();
      else onReset();
    };
    $[0] = onExit;
    $[1] = onReset;
    $[2] = t1;
  } else t1 = $[2];
  let handleSelect = t1;
  let t2;
  if ($[3] !== filePath) {
    t2 = jsxProd_default_2(Text, {
      children: [
        "The configuration file at ",
        jsxProd_default(Text, {
          bold: true,
          children: filePath,
        }),
        " contains invalid JSON.",
      ],
    });
    $[3] = filePath;
    $[4] = t2;
  } else t2 = $[4];
  let t3;
  if ($[5] !== errorDescription) {
    t3 = jsxProd_default(Text, {
      children: errorDescription,
    });
    $[5] = errorDescription;
    $[6] = t3;
  } else t3 = $[6];
  let t4;
  if ($[7] !== t2 || $[8] !== t3) {
    t4 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [t2, t3],
    });
    $[7] = t2;
    $[8] = t3;
    $[9] = t4;
  } else t4 = $[9];
  let t5;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    t5 = jsxProd_default(Text, {
      bold: true,
      children: "Choose an option:",
    });
    $[10] = t5;
  } else t5 = $[10];
  let options;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        label: "Exit and fix manually",
        value: "exit",
      },
      {
        label: "Reset with default configuration",
        value: "reset",
      },
    ];
    $[11] = options;
  } else options = $[11];
  let t7;
  if ($[12] !== handleSelect || $[13] !== onExit) {
    t7 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        t5,
        jsxProd_default(ModelSelector, {
          options,
          onChange: handleSelect,
          onCancel: onExit,
        }),
      ],
    });
    $[12] = handleSelect;
    $[13] = onExit;
    $[14] = t7;
  } else t7 = $[14];
  let t8;
  if ($[15] !== onExit || $[16] !== t4 || $[17] !== t7) {
    t8 = jsxProd_default_2(Dialog, {
      title: "Configuration error",
      color: "error",
      onCancel: onExit,
      children: [t4, t7],
    });
    $[15] = onExit;
    $[16] = t4;
    $[17] = t7;
    $[18] = t8;
  } else t8 = $[18];
  return t8;
}
//@ chunk-ej15czdh.js:17341-17354 fingerprint (2.1.88 match: SAFE_ERROR_THEME_NAME, 1)
var SAFE_ERROR_THEME_NAME = "dark";
//@ chunk-ej15czdh.js:17354-17681 fingerprint (2.1.88 match: showInvalidConfigDialog, 1)
async function showInvalidConfigDialog({ error }) {
  let renderOptions = {
    ...getBaseRenderOptions(false),
    theme: SAFE_ERROR_THEME_NAME,
  };
  await new Promise(async (resolve) => {
    let { unmount } = await render(
      jsxProd_default(AppRoot, {
        children: jsxProd_default(InvalidConfigDialog, {
          filePath: error.filePath,
          errorDescription: error.message,
          onExit: () => {
            unmount();
            resolve();
            process.exit(1);
          },
          onReset: () => {
            writeFileSync_DEPRECATED(error.filePath, jsonStringify(error.defaultConfig, null, 2), {
              flush: false,
              encoding: "utf8",
            });
            unmount();
            resolve();
            process.exit(0);
          },
        }),
      }),
      renderOptions,
    );
  });
}
export { showInvalidConfigDialog };
