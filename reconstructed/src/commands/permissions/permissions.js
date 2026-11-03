/**
 * commands/permissions/permissions.tsx
 *
 * /permissions 实现：本地规则编辑器，远程连接时只读查看
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/permissions/permissions.tsx
 * pieces: chunk-p2qwpk2k.js (1)
 * attribution: callgraph-witnessed 1
 */
import { wt, Jn, ml } from "../../remote/remoteMode.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import {
  CloudSessionRulesTab,
  readCloudSessionRules,
} from "../../components/permissions/rules/CloudSessionRulesTab.js";
import { PermissionRuleList } from "../../components/permissions/rules/PermissionRuleList.js";
import { createPermissionRetryMessage, createSystemMessage } from "../../utils/messages.js";
import { Yn } from "../../utils/stripAnsi.js";

/**
 * /permissions 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-p2qwpk2k.js:93185-93554 callgraph-witnessed = call (0.288)
var call = async (onDone, context) => {
  if (wt()) {
    let a = Jn();
    if (!a || !ml()) return (onDone("Permission rules aren't available over this remote connection"), null);
    return e(CloudSessionRulesTab, {
      onExit: onDone,
      rulesRead: readCloudSessionRules(a, context.abortController.signal),
    });
  }
  let m = context.isMidTurn === !0;
  return e(PermissionRuleList, {
    onExit: onDone,
    isMidTurn: m,
    onRetryDenials: (a, f) => {
      context.applyMessageOp({
        type: "append",
        messages: [
          createPermissionRetryMessage(a, m),
          ...f.map((commands) => createSystemMessage(Yn(commands), "notice")),
        ],
      });
    },
  });
};
