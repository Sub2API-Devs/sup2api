/**
 * services/artifacts/userProfiles.ts
 *
 * 2.1.316 新增：获取 artifact 用户资料
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nfkwcnxd.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getLiveState } from "../liveReplica/liveReplica.js";
import { frameApi } from "./frameRelay.js";
import { buildFrameHeaders } from "./frameApi.js";
import {
  ARTIFACT_RULE_TIMEOUT_MS,
  ARTIFACT_RULE_MAX_BYTES,
} from "../../tools/ArtifactTool/permissions/artifactPermissionRules.js";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { cleanAnchorText } from "./comments/commentFormatting.js";

//@ chunk-nfkwcnxd.js:20498-21408 placement
/**
 * 读取 artifact 用户资料（/api/frame/user/profiles），用于评论作者显示名，按账号 epoch 失效。
 */
async function fetchArtifactUserProfiles(host, profileIds, signal, credentials) {
  let liveState = getLiveState();
  let accountEpoch = liveState.accountEpoch;
  let forgetCount = liveState.profileIdsForgets.get(host) ?? 0;
  let response;
  try {
    response = await frameApi.postRelayBound(
      `/api/frame/user/profiles/${encodeURIComponent(host)}`,
      {
        ids: profileIds,
      },
      {
        refreshOAuth: true,
        credentials,
        headers: buildFrameHeaders(),
        timeout: ARTIFACT_RULE_TIMEOUT_MS,
        maxContentLength: ARTIFACT_RULE_MAX_BYTES,
        signal,
      },
    );
  } catch (error) {
    if (isCancel(error)) throw error;
    return {
      ok: false,
    };
  }
  if (!response.ok)
    return {
      ok: false,
    };
  let stillCurrent = () =>
    getLiveState() === liveState &&
    liveState.accountEpoch === accountEpoch &&
    (liveState.profileIdsForgets.get(host) ?? 0) === forgetCount;
  if (!response.fromFrame || response.status < 200 || response.status >= 300) {
    if (
      response.fromFrame &&
      stillCurrent() &&
      response.status === 403 &&
      isPlainObject(response.data) &&
      response.data.error === "not_declared"
    )
      liveState.profileIdsServed.set(host, false);
    return {
      ok: false,
      status: response.status,
    };
  }
  let profiles = isPlainObject(response.data) ? response.data.profiles : undefined;
  if (!isPlainObject(profiles))
    return {
      ok: false,
      status: response.status,
    };
  let wanted = new Set(profileIds);
  let profileMap = {};
  for (let [key, value] of Object.entries(profiles)) {
    if (!wanted.has(key)) continue;
    let fields = profileFields(value);
    if (fields.name !== undefined || fields.guest === true) profileMap[key] = fields;
  }
  if (stillCurrent()) {
    liveState.profileIdsServed.set(host, true);
    cacheProfileNames(host, {
      ...Object.fromEntries(profileIds.map((id) => [id, {}])),
      ...profileMap,
    });
  }
  return {
    ok: true,
    profiles: profileMap,
  };
}
//@ chunk-nfkwcnxd.js:21408-21520 placement
function profileFields(profile) {
  if (!isPlainObject(profile)) return {};
  let name = cleanAnchorText(profile.name);
  return {
    ...(name !== undefined && {
      name,
    }),
    ...(profile.guest === true && {
      guest: true,
    }),
  };
}
//@ chunk-nfkwcnxd.js:21520-21530 placement
var MAX_PROFILE_NAMES = 512;
//@ chunk-nfkwcnxd.js:21530-21567 placement
function profileKey(host, id) {
  return `${host}\x00${id}`;
}
//@ chunk-nfkwcnxd.js:21567-21791 placement
function cacheProfileNames(host, profiles) {
  let profileNames = getLiveState().profileNames;
  for (let [key, value] of Object.entries(profiles)) {
    let cacheKey = profileKey(host, key);
    profileNames.delete(cacheKey);
    profileNames.set(
      cacheKey,
      value.name === undefined
        ? {
            ...value,
            at: Date.now(),
          }
        : value,
    );
  }
  while (profileNames.size > MAX_PROFILE_NAMES) {
    let oldest = profileNames.keys().next().value;
    if (oldest === undefined) break;
    profileNames.delete(oldest);
  }
}
export { profileFields, fetchArtifactUserProfiles };
