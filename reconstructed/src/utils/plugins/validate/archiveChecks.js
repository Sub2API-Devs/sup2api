/**
 * utils/plugins/validate/archiveChecks.ts
 *
 * 2.1.316 新增：插件目录校验：归档检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5aas12zq.js (4)
 * attribution: placement 4
 */
import { readdir } from "fs/promises";
import * as pathModule from "path";
import { isPlainObject } from "../../isPlainObject.js";
import { isNotFoundErrno_4, makeFinding } from "./helpers.js";
import { X, ln, ke, an, formatFailureDetails, dn, ie } from "./validatePluginDirectory.js";

//@ chunk-5aas12zq.js:42139-42356 placement
function markRemoteMcpServer(e, { config: config }) {
  let t = typeof config.type === "string" ? config.type : "";
  if (
    ["http", "streamable-http", "claudeai-proxy", "sse", "sse-ide", "ws", "ws-ide"].includes(t) &&
    !St(typeof config.url === "string" ? config.url : "")
  )
    e.connectsToRemote = !0;
}
//@ chunk-5aas12zq.js:42356-42438 placement
function St(e) {
  for (let n = 0; n < e.length; n++) if (e.charCodeAt(n) > 32) return !1;
  return !0;
}
//@ chunk-5aas12zq.js:42438-42646 placement
function markRemoteHooks(e, n) {
  if (!isPlainObject(n)) return;
  for (let t of Object.values(n))
    for (let r of Array.isArray(t) ? t : []) {
      let s = isPlainObject(r) ? r.hooks : void 0;
      for (let o of Array.isArray(s) ? s : [])
        if (isPlainObject(o) && o.type === "http") e.connectsToRemote = !0;
    }
}
/**
 * 在有限条目数与目录深度内遍历插件（跳过根 .git），收集 .DS_Store、Thumbs.db、__MACOSX 等系统文件，生成 ARCHIVE_OS_METADATA_FILE 发现项； 截断或无法列出的目录写入说明。
 */
//@ chunk-5aas12zq.js:42646-44336 placement
async function findOsMetadataFiles(e, n) {
  let t = [],
    r = [{ relative: "", depth: 0 }],
    s = 0,
    o = !1,
    a = [];
  while (r.length > 0) {
    let d = r.pop();
    if (d === void 0) break;
    let f = await readdir(pathModule.join(e, d.relative), { withFileTypes: !0 }).catch((p) => {
      if (!isNotFoundErrno_4(p)) a.push(d.relative === "" ? "." : d.relative);
      return [];
    });
    for (let p of f) {
      if (s++ >= X) {
        o = !0;
        break;
      }
      let S = d.relative === "" ? p.name : `${d.relative}/${p.name}`,
        included = `/${d.relative}/`.includes(`/${ln}/`);
      if (p.isDirectory()) {
        if (p.name === ".git" && d.relative === "") continue;
        if (d.depth + 1 > ke) {
          o = !0;
          continue;
        }
        r.push({ relative: S, depth: d.depth + 1 });
      } else if (p.isFile() && (an.has(p.name) || included)) t.push(S);
    }
    if (o && s > X) break;
  }
  if (o)
    n.push(
      `Looked for macOS and Windows system files in the first ${X} entries and ${ke} folder levels of the plugin only; the rest was not checked.`,
    );
  if (a.length > 0)
    n.push(
      `Could not list ${formatFailureDetails(a)} inside the plugin, so what is under ${a.length === 1 ? "it" : "them"} was not searched for macOS and Windows system files. Check that ${a.length === 1 ? "the folder" : "each folder"} can be read, and validate again.`,
    );
  if ((t.sort(), t.length > 0)) n.push(dn);
  let mapped = t
    .slice(0, ie)
    .map((d) =>
      makeFinding(
        "ARCHIVE_OS_METADATA_FILE",
        d,
        "",
        "This is a macOS or Windows system file (.DS_Store, Thumbs.db, desktop.ini, or anything under __MACOSX), not part of your plugin. The directory cannot scan or list a plugin that contains one. Remove it from the repository (git rm --cached the file, commit and push, and add the name to .gitignore), then validate again.",
      ),
    );
  if (t.length > ie)
    mapped.push(
      makeFinding(
        "ARCHIVE_OS_METADATA_FILE",
        "",
        "",
        `${t.length - ie} more macOS or Windows system files (.DS_Store, Thumbs.db, desktop.ini, __MACOSX) are inside a plugin; remove every one from the repository, then validate again.`,
      ),
    );
  return { findings: mapped, notSearched: o || a.length > 0 };
}

export { findOsMetadataFiles, markRemoteMcpServer, markRemoteHooks };
