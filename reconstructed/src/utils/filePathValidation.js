/**
 * utils/filePathValidation.ts
 *
 * 2.1.316 新增：文件路径校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { expandStablePath, UnstablePathError } from "./path.js";
import { env } from "./env.js";
import { isCoworkEntrypoint } from "./entrypointKinds.js";
import { isRemoteToolsForwardEnabled } from "../bridge/deviceRegistration.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import {
  DEVICE_BASH_TOOL,
  DEVICE_COMMIT_FILES_TOOL,
  DEVICE_STAGE_FILES_TOOL,
} from "../services/mcp/firstPartyServerIds.js";
import { getOutputsRoot } from "./stageFileRoots.js";
import { _enum } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-e6aww6q8.js:1365030-1365078 placement
/**
 * 去重追加：值不存在时才 push。
 */
function pushUnique(e, absolutePath) {
  if (e && !e.includes(absolutePath)) e.push(absolutePath);
}
//@ chunk-e6aww6q8.js:1365078-1366023 placement
/**
 * 只暴露部分字段的工具上下文视图。
 */
function createToolContextView(toolContext, n) {
  return {
    get session() {
      return toolContext.session;
    },
    get agentId() {
      return toolContext.agentId;
    },
    get agentWorktree() {
      return toolContext.agentWorktree;
    },
    get storageV5() {
      return toolContext.storageV5;
    },
    get tools() {
      return toolContext.tools;
    },
    get readFileState() {
      return toolContext.readFileState;
    },
    get getFileHistoryState() {
      return toolContext.getFileHistoryState;
    },
    get applyFileHistoryOp() {
      return toolContext.applyFileHistoryOp;
    },
    get dynamicSkillDirTriggers() {
      return toolContext.dynamicSkillDirTriggers;
    },
    get nestedMemoryAttachmentTriggers() {
      return toolContext.nestedMemoryAttachmentTriggers;
    },
    get model() {
      return toolContext.model;
    },
    get permissions() {
      return toolContext.permissions;
    },
    get toolUseId() {
      return n.toolUseId;
    },
    get remoteCall() {
      return n.remoteCall;
    },
    get inputFromAnotherMachine() {
      return n.inputFromAnotherMachine;
    },
    get callerLogsSharedEvents() {
      return n.callerLogsSharedEvents;
    },
    get gitDiffRead() {
      return n.gitDiffRead;
    },
    get smallResultAsked() {
      return n.smallResultAsked;
    },
    get permissionSurface() {
      return n.permissionSurface;
    },
    get userModified() {
      return n.userModified;
    },
  };
}
//@ chunk-e6aww6q8.js:1366023-1366221 placement
function rejectNullBytes(e, n) {
  let found = n.find(([, s]) => s?.includes("\x00"));
  if (found)
    return {
      result: false,
      message: `${e} ${found[0]} cannot contain null bytes (\\0). Remove the null byte and try again.`,
      errorCode: 2,
    };
  return null;
}
//@ chunk-e6aww6q8.js:1366221-1366596 placement
/**
 * 解析后末尾为空白的路径拒绝。
 */
function rejectTrailingWhitespace(e, n) {
  let found = n.find(([, s]) => {
    try {
      expandStablePath(s);
      return false;
    } catch (error) {
      if (error instanceof UnstablePathError) return true;
      throw error;
    }
  });
  return found
    ? {
        result: false,
        message: `${e} ${found[0]} ends in white space once its "." and ".." are resolved, and ${e} refuses such a path. If the white space is not meant, send the path without it. ${e} cannot open a file whose own name ends in white space.`,
        errorCode: 20,
      }
    : null;
}
//@ chunk-e6aww6q8.js:1366596-1366685 placement
var EXPLICIT_HOME_PATH_RE = /^\s*(?:\/(?:Users|Volumes)\/|[A-Za-z]:[\\/]|\\\\)/;
var POSIX_HOME_PATH_RE = /^\/(?:Users|Volumes)\//;
//@ chunk-e6aww6q8.js:1366685-1367448 placement
function checkForeignFilePath(e, n) {
  if (
    env.platform !== "linux" ||
    !isCoworkEntrypoint() ||
    env.CLAUDE_CODE_ENVIRONMENT_KIND !== undefined ||
    isRemoteToolsForwardEnabled() ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_hazy_cosmos", true) === false
  )
    return null;
  let found = n.find(
    ([, s]) => EXPLICIT_HOME_PATH_RE.test(s) || POSIX_HOME_PATH_RE.test(expandStablePath(s)),
  );
  return found
    ? {
        result: false,
        message: `${e} ${found[0]} starts like a path on the user's computer and was refused; nothing was written. Neither ${e} nor ${BASH_TOOL_NAME} runs there: on this session's machine that path names an unrelated file, which never reaches the user. If this session has ${DEVICE_BASH_TOOL}, make or change the file there with it. Otherwise save the finished file under ${getOutputsRoot()}, from where ${DEVICE_COMMIT_FILES_TOOL} copies it over; to change a file of theirs, first copy it here with ${DEVICE_STAGE_FILES_TOOL}. With none of these tools, work here and tell the user that nothing was saved on their computer.`,
        errorCode: 22,
      }
    : null;
}
//@ chunk-e6aww6q8.js:1367448-1367518 placement
/**
 * 用给定 schema 校验工具输入，成功返回原对象，否则 null。
 */
function parsedToolInputOrNull(e, n) {
  return n !== null && e.safeParse(n.input).success ? n : null;
}
//@ chunk-e6aww6q8.js:1367518-1367657 placement
var SKILL_SAVE_SURFACES = {
  review: true,
  card: true,
  cloud: true,
  linked: true,
  policy: true,
};
var SKILL_SAVE_OUTCOMES = {
  save_tool: true,
  propose_tool: true,
  send_file: true,
  no_save_tool: true,
  report_unsaved: true,
};
//@ chunk-e6aww6q8.js:1367657-1367698 placement
/**
 * 取对象的键列表。
 */
function objectKeysArray(e) {
  return _enum(Object.keys(e));
}
export {
  rejectNullBytes,
  rejectTrailingWhitespace,
  pushUnique,
  objectKeysArray,
  SKILL_SAVE_SURFACES,
  SKILL_SAVE_OUTCOMES,
  parsedToolInputOrNull,
  createToolContextView,
  checkForeignFilePath,
};
