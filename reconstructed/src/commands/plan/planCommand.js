/**
 * commands/plan/planCommand.tsx
 *
 * 2.1.316 新增：/plan 命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-139kcwcq.js (1)
 * attribution: placement 1
 */
import { RENAME_NOTICE } from "../usage-credits/renameNotice.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-139kcwcq.js:4446-4662 placement
/**
 * /extra-usage 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var callPlanCommand = async (onDone, context) => {
  let { call: t } = await import("./chunk-2gtphf4m.js");
  let o = await t(
    (a, c) =>
      onDone(
        a
          ? `${RENAME_NOTICE}

${a}`
          : RENAME_NOTICE,
        c,
      ),
    context,
  );
  if (o == null) return o;
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    children: [
      jsxProd_default(Text, {
        dimColor: true,
        children: RENAME_NOTICE,
      }),
      o,
    ],
  });
};
