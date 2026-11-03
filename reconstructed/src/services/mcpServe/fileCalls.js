/**
 * services/mcpServe/fileCalls.ts
 *
 * 2.1.316 新增：mcp serve 文件类调用：读写文件字节、放置文件，以及输入 schema 注册。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wy9dbk5f.js (21)
 * attribution: placement 21
 */
import { posix, posix as posix_2 } from "path";
import { homedir, homedir as homedir_2 } from "os";
import { realpath, realpath as realpath_2, open, rm, mkdir, lstat, link, readlink } from "fs/promises";
import { constants } from "fs";
import { randomBytes } from "crypto";
import { pipeline } from "stream/promises";
import { promisify } from "util";
import { inflateRaw } from "zlib";
import { o, zodStrictObject, E, u as u_2, M, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { Eh } from "../../utils/pathClassification.js";
import { hl } from "../../utils/networkPaths.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { STAGE_TMP_PREFIX } from "../../utils/stageFileRoots.js";
import {
  STAGEFILE,
  serveStageFile,
  RUNBASHCOMMAND,
  serveRunBashCommand,
  READTASKOUTPUT,
  serveReadTaskOutput,
} from "./shellCalls.js";
import {
  FILESUGGESTIONS,
  serveFileSuggestions,
  LISTDIRECTORYFORREMOTE,
  serveListDirectory,
} from "./fileListingCalls.js";
import { READFILEFORREMOTE, serveReadFileForRemote } from "../remoteTools/readFileForRemote.js";
import { RUN_MONITOR_COMMAND_CALL, runMonitorCommandHere } from "./runMonitorCommand.js";
import {
  READ_CALLS_CALL,
  readCalls,
  STOP_BACKGROUND_COMMAND_CALL,
  stopBackgroundCommand,
  MOVE_RUNNING_COMMAND_CALL,
  moveRunningCommand,
} from "./readCalls.js";
import {
  PLUGIN_COMMAND_OPS,
  serveListPluginCommands,
  RENDERPLUGINCOMMAND,
  renderPluginEntry,
  RENDERPINNEDPLUGINCOMMAND,
  SKILL_RENDER_OPS,
  serveReadSkill,
  RENDERSKILL,
  readListedSkill,
  RENDERPINNEDSKILL,
  RENDERBUILTINCOMMAND,
  serveRenderCommand,
  LISTPROJECTCOMMANDS,
  listProjectCommands,
} from "../remoteTools/commandRendering.js";
import { RUNPLUGINHOOK, RUNPLUGINHOOKIF } from "../remoteTools/runPluginHook.js";
import { call_2 } from "../../commands/feedback/feedback.js";
import {
  LISTPROJECTHOOKS,
  serveListProjectHooks,
  RUNPROJECTHOOK,
  serveRunProjectHook,
  RUNMANAGEDHOOK,
  serveRunManagedHook,
  RUNSKILLHOOK,
  serveRunSkillHook,
} from "./hookCalls.js";
import { LISTPROJECTAGENTS, serveListProjectAgents } from "./projectAgents.js";
import {
  READPROJECTCONTEXT,
  serveReadProjectContext,
  READNESTEDPROJECTCONTEXT,
  serveReadNestedProjectContext,
  READENVIRONMENT,
  serveReadEnvironment,
  READCHANGEDFILES,
  serveReadChangedFiles,
} from "./contextCalls.js";
import { READPROJECTSETTINGS, serveReadProjectSettings } from "./projectSettingsCalls.js";
import { READREPOGITSTATE, serveReadRepoGitState } from "./repoGitState.js";
import {
  LISTPROJECTMCPSERVERS,
  serveListProjectMcpServers,
  LISTPLUGINMCPSERVERS,
  serveListPluginMcpServers,
  RELAYPLUGINMCPMESSAGE,
  relayPluginMcpMessage,
  LISTORGCONNECTORMCPSERVERS,
  serveListOrgConnectorServers,
  RELAYORGCONNECTORMCPMESSAGE,
  relayOrgConnectorMessage,
  RELAYPROJECTMCPMESSAGE,
  relayProjectMcpMessage,
  CLOSEPROJECTMCPSERVERS,
  listProjectMcpServers,
  SETPROJECTMCPSERVERENABLED,
} from "./mcpRelayCalls.js";
import { handleSetMcpServerEnabled } from "./_new/handleSetMcpServerEnabled.js";
import { REGISTERREPOROOT, callRegisterRepoRoot } from "../repoRoots/registerRepoRootTool.js";
import { HASHFILES, PUTFILES } from "./fileInputs.js";
import { withFeatureTelemetry, logFeatureBad } from "../analytics/featureTelemetry.js";
import { ws } from "../../utils/fsFlags.js";
import { isENOENT, getErrnoCode } from "../../utils/errors.js";
import { SAFE_WRITE_FLAGS } from "../../skills/bundledSkills.js";
import { retryFsOp } from "../../utils/atomicPublishWrite.js";
import { READ_LIMITS } from "../../utils/fsBoundRead.js";
import { linkIntoHome } from "../../utils/filePersistence/homeFilePublish.js";
import { count } from "../../utils/collections.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { findIntermediateUncJunctionAsync, getFsImplementation } from "../../utils/fsOperations.js";

//@ chunk-wy9dbk5f.js:53234-54010 placement
var READFILEBYTES = "ReadFileBytes",
  WRITEFILEBYTES = "WriteFileBytes",
  PLACEFILES = "PlaceFiles",
  se = { maxFiles: 16, maxFileBytes: 31457280, maxTotalBytes: 67108864 },
  Vo = 6291456,
  he = () => o().refine((e) => posix.isAbsolute(e) && !Eh(e) && !hl(e), "must be an absolute local path"),
  $r = DoctorLazy(() =>
    zodStrictObject({ path: he(), offset: E().int().min(0), length: E().int().min(0).max(Vo) }),
  ),
  pp = DoctorLazy(() => u_2({ size: E(), bytes: o() })),
  Ve = () => o().regex(/^[0-9a-f-]{8,36}$/),
  Kr = DoctorLazy(() =>
    zodStrictObject({
      path: he(),
      write_id: Ve(),
      offset: E().int().min(0),
      bytes: o().max(Math.ceil(Vo / 3) * 4),
      last: M(),
      mode: E().int().min(0).max(511).optional(),
      staged: o().max(64).optional(),
      abandon: M().optional(),
      keep_existing: M().optional(),
      stop_if_caller_gone: M().optional(),
    }),
  ),
  dp = DoctorLazy(() =>
    u_2({
      written: E(),
      placed: M(),
      staged: o(),
      kept: M().optional(),
      keeps_existing: M().optional(),
      stops_for_gone_caller: M().optional(),
    }),
  );
//@ chunk-wy9dbk5f.js:54010-54116 placement
function isPlaceableFileName(e) {
  return (
    e !== "." &&
    e !== ".." &&
    !/[/\\\0]/.test(e) &&
    !e.startsWith(STAGE_TMP_PREFIX) &&
    Buffer.byteLength(e) <= 255
  );
}
/**
 * PlaceFiles 输入/输出结构，以及 mcp serve 调用名 → 处理函数的总表（文件读写、附件、技能/钩子/命令渲染、项目上下文、MCP 中继、任务文件上传下载等）。
 */
//@ chunk-wy9dbk5f.js:54116-57151 placement
var placeFilesInputSchema = DoctorLazy(() =>
    zodStrictObject({
      directory: he(),
      archive: zodStrictObject({ write_id: Ve(), staged: o().min(1).max(64) }).optional(),
      files: A(
        zodStrictObject({
          name: o()
            .min(1)
            .refine(
              isPlaceableFileName,
              "must be a file name of at most 255 bytes, with no directory, that is not a staging name",
            ),
          size: E().int().min(0).max(se.maxFileBytes),
          sha256: o().regex(/^[0-9a-f]{64}$/),
          offset: E().int().min(0).max(se.maxTotalBytes),
          length: E().int().min(0).max(se.maxTotalBytes),
          mode: E().int().min(0).max(511).optional(),
        }),
      ).max(se.maxFiles),
      keep_existing: M().optional(),
    }),
  ),
  placeFilesOutputSchema = DoctorLazy(() =>
    u_2({
      placed: A(M()),
      kept: A(M()).optional(),
      keeps_existing: M().optional(),
      limits: u_2({ max_files: E(), max_file_bytes: E(), max_total_bytes: E() }),
    }),
  ),
  SERVED_CALL_HANDLERS = new Map([
    [READFILEBYTES, serveReadFileBytes],
    [WRITEFILEBYTES, serveWriteFileBytes],
    [PLACEFILES, servePlaceFiles],
    [STAGEFILE, serveStageFile],
    [
      "FetchAttachment",
      async (e, r, n) =>
        (await import("./chunk-8rjc1mgh.js")).fetchAttachmentHere(
          e,
          n.callerGone === void 0 ? r : AbortSignal.any([r, n.callerGone]),
          {
            heldDirectory: openHeldDirectory,
            isPlaceableName: isPlaceableFileName,
            placeUnlessFileStands: linkUnlessFileExists,
            refuseLinkToNetworkPath: assertNoNetworkJunction,
          },
        ),
    ],
    [FILESUGGESTIONS, serveFileSuggestions],
    [READFILEFORREMOTE, serveReadFileForRemote],
    [LISTDIRECTORYFORREMOTE, serveListDirectory],
    [RUNBASHCOMMAND, serveRunBashCommand],
    [RUN_MONITOR_COMMAND_CALL, runMonitorCommandHere],
    [READ_CALLS_CALL, readCalls],
    [STOP_BACKGROUND_COMMAND_CALL, stopBackgroundCommand],
    [MOVE_RUNNING_COMMAND_CALL, moveRunningCommand],
    [PLUGIN_COMMAND_OPS, serveListPluginCommands],
    [RUNPLUGINHOOK, call_2],
    [RUNPLUGINHOOKIF, call_2],
    [LISTPROJECTHOOKS, serveListProjectHooks],
    [RUNPROJECTHOOK, serveRunProjectHook],
    [RUNMANAGEDHOOK, serveRunManagedHook],
    [RUNSKILLHOOK, serveRunSkillHook],
    [RENDERPLUGINCOMMAND, renderPluginEntry],
    [RENDERPINNEDPLUGINCOMMAND, renderPluginEntry],
    [SKILL_RENDER_OPS, serveReadSkill],
    [RENDERSKILL, readListedSkill],
    [RENDERPINNEDSKILL, readListedSkill],
    [RENDERBUILTINCOMMAND, serveRenderCommand],
    [LISTPROJECTAGENTS, serveListProjectAgents],
    [READPROJECTCONTEXT, serveReadProjectContext],
    [READNESTEDPROJECTCONTEXT, serveReadNestedProjectContext],
    [READPROJECTSETTINGS, serveReadProjectSettings],
    [READREPOGITSTATE, serveReadRepoGitState],
    [READTASKOUTPUT, serveReadTaskOutput],
    [READENVIRONMENT, serveReadEnvironment],
    [READCHANGEDFILES, serveReadChangedFiles],
    [LISTPROJECTMCPSERVERS, serveListProjectMcpServers],
    [LISTPLUGINMCPSERVERS, serveListPluginMcpServers],
    [RELAYPLUGINMCPMESSAGE, relayPluginMcpMessage],
    [LISTORGCONNECTORMCPSERVERS, serveListOrgConnectorServers],
    [RELAYORGCONNECTORMCPMESSAGE, relayOrgConnectorMessage],
    [RELAYPROJECTMCPMESSAGE, relayProjectMcpMessage],
    [CLOSEPROJECTMCPSERVERS, listProjectMcpServers],
    [SETPROJECTMCPSERVERENABLED, handleSetMcpServerEnabled],
    [LISTPROJECTCOMMANDS, listProjectCommands],
    [REGISTERREPOROOT, callRegisterRepoRoot],
    [
      "ReadChromeUpload",
      async (e, r, n) => (await import("./chunk-d2swv9w7.js")).readChromeUploadHere(e, r, n),
    ],
    [
      "ReadFileReference",
      async (e, r, n) => (await import("./chunk-d2swv9w7.js")).readChromeUploadHere(e, r, n, !0),
    ],
    [
      "UploadTaskFile",
      async (e, r, n) => {
        let uploadRulesForRequest = await (
          await import("./chunk-4qg8be4t.js")
        ).uploadRulesForRequest("UploadTaskFile", n);
        return (await import("./chunk-ff61chg3.js")).uploadTaskFile(
          e,
          r,
          n.session,
          { localFileAt: resolveLocalFilePath, realDirectory: Re, home: homedir() },
          uploadRulesForRequest,
        );
      },
    ],
    ["DeleteTaskFile", async (e, r, n) => (await import("./chunk-ff61chg3.js")).deleteTaskFile(e, n.session)],
    [
      "ReadProjectUploadText",
      async (e, r, n) => {
        let uploadRulesForRequest = await (
          await import("./chunk-4qg8be4t.js")
        ).uploadRulesForRequest("ReadProjectUploadText", n);
        return (await import("./chunk-pf54t43m.js")).readProjectUpload(
          e,
          n.session,
          { localFileAt: resolveLocalFilePath, realDirectory: Re, home: homedir() },
          uploadRulesForRequest,
        );
      },
    ],
    [
      "DownloadTaskFile",
      async (e, r, n) =>
        (await import("./chunk-ff61chg3.js")).downloadTaskFile(
          e,
          n.callerGone === void 0 ? r : AbortSignal.any([r, n.callerGone]),
          n.session,
          { makeFoldersAsWritten: makeDownloadFolders, placeStreamedFile: placeStreamedFile },
        ),
    ],
    [
      HASHFILES,
      async (e, r, n) => {
        let uploadRulesForRequest = await (
          await import("./chunk-4qg8be4t.js")
        ).uploadRulesForRequest(HASHFILES, n);
        return (await import("./chunk-amf531m0.js")).hashFiles(e, r, {
          session: n.session,
          paths: { localFileAt: resolveLocalFilePath, realDirectory: Re, home: homedir() },
          launchRules: uploadRulesForRequest,
          heldAtLaunch: n.launchPermissionContext !== void 0,
        });
      },
    ],
    [
      PUTFILES,
      async (e, r, n) => {
        let uploadRulesForRequest = await (
          await import("./chunk-4qg8be4t.js")
        ).uploadRulesForRequest(PUTFILES, n);
        return (await import("./chunk-amf531m0.js")).putFiles(e, r, {
          session: n.session,
          paths: { localFileAt: resolveLocalFilePath, realDirectory: Re, home: homedir() },
          launchRules: uploadRulesForRequest,
          heldAtLaunch: n.launchPermissionContext !== void 0,
        });
      },
    ],
  ]),
  FILE_CALL_FAILURE_EVENTS = new Map([
    [FILESUGGESTIONS, "file_suggestions_failed"],
    [READTASKOUTPUT, "read_task_output_failed"],
    [READCHANGEDFILES, "read_changed_files_failed"],
    [READ_CALLS_CALL, "read_calls_failed"],
    [LISTDIRECTORYFORREMOTE, "list_directory_failed"],
  ]);
//@ chunk-wy9dbk5f.js:57151-57305 placement
async function countedUnlessRepeated(e, r) {
  let n = FILE_CALL_FAILURE_EVENTS.get(e);
  if (n === void 0) return withFeatureTelemetry("mcp_serve_file_call", r);
  try {
    return await r();
  } catch (error) {
    throw (logFeatureBad("mcp_serve_file_call", n), error);
  }
}
//@ chunk-wy9dbk5f.js:57305-57440 placement
async function resolveLocalFilePath(e) {
  let parse = he().parse(e);
  await assertNoNetworkJunction(parse);
  let n = await realpath(parse);
  if (hl(n)) throw Error("must be an absolute local path");
  return n;
}
//@ chunk-wy9dbk5f.js:57440-57488 placement
function Re(e) {
  return realpath(e).catch(() => {
    return;
  });
}
//@ chunk-wy9dbk5f.js:57488-57936 placement
async function serveReadFileBytes(e, r) {
  let { path: path, offset: offset, length: a } = $r().parse(e),
    c = await resolveLocalFilePath(path),
    y = await open(c, constants.O_RDONLY | ws);
  try {
    let stats = await y.stat();
    if (!stats.isFile()) throw Error("not a regular file");
    (await assertFdPath(y, c), r.throwIfAborted());
    let max = Math.max(0, Math.min(a, stats.size - offset)),
      { bytesRead: bytesRead, buffer: buffer } = await y.read(Buffer.alloc(max), 0, max, offset);
    return {
      summary: `read ${bytesRead} of ${stats.size} bytes`,
      output: { size: stats.size, bytes: buffer.subarray(0, bytesRead).toString("base64") },
    };
  } finally {
    await y.close();
  }
}
//@ chunk-wy9dbk5f.js:57936-59643 placement
async function serveWriteFileBytes(e, r, { callerGone: callerGone }) {
  let parse = Kr().parse(e),
    a = parse.offset === 0,
    dir = posix.dirname(parse.path);
  if ((await assertNoNetworkJunction(dir), parse.abandon)) {
    let x = await realLocalPath(dir).catch((w) => {
      if (isENOENT(w)) return;
      throw w;
    });
    if (x !== void 0) await rm(posix.join(x, `${STAGE_TMP_PREFIX}${parse.write_id}`), { force: !0 });
    return {
      summary: "abandoned",
      output: {
        written: 0,
        placed: !1,
        staged: "",
        keeps_existing: !0,
        ...(callerGone !== void 0 && { stops_for_gone_caller: !0 }),
      },
    };
  }
  let buffer = Buffer.from(parse.bytes, "base64");
  if (buffer.length !== base64DecodedLength(parse.bytes)) throw Error("bytes is not base64");
  if (a) await mkdir(dir, { recursive: !0 });
  await using g = await openHeldDirectory(dir);
  let joined = posix.join(g.path, `${STAGE_TMP_PREFIX}${parse.write_id}`),
    S = await SAFE_WRITE_FLAGS(joined, a),
    C,
    b;
  try {
    let stats = await S.stat();
    if (((b = `${stats.dev}:${stats.ino}`), !stats.isFile() || stats.nlink !== 1))
      throw Error("the staged file is not a file of this write");
    if (!a && parse.staged !== b) throw Error("the staged file is not the one this write began");
    if (stats.size !== parse.offset) throw Error("part does not follow the bytes already written");
    for (let w = 0; w < buffer.length;) {
      let { bytesWritten: bytesWritten } = await S.write(buffer, w, buffer.length - w, parse.offset + w);
      if (bytesWritten === 0) throw Error("the staged file could not take the whole part");
      w += bytesWritten;
    }
    if (((C = stats.size + buffer.length), r.throwIfAborted(), parse.last)) {
      await S.chmod(parse.mode ?? 420);
      let w = await lstat(joined);
      if (`${w.dev}:${w.ino}` !== b) throw Error("the staged file was replaced before it was placed");
    }
  } finally {
    await S.close();
  }
  if (parse.stop_if_caller_gone && callerGone?.aborted)
    (await rm(joined, { force: !0 }), callerGone.throwIfAborted());
  let R = !1;
  if (parse.last) {
    let joined_2 = posix.join(g.path, posix.basename(parse.path));
    try {
      if (parse.keep_existing)
        ((R = await linkUnlessFileExists(joined, joined_2)), await rm(joined, { force: !0 }).catch(() => {}));
      else (await retryFsOp(joined, joined_2), (R = !0));
    } catch (error) {
      throw (await rm(joined, { force: !0 }), error);
    }
  }
  return {
    summary: R ? `placed ${C} bytes` : parse.last ? "left the file that was there" : `${C} bytes written`,
    output: { written: C, placed: R, staged: b, ...(parse.last && parse.keep_existing && { kept: !R }) },
  };
}
//@ chunk-wy9dbk5f.js:59643-59809 placement
async function linkUnlessFileExists(e, r) {
  if (
    await link(e, r).then(
      () => !0,
      () => !1,
    )
  )
    return !0;
  if (
    (
      await lstat(r).catch((s) => {
        if (isENOENT(s)) return;
        throw s;
      })
    )?.isFile()
  )
    return !1;
  return (await retryFsOp(e, r), !0);
}
/**
 * 逐级创建下载目录（0700，仅 Linux），并确认每级都是本用户拥有的真实目录。
 */
//@ chunk-wy9dbk5f.js:59809-60294 placement
async function makeDownloadFolders(e) {
  if (process.getuid === void 0)
    throw Error("refusing to create the download folders: this is supported only on Linux");
  let getuid = process.getuid,
    at = e.at(-1);
  if (at !== void 0) await assertNoNetworkJunction(at);
  for (let s of e) {
    try {
      await mkdir(s, { mode: 448 });
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
    let a = await lstat(s);
    if (!a.isDirectory())
      throw Error("one of the folders to write into is a symbolic link or not a directory");
    if (a.uid !== getuid()) throw Error("one of the folders to write into belongs to another user");
  }
}
/**
 * 把流写入目录下的临时暂存文件，校验未被替换后依次尝试链接到候选文件名，返回放置的路径；最后删除暂存文件。
 */
//@ chunk-wy9dbk5f.js:60294-60888 placement
async function placeStreamedFile(e, r, n, s) {
  await assertNoNetworkJunction(e);
  await using a = await openHeldDirectory(e, { asWritten: !0 });
  let joined = posix.join(a.path, `${STAGE_TMP_PREFIX}${randomBytes(8).toString("hex")}`),
    y = await SAFE_WRITE_FLAGS(joined, !0);
  try {
    let { dev: dev, ino: ino } = await y.stat();
    (await pipeline(n, y.createWriteStream()), s.throwIfAborted());
    let S = await open(joined, ws | READ_LIMITS);
    try {
      let stats = await S.stat();
      if (!stats.isFile() || stats.dev !== dev || stats.ino !== ino)
        throw Error("the staged file was replaced before it was placed");
      for (let b of r)
        if ((await linkIntoHome(joined, S, posix.join(a.path, b), 384)) !== void 0) return posix.join(e, b);
      return;
    } finally {
      await S.close().catch(() => {});
    }
  } finally {
    (await y.close().catch(() => {}), await rm(joined, { force: !0 }).catch(() => {}));
  }
}
//@ chunk-wy9dbk5f.js:60888-60959 placement
var Qr = promisify(inflateRaw),
  es = DoctorLazy(() => u_2({ directory: he(), archive: u_2({ write_id: Ve() }) }));
//@ chunk-wy9dbk5f.js:60959-61175 placement
async function removeStagedArchive(e) {
  let safeParse = es().safeParse(e);
  if (!safeParse.success) return;
  try {
    await assertNoNetworkJunction(safeParse.data.directory);
    await using n = await openHeldDirectory(safeParse.data.directory);
    await rm(posix.join(n.path, `${STAGE_TMP_PREFIX}${safeParse.data.archive.write_id}`), { force: !0 });
  } catch {}
}
//@ chunk-wy9dbk5f.js:61175-63032 placement
async function servePlaceFiles(e, r) {
  let safeParse = placeFilesInputSchema().safeParse(e);
  if (!safeParse.success) throw (await removeStagedArchive(e), safeParse.error);
  let { directory: directory, archive: archive, files: files, keep_existing: keep_existing } = safeParse.data,
    g = { max_files: se.maxFiles, max_file_bytes: se.maxFileBytes, max_total_bytes: se.maxTotalBytes };
  if (files.length === 0)
    return { summary: "nothing to place", output: { placed: [], limits: g, keeps_existing: !0 } };
  if (archive === void 0) throw Error("a list of files needs the archive that holds them");
  await assertNoNetworkJunction(directory);
  await using h = await openHeldDirectory(directory).catch(() => {
    throw Error("the directory cannot be opened");
  });
  let joined = posix.join(h.path, `${STAGE_TMP_PREFIX}${archive.write_id}`),
    C = [];
  try {
    if (new Set(files.map((w) => w.name)).size !== files.length) throw Error("a name is in the list twice");
    if (files.reduce((w, O) => w + O.size, 0) > se.maxTotalBytes)
      throw Error("the files together are larger than one call places");
    let b = await open(joined, constants.O_RDONLY | ws).catch(() => {
      throw Error("the staged archive is missing, or is not the file this write staged");
    });
    try {
      let stats = await b.stat();
      if (!stats.isFile() || stats.nlink !== 1 || `${stats.dev}:${stats.ino}` !== archive.staged)
        throw Error("the staged archive is missing, or is not the file this write staged");
      if (files.some((O) => O.offset + O.length > stats.size))
        throw Error("a file's offset and length reach past the end of the archive");
      for (let O of files)
        (r.throwIfAborted(), C.push(await extractArchiveEntry(b, h.path, archive.write_id, O)));
    } finally {
      await b.close();
    }
    r.throwIfAborted();
    let mapped = files.map(() => !1),
      mapped_2 = files.map(() => !1);
    for (let [w, O] of files.entries()) {
      let P = C[w];
      if (P === void 0) break;
      let joined = posix.join(h.path, O.name);
      try {
        let j = await lstat(P.path);
        if (`${j.dev}:${j.ino}` !== P.identity) break;
        if (keep_existing) {
          ((mapped[w] = await linkUnlessFileExists(P.path, joined)), (mapped_2[w] = !mapped[w]));
          continue;
        }
        await retryFsOp(P.path, joined);
      } catch {
        break;
      }
      ((C[w] = void 0), (mapped[w] = !0));
    }
    return {
      summary: `placed ${count(mapped, Boolean)} of ${files.length} files${keep_existing ? `, and left ${count(mapped_2, Boolean)} already there` : ""}`,
      output: { placed: mapped, limits: g, ...(keep_existing && { kept: mapped_2 }) },
    };
  } finally {
    await rm(joined, { force: !0 }).catch(() => {});
    for (let b of C) if (b !== void 0) await rm(b.path, { force: !0 }).catch(() => {});
  }
}
/**
 * 从归档中按偏移读出一个文件，解压并校验大小与 SHA-256，写入暂存文件并设置权限，返回暂存路径与 dev:ino 身份。
 */
//@ chunk-wy9dbk5f.js:63032-63991 placement
async function extractArchiveEntry(e, r, n, s) {
  let alloc = Buffer.alloc(s.length);
  for (let h = 0; h < alloc.length;) {
    let { bytesRead: bytesRead } = await e.read(alloc, h, alloc.length - h, s.offset + h);
    if (bytesRead === 0) throw Error("a file's offset and length reach past the end of the archive");
    h += bytesRead;
  }
  let c = await Qr(alloc, { maxOutputLength: s.size + 1 }).catch(() => {
    return;
  });
  if (c === void 0) throw Error("a file could not be inflated, or holds more than its stated size");
  if (c.length !== s.size) throw Error("a file does not inflate to its stated size");
  if (computeContentHash(c) !== s.sha256) throw Error("a file does not match its stated SHA-256");
  let joined = posix.join(r, `${STAGE_TMP_PREFIX}${n}-${randomBytes(6).toString("hex")}`),
    g = await open(joined, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | ws, 384).catch((h) => {
      throw fileErrorMessage(h);
    });
  try {
    for (let S = 0; S < c.length;) {
      let { bytesWritten: bytesWritten } = await g.write(c, S, c.length - S, S);
      if (bytesWritten === 0) throw fileErrorMessage(void 0);
      S += bytesWritten;
    }
    await g.chmod(s.mode ?? 420);
    let stats = await g.stat();
    return { path: joined, identity: `${stats.dev}:${stats.ino}` };
  } catch (error) {
    throw (await rm(joined, { force: !0 }).catch(() => {}), fileErrorMessage(error));
  } finally {
    await g.close();
  }
}
//@ chunk-wy9dbk5f.js:63991-64304 placement
function fileErrorMessage(e) {
  switch (e instanceof Error && "code" in e ? e.code : void 0) {
    case "ENOSPC":
    case "EDQUOT":
      return Error("a file could not be staged: the disk is full");
    case "EACCES":
    case "EPERM":
    case "EROFS":
      return Error("a file could not be staged: writing is not permitted");
    default:
      return Error("a file could not be staged");
  }
}
//@ chunk-wy9dbk5f.js:64304-64407 placement
async function realLocalPath(e) {
  let r = await realpath(e);
  if (hl(r)) throw Error("must be an absolute local path");
  return r;
}
//@ chunk-wy9dbk5f.js:64407-64558 placement
async function assertNoNetworkJunction(e) {
  if (
    (await findIntermediateUncJunctionAsync(getFsImplementation(), e, {
      unreadableAncestry: "unverified",
      surfaceNetworkRaw: !0,
    })) !== void 0
  )
    throw Error("must be an absolute local path");
}
/**
 * 以 O_DIRECTORY|O_NOFOLLOW 打开目录并核对 /proc/self/fd 路径未变，返回可 await using 的 /proc/self/fd 路径句柄。
 */
//@ chunk-wy9dbk5f.js:64558-64928 placement
async function openHeldDirectory(e, r = {}) {
  let n = await realLocalPath(e);
  if ((r.asWritten, r.asWritten && n !== e))
    throw Error(
      "the directory is not its own real path: a link is at it or above it, or it is not in normal form",
    );
  let s = await open(n, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    await assertFdPath(s, n);
  } catch (error) {
    throw (await s.close(), error);
  }
  return { path: `/proc/self/fd/${s.fd}`, [Symbol.asyncDispose]: () => s.close() };
}
//@ chunk-wy9dbk5f.js:64928-65065 placement
async function assertFdPath(e, r) {
  let n = await readlink(`/proc/self/fd/${e.fd}`);
  if (n !== r || hl(n)) throw Error("the path changed while it was being opened");
}
//@ chunk-wy9dbk5f.js:65138-65247 placement
function base64DecodedLength(e) {
  if (e.length % 4 !== 0) return -1;
  let r = e.endsWith("==") ? 2 : e.endsWith("=") ? 1 : 0;
  return (e.length / 4) * 3 - r;
}
