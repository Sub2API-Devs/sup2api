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

//@ chunk-f9asxqh1.js:21245-21660 placement
/**
 * 会话技能清单（/worker/skill-manifest）的懒加载 schema：skills 与 plugins 两个条目列表（缺省为空数组，字段缺省为空串，附带市场名与是否官方），另带请求超时与重试间隔常量。
 */
var sessionSkillManifestSchema = DoctorLazy(() => {
  let e = create_2()
    .nullish()
    .transform((r) => r ?? "");
  let n = create({
    id: e,
    name: e,
    description: e,
    version: e,
    directory: e,
    marketplace_name: create_2().nullish().catch(undefined),
    is_official: create_6().nullish().catch(undefined),
  }).transform(({ marketplace_name: marketplaceName, is_official: isOfficial, ...y }) => ({
    ...y,
    ...(marketplaceName && {
      marketplaceName,
    }),
    ...(isOfficial === true && {
      isOfficial: true,
    }),
  }));
  let s = create_15(n)
    .nullish()
    .transform((r) => r ?? []);
  return create({
    skills: s,
    plugins: s,
  }).strict();
});
var MANIFEST_TIMEOUT_MS = 30000;
var MANIFEST_RETRY_DELAY_MS = 500;
//@ chunk-f9asxqh1.js:21660-22430 placement
/**
 * 会话技能/插件清单的缓存：fetch 合并并发请求，启动时复用同一次结果；listEntries 按 skills 或 plugins 返回条目，失败时记录遥测与特性状态并返回 manifest 错误。
 */
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
    this.inflight = null;
    this.startupResponse = null;
  }
  async listEntries(e, { startup }) {
    let s = e === "skills" ? "sync_session_refs_skills" : "sync_session_refs_plugins";
    let r = !this.featureEventReported.has(e);
    this.featureEventReported.add(e);
    let f = await (startup ? (this.startupResponse ??= this.fetch()) : this.fetch());
    if (!f.ok) {
      logEvent(e === "skills" ? "tengu_skills_sync_manifest_failed" : "tengu_plugins_sync_manifest_failed", {
        unavailable: f.reason === "unavailable",
      });
      if (r) logFeatureBad(s, f.reason);
      return {
        success: false,
        error: `manifest ${f.reason}`,
        kind: "manifest",
      };
    }
    if (r) logFeatureOk(s);
    return {
      success: true,
      entries: f[e],
    };
  }
}
//@ chunk-f9asxqh1.js:22430-22457 placement
/**
 * 按会话根保存的技能清单。
 */
var sessionSkillManifestSlot = new SessionRootSlot(() => new SessionSkillManifest());
//@ chunk-f9asxqh1.js:22457-22577 placement
async function fetchSkillManifestWithRetry() {
  let skillManifest = await fetchSkillManifest();
  if (skillManifest.ok || skillManifest.reason === "no_auth" || skillManifest.reason === "gated")
    return skillManifest;
  await sleep(MANIFEST_RETRY_DELAY_MS);
  return fetchSkillManifest();
}
//@ chunk-f9asxqh1.js:22577-23503 placement
/**
 * 从 CCR 会话 GET /worker/skill-manifest（会话 JWT）：无认证、被拦、503、HTTP 错误、格式不符或传输异常分别归类为 no_auth/gated/unavailable/http_error/malformed/transport，成功时返回带 id 的技能与插件条目。
 */
async function fetchSkillManifest() {
  try {
    let e = await apiClient.get("/worker/skill-manifest", {
      host: "ccr-session",
      auth: "session-jwt",
      headers: {
        "anthropic-version": "2023-06-01",
      },
      timeout: MANIFEST_TIMEOUT_MS,
      validateStatus: () => true,
    });
    if (!e.ok) {
      if (e.reason === "no-auth") {
        logForDiagnosticsNoPII("warn", "session_refs_manifest_no_auth");
        return {
          ok: false,
          reason: "no_auth",
        };
      }
      logForDiagnosticsNoPII("warn", "session_refs_manifest_gated", {
        reason: e.reason,
      });
      return {
        ok: false,
        reason: "gated",
      };
    }
    if (e.status === 503) {
      logForDiagnosticsNoPII("warn", "session_refs_manifest_unavailable");
      return {
        ok: false,
        reason: "unavailable",
      };
    }
    if (e.status >= 300) {
      logForDiagnosticsNoPII("warn", "session_refs_manifest_http_error", {
        status: e.status,
      });
      return {
        ok: false,
        reason: "http_error",
      };
    }
    let n = sessionSkillManifestSchema().safeParse(e.data);
    if (!n.success) {
      logForDiagnosticsNoPII("warn", "session_refs_manifest_malformed");
      return {
        ok: false,
        reason: "malformed",
      };
    }
    return {
      ok: true,
      skills: n.data.skills.filter((skill) => skill.id),
      plugins: n.data.plugins.filter((plugin) => plugin.id),
    };
  } catch (error) {
    let { kind } = classifyAxiosError(error);
    logForDiagnosticsNoPII("warn", "session_refs_manifest_exception", {
      kind,
    });
    return {
      ok: false,
      reason: "transport",
    };
  }
}
//@ chunk-f9asxqh1.js:23594-23651 placement
/**
 * 判断字节数组开头是否为 zip 的 PK 标记。
 */
function isZipMagic(e) {
  return e.length >= 2 && e[0] === 80 && e[1] === 75;
}
export { sessionSkillManifestSlot, isZipMagic };
