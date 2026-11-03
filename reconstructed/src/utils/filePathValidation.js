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
import { Z2 } from "../bridge/deviceRegistration.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import {
  DEVICE_BASH_TOOL,
  DEVICE_COMMIT_FILES_TOOL,
  DEVICE_STAGE_FILES_TOOL,
} from "../services/mcp/firstPartyServerIds.js";
import { getOutputsRoot } from "./stageFileRoots.js";
import { U } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-e6aww6q8.js:1365030-1365078 placement
function Vq(e, n) {
  if (e && !e.includes(n)) e.push(n);
}
/**
 * 只暴露部分字段的工具上下文视图。
 */
//@ chunk-e6aww6q8.js:1365078-1366023 placement
function createToolContextView(e, n) {
  return {
    get session() {
      return e.session;
    },
    get agentId() {
      return e.agentId;
    },
    get agentWorktree() {
      return e.agentWorktree;
    },
    get storageV5() {
      return e.storageV5;
    },
    get tools() {
      return e.tools;
    },
    get readFileState() {
      return e.readFileState;
    },
    get getFileHistoryState() {
      return e.getFileHistoryState;
    },
    get applyFileHistoryOp() {
      return e.applyFileHistoryOp;
    },
    get dynamicSkillDirTriggers() {
      return e.dynamicSkillDirTriggers;
    },
    get nestedMemoryAttachmentTriggers() {
      return e.nestedMemoryAttachmentTriggers;
    },
    get model() {
      return e.model;
    },
    get permissions() {
      return e.permissions;
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
      result: !1,
      message: `${e} ${found[0]} cannot contain null bytes (\\0). Remove the null byte and try again.`,
      errorCode: 2,
    };
  return null;
}
/**
 * 解析后末尾为空白的路径拒绝。
 */
//@ chunk-e6aww6q8.js:1366221-1366596 placement
function rejectTrailingWhitespace(e, n) {
  let found = n.find(([, s]) => {
    try {
      return (expandStablePath(s), !1);
    } catch (error) {
      if (error instanceof UnstablePathError) return !0;
      throw error;
    }
  });
  return found
    ? {
        result: !1,
        message: `${e} ${found[0]} ends in white space once its "." and ".." are resolved, and ${e} refuses such a path. If the white space is not meant, send the path without it. ${e} cannot open a file whose own name ends in white space.`,
        errorCode: 20,
      }
    : null;
}
//@ chunk-e6aww6q8.js:1366596-1366685 placement
var kqo = /^\s*(?:\/(?:Users|Volumes)\/|[A-Za-z]:[\\/]|\\\\)/,
  bqo = /^\/(?:Users|Volumes)\//;
//@ chunk-e6aww6q8.js:1366685-1367448 placement
function checkForeignFilePath(e, n) {
  if (
    env.platform !== "linux" ||
    !isCoworkEntrypoint() ||
    env.CLAUDE_CODE_ENVIRONMENT_KIND !== void 0 ||
    Z2() ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_hazy_cosmos", !0) === !1
  )
    return null;
  let found = n.find(([, s]) => kqo.test(s) || bqo.test(expandStablePath(s)));
  return found
    ? {
        result: !1,
        message: `${e} ${found[0]} starts like a path on the user's computer and was refused; nothing was written. Neither ${e} nor ${BASH_TOOL_NAME} runs there: on this session's machine that path names an unrelated file, which never reaches the user. If this session has ${DEVICE_BASH_TOOL}, make or change the file there with it. Otherwise save the finished file under ${getOutputsRoot()}, from where ${DEVICE_COMMIT_FILES_TOOL} copies it over; to change a file of theirs, first copy it here with ${DEVICE_STAGE_FILES_TOOL}. With none of these tools, work here and tell the user that nothing was saved on their computer.`,
        errorCode: 22,
      }
    : null;
}
//@ chunk-e6aww6q8.js:1367448-1367518 placement
function sK(e, n) {
  return n !== null && e.safeParse(n.input).success ? n : null;
}
//@ chunk-e6aww6q8.js:1367518-1367657 placement
var SKILL_SAVE_SURFACES = { review: !0, card: !0, cloud: !0, linked: !0, policy: !0 },
  SKILL_SAVE_OUTCOMES = {
    save_tool: !0,
    propose_tool: !0,
    send_file: !0,
    no_save_tool: !0,
    report_unsaved: !0,
  };
//@ chunk-e6aww6q8.js:1367657-1367698 placement
function cXt(e) {
  return U(Object.keys(e));
}

export {
  rejectNullBytes,
  rejectTrailingWhitespace,
  Vq,
  cXt,
  SKILL_SAVE_SURFACES,
  SKILL_SAVE_OUTCOMES,
  sK,
  createToolContextView,
  checkForeignFilePath,
};
