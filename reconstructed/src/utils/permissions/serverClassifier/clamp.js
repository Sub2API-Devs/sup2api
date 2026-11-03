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
  MAX_SESSION_TITLES,
  MAX_ARTIFACT_PATH_LENGTH,
  MAX_CONTEXT_TEXT_LENGTH,
  MAX_SAVED_RULES,
  MAX_TURN_TEXT_LENGTH,
  MAX_TURN_ATTACHMENT_LENGTH,
  MAX_SESSION_IDS,
  MAX_FILESYSTEM_PATH_LENGTH,
  MAX_ARTIFACT_SLUGS,
  MAX_RULES_PER_LIST,
  MAX_RULE_PATTERN_LENGTH,
  MAX_USER_IDENTITY_LENGTH,
  MAX_TRUSTED_DIR_ENTRIES,
  MAX_DROPPED_ENTRIES,
  MAX_PATH_FIELD_LENGTH,
  MAX_PERMISSION_MODE_LENGTH,
  MAX_PLATFORM_LENGTH,
} from "./schemas.js";
import { fitsContextLimits } from "./context.js";
import { jsonStringify } from "../../slowOperations.js";
import { xr } from "../../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-e6aww6q8.js:137136-139612 placement
/**
 * 收紧发给分类器的 Artifact 状态：截断过长字符串与列表、能力过大时只留键、保留最近的若干 slug/路径条目；整体仍超上限时成半删减，出现截断时标记 truncated。
 */
function clampArtifactClassifierState(e) {
  let truncated = e.truncated === true;
  let clampString = (we, Ee = MAX_SESSION_TITLES) => {
    if (we.length <= Ee) return we;
    truncated = true;
    return we.slice(0, Ee);
  };
  let clampList = (we, Ee) => {
    if (we.length > Ee) truncated = true;
    return we.slice(0, Ee);
  };
  let filterAndClamp = (we, Ee, Ae, Ie = MAX_SESSION_TITLES) => {
    let filtered = we.filter((We) => Ae(We).length <= Ie);
    if (filtered.length !== we.length) truncated = true;
    return clampList(filtered, Ee);
  };
  let keepRecentEntries = (we, Ee, Ae) => {
    let filtered = we.filter(([Me]) => Me.length <= Ae);
    if (filtered.length !== we.length || filtered.length > Ee) truncated = true;
    return filtered.slice(Math.max(0, filtered.length - Ee));
  };
  let clampCapabilities = (capabilities) => {
    if (jsonByteLength(capabilities) <= MAX_ARTIFACT_PATH_LENGTH)
      return {
        capabilities,
      };
    truncated = true;
    return {
      capabilities: Object.fromEntries(Object.keys(capabilities).map((key) => [key, {}])),
      capabilities_cut: true,
    };
  };
  let clampConnectors = (endpointConnectors) => {
    if (endpointConnectors === undefined) return {};
    if (!fitsContextLimits(endpointConnectors)) {
      truncated = true;
      return {};
    }
    return {
      endpoint_connectors: [...endpointConnectors],
    };
  };
  let clampShare = ({ endpoint_connectors: endpointConnectors, ...Ee }) => ({
    ...Ee,
    ...clampConnectors(endpointConnectors),
    mode: clampString(Ee.mode, MAX_CONTEXT_TEXT_LENGTH),
    ...(Ee.role !== undefined && {
      role: clampString(Ee.role, MAX_CONTEXT_TEXT_LENGTH),
    }),
    ...(Ee.artifact_kind !== undefined && {
      artifact_kind: clampString(Ee.artifact_kind, MAX_CONTEXT_TEXT_LENGTH),
    }),
    ...(Ee.live_paths !== undefined && {
      live_paths: filterAndClamp(Ee.live_paths, MAX_SAVED_RULES, (Ae) => Ae),
    }),
    ...(Ee.capabilities !== undefined && clampCapabilities(Ee.capabilities)),
  });
  let bySlug = Object.fromEntries(
    keepRecentEntries(Object.entries(e.by_slug), MAX_TURN_TEXT_LENGTH, MAX_CONTEXT_TEXT_LENGTH).map(
      ([we, Ee]) => [
        we,
        {
          ...Ee,
          ...(Ee.share !== undefined && {
            share: clampShare(Ee.share),
          }),
          ...(Ee.attested !== undefined && {
            attested: clampString(Ee.attested, MAX_CONTEXT_TEXT_LENGTH),
          }),
        },
      ],
    ),
  );
  let byPath = Object.fromEntries(
    keepRecentEntries(Object.entries(e.by_path), MAX_TURN_ATTACHMENT_LENGTH, MAX_SESSION_TITLES).map(
      ([we, Ee]) => [
        we,
        {
          ...(Ee.slug !== undefined &&
            Ee.slug.length <= MAX_CONTEXT_TEXT_LENGTH && {
              slug: Ee.slug,
            }),
          ...(Ee.thumbnail_named !== undefined && {
            thumbnail_named: filterAndClamp(Ee.thumbnail_named, MAX_SESSION_IDS, (Ae) => Ae),
          }),
        },
      ],
    ),
  );
  let session = e.session;
  let clamped = {
    by_slug: bySlug,
    by_path: byPath,
    live_docs: filterAndClamp(
      filterAndClamp(
        filterAndClamp(e.live_docs, 1 / 0, (we) => we.slug, MAX_CONTEXT_TEXT_LENGTH),
        1 / 0,
        (we) => we.live_path,
      ),
      MAX_FILESYSTEM_PATH_LENGTH,
      (we) => we.working_copy,
    ),
    room_armed: filterAndClamp(e.room_armed, MAX_FILESYSTEM_PATH_LENGTH, (we) => we),
    type_reads: Object.fromEntries(
      keepRecentEntries(Object.entries(e.type_reads), MAX_FILESYSTEM_PATH_LENGTH, MAX_CONTEXT_TEXT_LENGTH),
    ),
    ...(e.last_publish !== undefined && {
      last_publish: {
        slug: clampString(e.last_publish.slug, MAX_CONTEXT_TEXT_LENGTH),
        env: e.last_publish.env,
      },
    }),
    session: {
      ...session,
      viewer_origin: clampString(session.viewer_origin),
      ...(session.dev_viewer_origin !== undefined && {
        dev_viewer_origin: clampString(session.dev_viewer_origin),
      }),
      scratchpad_dir: session.scratchpad_dir === null ? null : clampString(session.scratchpad_dir),
      ...(session.tool_results_dir !== undefined && {
        tool_results_dir: clampString(session.tool_results_dir),
      }),
    },
  };
  let dropHalfKeys = (we) => {
    let keys = Object.keys(we);
    if (keys.length === 0) return false;
    for (let Ae of keys.slice(0, Math.ceil(keys.length / 2))) delete we[Ae];
    return true;
  };
  while (jsonByteLength(clamped) > MAX_ARTIFACT_SLUGS) {
    truncated = true;
    let [we, Ee] =
      jsonByteLength(clamped.by_slug) >= jsonByteLength(clamped.by_path)
        ? [clamped.by_slug, clamped.by_path]
        : [clamped.by_path, clamped.by_slug];
    if (dropHalfKeys(we) || dropHalfKeys(Ee)) continue;
    if (clamped.live_docs.length + clamped.room_armed.length > 0) {
      clamped.live_docs = clamped.live_docs.slice(0, clamped.live_docs.length >> 1);
      clamped.room_armed = clamped.room_armed.slice(0, clamped.room_armed.length >> 1);
      continue;
    }
    break;
  }
  return {
    ...clamped,
    ...(truncated && {
      truncated: true,
    }),
  };
}
//@ chunk-e6aww6q8.js:139612-139659 placement
/**
 * jsonByteLength：JSON 字节长度。
 */
function jsonByteLength(e) {
  return Buffer.byteLength(jsonStringify(e));
}
//@ chunk-e6aww6q8.js:139659-139733 placement
function truncateWithFlag(e, n, r, s) {
  if (e.length <= n) return e;
  r[s] = true;
  return e.slice(0, n);
}
//@ chunk-e6aww6q8.js:139733-139793 placement
function addDroppedCount(e, n, r) {
  if (r > 0) e.dropped[n] = (e.dropped[n] ?? 0) + r;
}
//@ chunk-e6aww6q8.js:139793-142959 placement
/**
 * 收紧分类器结论：路径或身份受限时把允许改为询问或拒绝。
 */
function clampClassifierVerdict(e, n, r) {
  let s = n;
  let h = 0;
  let y = {
    bytes: 0,
    allowDropped: 0,
  };
  for (;;) {
    let S = {
      pathClamped: false,
      identityClamped: false,
      listCapped: false,
      spellingsShed: false,
      dropped: {
        ...e.dropped,
      },
    };
    let w = (Me) => truncateWithFlag(Me, MAX_RULES_PER_LIST, S, "pathClamped");
    let L = (Me) => ({
      rule: Me.rule,
      ...(Me.canonical !== undefined && {
        canonical: Me.canonical,
      }),
      source: Me.source,
      ...(Me.root !== undefined && {
        root: Me.root === null ? null : w(Me.root),
      }),
      ...(Me.pattern !== undefined && {
        pattern: Me.pattern,
      }),
    });
    let G = (Me, We) => {
      let ze = Me === "allow" ? MAX_RULE_PATTERN_LENGTH : MAX_RULES_PER_LIST;
      let filtered = We.filter((Je) => Je.rule.length <= ze);
      addDroppedCount(S, Me, We.length - filtered.length);
      if (Me !== "allow" || filtered.length <= s) return filtered.map(L);
      addDroppedCount(S, Me, filtered.length - s);
      return filtered.slice(0, s).map(L);
    };
    let q = () =>
      e.truncated === true || S.pathClamped || S.identityClamped || S.listCapped || S.spellingsShed;
    let Z = (Me) => {
      if (h >= 2 && Me.resolved.length > 0) S.spellingsShed = true;
      return {
        path: w(Me.path),
        resolved: h >= 2 ? [] : Me.resolved.map(w),
      };
    };
    let sliced = e.trusted_directories.additional.slice(0, MAX_USER_IDENTITY_LENGTH);
    if (sliced.length < e.trusted_directories.additional.length) S.listCapped = true;
    let mapped = e.trusted_directories.network.slice(0, MAX_USER_IDENTITY_LENGTH).map(w);
    if (mapped.length < e.trusted_directories.network.length) S.listCapped = true;
    let we = {
      permission_mode: e.permission_mode,
      platform: e.platform,
      ...(e.live_cwd !== undefined && {
        live_cwd: w(e.live_cwd),
      }),
      ...(e.home_dir !== undefined && {
        home_dir: w(e.home_dir),
      }),
      rule_roots: xr(e.rule_roots, w),
      trusted_directories: {
        ...(e.trusted_directories.primary !== undefined && {
          primary: Z(e.trusted_directories.primary),
        }),
        additional: sliced.map((Me) => ({
          ...Z(Me),
          source: Me.source,
        })),
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
      ...(e.chrome_navigation !== undefined && {
        chrome_navigation: e.chrome_navigation,
      }),
      case_insensitive_paths: e.case_insensitive_paths,
      restricted: e.restricted,
      is_remote_mode: e.is_remote_mode,
      classify_all_shell: e.classify_all_shell,
      ...(e.mcp_allow_rules_exact === true && {
        mcp_allow_rules_exact: true,
      }),
      user_identity:
        e.user_identity === null
          ? null
          : truncateWithFlag(e.user_identity, MAX_RULE_PATTERN_LENGTH, S, "identityClamped"),
      ...(Object.keys(S.dropped).length > 0 && {
        dropped: S.dropped,
      }),
      ...(q() && {
        truncated: true,
      }),
    };
    let Ee = jsonByteLength(we);
    if (h === 0)
      y = {
        bytes: Ee,
        allowDropped: S.dropped.allow ?? 0,
      };
    let Ae = Ee > MAX_TRUSTED_DIR_ENTRIES;
    if (Ae) {
      if (h === 0 || (h === 1 && s > 0)) {
        h = 1;
        s = Math.floor(s / 2);
        continue;
      }
      if (h < 2) {
        h++;
        continue;
      }
    }
    let Ie = Ae
      ? {
          ...we,
          truncated: true,
        }
      : we;
    if (Ie.truncated === true || Ie.dropped !== undefined)
      r({
        bytes: Ie === we ? Ee : jsonByteLength(Ie),
        bytesBeforeShedding: y.bytes,
        overCapBeforeShedding: h > 0,
        overCap: Ae,
        allowRulesShed: (S.dropped.allow ?? 0) - y.allowDropped,
        resolvedSpellingsShed: S.spellingsShed,
        pathClamped: S.pathClamped,
        identityClamped: S.identityClamped,
        additionalDirectories: e.trusted_directories.additional.length,
        networkRoots: e.trusted_directories.network.length,
        arrivedTruncated: e.truncated === true,
        truncated: Ie.truncated === true,
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
//@ chunk-e6aww6q8.js:142959-143633 placement
/**
 * 收紧发给分类器的 git 状态：路径/分支与主机名截断，remote 与可见性缓存条数限制，出现截断时标记 truncated。
 */
function clampGitStateForClassifier(e) {
  let truncated = e.truncated === true;
  let clampPath = (w) => {
    if (w.length <= MAX_DROPPED_ENTRIES) return w;
    truncated = true;
    return w.slice(0, MAX_DROPPED_ENTRIES);
  };
  let clampNullablePath = (w) => (w === null ? null : clampPath(w));
  let clampHost = (host) => {
    if (host.length <= MAX_PATH_FIELD_LENGTH) return host;
    truncated = true;
    return host.slice(0, MAX_PATH_FIELD_LENGTH);
  };
  let clampList = (w, L) => {
    if (w.length > L) truncated = true;
    return w.slice(0, L);
  };
  let visibility = e.visibility;
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
                : {
                    ...visibility.origin,
                    host: clampHost(visibility.origin.host),
                  },
            push_remote: clampNullablePath(visibility.push_remote),
            remotes: clampList(visibility.remotes, MAX_PERMISSION_MODE_LENGTH).map((w) => ({
              ...w,
              host: clampHost(w.host),
            })),
            visibility_cache: clampList(visibility.visibility_cache, MAX_PLATFORM_LENGTH).map((w) => ({
              ...w,
              host: clampHost(w.host),
            })),
          },
    ...(e.error !== undefined && {
      error: e.error,
    }),
    ...(truncated && {
      truncated: true,
    }),
  };
}
export { clampArtifactClassifierState, jsonByteLength, clampClassifierVerdict, clampGitStateForClassifier };
