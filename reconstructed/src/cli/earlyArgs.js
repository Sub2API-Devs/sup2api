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

/**
 * 提前扫描 argv 中的 --cwd/--settings/--plugin-dir/--mcp-config 等，返回结构化结果与剩余参数。
 */
//@ chunk-spfbd54s.js:191-1065 placement
function parseEarlyArgs(n) {
  let e = !1,
    r,
    t = {
      addDir: [],
      pluginDir: [],
      pluginDirNoMcp: [],
      settings: void 0,
      managedSettings: void 0,
      mcpConfig: [],
      strictMcpConfig: !1,
      restricted: !1,
    },
    g = [],
    d = {
      "--cwd": (i) => {
        r = i;
      },
      "--settings": (i) => {
        t.settings = i;
      },
      "--managed-settings": (i) => {
        t.managedSettings = i;
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
      e = !0;
      continue;
    }
    if (s === "--strict-mcp-config") {
      t.strictMcpConfig = !0;
      continue;
    }
    if (s === "--restricted") {
      t.restricted = !0;
      continue;
    }
    let index = s.indexOf("="),
      l = index === -1 ? s : s.slice(0, index),
      a = Object.hasOwn(d, l) ? d[l] : void 0;
    if (a) {
      if (index !== -1) a(s.slice(index + 1));
      else if (i + 1 < n.length) a(n[++i]);
      else g.push(s);
      continue;
    }
    g.push(s);
  }
  return { hasAgentsPositional: e, cwdFilter: r, config: t, rest: g };
}
//@ chunk-spfbd54s.js:1065-1131 placement
function ors(n) {
  let trimmed = n.trim();
  return trimmed === "~" || trimmed.startsWith("~/");
}
/**
 * 把早期参数中的路径（settings、plugin-dir 等）按给定函数解析为绝对路径，内联 JSON 保持原样。
 */
//@ chunk-spfbd54s.js:1131-1568 placement
function resolveEarlyArgPaths(n, e) {
  let r = (t, g) => (t === "" || (g && t.trimStart().startsWith("{")) ? t : e(t));
  return {
    settings: n.settings === void 0 ? void 0 : r(n.settings, !0),
    managedSettings: n.managedSettings,
    pluginDir: n.pluginDir.map((t) => r(t, !1)),
    pluginDirNoMcp: n.pluginDirNoMcp.map((t) => r(t, !1)),
    addDir: n.addDir.map((t) => (ors(t) ? t : r(t, !1))),
    mcpConfig: n.mcpConfig.map((t) => r(t, !0)),
    strictMcpConfig: n.strictMcpConfig,
    restricted: n.restricted,
    settingSources: n.settingSources,
  };
}
/**
 * 把结构化的早期参数重新序列化为 argv 片段（用于转发给子进程）。
 */
//@ chunk-spfbd54s.js:1568-2056 placement
function earlyArgsToArgv(n) {
  return [
    ...(n.settings ? ["--settings", n.settings] : []),
    ...(n.managedSettings ? ["--managed-settings", n.managedSettings] : []),
    ...n.pluginDir.flatMap((e) => ["--plugin-dir", e]),
    ...n.pluginDirNoMcp.flatMap((e) => ["--plugin-dir-no-mcp", e]),
    ...n.addDir.flatMap((e) => ["--add-dir", e]),
    ...n.mcpConfig.flatMap((e) => ["--mcp-config", e]),
    ...(n.settingSources !== void 0 ? [`--setting-sources=${n.settingSources}`] : []),
    ...(n.strictMcpConfig ? ["--strict-mcp-config"] : []),
    ...(n.restricted ? ["--restricted"] : []),
  ];
}
//@ chunk-spfbd54s.js:2056-2218 placement
function getDaemonArgs(n) {
  let e = 0;
  while (n[e] === "--dangerously-skip-permissions" || n[e] === "--allow-dangerously-skip-permissions") e++;
  return n[e] === "daemon" ? n.slice(e + 1) : null;
}
/**
 * 返回构建信息常量（版本 2.1.316、反馈渠道、包名、构建时间等）。
 */
//@ chunk-spfbd54s.js:2218-2736 placement
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
/**
 * 生成版本报告对象（--version 等使用）。
 */
//@ chunk-spfbd54s.js:2736-3766 placement
function getVersionReport() {
  return {
    version: `${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}${getBuildRefSuffix()}`,
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
  ors,
  getVersionReport,
  parseEarlyArgs,
  getDaemonArgs,
};
