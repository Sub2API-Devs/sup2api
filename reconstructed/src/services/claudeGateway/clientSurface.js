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
/**
 * 判断会话是否为网关托管的 Claude Code 桌面会话（underCode 且带 desktopSessionPayload）。
 */
function isManagedClaudeCodeDesktopSession(e) {
  return e?.underCode === true && e.desktopSessionPayload !== undefined;
}
//@ chunk-1ny7cxrt.js:1383221-1383830 placement
/**
 * 生成发给客户端的网关引导配置：推理提供方、OTLP 端点、托管设置派生项、禁用内置工具与过期时间。
 */
function buildClientBootstrapConfig(e, policy, n, o) {
  let settings = policy?.payload.settings ?? {};
  let disabledBuiltinToolsFromSettings = getDisabledBuiltinToolsFromSettings(settings);
  let desktop = policy?.desktop;
  let l = unionStringLists(
    disabledBuiltinToolsFromSettings.disabledBuiltinTools,
    desktop?.disabledBuiltinTools,
  );
  let c =
    desktop === undefined
      ? undefined
      : {
          ...desktop,
          ...(l === undefined
            ? {}
            : {
                disabledBuiltinTools: l,
              }),
        };
  let publicUrl = e.telemetry.forward_to.length > 0 && e.listen.public_url;
  return {
    inferenceProvider: "gateway",
    inferenceGatewayBaseUrl: o,
    inferenceCredentialKind: "interactive",
    ...(isManagedClaudeCodeDesktopSession(policy) && {
      inferenceGatewayManagedClaudeCode: true,
    }),
    ...(publicUrl && {
      otlpEndpoint: o,
      otlpProtocol: otlpProtocol(settings),
      otlpResourceAttributes: buildUserResourceAttributes(n, e.telemetry.resource_attributes),
    }),
    ...buildInferenceModels(e, policy ?? undefined, settings),
    ...disabledBuiltinToolsFromSettings,
    ...coworkEgressHosts(settings),
    ...c,
    expiresAt: Math.floor(Date.now() / 1000) + e.session.ttl_hours * 3600,
  };
}
export { isManagedClaudeCodeDesktopSession, buildClientBootstrapConfig };
