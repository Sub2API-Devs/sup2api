/**
 * utils/plugins/validate/archiveChecks.ts
 *
 * 2.1.316 新增：插件目录校验：归档检查
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6vxyfwtv.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { readdir } from "fs/promises";
import * as pathModule from "path";
import { isPlainObject } from "../../isPlainObject.js";
import { isNotFoundErrno_4, makeFinding } from "./helpers.js";
import {
  MAX_SCAN_ENTRIES,
  MACOSX_METADATA_DIR,
  MAX_SCAN_DEPTH,
  SYSTEM_FILE_NAMES,
  formatFailureDetails,
  SYSTEM_FILES_FOUND_NOTE,
  MAX_LISTED_SYSTEM_FILES,
} from "./validatePluginDirectory.js";
import { buildSecretScanResult } from "../../../skills/bundled/pluginAuthoring/secretScanTool.js";

//@ chunk-6vxyfwtv.js:42426-42643 placement
function markRemoteMcpServer(info, { config }) {
  let type = typeof config.type === "string" ? config.type : "";
  if (
    ["http", "streamable-http", "claudeai-proxy", "sse", "sse-ide", "ws", "ws-ide"].includes(type) &&
    !isAllWhitespace(typeof config.url === "string" ? config.url : "")
  )
    info.connectsToRemote = true;
}
//@ chunk-6vxyfwtv.js:42643-42725 placement
function isAllWhitespace(text) {
  for (let idx = 0; idx < text.length; idx++) if (text.charCodeAt(idx) > 32) return false;
  return true;
}
//@ chunk-6vxyfwtv.js:42725-42933 placement
function markRemoteHooks(info, hooks) {
  if (!isPlainObject(hooks)) return;
  for (let entries of Object.values(hooks))
    for (let entry of Array.isArray(entries) ? entries : []) {
      let hooks = isPlainObject(entry) ? entry.hooks : undefined;
      for (let hook of Array.isArray(hooks) ? hooks : [])
        if (isPlainObject(hook) && hook.type === "http") info.connectsToRemote = true;
    }
}
//@ chunk-6vxyfwtv.js:42933-44646 placement
/**
 * 在有限条目数与目录深度内遍历插件（跳过根 .git），收集 .DS_Store、Thumbs.db、__MACOSX 等系统文件，生成 ARCHIVE_OS_METADATA_FILE 发现项； 截断或无法列出的目录写入说明。
 */
async function findOsMetadataFiles(root, notes) {
  let found = [];
  let queue = [
    {
      relative: "",
      depth: 0,
    },
  ];
  let visited = 0;
  let truncated = false;
  let unreadable = [];
  while (queue.length > 0) {
    let item = queue.pop();
    if (item === undefined) break;
    let entries = await readdir(pathModule.join(root, item.relative), {
      withFileTypes: true,
    }).catch((error) => {
      if (!isNotFoundErrno_4(error)) unreadable.push(item.relative === "" ? "." : item.relative);
      return [];
    });
    for (let entry of entries) {
      if (visited++ >= MAX_SCAN_ENTRIES) {
        truncated = true;
        break;
      }
      let relPath = item.relative === "" ? entry.name : `${item.relative}/${entry.name}`;
      let included = `/${item.relative}/`.includes(`/${MACOSX_METADATA_DIR}/`);
      if (entry.isDirectory()) {
        if (
          (entry.name === ".git" && item.relative === "") ||
          (await buildSecretScanResult(pathModule.join(root, relPath)))
        )
          continue;
        if (item.depth + 1 > MAX_SCAN_DEPTH) {
          truncated = true;
          continue;
        }
        queue.push({
          relative: relPath,
          depth: item.depth + 1,
        });
      } else if (entry.isFile() && (SYSTEM_FILE_NAMES.has(entry.name) || included)) found.push(relPath);
    }
    if (truncated && visited > MAX_SCAN_ENTRIES) break;
  }
  if (truncated)
    notes.push(
      `Looked for macOS and Windows system files in the first ${MAX_SCAN_ENTRIES} entries and ${MAX_SCAN_DEPTH} folder levels of the plugin only; the rest was not checked.`,
    );
  if (unreadable.length > 0)
    notes.push(
      `Could not list ${formatFailureDetails(unreadable)} inside the plugin, so what is under ${unreadable.length === 1 ? "it" : "them"} was not searched for macOS and Windows system files. Check that ${unreadable.length === 1 ? "the folder" : "each folder"} can be read, and validate again.`,
    );
  found.sort();
  if (found.length > 0) notes.push(SYSTEM_FILES_FOUND_NOTE);
  let mapped = found
    .slice(0, MAX_LISTED_SYSTEM_FILES)
    .map((path) =>
      makeFinding(
        "ARCHIVE_OS_METADATA_FILE",
        path,
        "",
        "This is a macOS or Windows system file (.DS_Store, Thumbs.db, desktop.ini, or anything under __MACOSX), not part of your plugin. The directory cannot scan or list a plugin that contains one. Remove it from the repository (git rm --cached the file, commit and push, and add the name to .gitignore), then validate again.",
      ),
    );
  if (found.length > MAX_LISTED_SYSTEM_FILES)
    mapped.push(
      makeFinding(
        "ARCHIVE_OS_METADATA_FILE",
        "",
        "",
        `${found.length - MAX_LISTED_SYSTEM_FILES} more macOS or Windows system files (.DS_Store, Thumbs.db, desktop.ini, __MACOSX) are inside a plugin; remove every one from the repository, then validate again.`,
      ),
    );
  return {
    findings: mapped,
    notSearched: truncated || unreadable.length > 0,
  };
}
export { findOsMetadataFiles, markRemoteMcpServer, markRemoteHooks };
