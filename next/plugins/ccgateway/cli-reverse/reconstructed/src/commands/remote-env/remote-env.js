/**
 * commands/remote-env/remote-env.tsx
 *
 * /remote-env 实现：选择云端代理默认环境
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/remote-env/remote-env.tsx
 * pieces: chunk-h5403648.js (1)
 * attribution: callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { RemoteEnvironmentDialog } from "../../components/RemoteEnvironmentDialog.js";

//@ chunk-h5403648.js:21029-21074 callgraph-fingerprint (2.1.88 match: call, 1)
/**
 * /remote-env 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone) {
  return jsxProd_default(RemoteEnvironmentDialog, {
    onDone,
  });
}
export { call };
