/**
 * plugins/bundled/easel/index.ts
 *
 * 2.1.316 新增：注册内置插件 cc-plugin-easel（MCP 结果下自动画图等配置）；easel 插件 hooks 模块的扫描清单（钩子与调用）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h7zh4yp6.js (10)
 * attribution: placement 10
 */
import { __commonJS, __export } from "../../../../runtime/bun-runtime.js";
import { isScreenReaderMode } from "../../../utils/accessibility/screenReader.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { hasComplianceTaint } from "../../../services/policyLimits/complianceTaints.js";
import { getPlatform } from "../../../utils/platform.js";
import { isPolicyVerdictAbsent } from "../../../services/policyLimits/policyVerdicts.js";
import { registerBuiltinPlugin, builtinHooksModuleRef } from "../../builtinPlugins.js";

//@ chunk-h7zh4yp6.js:3801-4154 placement
/**
 * easel 插件 hooks 模块的扫描清单（钩子与调用）。
 */
var EASEL_HOOKS_SCAN = __commonJS(function (requireFn, moduleObject) {
  moduleObject.exports = {
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
      env: {
        reads: ["CLAUDE_AX_SCREEN_READER"],
        writes: [],
      },
    },
    files: {},
  };
});
//@ chunk-h7zh4yp6.js:4154-4163 placement
/**
 * 空对象默认导出
 */
var EMPTY_PLUGIN_EXPORTS = {};
//@ chunk-h7zh4yp6.js:4163-4318 placement
__export(EMPTY_PLUGIN_EXPORTS, {
  PLUGIN_DESCRIPTION: () => EASEL_DESCRIPTION,
  SUPPLEMENTED_MODULE: () => EASEL_HOOKS_MODULE,
  availabilityFlag: () => EASEL_FLAG,
  default: () => EMPTY_PLUGIN_EXPORTS,
  isAvailable: () => isEaselAvailable,
  isOnByDefault: () => EASEL_ON_BY_DEFAULT,
  registerPlugin: () => registerEaselPlugin,
});
//@ chunk-h7zh4yp6.js:4318-4358 placement
/**
 * 返回 easel 插件的特性开关名 tengu_joyful_otter。
 */
function EASEL_FLAG() {
  return "tengu_joyful_otter";
}
//@ chunk-h7zh4yp6.js:4358-4535 placement
/**
 * easel 钩子模块入口：注入读屏、批量、代理、合规等环境判断后注册。
 */
var EASEL_HOOKS_MODULE = {
  register: (on, settings) =>
    require("./default.lazy.js").register(on, settings, {
      isReaderOn: () => isScreenReaderMode(),
      isBatchAwaited: () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_virtual_toast", false),
      isRegulated: () => hasComplianceTaint("hipaa") || hasComplianceTaint("zdr"),
    }),
};
//@ chunk-h7zh4yp6.js:4535-4544 placement
/**
 * 默认关闭
 */
var EASEL_ON_BY_DEFAULT = false;
//@ chunk-h7zh4yp6.js:4544-4577 placement
/**
 * linux/macos
 */
var EASEL_SUPPORTED_PLATFORMS = new Set(["linux", "macos"]);
//@ chunk-h7zh4yp6.js:4577-4683 placement
/**
 * easel 可用：开关开启、平台支持且无 HIPAA/ZDR 合规污点。
 */
function isEaselAvailable() {
  let isEnabled = getFeatureValue_CACHED_MAY_BE_STALE(EASEL_FLAG(), EASEL_ON_BY_DEFAULT) === true;
  let isSupported = EASEL_SUPPORTED_PLATFORMS.has(getPlatform()) || false;
  if (!isEnabled || !isSupported) return false;
  isPolicyVerdictAbsent();
  return !hasComplianceTaint("hipaa") && !hasComplianceTaint("zdr");
}
//@ chunk-h7zh4yp6.js:4683-4812 placement
var EASEL_DESCRIPTION =
  "Draws charts in the transcript: a chart tool for Claude, and automatic charts for MCP results that are metrics over time";
//@ chunk-h7zh4yp6.js:4812-5389 placement
/**
 * 注册内置插件 cc-plugin-easel（MCP 结果下自动画图等配置）。
 */
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
        required: false,
        default: true,
      },
      autoChartSkip: {
        type: "string",
        title: "Auto charts: servers to skip",
        description:
          'MCP servers whose results never get an auto chart, separated by commas. A server is named as its tools name it: "grafana" for mcp__grafana__query.',
        required: false,
        default: "",
      },
    },
  });
export {
  EASEL_DESCRIPTION,
  EASEL_HOOKS_MODULE,
  EASEL_FLAG,
  EMPTY_PLUGIN_EXPORTS,
  isEaselAvailable,
  EASEL_ON_BY_DEFAULT,
  registerEaselPlugin,
};
