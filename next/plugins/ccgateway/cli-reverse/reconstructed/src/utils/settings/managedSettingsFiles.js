/**
 * utils/settings/managedSettingsFiles.ts
 *
 * 托管设置文件加载（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5fn9rb8r.js (3)
 * attribution: placement 3
 */
import { join } from "path";
import { getErrnoCode } from "../errors.js";
import { WSL_MANAGED_SETTINGS_DIR } from "./mdm/wslRegistry.js";
import { readManagedDocumentText, managedFileHasContent } from "./mdm/settings.js";
import { unreadableSettingsFileError, unparseablePolicyDocumentError } from "./settingsFileParsing.js";
import { resolvePathStepsAsync } from "../../services/mcp/managedMcpPolicy.js";
import { safeParseJSON } from "../json.js";
import { isPlainObject } from "../isPlainObject.js";
import { combinedLoadState } from "./policySettings.js";
import { readWslInheritFlag } from "./types.js";
import { getFsImplementation } from "../fsOperations.js";
import { isManagedSettingsDropInName } from "./managedFileSettings.js";

//@ chunk-5fn9rb8r.js:17962-18023 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
function isNotFoundErrno_5(realCandidate) {
  let code = getErrnoCode(realCandidate);
  return code === "ENOENT" || code === "ENOTDIR";
}
//@ chunk-5fn9rb8r.js:18023-19110 placement
async function loadManagedSettingsFile(store) {
  let records = [];
  let loadState = "absent";
  let links = [];
  let memo = new Map();
  async function readDoc(parts, isLink) {
    let path = join(WSL_MANAGED_SETTINGS_DIR, ...parts);
    let text;
    try {
      text = await readManagedDocumentText(path, store);
    } catch (error) {
      if (isNotFoundErrno_5(error)) return "disarmed";
      records.push(unreadableSettingsFileError(path, error));
      loadState = "didNotLoad";
    }
    let pathSteps = await resolvePathStepsAsync(WSL_MANAGED_SETTINGS_DIR, parts, isLink, memo);
    if (pathSteps !== null) links.push(pathSteps);
    if (text === undefined) return "disarmed";
    let parsed = text.trim() === "" ? {} : safeParseJSON(text, false);
    if (!isPlainObject(parsed)) {
      records.push(unparseablePolicyDocumentError(path));
      loadState = "didNotLoad";
      return "disarmed";
    }
    loadState = combinedLoadState(loadState, "loaded");
    return readWslInheritFlag(parsed);
  }
  let flagPath = join(WSL_MANAGED_SETTINGS_DIR, "managed-settings.json");
  let flag = await readDoc(["managed-settings.json"]);
  if (flag === "armed")
    return {
      flag,
      records,
      loadState,
      links,
    };
  let unreadableFlagPath = flag === "unreadable" ? flagPath : undefined;
  let dropInDir = join(WSL_MANAGED_SETTINGS_DIR, "managed-settings.d");
  let dirents;
  try {
    dirents = await getFsImplementation().readdir(dropInDir);
  } catch (error) {
    if (!isNotFoundErrno_5(error)) {
      records.push(unreadableSettingsFileError(dropInDir, error, "directory"));
      loadState = "didNotLoad";
    }
    return {
      flag,
      unreadableFlagPath,
      records,
      loadState,
      links,
    };
  }
  for (let dirent of dirents) {
    if (
      !(dirent.isFile() || dirent.isSymbolicLink()) ||
      !dirent.name.endsWith(".json") ||
      dirent.name.startsWith(".")
    )
      continue;
    let dropInFlag = await readDoc(["managed-settings.d", dirent.name], dirent.isSymbolicLink());
    if (dropInFlag === "armed")
      return {
        flag: dropInFlag,
        records,
        loadState,
        links,
      };
    if (dropInFlag === "unreadable") {
      flag = dropInFlag;
      unreadableFlagPath ??= join(dropInDir, dirent.name);
    }
  }
  return {
    flag,
    unreadableFlagPath,
    records,
    loadState,
    links,
  };
}
//@ chunk-5fn9rb8r.js:19110-19380 placement
async function hasManagedSettingsDocument(dir, store) {
  if (await managedFileHasContent(join(dir, "managed-settings.json"), store)) return true;
  let dropInDir = join(dir, "managed-settings.d");
  let dirents;
  try {
    dirents = await getFsImplementation().readdir(dropInDir);
  } catch (error) {
    return !isNotFoundErrno_5(error);
  }
  for (let dirent of dirents)
    if (
      (dirent.isFile() || dirent.isSymbolicLink()) &&
      isManagedSettingsDropInName(dirent.name) &&
      (await managedFileHasContent(join(dropInDir, dirent.name), store))
    )
      return true;
  return false;
}
export { loadManagedSettingsFile, hasManagedSettingsDocument, isNotFoundErrno_5 };
