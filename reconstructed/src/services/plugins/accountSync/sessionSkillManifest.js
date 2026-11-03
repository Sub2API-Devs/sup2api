/**
 * services/plugins/accountSync/sessionSkillManifest.ts
 *
 * 2.1.316 新增：会话技能清单
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f9asxqh1.js (6)
 * attribution: placement 6
 */
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { create_2, create, create_6, create_15 } from "../../../../vendor/zod/lib/index.mjs";
import { logEvent } from "../../analytics/index.js";
import { logFeatureBad, logFeatureOk } from "../../analytics/featureTelemetry.js";
import { SessionRootSlot } from "../../../bootstrap/sessionSlices.js";
import { sleep } from "../../../utils/sleep.js";
import { apiClient } from "../../routines/routinesApi.js";
import { logForDiagnosticsNoPII } from "../../../utils/diagLogs.js";
import { classifyAxiosError } from "../../../utils/errors.js";

/**
 * 会话技能清单（/worker/skill-manifest）的懒加载 schema：skills 与 plugins 两个条目列表（缺省为空数组，字段缺省为空串，附带市场名与是否官方），另带请求超时与重试间隔常量。
 */
//@ chunk-f9asxqh1.js:21245-21660 placement
var sessionSkillManifestSchema = DoctorLazy(() => {
    let transform = create_2()
        .nullish()
        .transform((r) => r ?? ""),
      transform_2 = create({
        id: transform,
        name: transform,
        description: transform,
        version: transform,
        directory: transform,
        marketplace_name: create_2()
          .nullish()
          .catch(void 0),
        is_official: create_6()
          .nullish()
          .catch(void 0),
      }).transform(({ marketplace_name: marketplace_name, is_official: is_official, ...y }) => ({
        ...y,
        ...(marketplace_name && { marketplaceName: marketplace_name }),
        ...(is_official === !0 && { isOfficial: !0 }),
      })),
      transform_3 = create_15(transform_2)
        .nullish()
        .transform((r) => r ?? []);
    return create({ skills: transform_3, plugins: transform_3 }).strict();
  }),
  MANIFEST_TIMEOUT_MS = 30000,
  MANIFEST_RETRY_DELAY_MS = 500;
/**
 * 会话技能/插件清单的缓存：fetch 合并并发请求，启动时复用同一次结果；listEntries 按 skills 或 plugins 返回条目，失败时记录遥测与特性状态并返回 manifest 错误。
 */
//@ chunk-f9asxqh1.js:21660-22430 placement
class SessionSkillManifest {
  inflight = null;
  featureEventReported = new Set();
  startupResponse = null;
  fetch() {
    if (!this.inflight) {
      let e = fetchSkillManifestWithRetry().finally(() => {
        if (this.inflight === e) this.inflight = null;
      });
      this.inflight = e;
    }
    return this.inflight;
  }
  discardInflight() {
    ((this.inflight = null), (this.startupResponse = null));
  }
  async listEntries(e, { startup: n }) {
    let s = e === "skills" ? "sync_session_refs_skills" : "sync_session_refs_plugins",
      r = !this.featureEventReported.has(e);
    this.featureEventReported.add(e);
    let f = await (n ? (this.startupResponse ??= this.fetch()) : this.fetch());
    if (!f.ok) {
      if (
        (logEvent(
          e === "skills" ? "tengu_skills_sync_manifest_failed" : "tengu_plugins_sync_manifest_failed",
          { unavailable: f.reason === "unavailable" },
        ),
        r)
      )
        logFeatureBad(s, f.reason);
      return { success: !1, error: `manifest ${f.reason}`, kind: "manifest" };
    }
    if (r) logFeatureOk(s);
    return { success: !0, entries: f[e] };
  }
}
//@ chunk-f9asxqh1.js:22430-22457 placement
var zqe = new SessionRootSlot(() => new SessionSkillManifest());
//@ chunk-f9asxqh1.js:22457-22577 placement
async function fetchSkillManifestWithRetry() {
  let e = await fetchSkillManifest();
  if (e.ok || e.reason === "no_auth" || e.reason === "gated") return e;
  return (await sleep(MANIFEST_RETRY_DELAY_MS), fetchSkillManifest());
}
/**
 * 从 CCR 会话 GET /worker/skill-manifest（会话 JWT）：无认证、被拦、503、HTTP 错误、格式不符或传输异常分别归类为 no_auth/gated/unavailable/http_error/malformed/transport，成功时返回带 id 的技能与插件条目。
 */
//@ chunk-f9asxqh1.js:22577-23503 placement
async function fetchSkillManifest() {
  try {
    let e = await apiClient.get("/worker/skill-manifest", {
      host: "ccr-session",
      auth: "session-jwt",
      headers: { "anthropic-version": "2023-06-01" },
      timeout: MANIFEST_TIMEOUT_MS,
      validateStatus: () => !0,
    });
    if (!e.ok) {
      if (e.reason === "no-auth")
        return (
          logForDiagnosticsNoPII("warn", "session_refs_manifest_no_auth"),
          { ok: !1, reason: "no_auth" }
        );
      return (
        logForDiagnosticsNoPII("warn", "session_refs_manifest_gated", { reason: e.reason }),
        { ok: !1, reason: "gated" }
      );
    }
    if (e.status === 503)
      return (
        logForDiagnosticsNoPII("warn", "session_refs_manifest_unavailable"),
        { ok: !1, reason: "unavailable" }
      );
    if (e.status >= 300)
      return (
        logForDiagnosticsNoPII("warn", "session_refs_manifest_http_error", { status: e.status }),
        { ok: !1, reason: "http_error" }
      );
    let safeParse = sessionSkillManifestSchema().safeParse(e.data);
    if (!safeParse.success)
      return (
        logForDiagnosticsNoPII("warn", "session_refs_manifest_malformed"),
        { ok: !1, reason: "malformed" }
      );
    return {
      ok: !0,
      skills: safeParse.data.skills.filter((skill) => skill.id),
      plugins: safeParse.data.plugins.filter((plugin) => plugin.id),
    };
  } catch (error) {
    let { kind: kind } = classifyAxiosError(error);
    return (
      logForDiagnosticsNoPII("warn", "session_refs_manifest_exception", { kind: kind }),
      { ok: !1, reason: "transport" }
    );
  }
}
//@ chunk-f9asxqh1.js:23594-23651 placement
function L5r(e) {
  return e.length >= 2 && e[0] === 80 && e[1] === 75;
}

export { zqe, L5r };
