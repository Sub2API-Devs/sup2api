/**
 * components/VertexSetupTelemetry.ts
 *
 * 2.1.316 新增：Vertex 设置向导遥测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8nayjra0.js (1)
 * attribution: placement 1
 */
import { logEvent } from "../services/analytics/index.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ProviderSetupWizard } from "./ProviderSetupRestart.js";
import { VertexSetupWizard } from "./vertexSetup/VertexSetupWizard.js";

//@ chunk-8nayjra0.js:15259-15432 placement
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
