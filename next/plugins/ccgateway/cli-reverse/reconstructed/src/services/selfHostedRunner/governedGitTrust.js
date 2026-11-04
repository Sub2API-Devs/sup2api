/**
 * services/selfHostedRunner/governedGitTrust.ts
 *
 * 2.1.316 新增：自托管 runner 的"受管 git"：git 挂载路由、GIT_SSL_CAINFO 信任包构建与会话 git 环境覆盖
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hm0ce8vc.js (35), chunk-t3sg9e26.js (1)
 * attribution: placement 36
 */
import { unlink, open } from "fs/promises";
import { constants } from "fs";
import { truncatePath } from "../../utils/logoV2Utils.js";
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

//@ chunk-t3sg9e26.js:1014-1126 placement
function getGitSslConfig(env, envNames) {
  return {
    certificateFile: truncatePath(env, "GIT_SSL_CAINFO", envNames),
    skipVerification: truncatePath(env, "GIT_SSL_NO_VERIFY", envNames),
  };
}
//@ chunk-hm0ce8vc.js:39893-40086 placement
/**
 * 初始化受管 git 状态：操作员变量、路由、信任包（初始 unavailable）。
 */
function createGovernedGitState(
  env,
  envNames,
  routing,
  trustBundlePath,
  otherSessionsShareTheAccount = false,
) {
  return {
    operator: getGitSslConfig(env, envNames),
    routing,
    trustBundlePath,
    trustBundle: {
      status: "unavailable",
      reason: "variable_unset",
    },
    otherSessionsShareTheAccount,
    anySourceOnGitMount: false,
  };
}
//@ chunk-hm0ce8vc.js:40086-40470 placement
/**
 * 根据 GIT_SSL_CAINFO 构建会话信任包；多会话共享账号时不构建。
 */
async function buildGitTrustBundle(state, readTrustBundleSource) {
  let trimmed = state.operator.certificateFile[0]?.value.trim();
  if (!state.routing || !trimmed) {
    state.trustBundle = {
      status: "unavailable",
      reason: "variable_unset",
    };
    return;
  }
  if (state.otherSessionsShareTheAccount) {
    state.trustBundle = {
      status: "unavailable",
      reason: "shared_with_other_sessions",
    };
    return;
  }
  state.trustBundle = {
    status: "unavailable",
    reason: "bundle_write_failed",
  };
  state.trustBundle = await readTrustBundleSource(trimmed, state.trustBundlePath);
}
//@ chunk-hm0ce8vc.js:40470-40713 placement
/**
 * 按角色（prep/hook/child）计算 git 环境覆盖与命令级 config 项。
 */
function gitEnvironmentForRole(state, role, target) {
  let { envOverrides, commandScopeEntries } = planGitTlsTrust({
    role,
    operator: state.operator,
    routing: state.routing,
    target,
    trustBundle: state.trustBundle,
  });
  if (Object.keys(envOverrides).length === 0 && commandScopeEntries.length === 0) return;
  return {
    envOverrides,
    commandScopeEntries,
  };
}
//@ chunk-hm0ce8vc.js:40713-40875 placement
/**
 * 给走 git 挂载的源设置 prep 阶段 git 环境，返回是否有源在挂载上。
 */
function applyMountGitEnvironment(state, sources) {
  let anyMount = false;
  for (let source of sources)
    if (source.governedMount && source.url) {
      anyMount = true;
      source.gitEnvironment = gitEnvironmentForRole(state, "prep", {
        url: source.url,
        mountRouted: true,
      });
    }
  state.anySourceOnGitMount = anyMount;
  return anyMount;
}
//@ chunk-hm0ce8vc.js:40875-42825 placement
/**
 * 信任包各失败原因的解释与修复建议文本。
 */
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
//@ chunk-hm0ce8vc.js:42825-43765 placement
/**
 * 生成信任包不可用的 [runner:warn] 提示。
 */
function formatTrustBundleWarning(state) {
  if (
    !state.routing ||
    state.operator.certificateFile.length === 0 ||
    state.trustBundle.status === "built" ||
    state.trustBundle.reason === "variable_unset"
  )
    return;
  let { because, first } = TRUST_BUNDLE_FAILURE_EXPLANATIONS[state.trustBundle.reason];
  let elseInstruction =
    state.trustBundle.reason === "shared_with_other_sessions"
      ? "Otherwise unset"
      : "Otherwise add the public certificate authorities to the file, or unset";
  return `[runner:warn] governed git: GIT_SSL_CAINFO is set on this runner and ${because}, so the runner did not build the certificate file it gives its own git for Anthropic-managed git (the git mount): the public certificate authorities plus yours. The runner's own fetches from the mount keep the variable as it is, and fail if the file holds only your company's certificate authority, because the mount presents a public certificate. ${first} ${elseInstruction} the variable for the runner and name your company's file for your own server in the machine's system git config (an http.<your server's URL>.sslCAInfo entry).`;
}
//@ chunk-hm0ce8vc.js:43765-44223 placement
function formatCertificatesLeftOutWarning(trustBundles) {
  let max = Math.max(
    0,
    ...trustBundles.map((bundle) => (bundle.status === "built" ? (bundle.certificatesLeftOut ?? 0) : 0)),
  );
  if (max === 0) return;
  return `[runner:warn] governed git: the certificate file the runner builds for Anthropic-managed git (the git mount) leaves out ${max} ${plural(max, "certificate")} because of Claude Code's deny list, from this machine's public certificate authorities or the file GIT_SSL_CAINFO names. A git given this file does not trust ${plural(max, "it", "them")} for the mount.`;
}
//@ chunk-hm0ce8vc.js:44223-44345 placement (2.1.88 match: handleFileDescriptorRedirection, 0.389)
/**
 * 按角色（如 prep）计算 git 挂载的信任判定：把 operator、routing、target、trustBundle 交给 Oln，取其 decision。旧版名 handleFileDescriptorRedirection 误配，属 runner/挂载模块。
 */
function gitTrustDecisionForRole(state, role, target) {
  return planGitTlsTrust({
    role,
    operator: state.operator,
    routing: state.routing,
    target,
    trustBundle: state.trustBundle,
  }).decision;
}
//@ chunk-hm0ce8vc.js:44345-44426 placement
function needsMountFetchWithoutUpstream(source) {
  return Boolean(source.governedMount && !source.upstreamUrl && !source.fetchViaMount);
}
//@ chunk-hm0ce8vc.js:44426-44480 placement
function isOnGovernedMount(source) {
  return Boolean(source.governedMount && source.url);
}
//@ chunk-hm0ce8vc.js:44480-44518 placement
function isEnvAssignmentFree(href) {
  return !href.includes("=");
}
//@ chunk-hm0ce8vc.js:44518-44576 placement
function governedMountUrlOf(source) {
  return source.governedMount && source.url ? source.url : undefined;
}
//@ chunk-hm0ce8vc.js:44576-44805 placement
function gitEnvironmentForHook(state, reachesGitMount) {
  let { envOverrides, commandScopeEntries } = planGitTlsTrust({
    role: "hook",
    operator: state.operator,
    routing: state.routing,
    reachesGitMount,
  });
  if (Object.keys(envOverrides).length === 0 && commandScopeEntries.length === 0) return;
  return {
    envOverrides,
    commandScopeEntries,
  };
}
//@ chunk-hm0ce8vc.js:44805-44873 placement
function gitEnvironmentForSourceHook(state, source) {
  return gitEnvironmentForHook(state, governedMountUrlOf(source) !== undefined || state.anySourceOnGitMount);
}
//@ chunk-hm0ce8vc.js:44873-44923 placement
function gitEnvironmentForSessionHook(state) {
  return gitEnvironmentForHook(state, state.anySourceOnGitMount);
}
//@ chunk-hm0ce8vc.js:44923-44937 placement
/**
 * git 2.31：此版本起 git 允许 GIT_SSL_CAINFO 覆盖 config。
 */
var MIN_GIT_VERSION_FOR_CAINFO = "2.31";
//@ chunk-hm0ce8vc.js:44937-54229 placement
/**
 * 针对 GIT_SSL_CAINFO 等被移动/保留/未设置的各种决策生成长篇 [runner:warn] 说明。
 */
function formatGovernedGitDecisionWarnings({
  governedHosts,
  gitConfigArm,
  child,
  childTrustBundle,
  serverSetsCertificateFile,
  runnerMountGit,
  rawGitVersion,
  hostsCoveredByNoProxy,
  clientCertificateVariablesSet,
}) {
  if (governedHosts.length === 0) return [];
  let warnings = [];
  let hostsPhrase = plural(governedHosts.length, "that host", "those hosts");
  let runnerHasCertificateFile = runnerMountGit.certificateFile !== "left_unset";
  if (
    gitConfigArm &&
    (child.certificateFile === "moved" ||
      child.certificateFile === "left_old_git" ||
      child.certificateFile === "left_unusable_value")
  ) {
    let variableIntro = !serverSetsCertificateFile
      ? "GIT_SSL_CAINFO is set on this runner"
      : runnerHasCertificateFile
        ? "GIT_SSL_CAINFO is set on this runner, a value the server delivers with the session (the variables configured on your self-hosted environment) replaces it inside a session,"
        : "GIT_SSL_CAINFO is set for this session by a value the server delivers with it (the variables configured on your self-hosted environment), not on this runner,";
    let unsetInstruction = serverSetsCertificateFile
      ? "take the variable out of the variables configured on your self-hosted environment"
      : "unset the variable for the runner";
    let message = `[runner:warn] governed git: ${variableIntro} and the server governs ${plural(governedHosts.length, "host")} ${governedHosts.join(", ")}. git lets that variable override the CA file named in git config, for every host, `;
    let remedy;
    if (child.certificateFile === "left_old_git") {
      message += `so inside a session git rejects the session relay's certificate for ${hostsPhrase}. This machine's git (${rawGitVersion || "version not readable"}) could not be confirmed as ${MIN_GIT_VERSION_FOR_CAINFO} or newer, so the runner leaves the variable as it is.`;
      remedy = `Upgrade git, or add your CA to the machine's system certificate bundle and ${unsetInstruction}.`;
    } else if (child.certificateFile === "left_unusable_value") {
      message += `so if git takes a file from it, inside a session git rejects the session relay's certificate for ${hostsPhrase}. Its value cannot be written into git config (it is blank or holds a line break), so the runner leaves the variable as it is.`;
      remedy = `Name the file on one line, or ${unsetInstruction}.`;
    } else {
      message += `so inside a session it would make git reject the session relay's certificate for ${hostsPhrase}. For a session the runner takes the variable out of the environment and gives git the same file as http.sslCAInfo instead. Governed hosts use the relay's certificate file. `;
      let bundleFailure =
        childTrustBundle.status === "unavailable" && childTrustBundle.reason !== "variable_unset"
          ? TRUST_BUNDLE_FAILURE_EXPLANATIONS[childTrustBundle.reason]
          : undefined;
      message += child.mountEntries
        ? "Anthropic-managed git (the git mount) is checked against a certificate file the runner writes for the session: the public certificate authorities plus that file's. "
        : "For Anthropic-managed git (the git mount) the runner would have written the session a certificate file, the public certificate authorities plus that file's, and did not" +
          (bundleFailure ? `: ${bundleFailure.because}` : "") +
          ". So git inside the session that goes to the mount checks it against that file alone, as it did under the variable, and fails there if the file holds only your company's certificate authority. ";
      message +=
        "Hosts the server does not govern keep trusting that file, with differences from the variable that the runner guide lists (Git authentication), the one that matters most being that an http.<url>.sslCAInfo for a host, in any git config file, now takes precedence over that file for that host.";
      remedy = child.mountEntries
        ? "Nothing for you to do for git inside a session unless one of those differences touches one of your hosts."
        : (bundleFailure?.first ??
          "Add the public certificate authorities to that file if git inside a session has to reach the mount.");
    }
    if (runnerMountGit.certificateFile === "moved")
      message +=
        " The runner's own fetches from Anthropic-managed git (the git mount), before and after the session, do not use the variable: they check the mount against a certificate file the runner builds for the session, the public certificate authorities plus yours.";
    if (runnerHasCertificateFile)
      message +=
        " The runner leaves your lifecycle hooks (checkout, post-session) alone: they inherit this variable from the runner's environment as it is.";
    warnings.push(`${message} ${remedy}`);
  }
  if (
    runnerMountGit.skipVerification === "pinned_off" ||
    child.skipVerification === "left" ||
    child.skipVerification === "moved"
  ) {
    let runnerHasSkipVerify = runnerMountGit.skipVerification !== "unset";
    let message =
      "[runner:warn] governed git: " +
      (runnerHasSkipVerify
        ? "GIT_SSL_NO_VERIFY is set on this runner"
        : "GIT_SSL_NO_VERIFY is set for this session by a value the server delivers with it (the variables configured on your self-hosted environment), not on this runner") +
      ", which tells git to check no server's certificate.";
    if (runnerMountGit.skipVerification === "pinned_off")
      message +=
        " The runner's own fetches from Anthropic-managed git (the git mount) ignore it, because they carry the session's token: they check the mount's certificate, and fail if git knows no certificate authority that vouches for what the mount presents (behind a proxy that re-signs traffic, name your company's certificate authority in GIT_SSL_CAINFO).";
    if (child.skipVerification === "moved")
      message += ` Inside a session the runner takes it out of the environment and gives git http.sslVerify=false instead, which still applies to your own servers (with one exception the runner guide describes: the git that makes a new working copy), and no longer to Anthropic-managed git (the git mount) or to the ${plural(governedHosts.length, "host")} the server governs (${governedHosts.join(", ")}): their certificates are checked, because git inside a session carries the session's token to the mount and reaches the governed ${plural(governedHosts.length, "host")} through the session's relay. An http.<url>.sslVerify of your own for a server, in any git config file, now takes precedence over it for that server. If git inside a session then fails a certificate check at the mount or a governed host (behind a proxy that re-signs traffic, say), name your company's certificate authority in GIT_SSL_CAINFO.`;
    else if (child.skipVerification === "left") {
      let unsetInstruction = runnerHasSkipVerify
        ? "unset the switch for the runner"
        : "take it out of the variables configured on your self-hosted environment";
      message +=
        (gitConfigArm
          ? ` This machine's git (${rawGitVersion || "version not readable"}) could not be confirmed as ${MIN_GIT_VERSION_FOR_CAINFO} or newer, so it cannot take the switch's meaning from git config:`
          : " The session's git is not routed through a git config of the session's own, which is what could carry the switch's meaning:") +
        ` inside a session the runner leaves it as it is, so git there checks no certificate, for your own servers, for ${plural(governedHosts.length, "the governed host", "the governed hosts")}, and for Anthropic-managed git (the git mount), to which it carries the session's token.` +
        (gitConfigArm
          ? ` Upgrade git, or ${unsetInstruction}.`
          : runnerHasSkipVerify
            ? " Unset the switch for the runner if you can."
            : " Take it out of the variables configured on your self-hosted environment if you can.");
    }
    warnings.push(
      runnerHasSkipVerify
        ? `${message} The runner leaves your lifecycle hooks (checkout, post-session) alone, with one exception: the hooks of a session that has a repository on Anthropic-managed git, which can reach it with the session's token. That is every checkout hook of such a session, whether or not the runner hands it an address there (CLAUDE_RUNNER_GIT_MOUNT_URL), and its post-session hook. For such a hook the runner takes the switch out of the environment and gives git http.sslVerify=false instead, with http.<url>.sslVerify=true for the mount: every git that hook starts checks the mount's certificate and, as before, no other server's. The hooks of every other session inherit the switch from the runner's environment as it is. If such a hook's fetch from the mount, or its push to it, then fails a certificate check (behind a proxy that re-signs traffic, say), name your company's certificate authority in GIT_SSL_CAINFO.`
        : message,
    );
  }
  if (gitConfigArm && hostsCoveredByNoProxy.length > 0) {
    let hostCount = hostsCoveredByNoProxy.length;
    warnings.push(
      `[runner:warn] governed git: this machine's NO_PROXY appears to cover governed ${plural(hostCount, "host")} ${hostsCoveredByNoProxy.join(", ")}. git hands NO_PROXY to its HTTP library, which may then skip the session relay for ${plural(hostCount, "that host", "those hosts")} even though the relay is set in git config. If it does, git inside the session reaches ${plural(hostCount, "it", "them")} over this machine's own network path without the relay's credential` +
        (child.certificateFile === "moved"
          ? `, and checks ${plural(hostCount, "its", "their")} certificate against the relay's certificate file, because GIT_SSL_CAINFO no longer applies inside a session: a host that only that variable's file vouches for fails the certificate check, and fetch or push to a private repository on any other will most likely fail.`
          : ", and fetch or push to a private repository there will most likely fail.") +
        ` The clone before the session starts is not affected. To route ${plural(hostCount, "the host", "the hosts")} through the relay, take ${plural(hostCount, "it", "them")} out of NO_PROXY and no_proxy in the runner's environment; if the entry must stay (a parent domain, say), ask Anthropic to list ${plural(hostCount, "the host", "the hosts")} as direct instead.`,
    );
  }
  let filtered = governedHosts.filter((governedHost) => governedHost !== GITHUB_HOST);
  if (gitConfigArm && clientCertificateVariablesSet.length > 0 && filtered.length > 0) {
    let hostCount = filtered.length;
    warnings.push(
      `[runner:warn] governed git: ${clientCertificateVariablesSet.join(" and ")} ${plural(clientCertificateVariablesSet.length, "is", "are")} set on this runner, a TLS client certificate that git offers to every server, and the server governs ${plural(hostCount, "host")} ${filtered.join(", ")}. Inside a session git reaches ${plural(hostCount, "that host", "those hosts")} through the session's relay, so it is the relay that git would offer the certificate to, and not your company's server: a server that demands a client certificate will refuse the session's git. The runner leaves ${plural(clientCertificateVariablesSet.length, "the variable as it is", "both variables as they are")}. If ${plural(hostCount, "that host demands", "those hosts demand")} one, ask Anthropic to list ${plural(hostCount, "it", "them")} as direct; otherwise unset the ${plural(clientCertificateVariablesSet.length, "variable", "variables")} for the runner, or scope the certificate to the servers that need it (http.<url>.sslCert and http.<url>.sslKey in the machine's system git config).`,
    );
  }
  return warnings;
}
//@ chunk-hm0ce8vc.js:54413-54455 placement
function stripWhitespace(text) {
  return text.replace(/\s/g, "");
}
//@ chunk-hm0ce8vc.js:54455-55655 placement
/**
 * 读取 GIT_SSL_CAINFO 指向的文件，检查大小/PEM/证书种类，合并系统根证书生成信任包。
 */
async function readTrustBundleSource(path, bundlePath, systemBundles = SYSTEM_CA_BUNDLE) {
  if (path === undefined)
    return {
      status: "unavailable",
      reason: "variable_unset",
    };
  let smallTextFile = await readSmallTextFile(path, MAX_SYSTEM_CA_BYTES);
  if (smallTextFile.kind !== "text")
    return {
      status: "unavailable",
      reason: smallTextFile.kind === "too_large" ? "file_too_large" : "file_unreadable",
    };
  if (/^-----BEGIN (?!CERTIFICATE-----)[A-Z0-9 ]*CERTIFICATE-----/m.test(smallTextFile.text))
    return {
      status: "unavailable",
      reason: "file_other_certificate_kinds",
    };
  let match = smallTextFile.text.match(PEM_CERT_BLOCK_RE);
  if (!match)
    return {
      status: "unavailable",
      reason: "file_not_pem",
    };
  let systemCerts;
  let systemCertBlocks = [];
  for (let candidatePath of systemBundles) {
    let smallTextFile = await readSmallTextFile(candidatePath, MAX_CA_TOTAL_BYTES);
    if (smallTextFile.kind !== "text") continue;
    let withoutBlocked = withoutBlockedCerts(smallTextFile.text, "git trust bundle");
    if (withoutBlocked?.match(PEM_CERT_BLOCK_RE)) {
      systemCerts = withoutBlocked;
      systemCertBlocks = smallTextFile.text.match(PEM_CERT_BLOCK_RE) ?? [];
      break;
    }
  }
  if (systemCerts === undefined)
    return {
      status: "unavailable",
      reason: "no_system_roots",
    };
  let extraCerts =
    withoutBlockedCerts(smallTextFile.text, "git trust bundle")?.match(PEM_CERT_BLOCK_RE) ?? [];
  let seenCerts = new Set(systemCerts.match(PEM_CERT_BLOCK_RE));
  let bundleText = systemCerts.endsWith(`
`)
    ? systemCerts
    : `${systemCerts}
`;
  for (let block of extraCerts)
    if (!seenCerts.has(block)) {
      seenCerts.add(block);
      bundleText += `${block}
`;
    }
  try {
    await writeFileAtomic(bundlePath, bundleText, 384);
  } catch (error) {
    logForDebugging(
      `[runner:session] governed git: the trust bundle could not be written: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    await unlink(bundlePath).catch(() => {});
    return {
      status: "unavailable",
      reason: "bundle_write_failed",
    };
  }
  let keptCerts = new Set([...seenCerts].map(stripWhitespace));
  let size = new Set(
    [...systemCertBlocks, ...match].map(stripWhitespace).filter((block) => !keptCerts.has(block)),
  ).size;
  return {
    status: "built",
    path: bundlePath,
    ...(size > 0 && {
      certificatesLeftOut: size,
    }),
  };
}
//@ chunk-hm0ce8vc.js:55655-55719 placement
async function removeFileIfExists(path) {
  try {
    await unlink(path);
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
}
//@ chunk-hm0ce8vc.js:55719-56182 placement
async function readSmallTextFile(path, maxBytes) {
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | O_NONBLOCK);
  } catch {
    return {
      kind: "unreadable",
    };
  }
  try {
    let stats = await handle.stat();
    if (!stats.isFile())
      return {
        kind: "unreadable",
      };
    if (stats.size > maxBytes)
      return {
        kind: "too_large",
      };
    let buffer = Buffer.alloc(maxBytes + 1);
    let totalRead = 0;
    while (totalRead < buffer.length) {
      let { bytesRead } = await handle.read(buffer, totalRead, buffer.length - totalRead, totalRead);
      if (bytesRead === 0) break;
      totalRead += bytesRead;
    }
    if (totalRead > maxBytes)
      return {
        kind: "too_large",
      };
    return {
      kind: "text",
      text: buffer.toString("utf8", 0, totalRead),
    };
  } catch {
    return {
      kind: "unreadable",
    };
  } finally {
    await handle.close().catch(() => {});
  }
}
//@ chunk-hm0ce8vc.js:56182-56305 placement
function readServerGitSslVars(environmentVariables, checkUpper) {
  return {
    serverCertificateFile: getEnvCaseInsensitive(environmentVariables, "GIT_SSL_CAINFO", checkUpper),
    serverSkipVerification: getEnvCaseInsensitive(environmentVariables, "GIT_SSL_NO_VERIFY", checkUpper),
  };
}
//@ chunk-hm0ce8vc.js:56305-56464 placement
function getEnvCaseInsensitive(vars, varName, checkUpperCase) {
  if (vars === undefined) return;
  if (Object.hasOwn(vars, varName)) return vars[varName];
  if (!checkUpperCase) return;
  for (let [key, value] of Object.entries(vars)) if (key.toUpperCase() === varName) return value;
  return;
}
//@ chunk-hm0ce8vc.js:56464-56555 placement
function getGitConfigParameters(environmentVariables, env, checkUpper) {
  return (
    getEnvCaseInsensitive(environmentVariables, "GIT_CONFIG_PARAMETERS", checkUpper) ??
    getEnvCaseInsensitive(env, "GIT_CONFIG_PARAMETERS", checkUpper)
  );
}
//@ chunk-hm0ce8vc.js:56555-56650 placement
function serverCertificateFileOf(serverVars) {
  return typeof serverVars.serverCertificateFile === "string" ? serverVars.serverCertificateFile : undefined;
}
//@ chunk-hm0ce8vc.js:56650-56895 placement
function gitEnvironmentForChild(state, serverVars, gitReadsEnvironmentConfig, trustBundle) {
  return planGitTlsTrust({
    role: "child",
    operator: state.operator,
    serverCertificateFile: serverCertificateFileOf(serverVars),
    serverSetsSkipVerification: serverVars.serverSkipVerification !== undefined,
    routing: state.routing,
    gitConfigArm: serverVars.gitConfigArm,
    gitReadsEnvironmentConfig,
    trustBundle,
  });
}
//@ chunk-hm0ce8vc.js:56895-57546 placement
/**
 * 计算子会话 git 环境；变量被移动时确认 git 版本后才采用。
 */
async function resolveChildGitEnvironment(state, serverVars, gitReadsEnvironmentConfig, readTrustBundle) {
  let answer = gitEnvironmentForChild(state, serverVars, true, state.trustBundle);
  if (answer.decision.certificateFile !== "moved" && answer.decision.skipVerification !== "moved")
    return {
      answer,
      trustBundle: state.trustBundle,
    };
  if (!(await gitReadsEnvironmentConfig()))
    return {
      answer: gitEnvironmentForChild(state, serverVars, false, state.trustBundle),
      trustBundle: state.trustBundle,
    };
  if (answer.decision.certificateFile !== "moved")
    return {
      answer,
      trustBundle: state.trustBundle,
    };
  let trimmed = serverCertificateFileOf(serverVars)?.trim();
  let trimmed_2 = state.operator.certificateFile[0]?.value.trim();
  if (trimmed === undefined || trimmed === trimmed_2)
    return {
      answer,
      trustBundle: state.trustBundle,
    };
  let trustBundle = state.otherSessionsShareTheAccount
    ? {
        status: "unavailable",
        reason: "shared_with_other_sessions",
      }
    : await readTrustBundle(trimmed, serverVars.serverValueTrustBundlePath);
  return {
    answer: gitEnvironmentForChild(state, serverVars, true, trustBundle),
    trustBundle,
  };
}
//@ chunk-hm0ce8vc.js:57546-57692 placement
function sslEntriesOfCommandScope(childGitEnvironment) {
  return (childGitEnvironment?.commandScopeEntries ?? []).filter(
    ([configKey, configValue]) =>
      (/^http\..+\.sslVerify$/i.test(configKey) && configValue === "true") ||
      /^http\..+\.sslCAInfo$/i.test(configKey),
  );
}
//@ chunk-hm0ce8vc.js:57692-57972 placement (2.1.88 match: shellQuote, 0.768)
function shellQuote(existing, entries) {
  if (entries.length === 0) return {};
  let base = existing === undefined || existing === null ? "" : String(existing);
  if (base.trim() === "" || entries.some(([configKey]) => configKey.includes("=")))
    return {
      GIT_CONFIG_PARAMETERS: undefined,
    };
  let mapped = entries.map(
    ([configKey, configValue]) => `'${`${configKey}=${configValue}`.replace(/'/g, "'\\''")}'`,
  );
  return {
    GIT_CONFIG_PARAMETERS: [base, ...mapped].join(" "),
  };
}
//@ chunk-hm0ce8vc.js:57972-58125 placement
function buildChildGitEnv(childGitEnvironment, existing, sessionGitRulesPath, existing_2) {
  let entries = [
    ...(sessionGitRulesPath ? [["include.path", sessionGitRulesPath]] : []),
    ...(childGitEnvironment?.commandScopeEntries ?? []),
  ];
  return {
    ...childGitEnvironment?.envOverrides,
    ...(entries.length > 0 && buildGitConfigEnv(existing, entries)),
    ...shellQuote(existing_2, sslEntriesOfCommandScope(childGitEnvironment)),
  };
}
//@ chunk-hm0ce8vc.js:58125-58139 placement
var MIN_GIT_VERSION_FOR_TRUST = [2, 31];
//@ chunk-hm0ce8vc.js:58139-58219 placement
var SAFE_URL_CHARS = [..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-"];
//@ chunk-hm0ce8vc.js:58219-58292 placement
function silenceStretchMs(limitMs) {
  return limitMs <= 0 ? 0 : Math.max(1, Math.min(20000, Math.floor(limitMs / 4)));
}
//@ chunk-hm0ce8vc.js:58292-58843 placement
/**
 * 输出静默看门狗：limitMs 内无活动则回调 onSilent。
 */
class SilenceWatchdog {
  state = "waiting";
  timer;
  limitMs;
  lastStretchMs;
  onSilent;
  constructor({ limitMs, onSilent }) {
    this.limitMs = limitMs;
    this.lastStretchMs = 2 * silenceStretchMs(limitMs);
    this.onSilent = onSilent;
  }
  arm() {
    if (this.state === "waiting" && this.limitMs > 0) this.state = "armed";
    this.heard();
  }
  heard() {
    if (this.state !== "armed") return;
    this.wait(Math.max(0, this.limitMs - this.lastStretchMs), () =>
      this.wait(this.lastStretchMs, () => {
        this.heard();
        this.onSilent();
      }),
    );
  }
  end() {
    this.state = "ended";
    clearTimeout(this.timer);
    this.timer = undefined;
  }
  wait(delayMs, callback) {
    clearTimeout(this.timer);
    this.timer = setTimeout(callback, delayMs);
    this.timer.unref?.();
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
  MIN_GIT_VERSION_FOR_TRUST,
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
