/**
 * utils/permissions/serverClassifier/clamp.ts
 *
 * 2.1.316 新增：分类器结果收紧
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
 */
import {
  o$e,
  Dao,
  DP,
  Mao,
  xao,
  Pao,
  Oao,
  n$e,
  Iao,
  pTt,
  fTt,
  mTt,
  Eao,
  hTt,
  yTt,
  JUr,
  s3n,
} from "./schemas.js";
import { w$o } from "./context.js";
import { jsonStringify } from "../../slowOperations.js";
import { xr } from "../../../../vendor/lodash-es/_inlinedHelpers.js";

/**
 * 收紧发给分类器的 Artifact 状态：截断过长字符串与列表、能力过大时只留键、保留最近的若干 slug/路径条目；整体仍超上限时成半删减，出现截断时标记 truncated。
 */
//@ chunk-e6aww6q8.js:137136-139612 placement
function clampArtifactClassifierState(e) {
  let truncated = e.truncated === !0,
    clampString = (we, Ee = o$e) => {
      if (we.length <= Ee) return we;
      return ((truncated = !0), we.slice(0, Ee));
    },
    clampList = (we, Ee) => {
      if (we.length > Ee) truncated = !0;
      return we.slice(0, Ee);
    },
    filterAndClamp = (we, Ee, Ae, Ie = o$e) => {
      let filtered = we.filter((We) => Ae(We).length <= Ie);
      if (filtered.length !== we.length) truncated = !0;
      return clampList(filtered, Ee);
    },
    keepRecentEntries = (we, Ee, Ae) => {
      let filtered = we.filter(([Me]) => Me.length <= Ae);
      if (filtered.length !== we.length || filtered.length > Ee) truncated = !0;
      return filtered.slice(Math.max(0, filtered.length - Ee));
    },
    clampCapabilities = (we) => {
      if (W_e(we) <= Dao) return { capabilities: we };
      return (
        (truncated = !0),
        { capabilities: Object.fromEntries(Object.keys(we).map((Ee) => [Ee, {}])), capabilities_cut: !0 }
      );
    },
    clampConnectors = (we) => {
      if (we === void 0) return {};
      if (!w$o(we)) return ((truncated = !0), {});
      return { endpoint_connectors: [...we] };
    },
    clampShare = ({ endpoint_connectors: endpoint_connectors, ...Ee }) => ({
      ...Ee,
      ...clampConnectors(endpoint_connectors),
      mode: clampString(Ee.mode, DP),
      ...(Ee.role !== void 0 && { role: clampString(Ee.role, DP) }),
      ...(Ee.artifact_kind !== void 0 && { artifact_kind: clampString(Ee.artifact_kind, DP) }),
      ...(Ee.live_paths !== void 0 && { live_paths: filterAndClamp(Ee.live_paths, Mao, (Ae) => Ae) }),
      ...(Ee.capabilities !== void 0 && clampCapabilities(Ee.capabilities)),
    }),
    fromEntries = Object.fromEntries(
      keepRecentEntries(Object.entries(e.by_slug), xao, DP).map(([we, Ee]) => [
        we,
        {
          ...Ee,
          ...(Ee.share !== void 0 && { share: clampShare(Ee.share) }),
          ...(Ee.attested !== void 0 && { attested: clampString(Ee.attested, DP) }),
        },
      ]),
    ),
    fromEntries_2 = Object.fromEntries(
      keepRecentEntries(Object.entries(e.by_path), Pao, o$e).map(([we, Ee]) => [
        we,
        {
          ...(Ee.slug !== void 0 && Ee.slug.length <= DP && { slug: Ee.slug }),
          ...(Ee.thumbnail_named !== void 0 && {
            thumbnail_named: filterAndClamp(Ee.thumbnail_named, Oao, (Ae) => Ae),
          }),
        },
      ]),
    ),
    session = e.session,
    clamped = {
      by_slug: fromEntries,
      by_path: fromEntries_2,
      live_docs: filterAndClamp(
        filterAndClamp(
          filterAndClamp(e.live_docs, 1 / 0, (we) => we.slug, DP),
          1 / 0,
          (we) => we.live_path,
        ),
        n$e,
        (we) => we.working_copy,
      ),
      room_armed: filterAndClamp(e.room_armed, n$e, (we) => we),
      type_reads: Object.fromEntries(keepRecentEntries(Object.entries(e.type_reads), n$e, DP)),
      ...(e.last_publish !== void 0 && {
        last_publish: { slug: clampString(e.last_publish.slug, DP), env: e.last_publish.env },
      }),
      session: {
        ...session,
        viewer_origin: clampString(session.viewer_origin),
        ...(session.dev_viewer_origin !== void 0 && {
          dev_viewer_origin: clampString(session.dev_viewer_origin),
        }),
        scratchpad_dir: session.scratchpad_dir === null ? null : clampString(session.scratchpad_dir),
        ...(session.tool_results_dir !== void 0 && {
          tool_results_dir: clampString(session.tool_results_dir),
        }),
      },
    },
    dropHalfKeys = (we) => {
      let keys = Object.keys(we);
      if (keys.length === 0) return !1;
      for (let Ae of keys.slice(0, Math.ceil(keys.length / 2))) delete we[Ae];
      return !0;
    };
  while (W_e(clamped) > Iao) {
    truncated = !0;
    let [we, Ee] =
      W_e(clamped.by_slug) >= W_e(clamped.by_path)
        ? [clamped.by_slug, clamped.by_path]
        : [clamped.by_path, clamped.by_slug];
    if (dropHalfKeys(we) || dropHalfKeys(Ee)) continue;
    if (clamped.live_docs.length + clamped.room_armed.length > 0) {
      ((clamped.live_docs = clamped.live_docs.slice(0, clamped.live_docs.length >> 1)),
        (clamped.room_armed = clamped.room_armed.slice(0, clamped.room_armed.length >> 1)));
      continue;
    }
    break;
  }
  return { ...clamped, ...(truncated && { truncated: !0 }) };
}
//@ chunk-e6aww6q8.js:139612-139659 placement
function W_e(e) {
  return Buffer.byteLength(jsonStringify(e));
}
//@ chunk-e6aww6q8.js:139659-139733 placement
function _Tt(e, n, r, s) {
  if (e.length <= n) return e;
  return ((r[s] = !0), e.slice(0, n));
}
//@ chunk-e6aww6q8.js:139733-139793 placement
function STt(e, n, r) {
  if (r > 0) e.dropped[n] = (e.dropped[n] ?? 0) + r;
}
/**
 * 收紧分类器结论：路径或身份受限时把允许改为询问或拒绝。
 */
//@ chunk-e6aww6q8.js:139793-142959 placement
function clampClassifierVerdict(e, n, r) {
  let s = n,
    h = 0,
    y = { bytes: 0, allowDropped: 0 };
  for (;;) {
    let S = {
        pathClamped: !1,
        identityClamped: !1,
        listCapped: !1,
        spellingsShed: !1,
        dropped: { ...e.dropped },
      },
      w = (Me) => _Tt(Me, pTt, S, "pathClamped"),
      L = (Me) => ({
        rule: Me.rule,
        ...(Me.canonical !== void 0 && { canonical: Me.canonical }),
        source: Me.source,
        ...(Me.root !== void 0 && { root: Me.root === null ? null : w(Me.root) }),
        ...(Me.pattern !== void 0 && { pattern: Me.pattern }),
      }),
      G = (Me, We) => {
        let ze = Me === "allow" ? fTt : pTt,
          filtered = We.filter((Je) => Je.rule.length <= ze);
        if ((STt(S, Me, We.length - filtered.length), Me !== "allow" || filtered.length <= s))
          return filtered.map(L);
        return (STt(S, Me, filtered.length - s), filtered.slice(0, s).map(L));
      },
      q = () => e.truncated === !0 || S.pathClamped || S.identityClamped || S.listCapped || S.spellingsShed,
      Z = (Me) => {
        if (h >= 2 && Me.resolved.length > 0) S.spellingsShed = !0;
        return { path: w(Me.path), resolved: h >= 2 ? [] : Me.resolved.map(w) };
      },
      sliced = e.trusted_directories.additional.slice(0, mTt);
    if (sliced.length < e.trusted_directories.additional.length) S.listCapped = !0;
    let mapped = e.trusted_directories.network.slice(0, mTt).map(w);
    if (mapped.length < e.trusted_directories.network.length) S.listCapped = !0;
    let we = {
        permission_mode: e.permission_mode,
        platform: e.platform,
        ...(e.live_cwd !== void 0 && { live_cwd: w(e.live_cwd) }),
        ...(e.home_dir !== void 0 && { home_dir: w(e.home_dir) }),
        rule_roots: xr(e.rule_roots, w),
        trusted_directories: {
          ...(e.trusted_directories.primary !== void 0 && { primary: Z(e.trusted_directories.primary) }),
          additional: sliced.map((Me) => ({ ...Z(Me), source: Me.source })),
          network: mapped,
          block_reads_outside_working_directories:
            e.trusted_directories.block_reads_outside_working_directories,
        },
        rules: {
          allow: G("allow", e.rules.allow),
          deny: G("deny", e.rules.deny),
          ask: G("ask", e.rules.ask),
        },
        auto_mode: {
          allow: [...e.auto_mode.allow],
          soft_deny: [...e.auto_mode.soft_deny],
          hard_deny: [...e.auto_mode.hard_deny],
          environment: [...e.auto_mode.environment],
        },
        artifact_consent_holdback: e.artifact_consent_holdback,
        ...(e.chrome_navigation !== void 0 && { chrome_navigation: e.chrome_navigation }),
        case_insensitive_paths: e.case_insensitive_paths,
        restricted: e.restricted,
        is_remote_mode: e.is_remote_mode,
        classify_all_shell: e.classify_all_shell,
        ...(e.mcp_allow_rules_exact === !0 && { mcp_allow_rules_exact: !0 }),
        user_identity: e.user_identity === null ? null : _Tt(e.user_identity, fTt, S, "identityClamped"),
        ...(Object.keys(S.dropped).length > 0 && { dropped: S.dropped }),
        ...(q() && { truncated: !0 }),
      },
      Ee = W_e(we);
    if (h === 0) y = { bytes: Ee, allowDropped: S.dropped.allow ?? 0 };
    let Ae = Ee > Eao;
    if (Ae) {
      if (h === 0 || (h === 1 && s > 0)) {
        ((h = 1), (s = Math.floor(s / 2)));
        continue;
      }
      if (h < 2) {
        h++;
        continue;
      }
    }
    let Ie = Ae ? { ...we, truncated: !0 } : we;
    if (Ie.truncated === !0 || Ie.dropped !== void 0)
      r({
        bytes: Ie === we ? Ee : W_e(Ie),
        bytesBeforeShedding: y.bytes,
        overCapBeforeShedding: h > 0,
        overCap: Ae,
        allowRulesShed: (S.dropped.allow ?? 0) - y.allowDropped,
        resolvedSpellingsShed: S.spellingsShed,
        pathClamped: S.pathClamped,
        identityClamped: S.identityClamped,
        additionalDirectories: e.trusted_directories.additional.length,
        networkRoots: e.trusted_directories.network.length,
        arrivedTruncated: e.truncated === !0,
        truncated: Ie.truncated === !0,
        dropped: S.dropped,
        denyRules: e.rules.deny.length,
        askRules: e.rules.ask.length,
        autoMode: {
          allow: e.auto_mode.allow.length,
          softDeny: e.auto_mode.soft_deny.length,
          hardDeny: e.auto_mode.hard_deny.length,
          environment: e.auto_mode.environment.length,
        },
      });
    return Ie;
  }
}
/**
 * 收紧发给分类器的 git 状态：路径/分支与主机名截断，remote 与可见性缓存条数限制，出现截断时标记 truncated。
 */
//@ chunk-e6aww6q8.js:142959-143633 placement
function clampGitStateForClassifier(e) {
  let truncated = e.truncated === !0,
    clampPath = (w) => {
      if (w.length <= hTt) return w;
      return ((truncated = !0), w.slice(0, hTt));
    },
    clampNullablePath = (w) => (w === null ? null : clampPath(w)),
    clampHost = (w) => {
      if (w.length <= yTt) return w;
      return ((truncated = !0), w.slice(0, yTt));
    },
    clampList = (w, L) => {
      if (w.length > L) truncated = !0;
      return w.slice(0, L);
    },
    visibility = e.visibility;
  return {
    cwd: clampNullablePath(e.cwd),
    root: clampNullablePath(e.root),
    branch: clampNullablePath(e.branch),
    default_branch: clampNullablePath(e.default_branch),
    status: e.status,
    visibility:
      visibility === null
        ? null
        : {
            origin:
              visibility.origin === null
                ? null
                : { ...visibility.origin, host: clampHost(visibility.origin.host) },
            push_remote: clampNullablePath(visibility.push_remote),
            remotes: clampList(visibility.remotes, JUr).map((w) => ({ ...w, host: clampHost(w.host) })),
            visibility_cache: clampList(visibility.visibility_cache, s3n).map((w) => ({
              ...w,
              host: clampHost(w.host),
            })),
          },
    ...(e.error !== void 0 && { error: e.error }),
    ...(truncated && { truncated: !0 }),
  };
}

export { clampArtifactClassifierState, W_e, clampClassifierVerdict, clampGitStateForClassifier };
