/**
 * services/homeSeed/announce.ts
 *
 * 2.1.316 新增：home seed 公告与提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-twq47pff.js (4)
 * attribution: placement 4
 */
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { safeErrorName } from "../../cli/remoteIO/fileStoreVerdicts.js";
import { joined, joined_6, joined_5 } from "../../utils/teleport/seedPaths.js";
import { parseHomeReadyRow, encodeHomeReadyRow } from "../../daemon/homeReady.js";
import { decodeHomePack } from "./homePack.js";
import {
  planHomeSeedApply,
  permissionsSchema,
  toStringArray,
  mergeRuleLists,
  MAX_RENDERED_SETTINGS_BYTES,
  renderSidecarPlan,
} from "./homeSidecar.js";
import { uniq } from "../../utils/collections.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { classifyRowError } from "./destination.js";

//@ chunk-twq47pff.js:16188-16402 placement
var HOLD_MAX_MS = 300000;
var VERDICT_WAIT_MAX_MS = 60000;
var REQUEST_ATTEMPTS = 3;
var REQUEST_RETRY_DELAY_MS = 500;
var ANNOUNCE_POLL_MS = 2000;
var PERMISSIONS_FROM_ANY_PACK = true;
var ANNOUNCED_RULE_RE = /^[A-Za-z][A-Za-z0-9_*-]{0,127}(?:\([A-Za-z0-9 ._\-/:*~@+=,]{1,64}\))?$/;
var MAX_ANNOUNCED_RULES = 200;
var RESTORED_WITHOUT_ANNOUNCEMENT = "restored-without-announcement";
var INITIAL_ANNOUNCEMENT = {
  etag: "",
  beforeFirstCommand: true,
  ordinal: 0.5,
};
//@ chunk-twq47pff.js:16402-16466 placement
/**
 * 调用 enabledNow 判断是否当下启用（出错视为否）。
 */
function isEnabledNow(t) {
  try {
    return t.enabledNow?.() === true;
  } catch {
    return false;
  }
}
//@ chunk-twq47pff.js:16466-16560 placement
/**
 * 微任务里调用回调，出错时记诊断（不带 PII）。
 */
function runGuarded(t, e, n) {
  if (e === undefined) return;
  queueMicrotask(() => {
    try {
      t(e);
    } catch {
      logForDiagnosticsNoPII("error", n, {});
    }
  });
}
//@ chunk-twq47pff.js:16560-32742 placement
/**
 * home seed 应用过程的用户提示状态机（外来文件替换、恢复提示、询问等）。
 */
function createHomeSeedAnnouncer(t, e) {
  let n;
  let l = false;
  let d;
  let u = false;
  let w = new Set();
  let v = new Set();
  let P;
  let E;
  let y = false;
  let lastAppliedGeneration = 0;
  let M = 0;
  let Q = false;
  let x = false;
  let N;
  let q;
  let X = false;
  let Te = 0;
  let K;
  let de;
  let ue = false;
  let se;
  let keepsForeignFiles = t.foreignFiles !== "replaced";
  let be;
  let Be;
  let we = false;
  let S = false;
  let ee = false;
  let re = !e.epochGt1;
  let ae = e.epochGt1 && isEnabledNow(e);
  let Re = false;
  let De = false;
  let Ce;
  let ve;
  let nt = false;
  let ot;
  let it = false;
  let Ht = false;
  let He = new Set();
  let ce = () => {
    for (let r of [...He]) r();
  };
  let me = (r) => {
    if (!l) {
      d = r;
      if (N !== undefined || q !== undefined) Et();
    }
    l = true;
    N = undefined;
    q = undefined;
    if (ee && !Re) Z("lane_unavailable", 0, e.now(), false);
    ee = false;
    ae = false;
    re = true;
    ce();
  };
  let Et = () => {
    if (!y) {
      y = true;
      logForDiagnosticsNoPII("info", "home_seed_announcement_discarded", {
        reason: d ?? "stopped",
      });
    }
  };
  let st = () => {
    let filtered = [N, q, ee || ae ? INITIAL_ANNOUNCEMENT : undefined].filter((s) => s !== undefined);
    return filtered.length === 0
      ? undefined
      : filtered.reduce((acc, R) => (R.ordinal > acc.ordinal ? R : acc));
  };
  function At(r) {
    if (l || u) {
      Et();
      return;
    }
    if (r.etag === N?.etag || r.etag === q?.etag) return;
    if (r.etag === de) {
      if (se !== undefined && K === undefined)
        K = {
          etag: r.etag,
          ready: On(se),
          readyWritten: false,
        };
      if (K !== undefined && !K.readyWritten)
        if (X || !Q || n !== "served") ue = true;
        else dt();
      return;
    }
    if (K !== undefined && r.etag === K.etag) {
      if (!K.readyWritten)
        if (X) ue = true;
        else dt();
      return;
    }
    N = r;
    if (e.epochGt1 && !Ht) {
      Ht = true;
      let s = e.now();
      be ??= e.readSidecar(t.configHome).catch(() => null);
      be.then((R) => {
        Sn(R, s);
      });
    }
    if (n === "served") ze(false);
  }
  function Sn(r, s) {
    if (
      r === null ||
      r.packEtag === undefined ||
      r.packEtag === RESTORED_WITHOUT_ANNOUNCEMENT ||
      N?.etag !== r.packEtag ||
      K !== undefined ||
      de !== undefined
    )
      return;
    de = r.packEtag;
    se = r;
    N = undefined;
    lt();
    ne("already_applied", "none", null, r.generation, s);
    ce();
  }
  function wn(r, s) {
    if (l || u) return;
    n = r;
    if (r === "served") {
      if (N !== undefined) ze(!s);
      else if (ue) Ae();
      else {
        at(!s);
        Ie(s);
      }
      return;
    }
    me(r === "off" ? "verdict_off" : "verdict_refused");
  }
  function Ft() {
    if (!re && Q && ot === "absent" && !l && !u) {
      re = true;
      ee = true;
      ae = false;
    }
  }
  function at(r = false) {
    Ft();
    if (!ee || n !== "served" || X || l || u) return;
    X = true;
    Re = true;
    let s = e.now();
    Rn(!r, s)
      .catch((error) => {
        logForDiagnosticsNoPII("error", "home_seed_recovery_threw", {
          name: safeErrorName(error),
        });
        ge("threw", 0, s);
      })
      .finally(() => {
        X = false;
        ee = false;
        ce();
        Ae();
        if (q === undefined || S) xe();
      });
  }
  async function Rn(r, s) {
    M++;
    if (r) {
      let row = await e.getRow(joined);
      if (Ee(s)) return;
      if (row.kind !== "ok" && row.kind !== "not_found") {
        let he = Ge(row);
        if (he === "refused" || he === "rejected") me("probe_refused");
        Z(he === "auth" ? "auth_failed" : "request_failed", 0, s, he === "auth");
        return;
      }
    }
    let row = await e.getRow(joined_6);
    if (Ee(s)) return;
    if (row.kind !== "ok") {
      if (row.kind === "not_found") Z("no_ready_row", 0, s, false);
      else {
        let te = Ge(row);
        if (te === "refused") me("ready_refused");
        Z(te === "auth" ? "auth_failed" : "request_failed", 0, s, te === "auth");
      }
      return;
    }
    let homeReadyRow = parseHomeReadyRow(row.buf);
    if (!homeReadyRow.ok) {
      Z("ready_unreadable", 0, s, true);
      return;
    }
    let generation = homeReadyRow.ready.generation;
    let row_2 = await e.getRow(joined_5);
    if (Ee(s)) return;
    if (row_2.kind !== "ok") {
      let te = row_2.kind === "not_found" ? "not_found" : Ge(row_2);
      if (te === "refused") me("pack_refused");
      Z(
        te === "not_found" ? "pack_absent" : te === "auth" ? "auth_failed" : "request_failed",
        generation,
        s,
        true,
      );
      return;
    }
    let C = decodeHomePack(row_2.buf);
    if (!C.ok) {
      logForDiagnosticsNoPII("warn", "home_seed_bad_pack", {
        reason: C.reason,
      });
      Z("pack_unreadable", generation, s, true);
      return;
    }
    if (C.pack.generation !== generation) {
      Z("generation_mismatch", generation, s, true);
      return;
    }
    let U = planHomeSeedApply({
      pack: C.pack,
      packEtag: RESTORED_WITHOUT_ANNOUNCEMENT,
      refused: C.refused,
      sidecar: null,
      lastAppliedGeneration: 0,
      permissionsAdmissible: false,
      onlyClaudeMd: t.onlyClaudeMd === true,
    });
    if (U.kind === "stale_generation") {
      Z("generation_mismatch", generation, s, true);
      return;
    }
    if (C.refused.settings !== "none") {
      Z("settings_refused", generation, s, true);
      return;
    }
    let W = Pt(U.plan, C.pack.settings);
    if (W.deny.length === 0 && W.ask.length === 0) {
      if (W.dropped > 0) Z("rules_unverifiable", generation, s, true, W.dropped);
      else Z("no_rules", generation, s, false);
      return;
    }
    if (t.settingsPath === undefined) {
      Z("no_rules", generation, s, false);
      return;
    }
    let B = await e.readStandingSettings(t.settingsPath).catch(() => ({
      kind: "unusable",
    }));
    if (Ee(s)) return;
    let L = B.kind === "unusable" ? null : vn(U.plan, W, B);
    if (L === null) {
      Z("settings_unusable", generation, s, true);
      return;
    }
    let G = await e.execute(L, t, e.applyDeps());
    let beforeFirstAsk = !S;
    if (G.outcome === "config_home_unsafe" || G.outcome === "flag_off") {
      ne(G.outcome, "recovery", G, G.generation, s);
      Z("nothing_applied", generation, s, false);
      return;
    }
    if (!G.settingsWritten) {
      ne(G.outcome, "recovery", G, G.generation, s);
      Z("nothing_applied", generation, s, true);
      return;
    }
    try {
      e.afterApply(G, {
        beforeFirstAsk,
        applied: Dt(L, G),
      });
    } catch {
      logForDiagnosticsNoPII("error", "home_seed_after_apply_threw", {});
    }
    ve = {
      kind: "restored",
      denyRules: W.deny.length,
      askRules: W.ask.length,
      droppedRules: W.dropped,
      beforeFirstAsk,
      duringHold: He.size > 0,
      keepsForeignFiles,
    };
    ne(G.outcome, "recovery", G, G.generation, s);
    ge("restored", generation, s, W.dropped);
  }
  function Pt(plan, settings) {
    let permissions = plan.settings?.document.permissions;
    let b = (B) => (B ?? []).filter((L) => ANNOUNCED_RULE_RE.test(L)).slice(0, MAX_ANNOUNCED_RULES);
    let h = b(permissions?.deny);
    let I = b(permissions?.ask);
    let C = permissionsSchema().safeParse(settings?.permissions);
    let U = (B) => (C.success ? uniq(toStringArray(C.data[B])).length : 0);
    let dropped = Math.max(0, U("deny") + U("ask") - h.length - I.length);
    return {
      deny: h,
      ask: I,
      dropped,
    };
  }
  function vn(plan, s, R) {
    let b = R.kind === "object" ? R.value : {};
    let h = permissionsSchema().safeParse(b.permissions);
    if (b.permissions !== undefined && b.permissions !== null && !h.success) return null;
    let I = h.success ? h.data : {};
    let C = mergeRuleLists(toStringArray(I.deny), s.deny);
    let U = mergeRuleLists(toStringArray(I.ask), s.ask);
    let W = {
      ...b,
      permissions: {
        ...I,
        ...(C.length > 0 && {
          deny: C,
        }),
        ...(U.length > 0 && {
          ask: U,
        }),
      },
    };
    let B =
      jsonStringify(W, null, 2) +
      `
`;
    if (Buffer.byteLength(B) > MAX_RENDERED_SETTINGS_BYTES) return null;
    return {
      ...plan,
      writes: [],
      removals: [],
      counts: {
        ...plan.counts,
        refilteredCredentialFiles: 0,
      },
      restoreRecord: true,
      settings: {
        document: {
          permissions: {
            ...(s.deny.length > 0 && {
              deny: [...s.deny],
            }),
            ...(s.ask.length > 0 && {
              ask: [...s.ask],
            }),
          },
        },
        rendered: B,
        sha256: computeContentHash(B),
      },
    };
  }
  function Ge(r) {
    let s = classifyRowError(r);
    logForDiagnosticsNoPII("warn", "home_seed_lane_request_failed", {
      outcome: s,
      kind: r.errorKind,
      status: r.status ?? 0,
    });
    return s;
  }
  function Ee(r) {
    if (l || u) {
      ge("gate_closed", 0, r);
      return true;
    }
    return false;
  }
  function lt() {
    if (ee) {
      ee = false;
      ge("superseded", 0, e.now());
    }
    re = true;
    ae = false;
  }
  function Z(r, generation, R, b, dropped = 0) {
    ee = false;
    ge(r, generation, R, dropped);
    if (b && En(r))
      ve = {
        kind: "not_restored",
        reason: r,
        keepsForeignFiles,
      };
  }
  function xe() {
    let r = ve;
    ve = undefined;
    if (r !== undefined) Tt(r);
  }
  let Ot = () => N !== undefined || q !== undefined || K !== undefined || de !== undefined;
  function Ie(r = true) {
    if (!De || !S || n !== "served" || l || u || Ot()) return;
    De = false;
    let s = e.now();
    Hn(r, s).catch((error) => {
      logForDiagnosticsNoPII("error", "home_seed_recovery_threw", {
        name: safeErrorName(error),
      });
      ge("threw", 0, s);
    });
  }
  async function Hn(r, s) {
    let R = (h) => {
      Z(Ge(h) === "auth" ? "auth_failed" : "request_failed", 0, s, false);
      De = true;
    };
    if (r) {
      let row = await e.getRow(joined);
      if (Ee(s)) return;
      if (row.kind !== "ok" && row.kind !== "not_found") {
        R(row);
        return;
      }
    }
    let row = await e.getRow(joined_6);
    if (Ee(s)) return;
    if (Ot()) {
      De = true;
      return;
    }
    if (row.kind === "not_found") {
      Z("no_ready_row", 0, s, false);
      return;
    }
    if (row.kind !== "ok") {
      R(row);
      return;
    }
    Z("settings_gone", 0, s, true);
    xe();
  }
  function En(r) {
    return (
      r === "ready_unreadable" ||
      r === "rules_unverifiable" ||
      r === "settings_refused" ||
      r === "auth_failed" ||
      r === "pack_absent" ||
      r === "pack_unreadable" ||
      r === "generation_mismatch" ||
      r === "request_failed" ||
      r === "settings_unusable" ||
      r === "nothing_applied" ||
      r === "settings_gone"
    );
  }
  function ge(outcome, generation, R, rulesDropped = 0) {
    try {
      e.telemetry.recovery({
        outcome,
        generation,
        durationMs: e.now() - R,
        rulesDropped,
        afterAnnouncedRun: nt,
        sidecarCountedAsAbsent: it,
      });
    } catch {
      logForDiagnosticsNoPII("error", "home_seed_telemetry_threw", {});
    }
  }
  function Tt(r) {
    let s = (R, b, h) => {
      for (let I of R)
        try {
          I(b);
        } catch {
          logForDiagnosticsNoPII("error", h, {});
        }
    };
    if (r.kind === "restored" || r.kind === "not_restored") {
      E = v.size === 0 ? r : undefined;
      if (r.kind === "not_restored" && v.size > 0) Ce = r.reason;
      s(v, r, "home_seed_restore_listener_threw");
    } else {
      P = w.size === 0 ? r : undefined;
      s(w, r, "home_seed_applied_listener_threw");
    }
  }
  function ze(r) {
    if (!Q || X || N === undefined || l || u) return;
    if (nt && !re) return;
    X = true;
    An(r)
      .catch((error) => {
        logForDiagnosticsNoPII("error", "home_seed_run_threw", {
          name: safeErrorName(error),
        });
      })
      .finally(() => {
        X = false;
        q = undefined;
        xe();
        ce();
        Ae();
        Ie();
      });
  }
  function Ae() {
    at();
    if (X) return;
    if (N !== undefined && n === "served") {
      ze(false);
      if (X) ue = false;
      return;
    }
    if (!ue) return;
    if (K === undefined || K.readyWritten) {
      ue = false;
      return;
    }
    dt();
    if (X) ue = false;
  }
  function dt() {
    if (K === undefined || X || l || u || !Q || n !== "served") return;
    let r = K;
    X = true;
    ut(r.ready)
      .then((s) => {
        if (s) r.readyWritten = true;
      })
      .catch((error) => {
        logForDiagnosticsNoPII("error", "home_seed_run_threw", {
          name: safeErrorName(error),
        });
      })
      .finally(() => {
        X = false;
        ce();
        Ae();
      });
  }
  async function An(r) {
    let s = e.now();
    let R = N;
    if (R === undefined) return;
    N = undefined;
    if (K !== undefined && R.etag === K.etag) {
      if (!K.readyWritten) K.readyWritten = await ut(K.ready);
      return;
    }
    if (R.etag === de) return;
    q = R;
    nt = true;
    M++;
    if (e.epochGt1 && K === undefined && de === undefined) {
      let ie = await (be ?? e.readSidecar(t.configHome));
      if (ie?.packEtag === R.etag && R.etag !== RESTORED_WITHOUT_ANNOUNCEMENT) {
        de = R.etag;
        se = ie;
        lt();
        ne("already_applied", "none", null, ie.generation, s);
        return;
      }
    }
    let b = "verdict_wake";
    if (!r) {
      let ie = await Ct(joined);
      if (ie.kind === "deaf") return;
      b = Pn(ie.kind);
      if (ie.kind === "refused" || ie.kind === "rejected") {
        ne("refused_lane", b, null, 0, s);
        me("probe_refused");
        return;
      }
      if (ie.kind === "auth" || ie.kind === "transport") {
        ne(ie.kind === "auth" ? "auth_skipped" : "transport_failed", b, null, 0, s);
        return;
      }
    }
    let h = await Ct(joined_5);
    switch (h.kind) {
      case "deaf":
        return;
      case "refused":
        ne("refused_lane", b, null, 0, s);
        me("pack_refused");
        return;
      case "rejected":
        ne("request_rejected", b, null, 0, s);
        return;
      case "auth":
      case "transport":
        ne(h.kind === "auth" ? "auth_skipped" : "transport_failed", b, null, 0, s);
        return;
      case "not_found":
        ne("pack_absent", b, null, 0, s);
        return;
      case "ok":
        break;
    }
    let last = e.announcements.remembered().findLast((ie) => ie.etag === h.etag);
    if (last === undefined) {
      ne("unannounced_row", b, null, 0, s);
      return;
    }
    let C = decodeHomePack(h.buf);
    if (!C.ok) {
      logForDiagnosticsNoPII("warn", "home_seed_bad_pack", {
        reason: C.reason,
      });
      ne("bad_pack", b, null, 0, s);
      return;
    }
    let U = planHomeSeedApply({
      pack: C.pack,
      packEtag: h.etag,
      refused: C.refused,
      sidecar: await e.readSidecar(t.configHome),
      lastAppliedGeneration,
      permissionsAdmissible:
        e.limits.permissionsFromAnyAnnouncedPack || (last.beforeFirstCommand && !e.epochGt1),
      onlyClaudeMd: t.onlyClaudeMd === true,
    });
    if (U.kind === "stale_generation") {
      ne("stale_generation", b, null, U.generation, s);
      return;
    }
    let W = t.foreignFiles !== "replaced" && t.onlyClaudeMd !== true ? Pt(U.plan, C.pack.settings) : null;
    let B =
      W === null
        ? U.plan
        : {
            ...U.plan,
            restrictingSettings: {
              plan:
                W.deny.length === 0 && W.ask.length === 0
                  ? null
                  : renderSidecarPlan({
                      permissions: {
                        ...(W.deny.length > 0 && {
                          deny: [...W.deny],
                        }),
                        ...(W.ask.length > 0 && {
                          ask: [...W.ask],
                        }),
                      },
                    }),
              rulesLeftOut: W.dropped,
            },
          };
    let L = await e.execute(B, t, e.applyDeps());
    let appliedBeforeFirstAsk = !S;
    if (L.outcome === "config_home_unsafe" || L.outcome === "flag_off") {
      ne(L.outcome, b, L, L.generation, s);
      return;
    }
    lastAppliedGeneration = L.generation;
    let _e = {
      beforeFirstAsk: appliedBeforeFirstAsk,
      applied: Dt(B, L),
    };
    try {
      e.afterApply(L, _e);
    } catch {
      logForDiagnosticsNoPII("error", "home_seed_after_apply_threw", {});
    }
    lt();
    let te = L.settingsWritten && (ve ?? E) !== undefined;
    if (te) {
      ve = undefined;
      E = undefined;
    }
    xe();
    let he = He.size > 0;
    let Lt = await Fn(B, L);
    let ft = Ce !== undefined && (Ce === "settings_gone" || L.settingsWritten);
    Tt({
      ..._e,
      outcome: L.outcome,
      generation: L.generation,
      duringHold: he || He.size > 0,
      outputStyleMissing: Lt === "unresolved",
      answersNotRestored: ft,
    });
    if (ft && L.outcome === "applied") Ce = undefined;
    ne(L.outcome, b, L, L.generation, s, {
      appliedBeforeFirstAsk,
      outputStyleCheck: Lt,
      restoreNoticeSuperseded: te,
      answersNotRestored: ft,
    });
    let Kt = Tn(L, appliedBeforeFirstAsk);
    let $t = {
      etag: h.etag,
      ready: Kt,
      readyWritten: false,
    };
    K = $t;
    q = undefined;
    ce();
    $t.readyWritten = await ut(Kt);
  }
  function Mt(r, s) {
    if (!s.settingsWritten) return;
    return (s.settingsKeptForeign ? r.restrictingSettings?.plan : r.settings)?.document;
  }
  function Dt(r, s) {
    let R = Mt(r, s);
    let permissions = R?.permissions;
    return {
      claudeMd: s.appliedByKind.claude_md > 0,
      rules: s.appliedByKind.rule,
      outputStyles: s.appliedByKind.output_style,
      permissionRules:
        (permissions?.allow?.length ?? 0) +
        (permissions?.deny?.length ?? 0) +
        (permissions?.ask?.length ?? 0),
      settingsKeys: Object.keys(R ?? {}).filter((key) => key !== "permissions"),
      settingsNotWritten: s.settingsAttempted && !s.settingsWritten && !s.settingsKeptForeign,
      settingsRefused: s.settingsRefused !== "none" && !s.settingsKeptForeign,
      settingsKeptForeign: s.settingsKeptForeign,
      credentialRestrictionsLeftOut: s.refilteredCredentialRestrictions,
      rulesLeftOut: Math.max(0, s.rulesLeftOut - s.refilteredCredentialRestrictions),
      credentialFilesLeftOut: s.filesRefused.credential,
      filesKeptForeign: s.filesRefused.keptForeign,
      filesNotApplied:
        Object.values(s.filesRefused).reduce((acc, I) => acc + I, 0) -
        s.filesRefused.credential -
        s.filesRefused.keptForeign +
        s.filesFailed,
      filesRemoved: s.filesRemoved,
      settingsRemoved: s.settingsRemoved,
      removalsFailed: s.removalsFailed,
      settingsRemoveFailed: s.settingsRemoveFailed,
    };
  }
  async function Fn(r, s) {
    let outputStyle = Mt(r, s)?.outputStyle;
    let outputStyleAvailable = e.outputStyleAvailable;
    if (outputStyle === undefined || outputStyleAvailable === undefined) return "not_asked";
    let promise = await new Promise((resolve) => {
      let C = e.setTimer(() => resolve("ask_capped"), ANNOUNCE_POLL_MS);
      Promise.resolve()
        .then(() => outputStyleAvailable(outputStyle))
        .then(
          (U) => (U ? "available" : "unresolved"),
          () => "ask_failed",
        )
        .then((U) => {
          C();
          resolve(U);
        });
    });
    if (promise === "unresolved") logForDiagnosticsNoPII("info", "home_seed_output_style_unresolved", {});
    return promise;
  }
  function Pn(kind) {
    switch (kind) {
      case "ok":
        return "found";
      case "not_found":
        return "absent";
      case "refused":
      case "rejected":
        return "refused";
      case "auth":
      case "transport":
        return kind;
    }
  }
  function ne(
    outcome,
    probe,
    report,
    generation,
    h,
    I = {
      appliedBeforeFirstAsk: !S,
      outputStyleCheck: "not_asked",
      restoreNoticeSuperseded: false,
      answersNotRestored: false,
    },
  ) {
    try {
      e.telemetry.apply({
        outcome,
        probe,
        report,
        generation,
        epochGt1: e.epochGt1,
        durationMs: e.now() - h,
        ...I,
      });
    } catch {
      logForDiagnosticsNoPII("error", "home_seed_telemetry_threw", {});
    }
  }
  async function Ct(r) {
    let requestRetryDelayMs = e.limits.requestRetryDelayMs;
    for (let idx = 1; ; idx++) {
      if (l || u)
        return {
          kind: "deaf",
        };
      let row = await e.getRow(r);
      if (row.kind === "ok")
        return {
          kind: "ok",
          buf: row.buf,
          etag: row.content_sha256,
        };
      if (row.kind === "not_found")
        return {
          kind: "not_found",
        };
      let h = classifyRowError(row);
      if (h !== "transport" || idx >= e.limits.requestAttempts) {
        logForDiagnosticsNoPII("warn", "home_seed_lane_request_failed", {
          outcome: h,
          kind: row.errorKind,
          status: row.status ?? 0,
        });
        return {
          kind: h,
        };
      }
      await e.sleep(requestRetryDelayMs);
      requestRetryDelayMs *= 2;
    }
  }
  async function ut(ready) {
    let requestRetryDelayMs = e.limits.requestRetryDelayMs;
    let R = false;
    for (let idx = 1; ; idx++) {
      if (l || u) return false;
      let h = await e.putRow(joined_6, ready, Be);
      if (h.kind === "ok") {
        Be = h.content_sha256;
        return true;
      }
      if (h.kind === "conflict" && !R) {
        R = true;
        if (l || u) return false;
        let row = await e.getRow(joined_6);
        Be = row.kind === "ok" ? row.content_sha256 : undefined;
        continue;
      }
      if (!(h.kind === "error" && classifyRowError(h) === "transport") || idx >= e.limits.requestAttempts) {
        logForDiagnosticsNoPII("warn", "home_seed_ready_put_failed", {
          kind: h.kind,
          ...(h.kind === "error" && {
            errorKind: h.errorKind,
            status: h.status ?? 0,
          }),
        });
        return false;
      }
      await e.sleep(requestRetryDelayMs);
      requestRetryDelayMs *= 2;
    }
  }
  function On(r) {
    return encodeHomeReadyRow({
      generation: r.generation,
      appliedBeforeFirstAsk: false,
      outcome: "applied",
      filesApplied: r.entries.length,
      filesRefused: 0,
      settingsWritten: r.settingsSha256 !== null,
      replacedForeign: 0,
      writtenAtMs: e.now(),
    });
  }
  function Tn(r, appliedBeforeFirstAsk) {
    return encodeHomeReadyRow({
      generation: r.generation,
      appliedBeforeFirstAsk,
      outcome: r.outcome === "applied" ? "applied" : "partial",
      filesApplied: r.filesApplied,
      filesRefused: Object.values(r.filesRefused).reduce((acc, b) => acc + b, 0) + r.filesFailed,
      settingsWritten: r.settingsWritten && r.settingsAttempted,
      replacedForeign: r.filesReplacedForeign + (r.replacedExistingSettings === "foreign" ? 1 : 0),
      writtenAtMs: e.now(),
    });
  }
  function Mn(r) {
    let s = e.now();
    let firstAsk = !S;
    let b = () => {
      let h = l || u ? undefined : st();
      return h !== undefined && h.ordinal > Te ? h : undefined;
    };
    if (b() === undefined || e.limits.holdMaxMs <= 0) {
      S = true;
      Ie();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let I = false;
      let C = 0;
      let U = n !== undefined && x;
      let W = [];
      let B = (te) => {
        if (I) return;
        I = true;
        for (let he of W) he();
        He.delete(L);
        if (te !== "released" && te !== "gate_off") Te = Math.max(Te, st()?.ordinal ?? 0);
        S = true;
        Ie();
        resolve();
        try {
          e.telemetry.hold({
            outcome: te,
            waitedMs: e.now() - s,
            verdictWaitMs: C,
            firstAsk,
          });
        } catch {
          logForDiagnosticsNoPII("error", "home_seed_telemetry_threw", {});
        }
      };
      let L = () => {
        if (!U && n !== undefined && x) {
          U = true;
          C = e.now() - s;
          G();
        }
        if (l || u) B("gate_off");
        else if (b() === undefined) B("released");
      };
      let G = () => {};
      if (r.aborted) {
        B("interrupted");
        return;
      }
      He.add(L);
      W.push(e.setTimer(() => B("timeout"), e.limits.holdMaxMs));
      if (!U) {
        G = e.setTimer(() => {
          C = e.now() - s;
          if (n === undefined) B("verdict_timeout");
          else if (!x) B("flag_timeout");
        }, e.limits.verdictWaitMaxMs);
        W.push(() => G());
      }
      let _e = () => B("interrupted");
      r.addEventListener("abort", _e, {
        once: true,
      });
      W.push(() => r.removeEventListener("abort", _e));
    });
  }
  let ct;
  try {
    ct = e.enabled();
  } catch {
    ct = Promise.resolve(false);
  }
  let Ye = false;
  let xt = () => {
    if (Ye && ot === "absent") {
      Ye = false;
      ge("restore_gate_off", 0, e.now());
      De = true;
      Ie();
    }
  };
  ct.then(
    (r) => {
      x = true;
      if (r === true || r === "announced_only") {
        Q = true;
        Ye = e.epochGt1 && r !== true;
        re ||= r !== true;
        xt();
        ae = !re;
        It();
        Ft();
        if (N !== undefined && n === "served") ze(false);
        else if (ue) Ae();
        else at();
        return;
      }
      me("flag_off");
    },
    () => {
      x = true;
      me("flag_off");
    },
  ).finally(ce);
  let Nt = false;
  let It = () => {
    if (Nt || !e.epochGt1) return;
    Nt = true;
    e.sidecarState(t.configHome)
      .then(async (r) => {
        it =
          r === "valid" &&
          t.foreignFiles !== "replaced" &&
          (await e.readSidecar(t.configHome))?.settingsSha256 === null;
        return it ? "absent" : r;
      })
      .catch(() => "invalid")
      .then((r) => {
        ot = r;
        xt();
        if (r !== "absent") {
          if (r === "invalid" && (!re || Ye)) ge("sidecar_invalid", 0, e.now());
          re = true;
          ae = false;
        }
        Ae();
        ce();
      });
  };
  if (ae) It();
  for (let r of e.announcements.remembered()) At(r);
  let Dn = e.announcements.subscribe((r) => {
    queueMicrotask(() => {
      At(r);
      ce();
    });
  });
  let Wt = () => {};
  we = true;
  try {
    Wt = e.verdicts.subscribe((r) => {
      let s = we;
      queueMicrotask(() => {
        wn(r, s);
        ce();
      });
    });
  } catch {
    logForDiagnosticsNoPII("error", "home_seed_verdict_subscribe_threw", {});
  } finally {
    we = false;
  }
  return {
    beforeTurn: (r) => Mn(r).then(xe),
    state: () => ({
      verdict: n,
      deaf: l,
      deafReason: d,
      lastAppliedGeneration,
      pending: st() !== undefined || X || !re,
      runs: M,
      restore: Re ? (X && ee ? "running" : "done") : ee ? "armed" : ae ? "provisional" : re ? "done" : "none",
    }),
    onApplied: (r) => {
      w.add(r);
      runGuarded(r, P, "home_seed_applied_listener_threw");
      P = undefined;
      return () => w.delete(r);
    },
    onRestore: (r) => {
      v.add(r);
      runGuarded(
        (s) => {
          if (s.kind === "not_restored") Ce = s.reason;
          r(s);
        },
        E,
        "home_seed_restore_listener_threw",
      );
      E = undefined;
      return () => v.delete(r);
    },
    stop: () => {
      u = true;
      Dn();
      Wt();
      me("stopped");
    },
  };
}
export {
  HOLD_MAX_MS,
  VERDICT_WAIT_MAX_MS,
  createHomeSeedAnnouncer,
  REQUEST_ATTEMPTS,
  REQUEST_RETRY_DELAY_MS,
  PERMISSIONS_FROM_ANY_PACK,
};
