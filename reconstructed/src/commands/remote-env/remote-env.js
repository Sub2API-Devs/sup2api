/**
 * commands/remote-env/remote-env.tsx
 *
 * /remote-env 实现：选择云端代理默认环境
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/remote-env/remote-env.tsx
 * pieces: chunk-zj31az9x.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { RemoteEnvironmentDialog } from "../../components/RemoteEnvironmentDialog.js";

/**
 * /remote-env 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-zj31az9x.js:19855-19900 callgraph-fingerprint = call (1)
async function call(onDone) {
  return e(RemoteEnvironmentDialog, { onDone: onDone });
}
