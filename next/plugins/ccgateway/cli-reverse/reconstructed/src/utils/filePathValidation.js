/**
 * utils/filePathValidation.ts
 *
 * 2.1.316 新增：文件路径校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: placement 9
 */
import { codeModeAccepted } from "./codeMode/accepted.js";
import { expandStablePath, UnstablePathError } from "./path.js";
import { env } from "./env.js";
import { isCoworkEntrypoint } from "./entrypointKinds.js";
import { isRemoteToolsForwardEnabled2 } from "../bridge/deviceRegistration.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import {
  DEVICE_BASH_TOOL,
  DEVICE_COMMIT_FILES_TOOL,
  DEVICE_STAGE_FILES_TOOL,
} from "../services/mcp/firstPartyServerIds.js";
import { getOutputsRoot } from "./stageFileRoots.js";
import { _enum } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-5xgkngpb.js:1364350-1364398 placement
/**
 * 去重追加：值不存在时才 push。
 */
function pushUnique(list, absolutePath) {
  if (list && !list.includes(absolutePath)) list.push(absolutePath);
}
//@ chunk-5xgkngpb.js:1364398-1365528 placement
/**
 * 只暴露部分字段的工具上下文视图。
 */
function createToolContextView(toolContext, toolUseContext) {
  let view = {
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
      return toolUseContext.toolUseId;
    },
    get remoteCall() {
      return toolUseContext.remoteCall;
    },
    get readBaseline() {
      return toolUseContext.remoteCall?.readBaseline ?? toolUseContext.carriedReadBaseline;
    },
    get inputFromAnotherMachine() {
      return toolUseContext.inputFromAnotherMachine;
    },
    get callerLogsSharedEvents() {
      return toolUseContext.callerLogsSharedEvents;
    },
    get gitDiffRead() {
      return toolUseContext.gitDiffRead;
    },
    get smallResultAsked() {
      return toolUseContext.smallResultAsked;
    },
    get permissionSurface() {
      return toolUseContext.permissionSurface;
    },
    get userModified() {
      return toolUseContext.userModified;
    },
  };
  if (codeModeAccepted())
    Object.defineProperty(view, "primitiveToolGrant", {
      get: () => toolContext.primitiveToolGrant,
      enumerable: true,
    });
  return view;
}
//@ chunk-5xgkngpb.js:1365528-1365726 placement
function rejectNullBytes(label, entries) {
  let found = entries.find(([, value]) => value?.includes("\x00"));
  if (found)
    return {
      result: false,
      message: `${label} ${found[0]} cannot contain null bytes (\\0). Remove the null byte and try again.`,
      errorCode: 2,
    };
  return null;
}
//@ chunk-5xgkngpb.js:1365726-1366101 placement
/**
 * 解析后末尾为空白的路径拒绝。
 */
function rejectTrailingWhitespace(label, entries) {
  let found = entries.find(([, value]) => {
    try {
      expandStablePath(value);
      return false;
    } catch (error) {
      if (error instanceof UnstablePathError) return true;
      throw error;
    }
  });
  return found
    ? {
        result: false,
        message: `${label} ${found[0]} ends in white space once its "." and ".." are resolved, and ${label} refuses such a path. If the white space is not meant, send the path without it. ${label} cannot open a file whose own name ends in white space.`,
        errorCode: 20,
      }
    : null;
}
//@ chunk-5xgkngpb.js:1366101-1366190 placement
var EXPLICIT_HOME_PATH_RE = /^\s*(?:\/(?:Users|Volumes)\/|[A-Za-z]:[\\/]|\\\\)/;
var POSIX_HOME_PATH_RE = /^\/(?:Users|Volumes)\//;
//@ chunk-5xgkngpb.js:1366190-1366954 placement
function checkForeignFilePath(entries, toolName) {
  if (
    env.platform !== "linux" ||
    !isCoworkEntrypoint() ||
    env.CLAUDE_CODE_ENVIRONMENT_KIND !== undefined ||
    isRemoteToolsForwardEnabled2() ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_hazy_cosmos", true) === false
  )
    return null;
  let found = toolName.find(
    ([, value]) => EXPLICIT_HOME_PATH_RE.test(value) || POSIX_HOME_PATH_RE.test(expandStablePath(value)),
  );
  return found
    ? {
        result: false,
        message: `${entries} ${found[0]} starts like a path on the user's computer and was refused; nothing was written. Neither ${entries} nor ${BASH_TOOL_NAME} runs there: on this session's machine that path names an unrelated file, which never reaches the user. If this session has ${DEVICE_BASH_TOOL}, make or change the file there with it. Otherwise save the finished file under ${getOutputsRoot()}, from where ${DEVICE_COMMIT_FILES_TOOL} copies it over; to change a file of theirs, first copy it here with ${DEVICE_STAGE_FILES_TOOL}. With none of these tools, work here and tell the user that nothing was saved on their computer.`,
        errorCode: 22,
      }
    : null;
}
//@ chunk-5xgkngpb.js:1366954-1367024 placement
/**
 * 用给定 schema 校验工具输入，成功返回原对象，否则 null。
 */
function parsedToolInputOrNull(input, tool) {
  return tool !== null && input.safeParse(tool.input).success ? tool : null;
}
//@ chunk-5xgkngpb.js:1367024-1367163 placement
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
//@ chunk-5xgkngpb.js:1367163-1367204 placement
/**
 * 取对象的键列表。
 */
function objectKeysArray(object) {
  return _enum(Object.keys(object));
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
