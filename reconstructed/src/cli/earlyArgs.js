/**
 * cli/earlyArgs.ts
 *
 * 2.1.316 新增：生成版本报告对象（--version 等使用）；提前扫描 argv 中的 --cwd/--settings/--plugin-dir/--mcp-config 等，返回结构化结果与剩余参数等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-spfbd54s.js (7)
 * attribution: placement 7
 */

//@ chunk-spfbd54s.js:191-1065 placement
/**
 * 提前扫描 argv 中的 --cwd/--settings/--plugin-dir/--mcp-config 等，返回结构化结果与剩余参数。
 */
function parseEarlyArgs(n) {
  let e = false;
  let cwdFilter;
  let t = {
    addDir: [],
    pluginDir: [],
    pluginDirNoMcp: [],
    settings: undefined,
    managedSettings: undefined,
    mcpConfig: [],
    strictMcpConfig: false,
    restricted: false,
  };
  let g = [];
  let d = {
    "--cwd": (i) => {
      cwdFilter = i;
    },
    "--settings": (settings) => {
      t.settings = settings;
    },
    "--managed-settings": (managedSettings) => {
      t.managedSettings = managedSettings;
    },
    "--setting-sources": () => {},
    "--add-dir": (i) => t.addDir.push(i),
    "--plugin-dir": (i) => t.pluginDir.push(i),
    "--plugin-dir-no-mcp": (i) => t.pluginDirNoMcp.push(i),
    "--mcp-config": (i) => t.mcpConfig.push(i),
  };
  for (let i = 0; i < n.length; i++) {
    let s = n[i];
    if (s === "agents" && !e) {
      e = true;
      continue;
    }
    if (s === "--strict-mcp-config") {
      t.strictMcpConfig = true;
      continue;
    }
    if (s === "--restricted") {
      t.restricted = true;
      continue;
    }
    let index = s.indexOf("=");
    let l = index === -1 ? s : s.slice(0, index);
    let a = Object.hasOwn(d, l) ? d[l] : undefined;
    if (a) {
      if (index !== -1) a(s.slice(index + 1));
      else if (i + 1 < n.length) a(n[++i]);
      else g.push(s);
      continue;
    }
    g.push(s);
  }
  return {
    hasAgentsPositional: e,
    cwdFilter,
    config: t,
    rest: g,
  };
}
//@ chunk-spfbd54s.js:1065-1131 placement
/**
 * 判断路径是否为 ~ 或 ~/ 开头（早期参数里保留原样、不做绝对化）。
 */
function isHomeRelativePath(n) {
  let trimmed = n.trim();
  return trimmed === "~" || trimmed.startsWith("~/");
}
//@ chunk-spfbd54s.js:1131-1568 placement
/**
 * 把早期参数中的路径（settings、plugin-dir 等）按给定函数解析为绝对路径，内联 JSON 保持原样。
 */
function resolveEarlyArgPaths(n, resolve) {
  let r = (t, g) => (t === "" || (g && t.trimStart().startsWith("{")) ? t : resolve(t));
  return {
    settings: n.settings === undefined ? undefined : r(n.settings, true),
    managedSettings: n.managedSettings,
    pluginDir: n.pluginDir.map((t) => r(t, false)),
    pluginDirNoMcp: n.pluginDirNoMcp.map((t) => r(t, false)),
    addDir: n.addDir.map((t) => (isHomeRelativePath(t) ? t : r(t, false))),
    mcpConfig: n.mcpConfig.map((t) => r(t, true)),
    strictMcpConfig: n.strictMcpConfig,
    restricted: n.restricted,
    settingSources: n.settingSources,
  };
}
//@ chunk-spfbd54s.js:1568-2056 placement
/**
 * 把结构化的早期参数重新序列化为 argv 片段（用于转发给子进程）。
 */
function earlyArgsToArgv(earlyArgPaths) {
  return [
    ...(earlyArgPaths.settings ? ["--settings", earlyArgPaths.settings] : []),
    ...(earlyArgPaths.managedSettings ? ["--managed-settings", earlyArgPaths.managedSettings] : []),
    ...earlyArgPaths.pluginDir.flatMap((e) => ["--plugin-dir", e]),
    ...earlyArgPaths.pluginDirNoMcp.flatMap((e) => ["--plugin-dir-no-mcp", e]),
    ...earlyArgPaths.addDir.flatMap((e) => ["--add-dir", e]),
    ...earlyArgPaths.mcpConfig.flatMap((e) => ["--mcp-config", e]),
    ...(earlyArgPaths.settingSources !== undefined
      ? [`--setting-sources=${earlyArgPaths.settingSources}`]
      : []),
    ...(earlyArgPaths.strictMcpConfig ? ["--strict-mcp-config"] : []),
    ...(earlyArgPaths.restricted ? ["--restricted"] : []),
  ];
}
//@ chunk-spfbd54s.js:2056-2218 placement
function getDaemonArgs(n) {
  let e = 0;
  while (n[e] === "--dangerously-skip-permissions" || n[e] === "--allow-dangerously-skip-permissions") e++;
  return n[e] === "daemon" ? n.slice(e + 1) : null;
}
//@ chunk-spfbd54s.js:2218-2736 placement
/**
 * 返回构建信息常量（版本 2.1.316、反馈渠道、包名、构建时间等）。
 */
function getBuildRefSuffix(
  n = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.BUILD_REF_NAME,
) {
  return "";
}
//@ chunk-spfbd54s.js:2736-3766 placement
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
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION
    }${getBuildRefSuffix()}`,
    buildTime: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.BUILD_TIME,
  };
}
export {
  getBuildRefSuffix,
  earlyArgsToArgv,
  resolveEarlyArgPaths,
  isHomeRelativePath,
  getVersionReport,
  parseEarlyArgs,
  getDaemonArgs,
};
