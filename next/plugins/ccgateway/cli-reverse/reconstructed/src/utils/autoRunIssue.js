/**
 * utils/autoRunIssue.tsx
 *
 * 自动运行 /issue 前的确认提示组件（Esc 取消）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/autoRunIssue.tsx
 * pieces: chunk-mx6cbnn0.js (1)
 * attribution: callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Spinner } from "../components/Spinner.js";
import { Box, Text } from "../ink/components/Text.js";

//@ chunk-mx6cbnn0.js:11725-12188 callgraph-fingerprint (2.1.88 match: AutoRunIssueNotification, 0.382)
function AutoRunIssueNotification(props) {
  let $ = useMemoCache(7);
  let { label, onCancel } = props;
  let keyHandlerConfig;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    keyHandlerConfig = {
      context: "Confirmation",
    };
    $[0] = keyHandlerConfig;
  } else keyHandlerConfig = $[0];
  useKeybinding("confirm:no", onCancel, keyHandlerConfig);
  let spinner;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    spinner = jsxProd_default(Spinner, {});
    $[1] = spinner;
  } else spinner = $[1];
  let labelRow;
  if ($[2] !== label) {
    labelRow = jsxProd_default_2(Box, {
      gap: 1,
      children: [
        spinner,
        jsxProd_default(Text, {
          children: label,
        }),
      ],
    });
    $[2] = label;
    $[3] = labelRow;
  } else labelRow = $[3];
  let t5;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    t5 = jsxProd_default(Text, {
      dimColor: true,
      children: "Press Esc to cancel",
    });
    $[4] = t5;
  } else t5 = $[4];
  let t6;
  if ($[5] !== labelRow) {
    t6 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [labelRow, t5],
    });
    $[5] = labelRow;
    $[6] = t6;
  } else t6 = $[6];
  return t6;
}
export { AutoRunIssueNotification };
