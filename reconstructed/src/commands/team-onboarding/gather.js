/**
 * commands/team-onboarding/gather.ts
 *
 * 2.1.316 新增：/team-onboarding 收集本机会话记录中的工具与 MCP 使用情况
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  stat as stat_6,
  stat as stat_7,
  stat as stat_8,
  stat as stat_9,
  stat as stat_10,
  stat as stat_11,
  stat as stat_12,
  stat as stat_13,
  stat as stat_14,
  stat as stat_15,
  stat as stat_16,
  stat as stat_17,
  stat as stat_18,
  stat as stat_19,
  stat as stat_20,
  stat as stat_21,
  stat as stat_22,
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  readFile as readFile_5,
  readFile as readFile_6,
  readFile as readFile_7,
  readFile as readFile_8,
  readFile as readFile_9,
  readFile as readFile_10,
  readFile as readFile_11,
  readFile as readFile_12,
  readFile as readFile_13,
  readFile as readFile_14,
  readFile as readFile_15,
  readFile as readFile_16,
  readFile as readFile_17,
  readFile as readFile_18,
  readFile as readFile_19,
} from "fs/promises";
import {
  extname,
  extname as extname_2,
  extname as extname_3,
  extname as extname_4,
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
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
} from "path";
import { isFsInaccessible, isENOENT } from "../../utils/errors.js";
import {
  MAX_METADATA_SCAN_BYTES,
  Len,
  o8o,
  Z9o,
  r8o,
  n8o,
  s8o,
  l8o,
  i8o,
  d8o,
  a8o,
  u8o,
  J9o,
  Den,
} from "../../utils/sessionStorage.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { getProjectDir } from "../../utils/sessionStoragePortable.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import { normalizeGitRemoteUrl } from "../../utils/git.js";

/**
 * scanSessionUsage：扫描会话 JSONL：斜杠命令次数、MCP 调用次数、会话描述。
 */
//@ chunk-e6aww6q8.js:1738199-1739826 placement
async function scanSessionUsage(e, n) {
  let r = {
      slashCommandCounts: new Map(),
      mcpServerCounts: new Map(),
      sessionDescriptors: [],
      sessionFileCount: 0,
    },
    s = Date.now() - n * 24 * 60 * 60 * 1000,
    h;
  try {
    h = await readdir_22(e);
  } catch (error) {
    if (isFsInaccessible(error)) return r;
    throw error;
  }
  let filtered = h.filter((w) => extname_2(w) === ".jsonl"),
    filtered_2 = (
      await Promise.all(
        filtered.map(async (w) => {
          let L = join_68(e, w);
          try {
            let G = await stat_13(L);
            if (!G.isFile() || G.mtimeMs < s || G.size > MAX_METADATA_SCAN_BYTES) return null;
            return L;
          } catch (error) {
            if (isFsInaccessible(error)) return null;
            throw error;
          }
        }),
      )
    ).filter((w) => w !== null);
  for (let w of filtered_2) {
    let L;
    try {
      L = await readFile_12(w, "utf-8");
    } catch (error) {
      if (isFsInaccessible(error)) continue;
      throw error;
    }
    r.sessionFileCount++;
    let G = { prNumbers: [] };
    for (let q of L.split(`
`)) {
      if (q.length < 10) continue;
      if (q.includes(Len) || q.includes(o8o))
        for (let Z of q.matchAll(Z9o)) {
          let Se = Z[1];
          r.slashCommandCounts.set(Se, (r.slashCommandCounts.get(Se) ?? 0) + 1);
        }
      if (q.includes(r8o) && q.includes('"name":"mcp__'))
        for (let Z of q.matchAll(n8o)) {
          let Se = Z[1];
          r.mcpServerCounts.set(Se, (r.mcpServerCounts.get(Se) ?? 0) + 1);
        }
      if (q.includes(s8o)) {
        let match = l8o.exec(q);
        if (match) G.title = match[1];
      }
      if (q.includes(i8o)) {
        let match = d8o.exec(q);
        if (match) {
          let Se = Number(match[1]);
          if (!G.prNumbers.includes(Se)) G.prNumbers.push(Se);
        }
      }
      if (!G.firstMessage && q.includes(a8o) && !q.includes(Len) && !q.includes('"content":[')) {
        let match = u8o.exec(q);
        if (match) {
          let replaced = match[1].replace(/\\n/g, " ").replace(/\\"/g, '"');
          if (replaced.length > 3 && !replaced.startsWith("<")) G.firstMessage = replaced.slice(0, J9o);
        }
      }
    }
    if (G.title || G.prNumbers.length > 0 || G.firstMessage) r.sessionDescriptors.push(G);
  }
  if (r.sessionDescriptors.length > Den)
    (r.sessionDescriptors.sort((w, L) => {
      let G = (w.title ? 2 : 0) + (w.prNumbers.length > 0 ? 1 : 0);
      return (L.title ? 2 : 0) + (L.prNumbers.length > 0 ? 1 : 0) - G;
    }),
      (r.sessionDescriptors = r.sessionDescriptors.slice(0, Den)));
  return r;
}
/**
 * TEAM_ONBOARDING_DEFAULT_WINDOW_DAYS：30。
 */
//@ chunk-e6aww6q8.js:1739826-1739837 placement
var TEAM_ONBOARDING_DEFAULT_WINDOW_DAYS = 30;
//@ chunk-e6aww6q8.js:1739837-1739896 placement
function g8o(e) {
  try {
    return new URL(e).origin;
  } catch {
    return;
  }
}
/**
 * readProjectMcpServers：读 .mcp.json 的 mcpServers。
 */
//@ chunk-e6aww6q8.js:1739896-1740216 placement
async function readProjectMcpServers(e) {
  try {
    let n = await readFile_11(join_67(e, ".mcp.json"), "utf8"),
      r = jsonParse(n);
    if (r && typeof r === "object" && "mcpServers" in r && r.mcpServers && typeof r.mcpServers === "object")
      return r.mcpServers;
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(
        `team-onboarding: failed to read .mcp.json: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      );
  }
  return {};
}
/**
 * collectTeamOnboardingUsage：组装 /team-onboarding 的 usageData。
 */
//@ chunk-e6aww6q8.js:1740216-1741001 placement
async function collectTeamOnboardingUsage(e) {
  let n = getOriginalCwd(),
    r = getProjectDir(n),
    s = await scanSessionUsage(r, e),
    mapped = [...s.slashCommandCounts.entries()]
      .sort((q, Z) => Z[1] - q[1])
      .map(([q, Z]) => ({ name: `/${q}`, count: Z })),
    y = await readProjectMcpServers(n),
    mapped_2 = [...s.mcpServerCounts.entries()]
      .sort((q, Z) => Z[1] - q[1])
      .map(([q, Z]) => {
        let Se = y[q];
        return { name: q, callCount: Z, urlOrigin: typeof Se?.url === "string" ? g8o(Se.url) : void 0 };
      }),
    trimmed = (await execFileNoThrowWithCwd("git", ["config", "user.name"], { cwd: n })).stdout.trim(),
    trimmed_2 = (
      await execFileNoThrowWithCwd("git", ["remote", "get-url", "origin"], { cwd: n })
    ).stdout.trim();
  return {
    usageData: jsonStringify(
      {
        generatedBy: trimmed || void 0,
        currentRepo: normalizeGitRemoteUrl(trimmed_2) ?? basename_38(n),
        windowDays: e,
        sessionCount: s.sessionFileCount,
        slashCommands: mapped,
        mcpServers: mapped_2,
        sessionDescriptors: s.sessionDescriptors,
      },
      null,
      2,
    ),
    sessionCount: s.sessionFileCount,
    slashCommandCount: s.slashCommandCounts.size,
    mcpServerCount: s.mcpServerCounts.size,
  };
}

export { TEAM_ONBOARDING_DEFAULT_WINDOW_DAYS, collectTeamOnboardingUsage };
