/**
 * services/artifacts/userProfiles.ts
 *
 * 2.1.316 新增：获取 artifact 用户资料
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qxvqcab6.js (5)
 * attribution: placement 5
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

//@ chunk-qxvqcab6.js:20523-21433 placement
/**
 * 读取 artifact 用户资料（/api/frame/user/profiles），用于评论作者显示名，按账号 epoch 失效。
 */
async function fetchArtifactUserProfiles(slug, profileIds, signal, credentials) {
  let liveState = getLiveState();
  let accountEpoch = liveState.accountEpoch;
  let a = liveState.profileIdsForgets.get(slug) ?? 0;
  let l;
  try {
    l = await frameApi.postRelayBound(
      `/api/frame/user/profiles/${encodeURIComponent(slug)}`,
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
  if (!l.ok)
    return {
      ok: false,
    };
  let d = () =>
    getLiveState() === liveState &&
    liveState.accountEpoch === accountEpoch &&
    (liveState.profileIdsForgets.get(slug) ?? 0) === a;
  if (!l.fromFrame || l.status < 200 || l.status >= 300) {
    if (l.fromFrame && d() && l.status === 403 && isPlainObject(l.data) && l.data.error === "not_declared")
      liveState.profileIdsServed.set(slug, false);
    return {
      ok: false,
      status: l.status,
    };
  }
  let profiles = isPlainObject(l.data) ? l.data.profiles : undefined;
  if (!isPlainObject(profiles))
    return {
      ok: false,
      status: l.status,
    };
  let p = new Set(profileIds);
  let g = {};
  for (let [key, value] of Object.entries(profiles)) {
    if (!p.has(key)) continue;
    let h = profileFields(value);
    if (h.name !== undefined || h.guest === true) g[key] = h;
  }
  if (d()) {
    liveState.profileIdsServed.set(slug, true);
    cacheProfileNames(slug, {
      ...Object.fromEntries(profileIds.map((c) => [c, {}])),
      ...g,
    });
  }
  return {
    ok: true,
    profiles: g,
  };
}
//@ chunk-qxvqcab6.js:21433-21545 placement
function profileFields(e) {
  if (!isPlainObject(e)) return {};
  let n = cleanAnchorText(e.name);
  return {
    ...(n !== undefined && {
      name: n,
    }),
    ...(e.guest === true && {
      guest: true,
    }),
  };
}
//@ chunk-qxvqcab6.js:21545-21555 placement
var MAX_PROFILE_NAMES = 512;
//@ chunk-qxvqcab6.js:21555-21592 placement
function profileKey(e, n) {
  return `${e}\x00${n}`;
}
//@ chunk-qxvqcab6.js:21592-21816 placement
function cacheProfileNames(e, n) {
  let profileNames = getLiveState().profileNames;
  for (let [key, value] of Object.entries(n)) {
    let u = profileKey(e, key);
    profileNames.delete(u);
    profileNames.set(
      u,
      value.name === undefined
        ? {
            ...value,
            at: Date.now(),
          }
        : value,
    );
  }
  while (profileNames.size > MAX_PROFILE_NAMES) {
    let o = profileNames.keys().next().value;
    if (o === undefined) break;
    profileNames.delete(o);
  }
}
export { profileFields, fetchArtifactUserProfiles };
