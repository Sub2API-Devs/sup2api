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
import { hqt } from "../../../vendor/picomatch/index.js";
import { extractBashCliNames, XWn } from "../queryHelpers.js";
import { logForDebugging } from "../debug.js";
import { getCwd } from "../cwd.js";
import { findGitRoot } from "../git.js";
import { bAt, isFullFileView } from "../remoteFileState.js";
import { isDiskless } from "../../bootstrap/state.js";
import { reportOnce } from "../reportOnce.js";
import { withTimeout } from "../sleep.js";

//@ chunk-fj1bjh0z.js:667-754 placement
function pMr() {
  let e = [getClaudeConfigDir()];
  try {
    e.push(getClaudeTempDirRealpath());
  } catch {}
  return (a) => e.some((n) => isPathWithinCaseAware(a, n, !0));
}
//@ chunk-fj1bjh0z.js:754-772 placement
var h = Re(hqt(), 1);
//@ chunk-fj1bjh0z.js:821-897 placement
function KWn(e, a) {
  return { readFileState: a, bashTools: extractBashCliNames(e), bashHosts: XWn(e) };
}
/**
 * 插件是否声明了相关性信号。
 */
//@ chunk-fj1bjh0z.js:897-1495 placement
function hasRelevanceSignals(e, a) {
  let n = a;
  if (
    !n?.signals ||
    (!n.signals.cli?.length &&
      !n.signals.filesRead?.length &&
      !n.signals.manifestDeps?.length &&
      !n.signals.hosts?.length &&
      !n.signals.cwd?.length)
  )
    return null;
  let c;
  try {
    if (n.signals.manifestDeps?.length)
      c = n.signals.manifestDeps.map((manifestDep) => ({
        file: new RegExp(manifestDep.file, "i"),
        pattern: new RegExp(manifestDep.pattern),
      }));
  } catch (error) {
    return (
      logForDebugging(
        `Skipping relevance signals for "${e}": invalid RegExp in relevance.signals: ${error}`,
        { level: "warn" },
      ),
      null
    );
  }
  let o = n.signals.hosts?.map((l) => l.toLowerCase());
  return { cli: n.signals.cli, hosts: o, filesRead: n.signals.filesRead, manifestDep: c, cwd: n.signals.cwd };
}
/**
 * 匹配插件相关性信号（CLI、主机、文件、依赖）。
 */
//@ chunk-fj1bjh0z.js:1495-2793 placement
async function matchRelevanceSignal(e, a) {
  let { bashTools: bashTools, bashHosts: bashHosts } = a ?? {};
  if (e.cli && bashTools?.size) {
    let found = e.cli.find((s) => bashTools.has(s));
    if (found) return { signal: "cli", command: found };
  }
  if (e.hosts?.length && bashHosts?.size) {
    let found = e.hosts.find((host) => bashHosts.has(host));
    if (found) return { signal: "hosts", host: found };
  }
  if (e.cwd?.length) {
    let replaced = getCwd().replaceAll("\\", "/"),
      s = findGitRoot(getCwd())?.replaceAll("\\", "/"),
      f = [replaced];
    if (s && replaced.startsWith(`${s}/`)) f.push(replaced.slice(s.length + 1));
    for (let p of e.cwd) {
      let replaced = p.replace(/\/+$/, "").replace(/\/\*\*$/, "");
      if (!replaced) continue;
      if (f.some((r) => h.default.isMatch(r, [replaced, `${replaced}/**`], { nocase: !0, dot: !0 })))
        return { signal: "cwd" };
    }
  }
  let o = a?.readFileState,
    l = [];
  if (o && (e.filesRead?.length || e.manifestDep)) {
    let i = pMr();
    l = bAt(o).filter((s) => !i(s));
  }
  if (e.filesRead?.length && l.length) {
    let found = l.find((s) =>
      h.default.isMatch(s.replaceAll("\\", "/"), e.filesRead, { nocase: !0, dot: !0 }),
    );
    if (found) return { signal: "filesRead", file: found };
  }
  if (e.manifestDep && o && l.length > 0) {
    let i = new Map(o.entries()),
      s = (async () => {
        for (let { file: file, pattern: pattern } of e.manifestDep)
          for (let r of l) {
            if (!file.test(r)) continue;
            try {
              let m = i.get(r),
                u = m && isFullFileView(m) ? m.content : void 0;
              if (!u) {
                if (isDiskless()) {
                  reportOnce("plugin_relevance");
                  continue;
                }
                if ((await stat(r)).size > 524288) continue;
                u = await readFile(r, "utf8");
              }
              if (pattern.test(u)) return r;
            } catch {}
          }
        return null;
      })(),
      f = await withTimeout(s, 50, "manifestDep scan").catch(() => null);
    if (f) return { signal: "manifestDep", file: f };
  }
  return null;
}

export { hasRelevanceSignals, matchRelevanceSignal, pMr, KWn };
