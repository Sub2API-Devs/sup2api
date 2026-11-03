/**
 * services/mcpServe/contextCalls.ts
 *
 * 2.1.316 新增：mcp serve 上下文调用：读取项目上下文、嵌套上下文与变更文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wy9dbk5f.js (19)
 * attribution: placement 19
 */
import { randomUUID } from "crypto";
import { dirname, posix } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  string,
  int,
  u,
  array,
  E,
  literal,
  M,
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

//@ chunk-wy9dbk5f.js:25979-26244 placement
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
      id: string().max(64),
      count: int().min(0),
    }).optional(),
  }),
);
var changedFilesResultSchema = DoctorLazy(() =>
  u({
    id: string().optional(),
    changed: array(
      u({
        filename: string(),
        snippet: string(),
      }),
    ),
    tracked: E(),
    isBusy: literal(true).optional(),
  }),
);
//@ chunk-wy9dbk5f.js:26244-26307 placement
/**
 * 当文件按 inode 操作符变化时分两次写入。
 */
function updateFileMap(e, { path, was, now }) {
  if (e.get(path) === was) e.set(path, now);
}
//@ chunk-wy9dbk5f.js:26307-28335 placement
async function serveReadChangedFiles(e, r, n) {
  if (isPlainObject(e) && exceedsSerializedContextLimit(e.permission_context))
    throw Error("permission_context is too large");
  let {
    permission_context: permissionContext,
    agent_id: agentId,
    told,
  } = readChangedFilesInputSchema().parse(e);
  let launchPermissionContext = n.launchPermissionContext;
  let g = call(n.session, agentId);
  if (launchPermissionContext === undefined || g === undefined || g.size === 0)
    return {
      summary: "nothing tracked",
      output: {
        changed: [],
        tracked: 0,
      },
    };
  let repoRulesForRequest = await readRepoRulesForRequest(READCHANGEDFILES, n.meta);
  if (repoRulesForRequest.refused !== undefined)
    return {
      summary: "the repo rules could not be read",
      output: {
        changed: [],
        tracked: g.size,
      },
    };
  let { changedFilesPasses } = mcpServeCallState.of(n.session);
  let C = changedFilesPasses.get(g) ?? {
    copy: createRemoteFileState(g.max, g.maxSize),
    isRunning: false,
    answered: undefined,
  };
  changedFilesPasses.set(g, C);
  if (C.isRunning)
    return {
      summary: "a pass is running",
      output: {
        isBusy: true,
        changed: [],
        tracked: g.size,
      },
    };
  if (told !== undefined && told.id === C.answered?.id)
    C.answered.changes.slice(0, told.count).forEach((change) => {
      updateFileMap(g, change);
    });
  C.answered = undefined;
  let b = new Map(g.entries());
  let R = {
    ...serveModeDefaultAppState(),
    toolPermissionContext: buildNativeDoctorDiagnostics(
      permissionContext,
      launchPermissionContext,
      getSessionProject(n.session).originalCwd,
      repoRulesForRequest.repoRules,
    ),
  };
  let x = n.toolUseContext();
  let { copy } = C;
  copy.clear();
  copy.load(g.dump());
  let childAbortController = createChildAbortController(x.abortController);
  let timer = setTimeout((v) => v.abort(), CHANGED_FILES_TIMEOUT_MS, childAbortController);
  C.isRunning = true;
  let L;
  try {
    L = await getChangedFiles({
      ...x,
      readFileState: copy,
      agentId: agentId === undefined ? undefined : identityAgentId2(agentId),
      abortController: childAbortController,
      getAppState: () => R,
    });
  } finally {
    clearTimeout(timer);
    C.isRunning = false;
  }
  let j = new Map(g.entries());
  let B = [];
  let H = [];
  for (let v of L) {
    if (v.type !== "edited_text_file" && v.type !== "edited_image_file") continue;
    let X = v.type === "edited_text_file";
    let V = b.get(v.filename);
    let de = X
      ? copy.get(v.filename)
      : V && {
          ...V,
          offset: 1,
          limit: 1,
        };
    if (V !== undefined && de !== undefined && j.get(v.filename) === V) {
      B.push({
        filename: v.filename,
        snippet: X ? v.snippet : "",
      });
      H.push({
        path: v.filename,
        was: V,
        now: de,
      });
    }
  }
  let Y = new Set(H.map(({ path }) => path));
  for (let [v, X] of b) {
    let V = copy.get(v);
    if (V === X || V === undefined || Y.has(v) || j.get(v) !== X) continue;
    if (V.contentHash !== X.contentHash) {
      B.push({
        filename: v,
        snippet: "",
      });
      H.push({
        path: v,
        was: X,
        now: V,
      });
    } else
      updateFileMap(g, {
        path: v,
        was: X,
        now: {
          ...X,
          timestamp: V.timestamp,
        },
      });
  }
  let tracked = g.size;
  if (H.length === 0)
    return {
      summary: "nothing changed",
      output: {
        changed: B,
        tracked,
      },
    };
  let id = randomUUID();
  C.answered = {
    id,
    changes: H,
  };
  return {
    summary: `${H.length} changed`,
    output: {
      id,
      changed: B,
      tracked,
    },
  };
}
//@ chunk-wy9dbk5f.js:28335-28493 placement
/**
 * 读取环境结果的 schema。
 */
var READENVIRONMENT = "ReadEnvironment";
var readEnvironmentResultSchema = DoctorLazy(() =>
  u({
    workingDirectory: string(),
    shellDirectory: string().optional(),
    isGitRepo: M(),
    agentProxy: ProxyEnvironmentSchema().nullable().optional().catch(undefined),
  }),
);
//@ chunk-wy9dbk5f.js:28493-28713 placement
async function serveReadEnvironment(e, r, { session }) {
  let originalCwd = getOriginalCwd();
  return {
    summary: "the working directory",
    output: {
      workingDirectory: originalCwd,
      shellDirectory: getSessionProject(session).cwd,
      isGitRepo: findGitRootUncached(originalCwd) !== null,
      agentProxy: getAgentProxyNoteObject() ?? (env.CCR_AGENT_PROXY_ENABLED ? undefined : null),
    },
  };
}
//@ chunk-wy9dbk5f.js:28775-28841 placement
/**
 * 空列表常量。
 */
var AGENTS_MD_MODES = ["claude-md-or-agents-md", "claude-md-and-agents-md"];
var EMPTY_LIST = [];
//@ chunk-wy9dbk5f.js:28841-28912 placement
/**
 * 在上下文里补上 AGENTS.md 指令。
 */
async function withAgentsMdInstructions(sessionMemoryFiles, agentsMd, session, context) {
  let agentsMdInstructions = await readAgentsMdInstructions(sessionMemoryFiles, agentsMd, session, context);
  return agentsMdInstructions
    ? fromPluginInstructionFiles(agentsMdInstructions, sessionMemoryFiles)
    : sessionMemoryFiles;
}
//@ chunk-wy9dbk5f.js:28912-29173 placement
async function readAncestorInstructions(filePath, sessionMemoryFiles, agentsMd, within, session, context) {
  let y = {
    start: dirname(filePath),
    below: getOriginalCwd(),
    held: () => within,
  };
  let [g, h] = await Promise.all([
    fsAncestors(AGENTS_MD_FILENAMES, AGENTS_MD_PLUGIN_NAME, y),
    fsAncestors(CLAUDE_MD_FILENAMES, AGENTS_MD_PLUGIN_NAME, y),
  ]).catch(() => [EMPTY_LIST, EMPTY_LIST]);
  let S = agentsMd === DEFAULT_AGENTS_MD_MODE ? excludeDirs(g, h) : g;
  let C = S.length > 0 && (await readAgentsMdInstructions(sessionMemoryFiles, agentsMd, session, context));
  if (!C) return [];
  return fromPluginInstructionFiles(
    dedupeInstructionFiles(flattenProjectInstructionParts(S), [...C, ...flattenProjectInstructionParts(h)]),
    [],
  );
}
//@ chunk-wy9dbk5f.js:29173-29381 placement
async function readAgentsMdInstructions(e, r, n, s) {
  let originalCwd = getOriginalCwd();
  let mapped = e.map(toPluginInstructionFile);
  if (
    r === DEFAULT_AGENTS_MD_MODE &&
    (mapped.some((g) => isClaudeMdAtDir(g, originalCwd)) ||
      (await readAgentsMdInstructionsFor(CLAUDE_MD_FILENAMES, n, s).then(
        (agentsMdInstructionsFor) => agentsMdInstructionsFor.length > 0,
        () => true,
      )))
  )
    return;
  let y = await readAgentsMdInstructionsFor(AGENTS_MD_FILENAMES, n, s).catch(() => EMPTY_LIST);
  return insertAgentsMdFiles(mapped, dedupeInstructionFiles(flattenProjectInstructionParts(y), mapped));
}
//@ chunk-wy9dbk5f.js:29381-29439 placement
/**
 * 读取 AGENTS.md 指令。
 */
function readAgentsMdInstructionsFor(e, r, judgedBy) {
  setClaudeMdJudgedBy(r, judgedBy);
  return fsAncestors(e, AGENTS_MD_PLUGIN_NAME, {
    session: r,
  });
}
//@ chunk-wy9dbk5f.js:29439-29484 placement
/**
 * 读规则参数的 schema。
 */
var readRulesInputSchema = DoctorLazy(() =>
  u({
    readRules: unknown().optional(),
  }),
);
//@ chunk-wy9dbk5f.js:29484-29789 placement
/**
 * 解析读取调用的权限上下文：未发送读规则时用当前工具上下文；发送了则与启动时权限上下文合并，无效时返回 undefined。
 */
function resolveReadPermissionContext(e, r) {
  let readRules = readRulesInputSchema().safeParse(e).data?.readRules;
  if (readRules === undefined)
    return {
      context: getToolPermissionContext(r.toolUseContext()),
      bySentRules: false,
    };
  let s = exceedsSerializedContextLimit(readRules)
    ? undefined
    : safeSerializedPermissionContextSchema().safeParse(readRules).data;
  if (s === undefined || r.launchPermissionContext === undefined) return;
  let context = buildNativeDoctorDiagnostics(s, r.launchPermissionContext, getOriginalCwd());
  return {
    context: mergePersistedDenyRules(context),
    bySentRules: true,
  };
}
//@ chunk-wy9dbk5f.js:29789-30496 placement
/**
 * 项目上下文文件列表的 schema。
 */
var READPROJECTCONTEXT = "ReadProjectContext";
var READNESTEDPROJECTCONTEXT = "ReadNestedProjectContext";
var MAX_PROJECT_CONTEXT_BYTES = 8388608;
var readProjectContextInputSchema = DoctorLazy(() =>
  u({
    maxChars: E().int().positive().optional(),
    agentsMd: _enum(AGENTS_MD_MODES).optional().catch(undefined),
    addedDirectories: M().optional().catch(undefined),
  }),
);
var MAX_NESTED_CONTEXT_BYTES = MAX_PROJECT_CONTEXT_BYTES / 8;
var readNestedProjectContextInputSchema = DoctorLazy(() =>
  u({
    filePath: string()
      .max(4096)
      .refine(function (r) {
        return posix.isAbsolute(r) && posix.normalize(r) === r;
      }, "must be an absolute, normalized path"),
    maxChars: E().int().positive().optional(),
    agentsMd: _enum(AGENTS_MD_MODES).optional().catch(undefined),
    addedDirectories: M().optional().catch(undefined),
  }),
);
var projectContextFilesSchema = DoctorLazy(() =>
  u({
    memoryFiles: array(
      u({
        path: string().max(4096),
        type: _enum(["Project", "Local"]),
        content: string(),
        parent: string().optional(),
        globs: array(string()).optional(),
      }),
    ),
    tooLarge: M().optional(),
    rulesUnread: M().optional(),
    rulesJudged: M().optional(),
  }),
);
//@ chunk-wy9dbk5f.js:30496-30941 placement
async function serveReadProjectContext(e, r, n) {
  if (isClaudeMdLoadingDisabled())
    return {
      summary: "CLAUDE.md loading is off",
      output: {
        memoryFiles: [],
      },
    };
  let s = readProjectContextInputSchema().safeParse(e);
  let { session } = n.toolUseContext();
  setClaudeMdAdditionalDirectoriesAsked(s.success ? s.data.addedDirectories : undefined);
  clearMemoryFilesCache(session);
  let readPermissionContext = resolveReadPermissionContext(e, n);
  if (readPermissionContext === undefined) return RULES_UNREAD_RESULT;
  let sessionMemoryFiles = await loadSessionMemoryFiles(n, readPermissionContext.context);
  r.throwIfAborted();
  let agentsMd = s.success ? s.data.agentsMd : undefined;
  let h = agentsMd
    ? await withAgentsMdInstructions(sessionMemoryFiles, agentsMd, session, readPermissionContext.context)
    : sessionMemoryFiles;
  r.throwIfAborted();
  return buildProjectContextResult(
    h,
    s.success ? s.data.maxChars : undefined,
    MAX_PROJECT_CONTEXT_BYTES,
    readPermissionContext.bySentRules,
  );
}
//@ chunk-wy9dbk5f.js:30941-31445 placement
async function serveReadNestedProjectContext(e, r, n) {
  let s = readNestedProjectContextInputSchema().parse(e);
  setClaudeMdAdditionalDirectoriesAsked(s.addedDirectories);
  let a = n.toolUseContext();
  if (isClaudeMdLoadingDisabled() || !pathInAllowedWorkingPath(s.filePath, getToolPermissionContext(a)))
    return {
      summary: "no memory files",
      output: {
        memoryFiles: [],
      },
    };
  let readPermissionContext = resolveReadPermissionContext(e, n);
  if (readPermissionContext === undefined) return RULES_UNREAD_RESULT;
  let y = [];
  let heldOutsideTracker = buildHeldOutsideTracker(readPermissionContext.context);
  for await (let h of iterateMemoryFilesForPath(s.filePath, a.storageV5, undefined, heldOutsideTracker)) {
    r.throwIfAborted();
    y.push(...h);
  }
  if (s.agentsMd) {
    y.push(
      ...(await readAncestorInstructions(
        s.filePath,
        await loadSessionMemoryFiles(n, readPermissionContext.context),
        s.agentsMd,
        heldOutsideTracker?.within,
        a.session,
        readPermissionContext.context,
      )),
    );
    r.throwIfAborted();
  }
  return buildProjectContextResult(
    y,
    s.maxChars,
    MAX_NESTED_CONTEXT_BYTES,
    readPermissionContext.bySentRules,
  );
}
//@ chunk-wy9dbk5f.js:31445-31563 placement
var RULES_UNREAD_RESULT = {
  summary: "no memory files: the session's read rules could not be read",
  output: {
    memoryFiles: [],
    rulesUnread: true,
  },
};
//@ chunk-wy9dbk5f.js:31563-31711 placement
function loadSessionMemoryFiles(e, judgedBy) {
  let { session, storageV5, credentials } = e.toolUseContext();
  setClaudeMdJudgedBy(session, judgedBy);
  disableSetupGuideReports(session);
  if (e.callerLogsSharedEvents) markInitialLoadLogged(session);
  return getMemoryFilesCached(session, false, storageV5, credentials);
}
//@ chunk-wy9dbk5f.js:31711-32088 placement
/**
 * 只保留 Project/Local 记忆文件构造 ReadProjectContext 结果；总大小超上限时返回 tooLarge。
 */
function buildProjectContextResult(e, r, n, bySentRules) {
  let flattened = e.flatMap((c) =>
    c.type === "Project" || c.type === "Local"
      ? [
          {
            path: c.path,
            type: c.type,
            content: c.content,
            parent: c.parent,
            globs: c.globs,
          },
        ]
      : [],
  );
  if (measureMemoryFiles(flattened) > Math.min(r ?? n, n))
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
    summary: `${flattened.length} memory files`,
    output: {
      memoryFiles: flattened,
      ...(bySentRules && {
        rulesJudged: true,
      }),
    },
  };
}
//@ chunk-wy9dbk5f.js:32088-32230 placement
function measureMemoryFiles(e) {
  let r = 0;
  for (let n of e) {
    r += n.path.length + n.content.length;
    r += n.parent?.length ?? 0;
    for (let s of n.globs ?? []) r += s.length;
  }
  return r;
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
