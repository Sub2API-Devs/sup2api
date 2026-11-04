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
import {
  isRemoteSessionAvailable,
  getRemoteCaps,
  isRemoteControlChannelAvailable,
} from "../../remote/remoteMode.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import {
  CloudSessionRulesTab,
  readCloudSessionRules,
} from "../../components/permissions/rules/CloudSessionRulesTab.js";
import { PermissionRuleList } from "../../components/permissions/rules/PermissionRuleList.js";
import { createPermissionRetryMessage, createSystemMessage } from "../../utils/messages.js";
import { stripAnsi } from "../../utils/stripAnsi.js";

//@ chunk-p2qwpk2k.js:93185-93554 callgraph-witnessed (2.1.88 match: call, 0.288)
/**
 * /permissions 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var call = async (onDone, context) => {
  if (isRemoteSessionAvailable()) {
    let remoteCaps = getRemoteCaps();
    if (!remoteCaps || !isRemoteControlChannelAvailable()) {
      onDone("Permission rules aren't available over this remote connection");
      return null;
    }
    return jsxProd_default(CloudSessionRulesTab, {
      onExit: onDone,
      rulesRead: readCloudSessionRules(remoteCaps, context.abortController.signal),
    });
  }
  let isMidTurn = context.isMidTurn === true;
  return jsxProd_default(PermissionRuleList, {
    onExit: onDone,
    isMidTurn,
    onRetryDenials: (commands, denials) => {
      context.applyMessageOp({
        type: "append",
        messages: [
          createPermissionRetryMessage(commands, isMidTurn),
          ...denials.map((commands) => createSystemMessage(stripAnsi(commands), "notice")),
        ],
      });
    },
  });
};
export { call };
