/**
 * plugins/bundled/easel/index.ts
 *
 * 2.1.316 新增：注册内置插件 cc-plugin-easel（MCP 结果下自动画图等配置）；easel 插件 hooks 模块的扫描清单（钩子与调用）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-shznzb37.js (10)
 * attribution: placement 10
 */
import { x, Ar } from "../../../../runtime/bun-runtime.js";
import { isScreenReaderMode } from "../../../utils/accessibility/screenReader.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { getProxyUrl } from "../../../utils/proxy.js";
import { hasComplianceTaint } from "../../../services/policyLimits/complianceTaints.js";
import { getPlatform } from "../../../utils/platform.js";
import { isPolicyVerdictAbsent } from "../../../services/policyLimits/policyVerdicts.js";
import { registerBuiltinPlugin, builtinHooksModuleRef } from "../../builtinPlugins.js";

/**
 * easel 插件 hooks 模块的扫描清单（钩子与调用）。
 */
//@ chunk-shznzb37.js:3501-3854 placement
var EASEL_HOOKS_SCAN = x(function (F, m) {
  m.exports = {
    scan: {
      hooks: ["session.start", "session.attach", "prompt.section", "tool.call", "ui.render"],
      calls: [
        "clock.now",
        "clock.sleep",
        "env.get",
        "session.messages",
        "session.surfaces",
        "settings.read",
        "telemetry.log",
        "telemetry.mark",
        "tool.register",
        "ui.log",
        "ui.resolve",
      ],
      env: { reads: ["CLAUDE_AX_SCREEN_READER"], writes: [] },
    },
    files: {},
  };
});
//@ chunk-shznzb37.js:3854-3863 placement
var i = {};
//@ chunk-shznzb37.js:3863-4018 placement
Ar(i, {
  PLUGIN_DESCRIPTION: () => EASEL_DESCRIPTION,
  SUPPLEMENTED_MODULE: () => EASEL_HOOKS_MODULE,
  availabilityFlag: () => t,
  default: () => i,
  isAvailable: () => isEaselAvailable,
  isOnByDefault: () => o,
  registerPlugin: () => registerEaselPlugin,
});
//@ chunk-shznzb37.js:4018-4058 placement
function t() {
  return "tengu_joyful_otter";
}
/**
 * easel 钩子模块入口：注入读屏、批量、代理、合规等环境判断后注册。
 */
//@ chunk-shznzb37.js:4058-4264 placement
var EASEL_HOOKS_MODULE = {
  register: (e, r) =>
    require("./chunk-3s7ydtfd.js").register(e, r, {
      isReaderOn: () => isScreenReaderMode(),
      isBatchAwaited: () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_virtual_toast", !1),
      isProxySet: () => getProxyUrl() !== void 0,
      isRegulated: () => hasComplianceTaint("hipaa") || hasComplianceTaint("zdr"),
    }),
};
//@ chunk-shznzb37.js:4264-4273 placement
var o = !1;
//@ chunk-shznzb37.js:4273-4306 placement
var c = new Set(["linux", "macos"]);
/**
 * easel 可用：开关开启、平台支持且无 HIPAA/ZDR 合规污点。
 */
//@ chunk-shznzb37.js:4306-4412 placement
function isEaselAvailable() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(t(), o) === !0,
    r = c.has(getPlatform()) || !1;
  if (!e || !r) return !1;
  return (isPolicyVerdictAbsent(), !hasComplianceTaint("hipaa") && !hasComplianceTaint("zdr"));
}
//@ chunk-shznzb37.js:4412-4541 placement
var EASEL_DESCRIPTION =
  "Draws charts in the transcript: a chart tool for Claude, and automatic charts for MCP results that are metrics over time";
/**
 * 注册内置插件 cc-plugin-easel（MCP 结果下自动画图等配置）。
 */
//@ chunk-shznzb37.js:4541-5118 placement
var registerEaselPlugin = () =>
  registerBuiltinPlugin({
    name: "cc-plugin-easel",
    description: EASEL_DESCRIPTION,
    isAvailable: isEaselAvailable,
    hooksModule: builtinHooksModuleRef(import.meta.dir, EASEL_HOOKS_MODULE, () => EASEL_HOOKS_SCAN()),
    userConfig: {
      autoCharts: {
        type: "boolean",
        title: "Auto charts",
        description:
          "Draw a chart under an MCP result that is metrics over time, without being asked. Off: only the charts Claude asks for.",
        required: !1,
        default: !0,
      },
      autoChartSkip: {
        type: "string",
        title: "Auto charts: servers to skip",
        description:
          'MCP servers whose results never get an auto chart, separated by commas. A server is named as its tools name it: "grafana" for mcp__grafana__query.',
        required: !1,
        default: "",
      },
    },
  });
