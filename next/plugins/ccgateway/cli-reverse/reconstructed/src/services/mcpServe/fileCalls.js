/**
 * services/mcpServe/fileCalls.ts
 *
 * 2.1.316 新增：mcp serve 文件类调用：读写文件字节、放置文件，以及输入 schema 注册。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xrwmcqkn.js (21)
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
import {
  stringSchema,
  zodStrictObject,
  numberSchema,
  objectSchema,
  booleanSchema,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import {
  RUNPLUGINHOOK,
  runCommandHook,
  RUNPLUGINHOOKIF,
  RUNPLUGINHTTPHOOK,
  isHTTPConfig as isHTTPConfig_2,
} from "../remoteTools/runPluginHook.js";
import {
  LISTPROJECTHOOKS,
  loadHookSnapshot,
  RUNPROJECTHOOK,
  runHook,
  RUNPROJECTHTTPHOOK,
  isHTTPConfig,
  RUNPROJECTMODELHOOK,
  runPromptHook,
  RUNPROJECTMCPHOOK,
  runMcpToolHook,
  RUNMANAGEDHOOK,
  serveRunManagedHook,
  RUNSKILLHOOK,
  serveRunSkillHook,
  JUDGEHOOKCONDITION,
  judgeHookCondition,
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
import { countWhere } from "../../utils/collections.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { findIntermediateUncJunctionAsync, getFsImplementation } from "../../utils/fsOperations.js";

//@ chunk-xrwmcqkn.js:49059-49835 placement
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
  stringSchema().refine(
    (path) => posix.isAbsolute(path) && !hasDotDotSegment(path) && !isUntouchableSpelling(path),
    "must be an absolute local path",
  );
var readFileBytesInputSchema = DoctorLazy(() =>
  zodStrictObject({
    path: absoluteLocalPathSchema(),
    offset: numberSchema().int().min(0),
    length: numberSchema().int().min(0).max(MAX_SINGLE_WRITE_BYTES),
  }),
);
var writeBytesResultSchema = DoctorLazy(() =>
  objectSchema({
    size: numberSchema(),
    bytes: stringSchema(),
  }),
);
var writeIdSchema = () => stringSchema().regex(/^[0-9a-f-]{8,36}$/);
var writeFileBytesInputSchema = DoctorLazy(() =>
  zodStrictObject({
    path: absoluteLocalPathSchema(),
    write_id: writeIdSchema(),
    offset: numberSchema().int().min(0),
    bytes: stringSchema().max(Math.ceil(MAX_SINGLE_WRITE_BYTES / 3) * 4),
    last: booleanSchema(),
    mode: numberSchema().int().min(0).max(511).optional(),
    staged: stringSchema().max(64).optional(),
    abandon: booleanSchema().optional(),
    keep_existing: booleanSchema().optional(),
    stop_if_caller_gone: booleanSchema().optional(),
  }),
);
var placeFilesResultSchema = DoctorLazy(() =>
  objectSchema({
    written: numberSchema(),
    placed: booleanSchema(),
    staged: stringSchema(),
    kept: booleanSchema().optional(),
    keeps_existing: booleanSchema().optional(),
    stops_for_gone_caller: booleanSchema().optional(),
  }),
);
//@ chunk-xrwmcqkn.js:49835-49941 placement
function isPlaceableFileName(fileName) {
  return (
    fileName !== "." &&
    fileName !== ".." &&
    !/[/\\\0]/.test(fileName) &&
    !fileName.startsWith(STAGE_TMP_PREFIX) &&
    Buffer.byteLength(fileName) <= 255
  );
}
//@ chunk-xrwmcqkn.js:49941-53223 placement
/**
 * PlaceFiles 输入/输出结构，以及 mcp serve 调用名 → 处理函数的总表（文件读写、附件、技能/钩子/命令渲染、项目上下文、MCP 中继、任务文件上传下载等）。
 */
var placeFilesInputSchema_2 = DoctorLazy(() =>
  zodStrictObject({
    directory: absoluteLocalPathSchema(),
    archive: zodStrictObject({
      write_id: writeIdSchema(),
      staged: stringSchema().min(1).max(64),
    }).optional(),
    files: array(
      zodStrictObject({
        name: stringSchema()
          .min(1)
          .refine(
            isPlaceableFileName,
            "must be a file name of at most 255 bytes, with no directory, that is not a staging name",
          ),
        size: numberSchema().int().min(0).max(FILE_LIMITS.maxFileBytes),
        sha256: stringSchema().regex(/^[0-9a-f]{64}$/),
        offset: numberSchema().int().min(0).max(FILE_LIMITS.maxTotalBytes),
        length: numberSchema().int().min(0).max(FILE_LIMITS.maxTotalBytes),
        mode: numberSchema().int().min(0).max(511).optional(),
      }),
    ).max(FILE_LIMITS.maxFiles),
    keep_existing: booleanSchema().optional(),
  }),
);
var placeFilesOutputSchema = DoctorLazy(() =>
  objectSchema({
    placed: array(booleanSchema()),
    kept: array(booleanSchema()).optional(),
    keeps_existing: booleanSchema().optional(),
    limits: objectSchema({
      max_files: numberSchema(),
      max_file_bytes: numberSchema(),
      max_total_bytes: numberSchema(),
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
    async (input, signal, context) =>
      (await import("../../bridge/fetchAttachmentHere.lazy.js")).fetchAttachmentHere(
        input,
        context.callerGone === undefined ? signal : AbortSignal.any([signal, context.callerGone]),
        {
          heldDirectory: openHeldDirectory,
          isPlaceableName: isPlaceableFileName,
          placeUnlessFileStands: linkUnlessFileExists,
          refuseLinkToNetworkPath: assertNoNetworkJunction,
        },
      ),
  ],
  [
    "NoteSavedUploads",
    async (hookArgs) =>
      (await import("../../utils/noteSavedUploadsHere.lazy.js")).noteSavedUploadsHere(
        hookArgs,
        isPlaceableFileName,
      ),
  ],
  [
    "RemoveDeletedUploads",
    async (event) =>
      (await import("../../utils/noteSavedUploadsHere.lazy.js")).removeDeletedUploadsHere(event),
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
  [RUNPLUGINHOOK, runCommandHook],
  [RUNPLUGINHOOKIF, runCommandHook],
  [RUNPLUGINHTTPHOOK, isHTTPConfig_2],
  [LISTPROJECTHOOKS, loadHookSnapshot],
  [RUNPROJECTHOOK, runHook],
  [RUNPROJECTHTTPHOOK, isHTTPConfig],
  [RUNPROJECTMODELHOOK, runPromptHook],
  [RUNPROJECTMCPHOOK, runMcpToolHook],
  [RUNMANAGEDHOOK, serveRunManagedHook],
  [RUNSKILLHOOK, serveRunSkillHook],
  [JUDGEHOOKCONDITION, judgeHookCondition],
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
    async (input, signal, context) =>
      (await import("../../entrypoints/mcpServe/readChromeUploadHere.lazy.js")).readChromeUploadHere(
        input,
        signal,
        context,
      ),
  ],
  [
    "ReadFileReference",
    async (input, signal, context) =>
      (await import("../../entrypoints/mcpServe/readChromeUploadHere.lazy.js")).readChromeUploadHere(
        input,
        signal,
        context,
        true,
      ),
  ],
  [
    "UploadTaskFile",
    async (input, signal, context) => {
      let launchRules = await (
        await import("./uploadRules.js")
      ).uploadRulesForRequest("UploadTaskFile", context);
      return (await import("../taskFiles/taskFileUpload.js")).uploadTaskFile(
        input,
        signal,
        context.session,
        {
          localFileAt: resolveLocalFilePath,
          realDirectory: tryRealpath,
          home: homedir(),
        },
        launchRules,
      );
    },
  ],
  [
    "DeleteTaskFile",
    async (input, signal, context) =>
      (await import("../taskFiles/taskFileUpload.js")).deleteTaskFile(input, context.session),
  ],
  [
    "ReadProjectUploadText",
    async (input, signal, context) => {
      let launchRules = await (
        await import("./uploadRules.js")
      ).uploadRulesForRequest("ReadProjectUploadText", context);
      return (await import("../taskFiles/readProjectUpload.lazy.js")).readProjectUpload(
        input,
        context.session,
        {
          localFileAt: resolveLocalFilePath,
          realDirectory: tryRealpath,
          home: homedir(),
        },
        launchRules,
      );
    },
  ],
  [
    "DownloadTaskFile",
    async (input, signal, context) =>
      (await import("../taskFiles/taskFileUpload.js")).downloadTaskFile(
        input,
        context.callerGone === undefined ? signal : AbortSignal.any([signal, context.callerGone]),
        context.session,
        {
          makeFoldersAsWritten: makeDownloadFolders,
          placeStreamedFile,
        },
      ),
  ],
  [
    HASHFILES,
    async (input, signal, context) => {
      let launchRules = await (await import("./uploadRules.js")).uploadRulesForRequest(HASHFILES, context);
      return (await import("../mcp/fileReference/fileUploads.js")).hashFiles(input, signal, {
        session: context.session,
        paths: {
          localFileAt: resolveLocalFilePath,
          realDirectory: tryRealpath,
          home: homedir(),
        },
        launchRules,
        heldAtLaunch: context.launchPermissionContext !== undefined,
      });
    },
  ],
  [
    PUTFILES,
    async (input, signal, context) => {
      let launchRules = await (await import("./uploadRules.js")).uploadRulesForRequest(PUTFILES, context);
      return (await import("../mcp/fileReference/fileUploads.js")).putFiles(input, signal, {
        session: context.session,
        paths: {
          localFileAt: resolveLocalFilePath,
          realDirectory: tryRealpath,
          home: homedir(),
        },
        launchRules,
        heldAtLaunch: context.launchPermissionContext !== undefined,
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
//@ chunk-xrwmcqkn.js:53223-53377 placement
async function countedUnlessRepeated(event, run) {
  let failureEvent = FILE_CALL_FAILURE_EVENTS.get(event);
  if (failureEvent === undefined) return withFeatureTelemetry("mcp_serve_file_call", run);
  try {
    return await run();
  } catch (error) {
    logFeatureBad("mcp_serve_file_call", failureEvent);
    throw error;
  }
}
//@ chunk-xrwmcqkn.js:53377-53512 placement
async function resolveLocalFilePath(path) {
  let candidatePath = absoluteLocalPathSchema().parse(path);
  await assertNoNetworkJunction(candidatePath);
  let realPath = await realpath(candidatePath);
  if (isUntouchableSpelling(realPath)) throw Error("must be an absolute local path");
  return realPath;
}
//@ chunk-xrwmcqkn.js:53512-53560 placement
/**
 * 解析真实路径，失败返回 undefined。
 */
function tryRealpath(filePath) {
  return realpath(filePath).catch(() => {
    return;
  });
}
//@ chunk-xrwmcqkn.js:53560-54008 placement
async function serveReadFileBytes(input, signal) {
  let { path, offset, length } = readFileBytesInputSchema().parse(input);
  let expectedPath = await resolveLocalFilePath(path);
  let handle = await open(expectedPath, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
  try {
    let stats = await handle.stat();
    if (!stats.isFile()) throw Error("not a regular file");
    await assertFdPath(handle, expectedPath);
    signal.throwIfAborted();
    let max = Math.max(0, Math.min(length, stats.size - offset));
    let { bytesRead, buffer } = await handle.read(Buffer.alloc(max), 0, max, offset);
    return {
      summary: `read ${bytesRead} of ${stats.size} bytes`,
      output: {
        size: stats.size,
        bytes: buffer.subarray(0, bytesRead).toString("base64"),
      },
    };
  } finally {
    await handle.close();
  }
}
//@ chunk-xrwmcqkn.js:54008-55715 placement
async function serveWriteFileBytes(input, signal, { callerGone }) {
  let request = writeFileBytesInputSchema().parse(input);
  let isFirstPart = request.offset === 0;
  let inputPath = posix.dirname(request.path);
  await assertNoNetworkJunction(inputPath);
  if (request.abandon) {
    let realDir = await realLocalPath(inputPath).catch((error) => {
      if (isENOENT(error)) return;
      throw error;
    });
    if (realDir !== undefined)
      await rm(posix.join(realDir, `${STAGE_TMP_PREFIX}${request.write_id}`), {
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
  let buffer = Buffer.from(request.bytes, "base64");
  if (buffer.length !== base64DecodedLength(request.bytes)) throw Error("bytes is not base64");
  if (isFirstPart)
    await mkdir(inputPath, {
      recursive: true,
    });
  await using heldDirectory = await openHeldDirectory(inputPath);
  let joined = posix.join(heldDirectory.path, `${STAGE_TMP_PREFIX}${request.write_id}`);
  let handle = await SAFE_WRITE_FLAGS(joined, isFirstPart);
  let writtenBytes;
  let stagedIdentity;
  try {
    let stats = await handle.stat();
    stagedIdentity = `${stats.dev}:${stats.ino}`;
    if (!stats.isFile() || stats.nlink !== 1) throw Error("the staged file is not a file of this write");
    if (!isFirstPart && request.staged !== stagedIdentity)
      throw Error("the staged file is not the one this write began");
    if (stats.size !== request.offset) throw Error("part does not follow the bytes already written");
    for (let chunkStart = 0; chunkStart < buffer.length;) {
      let { bytesWritten } = await handle.write(
        buffer,
        chunkStart,
        buffer.length - chunkStart,
        request.offset + chunkStart,
      );
      if (bytesWritten === 0) throw Error("the staged file could not take the whole part");
      chunkStart += bytesWritten;
    }
    writtenBytes = stats.size + buffer.length;
    signal.throwIfAborted();
    if (request.last) {
      await handle.chmod(request.mode ?? 420);
      let placeStats = await lstat(joined);
      if (`${placeStats.dev}:${placeStats.ino}` !== stagedIdentity)
        throw Error("the staged file was replaced before it was placed");
    }
  } finally {
    await handle.close();
  }
  if (request.stop_if_caller_gone && callerGone?.aborted) {
    await rm(joined, {
      force: true,
    });
    callerGone.throwIfAborted();
  }
  let placed = false;
  if (request.last) {
    let targetPath = posix.join(heldDirectory.path, posix.basename(request.path));
    try {
      if (request.keep_existing) {
        placed = await linkUnlessFileExists(joined, targetPath);
        await rm(joined, {
          force: true,
        }).catch(() => {});
      } else {
        await retryFsOp(joined, targetPath);
        placed = true;
      }
    } catch (error) {
      await rm(joined, {
        force: true,
      });
      throw error;
    }
  }
  return {
    summary: placed
      ? `placed ${writtenBytes} bytes`
      : request.last
        ? "left the file that was there"
        : `${writtenBytes} bytes written`,
    output: {
      written: writtenBytes,
      placed,
      staged: stagedIdentity,
      ...(request.last &&
        request.keep_existing && {
          kept: !placed,
        }),
    },
  };
}
//@ chunk-xrwmcqkn.js:55715-55881 placement
async function linkUnlessFileExists(stagedPath, targetPath) {
  if (
    await link(stagedPath, targetPath).then(
      () => true,
      () => false,
    )
  )
    return true;
  if (
    (
      await lstat(targetPath).catch((error) => {
        if (isENOENT(error)) return;
        throw error;
      })
    )?.isFile()
  )
    return false;
  await retryFsOp(stagedPath, targetPath);
  return true;
}
//@ chunk-xrwmcqkn.js:55881-56366 placement
/**
 * 逐级创建下载目录（0700，仅 Linux），并确认每级都是本用户拥有的真实目录。
 */
async function makeDownloadFolders(directories) {
  if (process.getuid === undefined)
    throw Error("refusing to create the download folders: this is supported only on Linux");
  let getuid = process.getuid;
  let last = directories.at(-1);
  if (last !== undefined) await assertNoNetworkJunction(last);
  for (let directory of directories) {
    try {
      await mkdir(directory, {
        mode: 448,
      });
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
    let stats = await lstat(directory);
    if (!stats.isDirectory())
      throw Error("one of the folders to write into is a symbolic link or not a directory");
    if (stats.uid !== getuid()) throw Error("one of the folders to write into belongs to another user");
  }
}
//@ chunk-xrwmcqkn.js:56366-56960 placement
/**
 * 把流写入目录下的临时暂存文件，校验未被替换后依次尝试链接到候选文件名，返回放置的路径；最后删除暂存文件。
 */
async function placeStreamedFile(directory, fileNames, source, signal) {
  await assertNoNetworkJunction(directory);
  await using heldDirectory = await openHeldDirectory(directory, {
    asWritten: true,
  });
  let joined = posix.join(heldDirectory.path, `${STAGE_TMP_PREFIX}${randomBytes(8).toString("hex")}`);
  let handle = await SAFE_WRITE_FLAGS(joined, true);
  try {
    let { dev, ino } = await handle.stat();
    await pipeline(source, handle.createWriteStream());
    signal.throwIfAborted();
    let readHandle = await open(joined, NOFOLLOW_NONBLOCK_FLAGS | READ_LIMITS);
    try {
      let stats = await readHandle.stat();
      if (!stats.isFile() || stats.dev !== dev || stats.ino !== ino)
        throw Error("the staged file was replaced before it was placed");
      for (let fileName of fileNames)
        if (
          (await linkIntoHome(joined, readHandle, posix.join(heldDirectory.path, fileName), 384)) !==
          undefined
        )
          return posix.join(directory, fileName);
      return;
    } finally {
      await readHandle.close().catch(() => {});
    }
  } finally {
    await handle.close().catch(() => {});
    await rm(joined, {
      force: true,
    }).catch(() => {});
  }
}
//@ chunk-xrwmcqkn.js:56960-57031 placement
/**
 * 放置文件的输入 schema。
 */
var inflateRawAsync = promisify(inflateRaw);
var placeFilesInputSchema = DoctorLazy(() =>
  objectSchema({
    directory: absoluteLocalPathSchema(),
    archive: objectSchema({
      write_id: writeIdSchema(),
    }),
  }),
);
//@ chunk-xrwmcqkn.js:57031-57247 placement
async function removeStagedArchive(input) {
  let parsed = placeFilesInputSchema().safeParse(input);
  if (!parsed.success) return;
  try {
    await assertNoNetworkJunction(parsed.data.directory);
    await using heldDirectory = await openHeldDirectory(parsed.data.directory);
    await rm(posix.join(heldDirectory.path, `${STAGE_TMP_PREFIX}${parsed.data.archive.write_id}`), {
      force: true,
    });
  } catch {}
}
//@ chunk-xrwmcqkn.js:57247-59104 placement
async function servePlaceFiles(input, signal) {
  let parsed = placeFilesInputSchema_2().safeParse(input);
  if (!parsed.success) {
    await removeStagedArchive(input);
    throw parsed.error;
  }
  let { directory, archive, files, keep_existing: keepExisting } = parsed.data;
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
  await using heldDirectory = await openHeldDirectory(directory).catch(() => {
    throw Error("the directory cannot be opened");
  });
  let joined = posix.join(heldDirectory.path, `${STAGE_TMP_PREFIX}${archive.write_id}`);
  let extractedEntries = [];
  try {
    if (new Set(files.map((file) => file.name)).size !== files.length)
      throw Error("a name is in the list twice");
    if (files.reduce((acc, file) => acc + file.size, 0) > FILE_LIMITS.maxTotalBytes)
      throw Error("the files together are larger than one call places");
    let archiveHandle = await open(joined, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS).catch(() => {
      throw Error("the staged archive is missing, or is not the file this write staged");
    });
    try {
      let stats = await archiveHandle.stat();
      if (!stats.isFile() || stats.nlink !== 1 || `${stats.dev}:${stats.ino}` !== archive.staged)
        throw Error("the staged archive is missing, or is not the file this write staged");
      if (files.some((file) => file.offset + file.length > stats.size))
        throw Error("a file's offset and length reach past the end of the archive");
      for (let file of files) {
        signal.throwIfAborted();
        extractedEntries.push(
          await extractArchiveEntry(archiveHandle, heldDirectory.path, archive.write_id, file),
        );
      }
    } finally {
      await archiveHandle.close();
    }
    signal.throwIfAborted();
    let mapped = files.map(() => false);
    let mapped_2 = files.map(() => false);
    for (let [fileIndex, file] of files.entries()) {
      let extracted = extractedEntries[fileIndex];
      if (extracted === undefined) break;
      let targetPath = posix.join(heldDirectory.path, file.name);
      try {
        let stats = await lstat(extracted.path);
        if (`${stats.dev}:${stats.ino}` !== extracted.identity) break;
        if (keepExisting) {
          mapped[fileIndex] = await linkUnlessFileExists(extracted.path, targetPath);
          mapped_2[fileIndex] = !mapped[fileIndex];
          continue;
        }
        await retryFsOp(extracted.path, targetPath);
      } catch {
        break;
      }
      extractedEntries[fileIndex] = undefined;
      mapped[fileIndex] = true;
    }
    return {
      summary: `placed ${countWhere(mapped, Boolean)} of ${files.length} files${keepExisting ? `, and left ${countWhere(mapped_2, Boolean)} already there` : ""}`,
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
    for (let extractedEntry of extractedEntries)
      if (extractedEntry !== undefined)
        await rm(extractedEntry.path, {
          force: true,
        }).catch(() => {});
  }
}
//@ chunk-xrwmcqkn.js:59104-60063 placement
/**
 * 从归档中按偏移读出一个文件，解压并校验大小与 SHA-256，写入暂存文件并设置权限，返回暂存路径与 dev:ino 身份。
 */
async function extractArchiveEntry(archiveHandle, path, writeId, file) {
  let rawBytes = Buffer.alloc(file.length);
  for (let offset = 0; offset < rawBytes.length;) {
    let { bytesRead } = await archiveHandle.read(
      rawBytes,
      offset,
      rawBytes.length - offset,
      file.offset + offset,
    );
    if (bytesRead === 0) throw Error("a file's offset and length reach past the end of the archive");
    offset += bytesRead;
  }
  let content = await inflateRawAsync(rawBytes, {
    maxOutputLength: file.size + 1,
  }).catch(() => {
    return;
  });
  if (content === undefined) throw Error("a file could not be inflated, or holds more than its stated size");
  if (content.length !== file.size) throw Error("a file does not inflate to its stated size");
  if (computeContentHash(content) !== file.sha256) throw Error("a file does not match its stated SHA-256");
  let joined = posix.join(path, `${STAGE_TMP_PREFIX}${writeId}-${randomBytes(6).toString("hex")}`);
  let handle = await open(
    joined,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | NOFOLLOW_NONBLOCK_FLAGS,
    384,
  ).catch((error) => {
    throw fileErrorMessage(error);
  });
  try {
    for (let offset = 0; offset < content.length;) {
      let { bytesWritten } = await handle.write(content, offset, content.length - offset, offset);
      if (bytesWritten === 0) throw fileErrorMessage(undefined);
      offset += bytesWritten;
    }
    await handle.chmod(file.mode ?? 420);
    let stats = await handle.stat();
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
    await handle.close();
  }
}
//@ chunk-xrwmcqkn.js:60063-60376 placement
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
//@ chunk-xrwmcqkn.js:60376-60479 placement
async function realLocalPath(inputPath) {
  let resolvedPath = await realpath(inputPath);
  if (isUntouchableSpelling(resolvedPath)) throw Error("must be an absolute local path");
  return resolvedPath;
}
//@ chunk-xrwmcqkn.js:60479-60630 placement
async function assertNoNetworkJunction(inputPath) {
  if (
    (await findIntermediateUncJunctionAsync(getFsImplementation(), inputPath, {
      unreadableAncestry: "unverified",
      surfaceNetworkRaw: true,
    })) !== undefined
  )
    throw Error("must be an absolute local path");
}
//@ chunk-xrwmcqkn.js:60630-61000 placement
/**
 * 以 O_DIRECTORY|O_NOFOLLOW 打开目录并核对 /proc/self/fd 路径未变，返回可 await using 的 /proc/self/fd 路径句柄。
 */
async function openHeldDirectory(directory, options = {}) {
  let realDirectory = await realLocalPath(directory);
  options.asWritten;
  if (options.asWritten && realDirectory !== directory)
    throw Error(
      "the directory is not its own real path: a link is at it or above it, or it is not in normal form",
    );
  let handle = await open(realDirectory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    await assertFdPath(handle, realDirectory);
  } catch (error) {
    await handle.close();
    throw error;
  }
  return {
    path: `/proc/self/fd/${handle.fd}`,
    [Symbol.asyncDispose]: () => handle.close(),
  };
}
//@ chunk-xrwmcqkn.js:61000-61137 placement
async function assertFdPath(handle, expectedPath) {
  let actualPath = await readlink(`/proc/self/fd/${handle.fd}`);
  if (actualPath !== expectedPath || isUntouchableSpelling(actualPath))
    throw Error("the path changed while it was being opened");
}
//@ chunk-xrwmcqkn.js:61210-61319 placement
function base64DecodedLength(bytes) {
  if (bytes.length % 4 !== 0) return -1;
  let paddingBytes = bytes.endsWith("==") ? 2 : bytes.endsWith("=") ? 1 : 0;
  return (bytes.length / 4) * 3 - paddingBytes;
}
export { SERVED_CALL_HANDLERS, countedUnlessRepeated };
