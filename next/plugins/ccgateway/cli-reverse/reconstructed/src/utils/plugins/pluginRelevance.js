/**
 * utils/plugins/pluginRelevance.ts
 *
 * 2.1.316 新增：匹配插件相关性信号（CLI、主机、文件、依赖）；插件是否声明了相关性信号。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kt6vd7kv.js (5)
 * attribution: placement 5
 */
import { stat, readFile } from "fs/promises";
import { getClaudeConfigDir } from "../markdownConfigLoader.js";
import { getClaudeTempDirRealpath } from "../tempDirRealpaths.js";
import { isPathWithinCaseAware } from "../pathPrefix.js";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_picomatch_2 } from "../../../vendor/picomatch/index.js";
import { extractBashCliNames, referencedBashToolNames } from "../queryHelpers.js";
import { logForDebugging } from "../debug.js";
import { getCwd } from "../cwd.js";
import { findGitRoot } from "../git.js";
import { remoteFileStateKeys, isFullFileView } from "../remoteFileState.js";
import { isDiskless } from "../../bootstrap/state.js";
import { reportOnce } from "../reportOnce.js";
import { withTimeout } from "../sleep.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-kt6vd7kv.js:667-754 placement
/**
 * pluginRelevanceRoots：插件相关性检查的根目录。
 */
function pluginRelevanceRoots() {
  let roots = [getClaudeConfigDir()];
  try {
    roots.push(getClaudeTempDirRealpath());
  } catch {}
  return (path) => roots.some((root) => isPathWithinCaseAware(path, root, true));
}
//@ chunk-kt6vd7kv.js:754-772 placement
var caddyModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-kt6vd7kv.js:754", () => {
  caddyModule = __toESM(require_picomatch_2(), 1);
});
//@ chunk-kt6vd7kv.js:821-897 placement
/**
 * pluginRelevanceInputs：插件相关性输入（读状态、Bash 工具与主机）。
 */
function pluginRelevanceInputs(messages, readFileState) {
  return {
    readFileState,
    bashTools: extractBashCliNames(messages),
    bashHosts: referencedBashToolNames(messages),
  };
}
//@ chunk-kt6vd7kv.js:897-1495 placement
/**
 * 插件是否声明了相关性信号。
 */
function hasRelevanceSignals(name, relevance) {
  let relevance_2 = relevance;
  if (
    !relevance_2?.signals ||
    (!relevance_2.signals.cli?.length &&
      !relevance_2.signals.filesRead?.length &&
      !relevance_2.signals.manifestDeps?.length &&
      !relevance_2.signals.hosts?.length &&
      !relevance_2.signals.cwd?.length)
  )
    return null;
  let manifestDep;
  try {
    if (relevance_2.signals.manifestDeps?.length)
      manifestDep = relevance_2.signals.manifestDeps.map((manifestDep) => ({
        file: new RegExp(manifestDep.file, "i"),
        pattern: new RegExp(manifestDep.pattern),
      }));
  } catch (error) {
    logForDebugging(
      `Skipping relevance signals for "${name}": invalid RegExp in relevance.signals: ${error}`,
      {
        level: "warn",
      },
    );
    return null;
  }
  let hosts = relevance_2.signals.hosts?.map((host) => host.toLowerCase());
  return {
    cli: relevance_2.signals.cli,
    hosts,
    filesRead: relevance_2.signals.filesRead,
    manifestDep,
    cwd: relevance_2.signals.cwd,
  };
}
//@ chunk-kt6vd7kv.js:1495-2793 placement
/**
 * 匹配插件相关性信号（CLI、主机、文件、依赖）。
 */
async function matchRelevanceSignal(signals, context) {
  let { bashTools, bashHosts } = context ?? {};
  if (signals.cli && bashTools?.size) {
    let found = signals.cli.find((signal) => bashTools.has(signal));
    if (found)
      return {
        signal: "cli",
        command: found,
      };
  }
  if (signals.hosts?.length && bashHosts?.size) {
    let found = signals.hosts.find((host) => bashHosts.has(host));
    if (found)
      return {
        signal: "hosts",
        host: found,
      };
  }
  if (signals.cwd?.length) {
    let replaced = getCwd().replaceAll("\\", "/");
    let replaced_2 = findGitRoot(getCwd())?.replaceAll("\\", "/");
    let cwdVariants = [replaced];
    if (replaced_2 && replaced.startsWith(`${replaced_2}/`))
      cwdVariants.push(replaced.slice(replaced_2.length + 1));
    for (let pattern of signals.cwd) {
      let replaced = pattern.replace(/\/+$/, "").replace(/\/\*\*$/, "");
      if (!replaced) continue;
      if (
        cwdVariants.some((candidate) =>
          caddyModule.default.isMatch(candidate, [replaced, `${replaced}/**`], {
            nocase: true,
            dot: true,
          }),
        )
      )
        return {
          signal: "cwd",
        };
    }
  }
  let readFileState = context?.readFileState;
  let files = [];
  if (readFileState && (signals.filesRead?.length || signals.manifestDep)) {
    let isPluginPath = pluginRelevanceRoots();
    files = remoteFileStateKeys(readFileState).filter((file) => !isPluginPath(file));
  }
  if (signals.filesRead?.length && files.length) {
    let found = files.find((file) =>
      caddyModule.default.isMatch(file.replaceAll("\\", "/"), signals.filesRead, {
        nocase: true,
        dot: true,
      }),
    );
    if (found)
      return {
        signal: "filesRead",
        file: found,
      };
  }
  if (signals.manifestDep && readFileState && files.length > 0) {
    let fileState = new Map(readFileState.entries());
    let scan = (async () => {
      for (let { file, pattern } of signals.manifestDep)
        for (let filePath of files) {
          if (!file.test(filePath)) continue;
          try {
            let state = fileState.get(filePath);
            let content = state && isFullFileView(state) ? state.content : undefined;
            if (!content) {
              if (isDiskless()) {
                reportOnce("plugin_relevance");
                continue;
              }
              if ((await stat(filePath)).size > 524288) continue;
              content = await readFile(filePath, "utf8");
            }
            if (pattern.test(content)) return filePath;
          } catch {}
        }
      return null;
    })();
    let found = await withTimeout(scan, 50, "manifestDep scan").catch(() => null);
    if (found)
      return {
        signal: "manifestDep",
        file: found,
      };
  }
  return null;
}
export { pluginRelevanceInputs, hasRelevanceSignals, matchRelevanceSignal, pluginRelevanceRoots };
