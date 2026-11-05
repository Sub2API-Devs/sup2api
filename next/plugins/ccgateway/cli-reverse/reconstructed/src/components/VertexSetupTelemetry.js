/**
 * components/VertexSetupTelemetry.ts
 *
 * 2.1.316 新增：Vertex 设置向导遥测
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2c81dxgn.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logEvent } from "../services/analytics/index.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ProviderSetupWizard } from "./ProviderSetupRestart.js";
import { VertexSetupWizard } from "./vertexSetup/VertexSetupWizard.js";

//@ chunk-2c81dxgn.js:16435-16608 placement
/**
 * /setup-vertex 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function runVertexSetup(onDone, context) {
  logEvent("tengu_vertex_setup_started", {});
  return jsxProd_default(ProviderSetupWizard, {
    Wizard: VertexSetupWizard,
    cancelledEvent: "tengu_vertex_setup_cancelled",
    targetProvider: "vertex",
    onDone,
    context,
  });
}
export { runVertexSetup };
