/**
 * services/claudeGateway/clientSurface.ts
 *
 * 2.1.316 新增：网关客户端类型识别
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (2)
 * attribution: placement 2
 */
import { getDisabledBuiltinToolsFromSettings } from "../../utils/swarm/permissionSync.js";
import { unionStringLists } from "./desktopSettings.js";
import { otlpProtocol, coworkEgressHosts } from "./telemetry/otlpConfig.js";
import { buildUserResourceAttributes, buildInferenceModels } from "./telemetry/resourceAttributes.js";

//@ chunk-1hnjmk23.js:1384984-1385058 placement
/**
 * 判断会话是否为网关托管的 Claude Code 桌面会话（underCode 且带 desktopSessionPayload）。
 */
function isManagedClaudeCodeDesktopSession(policyEntry) {
  return policyEntry?.underCode === true && policyEntry.desktopSessionPayload !== undefined;
}
//@ chunk-1hnjmk23.js:1385058-1385667 placement
/**
 * 生成发给客户端的网关引导配置：推理提供方、OTLP 端点、托管设置派生项、禁用内置工具与过期时间。
 */
function buildClientBootstrapConfig(config, policyEntry, claims, publicUrl) {
  let settings = policyEntry?.payload.settings ?? {};
  let disabledBuiltinToolsFromSettings = getDisabledBuiltinToolsFromSettings(settings);
  let desktop = policyEntry?.desktop;
  let disabledTools = unionStringLists(
    disabledBuiltinToolsFromSettings.disabledBuiltinTools,
    desktop?.disabledBuiltinTools,
  );
  let desktopBlock =
    desktop === undefined
      ? undefined
      : {
          ...desktop,
          ...(disabledTools === undefined
            ? {}
            : {
                disabledBuiltinTools: disabledTools,
              }),
        };
  let publicUrl_2 = config.telemetry.forward_to.length > 0 && config.listen.public_url;
  return {
    inferenceProvider: "gateway",
    inferenceGatewayBaseUrl: publicUrl,
    inferenceCredentialKind: "interactive",
    ...(isManagedClaudeCodeDesktopSession(policyEntry) && {
      inferenceGatewayManagedClaudeCode: true,
    }),
    ...(publicUrl_2 && {
      otlpEndpoint: publicUrl,
      otlpProtocol: otlpProtocol(settings),
      otlpResourceAttributes: buildUserResourceAttributes(claims, config.telemetry.resource_attributes),
    }),
    ...buildInferenceModels(config, policyEntry ?? undefined, settings),
    ...disabledBuiltinToolsFromSettings,
    ...coworkEgressHosts(settings),
    ...desktopBlock,
    expiresAt: Math.floor(Date.now() / 1000) + config.session.ttl_hours * 3600,
  };
}
export { isManagedClaudeCodeDesktopSession, buildClientBootstrapConfig };
