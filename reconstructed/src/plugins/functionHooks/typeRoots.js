/**
 * plugins/functionHooks/typeRoots.ts
 *
 * 2.1.316 新增：为 mod 开发生成 TypeScript 类型根目录（index.d.ts、tsconfig）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (45)
 * attribution: placement 43, affinity 1, sole-consumer 1
 */
import { join, dirname, resolve as resolve_2, relative, sep } from "path";
import { lstat, mkdir, rm as rm_2, rmdir, readlink, symlink, realpath, open } from "fs/promises";
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

//@ chunk-e6aww6q8.js:4128174-4128232 placement
/**
 * tsconfig/.gitignore
 */
var TYPE_ROOT_FILES = {
  tsconfig: "tsconfig.json",
  gitignore: ".gitignore",
};
//@ chunk-e6aww6q8.js:4128232-4128254 placement
var CLAUDE_CODE = "claude-code";
//@ chunk-e6aww6q8.js:4128254-4128275 placement
var INDEX_D_TS = "index.d.ts";
//@ chunk-e6aww6q8.js:4128275-4128301 placement
var CLAUDE_CODE_MCP = "claude-code-mcp";
//@ chunk-e6aww6q8.js:4128301-4128329 placement
var CLAUDE_CODE_TOOLS = "claude-code-tools";
//@ chunk-e6aww6q8.js:4128374-4128402 placement
/**
 * 插件 types 目录
 */
var TYPES_DIR = join(dirname(PLUGIN_MANIFEST_PATH_2), "types");
//@ chunk-e6aww6q8.js:4146542-4147168 placement
/**
 * 读取内置工具 schema 与会话 MCP 工具的输入类型（用于生成 .d.ts），读取失败返回空。
 */
async function readToolTypes(replacesMcp) {
  try {
    let allBaseToolsFromRegistry = getAllBaseToolsFromRegistry();
    let builtin = allBaseToolsFromRegistry && builtinToolSchemasOf(allBaseToolsFromRegistry);
    let s = currentSurfaceBinding();
    if (s === undefined)
      return {
        builtin,
        mcp: undefined,
        replacesMcp,
      };
    let h = s.toolContext(new AbortController());
    let toolPermissionContext = getToolPermissionContext(h);
    return {
      builtin,
      mcp: buildMcpToolInputTypes(
        await Promise.all(
          s
            .tools()
            .filter((S) => S.isMcp === true)
            .map(async (S) => ({
              name: S.name,
              inputJSONSchema: S.inputJSONSchema,
              description: await S.description(
                {},
                {
                  isNonInteractiveSession: h.options.isNonInteractiveSession,
                  toolPermissionContext,
                  tools: h.options.tools,
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
//@ chunk-e6aww6q8.js:4147230-4147259 placement
/**
 * 类型根的入口相对路径 ./types/index.d.ts，缺少类型目录时用它拼路径。
 */
var TYPES_ENTRY = "./types/index.d.ts";
//@ chunk-e6aww6q8.js:4147259-4147334 placement = isRealPathWithinTeamDir (1)
var isRealPathWithinTeamDir_2 = (realCandidate) =>
  realCandidate instanceof Error && (realCandidate.cause === "ENOENT" || realCandidate.cause === "ENOTDIR");
//@ chunk-e6aww6q8.js:4147334-4147630 placement
/**
 * 描述类型入口问题（错误原因与解析失败说明）。
 */
function describeTypeEntryProblem(e, n, r) {
  let cause = r instanceof Error ? r.cause : undefined;
  let h = typeof cause === "string" && cause !== "ENOENT";
  let y = getErrnoCode(r) ?? (h ? cause : undefined);
  let S = stripPrefix_2(`${e}: ${n}`, errorMessage(r));
  let included = S.includes("resolves outside the plugin's folder");
  return y !== undefined
    ? `not readable (${y})`
    : included
      ? "resolves outside the plugin's folder"
      : S.replaceAll(n, ".");
}
//@ chunk-e6aww6q8.js:4147630-4147828 placement
function dependentPlugins(e, n) {
  let r = new Map();
  let s = [e];
  for (let h of s) {
    let filtered = n.filter((S) => S.name !== e.name && !r.has(S.name) && findReverseDependents(h, S));
    for (let S of filtered)
      if (!r.has(S.name)) {
        r.set(S.name, S);
        s.push(S);
      }
  }
  return [...r.values()];
}
//@ chunk-e6aww6q8.js:4147828-4147982 placement
function isUsableTypeName(e) {
  let any = [CLAUDE_CODE, CLAUDE_CODE_TOOLS, CLAUDE_CODE_MCP, ...Object.values(TYPE_ROOT_FILES)].some(
    (r) => r.toLowerCase() === e.toLowerCase(),
  );
  return e !== "" && e !== "." && e !== ".." && !any && !PLUGIN_NAME_FORBIDDEN_CHARS_RE.test(e);
}
//@ chunk-e6aww6q8.js:4147982-4148363 placement
/**
 * 收集类型根要引用的依赖插件类型入口（manifest.types 或默认 types/index.d.ts），检查在插件目录内。
 */
async function collectTypeEntries(plugin, loaded) {
  return (
    await Promise.all(
      dependentPlugins(plugin, loaded).map(async (r) => {
        let types = r.manifest.types;
        if (!((types !== undefined || r.isBuiltin !== true) && isUsableTypeName(r.name))) return [];
        let y = types ?? TYPES_ENTRY;
        let S = resolve_2(r.path, y);
        return checkInsidePluginRoot(S, r.path, r.name).then(
          (w) => [
            {
              name: r.name,
              real: w.real,
            },
          ],
          (error) => {
            if (!(types === undefined && isRealPathWithinTeamDir_2(error)))
              logForDebugging(
                `type root of ${plugin.name}: no entry for ${r.name}: ${y}: ${describeTypeEntryProblem(r.name, S, error)}`,
              );
            return [];
          },
        );
      }),
    )
  ).flat();
}
//@ chunk-e6aww6q8.js:4148363-4148568 placement
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
//@ chunk-e6aww6q8.js:4148640-4148869 placement
function typeRootIncludes(plugin) {
  let n = join(plugin.path, "hooks");
  let r = plugin.modulePath === undefined ? undefined : resolve_2(plugin.modulePath);
  let s = r !== undefined && !isWithinDir(n, r);
  return [n, join(plugin.path, "types"), join(plugin.path, "tests"), ...(s ? [r] : [])].map((h) =>
    relative(join(plugin.path, TYPES_DIR), h).split(sep).join("/"),
  );
}
//@ chunk-e6aww6q8.js:4148898-4148978 placement
/**
 * 生成 tsconfig 扩展
 */
var TSCONFIG_EXPORTS = `${jsonStringify(
  {
    extends: [".", ...TYPES_DIR.split(sep), TYPE_ROOT_FILES.tsconfig].join("/"),
  },
  null,
  2,
)}
`;
//@ chunk-e6aww6q8.js:4148978-4149070 placement
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
//@ chunk-e6aww6q8.js:4149070-4149201 placement
async function makeRootTsconfig(e) {
  return (await e.standing("jsconfig.json").then(
    () => true,
    () => false,
  ))
    ? false
    : e.make(TYPE_ROOT_FILES.tsconfig, TSCONFIG_EXPORTS).then(
        () => true,
        () => false,
      );
}
//@ chunk-e6aww6q8.js:4149376-4149457 affinity
var toStatInfo = (e) => ({
  isFile: e.isFile(),
  isFolder: e.isDirectory(),
  bytes: Number(e.size),
});
//@ chunk-e6aww6q8.js:4149656-4150109 sole-consumer
var createFsOps = (e, typeRoot, under) => ({
  typeRoot,
  under,
  standing: async (s) => toStatInfo(await lstat(join(e, s))),
  text: (s) => releaseLock_2(join(e, s)),
  write: (s, h) => writeFileAtomic_2(join(e, s), h),
  make: (s, h) => writeNewFile(join(e, s), h),
  makeFolder: async (s) => {
    await mkdir(join(e, s));
  },
  removeItself: (s) =>
    rm_2(join(e, s), {
      force: true,
    }),
  removeFolder: (s) => rmdir(join(e, s)),
  removeAll: (s) =>
    rm_2(join(e, s), {
      force: true,
      recursive: true,
    }),
  target: (s) => readlink(join(e, s)),
  link: (s, h) => symlink(s, join(e, h)),
  rename: async (s, h) => {
    await retryFsOp(join(e, s), join(e, h));
  },
  close: () => Promise.resolve(),
});
//@ chunk-e6aww6q8.js:4150208-4150251 placement = tryCreateExclusive (0.782)
function tryCreateExclusive_2(lock) {
  if (getErrnoCode(lock) !== "EEXIST") throw lock;
}
//@ chunk-e6aww6q8.js:4150251-4150433 placement
async function makeTypeRootFolder(e) {
  let n = await realpath(e);
  let r = join(n, dirname(TYPES_DIR));
  await mkdir(r).catch(tryCreateExclusive_2);
  if ((await realpath(r)) !== r) return;
  let h = join(n, TYPES_DIR);
  await mkdir(h).catch(tryCreateExclusive_2);
  return (await realpath(h)) === h ? h : undefined;
}
//@ chunk-e6aww6q8.js:4150462-4150494 placement
var joined_2 = TYPES_DIR.split(sep).join("/");
//@ chunk-e6aww6q8.js:4150494-4150642 placement
async function openPathTypeRoot(e, n) {
  let r = await realpath(e);
  logForDebugging(`type root under ${r} laid by path: ${n}`);
  let typeRoot = await makeTypeRootFolder(e);
  if (typeRoot === undefined) return;
  return createFsOps(r, typeRoot, joined_2);
}
//@ chunk-e6aww6q8.js:4150784-4150796 placement
/**
 * 438
 */
var TYPE_ROOT_MODE = 438;
//@ chunk-e6aww6q8.js:4150796-4150829 placement
/**
 * 按 umask 计算目录权限
 */
var typeRootDirMode = () => TYPE_ROOT_MODE & ~process.umask();
//@ chunk-e6aww6q8.js:4150829-4150944 placement
function mapErrnoTo(e, code) {
  return (r) => {
    throw getErrnoCode(r) === e
      ? Object.assign(
          Error("the held folder refused", {
            cause: r,
          }),
          {
            code,
          },
        )
      : r;
  };
}
//@ chunk-e6aww6q8.js:4150944-4151038 placement
/**
 * 写类型根目录
 */
async function writeTypeRoots(e, n, r) {
  await retryTransient(() => e.rename(n, r).catch(mapErrnoTo("WORKING_FILE_HELD", "EBUSY")));
}
//@ chunk-e6aww6q8.js:4151038-4151790 placement
/**
 * 基于目录锚点的文件操作集合：lstat、读、原子写、创建、建目录、删除、链接与重命名。
 */
var createAnchorFsOps = (treeAnchor, typeRoot, under) => ({
  typeRoot,
  under,
  standing: async (s) => toStatInfo(await treeAnchor.lstat(s)),
  text: async (s) => {
    let h = await treeAnchor.open(s, constants.O_RDONLY | constants.O_NONBLOCK);
    try {
      return (await h.readFile()).toString("utf8");
    } finally {
      await h.close();
    }
  },
  write: async (s, h) => {
    let y = `${s}.${randomUUID()}`;
    await treeAnchor.create(y, Buffer.from(h), typeRootDirMode());
    await writeTypeRoots(treeAnchor, y, s).catch(async (error) => {
      await treeAnchor.unlink(y).catch(() => {});
      throw error;
    });
  },
  make: (s, h) =>
    treeAnchor.create(s, Buffer.from(h), typeRootDirMode()).catch(mapErrnoTo("EISDIR", "EEXIST")),
  makeFolder: (s) => treeAnchor.mkdirp(s).catch(mapErrnoTo("WORKING_PARENT_NOT_DIRECTORY", "EEXIST")),
  removeItself: (s) =>
    treeAnchor.unlink(s).catch((error) => {
      if (!isENOENT(error)) throw error;
    }),
  removeFolder: (s) => treeAnchor.rmdir(s),
  removeAll: (s) => treeAnchor.removeTree(s),
  target: (s) => treeAnchor.readlink(s),
  link: (s, h) => treeAnchor.symlink(s, h),
  rename: (s, h) => writeTypeRoots(treeAnchor, s, h),
  close: () => treeAnchor.close(),
});
//@ chunk-e6aww6q8.js:4151790-4152176 placement
/**
 * 打开基于目录锚点的类型根（不可用时返回原因）。
 */
async function openAnchoredTypeRoot(path) {
  let n = await realpath(path);
  let { openTreeAnchor } = await import("./chunk-ejkghqj9.js");
  let treeAnchor = await openTreeAnchor(await lazyDeviceTreeHost(), {
    gitRoot: path,
    realRoot: n,
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
    ? createAnchorFsOps(treeAnchor, join(n, TYPES_DIR), joined_2)
    : undefined;
}
//@ chunk-e6aww6q8.js:4152176-4152217 placement
/**
 * 是否 fchmod 系统调用错误
 */
var isFchmodError = (error) => isSyscallError(error) && error.syscall === "fchmod";
//@ chunk-e6aww6q8.js:4152217-4152232 placement
/**
 * 读取 tsconfig 的字节上限 262144（256 KiB），超过就当没有类型配置。
 */
var MAX_TSCONFIG_BYTES = 262144;
//@ chunk-e6aww6q8.js:4152286-4152536 placement
async function readTsconfigTypes(e) {
  let n = `${e.under}/${TYPE_ROOT_FILES.tsconfig}`;
  let r = await e.standing(n).then(
    (h) => h.isFile && h.bytes <= MAX_TSCONFIG_BYTES,
    () => false,
  );
  let s = isApplicable().safeParse(
    r
      ? await e
          .text(n)
          .then((h) => jsonParse(h))
          .catch(() => {
            return;
          })
      : undefined,
  );
  return s.success ? s.data.compilerOptions.types : [];
}
//@ chunk-e6aww6q8.js:4152644-4152905 placement
/**
 * 不跟随链接地读取类型文件（限大小、必须是常规文件）。
 */
async function readTypeFileCapped(e) {
  let n = await open(e, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
  try {
    let stats = await n.stat();
    if (!(stats.isFile() && stats.size <= MAX_TSCONFIG_BYTES))
      throw Error("is over the size cap, or not a regular file, and was not read");
    return stripBom(
      await n.readFile({
        encoding: "utf8",
      }),
    );
  } finally {
    await n.close();
  }
}
//@ chunk-e6aww6q8.js:4152905-4153157 placement
/**
 * 内容不同时才写文件（目标是目录则先删），返回是否写入。
 */
async function writeIfChanged(e, n, r) {
  let s = await e.standing(n).catch(() => {
    return;
  });
  if (s !== undefined && !s.isFile) await e.removeAll(n);
  if (
    s !== undefined &&
    s.isFile &&
    s.bytes === Buffer.byteLength(r) &&
    (await e.text(n).catch(() => {
      return;
    })) === r
  )
    return false;
  await e.write(n, r);
  return true;
}
//@ chunk-e6aww6q8.js:4153157-4153417 placement
async function linkOrCopyTypeEntry(e, n, real) {
  if (
    (await e.target(n).catch(() => {
      return;
    })) === real
  )
    return "kept";
  let h = `${n}.${randomUUID()}`;
  if (
    await e
      .link(real, h)
      .then(() => e.rename(h, n))
      .then(
        () => true,
        () => false,
      )
  )
    return "linked";
  await e.removeItself(h);
  return (await writeIfChanged(e, n, await readTypeFileCapped(real))) ? "copied" : "kept";
}
//@ chunk-e6aww6q8.js:4153417-4153652 placement
async function ensureTypeFolder(e, n) {
  let r = `${e.under}/${n}`;
  if (
    await e.makeFolder(r).then(
      () => true,
      (error) => {
        if (getErrnoCode(error) === "EEXIST") return false;
        throw error;
      },
    )
  )
    return r;
  let { isFolder } = await e.standing(r);
  if (!isFolder) {
    await e.removeItself(r);
    await e.makeFolder(r);
  }
  return r;
}
//@ chunk-e6aww6q8.js:4153652-4153963 placement
/**
 * 删除类型根中已不需要的条目。
 */
async function removeStaleTypeEntries(e, n) {
  let filtered = (await readTsconfigTypes(e)).filter((s) => isUsableTypeName(s) && !n.includes(s));
  await Promise.all(
    filtered.map(async (s) => {
      let h = `${e.under}/${s}`;
      if (
        !(await e.standing(h).then(
          (S) => S.isFolder,
          () => false,
        ))
      ) {
        await e.removeItself(h);
        return;
      }
      await e.removeItself(`${h}/${INDEX_D_TS}`);
      await e.removeFolder(h).catch(() => {});
    }),
  );
  return filtered;
}
//@ chunk-e6aww6q8.js:4153963-4154204 placement
async function makeIfAbsent(e, n, r) {
  let s = () =>
    e.make(n, r).then(
      () => true,
      (error) => {
        if (getErrnoCode(error) === "EEXIST") return false;
        throw error;
      },
    );
  if (await s()) return true;
  let h = await e.standing(n).catch(() => {
    return;
  });
  if (!(h !== undefined && !h.isFile)) return false;
  await e.removeAll(n);
  return s();
}
//@ chunk-e6aww6q8.js:4154204-4155227 placement
/**
 * 为 mod 开发写出类型根目录（index.d.ts 等），未变时保留原文件。
 */
async function writeTypeRoots_2(e, { plugin, loaded, running: { version, tools } }) {
  if (e === undefined) return;
  try {
    let { tsconfig, gitignore } = TYPE_ROOT_FILES;
    let w = await writeIfChanged(
      e,
      `${e.under}/${gitignore}`,
      `*
`,
    );
    let typeEntries = await collectTypeEntries(plugin, loaded);
    let types = [
      CLAUDE_CODE,
      CLAUDE_CODE_TOOLS,
      CLAUDE_CODE_MCP,
      ...typeEntries.map((typeEntry) => typeEntry.name),
    ];
    let q = await removeStaleTypeEntries(e, types);
    let Z = async (Je) => `${await ensureTypeFolder(e, Je)}/${INDEX_D_TS}`;
    let Se = await import("./chunk-72n15jmc.js");
    let ke = await writeIfChanged(e, await Z(CLAUDE_CODE), Se.coreDeclarationsOf(version));
    let we = async (Je, nt, pt) => (pt ? writeIfChanged : makeIfAbsent)(e, await Z(Je), nt);
    let Ee = await we(
      CLAUDE_CODE_TOOLS,
      BUILTIN_TOOL_INPUTS_HEADER(tools.builtin ?? []),
      tools.builtin !== undefined,
    );
    let Ae = await we(
      CLAUDE_CODE_MCP,
      MCP_TOOL_INPUTS_HEADER(tools.mcp ?? []),
      tools.replacesMcp && (tools.mcp ?? []).length > 0,
    );
    let results = await Promise.all(
      typeEntries.map(
        async (typeEntry) =>
          (await linkOrCopyTypeEntry(e, await Z(typeEntry.name), typeEntry.real)) !== "kept",
      ),
    );
    let Me = await writeIfChanged(
      e,
      `${e.under}/${tsconfig}`,
      TSCONFIG_CONTENT(types, typeRootIncludes(plugin)),
    );
    let rootTsconfig = await makeRootTsconfig(e);
    let joined = TYPES_DIR.split(sep).join("/");
    let lt = (Je) => `${joined}/${Je}/${INDEX_D_TS}`;
    return {
      typeRoot: e.typeRoot,
      entries: types,
      written: [
        ...q.map((Je) => `${joined}/${Je}`),
        ...(ke ? [lt(CLAUDE_CODE)] : []),
        ...(Ee ? [lt(CLAUDE_CODE_TOOLS)] : []),
        ...(Ae ? [lt(CLAUDE_CODE_MCP)] : []),
        ...typeEntries.flatMap((typeEntry, nt) => (results[nt] === true ? [lt(typeEntry.name)] : [])),
        ...(Me ? [`${joined}/${tsconfig}`] : []),
        ...(w ? [`${joined}/${gitignore}`] : []),
        ...(rootTsconfig ? [tsconfig] : []),
      ],
    };
  } finally {
    await e.close();
  }
}
//@ chunk-e6aww6q8.js:4155227-4155448 placement
async function layTypeRoots(e, loaded, running) {
  let s = {
    plugin: e,
    loaded,
    running,
  };
  return writeTypeRoots_2(await openAnchoredTypeRoot(e.path), s).catch(async (error) => {
    if (!isFchmodError(error)) throw error;
    return writeTypeRoots_2(
      await openPathTypeRoot(e.path, "this volume gives a file made in a held folder no mode"),
      s,
    );
  });
}
//@ chunk-e6aww6q8.js:4155448-4156447 placement
/**
 * 为一个开发中的插件写出类型根，记录写了哪些文件或失败原因。
 */
async function writePluginTypeRoot(e, loaded, tools) {
  try {
    let s = await layTypeRoots(e, loaded, {
      version: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      tools,
    });
    if (s === undefined) {
      logForDebugging(`type root of ${e.name} not laid: its path leads outside the mod's folder`);
      return;
    }
    if (s.written.length > 0) logFeatureOk("plugin_function_hooks_type_root");
    logForDebugging(
      `type root of ${e.name} at ${s.typeRoot}: entries ${s.entries.join(", ")}; wrote ` +
        (s.written.join(", ") || "nothing"),
    );
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    let y = errorMessage(error);
    let S = errnoCode === undefined || y.includes(errnoCode);
    logFeatureBad("plugin_function_hooks_type_root", "lay_failed");
    logForDebugging(`type root of ${e.name} not laid: ` + (S ? y : `${errnoCode}: ${y}`));
  }
}
//@ chunk-e6aww6q8.js:4156447-4156522 placement
/**
 * 只留被监视目录下的类型根
 */
function filterWatchedTypeRoots(e) {
  let n = filterWatchedPluginDirs(inlinePlugins());
  return e.filter((r) => folderWatchTargets([r], n).length > 0);
}
//@ chunk-e6aww6q8.js:4156522-4156714 placement
function refreshTypeRootAfterReload(e) {
  let n = (r) => r.name === e;
  return pluginDirQueue(async () => {
    if (!filterWatchedTypeRoots(watchedPluginRecords.get() ?? []).some(n)) return;
    let tools = await readToolTypes(true);
    let h = watchedPluginRecords.get() ?? [];
    await Promise.all(
      filterWatchedTypeRoots(h)
        .filter(n)
        .map((y) => writePluginTypeRoot(y, h, tools)),
    );
  });
}
//@ chunk-e6aww6q8.js:4156714-4157047 placement
/**
 * 创建并注册 plugin-dir 监视器（重载后刷新类型根），注册清理。
 */
function startPluginDirWatcher() {
  let e = runPluginDirWatch({
    watchDir: startPluginWatch,
    filesOf: loadedFilesOf,
    stampOf: readManifestStamp,
    loadedStampOf: bundledFileStamp,
    rereadManifest: retargetPluginModule,
    admit: passesConfigChangeGate,
    reload: (n) => reloadHooksModule(n).finally(() => refreshTypeRootAfterReload(n)),
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
  reloadControllerSlot.set(e);
  registerCleanup(() => e.dispose());
  return e;
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
