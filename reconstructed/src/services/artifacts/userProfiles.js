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
import { Y, z } from "../../tools/ArtifactTool/permissions/artifactPermissionRules.js";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { cleanAnchorText } from "./comments/commentFormatting.js";

/**
 * 读取 artifact 用户资料（/api/frame/user/profiles），用于评论作者显示名，按账号 epoch 失效。
 */
//@ chunk-qxvqcab6.js:20523-21433 placement
async function fetchArtifactUserProfiles(e, n, r, o) {
  let s = getLiveState(),
    accountEpoch = s.accountEpoch,
    a = s.profileIdsForgets.get(e) ?? 0,
    l;
  try {
    l = await frameApi.postRelayBound(
      `/api/frame/user/profiles/${encodeURIComponent(e)}`,
      { ids: n },
      {
        refreshOAuth: !0,
        credentials: o,
        headers: buildFrameHeaders(),
        timeout: Y,
        maxContentLength: z,
        signal: r,
      },
    );
  } catch (error) {
    if (isCancel(error)) throw error;
    return { ok: !1 };
  }
  if (!l.ok) return { ok: !1 };
  let d = () =>
    getLiveState() === s && s.accountEpoch === accountEpoch && (s.profileIdsForgets.get(e) ?? 0) === a;
  if (!l.fromFrame || l.status < 200 || l.status >= 300) {
    if (l.fromFrame && d() && l.status === 403 && isPlainObject(l.data) && l.data.error === "not_declared")
      s.profileIdsServed.set(e, !1);
    return { ok: !1, status: l.status };
  }
  let f = isPlainObject(l.data) ? l.data.profiles : void 0;
  if (!isPlainObject(f)) return { ok: !1, status: l.status };
  let p = new Set(n),
    g = {};
  for (let [c, w] of Object.entries(f)) {
    if (!p.has(c)) continue;
    let h = profileFields(w);
    if (h.name !== void 0 || h.guest === !0) g[c] = h;
  }
  if (d())
    (s.profileIdsServed.set(e, !0),
      cacheProfileNames(e, { ...Object.fromEntries(n.map((c) => [c, {}])), ...g }));
  return { ok: !0, profiles: g };
}
//@ chunk-qxvqcab6.js:21433-21545 placement
function profileFields(e) {
  if (!isPlainObject(e)) return {};
  let n = cleanAnchorText(e.name);
  return { ...(n !== void 0 && { name: n }), ...(e.guest === !0 && { guest: !0 }) };
}
//@ chunk-qxvqcab6.js:21545-21555 placement
var K = 512;
//@ chunk-qxvqcab6.js:21555-21592 placement
function X(e, n) {
  return `${e}\x00${n}`;
}
//@ chunk-qxvqcab6.js:21592-21816 placement
function cacheProfileNames(e, n) {
  let profileNames = getLiveState().profileNames;
  for (let [o, s] of Object.entries(n)) {
    let u = X(e, o);
    (profileNames.delete(u), profileNames.set(u, s.name === void 0 ? { ...s, at: Date.now() } : s));
  }
  while (profileNames.size > K) {
    let o = profileNames.keys().next().value;
    if (o === void 0) break;
    profileNames.delete(o);
  }
}

export { profileFields, fetchArtifactUserProfiles };
