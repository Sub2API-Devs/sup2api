/**
 * services/memorySync/memorySkills.ts
 *
 * 记忆库技能加载（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (14)
 * attribution: placement 14
 */
import { readdir, realpath, open } from "fs/promises";
import { join } from "path";
import { constants } from "fs";
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession, getDisableSlashCommands } from "../../bootstrap/state.js";
import { getPlatform as getPlatform_2 } from "../../utils/platform.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { isRestrictedToPluginOnly } from "../../utils/settings/pluginOnlyPolicy.js";
import {
  checkPathInTeamMemDir,
  getTeamMemFilePath,
  resolveRealAutoMemPath,
} from "../../memdir/teamMemPaths.js";
import { isOwnManifest } from "./syncManifest.js";
import { parseTeamMemoryDir } from "./mountRoots.js";
import { logError } from "../../utils/log.js";
import { getMCPSkillBuilders } from "../../skills/mcpSkillBuilders.js";
import { isENOENT, getErrnoCode } from "../../utils/errors.js";
import { isValidRelativeSegments } from "../orgMemory/memoryStores.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { verifyHandleBinding } from "../../utils/claudeInChrome/fileUpload.js";
import { recursivelySanitizeUnicode } from "../../utils/sanitization.js";
import { parseFrontmatter } from "../../utils/frontmatterParser.js";
import { escapeXmlControlChars } from "../../utils/permissions/checkRegistry.js";
import { scrubMemoryKeys } from "./pathScrub.js";
import { emptySkillFrontmatter, escapedSkillFields } from "../../skills/skillSources.js";
import { readAllPages } from "../../utils/pagedRead.js";
import { ok as ok_2, err } from "../../utils/resultError.js";
import { formatStorageError, LEAFMOVED, OTHERNAMES } from "../../utils/storage/storageErrors.js";

//@ chunk-s61vbvea.js:166798-166835 placement
/**
 * 最多加载的技能目录数（100）。
 */
var MEMORIES = "memories::";
var MAX_SKILL_FILE_BYTES = 131072;
var MAX_SKILL_FOLDERS = 100;
//@ chunk-s61vbvea.js:166835-167096 placement
/**
 * 记忆库技能命令集合：replace 替换命令并在名称集合变化时更新稳定快照，changed 信号通知。
 */
class MemorySkillCommands {
  commands = [];
  nameStableSnapshot = this.commands;
  replace(e) {
    let n = new Set(this.commands.map((command) => command.name));
    let r = new Set(e.map((h) => h.name));
    this.commands = e;
    let s = r.size !== n.size || [...r].some((h) => !n.has(h));
    if (s) this.nameStableSnapshot = e;
    return s;
  }
  changed = createSignal();
}
//@ chunk-s61vbvea.js:167096-167121 placement
/**
 * 按宿主保存的记忆库技能命令状态。
 */
var memorySkillCommandsState = new HostScoped(() => new MemorySkillCommands());
//@ chunk-s61vbvea.js:167121-167158 placement
/**
 * 取当前宿主的记忆库技能命令状态。
 */
function getMemorySkillCommands() {
  return memorySkillCommandsState.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:167158-167194 placement
/**
 * 取记忆库技能命令集合。
 */
function memorySkillCommands() {
  return getMemorySkillCommands().commands;
}
//@ chunk-s61vbvea.js:167194-167240 placement
/**
 * 取技能名的稳定快照。
 */
function memorySkillNamesSnapshot() {
  return getMemorySkillCommands().nameStableSnapshot;
}
//@ chunk-s61vbvea.js:167240-167289 placement
/**
 * 订阅技能变化。
 */
function onMemorySkillsChanged(refresh) {
  return getMemorySkillCommands().changed.subscribe(refresh);
}
//@ chunk-s61vbvea.js:167289-169499 placement
/**
 * 从记忆库加载技能（Windows 不支持 O_NOFOLLOW 时跳过）
 */
async function loadMemoryStoreSkills(storeSkillConfigs, n, storageV5) {
  try {
    let filtered = storeSkillConfigs.filter((j) => (j.skillsDirs ?? []).length > 0);
    if (filtered.length === 0) return;
    if (getPlatform_2() === "windows") {
      logForDebugging("memory-skills: store skills are not loaded on Windows (no O_NOFOLLOW)", {
        level: "warn",
      });
      logFeatureSad("memory_store_skills", "windows_unsupported");
      return;
    }
    if (getDisableSlashCommands()) {
      logForDebugging(
        "memory-skills: not loaded with slash commands disabled (no surface reads the registry)",
        {
          level: "warn",
        },
      );
      logFeatureSad("memory_store_skills", "slash_commands_disabled");
      return;
    }
    if (isRestrictedToPluginOnly("skills")) {
      logForDebugging(
        "memory-skills: not loaded under strictPluginOnlyCustomization (memoryStore is not an admin-trusted source)",
        {
          level: "warn",
        },
      );
      logFeatureSad("memory_store_skills", "plugin_only_policy");
      let memorySkillCommands = getMemorySkillCommands();
      if (memorySkillCommands.replace([])) memorySkillCommands.changed.emit();
      return;
    }
    let h = new Map(n.map((j) => [j.mountName, j]));
    let y = [];
    let S = new Set();
    let w = false;
    let R = false;
    let x = (mount, G) => {
      w = true;
      logForDebugging(`memory-skills: skipping ${mount} \u2014 ${G}`, {
        level: "warn",
      });
    };
    for (let j of filtered) {
      if (j.scope !== "team") {
        x(j.mount, "skillsDirs is team-store only");
        continue;
      }
      let G = h.get(j.mount);
      if (!G) {
        x(j.mount, "no sync state for mount");
        continue;
      }
      let L = await checkPathInTeamMemDir(G.mountDir, "team", j.mount);
      if (L === "absent") {
        x(j.mount, "mount dir does not exist");
        continue;
      }
      if (L !== "ok") {
        x(j.mount, "mount dir escapes its canonical location");
        continue;
      }
      if (!(await isOwnManifest(G.mountDir, G.backend.partitionId))) {
        x(j.mount, "mount dir not adopted by this partition");
        continue;
      }
      let Q = storageV5 && parseTeamMemoryDir(G.mountDir);
      for (let Z of j.skillsDirs ?? []) {
        let teamMemFilePath = getTeamMemFilePath(
          {
            scope: "team",
            mount: j.mount,
          },
          Z,
        );
        let parts = Z.split("/");
        let se = await checkPathInTeamMemDir(teamMemFilePath, "team", j.mount, ...parts);
        if (se === "absent") continue;
        if (se !== "ok") {
          x(j.mount, `skills dir ${Z} resolves through a symlink or escapes the mount`);
          continue;
        }
        let realAutoMemPath = await resolveRealAutoMemPath("team", j.mount, ...parts);
        let he = await listMemorySkillFolders(
          realAutoMemPath,
          x,
          j,
          storageV5,
          Q && {
            projectKey: Q.projectKey,
            relPath: [...Q.relPath, ...parts],
          },
        );
        for (let command of he.commands) {
          if (S.has(command.name)) {
            logForDebugging(
              `memory-skills: ${command.name} already registered by an earlier skills dir \u2014 ignoring the copy in ${Z} (${j.mount})`,
            );
            continue;
          }
          S.add(command.name);
          y.push(command);
        }
        R ||= he.truncated;
      }
    }
    let memorySkillCommands = getMemorySkillCommands();
    if (memorySkillCommands.replace(y)) memorySkillCommands.changed.emit();
    if (y.length > 0) logForDebugging(`memory-skills: registered ${y.length} skill(s) under ${MEMORIES}`);
    if (w) logFeatureSad("memory_store_skills", "store_skipped");
    if (R) logFeatureSad("memory_store_skills", "skills_truncated");
    if (!w && !R) logFeatureOk("memory_store_skills");
  } catch (error) {
    logError(error);
    logFeatureBad("memory_store_skills", "register_failed");
  }
}
//@ chunk-s61vbvea.js:169499-172086 placement
async function listMemorySkillFolders(realAutoMemPath, n, r, storage, scope) {
  let { createSkillCommand, parseSkillFrontmatterFields } = getMCPSkillBuilders();
  let w;
  if (storage && scope) {
    let P = await listMemorySkillDirs(storage, scope);
    if (!P.ok) {
      n(r.mount, `listing failed for ${realAutoMemPath} (${P.error})`);
      return {
        commands: [],
        truncated: false,
      };
    }
    w = P.value;
  } else {
    let P;
    try {
      P = await readdir(realAutoMemPath, {
        withFileTypes: true,
      });
    } catch (error) {
      if (!isENOENT(error))
        n(r.mount, `readdir failed for ${realAutoMemPath} (${getErrnoCode(error) ?? "unknown"})`);
      return {
        commands: [],
        truncated: false,
      };
    }
    w = P.filter((j) => j.isDirectory() || j.isSymbolicLink()).map((j) => ({
      name: j.name,
      symlink: j.isSymbolicLink(),
    }));
  }
  w.sort((P, j) => (P.name < j.name ? -1 : 1));
  let truncated = false;
  if (w.length > MAX_SKILL_FOLDERS) {
    logForDebugging(
      `memory-skills: ${realAutoMemPath} has ${w.length} skill folders \u2014 loading only the first ${MAX_SKILL_FOLDERS}`,
      {
        level: "warn",
      },
    );
    truncated = true;
    w = w.slice(0, MAX_SKILL_FOLDERS);
  }
  let x = [];
  for (let P of w) {
    if (P.name.length > 256 || P.symlink || !isValidRelativeSegments(P.name)) {
      n(r.mount, `unsafe or symlinked skill folder in ${realAutoMemPath}`);
      continue;
    }
    let j = join(realAutoMemPath, P.name, "SKILL.md");
    let G;
    if (storage && scope) {
      let memorySkillFile = await readMemorySkillFile(
        storage,
        STORAGE_SPACES.memory(scope.projectKey, [...scope.relPath, P.name, "SKILL.md"]),
      );
      if (memorySkillFile.kind === "absent") continue;
      if (memorySkillFile.kind !== "ok") {
        n(
          r.mount,
          memorySkillFile.kind === "notAtLocation"
            ? `${j} is not at its apparent location`
            : memorySkillFile.kind === "moved"
              ? `${j} is not where its key says (moved during open, or the home path is too long to verify)`
              : memorySkillFile.kind === "otherNames"
                ? `${j} skipped this cycle (a second name on the file, or the backend's own publish in flight) \u2014 retried at the next sync`
                : memorySkillFile.kind === "notPlainSmallFile"
                  ? `${j} is not a plain small file`
                  : `read failed for ${j} (${memorySkillFile.reason})`,
        );
        continue;
      }
      G = memorySkillFile.content;
    } else {
      let re;
      try {
        re = await realpath(j);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR")
          n(r.mount, `realpath failed for ${j} (${errnoCode ?? "unknown"})`);
        continue;
      }
      if (re !== j) {
        n(r.mount, `${j} is not at its apparent location`);
        continue;
      }
      try {
        let he = await open(j, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          let stats = await he.stat();
          if ((await verifyHandleBinding(he, re, stats)) === "moved") {
            n(r.mount, `${j} moved during open`);
            continue;
          }
          if (!stats.isFile() || stats.nlink > 1 || stats.size > MAX_SKILL_FILE_BYTES) {
            n(r.mount, `${j} is not a plain small file`);
            continue;
          }
          G = (
            await he.readFile({
              encoding: "utf8",
            })
          ).toString();
        } finally {
          await he.close();
        }
      } catch (error) {
        if (!isENOENT(error)) n(r.mount, `open failed for ${j} (${getErrnoCode(error) ?? "unknown"})`);
        continue;
      }
    }
    try {
      G = recursivelySanitizeUnicode(G);
    } catch {
      n(r.mount, `${j} failed content sanitization`);
      continue;
    }
    let frontmatter = parseFrontmatter(G, j, {
      normalizeKeys: true,
      untrusted: true,
    });
    let { frontmatter: frontmatter_2, content, parseError } = frontmatter;
    if (parseError !== undefined) {
      n(r.mount, `${j} frontmatter was not read`);
      continue;
    }
    let ee = escapeXmlControlChars(content);
    let ae = `${MEMORIES}${P.name}`;
    let skillFrontmatterFields = parseSkillFrontmatterFields(frontmatter_2, ee, ae);
    x.push(
      createSkillCommand({
        ...skillFrontmatterFields,
        skillName: ae,
        markdownContent: ee,
        source: "memoryStore",
        baseDir: join(realAutoMemPath, P.name),
        loadedFrom: "memoryStore",
        skillFile: scrubMemoryKeys(frontmatter, j),
        ...emptySkillFrontmatter(),
        ...escapedSkillFields(skillFrontmatterFields),
        userInvocable: false,
      }),
    );
  }
  return {
    commands: x.filter((P) => P !== undefined),
    truncated,
  };
}
//@ chunk-s61vbvea.js:172086-172621 placement
/**
 * 列出记忆存储中某路径下的子作用域（技能目录）及是否经符号链接，分页读取完返回结果。
 */
async function listMemorySkillDirs(storage, scope) {
  let children = [];
  let listing = await readAllPages(
    (h) =>
      storage.listEntries(
        {
          namespace: "memory",
          projectKey: scope.projectKey,
          relPath: scope.relPath,
        },
        {
          skipKeyStats: true,
          skipScopeStats: true,
          ...(h !== undefined && {
            cursor: h,
          }),
        },
      ),
    (h) => {
      for (let y of h) {
        if (y.kind !== "scope" || y.scope.namespace !== "memory") continue;
        let last = y.scope.relPath?.at(-1);
        if (last !== undefined && y.scope.relPath?.length === scope.relPath.length + 1)
          children.push({
            name: last,
            symlink: y.viaSymlink === true,
          });
      }
    },
  );
  switch (listing.status) {
    case "done":
      return ok_2(children);
    case "error":
      return err(formatStorageError(listing.error));
    case "capped":
      return err("the listing did not finish");
  }
}
//@ chunk-s61vbvea.js:172621-173086 placement
/**
 * 以加固模式读取记忆存储中的技能文件，把各类存储错误（不在位置、已移动、多个名称、非小文件）映射为结果类型。
 */
async function readMemorySkillFile(e, key) {
  let text = await e.readText(
    [
      {
        key,
        offset: 0,
        length: MAX_SKILL_FILE_BYTES + 1,
      },
    ],
    {
      hardened: true,
    },
  );
  if (!text.ok) {
    let telemetryCode = text.error.code === "Failed" ? text.error.telemetryCode : "";
    return telemetryCode === "ELOOP"
      ? {
          kind: "notAtLocation",
        }
      : telemetryCode === LEAFMOVED
        ? {
            kind: "moved",
          }
        : telemetryCode === OTHERNAMES
          ? {
              kind: "otherNames",
            }
          : telemetryCode === "ENXIO"
            ? {
                kind: "notPlainSmallFile",
              }
            : {
                kind: "failed",
                reason: formatStorageError(text.error),
              };
  }
  let [s] = text.value.items;
  if (!s.found)
    return {
      kind: "absent",
    };
  if (s.totalBytes > MAX_SKILL_FILE_BYTES)
    return {
      kind: "notPlainSmallFile",
    };
  return {
    kind: "ok",
    content: s.value,
  };
}
//@ chunk-s61vbvea.js:173086-173191 placement
class PendingQueue {
  pending = [];
  enqueue(e) {
    this.pending.push(e);
  }
  drain() {
    let pending = this.pending;
    this.pending = [];
    return pending;
  }
}
//@ chunk-s61vbvea.js:173191-173217 placement
/**
 * 按宿主保存的记忆技能加载队列。
 */
var pendingMemorySkillQueue = new HostScoped(() => new PendingQueue());
//@ chunk-s61vbvea.js:173217-173260 placement
/**
 * 把一次技能加载加入队列。
 */
function enqueueMemorySkillLoad(e) {
  pendingMemorySkillQueue.of(getRootSession().host).enqueue(e);
}
export {
  onMemorySkillsChanged,
  memorySkillNamesSnapshot,
  memorySkillCommands,
  pendingMemorySkillQueue,
  loadMemoryStoreSkills,
  enqueueMemorySkillLoad,
};
