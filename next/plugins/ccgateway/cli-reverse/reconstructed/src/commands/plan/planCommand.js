/**
 * commands/plan/planCommand.tsx
 *
 * 2.1.316 新增：/plan 命令。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-dgr63j8a.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { RENAME_NOTICE } from "../usage-credits/renameNotice.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-dgr63j8a.js:4782-4998 placement
/**
 * /extra-usage 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var callPlanCommand = async (onDone, context) => {
  let { call } = await import("../usage-credits/usageCredits.js");
  let result = await call(
    (result, options) =>
      onDone(
        result
          ? `${RENAME_NOTICE}

${result}`
          : RENAME_NOTICE,
        options,
      ),
    context,
  );
  if (result == null) return result;
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    children: [
      jsxProd_default(Text, {
        dimColor: true,
        children: RENAME_NOTICE,
      }),
      result,
    ],
  });
};
export { callPlanCommand };
