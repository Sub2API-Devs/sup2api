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
import { posix } from "path";
import { homedir } from "os";
import { realpath, open, rm, mkdir, lstat, link, readlink } from "fs/promises";
import { constants } from "fs";
import { randomBytes } from "crypto";
import { pipeline } from "stream/promises";
import { promisify } from "util";
import { inflateRaw } from "zlib";
import { string, zodStrictObject, E, u, M, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { hasDotDotSegment } from "../../utils/pathClassification.js";
import { isUntouchableSpelling } from "../../utils/networkPaths.js";
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
  handleSetMcpServerEnabled,
} from "./mcpRelayCalls.js";
import { REGISTERREPOROOT, callRegisterRepoRoot } from "../repoRoots/registerRepoRootTool.js";
import { HASHFILES, PUTFILES } from "./fileInputs.js";
import { withFeatureTelemetry, logFeatureBad } from "../analytics/featureTelemetry.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../../utils/fsFlags.js";
import { isENOENT, getErrnoCode } from "../../utils/errors.js";
import { SAFE_WRITE_FLAGS } from "../../skills/bundledSkills.js";
import { retryFsOp } from "../../utils/atomicPublishWrite.js";
import { READ_LIMITS } from "../../utils/fsBoundRead.js";
import { linkIntoHome } from "../../utils/filePersistence/homeFilePublish.js";
import { count } from "../../utils/collections.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { findIntermediateUncJunctionAsync, getFsImplementation } from "../../utils/fsOperations.js";

//@ chunk-wy9dbk5f.js:53234-54010 placement
/**
 * 放置文件结果的 schema。
 */
var READFILEBYTES = "ReadFileBytes";
var WRITEFILEBYTES = "WriteFileBytes";
var PLACEFILES = "PlaceFiles";
var FILE_LIMITS = {
  maxFiles: 16,
  maxFileBytes: 31457280,
  maxTotalBytes: 67108864,
};
var MAX_SINGLE_WRITE_BYTES = 6291456;
var absoluteLocalPathSchema = () =>
  string().refine(
    (e) => posix.isAbsolute(e) && !hasDotDotSegment(e) && !isUntouchableSpelling(e),
    "must be an absolute local path",
  );
var readFileBytesInputSchema = DoctorLazy(() =>
  zodStrictObject({
    path: absoluteLocalPathSchema(),
    offset: E().int().min(0),
    length: E().int().min(0).max(MAX_SINGLE_WRITE_BYTES),
  }),
);
var writeBytesResultSchema = DoctorLazy(() =>
  u({
    size: E(),
    bytes: string(),
  }),
);
var writeIdSchema = () => string().regex(/^[0-9a-f-]{8,36}$/);
var writeFileBytesInputSchema = DoctorLazy(() =>
  zodStrictObject({
    path: absoluteLocalPathSchema(),
    write_id: writeIdSchema(),
    offset: E().int().min(0),
    bytes: string().max(Math.ceil(MAX_SINGLE_WRITE_BYTES / 3) * 4),
    last: M(),
    mode: E().int().min(0).max(511).optional(),
    staged: string().max(64).optional(),
    abandon: M().optional(),
    keep_existing: M().optional(),
    stop_if_caller_gone: M().optional(),
  }),
);
var placeFilesResultSchema = DoctorLazy(() =>
  u({
    written: E(),
    placed: M(),
    staged: string(),
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
//@ chunk-wy9dbk5f.js:54116-57151 placement
/**
 * PlaceFiles 输入/输出结构，以及 mcp serve 调用名 → 处理函数的总表（文件读写、附件、技能/钩子/命令渲染、项目上下文、MCP 中继、任务文件上传下载等）。
 */
var placeFilesInputSchema_2 = DoctorLazy(() =>
  zodStrictObject({
    directory: absoluteLocalPathSchema(),
    archive: zodStrictObject({
      write_id: writeIdSchema(),
      staged: string().min(1).max(64),
    }).optional(),
    files: array(
      zodStrictObject({
        name: string()
          .min(1)
          .refine(
            isPlaceableFileName,
            "must be a file name of at most 255 bytes, with no directory, that is not a staging name",
          ),
        size: E().int().min(0).max(FILE_LIMITS.maxFileBytes),
        sha256: string().regex(/^[0-9a-f]{64}$/),
        offset: E().int().min(0).max(FILE_LIMITS.maxTotalBytes),
        length: E().int().min(0).max(FILE_LIMITS.maxTotalBytes),
        mode: E().int().min(0).max(511).optional(),
      }),
    ).max(FILE_LIMITS.maxFiles),
    keep_existing: M().optional(),
  }),
);
var placeFilesOutputSchema = DoctorLazy(() =>
  u({
    placed: array(M()),
    kept: array(M()).optional(),
    keeps_existing: M().optional(),
    limits: u({
      max_files: E(),
      max_file_bytes: E(),
      max_total_bytes: E(),
    }),
  }),
);
var SERVED_CALL_HANDLERS = new Map([
  [READFILEBYTES, serveReadFileBytes],
  [WRITEFILEBYTES, serveWriteFileBytes],
  [PLACEFILES, servePlaceFiles],
  [STAGEFILE, serveStageFile],
  [
    "FetchAttachment",
    async (e, r, n) =>
      (await import("./chunk-8rjc1mgh.js")).fetchAttachmentHere(
        e,
        n.callerGone === undefined ? r : AbortSignal.any([r, n.callerGone]),
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
    async (e, r, n) => (await import("./chunk-d2swv9w7.js")).readChromeUploadHere(e, r, n, true),
  ],
  [
    "UploadTaskFile",
    async (e, r, n) => {
      let s = await (await import("./chunk-4qg8be4t.js")).uploadRulesForRequest("UploadTaskFile", n);
      return (await import("./chunk-ff61chg3.js")).uploadTaskFile(
        e,
        r,
        n.session,
        {
          localFileAt: resolveLocalFilePath,
          realDirectory: tryRealpath,
          home: homedir(),
        },
        s,
      );
    },
  ],
  ["DeleteTaskFile", async (e, r, n) => (await import("./chunk-ff61chg3.js")).deleteTaskFile(e, n.session)],
  [
    "ReadProjectUploadText",
    async (e, r, n) => {
      let s = await (await import("./chunk-4qg8be4t.js")).uploadRulesForRequest("ReadProjectUploadText", n);
      return (await import("./chunk-pf54t43m.js")).readProjectUpload(
        e,
        n.session,
        {
          localFileAt: resolveLocalFilePath,
          realDirectory: tryRealpath,
          home: homedir(),
        },
        s,
      );
    },
  ],
  [
    "DownloadTaskFile",
    async (e, r, n) =>
      (await import("./chunk-ff61chg3.js")).downloadTaskFile(
        e,
        n.callerGone === undefined ? r : AbortSignal.any([r, n.callerGone]),
        n.session,
        {
          makeFoldersAsWritten: makeDownloadFolders,
          placeStreamedFile,
        },
      ),
  ],
  [
    HASHFILES,
    async (e, r, n) => {
      let launchRules = await (await import("./chunk-4qg8be4t.js")).uploadRulesForRequest(HASHFILES, n);
      return (await import("./chunk-amf531m0.js")).hashFiles(e, r, {
        session: n.session,
        paths: {
          localFileAt: resolveLocalFilePath,
          realDirectory: tryRealpath,
          home: homedir(),
        },
        launchRules,
        heldAtLaunch: n.launchPermissionContext !== undefined,
      });
    },
  ],
  [
    PUTFILES,
    async (e, r, n) => {
      let launchRules = await (await import("./chunk-4qg8be4t.js")).uploadRulesForRequest(PUTFILES, n);
      return (await import("./chunk-amf531m0.js")).putFiles(e, r, {
        session: n.session,
        paths: {
          localFileAt: resolveLocalFilePath,
          realDirectory: tryRealpath,
          home: homedir(),
        },
        launchRules,
        heldAtLaunch: n.launchPermissionContext !== undefined,
      });
    },
  ],
]);
var FILE_CALL_FAILURE_EVENTS = new Map([
  [FILESUGGESTIONS, "file_suggestions_failed"],
  [READTASKOUTPUT, "read_task_output_failed"],
  [READCHANGEDFILES, "read_changed_files_failed"],
  [READ_CALLS_CALL, "read_calls_failed"],
  [LISTDIRECTORYFORREMOTE, "list_directory_failed"],
]);
//@ chunk-wy9dbk5f.js:57151-57305 placement
async function countedUnlessRepeated(e, r) {
  let n = FILE_CALL_FAILURE_EVENTS.get(e);
  if (n === undefined) return withFeatureTelemetry("mcp_serve_file_call", r);
  try {
    return await r();
  } catch (error) {
    logFeatureBad("mcp_serve_file_call", n);
    throw error;
  }
}
//@ chunk-wy9dbk5f.js:57305-57440 placement
async function resolveLocalFilePath(path) {
  let r = absoluteLocalPathSchema().parse(path);
  await assertNoNetworkJunction(r);
  let n = await realpath(r);
  if (isUntouchableSpelling(n)) throw Error("must be an absolute local path");
  return n;
}
//@ chunk-wy9dbk5f.js:57440-57488 placement
/**
 * 解析真实路径，失败返回 undefined。
 */
function tryRealpath(e) {
  return realpath(e).catch(() => {
    return;
  });
}
//@ chunk-wy9dbk5f.js:57488-57936 placement
async function serveReadFileBytes(e, r) {
  let { path, offset, length: a } = readFileBytesInputSchema().parse(e);
  let localFilePath = await resolveLocalFilePath(path);
  let y = await open(localFilePath, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
  try {
    let stats = await y.stat();
    if (!stats.isFile()) throw Error("not a regular file");
    await assertFdPath(y, localFilePath);
    r.throwIfAborted();
    let max = Math.max(0, Math.min(a, stats.size - offset));
    let { bytesRead, buffer } = await y.read(Buffer.alloc(max), 0, max, offset);
    return {
      summary: `read ${bytesRead} of ${stats.size} bytes`,
      output: {
        size: stats.size,
        bytes: buffer.subarray(0, bytesRead).toString("base64"),
      },
    };
  } finally {
    await y.close();
  }
}
//@ chunk-wy9dbk5f.js:57936-59643 placement
async function serveWriteFileBytes(e, r, { callerGone }) {
  let s = writeFileBytesInputSchema().parse(e);
  let a = s.offset === 0;
  let dir = posix.dirname(s.path);
  await assertNoNetworkJunction(dir);
  if (s.abandon) {
    let x = await realLocalPath(dir).catch((error) => {
      if (isENOENT(error)) return;
      throw error;
    });
    if (x !== undefined)
      await rm(posix.join(x, `${STAGE_TMP_PREFIX}${s.write_id}`), {
        force: true,
      });
    return {
      summary: "abandoned",
      output: {
        written: 0,
        placed: false,
        staged: "",
        keeps_existing: true,
        ...(callerGone !== undefined && {
          stops_for_gone_caller: true,
        }),
      },
    };
  }
  let buffer = Buffer.from(s.bytes, "base64");
  if (buffer.length !== base64DecodedLength(s.bytes)) throw Error("bytes is not base64");
  if (a)
    await mkdir(dir, {
      recursive: true,
    });
  await using heldDirectory = await openHeldDirectory(dir);
  let joined = posix.join(heldDirectory.path, `${STAGE_TMP_PREFIX}${s.write_id}`);
  let S = await SAFE_WRITE_FLAGS(joined, a);
  let C;
  let b;
  try {
    let stats = await S.stat();
    b = `${stats.dev}:${stats.ino}`;
    if (!stats.isFile() || stats.nlink !== 1) throw Error("the staged file is not a file of this write");
    if (!a && s.staged !== b) throw Error("the staged file is not the one this write began");
    if (stats.size !== s.offset) throw Error("part does not follow the bytes already written");
    for (let w = 0; w < buffer.length;) {
      let { bytesWritten } = await S.write(buffer, w, buffer.length - w, s.offset + w);
      if (bytesWritten === 0) throw Error("the staged file could not take the whole part");
      w += bytesWritten;
    }
    C = stats.size + buffer.length;
    r.throwIfAborted();
    if (s.last) {
      await S.chmod(s.mode ?? 420);
      let w = await lstat(joined);
      if (`${w.dev}:${w.ino}` !== b) throw Error("the staged file was replaced before it was placed");
    }
  } finally {
    await S.close();
  }
  if (s.stop_if_caller_gone && callerGone?.aborted) {
    await rm(joined, {
      force: true,
    });
    callerGone.throwIfAborted();
  }
  let R = false;
  if (s.last) {
    let joined_2 = posix.join(heldDirectory.path, posix.basename(s.path));
    try {
      if (s.keep_existing) {
        R = await linkUnlessFileExists(joined, joined_2);
        await rm(joined, {
          force: true,
        }).catch(() => {});
      } else {
        await retryFsOp(joined, joined_2);
        R = true;
      }
    } catch (error) {
      await rm(joined, {
        force: true,
      });
      throw error;
    }
  }
  return {
    summary: R ? `placed ${C} bytes` : s.last ? "left the file that was there" : `${C} bytes written`,
    output: {
      written: C,
      placed: R,
      staged: b,
      ...(s.last &&
        s.keep_existing && {
          kept: !R,
        }),
    },
  };
}
//@ chunk-wy9dbk5f.js:59643-59809 placement
async function linkUnlessFileExists(e, r) {
  if (
    await link(e, r).then(
      () => true,
      () => false,
    )
  )
    return true;
  if (
    (
      await lstat(r).catch((error) => {
        if (isENOENT(error)) return;
        throw error;
      })
    )?.isFile()
  )
    return false;
  await retryFsOp(e, r);
  return true;
}
//@ chunk-wy9dbk5f.js:59809-60294 placement
/**
 * 逐级创建下载目录（0700，仅 Linux），并确认每级都是本用户拥有的真实目录。
 */
async function makeDownloadFolders(e) {
  if (process.getuid === undefined)
    throw Error("refusing to create the download folders: this is supported only on Linux");
  let getuid = process.getuid;
  let last = e.at(-1);
  if (last !== undefined) await assertNoNetworkJunction(last);
  for (let s of e) {
    try {
      await mkdir(s, {
        mode: 448,
      });
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
    let a = await lstat(s);
    if (!a.isDirectory())
      throw Error("one of the folders to write into is a symbolic link or not a directory");
    if (a.uid !== getuid()) throw Error("one of the folders to write into belongs to another user");
  }
}
//@ chunk-wy9dbk5f.js:60294-60888 placement
/**
 * 把流写入目录下的临时暂存文件，校验未被替换后依次尝试链接到候选文件名，返回放置的路径；最后删除暂存文件。
 */
async function placeStreamedFile(e, r, n, s) {
  await assertNoNetworkJunction(e);
  await using heldDirectory = await openHeldDirectory(e, {
    asWritten: true,
  });
  let joined = posix.join(heldDirectory.path, `${STAGE_TMP_PREFIX}${randomBytes(8).toString("hex")}`);
  let y = await SAFE_WRITE_FLAGS(joined, true);
  try {
    let { dev, ino } = await y.stat();
    await pipeline(n, y.createWriteStream());
    s.throwIfAborted();
    let S = await open(joined, NOFOLLOW_NONBLOCK_FLAGS | READ_LIMITS);
    try {
      let stats = await S.stat();
      if (!stats.isFile() || stats.dev !== dev || stats.ino !== ino)
        throw Error("the staged file was replaced before it was placed");
      for (let b of r)
        if ((await linkIntoHome(joined, S, posix.join(heldDirectory.path, b), 384)) !== undefined)
          return posix.join(e, b);
      return;
    } finally {
      await S.close().catch(() => {});
    }
  } finally {
    await y.close().catch(() => {});
    await rm(joined, {
      force: true,
    }).catch(() => {});
  }
}
//@ chunk-wy9dbk5f.js:60888-60959 placement
/**
 * 放置文件的输入 schema。
 */
var inflateRawAsync = promisify(inflateRaw);
var placeFilesInputSchema = DoctorLazy(() =>
  u({
    directory: absoluteLocalPathSchema(),
    archive: u({
      write_id: writeIdSchema(),
    }),
  }),
);
//@ chunk-wy9dbk5f.js:60959-61175 placement
async function removeStagedArchive(e) {
  let r = placeFilesInputSchema().safeParse(e);
  if (!r.success) return;
  try {
    await assertNoNetworkJunction(r.data.directory);
    await using heldDirectory = await openHeldDirectory(r.data.directory);
    await rm(posix.join(heldDirectory.path, `${STAGE_TMP_PREFIX}${r.data.archive.write_id}`), {
      force: true,
    });
  } catch {}
}
//@ chunk-wy9dbk5f.js:61175-63032 placement
async function servePlaceFiles(e, r) {
  let n = placeFilesInputSchema_2().safeParse(e);
  if (!n.success) {
    await removeStagedArchive(e);
    throw n.error;
  }
  let { directory, archive, files, keep_existing: keepExisting } = n.data;
  let limits = {
    max_files: FILE_LIMITS.maxFiles,
    max_file_bytes: FILE_LIMITS.maxFileBytes,
    max_total_bytes: FILE_LIMITS.maxTotalBytes,
  };
  if (files.length === 0)
    return {
      summary: "nothing to place",
      output: {
        placed: [],
        limits,
        keeps_existing: true,
      },
    };
  if (archive === undefined) throw Error("a list of files needs the archive that holds them");
  await assertNoNetworkJunction(directory);
  await using h = await openHeldDirectory(directory).catch(() => {
    throw Error("the directory cannot be opened");
  });
  let joined = posix.join(h.path, `${STAGE_TMP_PREFIX}${archive.write_id}`);
  let C = [];
  try {
    if (new Set(files.map((file) => file.name)).size !== files.length)
      throw Error("a name is in the list twice");
    if (files.reduce((acc, file) => acc + file.size, 0) > FILE_LIMITS.maxTotalBytes)
      throw Error("the files together are larger than one call places");
    let b = await open(joined, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS).catch(() => {
      throw Error("the staged archive is missing, or is not the file this write staged");
    });
    try {
      let stats = await b.stat();
      if (!stats.isFile() || stats.nlink !== 1 || `${stats.dev}:${stats.ino}` !== archive.staged)
        throw Error("the staged archive is missing, or is not the file this write staged");
      if (files.some((file) => file.offset + file.length > stats.size))
        throw Error("a file's offset and length reach past the end of the archive");
      for (let file of files) {
        r.throwIfAborted();
        C.push(await extractArchiveEntry(b, h.path, archive.write_id, file));
      }
    } finally {
      await b.close();
    }
    r.throwIfAborted();
    let mapped = files.map(() => false);
    let mapped_2 = files.map(() => false);
    for (let [w, O] of files.entries()) {
      let P = C[w];
      if (P === undefined) break;
      let joined = posix.join(h.path, O.name);
      try {
        let j = await lstat(P.path);
        if (`${j.dev}:${j.ino}` !== P.identity) break;
        if (keepExisting) {
          mapped[w] = await linkUnlessFileExists(P.path, joined);
          mapped_2[w] = !mapped[w];
          continue;
        }
        await retryFsOp(P.path, joined);
      } catch {
        break;
      }
      C[w] = undefined;
      mapped[w] = true;
    }
    return {
      summary: `placed ${count(mapped, Boolean)} of ${files.length} files${keepExisting ? `, and left ${count(mapped_2, Boolean)} already there` : ""}`,
      output: {
        placed: mapped,
        limits,
        ...(keepExisting && {
          kept: mapped_2,
        }),
      },
    };
  } finally {
    await rm(joined, {
      force: true,
    }).catch(() => {});
    for (let b of C)
      if (b !== undefined)
        await rm(b.path, {
          force: true,
        }).catch(() => {});
  }
}
//@ chunk-wy9dbk5f.js:63032-63991 placement
/**
 * 从归档中按偏移读出一个文件，解压并校验大小与 SHA-256，写入暂存文件并设置权限，返回暂存路径与 dev:ino 身份。
 */
async function extractArchiveEntry(e, path, writeId, file) {
  let a = Buffer.alloc(file.length);
  for (let h = 0; h < a.length;) {
    let { bytesRead } = await e.read(a, h, a.length - h, file.offset + h);
    if (bytesRead === 0) throw Error("a file's offset and length reach past the end of the archive");
    h += bytesRead;
  }
  let c = await inflateRawAsync(a, {
    maxOutputLength: file.size + 1,
  }).catch(() => {
    return;
  });
  if (c === undefined) throw Error("a file could not be inflated, or holds more than its stated size");
  if (c.length !== file.size) throw Error("a file does not inflate to its stated size");
  if (computeContentHash(c) !== file.sha256) throw Error("a file does not match its stated SHA-256");
  let joined = posix.join(path, `${STAGE_TMP_PREFIX}${writeId}-${randomBytes(6).toString("hex")}`);
  let g = await open(
    joined,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | NOFOLLOW_NONBLOCK_FLAGS,
    384,
  ).catch((error) => {
    throw fileErrorMessage(error);
  });
  try {
    for (let S = 0; S < c.length;) {
      let { bytesWritten } = await g.write(c, S, c.length - S, S);
      if (bytesWritten === 0) throw fileErrorMessage(undefined);
      S += bytesWritten;
    }
    await g.chmod(file.mode ?? 420);
    let stats = await g.stat();
    return {
      path: joined,
      identity: `${stats.dev}:${stats.ino}`,
    };
  } catch (error) {
    await rm(joined, {
      force: true,
    }).catch(() => {});
    throw fileErrorMessage(error);
  } finally {
    await g.close();
  }
}
//@ chunk-wy9dbk5f.js:63991-64304 placement
function fileErrorMessage(error) {
  switch (error instanceof Error && "code" in error ? error.code : undefined) {
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
  if (isUntouchableSpelling(r)) throw Error("must be an absolute local path");
  return r;
}
//@ chunk-wy9dbk5f.js:64407-64558 placement
async function assertNoNetworkJunction(e) {
  if (
    (await findIntermediateUncJunctionAsync(getFsImplementation(), e, {
      unreadableAncestry: "unverified",
      surfaceNetworkRaw: true,
    })) !== undefined
  )
    throw Error("must be an absolute local path");
}
//@ chunk-wy9dbk5f.js:64558-64928 placement
/**
 * 以 O_DIRECTORY|O_NOFOLLOW 打开目录并核对 /proc/self/fd 路径未变，返回可 await using 的 /proc/self/fd 路径句柄。
 */
async function openHeldDirectory(directory, r = {}) {
  let n = await realLocalPath(directory);
  r.asWritten;
  if (r.asWritten && n !== directory)
    throw Error(
      "the directory is not its own real path: a link is at it or above it, or it is not in normal form",
    );
  let s = await open(n, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    await assertFdPath(s, n);
  } catch (error) {
    await s.close();
    throw error;
  }
  return {
    path: `/proc/self/fd/${s.fd}`,
    [Symbol.asyncDispose]: () => s.close(),
  };
}
//@ chunk-wy9dbk5f.js:64928-65065 placement
async function assertFdPath(e, r) {
  let n = await readlink(`/proc/self/fd/${e.fd}`);
  if (n !== r || isUntouchableSpelling(n)) throw Error("the path changed while it was being opened");
}
//@ chunk-wy9dbk5f.js:65138-65247 placement
function base64DecodedLength(bytes) {
  if (bytes.length % 4 !== 0) return -1;
  let r = bytes.endsWith("==") ? 2 : bytes.endsWith("=") ? 1 : 0;
  return (bytes.length / 4) * 3 - r;
}
