/**
 * commands/add-dir/validation.ts
 *
 * validateDirectoryForWorkspace：附加目录校验（空路径、展开失败、不存在、已在工作区内等）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/add-dir/validation.ts
 * pieces: chunk-m4knadjm.js (2)
 * attribution: fingerprint 2
 */
import { resolve, dirname } from "path";
import { stat } from "fs/promises";
import { getOriginalCwdOrNull, getPermissionScreenAnchor, getOriginalCwd } from "../../bootstrap/state.js";
import { expandPath, NullBytePathError } from "../../utils/path.js";
import { logError } from "../../utils/log.js";
import { ai } from "../../utils/networkPaths.js";
import { entryReachesForeignNetwork } from "../../utils/fsOperations.js";
import { isFsInaccessible, getErrnoCode } from "../../utils/errors.js";
import {
  blockReadsWorkingDirectories,
  allWorkingDirectories,
  pathInWorkingPath,
} from "../../utils/permissions/filesystem.js";
import { sequential } from "../../utils/sequential.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-m4knadjm.js:578-1599 fingerprint = validateDirectoryForWorkspace (0.585)
async function validateDirectoryForWorkspace(directoryPath, permissionContext) {
  if (!directoryPath) return { resultType: "emptyPath" };
  if (getOriginalCwdOrNull() === null)
    return { resultType: "invalidPath", directoryPath: directoryPath, containsNullByte: !1 };
  let e;
  try {
    e = resolve(expandPath(directoryPath));
  } catch (error) {
    let i = error instanceof NullBytePathError;
    if (!i) logError(Error("validateDirectoryForWorkspace: expandPath threw"));
    return { resultType: "invalidPath", directoryPath: directoryPath, containsNullByte: i };
  }
  if (ai(directoryPath) || (await entryReachesForeignNetwork(e, getPermissionScreenAnchor())))
    return { resultType: "networkPath", directoryPath: directoryPath, absolutePath: e };
  try {
    if (!(await stat(e)).isDirectory())
      return { resultType: "notADirectory", directoryPath: directoryPath, absolutePath: e };
  } catch (error) {
    if (!isFsInaccessible(error))
      logError(
        Object.assign(Error("validateDirectoryForWorkspace: unexpected stat errno"), {
          code: getErrnoCode(error),
        }),
      );
    return { resultType: "pathNotFound", directoryPath: directoryPath, absolutePath: e };
  }
  let n =
      permissionContext.blockReadsOutsideWorkingDirectories ||
      permissionContext.blockWritesOutsideWorkingDirectories
        ? blockReadsWorkingDirectories(permissionContext)
        : allWorkingDirectories(permissionContext),
    s = getOriginalCwd();
  for (let workingDir of n)
    if (pathInWorkingPath(e, workingDir, { caseFold: !1 }))
      return {
        resultType: "alreadyInWorkingDirectory",
        directoryPath: directoryPath,
        absolutePath: e,
        workingDir: workingDir,
        isExactMatch: resolve(workingDir) === e,
        isOriginalCwd: workingDir === s,
      };
  return { resultType: "success", absolutePath: e };
}
//@ chunk-m4knadjm.js:1599-3015 fingerprint = addDirHelpMessage (0.67)
function addDirHelpMessage(result) {
  switch (result.resultType) {
    case "emptyPath":
      return "Please provide a directory path.";
    case "invalidPath": {
      let bold = sequential.bold(jsonStringify(result.directoryPath));
      return result.containsNullByte
        ? `Path ${bold} contains a null character, so it can't be used as a working directory. Remove the null character from the path or from the settings entry that lists it.`
        : `Path ${bold} couldn't be resolved, so it can't be used as a working directory. Check the path or the settings entry that lists it.`;
    }
    case "pathNotFound":
      return `Path ${sequential.bold(result.absolutePath)} was not found.`;
    case "networkPath":
      return `${sequential.bold(result.directoryPath)} is a network path, which cannot be added as a working directory. On Windows, map the share to a drive letter and pass it at launch with --add-dir (a drive letter added mid-session does not yet carry remote-read trust).`;
    case "notADirectory": {
      let parentDir = dirname(result.absolutePath);
      return `${sequential.bold(result.directoryPath)} is not a directory. Did you mean to add the parent directory ${sequential.bold(parentDir)}?`;
    }
    case "alreadyInWorkingDirectory": {
      let bold = sequential.bold(result.directoryPath);
      if (result.isExactMatch)
        return result.isOriginalCwd
          ? `${bold} is already the current working directory.`
          : `${bold} is already added as a working directory.`;
      let e = result.isOriginalCwd ? "the current working directory" : "the additional working directory";
      return `${bold} is already accessible within ${e} ${sequential.bold(result.workingDir)}.`;
    }
    case "success":
      return `Added ${sequential.bold(result.absolutePath)} as a working directory.`;
  }
}

export { validateDirectoryForWorkspace, addDirHelpMessage };
