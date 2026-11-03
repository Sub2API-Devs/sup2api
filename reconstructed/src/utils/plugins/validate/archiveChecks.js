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
import {
  ARCHIVE_OS_METADATA_NAMES,
  MAX_LINK_CHECK_COUNT,
  MACOS_METADATA_DIR,
  MAX_SCREENSHOT_COUNT,
  formatFailureDetails,
  MAX_ISSUE_ROWS,
  MAX_URL_LENGTH,
} from "./validatePluginDirectory.js";

//@ chunk-5aas12zq.js:42139-42356 placement
function markRemoteMcpServer(e, { config }) {
  let t = typeof config.type === "string" ? config.type : "";
  if (
    ["http", "streamable-http", "claudeai-proxy", "sse", "sse-ide", "ws", "ws-ide"].includes(t) &&
    !isAllWhitespace(typeof config.url === "string" ? config.url : "")
  )
    e.connectsToRemote = true;
}
//@ chunk-5aas12zq.js:42356-42438 placement
function isAllWhitespace(e) {
  for (let idx = 0; idx < e.length; idx++) if (e.charCodeAt(idx) > 32) return false;
  return true;
}
//@ chunk-5aas12zq.js:42438-42646 placement
function markRemoteHooks(e, n) {
  if (!isPlainObject(n)) return;
  for (let t of Object.values(n))
    for (let r of Array.isArray(t) ? t : []) {
      let hooks = isPlainObject(r) ? r.hooks : undefined;
      for (let o of Array.isArray(hooks) ? hooks : [])
        if (isPlainObject(o) && o.type === "http") e.connectsToRemote = true;
    }
}
//@ chunk-5aas12zq.js:42646-44336 placement
/**
 * 在有限条目数与目录深度内遍历插件（跳过根 .git），收集 .DS_Store、Thumbs.db、__MACOSX 等系统文件，生成 ARCHIVE_OS_METADATA_FILE 发现项； 截断或无法列出的目录写入说明。
 */
async function findOsMetadataFiles(e, n) {
  let t = [];
  let r = [
    {
      relative: "",
      depth: 0,
    },
  ];
  let s = 0;
  let o = false;
  let a = [];
  while (r.length > 0) {
    let d = r.pop();
    if (d === undefined) break;
    let f = await readdir(pathModule.join(e, d.relative), {
      withFileTypes: true,
    }).catch((error) => {
      if (!isNotFoundErrno_4(error)) a.push(d.relative === "" ? "." : d.relative);
      return [];
    });
    for (let p of f) {
      if (s++ >= ARCHIVE_OS_METADATA_NAMES) {
        o = true;
        break;
      }
      let S = d.relative === "" ? p.name : `${d.relative}/${p.name}`;
      let included = `/${d.relative}/`.includes(`/${MAX_LINK_CHECK_COUNT}/`);
      if (p.isDirectory()) {
        if (p.name === ".git" && d.relative === "") continue;
        if (d.depth + 1 > MACOS_METADATA_DIR) {
          o = true;
          continue;
        }
        r.push({
          relative: S,
          depth: d.depth + 1,
        });
      } else if (p.isFile() && (MAX_SCREENSHOT_COUNT.has(p.name) || included)) t.push(S);
    }
    if (o && s > ARCHIVE_OS_METADATA_NAMES) break;
  }
  if (o)
    n.push(
      `Looked for macOS and Windows system files in the first ${ARCHIVE_OS_METADATA_NAMES} entries and ${MACOS_METADATA_DIR} folder levels of the plugin only; the rest was not checked.`,
    );
  if (a.length > 0)
    n.push(
      `Could not list ${formatFailureDetails(a)} inside the plugin, so what is under ${a.length === 1 ? "it" : "them"} was not searched for macOS and Windows system files. Check that ${a.length === 1 ? "the folder" : "each folder"} can be read, and validate again.`,
    );
  t.sort();
  if (t.length > 0) n.push(MAX_ISSUE_ROWS);
  let mapped = t
    .slice(0, MAX_URL_LENGTH)
    .map((d) =>
      makeFinding(
        "ARCHIVE_OS_METADATA_FILE",
        d,
        "",
        "This is a macOS or Windows system file (.DS_Store, Thumbs.db, desktop.ini, or anything under __MACOSX), not part of your plugin. The directory cannot scan or list a plugin that contains one. Remove it from the repository (git rm --cached the file, commit and push, and add the name to .gitignore), then validate again.",
      ),
    );
  if (t.length > MAX_URL_LENGTH)
    mapped.push(
      makeFinding(
        "ARCHIVE_OS_METADATA_FILE",
        "",
        "",
        `${t.length - MAX_URL_LENGTH} more macOS or Windows system files (.DS_Store, Thumbs.db, desktop.ini, __MACOSX) are inside a plugin; remove every one from the repository, then validate again.`,
      ),
    );
  return {
    findings: mapped,
    notSearched: o || a.length > 0,
  };
}
export { findOsMetadataFiles, markRemoteMcpServer, markRemoteHooks };
