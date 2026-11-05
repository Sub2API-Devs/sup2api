/**
 * services/mcpServe/contextCalls.ts
 *
 * 2.1.316 新增：mcp serve 上下文调用：读取项目上下文、嵌套上下文与变更文件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xrwmcqkn.js (19)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { dirname, posix } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  int,
  objectSchema,
  array,
  numberSchema,
  literal,
  booleanSchema,
  unknown,
  _enum,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  safeSerializedPermissionContextSchema,
  exceedsSerializedContextLimit,
} from "../../utils/permissions/permissionContextSerialization.js";
import { agentIdSchema, call, mcpServeCallState } from "./callClaims.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { readRepoRulesForRequest } from "./repoPermissionRules.js";
import { createRemoteFileState } from "../../utils/remoteFileState.js";
import { serveModeDefaultAppState } from "../../entrypoints/mcpServe/serveModeInput.js";
import { buildNativeDoctorDiagnostics } from "../../screens/Doctor.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { createChildAbortController } from "../../utils/abortController.js";
import {
  getChangedFiles,
  buildHeldOutsideTracker,
  iterateMemoryFilesForPath,
} from "../../utils/attachments.js";
import { identityAgentId2 } from "../../utils/agentId.js";
import { ProxyEnvironmentSchema, getAgentProxyNoteObject } from "../../constants/agentProxyPrompt.js";
import { diskStateSchema, diskState } from "./toolHostIds.js";
import { getOriginalCwd, setClaudeMdAdditionalDirectoriesAsked } from "../../bootstrap/state.js";
import { findGitRootUncached } from "../../utils/git.js";
import { env } from "../../utils/env.js";
import {
  fromPluginInstructionFiles,
  toPluginInstructionFile,
} from "../../plugins/functionHooks/sites/promptContextSites.js";
import { fsAncestors } from "../../plugins/functionHooks/fsApi.js";
import {
  AGENTS_MD_FILENAMES,
  CLAUDE_MD_FILENAMES,
  DEFAULT_AGENTS_MD_MODE,
  excludeDirs,
  dedupeInstructionFiles,
  flattenProjectInstructionParts,
  isClaudeMdAtDir,
  insertAgentsMdFiles,
} from "../../plugins/bundled/agentsMd/agentsMdFiles.js";
import { AGENTS_MD_PLUGIN_NAME } from "../../plugins/bundled/agentsMd/index.js";
import {
  setClaudeMdJudgedBy,
  disableSetupGuideReports,
  markInitialLoadLogged,
  getMemoryFilesCached,
} from "../../utils/claudemd.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { mergePersistedDenyRules } from "../../utils/permissions/permissions.js";
import { isClaudeMdLoadingDisabled } from "../../utils/settings/customizationDisabled.js";
import { clearMemoryFilesCache } from "../../components/Message.js";
import { pathInAllowedWorkingPath } from "../../utils/permissions/filesystem.js";

//@ chunk-xrwmcqkn.js:31218-31483 placement
/**
 * 变更文件结果的 schema。
 */
var READCHANGEDFILES = "ReadChangedFiles";
var CHANGED_FILES_TIMEOUT_MS = 3000;
var readChangedFilesInputSchema = DoctorLazy(() =>
  zodStrictObject({
    permission_context: safeSerializedPermissionContextSchema(),
    agent_id: agentIdSchema().optional(),
    told: zodStrictObject({
      id: stringSchema().max(64),
      count: int().min(0),
    }).optional(),
  }),
);
var changedFilesResultSchema = DoctorLazy(() =>
  objectSchema({
    id: stringSchema().optional(),
    changed: array(
      objectSchema({
        filename: stringSchema(),
        snippet: stringSchema(),
      }),
    ),
    tracked: numberSchema(),
    isBusy: literal(true).optional(),
  }),
);
//@ chunk-xrwmcqkn.js:31483-31546 placement
/**
 * 当文件按 inode 操作符变化时分两次写入。
 */
function updateFileMap(fileMap, { path, was, now }) {
  if (fileMap.get(path) === was) fileMap.set(path, now);
}
//@ chunk-xrwmcqkn.js:31546-33574 placement
async function serveReadChangedFiles(input, signal, context) {
  if (isPlainObject(input) && exceedsSerializedContextLimit(input.permission_context))
    throw Error("permission_context is too large");
  let {
    permission_context: permissionContext,
    agent_id: agentId,
    told,
  } = readChangedFilesInputSchema().parse(input);
  let launchPermissionContext = context.launchPermissionContext;
  let fileMap = call(context.session, agentId);
  if (launchPermissionContext === undefined || fileMap === undefined || fileMap.size === 0)
    return {
      summary: "nothing tracked",
      output: {
        changed: [],
        tracked: 0,
      },
    };
  let repoRulesForRequest = await readRepoRulesForRequest(READCHANGEDFILES, context.meta);
  if (repoRulesForRequest.refused !== undefined)
    return {
      summary: "the repo rules could not be read",
      output: {
        changed: [],
        tracked: fileMap.size,
      },
    };
  let { changedFilesPasses } = mcpServeCallState.of(context.session);
  let pass = changedFilesPasses.get(fileMap) ?? {
    copy: createRemoteFileState(fileMap.max, fileMap.maxSize),
    isRunning: false,
    answered: undefined,
  };
  changedFilesPasses.set(fileMap, pass);
  if (pass.isRunning)
    return {
      summary: "a pass is running",
      output: {
        isBusy: true,
        changed: [],
        tracked: fileMap.size,
      },
    };
  if (told !== undefined && told.id === pass.answered?.id)
    pass.answered.changes.slice(0, told.count).forEach((change) => {
      updateFileMap(fileMap, change);
    });
  pass.answered = undefined;
  let before = new Map(fileMap.entries());
  let appState = {
    ...serveModeDefaultAppState(),
    toolPermissionContext: buildNativeDoctorDiagnostics(
      permissionContext,
      launchPermissionContext,
      getSessionProject(context.session).originalCwd,
      repoRulesForRequest.repoRules,
    ),
  };
  let toolContext = context.toolUseContext();
  let { copy } = pass;
  copy.clear();
  copy.load(fileMap.dump());
  let childAbortController = createChildAbortController(toolContext.abortController);
  let timer = setTimeout((controller) => controller.abort(), CHANGED_FILES_TIMEOUT_MS, childAbortController);
  pass.isRunning = true;
  let changes;
  try {
    changes = await getChangedFiles({
      ...toolContext,
      readFileState: copy,
      agentId: agentId === undefined ? undefined : identityAgentId2(agentId),
      abortController: childAbortController,
      getAppState: () => appState,
    });
  } finally {
    clearTimeout(timer);
    pass.isRunning = false;
  }
  let after = new Map(fileMap.entries());
  let snippets = [];
  let changeList = [];
  for (let change of changes) {
    if (change.type !== "edited_text_file" && change.type !== "edited_image_file") continue;
    let isText = change.type === "edited_text_file";
    let beforeEntry = before.get(change.filename);
    let afterEntry = isText
      ? copy.get(change.filename)
      : beforeEntry && {
          ...beforeEntry,
          offset: 1,
          limit: 1,
        };
    if (beforeEntry !== undefined && afterEntry !== undefined && after.get(change.filename) === beforeEntry) {
      snippets.push({
        filename: change.filename,
        snippet: isText ? change.snippet : "",
      });
      changeList.push({
        path: change.filename,
        was: beforeEntry,
        now: afterEntry,
      });
    }
  }
  let seenPaths = new Set(changeList.map(({ path }) => path));
  for (let [fileName, previous] of before) {
    let current = copy.get(fileName);
    if (
      current === previous ||
      current === undefined ||
      seenPaths.has(fileName) ||
      after.get(fileName) !== previous
    )
      continue;
    if (current.contentHash !== previous.contentHash) {
      snippets.push({
        filename: fileName,
        snippet: "",
      });
      changeList.push({
        path: fileName,
        was: previous,
        now: current,
      });
    } else
      updateFileMap(fileMap, {
        path: fileName,
        was: previous,
        now: {
          ...previous,
          timestamp: current.timestamp,
        },
      });
  }
  let tracked = fileMap.size;
  if (changeList.length === 0)
    return {
      summary: "nothing changed",
      output: {
        changed: snippets,
        tracked,
      },
    };
  let id = randomUUID();
  pass.answered = {
    id,
    changes: changeList,
  };
  return {
    summary: `${changeList.length} changed`,
    output: {
      id,
      changed: snippets,
      tracked,
    },
  };
}
//@ chunk-xrwmcqkn.js:33574-33772 placement
/**
 * 读取环境结果的 schema。
 */
var READENVIRONMENT = "ReadEnvironment";
var readEnvironmentResultSchema = DoctorLazy(() =>
  objectSchema({
    workingDirectory: stringSchema(),
    shellDirectory: stringSchema().optional(),
    isGitRepo: booleanSchema(),
    agentProxy: ProxyEnvironmentSchema().nullable().optional().catch(undefined),
    toolHost: diskStateSchema().optional().catch(undefined),
  }),
);
//@ chunk-xrwmcqkn.js:33772-34020 placement
async function serveReadEnvironment(input, signal, { session }) {
  let originalCwd = getOriginalCwd();
  return {
    summary: "the working directory",
    output: {
      workingDirectory: originalCwd,
      shellDirectory: getSessionProject(session).cwd,
      isGitRepo: findGitRootUncached(originalCwd) !== null,
      agentProxy: getAgentProxyNoteObject() ?? (env.CCR_AGENT_PROXY_ENABLED ? undefined : null),
      toolHost: diskState.of(session.host).ids,
    },
  };
}
//@ chunk-xrwmcqkn.js:34082-34148 placement
/**
 * 空列表常量。
 */
var AGENTS_MD_MODES = ["claude-md-or-agents-md", "claude-md-and-agents-md"];
var EMPTY_LIST = [];
//@ chunk-xrwmcqkn.js:34148-34219 placement
/**
 * 在上下文里补上 AGENTS.md 指令。
 */
async function withAgentsMdInstructions(sessionMemoryFiles, agentsMdMode, session, context) {
  let files = await readAgentsMdInstructions(sessionMemoryFiles, agentsMdMode, session, context);
  return files ? fromPluginInstructionFiles(files, sessionMemoryFiles) : sessionMemoryFiles;
}
//@ chunk-xrwmcqkn.js:34219-34480 placement
async function readAncestorInstructions(
  filePath,
  sessionMemoryFiles,
  agentsMdMode,
  within,
  session,
  context,
) {
  let search = {
    start: dirname(filePath),
    below: getOriginalCwd(),
    held: () => within,
  };
  let [agentsFiles, claudeFiles] = await Promise.all([
    fsAncestors(AGENTS_MD_FILENAMES, AGENTS_MD_PLUGIN_NAME, search),
    fsAncestors(CLAUDE_MD_FILENAMES, AGENTS_MD_PLUGIN_NAME, search),
  ]).catch(() => [EMPTY_LIST, EMPTY_LIST]);
  let ancestorFiles =
    agentsMdMode === DEFAULT_AGENTS_MD_MODE ? excludeDirs(agentsFiles, claudeFiles) : agentsFiles;
  let sessionInstructions =
    ancestorFiles.length > 0 &&
    (await readAgentsMdInstructions(sessionMemoryFiles, agentsMdMode, session, context));
  if (!sessionInstructions) return [];
  return fromPluginInstructionFiles(
    dedupeInstructionFiles(flattenProjectInstructionParts(ancestorFiles), [
      ...sessionInstructions,
      ...flattenProjectInstructionParts(claudeFiles),
    ]),
    [],
  );
}
//@ chunk-xrwmcqkn.js:34480-34688 placement
async function readAgentsMdInstructions(sessionMemoryFiles, agentsMdMode, session, context) {
  let dir = getOriginalCwd();
  let files = sessionMemoryFiles.map(toPluginInstructionFile);
  if (
    agentsMdMode === DEFAULT_AGENTS_MD_MODE &&
    (files.some((file) => isClaudeMdAtDir(file, dir)) ||
      (await readAgentsMdInstructionsFor(CLAUDE_MD_FILENAMES, session, context).then(
        (agentsMdInstructionsFor) => agentsMdInstructionsFor.length > 0,
        () => true,
      )))
  )
    return;
  let agentsInstructions = await readAgentsMdInstructionsFor(AGENTS_MD_FILENAMES, session, context).catch(
    () => EMPTY_LIST,
  );
  return insertAgentsMdFiles(
    files,
    dedupeInstructionFiles(flattenProjectInstructionParts(agentsInstructions), files),
  );
}
//@ chunk-xrwmcqkn.js:34688-34746 placement
/**
 * 读取 AGENTS.md 指令。
 */
function readAgentsMdInstructionsFor(filenames, session, judgedBy) {
  setClaudeMdJudgedBy(session, judgedBy);
  return fsAncestors(filenames, AGENTS_MD_PLUGIN_NAME, {
    session,
  });
}
//@ chunk-xrwmcqkn.js:34746-34791 placement
/**
 * 读规则参数的 schema。
 */
var readRulesInputSchema = DoctorLazy(() =>
  objectSchema({
    readRules: unknown().optional(),
  }),
);
//@ chunk-xrwmcqkn.js:34791-35096 placement
/**
 * 解析读取调用的权限上下文：未发送读规则时用当前工具上下文；发送了则与启动时权限上下文合并，无效时返回 undefined。
 */
function resolveReadPermissionContext(input, context) {
  let readRules = readRulesInputSchema().safeParse(input).data?.readRules;
  if (readRules === undefined)
    return {
      context: getToolPermissionContext(context.toolUseContext()),
      bySentRules: false,
    };
  let sentContext = exceedsSerializedContextLimit(readRules)
    ? undefined
    : safeSerializedPermissionContextSchema().safeParse(readRules).data;
  if (sentContext === undefined || context.launchPermissionContext === undefined) return;
  let context_2 = buildNativeDoctorDiagnostics(
    sentContext,
    context.launchPermissionContext,
    getOriginalCwd(),
  );
  return {
    context: mergePersistedDenyRules(context_2),
    bySentRules: true,
  };
}
//@ chunk-xrwmcqkn.js:35096-35803 placement
/**
 * 项目上下文文件列表的 schema。
 */
var READPROJECTCONTEXT = "ReadProjectContext";
var READNESTEDPROJECTCONTEXT = "ReadNestedProjectContext";
var MAX_PROJECT_CONTEXT_BYTES = 8388608;
var readProjectContextInputSchema = DoctorLazy(() =>
  objectSchema({
    maxChars: numberSchema().int().positive().optional(),
    agentsMd: _enum(AGENTS_MD_MODES).optional().catch(undefined),
    addedDirectories: booleanSchema().optional().catch(undefined),
  }),
);
var MAX_NESTED_CONTEXT_BYTES = MAX_PROJECT_CONTEXT_BYTES / 8;
var readNestedProjectContextInputSchema = DoctorLazy(() =>
  objectSchema({
    filePath: stringSchema()
      .max(4096)
      .refine(function (filePath) {
        return posix.isAbsolute(filePath) && posix.normalize(filePath) === filePath;
      }, "must be an absolute, normalized path"),
    maxChars: numberSchema().int().positive().optional(),
    agentsMd: _enum(AGENTS_MD_MODES).optional().catch(undefined),
    addedDirectories: booleanSchema().optional().catch(undefined),
  }),
);
var projectContextFilesSchema = DoctorLazy(() =>
  objectSchema({
    memoryFiles: array(
      objectSchema({
        path: stringSchema().max(4096),
        type: _enum(["Project", "Local"]),
        content: stringSchema(),
        parent: stringSchema().optional(),
        globs: array(stringSchema()).optional(),
      }),
    ),
    tooLarge: booleanSchema().optional(),
    rulesUnread: booleanSchema().optional(),
    rulesJudged: booleanSchema().optional(),
  }),
);
//@ chunk-xrwmcqkn.js:35803-36248 placement
async function serveReadProjectContext(input, signal, context) {
  if (isClaudeMdLoadingDisabled())
    return {
      summary: "CLAUDE.md loading is off",
      output: {
        memoryFiles: [],
      },
    };
  let parsed = readProjectContextInputSchema().safeParse(input);
  let { session } = context.toolUseContext();
  setClaudeMdAdditionalDirectoriesAsked(parsed.success ? parsed.data.addedDirectories : undefined);
  clearMemoryFilesCache(session);
  let readPermissionContext = resolveReadPermissionContext(input, context);
  if (readPermissionContext === undefined) return RULES_UNREAD_RESULT;
  let sessionMemoryFiles = await loadSessionMemoryFiles(context, readPermissionContext.context);
  signal.throwIfAborted();
  let agentsMd = parsed.success ? parsed.data.agentsMd : undefined;
  let memoryFiles = agentsMd
    ? await withAgentsMdInstructions(sessionMemoryFiles, agentsMd, session, readPermissionContext.context)
    : sessionMemoryFiles;
  signal.throwIfAborted();
  return buildProjectContextResult(
    memoryFiles,
    parsed.success ? parsed.data.maxChars : undefined,
    MAX_PROJECT_CONTEXT_BYTES,
    readPermissionContext.bySentRules,
  );
}
//@ chunk-xrwmcqkn.js:36248-36752 placement
async function serveReadNestedProjectContext(input, signal, context) {
  let request = readNestedProjectContextInputSchema().parse(input);
  setClaudeMdAdditionalDirectoriesAsked(request.addedDirectories);
  let toolContext = context.toolUseContext();
  if (
    isClaudeMdLoadingDisabled() ||
    !pathInAllowedWorkingPath(request.filePath, getToolPermissionContext(toolContext))
  )
    return {
      summary: "no memory files",
      output: {
        memoryFiles: [],
      },
    };
  let readPermissionContext = resolveReadPermissionContext(input, context);
  if (readPermissionContext === undefined) return RULES_UNREAD_RESULT;
  let memoryFiles = [];
  let heldOutsideTracker = buildHeldOutsideTracker(readPermissionContext.context);
  for await (let files of iterateMemoryFilesForPath(
    request.filePath,
    toolContext.storageV5,
    undefined,
    heldOutsideTracker,
  )) {
    signal.throwIfAborted();
    memoryFiles.push(...files);
  }
  if (request.agentsMd) {
    memoryFiles.push(
      ...(await readAncestorInstructions(
        request.filePath,
        await loadSessionMemoryFiles(context, readPermissionContext.context),
        request.agentsMd,
        heldOutsideTracker?.within,
        toolContext.session,
        readPermissionContext.context,
      )),
    );
    signal.throwIfAborted();
  }
  return buildProjectContextResult(
    memoryFiles,
    request.maxChars,
    MAX_NESTED_CONTEXT_BYTES,
    readPermissionContext.bySentRules,
  );
}
//@ chunk-xrwmcqkn.js:36752-36870 placement
var RULES_UNREAD_RESULT = {
  summary: "no memory files: the session's read rules could not be read",
  output: {
    memoryFiles: [],
    rulesUnread: true,
  },
};
//@ chunk-xrwmcqkn.js:36870-37018 placement
function loadSessionMemoryFiles(context, judgedBy) {
  let { session, storageV5, credentials } = context.toolUseContext();
  setClaudeMdJudgedBy(session, judgedBy);
  disableSetupGuideReports(session);
  if (context.callerLogsSharedEvents) markInitialLoadLogged(session);
  return getMemoryFilesCached(session, false, storageV5, credentials);
}
//@ chunk-xrwmcqkn.js:37018-37395 placement
/**
 * 只保留 Project/Local 记忆文件构造 ReadProjectContext 结果；总大小超上限时返回 tooLarge。
 */
function buildProjectContextResult(memoryFiles, maxChars, maxBytes, bySentRules) {
  let memoryFiles_2 = memoryFiles.flatMap((file) =>
    file.type === "Project" || file.type === "Local"
      ? [
          {
            path: file.path,
            type: file.type,
            content: file.content,
            parent: file.parent,
            globs: file.globs,
          },
        ]
      : [],
  );
  if (measureMemoryFiles(memoryFiles_2) > Math.min(maxChars ?? maxBytes, maxBytes))
    return {
      summary: "project context too large",
      output: {
        memoryFiles: [],
        tooLarge: true,
        ...(bySentRules && {
          rulesJudged: true,
        }),
      },
    };
  return {
    summary: `${memoryFiles_2.length} memory files`,
    output: {
      memoryFiles: memoryFiles_2,
      ...(bySentRules && {
        rulesJudged: true,
      }),
    },
  };
}
//@ chunk-xrwmcqkn.js:37395-37537 placement
function measureMemoryFiles(memoryFiles) {
  let totalChars = 0;
  for (let file of memoryFiles) {
    totalChars += file.path.length + file.content.length;
    totalChars += file.parent?.length ?? 0;
    for (let glob of file.globs ?? []) totalChars += glob.length;
  }
  return totalChars;
}
export {
  READPROJECTCONTEXT,
  serveReadProjectContext,
  READNESTEDPROJECTCONTEXT,
  serveReadNestedProjectContext,
  READENVIRONMENT,
  serveReadEnvironment,
  READCHANGEDFILES,
  serveReadChangedFiles,
};
