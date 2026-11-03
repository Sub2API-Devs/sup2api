/**
 * services/claudeGateway/clientSurface.ts
 *
 * 2.1.316 新增：网关客户端类型识别
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (2)
 * attribution: placement 2
 */
import { getDisabledBuiltinToolsFromSettings } from "../../utils/swarm/permissionSync.js";
import { unionStringLists } from "./desktopSettings.js";
import { otlpProtocol, coworkEgressHosts } from "./telemetry/otlpConfig.js";
import { buildUserResourceAttributes, buildInferenceModels } from "./telemetry/resourceAttributes.js";

//@ chunk-1ny7cxrt.js:1383147-1383221 placement
function zd(e) {
  return e?.underCode === !0 && e.desktopSessionPayload !== void 0;
}
/**
 * 生成发给客户端的网关引导配置：推理提供方、OTLP 端点、托管设置派生项、禁用内置工具与过期时间。
 */
//@ chunk-1ny7cxrt.js:1383221-1383830 placement
function buildClientBootstrapConfig(e, t, n, o) {
  let r = t?.payload.settings ?? {},
    s = getDisabledBuiltinToolsFromSettings(r),
    a = t?.desktop,
    l = unionStringLists(s.disabledBuiltinTools, a?.disabledBuiltinTools),
    c = a === void 0 ? void 0 : { ...a, ...(l === void 0 ? {} : { disabledBuiltinTools: l }) },
    u = e.telemetry.forward_to.length > 0 && e.listen.public_url;
  return {
    inferenceProvider: "gateway",
    inferenceGatewayBaseUrl: o,
    inferenceCredentialKind: "interactive",
    ...(zd(t) && { inferenceGatewayManagedClaudeCode: !0 }),
    ...(u && {
      otlpEndpoint: o,
      otlpProtocol: otlpProtocol(r),
      otlpResourceAttributes: buildUserResourceAttributes(n, e.telemetry.resource_attributes),
    }),
    ...buildInferenceModels(e, t ?? void 0, r),
    ...s,
    ...coworkEgressHosts(r),
    ...c,
    expiresAt: Math.floor(Date.now() / 1000) + e.session.ttl_hours * 3600,
  };
}

export { zd, buildClientBootstrapConfig };
