/**
 * plugins/functionHooks/typeRoots.ts
 *
 * 2.1.316 新增：为 mod 开发生成 TypeScript 类型根目录（index.d.ts、tsconfig）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (45)
 * attribution: placement 43, affinity 1, sole-consumer 1
 */
import { join, dirname, resolve as resolve_2, relative, sep } from "path";
import { lstat, mkdir, rm, rmdir, readlink, symlink, realpath, open } from "fs/promises";
import { constants } from "fs";
import { randomUUID } from "crypto";
import { PLUGIN_MANIFEST_PATH as PLUGIN_MANIFEST_PATH_2 } from "../../utils/plugins/commandSource.js";
import { getAllBaseToolsFromRegistry } from "../../Tool.js";
import { builtinToolSchemasOf } from "./types/builtinToolSchemas.js";
import { currentSurfaceBinding } from "./surfaceBinding.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  buildMcpToolInputTypes,
  BUILTIN_TOOL_INPUTS_HEADER,
  MCP_TOOL_INPUTS_HEADER,
} from "./types/toolTypesDts.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, getErrnoCode, isENOENT, isSyscallError } from "../../utils/errors.js";
import { stripPrefix as stripPrefix_2, checkInsidePluginRoot } from "./moduleLoader.js";
import { findReverseDependents, loadedFilesOf, reloadHooksModule } from "./hooksModuleLoader.js";
import { PLUGIN_NAME_FORBIDDEN_CHARS_RE } from "../../utils/plugins/schemas.js";
import {
  isWithinDir,
  lazyDeviceTreeHost,
  filterWatchedPluginDirs,
  folderWatchTargets,
  pluginDirQueue,
  watchedPluginRecords,
  runPluginDirWatch,
  startPluginWatch,
  readManifestStamp,
  bundledFileStamp,
  retargetPluginModule,
  passesConfigChangeGate,
  WATCH_CLOCK,
  TURN_STATE_PROBE,
  watchPluginCollection,
  listDirChildren,
  reloadBoundPlugins,
} from "./devModsWatch.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { releaseLock_2 } from "../../utils/autoUpdater.js";
import {
  writeFileAtomic as writeFileAtomic_2,
  writeNewFile,
  retryFsOp,
  retryTransient,
} from "../../utils/atomicPublishWrite.js";
import { isApplicable } from "../../components/messageActions.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../../utils/fsFlags.js";
import { stripBom } from "../../utils/json.js";
import { inlinePlugins, uiLog } from "./hooksWorkerClient.js";
import {
  RELOAD_SETTLE_MS,
  RELOAD_BACKOFF,
  RELOAD_STORM_LIMITS,
  reloadControllerSlot,
} from "./pluginLifecycle.js";
import { modsNoticeFor, presenceForPath } from "./devModsNotices.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4234145-4234203 placement
/**
 * tsconfig/.gitignore
 */
var TYPE_ROOT_FILES = {
  tsconfig: "tsconfig.json",
  gitignore: ".gitignore",
};
//@ chunk-5xgkngpb.js:4234203-4234225 placement
var CLAUDE_CODE = "claude-code";
//@ chunk-5xgkngpb.js:4234225-4234246 placement
var INDEX_D_TS = "index.d.ts";
//@ chunk-5xgkngpb.js:4234246-4234272 placement
var CLAUDE_CODE_MCP = "claude-code-mcp";
//@ chunk-5xgkngpb.js:4234272-4234300 placement
var CLAUDE_CODE_TOOLS = "claude-code-tools";
//@ chunk-5xgkngpb.js:4234345-4234373 placement
/**
 * 插件 types 目录
 */
var TYPES_DIR; // deferred: uses PLUGIN_MANIFEST_DIR (../../utils/plugins/commandSource.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4234345", () => {
  TYPES_DIR = join(dirname(PLUGIN_MANIFEST_PATH_2), "types");
});
//@ chunk-5xgkngpb.js:4252602-4253228 placement
/**
 * 读取内置工具 schema 与会话 MCP 工具的输入类型（用于生成 .d.ts），读取失败返回空。
 */
async function readToolTypes(replacesMcp) {
  try {
    let allBaseToolsFromRegistry = getAllBaseToolsFromRegistry();
    let builtin = allBaseToolsFromRegistry && builtinToolSchemasOf(allBaseToolsFromRegistry);
    let binding = currentSurfaceBinding();
    if (binding === undefined)
      return {
        builtin,
        mcp: undefined,
        replacesMcp,
      };
    let toolContext = binding.toolContext(new AbortController());
    let toolPermissionContext = getToolPermissionContext(toolContext);
    return {
      builtin,
      mcp: buildMcpToolInputTypes(
        await Promise.all(
          binding
            .tools()
            .filter((tool) => tool.isMcp === true)
            .map(async (tool) => ({
              name: tool.name,
              inputJSONSchema: tool.inputJSONSchema,
              description: await tool.description(
                {},
                {
                  isNonInteractiveSession: toolContext.options.isNonInteractiveSession,
                  toolPermissionContext,
                  tools: toolContext.options.tools,
                },
              ),
            })),
        ),
      ),
      replacesMcp,
    };
  } catch (error) {
    logFeatureSad("plugin_function_hooks_type_root", "tools_unread");
    logForDebugging(`tool types: the tools were not read: ${errorMessage(error)}`);
    return {
      builtin: undefined,
      mcp: undefined,
      replacesMcp,
    };
  }
}
//@ chunk-5xgkngpb.js:4253290-4253319 placement
/**
 * 类型根的入口相对路径 ./types/index.d.ts，缺少类型目录时用它拼路径。
 */
var TYPES_ENTRY = "./types/index.d.ts";
//@ chunk-5xgkngpb.js:4253319-4253394 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
var isRealPathWithinTeamDir_2 = (realCandidate) =>
  realCandidate instanceof Error && (realCandidate.cause === "ENOENT" || realCandidate.cause === "ENOTDIR");
//@ chunk-5xgkngpb.js:4253394-4253690 placement
/**
 * 描述类型入口问题（错误原因与解析失败说明）。
 */
function describeTypeEntryProblem(pluginName, path, error) {
  let cause = error instanceof Error ? error.cause : undefined;
  let isStringCause = typeof cause === "string" && cause !== "ENOENT";
  let errnoCode = getErrnoCode(error) ?? (isStringCause ? cause : undefined);
  let message = stripPrefix_2(`${pluginName}: ${path}`, errorMessage(error));
  let included = message.includes("resolves outside the plugin's folder");
  return errnoCode !== undefined
    ? `not readable (${errnoCode})`
    : included
      ? "resolves outside the plugin's folder"
      : message.replaceAll(path, ".");
}
//@ chunk-5xgkngpb.js:4253690-4253888 placement
function dependentPlugins(plugin, loaded) {
  let dependents = new Map();
  let queue = [plugin];
  for (let candidate of queue) {
    let filtered = loaded.filter(
      (other) =>
        other.name !== plugin.name && !dependents.has(other.name) && findReverseDependents(candidate, other),
    );
    for (let dependent of filtered)
      if (!dependents.has(dependent.name)) {
        dependents.set(dependent.name, dependent);
        queue.push(dependent);
      }
  }
  return [...dependents.values()];
}
//@ chunk-5xgkngpb.js:4253888-4254042 placement
function isUsableTypeName(name) {
  let any = [CLAUDE_CODE, CLAUDE_CODE_TOOLS, CLAUDE_CODE_MCP, ...Object.values(TYPE_ROOT_FILES)].some(
    (reserved) => reserved.toLowerCase() === name.toLowerCase(),
  );
  return name !== "" && name !== "." && name !== ".." && !any && !PLUGIN_NAME_FORBIDDEN_CHARS_RE.test(name);
}
//@ chunk-5xgkngpb.js:4254042-4254423 placement
/**
 * 收集类型根要引用的依赖插件类型入口（manifest.types 或默认 types/index.d.ts），检查在插件目录内。
 */
async function collectTypeEntries(plugin, loaded) {
  return (
    await Promise.all(
      dependentPlugins(plugin, loaded).map(async (dependent) => {
        let types = dependent.manifest.types;
        if (!((types !== undefined || dependent.isBuiltin !== true) && isUsableTypeName(dependent.name)))
          return [];
        let typesEntry = types ?? TYPES_ENTRY;
        let resolved = resolve_2(dependent.path, typesEntry);
        return checkInsidePluginRoot(resolved, dependent.path, dependent.name).then(
          (checked) => [
            {
              name: dependent.name,
              real: checked.real,
            },
          ],
          (error) => {
            if (!(types === undefined && isRealPathWithinTeamDir_2(error)))
              logForDebugging(
                `type root of ${plugin.name}: no entry for ${dependent.name}: ${typesEntry}: ${describeTypeEntryProblem(dependent.name, resolved, error)}`,
              );
            return [];
          },
        );
      }),
    )
  ).flat();
}
//@ chunk-5xgkngpb.js:4254423-4254628 placement
/**
 * 类型根 tsconfig 的编译选项（es2023、bundler 解析、strict、jsx h/Fragment 等）。
 */
var TYPE_ROOT_COMPILER_OPTIONS = {
  target: "es2023",
  lib: ["es2023"],
  module: "esnext",
  moduleResolution: "bundler",
  strict: true,
  noUncheckedIndexedAccess: true,
  noEmit: true,
  skipLibCheck: true,
  jsx: "react",
  jsxFactory: "h",
  jsxFragmentFactory: "Fragment",
};
//@ chunk-5xgkngpb.js:4254700-4254929 placement
function typeRootIncludes(plugin) {
  let hooksDir = join(plugin.path, "hooks");
  let modulePath = plugin.modulePath === undefined ? undefined : resolve_2(plugin.modulePath);
  let isModuleOutside = modulePath !== undefined && !isWithinDir(hooksDir, modulePath);
  return [
    hooksDir,
    join(plugin.path, "types"),
    join(plugin.path, "tests"),
    ...(isModuleOutside ? [modulePath] : []),
  ].map((dir) => relative(join(plugin.path, TYPES_DIR), dir).split(sep).join("/"));
}
//@ chunk-5xgkngpb.js:4254958-4255038 placement
/**
 * 生成 tsconfig 扩展
 */
var TSCONFIG_EXPORTS; // deferred: uses jsonStringify (../../utils/slowOperations.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4254958", () => {
  TSCONFIG_EXPORTS = `${jsonStringify(
    {
      extends: [".", ...TYPES_DIR.split(sep), TYPE_ROOT_FILES.tsconfig].join("/"),
    },
    null,
    2,
  )}
`;
});
//@ chunk-5xgkngpb.js:4255038-4255130 placement
/**
 * 生成类型根 tsconfig
 */
var TSCONFIG_CONTENT = (types, include) => `${jsonStringify(
  {
    compilerOptions: {
      ...TYPE_ROOT_COMPILER_OPTIONS,
      typeRoots: ["."],
      types,
    },
    include,
  },
  null,
  2,
)}
`;
//@ chunk-5xgkngpb.js:4255130-4255261 placement
async function makeRootTsconfig(fs) {
  return (await fs.standing("jsconfig.json").then(
    () => true,
    () => false,
  ))
    ? false
    : fs.make(TYPE_ROOT_FILES.tsconfig, TSCONFIG_EXPORTS).then(
        () => true,
        () => false,
      );
}
//@ chunk-5xgkngpb.js:4255436-4255517 affinity
var toStatInfo = (stats) => ({
  isFile: stats.isFile(),
  isFolder: stats.isDirectory(),
  bytes: Number(stats.size),
});
//@ chunk-5xgkngpb.js:4255716-4256169 sole-consumer
var createFsOps = (root, typeRoot, under) => ({
  typeRoot,
  under,
  standing: async (relativePath) => toStatInfo(await lstat(join(root, relativePath))),
  text: (relativePath) => releaseLock_2(join(root, relativePath)),
  write: (relativePath, text) => writeFileAtomic_2(join(root, relativePath), text),
  make: (relativePath, text) => writeNewFile(join(root, relativePath), text),
  makeFolder: async (relativePath) => {
    await mkdir(join(root, relativePath));
  },
  removeItself: (relativePath) =>
    rm(join(root, relativePath), {
      force: true,
    }),
  removeFolder: (relativePath) => rmdir(join(root, relativePath)),
  removeAll: (relativePath) =>
    rm(join(root, relativePath), {
      force: true,
      recursive: true,
    }),
  target: (relativePath) => readlink(join(root, relativePath)),
  link: (from, relativePath) => symlink(from, join(root, relativePath)),
  rename: async (from, to) => {
    await retryFsOp(join(root, from), join(root, to));
  },
  close: () => Promise.resolve(),
});
//@ chunk-5xgkngpb.js:4256268-4256311 placement (2.1.88 match: tryCreateExclusive, 0.781)
function tryCreateExclusive_2(lock) {
  if (getErrnoCode(lock) !== "EEXIST") throw lock;
}
//@ chunk-5xgkngpb.js:4256311-4256493 placement
async function makeTypeRootFolder(path) {
  let realPath = await realpath(path);
  let typesDir = join(realPath, dirname(TYPES_DIR));
  await mkdir(typesDir).catch(tryCreateExclusive_2);
  if ((await realpath(typesDir)) !== typesDir) return;
  let typeRoot = join(realPath, TYPES_DIR);
  await mkdir(typeRoot).catch(tryCreateExclusive_2);
  return (await realpath(typeRoot)) === typeRoot ? typeRoot : undefined;
}
//@ chunk-5xgkngpb.js:4256522-4256554 placement
var joined_2; // deferred: uses TYPES_DIR of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4256522", () => {
  joined_2 = TYPES_DIR.split(sep).join("/");
});
//@ chunk-5xgkngpb.js:4256554-4256702 placement
async function openPathTypeRoot(path, reason) {
  let realPath = await realpath(path);
  logForDebugging(`type root under ${realPath} laid by path: ${reason}`);
  let typeRoot = await makeTypeRootFolder(path);
  if (typeRoot === undefined) return;
  return createFsOps(realPath, typeRoot, joined_2);
}
//@ chunk-5xgkngpb.js:4256844-4256856 placement
/**
 * 438
 */
var TYPE_ROOT_MODE = 438;
//@ chunk-5xgkngpb.js:4256856-4256889 placement
/**
 * 按 umask 计算目录权限
 */
var typeRootDirMode = () => TYPE_ROOT_MODE & ~process.umask();
//@ chunk-5xgkngpb.js:4256889-4257004 placement
function mapErrnoTo(errno, code) {
  return (error) => {
    throw getErrnoCode(error) === errno
      ? Object.assign(
          Error("the held folder refused", {
            cause: error,
          }),
          {
            code,
          },
        )
      : error;
  };
}
//@ chunk-5xgkngpb.js:4257004-4257098 placement
/**
 * 写类型根目录
 */
async function writeTypeRoots(fs, from, to) {
  await retryTransient(() => fs.rename(from, to).catch(mapErrnoTo("WORKING_FILE_HELD", "EBUSY")));
}
//@ chunk-5xgkngpb.js:4257098-4257850 placement
/**
 * 基于目录锚点的文件操作集合：lstat、读、原子写、创建、建目录、删除、链接与重命名。
 */
var createAnchorFsOps = (treeAnchor, typeRoot, under) => ({
  typeRoot,
  under,
  standing: async (relativePath) => toStatInfo(await treeAnchor.lstat(relativePath)),
  text: async (relativePath) => {
    let handle = await treeAnchor.open(relativePath, constants.O_RDONLY | constants.O_NONBLOCK);
    try {
      return (await handle.readFile()).toString("utf8");
    } finally {
      await handle.close();
    }
  },
  write: async (relativePath, text) => {
    let tempPath = `${relativePath}.${randomUUID()}`;
    await treeAnchor.create(tempPath, Buffer.from(text), typeRootDirMode());
    await writeTypeRoots(treeAnchor, tempPath, relativePath).catch(async (error) => {
      await treeAnchor.unlink(tempPath).catch(() => {});
      throw error;
    });
  },
  make: (relativePath, text) =>
    treeAnchor
      .create(relativePath, Buffer.from(text), typeRootDirMode())
      .catch(mapErrnoTo("EISDIR", "EEXIST")),
  makeFolder: (relativePath) =>
    treeAnchor.mkdirp(relativePath).catch(mapErrnoTo("WORKING_PARENT_NOT_DIRECTORY", "EEXIST")),
  removeItself: (relativePath) =>
    treeAnchor.unlink(relativePath).catch((error) => {
      if (!isENOENT(error)) throw error;
    }),
  removeFolder: (relativePath) => treeAnchor.rmdir(relativePath),
  removeAll: (relativePath) => treeAnchor.removeTree(relativePath),
  target: (relativePath) => treeAnchor.readlink(relativePath),
  link: (from, relativePath) => treeAnchor.symlink(from, relativePath),
  rename: (from, to) => writeTypeRoots(treeAnchor, from, to),
  close: () => treeAnchor.close(),
});
//@ chunk-5xgkngpb.js:4257850-4258236 placement
/**
 * 打开基于目录锚点的类型根（不可用时返回原因）。
 */
async function openAnchoredTypeRoot(path) {
  let realPath = await realpath(path);
  let { openTreeAnchor } = await import("../../utils/fsAnchor/treeAnchor.js");
  let treeAnchor = await openTreeAnchor(await lazyDeviceTreeHost(), {
    gitRoot: path,
    realRoot: realPath,
  });
  if ("unavailable" in treeAnchor)
    return openPathTypeRoot(path, `this machine holds no folder open (${treeAnchor.unavailable})`);
  return (await treeAnchor.mkdirp(joined_2).then(
    () => true,
    async (error) => {
      await treeAnchor.close();
      if (getErrnoCode(error) === "WORKING_PARENT_NOT_DIRECTORY") return false;
      throw error;
    },
  ))
    ? createAnchorFsOps(treeAnchor, join(realPath, TYPES_DIR), joined_2)
    : undefined;
}
//@ chunk-5xgkngpb.js:4258236-4258277 placement
/**
 * 是否 fchmod 系统调用错误
 */
var isFchmodError = (error) => isSyscallError(error) && error.syscall === "fchmod";
//@ chunk-5xgkngpb.js:4258277-4258292 placement
/**
 * 读取 tsconfig 的字节上限 262144（256 KiB），超过就当没有类型配置。
 */
var MAX_TSCONFIG_BYTES = 262144;
//@ chunk-5xgkngpb.js:4258346-4258596 placement
async function readTsconfigTypes(fs) {
  let tsconfigPath = `${fs.under}/${TYPE_ROOT_FILES.tsconfig}`;
  let isReadable = await fs.standing(tsconfigPath).then(
    (stat) => stat.isFile && stat.bytes <= MAX_TSCONFIG_BYTES,
    () => false,
  );
  let parsed = isApplicable().safeParse(
    isReadable
      ? await fs
          .text(tsconfigPath)
          .then((text) => jsonParse(text))
          .catch(() => {
            return;
          })
      : undefined,
  );
  return parsed.success ? parsed.data.compilerOptions.types : [];
}
//@ chunk-5xgkngpb.js:4258704-4258965 placement
/**
 * 不跟随链接地读取类型文件（限大小、必须是常规文件）。
 */
async function readTypeFileCapped(path) {
  let handle = await open(path, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
  try {
    let stats = await handle.stat();
    if (!(stats.isFile() && stats.size <= MAX_TSCONFIG_BYTES))
      throw Error("is over the size cap, or not a regular file, and was not read");
    return stripBom(
      await handle.readFile({
        encoding: "utf8",
      }),
    );
  } finally {
    await handle.close();
  }
}
//@ chunk-5xgkngpb.js:4258965-4259217 placement
/**
 * 内容不同时才写文件（目标是目录则先删），返回是否写入。
 */
async function writeIfChanged(fs, relativePath, text) {
  let existing = await fs.standing(relativePath).catch(() => {
    return;
  });
  if (existing !== undefined && !existing.isFile) await fs.removeAll(relativePath);
  if (
    existing !== undefined &&
    existing.isFile &&
    existing.bytes === Buffer.byteLength(text) &&
    (await fs.text(relativePath).catch(() => {
      return;
    })) === text
  )
    return false;
  await fs.write(relativePath, text);
  return true;
}
//@ chunk-5xgkngpb.js:4259217-4259477 placement
async function linkOrCopyTypeEntry(fs, relativePath, path) {
  if (
    (await fs.target(relativePath).catch(() => {
      return;
    })) === path
  )
    return "kept";
  let tempPath = `${relativePath}.${randomUUID()}`;
  if (
    await fs
      .link(path, tempPath)
      .then(() => fs.rename(tempPath, relativePath))
      .then(
        () => true,
        () => false,
      )
  )
    return "linked";
  await fs.removeItself(tempPath);
  return (await writeIfChanged(fs, relativePath, await readTypeFileCapped(path))) ? "copied" : "kept";
}
//@ chunk-5xgkngpb.js:4259477-4259712 placement
async function ensureTypeFolder(fs, name) {
  let folderPath = `${fs.under}/${name}`;
  if (
    await fs.makeFolder(folderPath).then(
      () => true,
      (error) => {
        if (getErrnoCode(error) === "EEXIST") return false;
        throw error;
      },
    )
  )
    return folderPath;
  let { isFolder } = await fs.standing(folderPath);
  if (!isFolder) {
    await fs.removeItself(folderPath);
    await fs.makeFolder(folderPath);
  }
  return folderPath;
}
//@ chunk-5xgkngpb.js:4259712-4260023 placement
/**
 * 删除类型根中已不需要的条目。
 */
async function removeStaleTypeEntries(fs, keep) {
  let filtered = (await readTsconfigTypes(fs)).filter(
    (name) => isUsableTypeName(name) && !keep.includes(name),
  );
  await Promise.all(
    filtered.map(async (name) => {
      let entryPath = `${fs.under}/${name}`;
      if (
        !(await fs.standing(entryPath).then(
          (stat) => stat.isFolder,
          () => false,
        ))
      ) {
        await fs.removeItself(entryPath);
        return;
      }
      await fs.removeItself(`${entryPath}/${INDEX_D_TS}`);
      await fs.removeFolder(entryPath).catch(() => {});
    }),
  );
  return filtered;
}
//@ chunk-5xgkngpb.js:4260023-4260264 placement
async function makeIfAbsent(fs, relativePath, text) {
  let writeOnce = () =>
    fs.make(relativePath, text).then(
      () => true,
      (error) => {
        if (getErrnoCode(error) === "EEXIST") return false;
        throw error;
      },
    );
  if (await writeOnce()) return true;
  let existing = await fs.standing(relativePath).catch(() => {
    return;
  });
  if (!(existing !== undefined && !existing.isFile)) return false;
  await fs.removeAll(relativePath);
  return writeOnce();
}
//@ chunk-5xgkngpb.js:4260264-4261291 placement
/**
 * 为 mod 开发写出类型根目录（index.d.ts 等），未变时保留原文件。
 */
async function writeTypeRoots_2(fs, { plugin, loaded, running: { version, tools } }) {
  if (fs === undefined) return;
  try {
    let { tsconfig, gitignore } = TYPE_ROOT_FILES;
    let gitignoreWritten = await writeIfChanged(
      fs,
      `${fs.under}/${gitignore}`,
      `*
`,
    );
    let typeEntries = await collectTypeEntries(plugin, loaded);
    let typeRootEntries = [
      CLAUDE_CODE,
      CLAUDE_CODE_TOOLS,
      CLAUDE_CODE_MCP,
      ...typeEntries.map((typeEntry) => typeEntry.name),
    ];
    let removed = await removeStaleTypeEntries(fs, typeRootEntries);
    let indexPathOf = async (name) => `${await ensureTypeFolder(fs, name)}/${INDEX_D_TS}`;
    let declarations = await import("../hooksModules/PLUGIN_DECLARATIONS_TEXT.lazy.js");
    let coreWritten = await writeIfChanged(
      fs,
      await indexPathOf(CLAUDE_CODE),
      declarations.coreDeclarationsOf(version),
    );
    let writeToolTypes = async (name, text, overwrite) =>
      (overwrite ? writeIfChanged : makeIfAbsent)(fs, await indexPathOf(name), text);
    let builtinWritten = await writeToolTypes(
      CLAUDE_CODE_TOOLS,
      BUILTIN_TOOL_INPUTS_HEADER(tools.builtin ?? []),
      tools.builtin !== undefined,
    );
    let mcpWritten = await writeToolTypes(
      CLAUDE_CODE_MCP,
      MCP_TOOL_INPUTS_HEADER(tools.mcp ?? []),
      tools.replacesMcp && (tools.mcp ?? []).length > 0,
    );
    let results = await Promise.all(
      typeEntries.map(
        async (typeEntry) =>
          (await linkOrCopyTypeEntry(fs, await indexPathOf(typeEntry.name), typeEntry.real)) !== "kept",
      ),
    );
    let tsconfigWritten = await writeIfChanged(
      fs,
      `${fs.under}/${tsconfig}`,
      TSCONFIG_CONTENT(typeRootEntries, typeRootIncludes(plugin)),
    );
    let rootTsconfig = await makeRootTsconfig(fs);
    let joined = TYPES_DIR.split(sep).join("/");
    let writtenPathOf = (name) => `${joined}/${name}/${INDEX_D_TS}`;
    return {
      typeRoot: fs.typeRoot,
      entries: typeRootEntries,
      written: [
        ...removed.map((name) => `${joined}/${name}`),
        ...(coreWritten ? [writtenPathOf(CLAUDE_CODE)] : []),
        ...(builtinWritten ? [writtenPathOf(CLAUDE_CODE_TOOLS)] : []),
        ...(mcpWritten ? [writtenPathOf(CLAUDE_CODE_MCP)] : []),
        ...typeEntries.flatMap((typeEntry, index) =>
          results[index] === true ? [writtenPathOf(typeEntry.name)] : [],
        ),
        ...(tsconfigWritten ? [`${joined}/${tsconfig}`] : []),
        ...(gitignoreWritten ? [`${joined}/${gitignore}`] : []),
        ...(rootTsconfig ? [tsconfig] : []),
      ],
    };
  } finally {
    await fs.close();
  }
}
//@ chunk-5xgkngpb.js:4261291-4261512 placement
async function layTypeRoots(loaded, loaded_2, running) {
  let rootArgs = {
    plugin: loaded,
    loaded: loaded_2,
    running,
  };
  return writeTypeRoots_2(await openAnchoredTypeRoot(loaded.path), rootArgs).catch(async (error) => {
    if (!isFchmodError(error)) throw error;
    return writeTypeRoots_2(
      await openPathTypeRoot(loaded.path, "this volume gives a file made in a held folder no mode"),
      rootArgs,
    );
  });
}
//@ chunk-5xgkngpb.js:4261512-4262511 placement
/**
 * 为一个开发中的插件写出类型根，记录写了哪些文件或失败原因。
 */
async function writePluginTypeRoot(loaded, loaded_2, tools) {
  try {
    let written = await layTypeRoots(loaded, loaded_2, {
      version: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      tools,
    });
    if (written === undefined) {
      logForDebugging(`type root of ${loaded.name} not laid: its path leads outside the mod's folder`);
      return;
    }
    if (written.written.length > 0) logFeatureOk("plugin_function_hooks_type_root");
    logForDebugging(
      `type root of ${loaded.name} at ${written.typeRoot}: entries ${written.entries.join(", ")}; wrote ` +
        (written.written.join(", ") || "nothing"),
    );
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    let message = errorMessage(error);
    let hasCode = errnoCode === undefined || message.includes(errnoCode);
    logFeatureBad("plugin_function_hooks_type_root", "lay_failed");
    logForDebugging(
      `type root of ${loaded.name} not laid: ` + (hasCode ? message : `${errnoCode}: ${message}`),
    );
  }
}
//@ chunk-5xgkngpb.js:4262511-4262586 placement
/**
 * 只留被监视目录下的类型根
 */
function filterWatchedTypeRoots(plugins) {
  let watchedDirs = filterWatchedPluginDirs(inlinePlugins());
  return plugins.filter((plugin) => folderWatchTargets([plugin], watchedDirs).length > 0);
}
//@ chunk-5xgkngpb.js:4262586-4262778 placement
function refreshTypeRootAfterReload(pluginName) {
  let isPlugin = (plugin) => plugin.name === pluginName;
  return pluginDirQueue(async () => {
    if (!filterWatchedTypeRoots(watchedPluginRecords.get() ?? []).some(isPlugin)) return;
    let tools = await readToolTypes(true);
    let plugins = watchedPluginRecords.get() ?? [];
    await Promise.all(
      filterWatchedTypeRoots(plugins)
        .filter(isPlugin)
        .map((plugin) => writePluginTypeRoot(plugin, plugins, tools)),
    );
  });
}
//@ chunk-5xgkngpb.js:4262778-4263111 placement
/**
 * 创建并注册 plugin-dir 监视器（重载后刷新类型根），注册清理。
 */
function startPluginDirWatcher() {
  let watcher = runPluginDirWatch({
    watchDir: startPluginWatch,
    filesOf: loadedFilesOf,
    stampOf: readManifestStamp,
    loadedStampOf: bundledFileStamp,
    rereadManifest: retargetPluginModule,
    admit: passesConfigChangeGate,
    reload: (pluginName) =>
      reloadHooksModule(pluginName).finally(() => refreshTypeRootAfterReload(pluginName)),
    tell: uiLog,
    debounceMs: RELOAD_SETTLE_MS,
    burst: RELOAD_BACKOFF,
    storm: RELOAD_STORM_LIMITS,
    clock: WATCH_CLOCK,
    turn: TURN_STATE_PROBE,
    watchRoot: watchPluginCollection,
    listChildren: listDirChildren,
    reloadPlugins: reloadBoundPlugins,
    plainLine: modsNoticeFor,
    plainWording: presenceForPath,
  });
  reloadControllerSlot.set(watcher);
  registerCleanup(() => watcher.dispose());
  return watcher;
}
export {
  TYPES_ENTRY,
  describeTypeEntryProblem,
  isRealPathWithinTeamDir_2,
  MAX_TSCONFIG_BYTES,
  readTypeFileCapped,
  TYPES_DIR,
  startPluginDirWatcher,
  filterWatchedTypeRoots,
  readToolTypes,
  writePluginTypeRoot,
};
