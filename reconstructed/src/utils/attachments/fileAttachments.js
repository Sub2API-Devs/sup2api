/**
 * utils/attachments/fileAttachments.ts
 *
 * 2.1.316 新增：文件附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (13)
 * attribution: placement 13
 */
import {
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
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
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
} from "path";
import { getRepoRootForWorktreePath } from "../permissions/protectedDirs.js";
import { getClaudeWorktreesDir } from "../worktreeIsolation.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { SessionRootSlot, cke } from "../../bootstrap/sessionSlices.js";
import {
  isUntrustedUncPath,
  hasReadDenyRuleForPath,
  matchingDenyRuleForDirectoryContents,
} from "../permissions/filesystem.js";
import { expandPath } from "../path.js";
import { isNetworkOrDevicePath } from "../../plugins/functionHooks/ui/imageSource.js";
import { NF } from "../permissions/pathVetting.js";
import { logEvent } from "../../services/analytics/index.js";
import { isRestrictedReadBlocked } from "../claudeInChrome/fileUpload.js";

//@ chunk-e6aww6q8.js:3249105-3249174 placement
function cC(e, n) {
  return e === n || e.startsWith(n.endsWith(sep_52) ? n : n + sep_52);
}
/**
 * 从路径向上查找它所在的 Claude worktree 及其对应的检出目录。
 */
//@ chunk-e6aww6q8.js:3249174-3249342 placement
function findWorktreeForPath(e, n) {
  let r = null;
  for (let s = e; s !== n && s !== dirname_49(s); s = dirname_49(s)) {
    let h = getRepoRootForWorktreePath(s);
    if (h !== null && (cC(h, n) || (cC(n, h) && !cC(n, getClaudeWorktreesDir(h)))))
      r = { worktreeRoot: s, checkout: h };
  }
  return r;
}
//@ chunk-e6aww6q8.js:3249342-3249438 placement
function UZe(e, n) {
  return n !== null && cC(e, n.worktreeRoot) ? join_89(n.checkout, relative_32(n.worktreeRoot, e)) : e;
}
/**
 * 把检出目录下的路径映射到对应 worktree 下的同一相对路径。
 */
//@ chunk-e6aww6q8.js:3249438-3249546 placement
function mapPathIntoWorktree(e, n) {
  return n !== null && e !== n.checkout && cC(e, n.checkout)
    ? join_89(n.worktreeRoot, relative_32(n.checkout, e))
    : e;
}
//@ chunk-e6aww6q8.js:3249546-3249575 placement
var rRn = 4000,
  weakSet_5 = new WeakSet();
//@ chunk-e6aww6q8.js:3249575-3249600 placement
class fRn {
  logged = new Set();
}
//@ chunk-e6aww6q8.js:3249600-3249627 placement
var CAr = new HostScoped(() => new fRn());
//@ chunk-e6aww6q8.js:3249627-3249673 placement
function aRn() {
  return CAr.of(getRootSession().host).logged;
}
//@ chunk-e6aww6q8.js:3381159-3381196 placement
var QPr = 1000,
  JPr = new SessionRootSlot(() => new Set());
/**
 * 判断附件文件读取是否被阻止：不可信网络路径返回 network，命中读取拒绝规则返回 denied。
 */
//@ chunk-e6aww6q8.js:3381196-3381475 placement
function getAttachmentReadBlockReason(e, n, r) {
  let trustedNetworkDirectories = n.trustedNetworkDirectories;
  if (isUntrustedUncPath(e, trustedNetworkDirectories)) return "network";
  let h = expandPath(e);
  if (r === "person") return kW(h, n) ? "denied" : void 0;
  if (isNetworkOrDevicePath(e) || isNetworkOrDevicePath(h)) return "network";
  let y = NF(e, h, trustedNetworkDirectories);
  if (!y.ok) return "network";
  return [h, ...y.pathsToCheck].some((S) => kW(S, n)) ? "denied" : void 0;
}
//@ chunk-e6aww6q8.js:3381475-3381549 placement
function kW(e, n) {
  try {
    return isAttachmentReadDenied(e, n);
  } catch (error) {
    if (cke(error)) return !0;
    throw error;
  }
}
//@ chunk-e6aww6q8.js:3381549-3381783 placement
function isAttachmentReadDenied(e, n) {
  if (isUntrustedUncPath(e, n.trustedNetworkDirectories)) {
    let of = JPr.of(getRootSession());
    if (!of.has(e) && of.size < QPr) (of.add(e), logEvent("tengu_attachment_unc_read_blocked", {}));
    return !0;
  }
  if (hasReadDenyRuleForPath(e, n, [e])) return !0;
  if (isRestrictedReadBlocked(e, n)) return !0;
  return matchingDenyRuleForDirectoryContents(e, n, "read") !== null;
}
//@ chunk-e6aww6q8.js:3381783-3381873 placement
function ret(e, n) {
  let r = e.get(n);
  if (!r) return;
  e.set(n, { ...r, contentNotInModelContext: !0 });
}

export {
  kW,
  getAttachmentReadBlockReason,
  cC,
  findWorktreeForPath,
  UZe,
  mapPathIntoWorktree,
  ret,
  weakSet_5,
  aRn,
  rRn,
};
