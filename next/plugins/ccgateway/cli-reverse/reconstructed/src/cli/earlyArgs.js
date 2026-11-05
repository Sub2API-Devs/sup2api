/**
 * cli/earlyArgs.ts
 *
 * 2.1.316 新增：生成版本报告对象（--version 等使用）；提前扫描 argv 中的 --cwd/--settings/--plugin-dir/--mcp-config 等，返回结构化结果与剩余参数等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-svdpxfd7.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-svdpxfd7.js:191-1065 placement
/**
 * 提前扫描 argv 中的 --cwd/--settings/--plugin-dir/--mcp-config 等，返回结构化结果与剩余参数。
 */
function parseEarlyArgs(argv) {
  let hasAgentsPositional = false;
  let cwdFilter;
  let config = {
    addDir: [],
    pluginDir: [],
    pluginDirNoMcp: [],
    settings: undefined,
    managedSettings: undefined,
    mcpConfig: [],
    strictMcpConfig: false,
    restricted: false,
  };
  let rest = [];
  let handlers = {
    "--cwd": (value) => {
      cwdFilter = value;
    },
    "--settings": (settings) => {
      config.settings = settings;
    },
    "--managed-settings": (managedSettings) => {
      config.managedSettings = managedSettings;
    },
    "--setting-sources": () => {},
    "--add-dir": (value) => config.addDir.push(value),
    "--plugin-dir": (value) => config.pluginDir.push(value),
    "--plugin-dir-no-mcp": (value) => config.pluginDirNoMcp.push(value),
    "--mcp-config": (value) => config.mcpConfig.push(value),
  };
  for (let index = 0; index < argv.length; index++) {
    let arg = argv[index];
    if (arg === "agents" && !hasAgentsPositional) {
      hasAgentsPositional = true;
      continue;
    }
    if (arg === "--strict-mcp-config") {
      config.strictMcpConfig = true;
      continue;
    }
    if (arg === "--restricted") {
      config.restricted = true;
      continue;
    }
    let index_2 = arg.indexOf("=");
    let flagName = index_2 === -1 ? arg : arg.slice(0, index_2);
    let handler = Object.hasOwn(handlers, flagName) ? handlers[flagName] : undefined;
    if (handler) {
      if (index_2 !== -1) handler(arg.slice(index_2 + 1));
      else if (index + 1 < argv.length) handler(argv[++index]);
      else rest.push(arg);
      continue;
    }
    rest.push(arg);
  }
  return {
    hasAgentsPositional,
    cwdFilter,
    config,
    rest,
  };
}
//@ chunk-svdpxfd7.js:1065-1131 placement
/**
 * 判断路径是否为 ~ 或 ~/ 开头（早期参数里保留原样、不做绝对化）。
 */
function isHomeRelativePath(path) {
  let trimmed = path.trim();
  return trimmed === "~" || trimmed.startsWith("~/");
}
//@ chunk-svdpxfd7.js:1131-1568 placement
/**
 * 把早期参数中的路径（settings、plugin-dir 等）按给定函数解析为绝对路径，内联 JSON 保持原样。
 */
function resolveEarlyArgPaths(config, resolve) {
  let resolveValue = (value, allowInlineJson) =>
    value === "" || (allowInlineJson && value.trimStart().startsWith("{")) ? value : resolve(value);
  return {
    settings: config.settings === undefined ? undefined : resolveValue(config.settings, true),
    managedSettings: config.managedSettings,
    pluginDir: config.pluginDir.map((path) => resolveValue(path, false)),
    pluginDirNoMcp: config.pluginDirNoMcp.map((path) => resolveValue(path, false)),
    addDir: config.addDir.map((path) => (isHomeRelativePath(path) ? path : resolveValue(path, false))),
    mcpConfig: config.mcpConfig.map((path) => resolveValue(path, true)),
    strictMcpConfig: config.strictMcpConfig,
    restricted: config.restricted,
    settingSources: config.settingSources,
  };
}
//@ chunk-svdpxfd7.js:1568-2056 placement
/**
 * 把结构化的早期参数重新序列化为 argv 片段（用于转发给子进程）。
 */
function earlyArgsToArgv(earlyArgPaths) {
  return [
    ...(earlyArgPaths.settings ? ["--settings", earlyArgPaths.settings] : []),
    ...(earlyArgPaths.managedSettings ? ["--managed-settings", earlyArgPaths.managedSettings] : []),
    ...earlyArgPaths.pluginDir.flatMap((path) => ["--plugin-dir", path]),
    ...earlyArgPaths.pluginDirNoMcp.flatMap((path) => ["--plugin-dir-no-mcp", path]),
    ...earlyArgPaths.addDir.flatMap((path) => ["--add-dir", path]),
    ...earlyArgPaths.mcpConfig.flatMap((path) => ["--mcp-config", path]),
    ...(earlyArgPaths.settingSources !== undefined
      ? [`--setting-sources=${earlyArgPaths.settingSources}`]
      : []),
    ...(earlyArgPaths.strictMcpConfig ? ["--strict-mcp-config"] : []),
    ...(earlyArgPaths.restricted ? ["--restricted"] : []),
  ];
}
//@ chunk-svdpxfd7.js:2056-2218 placement
function getDaemonArgs(argv) {
  let index = 0;
  while (
    argv[index] === "--dangerously-skip-permissions" ||
    argv[index] === "--allow-dangerously-skip-permissions"
  )
    index++;
  return argv[index] === "daemon" ? argv.slice(index + 1) : null;
}
//@ chunk-svdpxfd7.js:2218-2736 placement
/**
 * 返回构建信息常量（版本 2.1.316、反馈渠道、包名、构建时间等）。
 */
function getBuildRefSuffix(
  buildInfo = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.318",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-11-03T18:52:53Z",
    GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.BUILD_REF_NAME,
) {
  return "";
}
//@ chunk-svdpxfd7.js:2736-3766 placement
/**
 * 生成版本报告对象（--version 等使用）。
 */
function getVersionReport() {
  return {
    version: `${
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION
    }${getBuildRefSuffix()}`,
    buildTime: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.BUILD_TIME,
  };
}
export {
  getBuildRefSuffix,
  isHomeRelativePath,
  earlyArgsToArgv,
  resolveEarlyArgPaths,
  getVersionReport,
  parseEarlyArgs,
  getDaemonArgs,
};
