/**
 * utils/permissions/serverClassifier/clamp.ts
 *
 * 2.1.316 新增：分类器结果收紧
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nt9amew5.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { import_mapValues } from "../../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-nt9amew5.js:5713-8036 placement
/**
 * 收紧发给分类器的 Artifact 状态：截断过长字符串与列表、能力过大时只留键、保留最近的若干 slug/路径条目；整体仍超上限时成半删减，出现截断时标记 truncated。
 */
function clampArtifactClassifierState(state) {
  let truncated = state.truncated === true;
  let clampString = (text, maxLength = MAX_SESSION_TITLES) => {
    if (text.length <= maxLength) return text;
    truncated = true;
    return text.slice(0, maxLength);
  };
  let clampList = (list, maxLength) => {
    if (list.length > maxLength) truncated = true;
    return list.slice(0, maxLength);
  };
  let filterAndClamp = (values, maxCount, keyOf, maxKeyLength = MAX_SESSION_TITLES) => {
    let list = values.filter((value) => keyOf(value).length <= maxKeyLength);
    if (list.length !== values.length) truncated = true;
    return clampList(list, maxCount);
  };
  let keepRecentEntries = (entries, maxCount, maxKeyLength) => {
    let filtered = entries.filter(([key]) => key.length <= maxKeyLength);
    if (filtered.length !== entries.length || filtered.length > maxCount) truncated = true;
    return filtered.slice(Math.max(0, filtered.length - maxCount));
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
  let clampConnectors = (artifacts) => {
    if (artifacts === undefined) return {};
    if (!fitsContextLimits(artifacts)) {
      truncated = true;
      return {};
    }
    return {
      endpoint_connectors: [...artifacts],
    };
  };
  let clampShare = ({ endpoint_connectors: endpointConnectors, ...shareRest }) => ({
    ...shareRest,
    ...clampConnectors(endpointConnectors),
    mode: clampString(shareRest.mode, MAX_CONTEXT_TEXT_LENGTH),
    ...(shareRest.role !== undefined && {
      role: clampString(shareRest.role, MAX_CONTEXT_TEXT_LENGTH),
    }),
    ...(shareRest.artifact_kind !== undefined && {
      artifact_kind: clampString(shareRest.artifact_kind, MAX_CONTEXT_TEXT_LENGTH),
    }),
    ...(shareRest.live_paths !== undefined && {
      live_paths: filterAndClamp(shareRest.live_paths, MAX_SAVED_RULES, (livePath) => livePath),
    }),
    ...(shareRest.capabilities !== undefined && clampCapabilities(shareRest.capabilities)),
  });
  let bySlug = Object.fromEntries(
    keepRecentEntries(Object.entries(state.by_slug), MAX_TURN_TEXT_LENGTH, MAX_CONTEXT_TEXT_LENGTH).map(
      ([slug, entry]) => [
        slug,
        {
          ...entry,
          ...(entry.share !== undefined && {
            share: clampShare(entry.share),
          }),
          ...(entry.attested !== undefined && {
            attested: clampString(entry.attested, MAX_CONTEXT_TEXT_LENGTH),
          }),
        },
      ],
    ),
  );
  let byPath = Object.fromEntries(
    keepRecentEntries(Object.entries(state.by_path), MAX_TURN_ATTACHMENT_LENGTH, MAX_SESSION_TITLES).map(
      ([path, entry]) => [
        path,
        {
          ...(entry.slug !== undefined &&
            entry.slug.length <= MAX_CONTEXT_TEXT_LENGTH && {
              slug: entry.slug,
            }),
          ...(entry.thumbnail_named !== undefined && {
            thumbnail_named: filterAndClamp(entry.thumbnail_named, MAX_SESSION_IDS, (thumbnail) => thumbnail),
          }),
        },
      ],
    ),
  );
  let session = state.session;
  let clamped = {
    by_slug: bySlug,
    by_path: byPath,
    live_docs: filterAndClamp(
      filterAndClamp(
        filterAndClamp(state.live_docs, 1 / 0, (doc) => doc.slug, MAX_CONTEXT_TEXT_LENGTH),
        1 / 0,
        (doc) => doc.live_path,
      ),
      MAX_FILESYSTEM_PATH_LENGTH,
      (doc) => doc.working_copy,
    ),
    room_armed: filterAndClamp(state.room_armed, MAX_FILESYSTEM_PATH_LENGTH, (path) => path),
    type_reads: Object.fromEntries(
      keepRecentEntries(
        Object.entries(state.type_reads),
        MAX_FILESYSTEM_PATH_LENGTH,
        MAX_CONTEXT_TEXT_LENGTH,
      ),
    ),
    ...(state.last_publish !== undefined && {
      last_publish: {
        slug: clampString(state.last_publish.slug, MAX_CONTEXT_TEXT_LENGTH),
        env: state.last_publish.env,
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
  let dropHalfKeys = (table) => {
    let keys = Object.keys(table);
    if (keys.length === 0) return false;
    for (let key of keys.slice(0, Math.ceil(keys.length / 2))) delete table[key];
    return true;
  };
  while (jsonByteLength(clamped) > MAX_ARTIFACT_SLUGS) {
    truncated = true;
    let [larger, smaller] =
      jsonByteLength(clamped.by_slug) >= jsonByteLength(clamped.by_path)
        ? [clamped.by_slug, clamped.by_path]
        : [clamped.by_path, clamped.by_slug];
    if (dropHalfKeys(larger) || dropHalfKeys(smaller)) continue;
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
//@ chunk-nt9amew5.js:8036-8083 placement
/**
 * jsonByteLength：JSON 字节长度。
 */
function jsonByteLength(value) {
  return Buffer.byteLength(jsonStringify(value));
}
//@ chunk-nt9amew5.js:8083-8156 placement
function truncateWithFlag(text, maxLength, flags, flagName) {
  if (text.length <= maxLength) return text;
  flags[flagName] = true;
  return text.slice(0, maxLength);
}
//@ chunk-nt9amew5.js:8156-8215 placement
function addDroppedCount(state, behavior, count) {
  if (count > 0) state.dropped[behavior] = (state.dropped[behavior] ?? 0) + count;
}
//@ chunk-nt9amew5.js:8215-11311 placement
/**
 * 收紧分类器结论：路径或身份受限时把允许改为询问或拒绝。
 */
function clampClassifierVerdict(context, allowLimit, onTruncated) {
  let currentAllowLimit = allowLimit;
  let sheddingStage = 0;
  let baseline = {
    bytes: 0,
    allowDropped: 0,
  };
  for (;;) {
    let flags = {
      pathClamped: false,
      identityClamped: false,
      listCapped: false,
      spellingsShed: false,
      dropped: {
        ...context.dropped,
      },
    };
    let clampString = (text) => truncateWithFlag(text, MAX_RULES_PER_LIST, flags, "pathClamped");
    let clampRule = (entry) => ({
      rule: entry.rule,
      ...(entry.canonical !== undefined && {
        canonical: entry.canonical,
      }),
      source: entry.source,
      ...(entry.root !== undefined && {
        root: entry.root === null ? null : clampString(entry.root),
      }),
      ...(entry.pattern !== undefined && {
        pattern: entry.pattern,
      }),
    });
    let clampRuleList = (behavior, list) => {
      let maxLength = behavior === "allow" ? MAX_RULE_PATTERN_LENGTH : MAX_RULES_PER_LIST;
      let filtered = list.filter((entry) => entry.rule.length <= maxLength);
      addDroppedCount(flags, behavior, list.length - filtered.length);
      if (behavior !== "allow" || filtered.length <= currentAllowLimit) return filtered.map(clampRule);
      addDroppedCount(flags, behavior, filtered.length - currentAllowLimit);
      return filtered.slice(0, currentAllowLimit).map(clampRule);
    };
    let isTruncated = () =>
      context.truncated === true ||
      flags.pathClamped ||
      flags.identityClamped ||
      flags.listCapped ||
      flags.spellingsShed;
    let clampDirectory = (directory) => {
      if (sheddingStage >= 2 && directory.resolved.length > 0) flags.spellingsShed = true;
      return {
        path: clampString(directory.path),
        resolved: sheddingStage >= 2 ? [] : directory.resolved.map(clampString),
      };
    };
    let sliced = context.trusted_directories.additional.slice(0, MAX_USER_IDENTITY_LENGTH);
    if (sliced.length < context.trusted_directories.additional.length) flags.listCapped = true;
    let mapped = context.trusted_directories.network.slice(0, MAX_USER_IDENTITY_LENGTH).map(clampString);
    if (mapped.length < context.trusted_directories.network.length) flags.listCapped = true;
    let clamped = {
      permission_mode: context.permission_mode,
      platform: context.platform,
      ...(context.live_cwd !== undefined && {
        live_cwd: clampString(context.live_cwd),
      }),
      ...(context.home_dir !== undefined && {
        home_dir: clampString(context.home_dir),
      }),
      rule_roots: import_mapValues(context.rule_roots, clampString),
      trusted_directories: {
        ...(context.trusted_directories.primary !== undefined && {
          primary: clampDirectory(context.trusted_directories.primary),
        }),
        additional: sliced.map((directory) => ({
          ...clampDirectory(directory),
          source: directory.source,
        })),
        network: mapped,
        block_reads_outside_working_directories:
          context.trusted_directories.block_reads_outside_working_directories,
      },
      rules: {
        allow: clampRuleList("allow", context.rules.allow),
        deny: clampRuleList("deny", context.rules.deny),
        ask: clampRuleList("ask", context.rules.ask),
      },
      auto_mode: {
        allow: [...context.auto_mode.allow],
        soft_deny: [...context.auto_mode.soft_deny],
        hard_deny: [...context.auto_mode.hard_deny],
        environment: [...context.auto_mode.environment],
      },
      artifact_consent_holdback: context.artifact_consent_holdback,
      ...(context.chrome_navigation !== undefined && {
        chrome_navigation: context.chrome_navigation,
      }),
      case_insensitive_paths: context.case_insensitive_paths,
      restricted: context.restricted,
      is_remote_mode: context.is_remote_mode,
      classify_all_shell: context.classify_all_shell,
      ...(context.mcp_allow_rules_exact === true && {
        mcp_allow_rules_exact: true,
      }),
      user_identity:
        context.user_identity === null
          ? null
          : truncateWithFlag(context.user_identity, MAX_RULE_PATTERN_LENGTH, flags, "identityClamped"),
      ...(Object.keys(flags.dropped).length > 0 && {
        dropped: flags.dropped,
      }),
      ...(isTruncated() && {
        truncated: true,
      }),
    };
    let byteLength = jsonByteLength(clamped);
    if (sheddingStage === 0)
      baseline = {
        bytes: byteLength,
        allowDropped: flags.dropped.allow ?? 0,
      };
    let overCap = byteLength > MAX_TRUSTED_DIR_ENTRIES;
    if (overCap) {
      if (sheddingStage === 0 || (sheddingStage === 1 && currentAllowLimit > 0)) {
        sheddingStage = 1;
        currentAllowLimit = Math.floor(currentAllowLimit / 2);
        continue;
      }
      if (sheddingStage < 2) {
        sheddingStage++;
        continue;
      }
    }
    let finalVerdict = overCap
      ? {
          ...clamped,
          truncated: true,
        }
      : clamped;
    if (finalVerdict.truncated === true || finalVerdict.dropped !== undefined)
      onTruncated({
        bytes: finalVerdict === clamped ? byteLength : jsonByteLength(finalVerdict),
        bytesBeforeShedding: baseline.bytes,
        overCapBeforeShedding: sheddingStage > 0,
        overCap,
        allowRulesShed: (flags.dropped.allow ?? 0) - baseline.allowDropped,
        resolvedSpellingsShed: flags.spellingsShed,
        pathClamped: flags.pathClamped,
        identityClamped: flags.identityClamped,
        additionalDirectories: context.trusted_directories.additional.length,
        networkRoots: context.trusted_directories.network.length,
        arrivedTruncated: context.truncated === true,
        truncated: finalVerdict.truncated === true,
        dropped: flags.dropped,
        denyRules: context.rules.deny.length,
        askRules: context.rules.ask.length,
        autoMode: {
          allow: context.auto_mode.allow.length,
          softDeny: context.auto_mode.soft_deny.length,
          hardDeny: context.auto_mode.hard_deny.length,
          environment: context.auto_mode.environment.length,
        },
      });
    return finalVerdict;
  }
}
//@ chunk-nt9amew5.js:11311-11981 placement
/**
 * 收紧发给分类器的 git 状态：路径/分支与主机名截断，remote 与可见性缓存条数限制，出现截断时标记 truncated。
 */
function clampGitStateForClassifier(gitState) {
  let truncated = gitState.truncated === true;
  let clampPath = (value) => {
    if (value.length <= MAX_DROPPED_ENTRIES) return value;
    truncated = true;
    return value.slice(0, MAX_DROPPED_ENTRIES);
  };
  let clampNullablePath = (value) => (value === null ? null : clampPath(value));
  let clampHost = (host) => {
    if (host.length <= MAX_PATH_FIELD_LENGTH) return host;
    truncated = true;
    return host.slice(0, MAX_PATH_FIELD_LENGTH);
  };
  let clampList = (list, maxLength) => {
    if (list.length > maxLength) truncated = true;
    return list.slice(0, maxLength);
  };
  let visibility = gitState.visibility;
  return {
    cwd: clampNullablePath(gitState.cwd),
    root: clampNullablePath(gitState.root),
    branch: clampNullablePath(gitState.branch),
    default_branch: clampNullablePath(gitState.default_branch),
    status: gitState.status,
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
            remotes: clampList(visibility.remotes, MAX_PERMISSION_MODE_LENGTH).map((remote) => ({
              ...remote,
              host: clampHost(remote.host),
            })),
            visibility_cache: clampList(visibility.visibility_cache, MAX_PLATFORM_LENGTH).map((entry) => ({
              ...entry,
              host: clampHost(entry.host),
            })),
          },
    ...(gitState.error !== undefined && {
      error: gitState.error,
    }),
    ...(truncated && {
      truncated: true,
    }),
  };
}
export { jsonByteLength, clampArtifactClassifierState, clampClassifierVerdict, clampGitStateForClassifier };
