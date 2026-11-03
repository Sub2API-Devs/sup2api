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
import { planHomeSeedApply, Ve, toStringArray, Xe, Pe, qe } from "./homeSidecar.js";
import { uniq } from "../../utils/collections.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { classifyRowError } from "./destination.js";

//@ chunk-twq47pff.js:16188-16402 placement
var HOLD_MAX_MS = 300000,
  VERDICT_WAIT_MAX_MS = 60000,
  REQUEST_ATTEMPTS = 3,
  REQUEST_RETRY_DELAY_MS = 500,
  ANNOUNCE_POLL_MS = 2000,
  PERMISSIONS_FROM_ANY_PACK = !0,
  ANNOUNCED_RULE_RE = /^[A-Za-z][A-Za-z0-9_*-]{0,127}(?:\([A-Za-z0-9 ._\-/:*~@+=,]{1,64}\))?$/,
  MAX_ANNOUNCED_RULES = 200,
  RESTORED_WITHOUT_ANNOUNCEMENT = "restored-without-announcement",
  INITIAL_ANNOUNCEMENT = { etag: "", beforeFirstCommand: !0, ordinal: 0.5 };
//@ chunk-twq47pff.js:16402-16466 placement
function Un(t) {
  try {
    return t.enabledNow?.() === !0;
  } catch {
    return !1;
  }
}
//@ chunk-twq47pff.js:16466-16560 placement
function Gt(t, e, n) {
  if (e === void 0) return;
  queueMicrotask(() => {
    try {
      t(e);
    } catch {
      logForDiagnosticsNoPII("error", n, {});
    }
  });
}
/**
 * home seed 应用过程的用户提示状态机（外来文件替换、恢复提示、询问等）。
 */
//@ chunk-twq47pff.js:16560-32742 placement
function createHomeSeedAnnouncer(t, e) {
  let n,
    l = !1,
    d,
    u = !1,
    w = new Set(),
    v = new Set(),
    P,
    E,
    y = !1,
    j = 0,
    M = 0,
    Q = !1,
    x = !1,
    N,
    q,
    X = !1,
    Te = 0,
    K,
    de,
    ue = !1,
    se,
    Me = t.foreignFiles !== "replaced",
    be,
    Be,
    we = !1,
    S = !1,
    ee = !1,
    re = !e.epochGt1,
    ae = e.epochGt1 && Un(e),
    Re = !1,
    De = !1,
    Ce,
    ve,
    nt = !1,
    ot,
    it = !1,
    Ht = !1,
    He = new Set(),
    ce = () => {
      for (let r of [...He]) r();
    },
    me = (r) => {
      if (!l) {
        if (((d = r), N !== void 0 || q !== void 0)) Et();
      }
      if (((l = !0), (N = void 0), (q = void 0), ee && !Re)) Z("lane_unavailable", 0, e.now(), !1);
      ((ee = !1), (ae = !1), (re = !0), ce());
    },
    Et = () => {
      if (!y)
        ((y = !0),
          logForDiagnosticsNoPII("info", "home_seed_announcement_discarded", { reason: d ?? "stopped" }));
    },
    st = () => {
      let filtered = [N, q, ee || ae ? INITIAL_ANNOUNCEMENT : void 0].filter((s) => s !== void 0);
      return filtered.length === 0 ? void 0 : filtered.reduce((s, R) => (R.ordinal > s.ordinal ? R : s));
    };
  function At(r) {
    if (l || u) {
      Et();
      return;
    }
    if (r.etag === N?.etag || r.etag === q?.etag) return;
    if (r.etag === de) {
      if (se !== void 0 && K === void 0) K = { etag: r.etag, ready: On(se), readyWritten: !1 };
      if (K !== void 0 && !K.readyWritten)
        if (X || !Q || n !== "served") ue = !0;
        else dt();
      return;
    }
    if (K !== void 0 && r.etag === K.etag) {
      if (!K.readyWritten)
        if (X) ue = !0;
        else dt();
      return;
    }
    if (((N = r), e.epochGt1 && !Ht)) {
      Ht = !0;
      let now = e.now();
      ((be ??= e.readSidecar(t.configHome).catch(() => null)),
        be.then((R) => {
          Sn(R, now);
        }));
    }
    if (n === "served") ze(!1);
  }
  function Sn(r, s) {
    if (
      r === null ||
      r.packEtag === void 0 ||
      r.packEtag === RESTORED_WITHOUT_ANNOUNCEMENT ||
      N?.etag !== r.packEtag ||
      K !== void 0 ||
      de !== void 0
    )
      return;
    ((de = r.packEtag),
      (se = r),
      (N = void 0),
      lt(),
      ne("already_applied", "none", null, r.generation, s),
      ce());
  }
  function wn(r, s) {
    if (l || u) return;
    if (((n = r), r === "served")) {
      if (N !== void 0) ze(!s);
      else if (ue) Ae();
      else (at(!s), Ie(s));
      return;
    }
    me(r === "off" ? "verdict_off" : "verdict_refused");
  }
  function Ft() {
    if (!re && Q && ot === "absent" && !l && !u) ((re = !0), (ee = !0), (ae = !1));
  }
  function at(r = !1) {
    if ((Ft(), !ee || n !== "served" || X || l || u)) return;
    ((X = !0), (Re = !0));
    let now = e.now();
    Rn(!r, now)
      .catch((R) => {
        (logForDiagnosticsNoPII("error", "home_seed_recovery_threw", { name: safeErrorName(R) }),
          ge("threw", 0, now));
      })
      .finally(() => {
        if (((X = !1), (ee = !1), ce(), Ae(), q === void 0 || S)) xe();
      });
  }
  async function Rn(r, s) {
    if ((M++, r)) {
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
      if (row.kind === "not_found") Z("no_ready_row", 0, s, !1);
      else {
        let te = Ge(row);
        if (te === "refused") me("ready_refused");
        Z(te === "auth" ? "auth_failed" : "request_failed", 0, s, te === "auth");
      }
      return;
    }
    let b = parseHomeReadyRow(row.buf);
    if (!b.ok) {
      Z("ready_unreadable", 0, s, !0);
      return;
    }
    let generation = b.ready.generation,
      row_2 = await e.getRow(joined_5);
    if (Ee(s)) return;
    if (row_2.kind !== "ok") {
      let te = row_2.kind === "not_found" ? "not_found" : Ge(row_2);
      if (te === "refused") me("pack_refused");
      Z(
        te === "not_found" ? "pack_absent" : te === "auth" ? "auth_failed" : "request_failed",
        generation,
        s,
        !0,
      );
      return;
    }
    let C = decodeHomePack(row_2.buf);
    if (!C.ok) {
      (logForDiagnosticsNoPII("warn", "home_seed_bad_pack", { reason: C.reason }),
        Z("pack_unreadable", generation, s, !0));
      return;
    }
    if (C.pack.generation !== generation) {
      Z("generation_mismatch", generation, s, !0);
      return;
    }
    let U = planHomeSeedApply({
      pack: C.pack,
      packEtag: RESTORED_WITHOUT_ANNOUNCEMENT,
      refused: C.refused,
      sidecar: null,
      lastAppliedGeneration: 0,
      permissionsAdmissible: !1,
      onlyClaudeMd: t.onlyClaudeMd === !0,
    });
    if (U.kind === "stale_generation") {
      Z("generation_mismatch", generation, s, !0);
      return;
    }
    if (C.refused.settings !== "none") {
      Z("settings_refused", generation, s, !0);
      return;
    }
    let W = Pt(U.plan, C.pack.settings);
    if (W.deny.length === 0 && W.ask.length === 0) {
      if (W.dropped > 0) Z("rules_unverifiable", generation, s, !0, W.dropped);
      else Z("no_rules", generation, s, !1);
      return;
    }
    if (t.settingsPath === void 0) {
      Z("no_rules", generation, s, !1);
      return;
    }
    let B = await e.readStandingSettings(t.settingsPath).catch(() => ({ kind: "unusable" }));
    if (Ee(s)) return;
    let L = B.kind === "unusable" ? null : vn(U.plan, W, B);
    if (L === null) {
      Z("settings_unusable", generation, s, !0);
      return;
    }
    let execute = await e.execute(L, t, e.applyDeps()),
      _e = !S;
    if (execute.outcome === "config_home_unsafe" || execute.outcome === "flag_off") {
      (ne(execute.outcome, "recovery", execute, execute.generation, s),
        Z("nothing_applied", generation, s, !1));
      return;
    }
    if (!execute.settingsWritten) {
      (ne(execute.outcome, "recovery", execute, execute.generation, s),
        Z("nothing_applied", generation, s, !0));
      return;
    }
    try {
      e.afterApply(execute, { beforeFirstAsk: _e, applied: Dt(L, execute) });
    } catch {
      logForDiagnosticsNoPII("error", "home_seed_after_apply_threw", {});
    }
    ((ve = {
      kind: "restored",
      denyRules: W.deny.length,
      askRules: W.ask.length,
      droppedRules: W.dropped,
      beforeFirstAsk: _e,
      duringHold: He.size > 0,
      keepsForeignFiles: Me,
    }),
      ne(execute.outcome, "recovery", execute, execute.generation, s),
      ge("restored", generation, s, W.dropped));
  }
  function Pt(r, s) {
    let R = r.settings?.document.permissions,
      b = (B) => (B ?? []).filter((L) => ANNOUNCED_RULE_RE.test(L)).slice(0, MAX_ANNOUNCED_RULES),
      h = b(R?.deny),
      I = b(R?.ask),
      safeParse = Ve().safeParse(s?.permissions),
      U = (B) => (safeParse.success ? uniq(toStringArray(safeParse.data[B])).length : 0),
      max = Math.max(0, U("deny") + U("ask") - h.length - I.length);
    return { deny: h, ask: I, dropped: max };
  }
  function vn(r, s, R) {
    let b = R.kind === "object" ? R.value : {},
      safeParse = Ve().safeParse(b.permissions);
    if (b.permissions !== void 0 && b.permissions !== null && !safeParse.success) return null;
    let I = safeParse.success ? safeParse.data : {},
      C = Xe(toStringArray(I.deny), s.deny),
      U = Xe(toStringArray(I.ask), s.ask),
      W = { ...b, permissions: { ...I, ...(C.length > 0 && { deny: C }), ...(U.length > 0 && { ask: U }) } },
      B =
        jsonStringify(W, null, 2) +
        `
`;
    if (Buffer.byteLength(B) > Pe) return null;
    return {
      ...r,
      writes: [],
      removals: [],
      counts: { ...r.counts, refilteredCredentialFiles: 0 },
      restoreRecord: !0,
      settings: {
        document: {
          permissions: {
            ...(s.deny.length > 0 && { deny: [...s.deny] }),
            ...(s.ask.length > 0 && { ask: [...s.ask] }),
          },
        },
        rendered: B,
        sha256: computeContentHash(B),
      },
    };
  }
  function Ge(r) {
    let s = classifyRowError(r);
    return (
      logForDiagnosticsNoPII("warn", "home_seed_lane_request_failed", {
        outcome: s,
        kind: r.errorKind,
        status: r.status ?? 0,
      }),
      s
    );
  }
  function Ee(r) {
    if (l || u) return (ge("gate_closed", 0, r), !0);
    return !1;
  }
  function lt() {
    if (ee) ((ee = !1), ge("superseded", 0, e.now()));
    ((re = !0), (ae = !1));
  }
  function Z(r, s, R, b, h = 0) {
    if (((ee = !1), ge(r, s, R, h), b && En(r)))
      ve = { kind: "not_restored", reason: r, keepsForeignFiles: Me };
  }
  function xe() {
    let r = ve;
    if (((ve = void 0), r !== void 0)) Tt(r);
  }
  let Ot = () => N !== void 0 || q !== void 0 || K !== void 0 || de !== void 0;
  function Ie(r = !0) {
    if (!De || !S || n !== "served" || l || u || Ot()) return;
    De = !1;
    let now = e.now();
    Hn(r, now).catch((R) => {
      (logForDiagnosticsNoPII("error", "home_seed_recovery_threw", { name: safeErrorName(R) }),
        ge("threw", 0, now));
    });
  }
  async function Hn(r, s) {
    let R = (h) => {
      (Z(Ge(h) === "auth" ? "auth_failed" : "request_failed", 0, s, !1), (De = !0));
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
      De = !0;
      return;
    }
    if (row.kind === "not_found") {
      Z("no_ready_row", 0, s, !1);
      return;
    }
    if (row.kind !== "ok") {
      R(row);
      return;
    }
    (Z("settings_gone", 0, s, !0), xe());
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
  function ge(r, s, R, b = 0) {
    try {
      e.telemetry.recovery({
        outcome: r,
        generation: s,
        durationMs: e.now() - R,
        rulesDropped: b,
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
      if (((E = v.size === 0 ? r : void 0), r.kind === "not_restored" && v.size > 0)) Ce = r.reason;
      s(v, r, "home_seed_restore_listener_threw");
    } else ((P = w.size === 0 ? r : void 0), s(w, r, "home_seed_applied_listener_threw"));
  }
  function ze(r) {
    if (!Q || X || N === void 0 || l || u) return;
    if (nt && !re) return;
    ((X = !0),
      An(r)
        .catch((s) => {
          logForDiagnosticsNoPII("error", "home_seed_run_threw", { name: safeErrorName(s) });
        })
        .finally(() => {
          ((X = !1), (q = void 0), xe(), ce(), Ae(), Ie());
        }));
  }
  function Ae() {
    if ((at(), X)) return;
    if (N !== void 0 && n === "served") {
      if ((ze(!1), X)) ue = !1;
      return;
    }
    if (!ue) return;
    if (K === void 0 || K.readyWritten) {
      ue = !1;
      return;
    }
    if ((dt(), X)) ue = !1;
  }
  function dt() {
    if (K === void 0 || X || l || u || !Q || n !== "served") return;
    let r = K;
    ((X = !0),
      ut(r.ready)
        .then((s) => {
          if (s) r.readyWritten = !0;
        })
        .catch((s) => {
          logForDiagnosticsNoPII("error", "home_seed_run_threw", { name: safeErrorName(s) });
        })
        .finally(() => {
          ((X = !1), ce(), Ae());
        }));
  }
  async function An(r) {
    let now = e.now(),
      R = N;
    if (R === void 0) return;
    if (((N = void 0), K !== void 0 && R.etag === K.etag)) {
      if (!K.readyWritten) K.readyWritten = await ut(K.ready);
      return;
    }
    if (R.etag === de) return;
    if (((q = R), (nt = !0), M++, e.epochGt1 && K === void 0 && de === void 0)) {
      let ie = await (be ?? e.readSidecar(t.configHome));
      if (ie?.packEtag === R.etag && R.etag !== RESTORED_WITHOUT_ANNOUNCEMENT) {
        ((de = R.etag), (se = ie), lt(), ne("already_applied", "none", null, ie.generation, now));
        return;
      }
    }
    let b = "verdict_wake";
    if (!r) {
      let ie = await Ct(joined);
      if (ie.kind === "deaf") return;
      if (((b = Pn(ie.kind)), ie.kind === "refused" || ie.kind === "rejected")) {
        (ne("refused_lane", b, null, 0, now), me("probe_refused"));
        return;
      }
      if (ie.kind === "auth" || ie.kind === "transport") {
        ne(ie.kind === "auth" ? "auth_skipped" : "transport_failed", b, null, 0, now);
        return;
      }
    }
    let h = await Ct(joined_5);
    switch (h.kind) {
      case "deaf":
        return;
      case "refused":
        (ne("refused_lane", b, null, 0, now), me("pack_refused"));
        return;
      case "rejected":
        ne("request_rejected", b, null, 0, now);
        return;
      case "auth":
      case "transport":
        ne(h.kind === "auth" ? "auth_skipped" : "transport_failed", b, null, 0, now);
        return;
      case "not_found":
        ne("pack_absent", b, null, 0, now);
        return;
      case "ok":
        break;
    }
    let last = e.announcements.remembered().findLast((ie) => ie.etag === h.etag);
    if (last === void 0) {
      ne("unannounced_row", b, null, 0, now);
      return;
    }
    let C = decodeHomePack(h.buf);
    if (!C.ok) {
      (logForDiagnosticsNoPII("warn", "home_seed_bad_pack", { reason: C.reason }),
        ne("bad_pack", b, null, 0, now));
      return;
    }
    let U = planHomeSeedApply({
      pack: C.pack,
      packEtag: h.etag,
      refused: C.refused,
      sidecar: await e.readSidecar(t.configHome),
      lastAppliedGeneration: j,
      permissionsAdmissible:
        e.limits.permissionsFromAnyAnnouncedPack || (last.beforeFirstCommand && !e.epochGt1),
      onlyClaudeMd: t.onlyClaudeMd === !0,
    });
    if (U.kind === "stale_generation") {
      ne("stale_generation", b, null, U.generation, now);
      return;
    }
    let W = t.foreignFiles !== "replaced" && t.onlyClaudeMd !== !0 ? Pt(U.plan, C.pack.settings) : null,
      B =
        W === null
          ? U.plan
          : {
              ...U.plan,
              restrictingSettings: {
                plan:
                  W.deny.length === 0 && W.ask.length === 0
                    ? null
                    : qe({
                        permissions: {
                          ...(W.deny.length > 0 && { deny: [...W.deny] }),
                          ...(W.ask.length > 0 && { ask: [...W.ask] }),
                        },
                      }),
                rulesLeftOut: W.dropped,
              },
            },
      execute = await e.execute(B, t, e.applyDeps()),
      G = !S;
    if (execute.outcome === "config_home_unsafe" || execute.outcome === "flag_off") {
      ne(execute.outcome, b, execute, execute.generation, now);
      return;
    }
    j = execute.generation;
    let _e = { beforeFirstAsk: G, applied: Dt(B, execute) };
    try {
      e.afterApply(execute, _e);
    } catch {
      logForDiagnosticsNoPII("error", "home_seed_after_apply_threw", {});
    }
    lt();
    let te = execute.settingsWritten && (ve ?? E) !== void 0;
    if (te) ((ve = void 0), (E = void 0));
    xe();
    let he = He.size > 0,
      Lt = await Fn(B, execute),
      ft = Ce !== void 0 && (Ce === "settings_gone" || execute.settingsWritten);
    if (
      (Tt({
        ..._e,
        outcome: execute.outcome,
        generation: execute.generation,
        duringHold: he || He.size > 0,
        outputStyleMissing: Lt === "unresolved",
        answersNotRestored: ft,
      }),
      ft && execute.outcome === "applied")
    )
      Ce = void 0;
    ne(execute.outcome, b, execute, execute.generation, now, {
      appliedBeforeFirstAsk: G,
      outputStyleCheck: Lt,
      restoreNoticeSuperseded: te,
      answersNotRestored: ft,
    });
    let Kt = Tn(execute, G),
      $t = { etag: h.etag, ready: Kt, readyWritten: !1 };
    ((K = $t), (q = void 0), ce(), ($t.readyWritten = await ut(Kt)));
  }
  function Mt(r, s) {
    if (!s.settingsWritten) return;
    return (s.settingsKeptForeign ? r.restrictingSettings?.plan : r.settings)?.document;
  }
  function Dt(r, s) {
    let R = Mt(r, s),
      b = R?.permissions;
    return {
      claudeMd: s.appliedByKind.claude_md > 0,
      rules: s.appliedByKind.rule,
      outputStyles: s.appliedByKind.output_style,
      permissionRules: (b?.allow?.length ?? 0) + (b?.deny?.length ?? 0) + (b?.ask?.length ?? 0),
      settingsKeys: Object.keys(R ?? {}).filter((h) => h !== "permissions"),
      settingsNotWritten: s.settingsAttempted && !s.settingsWritten && !s.settingsKeptForeign,
      settingsRefused: s.settingsRefused !== "none" && !s.settingsKeptForeign,
      settingsKeptForeign: s.settingsKeptForeign,
      credentialRestrictionsLeftOut: s.refilteredCredentialRestrictions,
      rulesLeftOut: Math.max(0, s.rulesLeftOut - s.refilteredCredentialRestrictions),
      credentialFilesLeftOut: s.filesRefused.credential,
      filesKeptForeign: s.filesRefused.keptForeign,
      filesNotApplied:
        Object.values(s.filesRefused).reduce((h, I) => h + I, 0) -
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
    let R = Mt(r, s)?.outputStyle,
      outputStyleAvailable = e.outputStyleAvailable;
    if (R === void 0 || outputStyleAvailable === void 0) return "not_asked";
    let promise = await new Promise((I) => {
      let setTimer = e.setTimer(() => I("ask_capped"), ANNOUNCE_POLL_MS);
      Promise.resolve()
        .then(() => outputStyleAvailable(R))
        .then(
          (U) => (U ? "available" : "unresolved"),
          () => "ask_failed",
        )
        .then((U) => {
          (setTimer(), I(U));
        });
    });
    if (promise === "unresolved") logForDiagnosticsNoPII("info", "home_seed_output_style_unresolved", {});
    return promise;
  }
  function Pn(r) {
    switch (r) {
      case "ok":
        return "found";
      case "not_found":
        return "absent";
      case "refused":
      case "rejected":
        return "refused";
      case "auth":
      case "transport":
        return r;
    }
  }
  function ne(
    r,
    s,
    R,
    b,
    h,
    I = {
      appliedBeforeFirstAsk: !S,
      outputStyleCheck: "not_asked",
      restoreNoticeSuperseded: !1,
      answersNotRestored: !1,
    },
  ) {
    try {
      e.telemetry.apply({
        outcome: r,
        probe: s,
        report: R,
        generation: b,
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
    for (let R = 1; ; R++) {
      if (l || u) return { kind: "deaf" };
      let row = await e.getRow(r);
      if (row.kind === "ok") return { kind: "ok", buf: row.buf, etag: row.content_sha256 };
      if (row.kind === "not_found") return { kind: "not_found" };
      let h = classifyRowError(row);
      if (h !== "transport" || R >= e.limits.requestAttempts)
        return (
          logForDiagnosticsNoPII("warn", "home_seed_lane_request_failed", {
            outcome: h,
            kind: row.errorKind,
            status: row.status ?? 0,
          }),
          { kind: h }
        );
      (await e.sleep(requestRetryDelayMs), (requestRetryDelayMs *= 2));
    }
  }
  async function ut(r) {
    let requestRetryDelayMs = e.limits.requestRetryDelayMs,
      R = !1;
    for (let b = 1; ; b++) {
      if (l || u) return !1;
      let putRow = await e.putRow(joined_6, r, Be);
      if (putRow.kind === "ok") return ((Be = putRow.content_sha256), !0);
      if (putRow.kind === "conflict" && !R) {
        if (((R = !0), l || u)) return !1;
        let row = await e.getRow(joined_6);
        Be = row.kind === "ok" ? row.content_sha256 : void 0;
        continue;
      }
      if (
        !(putRow.kind === "error" && classifyRowError(putRow) === "transport") ||
        b >= e.limits.requestAttempts
      )
        return (
          logForDiagnosticsNoPII("warn", "home_seed_ready_put_failed", {
            kind: putRow.kind,
            ...(putRow.kind === "error" && { errorKind: putRow.errorKind, status: putRow.status ?? 0 }),
          }),
          !1
        );
      (await e.sleep(requestRetryDelayMs), (requestRetryDelayMs *= 2));
    }
  }
  function On(r) {
    return encodeHomeReadyRow({
      generation: r.generation,
      appliedBeforeFirstAsk: !1,
      outcome: "applied",
      filesApplied: r.entries.length,
      filesRefused: 0,
      settingsWritten: r.settingsSha256 !== null,
      replacedForeign: 0,
      writtenAtMs: e.now(),
    });
  }
  function Tn(r, s) {
    return encodeHomeReadyRow({
      generation: r.generation,
      appliedBeforeFirstAsk: s,
      outcome: r.outcome === "applied" ? "applied" : "partial",
      filesApplied: r.filesApplied,
      filesRefused: Object.values(r.filesRefused).reduce((R, b) => R + b, 0) + r.filesFailed,
      settingsWritten: r.settingsWritten && r.settingsAttempted,
      replacedForeign: r.filesReplacedForeign + (r.replacedExistingSettings === "foreign" ? 1 : 0),
      writtenAtMs: e.now(),
    });
  }
  function Mn(r) {
    let now = e.now(),
      R = !S,
      b = () => {
        let h = l || u ? void 0 : st();
        return h !== void 0 && h.ordinal > Te ? h : void 0;
      };
    if (b() === void 0 || e.limits.holdMaxMs <= 0) return ((S = !0), Ie(), Promise.resolve());
    return new Promise((h) => {
      let I = !1,
        C = 0,
        U = n !== void 0 && x,
        W = [],
        B = (te) => {
          if (I) return;
          I = !0;
          for (let he of W) he();
          if ((He.delete(L), te !== "released" && te !== "gate_off")) Te = Math.max(Te, st()?.ordinal ?? 0);
          ((S = !0), Ie(), h());
          try {
            e.telemetry.hold({ outcome: te, waitedMs: e.now() - now, verdictWaitMs: C, firstAsk: R });
          } catch {
            logForDiagnosticsNoPII("error", "home_seed_telemetry_threw", {});
          }
        },
        L = () => {
          if (!U && n !== void 0 && x) ((U = !0), (C = e.now() - now), G());
          if (l || u) B("gate_off");
          else if (b() === void 0) B("released");
        },
        G = () => {};
      if (r.aborted) {
        B("interrupted");
        return;
      }
      if ((He.add(L), W.push(e.setTimer(() => B("timeout"), e.limits.holdMaxMs)), !U))
        ((G = e.setTimer(() => {
          if (((C = e.now() - now), n === void 0)) B("verdict_timeout");
          else if (!x) B("flag_timeout");
        }, e.limits.verdictWaitMaxMs)),
          W.push(() => G()));
      let _e = () => B("interrupted");
      (r.addEventListener("abort", _e, { once: !0 }), W.push(() => r.removeEventListener("abort", _e)));
    });
  }
  let ct;
  try {
    ct = e.enabled();
  } catch {
    ct = Promise.resolve(!1);
  }
  let Ye = !1,
    xt = () => {
      if (Ye && ot === "absent") ((Ye = !1), ge("restore_gate_off", 0, e.now()), (De = !0), Ie());
    };
  ct.then(
    (r) => {
      if (((x = !0), r === !0 || r === "announced_only")) {
        if (
          ((Q = !0),
          (Ye = e.epochGt1 && r !== !0),
          (re ||= r !== !0),
          xt(),
          (ae = !re),
          It(),
          Ft(),
          N !== void 0 && n === "served")
        )
          ze(!1);
        else if (ue) Ae();
        else at();
        return;
      }
      me("flag_off");
    },
    () => {
      ((x = !0), me("flag_off"));
    },
  ).finally(ce);
  let Nt = !1,
    It = () => {
      if (Nt || !e.epochGt1) return;
      ((Nt = !0),
        e
          .sidecarState(t.configHome)
          .then(
            async (r) => (
              (it =
                r === "valid" &&
                t.foreignFiles !== "replaced" &&
                (await e.readSidecar(t.configHome))?.settingsSha256 === null),
              it ? "absent" : r
            ),
          )
          .catch(() => "invalid")
          .then((r) => {
            if (((ot = r), xt(), r !== "absent")) {
              if (r === "invalid" && (!re || Ye)) ge("sidecar_invalid", 0, e.now());
              ((re = !0), (ae = !1));
            }
            (Ae(), ce());
          }));
    };
  if (ae) It();
  for (let r of e.announcements.remembered()) At(r);
  let subscribe = e.announcements.subscribe((r) => {
      queueMicrotask(() => {
        (At(r), ce());
      });
    }),
    Wt = () => {};
  we = !0;
  try {
    Wt = e.verdicts.subscribe((r) => {
      let s = we;
      queueMicrotask(() => {
        (wn(r, s), ce());
      });
    });
  } catch {
    logForDiagnosticsNoPII("error", "home_seed_verdict_subscribe_threw", {});
  } finally {
    we = !1;
  }
  return {
    beforeTurn: (r) => Mn(r).then(xe),
    state: () => ({
      verdict: n,
      deaf: l,
      deafReason: d,
      lastAppliedGeneration: j,
      pending: st() !== void 0 || X || !re,
      runs: M,
      restore: Re ? (X && ee ? "running" : "done") : ee ? "armed" : ae ? "provisional" : re ? "done" : "none",
    }),
    onApplied: (r) => (
      w.add(r),
      Gt(r, P, "home_seed_applied_listener_threw"),
      (P = void 0),
      () => w.delete(r)
    ),
    onRestore: (r) => (
      v.add(r),
      Gt(
        (s) => {
          if (s.kind === "not_restored") Ce = s.reason;
          r(s);
        },
        E,
        "home_seed_restore_listener_threw",
      ),
      (E = void 0),
      () => v.delete(r)
    ),
    stop: () => {
      ((u = !0), subscribe(), Wt(), me("stopped"));
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
