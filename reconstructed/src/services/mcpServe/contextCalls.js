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
import { dirname, posix, posix as posix_2 } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  o,
  tc,
  u as u_2,
  A,
  E,
  T,
  M,
  oe,
  U,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  safeSerializedPermissionContextSchema,
  PV,
} from "../../utils/permissions/permissionContextSerialization.js";
import { agentIdSchema, call, mcpServeCallState } from "./callClaims.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { readRepoRulesForRequest } from "./repoPermissionRules.js";
import { nv } from "../../utils/remoteFileState.js";
import { serveModeDefaultAppState } from "../../entrypoints/mcpServe/serveModeInput.js";
import { buildNativeDoctorDiagnostics } from "../../screens/Doctor.js";
import { xo } from "../../bootstrap/sessionSlices.js";
import { createChildAbortController } from "../../utils/abortController.js";
import {
  getChangedFiles,
  buildHeldOutsideTracker,
  iterateMemoryFilesForPath,
} from "../../utils/attachments.js";
import { Mr } from "../../utils/agentId.js";
import { ProxyEnvironmentSchema, sVs } from "../../constants/agentProxyPrompt.js";
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
import { VGt, t9s, e9s, getMemoryFilesCached } from "../../utils/claudemd.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { mergePersistedDenyRules } from "../../utils/permissions/permissions.js";
import { isClaudeMdLoadingDisabled } from "../../utils/settings/customizationDisabled.js";
import { clearMemoryFilesCache } from "../../components/Message.js";
import { pathInAllowedWorkingPath } from "../../utils/permissions/filesystem.js";

//@ chunk-wy9dbk5f.js:25979-26244 placement
var READCHANGEDFILES = "ReadChangedFiles",
  Fn = 3000,
  Nn = DoctorLazy(() =>
    zodStrictObject({
      permission_context: safeSerializedPermissionContextSchema(),
      agent_id: agentIdSchema().optional(),
      told: zodStrictObject({ id: o().max(64), count: tc().min(0) }).optional(),
    }),
  ),
  na = DoctorLazy(() =>
    u_2({
      id: o().optional(),
      changed: A(u_2({ filename: o(), snippet: o() })),
      tracked: E(),
      isBusy: T(!0).optional(),
    }),
  );
//@ chunk-wy9dbk5f.js:26244-26307 placement
function Et(e, { path: path, was: was, now: now }) {
  if (e.get(path) === was) e.set(path, now);
}
//@ chunk-wy9dbk5f.js:26307-28335 placement
async function serveReadChangedFiles(e, r, n) {
  if (isPlainObject(e) && PV(e.permission_context)) throw Error("permission_context is too large");
  let { permission_context: permission_context, agent_id: agent_id, told: told } = Nn().parse(e),
    launchPermissionContext = n.launchPermissionContext,
    g = call(n.session, agent_id);
  if (launchPermissionContext === void 0 || g === void 0 || g.size === 0)
    return { summary: "nothing tracked", output: { changed: [], tracked: 0 } };
  let h = await readRepoRulesForRequest(READCHANGEDFILES, n.meta);
  if (h.refused !== void 0)
    return { summary: "the repo rules could not be read", output: { changed: [], tracked: g.size } };
  let { changedFilesPasses: changedFilesPasses } = mcpServeCallState.of(n.session),
    C = changedFilesPasses.get(g) ?? { copy: nv(g.max, g.maxSize), isRunning: !1, answered: void 0 };
  if ((changedFilesPasses.set(g, C), C.isRunning))
    return { summary: "a pass is running", output: { isBusy: !0, changed: [], tracked: g.size } };
  if (told !== void 0 && told.id === C.answered?.id)
    C.answered.changes.slice(0, told.count).forEach((v) => {
      Et(g, v);
    });
  C.answered = void 0;
  let b = new Map(g.entries()),
    R = {
      ...serveModeDefaultAppState(),
      toolPermissionContext: buildNativeDoctorDiagnostics(
        permission_context,
        launchPermissionContext,
        xo(n.session).originalCwd,
        h.repoRules,
      ),
    },
    toolUseContext = n.toolUseContext(),
    { copy: copy } = C;
  (copy.clear(), copy.load(g.dump()));
  let O = createChildAbortController(toolUseContext.abortController),
    P = setTimeout((v) => v.abort(), Fn, O);
  C.isRunning = !0;
  let L;
  try {
    L = await getChangedFiles({
      ...toolUseContext,
      readFileState: copy,
      agentId: agent_id === void 0 ? void 0 : Mr(agent_id),
      abortController: O,
      getAppState: () => R,
    });
  } finally {
    (clearTimeout(P), (C.isRunning = !1));
  }
  let j = new Map(g.entries()),
    B = [],
    H = [];
  for (let v of L) {
    if (v.type !== "edited_text_file" && v.type !== "edited_image_file") continue;
    let X = v.type === "edited_text_file",
      V = b.get(v.filename),
      de = X ? copy.get(v.filename) : V && { ...V, offset: 1, limit: 1 };
    if (V !== void 0 && de !== void 0 && j.get(v.filename) === V)
      (B.push({ filename: v.filename, snippet: X ? v.snippet : "" }),
        H.push({ path: v.filename, was: V, now: de }));
  }
  let Y = new Set(H.map(({ path: path }) => path));
  for (let [v, X] of b) {
    let V = copy.get(v);
    if (V === X || V === void 0 || Y.has(v) || j.get(v) !== X) continue;
    if (V.contentHash !== X.contentHash)
      (B.push({ filename: v, snippet: "" }), H.push({ path: v, was: X, now: V }));
    else Et(g, { path: v, was: X, now: { ...X, timestamp: V.timestamp } });
  }
  let size = g.size;
  if (H.length === 0) return { summary: "nothing changed", output: { changed: B, tracked: size } };
  let K = randomUUID();
  return (
    (C.answered = { id: K, changes: H }),
    { summary: `${H.length} changed`, output: { id: K, changed: B, tracked: size } }
  );
}
//@ chunk-wy9dbk5f.js:28335-28493 placement
var READENVIRONMENT = "ReadEnvironment",
  pa = DoctorLazy(() =>
    u_2({
      workingDirectory: o(),
      shellDirectory: o().optional(),
      isGitRepo: M(),
      agentProxy: ProxyEnvironmentSchema()
        .nullable()
        .optional()
        .catch(void 0),
    }),
  );
//@ chunk-wy9dbk5f.js:28493-28713 placement
async function serveReadEnvironment(e, r, { session: session }) {
  let s = getOriginalCwd();
  return {
    summary: "the working directory",
    output: {
      workingDirectory: s,
      shellDirectory: xo(session).cwd,
      isGitRepo: findGitRootUncached(s) !== null,
      agentProxy: sVs() ?? (env.CCR_AGENT_PROXY_ENABLED ? void 0 : null),
    },
  };
}
//@ chunk-wy9dbk5f.js:28775-28841 placement
var Me = ["claude-md-or-agents-md", "claude-md-and-agents-md"],
  Le = [];
//@ chunk-wy9dbk5f.js:28841-28912 placement
async function Tt(e, r, n, s) {
  let a = await readAgentsMdInstructions(e, r, n, s);
  return a ? fromPluginInstructionFiles(a, e) : e;
}
//@ chunk-wy9dbk5f.js:28912-29173 placement
async function readAncestorInstructions(e, r, n, s, a, c) {
  let y = { start: dirname(e), below: getOriginalCwd(), held: () => s },
    [g, h] = await Promise.all([
      fsAncestors(AGENTS_MD_FILENAMES, AGENTS_MD_PLUGIN_NAME, y),
      fsAncestors(CLAUDE_MD_FILENAMES, AGENTS_MD_PLUGIN_NAME, y),
    ]).catch(() => [Le, Le]),
    S = n === DEFAULT_AGENTS_MD_MODE ? excludeDirs(g, h) : g,
    C = S.length > 0 && (await readAgentsMdInstructions(r, n, a, c));
  if (!C) return [];
  return fromPluginInstructionFiles(
    dedupeInstructionFiles(flattenProjectInstructionParts(S), [...C, ...flattenProjectInstructionParts(h)]),
    [],
  );
}
//@ chunk-wy9dbk5f.js:29173-29381 placement
async function readAgentsMdInstructions(e, r, n, s) {
  let a = getOriginalCwd(),
    mapped = e.map(toPluginInstructionFile);
  if (
    r === DEFAULT_AGENTS_MD_MODE &&
    (mapped.some((g) => isClaudeMdAtDir(g, a)) ||
      (await xt(CLAUDE_MD_FILENAMES, n, s).then(
        (g) => g.length > 0,
        () => !0,
      )))
  )
    return;
  let y = await xt(AGENTS_MD_FILENAMES, n, s).catch(() => Le);
  return insertAgentsMdFiles(mapped, dedupeInstructionFiles(flattenProjectInstructionParts(y), mapped));
}
//@ chunk-wy9dbk5f.js:29381-29439 placement
function xt(e, r, n) {
  return (VGt(r, n), fsAncestors(e, AGENTS_MD_PLUGIN_NAME, { session: r }));
}
//@ chunk-wy9dbk5f.js:29439-29484 placement
var Dn = DoctorLazy(() => u_2({ readRules: oe().optional() }));
/**
 * 解析读取调用的权限上下文：未发送读规则时用当前工具上下文；发送了则与启动时权限上下文合并，无效时返回 undefined。
 */
//@ chunk-wy9dbk5f.js:29484-29789 placement
function resolveReadPermissionContext(e, r) {
  let n = Dn().safeParse(e).data?.readRules;
  if (n === void 0) return { context: getToolPermissionContext(r.toolUseContext()), bySentRules: !1 };
  let s = PV(n) ? void 0 : safeSerializedPermissionContextSchema().safeParse(n).data;
  if (s === void 0 || r.launchPermissionContext === void 0) return;
  let a = buildNativeDoctorDiagnostics(s, r.launchPermissionContext, getOriginalCwd());
  return { context: mergePersistedDenyRules(a), bySentRules: !0 };
}
//@ chunk-wy9dbk5f.js:29789-30496 placement
var READPROJECTCONTEXT = "ReadProjectContext",
  READNESTEDPROJECTCONTEXT = "ReadNestedProjectContext",
  jt = 8388608,
  Un = DoctorLazy(() =>
    u_2({
      maxChars: E().int().positive().optional(),
      agentsMd: U(Me)
        .optional()
        .catch(void 0),
      addedDirectories: M()
        .optional()
        .catch(void 0),
    }),
  ),
  Bn = jt / 8,
  Gn = DoctorLazy(() =>
    u_2({
      filePath: o()
        .max(4096)
        .refine(function (r) {
          return posix_2.isAbsolute(r) && posix_2.normalize(r) === r;
        }, "must be an absolute, normalized path"),
      maxChars: E().int().positive().optional(),
      agentsMd: U(Me)
        .optional()
        .catch(void 0),
      addedDirectories: M()
        .optional()
        .catch(void 0),
    }),
  ),
  lc = DoctorLazy(() =>
    u_2({
      memoryFiles: A(
        u_2({
          path: o().max(4096),
          type: U(["Project", "Local"]),
          content: o(),
          parent: o().optional(),
          globs: A(o()).optional(),
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
    return { summary: "CLAUDE.md loading is off", output: { memoryFiles: [] } };
  let safeParse = Un().safeParse(e),
    { session: session } = n.toolUseContext();
  (setClaudeMdAdditionalDirectoriesAsked(safeParse.success ? safeParse.data.addedDirectories : void 0),
    clearMemoryFilesCache(session));
  let c = resolveReadPermissionContext(e, n);
  if (c === void 0) return RULES_UNREAD_RESULT;
  let y = await loadSessionMemoryFiles(n, c.context);
  r.throwIfAborted();
  let g = safeParse.success ? safeParse.data.agentsMd : void 0,
    h = g ? await Tt(y, g, session, c.context) : y;
  return (
    r.throwIfAborted(),
    buildProjectContextResult(h, safeParse.success ? safeParse.data.maxChars : void 0, jt, c.bySentRules)
  );
}
//@ chunk-wy9dbk5f.js:30941-31445 placement
async function serveReadNestedProjectContext(e, r, n) {
  let parse = Gn().parse(e);
  setClaudeMdAdditionalDirectoriesAsked(parse.addedDirectories);
  let toolUseContext = n.toolUseContext();
  if (
    isClaudeMdLoadingDisabled() ||
    !pathInAllowedWorkingPath(parse.filePath, getToolPermissionContext(toolUseContext))
  )
    return { summary: "no memory files", output: { memoryFiles: [] } };
  let c = resolveReadPermissionContext(e, n);
  if (c === void 0) return RULES_UNREAD_RESULT;
  let y = [],
    g = buildHeldOutsideTracker(c.context);
  for await (let h of iterateMemoryFilesForPath(parse.filePath, toolUseContext.storageV5, void 0, g))
    (r.throwIfAborted(), y.push(...h));
  if (parse.agentsMd)
    (y.push(
      ...(await readAncestorInstructions(
        parse.filePath,
        await loadSessionMemoryFiles(n, c.context),
        parse.agentsMd,
        g?.within,
        toolUseContext.session,
        c.context,
      )),
    ),
      r.throwIfAborted());
  return buildProjectContextResult(y, parse.maxChars, Bn, c.bySentRules);
}
//@ chunk-wy9dbk5f.js:31445-31563 placement
var RULES_UNREAD_RESULT = {
  summary: "no memory files: the session's read rules could not be read",
  output: { memoryFiles: [], rulesUnread: !0 },
};
//@ chunk-wy9dbk5f.js:31563-31711 placement
function loadSessionMemoryFiles(e, r) {
  let { session: session, storageV5: storageV5, credentials: credentials } = e.toolUseContext();
  if ((VGt(session, r), t9s(session), e.callerLogsSharedEvents)) e9s(session);
  return getMemoryFilesCached(session, !1, storageV5, credentials);
}
/**
 * 只保留 Project/Local 记忆文件构造 ReadProjectContext 结果；总大小超上限时返回 tooLarge。
 */
//@ chunk-wy9dbk5f.js:31711-32088 placement
function buildProjectContextResult(e, r, n, s) {
  let flattened = e.flatMap((c) =>
    c.type === "Project" || c.type === "Local"
      ? [{ path: c.path, type: c.type, content: c.content, parent: c.parent, globs: c.globs }]
      : [],
  );
  if (measureMemoryFiles(flattened) > Math.min(r ?? n, n))
    return {
      summary: "project context too large",
      output: { memoryFiles: [], tooLarge: !0, ...(s && { rulesJudged: !0 }) },
    };
  return {
    summary: `${flattened.length} memory files`,
    output: { memoryFiles: flattened, ...(s && { rulesJudged: !0 }) },
  };
}
//@ chunk-wy9dbk5f.js:32088-32230 placement
function measureMemoryFiles(e) {
  let r = 0;
  for (let n of e) {
    ((r += n.path.length + n.content.length), (r += n.parent?.length ?? 0));
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
