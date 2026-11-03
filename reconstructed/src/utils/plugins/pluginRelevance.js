/**
 * utils/plugins/pluginRelevance.ts
 *
 * 2.1.316 新增：匹配插件相关性信号（CLI、主机、文件、依赖）；插件是否声明了相关性信号。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fj1bjh0z.js (5)
 * attribution: placement 5
 */
import { stat, readFile } from "fs/promises";
import { getClaudeConfigDir } from "../envUtils.js";
import { getClaudeTempDirRealpath } from "../tempDirRealpaths.js";
import { isPathWithinCaseAware } from "../pathPrefix.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { require_picomatch_2 } from "../../../vendor/picomatch/index.js";
import { extractBashCliNames, referencedBashToolNames } from "../queryHelpers.js";
import { logForDebugging } from "../debug.js";
import { getCwd } from "../cwd.js";
import { findGitRoot } from "../git.js";
import { remoteFileStateKeys, isFullFileView } from "../remoteFileState.js";
import { isDiskless } from "../../bootstrap/state.js";
import { reportOnce } from "../reportOnce.js";
import { withTimeout } from "../sleep.js";

//@ chunk-fj1bjh0z.js:667-754 placement
/**
 * pluginRelevanceRoots：插件相关性检查的根目录。
 */
function pluginRelevanceRoots() {
  let e = [getClaudeConfigDir()];
  try {
    e.push(getClaudeTempDirRealpath());
  } catch {}
  return (a) => e.some((n) => isPathWithinCaseAware(a, n, true));
}
//@ chunk-fj1bjh0z.js:754-772 placement
var caddyModule = Re(require_picomatch_2(), 1);
//@ chunk-fj1bjh0z.js:821-897 placement
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
//@ chunk-fj1bjh0z.js:897-1495 placement
/**
 * 插件是否声明了相关性信号。
 */
function hasRelevanceSignals(name, relevance) {
  let n = relevance;
  if (
    !n?.signals ||
    (!n.signals.cli?.length &&
      !n.signals.filesRead?.length &&
      !n.signals.manifestDeps?.length &&
      !n.signals.hosts?.length &&
      !n.signals.cwd?.length)
  )
    return null;
  let manifestDep;
  try {
    if (n.signals.manifestDeps?.length)
      manifestDep = n.signals.manifestDeps.map((manifestDep) => ({
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
  let hosts = n.signals.hosts?.map((host) => host.toLowerCase());
  return {
    cli: n.signals.cli,
    hosts,
    filesRead: n.signals.filesRead,
    manifestDep,
    cwd: n.signals.cwd,
  };
}
//@ chunk-fj1bjh0z.js:1495-2793 placement
/**
 * 匹配插件相关性信号（CLI、主机、文件、依赖）。
 */
async function matchRelevanceSignal(e, a) {
  let { bashTools, bashHosts } = a ?? {};
  if (e.cli && bashTools?.size) {
    let found = e.cli.find((s) => bashTools.has(s));
    if (found)
      return {
        signal: "cli",
        command: found,
      };
  }
  if (e.hosts?.length && bashHosts?.size) {
    let found = e.hosts.find((host) => bashHosts.has(host));
    if (found)
      return {
        signal: "hosts",
        host: found,
      };
  }
  if (e.cwd?.length) {
    let replaced = getCwd().replaceAll("\\", "/");
    let replaced_2 = findGitRoot(getCwd())?.replaceAll("\\", "/");
    let f = [replaced];
    if (replaced_2 && replaced.startsWith(`${replaced_2}/`)) f.push(replaced.slice(replaced_2.length + 1));
    for (let p of e.cwd) {
      let replaced = p.replace(/\/+$/, "").replace(/\/\*\*$/, "");
      if (!replaced) continue;
      if (
        f.some((r) =>
          caddyModule.default.isMatch(r, [replaced, `${replaced}/**`], {
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
  let readFileState = a?.readFileState;
  let l = [];
  if (readFileState && (e.filesRead?.length || e.manifestDep)) {
    let i = pluginRelevanceRoots();
    l = remoteFileStateKeys(readFileState).filter((s) => !i(s));
  }
  if (e.filesRead?.length && l.length) {
    let found = l.find((s) =>
      caddyModule.default.isMatch(s.replaceAll("\\", "/"), e.filesRead, {
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
  if (e.manifestDep && readFileState && l.length > 0) {
    let i = new Map(readFileState.entries());
    let s = (async () => {
      for (let { file, pattern } of e.manifestDep)
        for (let r of l) {
          if (!file.test(r)) continue;
          try {
            let m = i.get(r);
            let content = m && isFullFileView(m) ? m.content : undefined;
            if (!content) {
              if (isDiskless()) {
                reportOnce("plugin_relevance");
                continue;
              }
              if ((await stat(r)).size > 524288) continue;
              content = await readFile(r, "utf8");
            }
            if (pattern.test(content)) return r;
          } catch {}
        }
      return null;
    })();
    let f = await withTimeout(s, 50, "manifestDep scan").catch(() => null);
    if (f)
      return {
        signal: "manifestDep",
        file: f,
      };
  }
  return null;
}
export { hasRelevanceSignals, matchRelevanceSignal, pluginRelevanceRoots, pluginRelevanceInputs };
