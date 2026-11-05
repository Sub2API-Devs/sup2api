/**
 * services/memorySync/memorySkills.ts
 *
 * 记忆库技能加载（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (14)
 * attribution: placement 14
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:170009-170046 placement
/**
 * 最多加载的技能目录数（100）。
 */
var MEMORIES = "memories::";
var MAX_SKILL_FILE_BYTES = 131072;
var MAX_SKILL_FOLDERS = 100;
//@ chunk-7jxyna5q.js:170046-170307 placement
/**
 * 记忆库技能命令集合：replace 替换命令并在名称集合变化时更新稳定快照，changed 信号通知。
 */
class MemorySkillCommands {
  commands = [];
  nameStableSnapshot = this.commands;
  replace(commands) {
    let previousNames = new Set(this.commands.map((command) => command.name));
    let nextNames = new Set(commands.map((command) => command.name));
    this.commands = commands;
    let namesChanged =
      nextNames.size !== previousNames.size || [...nextNames].some((name) => !previousNames.has(name));
    if (namesChanged) this.nameStableSnapshot = commands;
    return namesChanged;
  }
  changed = createSignal();
}
//@ chunk-7jxyna5q.js:170307-170332 placement
/**
 * 按宿主保存的记忆库技能命令状态。
 */
var memorySkillCommandsState; // deferred: uses MemorySkillCommands of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:170307", () => {
  memorySkillCommandsState = new HostScoped(() => new MemorySkillCommands());
});
//@ chunk-7jxyna5q.js:170332-170369 placement
/**
 * 取当前宿主的记忆库技能命令状态。
 */
function getMemorySkillCommands() {
  return memorySkillCommandsState.of(getRootSession().host);
}
//@ chunk-7jxyna5q.js:170369-170405 placement
/**
 * 取记忆库技能命令集合。
 */
function memorySkillCommands() {
  return getMemorySkillCommands().commands;
}
//@ chunk-7jxyna5q.js:170405-170451 placement
/**
 * 取技能名的稳定快照。
 */
function memorySkillNamesSnapshot() {
  return getMemorySkillCommands().nameStableSnapshot;
}
//@ chunk-7jxyna5q.js:170451-170500 placement
/**
 * 订阅技能变化。
 */
function onMemorySkillsChanged(refresh) {
  return getMemorySkillCommands().changed.subscribe(refresh);
}
//@ chunk-7jxyna5q.js:170500-172715 placement
/**
 * 从记忆库加载技能（Windows 不支持 O_NOFOLLOW 时跳过）
 */
async function loadMemoryStoreSkills(storeSkillConfigs, syncStates, storageV5) {
  try {
    let filtered = storeSkillConfigs.filter((config) => (config.skillsDirs ?? []).length > 0);
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
    let stateByMount = new Map(syncStates.map((state) => [state.mountName, state]));
    let commands = [];
    let seenNames = new Set();
    let skipped = false;
    let truncated = false;
    let skip = (mount, reason) => {
      skipped = true;
      logForDebugging(`memory-skills: skipping ${mount} \u2014 ${reason}`, {
        level: "warn",
      });
    };
    for (let config of filtered) {
      if (config.scope !== "team") {
        skip(config.mount, "skillsDirs is team-store only");
        continue;
      }
      let state = stateByMount.get(config.mount);
      if (!state) {
        skip(config.mount, "no sync state for mount");
        continue;
      }
      let dirCheck = await checkPathInTeamMemDir(state.mountDir, "team", config.mount);
      if (dirCheck === "absent") {
        skip(config.mount, "mount dir does not exist");
        continue;
      }
      if (dirCheck !== "ok") {
        skip(config.mount, "mount dir escapes its canonical location");
        continue;
      }
      if (!(await isOwnManifest(state.mountDir, state.backend.partitionId))) {
        skip(config.mount, "mount dir not adopted by this partition");
        continue;
      }
      let teamDir = storageV5 && parseTeamMemoryDir(state.mountDir);
      for (let skillsDir of config.skillsDirs ?? []) {
        let teamMemFilePath = getTeamMemFilePath(
          {
            scope: "team",
            mount: config.mount,
          },
          skillsDir,
        );
        let parts = skillsDir.split("/");
        let dirCheck = await checkPathInTeamMemDir(teamMemFilePath, "team", config.mount, ...parts);
        if (dirCheck === "absent") continue;
        if (dirCheck !== "ok") {
          skip(config.mount, `skills dir ${skillsDir} resolves through a symlink or escapes the mount`);
          continue;
        }
        let realAutoMemPath = await resolveRealAutoMemPath("team", config.mount, ...parts);
        let listed = await listMemorySkillFolders(
          realAutoMemPath,
          skip,
          config,
          storageV5,
          teamDir && {
            projectKey: teamDir.projectKey,
            relPath: [...teamDir.relPath, ...parts],
          },
        );
        for (let command of listed.commands) {
          if (seenNames.has(command.name)) {
            logForDebugging(
              `memory-skills: ${command.name} already registered by an earlier skills dir \u2014 ignoring the copy in ${skillsDir} (${config.mount})`,
            );
            continue;
          }
          seenNames.add(command.name);
          commands.push(command);
        }
        truncated ||= listed.truncated;
      }
    }
    let memorySkillCommands = getMemorySkillCommands();
    if (memorySkillCommands.replace(commands)) memorySkillCommands.changed.emit();
    if (commands.length > 0)
      logForDebugging(`memory-skills: registered ${commands.length} skill(s) under ${MEMORIES}`);
    if (skipped) logFeatureSad("memory_store_skills", "store_skipped");
    if (truncated) logFeatureSad("memory_store_skills", "skills_truncated");
    if (!skipped && !truncated) logFeatureOk("memory_store_skills");
  } catch (error) {
    logError(error);
    logFeatureBad("memory_store_skills", "register_failed");
  }
}
//@ chunk-7jxyna5q.js:172715-175304 placement
async function listMemorySkillFolders(realAutoMemPath, reportSkip, config, storage, scope) {
  let { createSkillCommand, parseSkillFrontmatterFields } = getMCPSkillBuilders();
  let folders;
  if (storage && scope) {
    let dirListing = await listMemorySkillDirs(storage, scope);
    if (!dirListing.ok) {
      reportSkip(config.mount, `listing failed for ${realAutoMemPath} (${dirListing.error})`);
      return {
        commands: [],
        truncated: false,
      };
    }
    folders = dirListing.value;
  } else {
    let entries;
    try {
      entries = await readdir(realAutoMemPath, {
        withFileTypes: true,
      });
    } catch (error) {
      if (!isENOENT(error))
        reportSkip(
          config.mount,
          `readdir failed for ${realAutoMemPath} (${getErrnoCode(error) ?? "unknown"})`,
        );
      return {
        commands: [],
        truncated: false,
      };
    }
    folders = entries
      .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .map((entry) => ({
        name: entry.name,
        symlink: entry.isSymbolicLink(),
      }));
  }
  folders.sort((left, right) => (left.name < right.name ? -1 : 1));
  let truncated = false;
  if (folders.length > MAX_SKILL_FOLDERS) {
    logForDebugging(
      `memory-skills: ${realAutoMemPath} has ${folders.length} skill folders \u2014 loading only the first ${MAX_SKILL_FOLDERS}`,
      {
        level: "warn",
      },
    );
    truncated = true;
    folders = folders.slice(0, MAX_SKILL_FOLDERS);
  }
  let commands = [];
  for (let folder of folders) {
    if (folder.name.length > 256 || folder.symlink || !isValidRelativeSegments(folder.name)) {
      reportSkip(config.mount, `unsafe or symlinked skill folder in ${realAutoMemPath}`);
      continue;
    }
    let skillFile = join(realAutoMemPath, folder.name, "SKILL.md");
    let text;
    if (storage && scope) {
      let memorySkillFile = await readMemorySkillFile(
        storage,
        STORAGE_SPACES.memory(scope.projectKey, [...scope.relPath, folder.name, "SKILL.md"]),
      );
      if (memorySkillFile.kind === "absent") continue;
      if (memorySkillFile.kind !== "ok") {
        reportSkip(
          config.mount,
          memorySkillFile.kind === "notAtLocation"
            ? `${skillFile} is not at its apparent location`
            : memorySkillFile.kind === "moved"
              ? `${skillFile} is not where its key says (moved during open, or the home path is too long to verify)`
              : memorySkillFile.kind === "otherNames"
                ? `${skillFile} skipped this cycle (a second name on the file, or the backend's own publish in flight) \u2014 retried at the next sync`
                : memorySkillFile.kind === "notPlainSmallFile"
                  ? `${skillFile} is not a plain small file`
                  : `read failed for ${skillFile} (${memorySkillFile.reason})`,
        );
        continue;
      }
      text = memorySkillFile.content;
    } else {
      let realFile;
      try {
        realFile = await realpath(skillFile);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR")
          reportSkip(config.mount, `realpath failed for ${skillFile} (${errnoCode ?? "unknown"})`);
        continue;
      }
      if (realFile !== skillFile) {
        reportSkip(config.mount, `${skillFile} is not at its apparent location`);
        continue;
      }
      try {
        let handle = await open(skillFile, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          let stats = await handle.stat();
          if ((await verifyHandleBinding(handle, realFile, stats)) === "moved") {
            reportSkip(config.mount, `${skillFile} moved during open`);
            continue;
          }
          if (!stats.isFile() || stats.nlink > 1 || stats.size > MAX_SKILL_FILE_BYTES) {
            reportSkip(config.mount, `${skillFile} is not a plain small file`);
            continue;
          }
          text = (
            await handle.readFile({
              encoding: "utf8",
            })
          ).toString();
        } finally {
          await handle.close();
        }
      } catch (error) {
        if (!isENOENT(error))
          reportSkip(config.mount, `open failed for ${skillFile} (${getErrnoCode(error) ?? "unknown"})`);
        continue;
      }
    }
    try {
      text = recursivelySanitizeUnicode(text);
    } catch {
      reportSkip(config.mount, `${skillFile} failed content sanitization`);
      continue;
    }
    let frontmatter = parseFrontmatter(text, skillFile, {
      normalizeKeys: true,
      untrusted: true,
    });
    let { frontmatter: frontmatter_2, content, parseError } = frontmatter;
    if (parseError !== undefined) {
      reportSkip(config.mount, `${skillFile} frontmatter was not read`);
      continue;
    }
    let body = escapeXmlControlChars(content);
    let skillName = `${MEMORIES}${folder.name}`;
    let command = parseSkillFrontmatterFields(frontmatter_2, body, skillName);
    commands.push(
      createSkillCommand({
        ...command,
        skillName,
        markdownContent: body,
        source: "memoryStore",
        baseDir: join(realAutoMemPath, folder.name),
        loadedFrom: "memoryStore",
        skillFile: scrubMemoryKeys(frontmatter, skillFile),
        ...emptySkillFrontmatter(),
        ...escapedSkillFields(command),
        userInvocable: false,
      }),
    );
  }
  return {
    commands: commands.filter((command) => command !== undefined),
    truncated,
  };
}
//@ chunk-7jxyna5q.js:175304-175839 placement
/**
 * 列出记忆存储中某路径下的子作用域（技能目录）及是否经符号链接，分页读取完返回结果。
 */
async function listMemorySkillDirs(storage, scope) {
  let children = [];
  let listing = await readAllPages(
    (cursor) =>
      storage.listEntries(
        {
          namespace: "memory",
          projectKey: scope.projectKey,
          relPath: scope.relPath,
        },
        {
          skipKeyStats: true,
          skipScopeStats: true,
          ...(cursor !== undefined && {
            cursor,
          }),
        },
      ),
    (items) => {
      for (let item of items) {
        if (item.kind !== "scope" || item.scope.namespace !== "memory") continue;
        let last = item.scope.relPath?.at(-1);
        if (last !== undefined && item.scope.relPath?.length === scope.relPath.length + 1)
          children.push({
            name: last,
            symlink: item.viaSymlink === true,
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
//@ chunk-7jxyna5q.js:175839-176304 placement
/**
 * 以加固模式读取记忆存储中的技能文件，把各类存储错误（不在位置、已移动、多个名称、非小文件）映射为结果类型。
 */
async function readMemorySkillFile(storage, key) {
  let text = await storage.readText(
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
  let [item] = text.value.items;
  if (!item.found)
    return {
      kind: "absent",
    };
  if (item.totalBytes > MAX_SKILL_FILE_BYTES)
    return {
      kind: "notPlainSmallFile",
    };
  return {
    kind: "ok",
    content: item.value,
  };
}
//@ chunk-7jxyna5q.js:176304-176409 placement (2.1.88 match: WorkerStateUploader, 0.338)
class PendingQueue {
  pending = [];
  enqueue(item) {
    this.pending.push(item);
  }
  drain() {
    let pending = this.pending;
    this.pending = [];
    return pending;
  }
}
//@ chunk-7jxyna5q.js:176409-176435 placement
/**
 * 按宿主保存的记忆技能加载队列。
 */
var pendingMemorySkillQueue; // deferred: uses PendingQueue of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:176409", () => {
  pendingMemorySkillQueue = new HostScoped(() => new PendingQueue());
});
//@ chunk-7jxyna5q.js:176435-176478 placement
/**
 * 把一次技能加载加入队列。
 */
function enqueueMemorySkillLoad(text) {
  pendingMemorySkillQueue.of(getRootSession().host).enqueue(text);
}
export {
  memorySkillCommands,
  pendingMemorySkillQueue,
  loadMemoryStoreSkills,
  enqueueMemorySkillLoad,
  onMemorySkillsChanged,
  memorySkillNamesSnapshot,
};
