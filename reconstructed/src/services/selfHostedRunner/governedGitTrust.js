/**
 * services/selfHostedRunner/governedGitTrust.ts
 *
 * 2.1.316 新增：自托管 runner 的"受管 git"：git 挂载路由、GIT_SSL_CAINFO 信任包构建与会话 git 环境覆盖
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hm0ce8vc.js (35)
 * attribution: placement 35
 */
import {
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
} from "fs/promises";
import { constants, constants as constants_2, constants as constants_4 } from "fs";
import { getGitSslConfig } from "./_new/getGitSslConfig.js";
import { planGitTlsTrust } from "../../selfHostedRunner/git/proxyTrust.js";
import { plural } from "../../utils/stringUtils.js";
import { GITHUB_HOST } from "../../utils/git/githubUrl.js";
import {
  SYSTEM_CA_BUNDLE,
  MAX_SYSTEM_CA_BYTES,
  MAX_CA_TOTAL_BYTES,
} from "../../upstreamproxy/upstreamproxy.js";
import { PEM_CERT_BLOCK_RE } from "../../utils/mtls.js";
import { withoutBlockedCerts } from "../../utils/caCerts.js";
import { writeFileAtomic, O_NONBLOCK } from "../../utils/atomicPublishWrite.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { buildGitConfigEnv } from "../../utils/gitSafeExec.js";

/**
 * 初始化受管 git 状态：操作员变量、路由、信任包（初始 unavailable）。
 */
//@ chunk-hm0ce8vc.js:39893-40086 placement
function createGovernedGitState(e, n, r, s, a = !1) {
  return {
    operator: getGitSslConfig(e, n),
    routing: r,
    trustBundlePath: s,
    trustBundle: { status: "unavailable", reason: "variable_unset" },
    otherSessionsShareTheAccount: a,
    anySourceOnGitMount: !1,
  };
}
/**
 * 根据 GIT_SSL_CAINFO 构建会话信任包；多会话共享账号时不构建。
 */
//@ chunk-hm0ce8vc.js:40086-40470 placement
async function buildGitTrustBundle(e, n) {
  let r = e.operator.certificateFile[0]?.value.trim();
  if (!e.routing || !r) {
    e.trustBundle = { status: "unavailable", reason: "variable_unset" };
    return;
  }
  if (e.otherSessionsShareTheAccount) {
    e.trustBundle = { status: "unavailable", reason: "shared_with_other_sessions" };
    return;
  }
  ((e.trustBundle = { status: "unavailable", reason: "bundle_write_failed" }),
    (e.trustBundle = await n(r, e.trustBundlePath)));
}
/**
 * 按角色（prep/hook/child）计算 git 环境覆盖与命令级 config 项。
 */
//@ chunk-hm0ce8vc.js:40470-40713 placement
function gitEnvironmentForRole(e, n, r) {
  let { envOverrides: envOverrides, commandScopeEntries: commandScopeEntries } = planGitTlsTrust({
    role: n,
    operator: e.operator,
    routing: e.routing,
    target: r,
    trustBundle: e.trustBundle,
  });
  if (Object.keys(envOverrides).length === 0 && commandScopeEntries.length === 0) return;
  return { envOverrides: envOverrides, commandScopeEntries: commandScopeEntries };
}
/**
 * 给走 git 挂载的源设置 prep 阶段 git 环境，返回是否有源在挂载上。
 */
//@ chunk-hm0ce8vc.js:40713-40875 placement
function applyMountGitEnvironment(e, n) {
  let r = !1;
  for (let s of n)
    if (s.governedMount && s.url)
      ((r = !0), (s.gitEnvironment = gitEnvironmentForRole(e, "prep", { url: s.url, mountRouted: !0 })));
  return ((e.anySourceOnGitMount = r), r);
}
/**
 * 信任包各失败原因的解释与修复建议文本。
 */
//@ chunk-hm0ce8vc.js:40875-42825 placement
var TRUST_BUNDLE_FAILURE_EXPLANATIONS = {
  file_unreadable: {
    because:
      "the file the variable names could not be read (missing, not a regular file, or not readable by the runner's account)",
    first: "Fix the path or its permissions: git cannot read it either.",
  },
  file_too_large: {
    because: "the file the variable names is larger than 1 MiB",
    first:
      "Cut it down to your company's own certificate authorities; the runner adds the public ones itself.",
  },
  file_not_pem: {
    because: "the file the variable names holds no certificate in PEM form",
    first: "Put your certificate authorities in it in PEM form: git cannot use it as it is either.",
  },
  file_other_certificate_kinds: {
    because:
      "the file the variable names holds a TRUSTED CERTIFICATE or X509 CERTIFICATE block, which the certificate file the runner builds cannot carry",
    first:
      "Give every certificate authority in it as a plain CERTIFICATE block (openssl x509 without -trustout).",
  },
  bundle_write_failed: {
    because:
      "the runner could not finish building the file in the _sessions folder under its --base-dir (a read of the certificate file, the check against Claude Code's deny list, or a write in that folder failed or did not complete)",
    first:
      "Check that folder's permissions and free space; if those are in order, run with --log-level debug, which prints the error for a failed deny-list check or a step that did not complete.",
  },
  no_system_roots: {
    because:
      "this machine has no usable file of public certificate authorities at a standard Linux location (one the runner can read, holding a certificate that is not on Claude Code's deny list)",
    first: "On Linux, install or update your distribution's ca-certificates package.",
  },
  shared_with_other_sessions: {
    because:
      "this runner runs more than one session at a time (--capacity above 1), and another session's process, which runs under the same account, could rewrite a certificate file the runner builds",
    first:
      "Run with --capacity 1, or put the public certificate authorities into your company's file yourself.",
  },
};
/**
 * 生成信任包不可用的 [runner:warn] 提示。
 */
//@ chunk-hm0ce8vc.js:42825-43765 placement
function formatTrustBundleWarning(e) {
  if (
    !e.routing ||
    e.operator.certificateFile.length === 0 ||
    e.trustBundle.status === "built" ||
    e.trustBundle.reason === "variable_unset"
  )
    return;
  let { because: because, first: first } = TRUST_BUNDLE_FAILURE_EXPLANATIONS[e.trustBundle.reason],
    s =
      e.trustBundle.reason === "shared_with_other_sessions"
        ? "Otherwise unset"
        : "Otherwise add the public certificate authorities to the file, or unset";
  return `[runner:warn] governed git: GIT_SSL_CAINFO is set on this runner and ${because}, so the runner did not build the certificate file it gives its own git for Anthropic-managed git (the git mount): the public certificate authorities plus yours. The runner's own fetches from the mount keep the variable as it is, and fail if the file holds only your company's certificate authority, because the mount presents a public certificate. ${first} ${s} the variable for the runner and name your company's file for your own server in the machine's system git config (an http.<your server's URL>.sslCAInfo entry).`;
}
//@ chunk-hm0ce8vc.js:43765-44223 placement
function formatCertificatesLeftOutWarning(e) {
  let max = Math.max(0, ...e.map((r) => (r.status === "built" ? (r.certificatesLeftOut ?? 0) : 0)));
  if (max === 0) return;
  return `[runner:warn] governed git: the certificate file the runner builds for Anthropic-managed git (the git mount) leaves out ${max} ${plural(max, "certificate")} because of Claude Code's deny list, from this machine's public certificate authorities or the file GIT_SSL_CAINFO names. A git given this file does not trust ${plural(max, "it", "them")} for the mount.`;
}
/**
 * 按角色（如 prep）计算 git 挂载的信任判定：把 operator、routing、target、trustBundle 交给 Oln，取其 decision。旧版名 handleFileDescriptorRedirection 误配，属 runner/挂载模块。
 */
//@ chunk-hm0ce8vc.js:44223-44345 placement = handleFileDescriptorRedirection (0.389)
function gitTrustDecisionForRole(e, n, r) {
  return planGitTlsTrust({
    role: n,
    operator: e.operator,
    routing: e.routing,
    target: r,
    trustBundle: e.trustBundle,
  }).decision;
}
//@ chunk-hm0ce8vc.js:44345-44426 placement
function needsMountFetchWithoutUpstream(e) {
  return Boolean(e.governedMount && !e.upstreamUrl && !e.fetchViaMount);
}
//@ chunk-hm0ce8vc.js:44426-44480 placement
function isOnGovernedMount(e) {
  return Boolean(e.governedMount && e.url);
}
//@ chunk-hm0ce8vc.js:44480-44518 placement
function isEnvAssignmentFree(e) {
  return !e.includes("=");
}
//@ chunk-hm0ce8vc.js:44518-44576 placement
function governedMountUrlOf(e) {
  return e.governedMount && e.url ? e.url : void 0;
}
//@ chunk-hm0ce8vc.js:44576-44805 placement
function gitEnvironmentForHook(e, n) {
  let { envOverrides: envOverrides, commandScopeEntries: commandScopeEntries } = planGitTlsTrust({
    role: "hook",
    operator: e.operator,
    routing: e.routing,
    reachesGitMount: n,
  });
  if (Object.keys(envOverrides).length === 0 && commandScopeEntries.length === 0) return;
  return { envOverrides: envOverrides, commandScopeEntries: commandScopeEntries };
}
//@ chunk-hm0ce8vc.js:44805-44873 placement
function gitEnvironmentForSourceHook(e, n) {
  return gitEnvironmentForHook(e, governedMountUrlOf(n) !== void 0 || e.anySourceOnGitMount);
}
//@ chunk-hm0ce8vc.js:44873-44923 placement
function gitEnvironmentForSessionHook(e) {
  return gitEnvironmentForHook(e, e.anySourceOnGitMount);
}
/**
 * git 2.31：此版本起 git 允许 GIT_SSL_CAINFO 覆盖 config。
 */
//@ chunk-hm0ce8vc.js:44923-44937 placement
var MIN_GIT_VERSION_FOR_CAINFO = "2.31";
/**
 * 针对 GIT_SSL_CAINFO 等被移动/保留/未设置的各种决策生成长篇 [runner:warn] 说明。
 */
//@ chunk-hm0ce8vc.js:44937-54229 placement
function formatGovernedGitDecisionWarnings({
  governedHosts: governedHosts,
  gitConfigArm: gitConfigArm,
  child: child,
  childTrustBundle: childTrustBundle,
  serverSetsCertificateFile: serverSetsCertificateFile,
  runnerMountGit: runnerMountGit,
  rawGitVersion: rawGitVersion,
  hostsCoveredByNoProxy: hostsCoveredByNoProxy,
  clientCertificateVariablesSet: clientCertificateVariablesSet,
}) {
  if (governedHosts.length === 0) return [];
  let p = [],
    S = plural(governedHosts.length, "that host", "those hosts"),
    T = runnerMountGit.certificateFile !== "left_unset";
  if (
    gitConfigArm &&
    (child.certificateFile === "moved" ||
      child.certificateFile === "left_old_git" ||
      child.certificateFile === "left_unusable_value")
  ) {
    let v = !serverSetsCertificateFile
        ? "GIT_SSL_CAINFO is set on this runner"
        : T
          ? "GIT_SSL_CAINFO is set on this runner, a value the server delivers with the session (the variables configured on your self-hosted environment) replaces it inside a session,"
          : "GIT_SSL_CAINFO is set for this session by a value the server delivers with it (the variables configured on your self-hosted environment), not on this runner,",
      w = serverSetsCertificateFile
        ? "take the variable out of the variables configured on your self-hosted environment"
        : "unset the variable for the runner",
      E = `[runner:warn] governed git: ${v} and the server governs ${plural(governedHosts.length, "host")} ${governedHosts.join(", ")}. git lets that variable override the CA file named in git config, for every host, `,
      A;
    if (child.certificateFile === "left_old_git")
      ((E += `so inside a session git rejects the session relay's certificate for ${S}. This machine's git (${rawGitVersion || "version not readable"}) could not be confirmed as ${MIN_GIT_VERSION_FOR_CAINFO} or newer, so the runner leaves the variable as it is.`),
        (A = `Upgrade git, or add your CA to the machine's system certificate bundle and ${w}.`));
    else if (child.certificateFile === "left_unusable_value")
      ((E += `so if git takes a file from it, inside a session git rejects the session relay's certificate for ${S}. Its value cannot be written into git config (it is blank or holds a line break), so the runner leaves the variable as it is.`),
        (A = `Name the file on one line, or ${w}.`));
    else {
      E += `so inside a session it would make git reject the session relay's certificate for ${S}. For a session the runner takes the variable out of the environment and gives git the same file as http.sslCAInfo instead. Governed hosts use the relay's certificate file. `;
      let G =
        childTrustBundle.status === "unavailable" && childTrustBundle.reason !== "variable_unset"
          ? TRUST_BUNDLE_FAILURE_EXPLANATIONS[childTrustBundle.reason]
          : void 0;
      ((E += child.mountEntries
        ? "Anthropic-managed git (the git mount) is checked against a certificate file the runner writes for the session: the public certificate authorities plus that file's. "
        : "For Anthropic-managed git (the git mount) the runner would have written the session a certificate file, the public certificate authorities plus that file's, and did not" +
          (G ? `: ${G.because}` : "") +
          ". So git inside the session that goes to the mount checks it against that file alone, as it did under the variable, and fails there if the file holds only your company's certificate authority. "),
        (E +=
          "Hosts the server does not govern keep trusting that file, with differences from the variable that the runner guide lists (Git authentication), the one that matters most being that an http.<url>.sslCAInfo for a host, in any git config file, now takes precedence over that file for that host."),
        (A = child.mountEntries
          ? "Nothing for you to do for git inside a session unless one of those differences touches one of your hosts."
          : (G?.first ??
            "Add the public certificate authorities to that file if git inside a session has to reach the mount.")));
    }
    if (runnerMountGit.certificateFile === "moved")
      E +=
        " The runner's own fetches from Anthropic-managed git (the git mount), before and after the session, do not use the variable: they check the mount against a certificate file the runner builds for the session, the public certificate authorities plus yours.";
    if (T)
      E +=
        " The runner leaves your lifecycle hooks (checkout, post-session) alone: they inherit this variable from the runner's environment as it is.";
    p.push(`${E} ${A}`);
  }
  if (
    runnerMountGit.skipVerification === "pinned_off" ||
    child.skipVerification === "left" ||
    child.skipVerification === "moved"
  ) {
    let v = runnerMountGit.skipVerification !== "unset",
      w =
        "[runner:warn] governed git: " +
        (v
          ? "GIT_SSL_NO_VERIFY is set on this runner"
          : "GIT_SSL_NO_VERIFY is set for this session by a value the server delivers with it (the variables configured on your self-hosted environment), not on this runner") +
        ", which tells git to check no server's certificate.";
    if (runnerMountGit.skipVerification === "pinned_off")
      w +=
        " The runner's own fetches from Anthropic-managed git (the git mount) ignore it, because they carry the session's token: they check the mount's certificate, and fail if git knows no certificate authority that vouches for what the mount presents (behind a proxy that re-signs traffic, name your company's certificate authority in GIT_SSL_CAINFO).";
    if (child.skipVerification === "moved")
      w += ` Inside a session the runner takes it out of the environment and gives git http.sslVerify=false instead, which still applies to your own servers (with one exception the runner guide describes: the git that makes a new working copy), and no longer to Anthropic-managed git (the git mount) or to the ${plural(governedHosts.length, "host")} the server governs (${governedHosts.join(", ")}): their certificates are checked, because git inside a session carries the session's token to the mount and reaches the governed ${plural(governedHosts.length, "host")} through the session's relay. An http.<url>.sslVerify of your own for a server, in any git config file, now takes precedence over it for that server. If git inside a session then fails a certificate check at the mount or a governed host (behind a proxy that re-signs traffic, say), name your company's certificate authority in GIT_SSL_CAINFO.`;
    else if (child.skipVerification === "left") {
      let E = v
        ? "unset the switch for the runner"
        : "take it out of the variables configured on your self-hosted environment";
      w +=
        (gitConfigArm
          ? ` This machine's git (${rawGitVersion || "version not readable"}) could not be confirmed as ${MIN_GIT_VERSION_FOR_CAINFO} or newer, so it cannot take the switch's meaning from git config:`
          : " The session's git is not routed through a git config of the session's own, which is what could carry the switch's meaning:") +
        ` inside a session the runner leaves it as it is, so git there checks no certificate, for your own servers, for ${plural(governedHosts.length, "the governed host", "the governed hosts")}, and for Anthropic-managed git (the git mount), to which it carries the session's token.` +
        (gitConfigArm
          ? ` Upgrade git, or ${E}.`
          : v
            ? " Unset the switch for the runner if you can."
            : " Take it out of the variables configured on your self-hosted environment if you can.");
    }
    p.push(
      v
        ? `${w} The runner leaves your lifecycle hooks (checkout, post-session) alone, with one exception: the hooks of a session that has a repository on Anthropic-managed git, which can reach it with the session's token. That is every checkout hook of such a session, whether or not the runner hands it an address there (CLAUDE_RUNNER_GIT_MOUNT_URL), and its post-session hook. For such a hook the runner takes the switch out of the environment and gives git http.sslVerify=false instead, with http.<url>.sslVerify=true for the mount: every git that hook starts checks the mount's certificate and, as before, no other server's. The hooks of every other session inherit the switch from the runner's environment as it is. If such a hook's fetch from the mount, or its push to it, then fails a certificate check (behind a proxy that re-signs traffic, say), name your company's certificate authority in GIT_SSL_CAINFO.`
        : w,
    );
  }
  if (gitConfigArm && hostsCoveredByNoProxy.length > 0) {
    let v = hostsCoveredByNoProxy.length;
    p.push(
      `[runner:warn] governed git: this machine's NO_PROXY appears to cover governed ${plural(v, "host")} ${hostsCoveredByNoProxy.join(", ")}. git hands NO_PROXY to its HTTP library, which may then skip the session relay for ${plural(v, "that host", "those hosts")} even though the relay is set in git config. If it does, git inside the session reaches ${plural(v, "it", "them")} over this machine's own network path without the relay's credential` +
        (child.certificateFile === "moved"
          ? `, and checks ${plural(v, "its", "their")} certificate against the relay's certificate file, because GIT_SSL_CAINFO no longer applies inside a session: a host that only that variable's file vouches for fails the certificate check, and fetch or push to a private repository on any other will most likely fail.`
          : ", and fetch or push to a private repository there will most likely fail.") +
        ` The clone before the session starts is not affected. To route ${plural(v, "the host", "the hosts")} through the relay, take ${plural(v, "it", "them")} out of NO_PROXY and no_proxy in the runner's environment; if the entry must stay (a parent domain, say), ask Anthropic to list ${plural(v, "the host", "the hosts")} as direct instead.`,
    );
  }
  let filtered = governedHosts.filter((v) => v !== GITHUB_HOST);
  if (gitConfigArm && clientCertificateVariablesSet.length > 0 && filtered.length > 0) {
    let v = filtered.length;
    p.push(
      `[runner:warn] governed git: ${clientCertificateVariablesSet.join(" and ")} ${plural(clientCertificateVariablesSet.length, "is", "are")} set on this runner, a TLS client certificate that git offers to every server, and the server governs ${plural(v, "host")} ${filtered.join(", ")}. Inside a session git reaches ${plural(v, "that host", "those hosts")} through the session's relay, so it is the relay that git would offer the certificate to, and not your company's server: a server that demands a client certificate will refuse the session's git. The runner leaves ${plural(clientCertificateVariablesSet.length, "the variable as it is", "both variables as they are")}. If ${plural(v, "that host demands", "those hosts demand")} one, ask Anthropic to list ${plural(v, "it", "them")} as direct; otherwise unset the ${plural(clientCertificateVariablesSet.length, "variable", "variables")} for the runner, or scope the certificate to the servers that need it (http.<url>.sslCert and http.<url>.sslKey in the machine's system git config).`,
    );
  }
  return p;
}
//@ chunk-hm0ce8vc.js:54413-54455 placement
function stripWhitespace(e) {
  return e.replace(/\s/g, "");
}
/**
 * 读取 GIT_SSL_CAINFO 指向的文件，检查大小/PEM/证书种类，合并系统根证书生成信任包。
 */
//@ chunk-hm0ce8vc.js:54455-55655 placement
async function readTrustBundleSource(e, n, r = SYSTEM_CA_BUNDLE) {
  if (e === void 0) return { status: "unavailable", reason: "variable_unset" };
  let s = await readSmallTextFile(e, MAX_SYSTEM_CA_BYTES);
  if (s.kind !== "text")
    return { status: "unavailable", reason: s.kind === "too_large" ? "file_too_large" : "file_unreadable" };
  if (/^-----BEGIN (?!CERTIFICATE-----)[A-Z0-9 ]*CERTIFICATE-----/m.test(s.text))
    return { status: "unavailable", reason: "file_other_certificate_kinds" };
  let match = s.text.match(PEM_CERT_BLOCK_RE);
  if (!match) return { status: "unavailable", reason: "file_not_pem" };
  let o,
    l = [];
  for (let y of r) {
    let v = await readSmallTextFile(y, MAX_CA_TOTAL_BYTES);
    if (v.kind !== "text") continue;
    let w = withoutBlockedCerts(v.text, "git trust bundle");
    if (w?.match(PEM_CERT_BLOCK_RE)) {
      ((o = w), (l = v.text.match(PEM_CERT_BLOCK_RE) ?? []));
      break;
    }
  }
  if (o === void 0) return { status: "unavailable", reason: "no_system_roots" };
  let u = withoutBlockedCerts(s.text, "git trust bundle")?.match(PEM_CERT_BLOCK_RE) ?? [],
    h = new Set(o.match(PEM_CERT_BLOCK_RE)),
    p = o.endsWith(`
`)
      ? o
      : `${o}
`;
  for (let y of u)
    if (!h.has(y))
      (h.add(y),
        (p += `${y}
`));
  try {
    await writeFileAtomic(n, p, 384);
  } catch (error) {
    return (
      logForDebugging(
        `[runner:session] governed git: the trust bundle could not be written: ${errorMessage(error)}`,
        { level: "warn" },
      ),
      await unlink_3(n).catch(() => {}),
      { status: "unavailable", reason: "bundle_write_failed" }
    );
  }
  let S = new Set([...h].map(stripWhitespace)),
    size = new Set([...l, ...match].map(stripWhitespace).filter((y) => !S.has(y))).size;
  return { status: "built", path: n, ...(size > 0 && { certificatesLeftOut: size }) };
}
//@ chunk-hm0ce8vc.js:55655-55719 placement
async function removeFileIfExists(e) {
  try {
    await unlink_3(e);
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
}
//@ chunk-hm0ce8vc.js:55719-56182 placement
async function readSmallTextFile(path, maxBytes) {
  let r;
  try {
    r = await open_4(path, constants_4.O_RDONLY | O_NONBLOCK);
  } catch {
    return { kind: "unreadable" };
  }
  try {
    let stats = await r.stat();
    if (!stats.isFile()) return { kind: "unreadable" };
    if (stats.size > maxBytes) return { kind: "too_large" };
    let alloc = Buffer.alloc(maxBytes + 1),
      o = 0;
    while (o < alloc.length) {
      let { bytesRead: bytesRead } = await r.read(alloc, o, alloc.length - o, o);
      if (bytesRead === 0) break;
      o += bytesRead;
    }
    if (o > maxBytes) return { kind: "too_large" };
    return { kind: "text", text: alloc.toString("utf8", 0, o) };
  } catch {
    return { kind: "unreadable" };
  } finally {
    await r.close().catch(() => {});
  }
}
//@ chunk-hm0ce8vc.js:56182-56305 placement
function readServerGitSslVars(e, n) {
  return {
    serverCertificateFile: getEnvCaseInsensitive(e, "GIT_SSL_CAINFO", n),
    serverSkipVerification: getEnvCaseInsensitive(e, "GIT_SSL_NO_VERIFY", n),
  };
}
//@ chunk-hm0ce8vc.js:56305-56464 placement
function getEnvCaseInsensitive(e, n, r) {
  if (e === void 0) return;
  if (Object.hasOwn(e, n)) return e[n];
  if (!r) return;
  for (let [s, a] of Object.entries(e)) if (s.toUpperCase() === n) return a;
  return;
}
//@ chunk-hm0ce8vc.js:56464-56555 placement
function getGitConfigParameters(e, n, r) {
  return (
    getEnvCaseInsensitive(e, "GIT_CONFIG_PARAMETERS", r) ??
    getEnvCaseInsensitive(n, "GIT_CONFIG_PARAMETERS", r)
  );
}
//@ chunk-hm0ce8vc.js:56555-56650 placement
function serverCertificateFileOf(e) {
  return typeof e.serverCertificateFile === "string" ? e.serverCertificateFile : void 0;
}
//@ chunk-hm0ce8vc.js:56650-56895 placement
function gitEnvironmentForChild(e, n, r, s) {
  return planGitTlsTrust({
    role: "child",
    operator: e.operator,
    serverCertificateFile: serverCertificateFileOf(n),
    serverSetsSkipVerification: n.serverSkipVerification !== void 0,
    routing: e.routing,
    gitConfigArm: n.gitConfigArm,
    gitReadsEnvironmentConfig: r,
    trustBundle: s,
  });
}
/**
 * 计算子会话 git 环境；变量被移动时确认 git 版本后才采用。
 */
//@ chunk-hm0ce8vc.js:56895-57546 placement
async function resolveChildGitEnvironment(e, n, r, s) {
  let a = gitEnvironmentForChild(e, n, !0, e.trustBundle);
  if (a.decision.certificateFile !== "moved" && a.decision.skipVerification !== "moved")
    return { answer: a, trustBundle: e.trustBundle };
  if (!(await r()))
    return { answer: gitEnvironmentForChild(e, n, !1, e.trustBundle), trustBundle: e.trustBundle };
  if (a.decision.certificateFile !== "moved") return { answer: a, trustBundle: e.trustBundle };
  let o = serverCertificateFileOf(n)?.trim(),
    l = e.operator.certificateFile[0]?.value.trim();
  if (o === void 0 || o === l) return { answer: a, trustBundle: e.trustBundle };
  let u = e.otherSessionsShareTheAccount
    ? { status: "unavailable", reason: "shared_with_other_sessions" }
    : await s(o, n.serverValueTrustBundlePath);
  return { answer: gitEnvironmentForChild(e, n, !0, u), trustBundle: u };
}
//@ chunk-hm0ce8vc.js:57546-57692 placement
function sslEntriesOfCommandScope(e) {
  return (e?.commandScopeEntries ?? []).filter(
    ([n, r]) => (/^http\..+\.sslVerify$/i.test(n) && r === "true") || /^http\..+\.sslCAInfo$/i.test(n),
  );
}
//@ chunk-hm0ce8vc.js:57692-57972 placement = shellQuote (0.768)
function shellQuote(e, n) {
  if (n.length === 0) return {};
  let r = e === void 0 || e === null ? "" : String(e);
  if (r.trim() === "" || n.some(([a]) => a.includes("="))) return { GIT_CONFIG_PARAMETERS: void 0 };
  let mapped = n.map(([a, o]) => `'${`${a}=${o}`.replace(/'/g, "'\\''")}'`);
  return { GIT_CONFIG_PARAMETERS: [r, ...mapped].join(" ") };
}
//@ chunk-hm0ce8vc.js:57972-58125 placement
function buildChildGitEnv(e, n, r, s) {
  let a = [...(r ? [["include.path", r]] : []), ...(e?.commandScopeEntries ?? [])];
  return {
    ...e?.envOverrides,
    ...(a.length > 0 && buildGitConfigEnv(n, a)),
    ...shellQuote(s, sslEntriesOfCommandScope(e)),
  };
}
//@ chunk-hm0ce8vc.js:58125-58139 placement
var ld = [2, 31];
//@ chunk-hm0ce8vc.js:58139-58219 placement
var o_ = [..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-"];
//@ chunk-hm0ce8vc.js:58219-58292 placement
function silenceStretchMs(e) {
  return e <= 0 ? 0 : Math.max(1, Math.min(20000, Math.floor(e / 4)));
}
/**
 * 输出静默看门狗：limitMs 内无活动则回调 onSilent。
 */
//@ chunk-hm0ce8vc.js:58292-58843 placement
class SilenceWatchdog {
  state = "waiting";
  timer;
  limitMs;
  lastStretchMs;
  onSilent;
  constructor({ limitMs: e, onSilent: n }) {
    ((this.limitMs = e), (this.lastStretchMs = 2 * silenceStretchMs(e)), (this.onSilent = n));
  }
  arm() {
    if (this.state === "waiting" && this.limitMs > 0) this.state = "armed";
    this.heard();
  }
  heard() {
    if (this.state !== "armed") return;
    this.wait(Math.max(0, this.limitMs - this.lastStretchMs), () =>
      this.wait(this.lastStretchMs, () => {
        (this.heard(), this.onSilent());
      }),
    );
  }
  end() {
    ((this.state = "ended"), clearTimeout(this.timer), (this.timer = void 0));
  }
  wait(e, n) {
    (clearTimeout(this.timer), (this.timer = setTimeout(n, e)), this.timer.unref?.());
  }
}
//@ chunk-hm0ce8vc.js:58843-58886 placement
var CLAUDE_CODE_REMOTE_SESSION_ORIGIN = "CLAUDE_CODE_REMOTE_SESSION_ORIGIN";

export {
  createGovernedGitState,
  buildGitTrustBundle,
  readTrustBundleSource,
  readServerGitSslVars,
  resolveChildGitEnvironment,
  ld,
  formatCertificatesLeftOutWarning,
  formatGovernedGitDecisionWarnings,
  gitTrustDecisionForRole,
  applyMountGitEnvironment,
  formatTrustBundleWarning,
  governedMountUrlOf,
  gitEnvironmentForSourceHook,
  needsMountFetchWithoutUpstream,
  gitEnvironmentForRole,
  gitEnvironmentForSessionHook,
  isOnGovernedMount,
  removeFileIfExists,
  silenceStretchMs,
  CLAUDE_CODE_REMOTE_SESSION_ORIGIN,
  buildChildGitEnv,
  getGitConfigParameters,
  SilenceWatchdog,
  isEnvAssignmentFree,
};
