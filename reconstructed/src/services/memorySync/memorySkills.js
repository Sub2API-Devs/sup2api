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
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  realpath,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
} from "fs/promises";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
} from "path";
import {
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
} from "fs";
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
var MEMORIES = "memories::",
  Yu = 131072,
  Vu = 100;
/**
 * 记忆库技能命令集合：replace 替换命令并在名称集合变化时更新稳定快照，changed 信号通知。
 */
//@ chunk-s61vbvea.js:166835-167096 placement
class MemorySkillCommands {
  commands = [];
  nameStableSnapshot = this.commands;
  replace(e) {
    let n = new Set(this.commands.map((command) => command.name)),
      r = new Set(e.map((h) => h.name));
    this.commands = e;
    let s = r.size !== n.size || [...r].some((h) => !n.has(h));
    if (s) this.nameStableSnapshot = e;
    return s;
  }
  changed = createSignal();
}
//@ chunk-s61vbvea.js:167096-167121 placement
var BC = new HostScoped(() => new MemorySkillCommands());
//@ chunk-s61vbvea.js:167121-167158 placement
function Ks() {
  return BC.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:167158-167194 placement
function QRe() {
  return Ks().commands;
}
//@ chunk-s61vbvea.js:167194-167240 placement
function U7s() {
  return Ks().nameStableSnapshot;
}
//@ chunk-s61vbvea.js:167240-167289 placement
function uqr(e) {
  return Ks().changed.subscribe(e);
}
/**
 * 从记忆库加载技能（Windows 不支持 O_NOFOLLOW 时跳过）
 */
//@ chunk-s61vbvea.js:167289-169499 placement
async function loadMemoryStoreSkills(e, n, r) {
  try {
    let filtered = e.filter((j) => (j.skillsDirs ?? []).length > 0);
    if (filtered.length === 0) return;
    if (getPlatform_2() === "windows") {
      (logForDebugging("memory-skills: store skills are not loaded on Windows (no O_NOFOLLOW)", {
        level: "warn",
      }),
        logFeatureSad("memory_store_skills", "windows_unsupported"));
      return;
    }
    if (getDisableSlashCommands()) {
      (logForDebugging(
        "memory-skills: not loaded with slash commands disabled (no surface reads the registry)",
        { level: "warn" },
      ),
        logFeatureSad("memory_store_skills", "slash_commands_disabled"));
      return;
    }
    if (isRestrictedToPluginOnly("skills")) {
      (logForDebugging(
        "memory-skills: not loaded under strictPluginOnlyCustomization (memoryStore is not an admin-trusted source)",
        { level: "warn" },
      ),
        logFeatureSad("memory_store_skills", "plugin_only_policy"));
      let j = Ks();
      if (j.replace([])) j.changed.emit();
      return;
    }
    let h = new Map(n.map((j) => [j.mountName, j])),
      y = [],
      S = new Set(),
      w = !1,
      R = !1,
      x = (j, G) => {
        ((w = !0), logForDebugging(`memory-skills: skipping ${j} \u2014 ${G}`, { level: "warn" }));
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
      let Q = r && parseTeamMemoryDir(G.mountDir);
      for (let Z of j.skillsDirs ?? []) {
        let ee = getTeamMemFilePath({ scope: "team", mount: j.mount }, Z),
          parts = Z.split("/"),
          se = await checkPathInTeamMemDir(ee, "team", j.mount, ...parts);
        if (se === "absent") continue;
        if (se !== "ok") {
          x(j.mount, `skills dir ${Z} resolves through a symlink or escapes the mount`);
          continue;
        }
        let re = await resolveRealAutoMemPath("team", j.mount, ...parts),
          he = await listMemorySkillFolders(
            re,
            x,
            j,
            r,
            Q && { projectKey: Q.projectKey, relPath: [...Q.relPath, ...parts] },
          );
        for (let command of he.commands) {
          if (S.has(command.name)) {
            logForDebugging(
              `memory-skills: ${command.name} already registered by an earlier skills dir \u2014 ignoring the copy in ${Z} (${j.mount})`,
            );
            continue;
          }
          (S.add(command.name), y.push(command));
        }
        R ||= he.truncated;
      }
    }
    let P = Ks();
    if (P.replace(y)) P.changed.emit();
    if (y.length > 0) logForDebugging(`memory-skills: registered ${y.length} skill(s) under ${MEMORIES}`);
    if (w) logFeatureSad("memory_store_skills", "store_skipped");
    if (R) logFeatureSad("memory_store_skills", "skills_truncated");
    if (!w && !R) logFeatureOk("memory_store_skills");
  } catch (error) {
    (logError(error), logFeatureBad("memory_store_skills", "register_failed"));
  }
}
//@ chunk-s61vbvea.js:169499-172086 placement
async function listMemorySkillFolders(e, n, r, s, h) {
  let { createSkillCommand: createSkillCommand, parseSkillFrontmatterFields: parseSkillFrontmatterFields } =
      getMCPSkillBuilders(),
    w;
  if (s && h) {
    let P = await listMemorySkillDirs(s, h);
    if (!P.ok) return (n(r.mount, `listing failed for ${e} (${P.error})`), { commands: [], truncated: !1 });
    w = P.value;
  } else {
    let P;
    try {
      P = await readdir(e, { withFileTypes: !0 });
    } catch (error) {
      if (!isENOENT(error)) n(r.mount, `readdir failed for ${e} (${getErrnoCode(error) ?? "unknown"})`);
      return { commands: [], truncated: !1 };
    }
    w = P.filter((j) => j.isDirectory() || j.isSymbolicLink()).map((j) => ({
      name: j.name,
      symlink: j.isSymbolicLink(),
    }));
  }
  w.sort((P, j) => (P.name < j.name ? -1 : 1));
  let R = !1;
  if (w.length > Vu)
    (logForDebugging(
      `memory-skills: ${e} has ${w.length} skill folders \u2014 loading only the first ${Vu}`,
      { level: "warn" },
    ),
      (R = !0),
      (w = w.slice(0, Vu)));
  let x = [];
  for (let P of w) {
    if (P.name.length > 256 || P.symlink || !isValidRelativeSegments(P.name)) {
      n(r.mount, `unsafe or symlinked skill folder in ${e}`);
      continue;
    }
    let j = join_4(e, P.name, "SKILL.md"),
      G;
    if (s && h) {
      let re = await readMemorySkillFile(
        s,
        STORAGE_SPACES.memory(h.projectKey, [...h.relPath, P.name, "SKILL.md"]),
      );
      if (re.kind === "absent") continue;
      if (re.kind !== "ok") {
        n(
          r.mount,
          re.kind === "notAtLocation"
            ? `${j} is not at its apparent location`
            : re.kind === "moved"
              ? `${j} is not where its key says (moved during open, or the home path is too long to verify)`
              : re.kind === "otherNames"
                ? `${j} skipped this cycle (a second name on the file, or the backend's own publish in flight) \u2014 retried at the next sync`
                : re.kind === "notPlainSmallFile"
                  ? `${j} is not a plain small file`
                  : `read failed for ${j} (${re.reason})`,
        );
        continue;
      }
      G = re.content;
    } else {
      let re;
      try {
        re = await realpath(j);
      } catch (error) {
        let Se = getErrnoCode(error);
        if (Se !== "ENOENT" && Se !== "ENOTDIR") n(r.mount, `realpath failed for ${j} (${Se ?? "unknown"})`);
        continue;
      }
      if (re !== j) {
        n(r.mount, `${j} is not at its apparent location`);
        continue;
      }
      try {
        let he = await open_2(j, constants_3.O_RDONLY | constants_3.O_NOFOLLOW | constants_3.O_NONBLOCK);
        try {
          let stats = await he.stat();
          if ((await verifyHandleBinding(he, re, stats)) === "moved") {
            n(r.mount, `${j} moved during open`);
            continue;
          }
          if (!stats.isFile() || stats.nlink > 1 || stats.size > Yu) {
            n(r.mount, `${j} is not a plain small file`);
            continue;
          }
          G = (await he.readFile({ encoding: "utf8" })).toString();
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
    let L = parseFrontmatter(G, j, { normalizeKeys: !0, untrusted: !0 }),
      { frontmatter: frontmatter, content: content, parseError: parseError } = L;
    if (parseError !== void 0) {
      n(r.mount, `${j} frontmatter was not read`);
      continue;
    }
    let ee = escapeXmlControlChars(content),
      ae = `${MEMORIES}${P.name}`,
      se = parseSkillFrontmatterFields(frontmatter, ee, ae);
    x.push(
      createSkillCommand({
        ...se,
        skillName: ae,
        markdownContent: ee,
        source: "memoryStore",
        baseDir: join_4(e, P.name),
        loadedFrom: "memoryStore",
        skillFile: scrubMemoryKeys(L, j),
        ...emptySkillFrontmatter(),
        ...escapedSkillFields(se),
        userInvocable: !1,
      }),
    );
  }
  return { commands: x.filter((P) => P !== void 0), truncated: R };
}
/**
 * 列出记忆存储中某路径下的子作用域（技能目录）及是否经符号链接，分页读取完返回结果。
 */
//@ chunk-s61vbvea.js:172086-172621 placement
async function listMemorySkillDirs(storage, scope) {
  let children = [],
    listing = await readAllPages(
      (h) =>
        storage.listEntries(
          { namespace: "memory", projectKey: scope.projectKey, relPath: scope.relPath },
          { skipKeyStats: !0, skipScopeStats: !0, ...(h !== void 0 && { cursor: h }) },
        ),
      (h) => {
        for (let y of h) {
          if (y.kind !== "scope" || y.scope.namespace !== "memory") continue;
          let S = y.scope.relPath?.at(-1);
          if (S !== void 0 && y.scope.relPath?.length === scope.relPath.length + 1)
            children.push({ name: S, symlink: y.viaSymlink === !0 });
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
/**
 * 以加固模式读取记忆存储中的技能文件，把各类存储错误（不在位置、已移动、多个名称、非小文件）映射为结果类型。
 */
//@ chunk-s61vbvea.js:172621-173086 placement
async function readMemorySkillFile(e, n) {
  let text = await e.readText([{ key: n, offset: 0, length: Yu + 1 }], { hardened: !0 });
  if (!text.ok) {
    let h = text.error.code === "Failed" ? text.error.telemetryCode : "";
    return h === "ELOOP"
      ? { kind: "notAtLocation" }
      : h === LEAFMOVED
        ? { kind: "moved" }
        : h === OTHERNAMES
          ? { kind: "otherNames" }
          : h === "ENXIO"
            ? { kind: "notPlainSmallFile" }
            : { kind: "failed", reason: formatStorageError(text.error) };
  }
  let [s] = text.value.items;
  if (!s.found) return { kind: "absent" };
  if (s.totalBytes > Yu) return { kind: "notPlainSmallFile" };
  return { kind: "ok", content: s.value };
}
//@ chunk-s61vbvea.js:173086-173191 placement
class PendingQueue {
  pending = [];
  enqueue(e) {
    this.pending.push(e);
  }
  drain() {
    let pending = this.pending;
    return ((this.pending = []), pending);
  }
}
//@ chunk-s61vbvea.js:173191-173217 placement
var QKo = new HostScoped(() => new PendingQueue());
//@ chunk-s61vbvea.js:173217-173260 placement
function jh(e) {
  QKo.of(getRootSession().host).enqueue(e);
}

export { uqr, U7s, QRe, QKo, loadMemoryStoreSkills, jh };
