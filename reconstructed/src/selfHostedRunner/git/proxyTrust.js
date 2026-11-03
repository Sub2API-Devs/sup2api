/**
 * selfHostedRunner/git/proxyTrust.ts
 *
 * BYOC git 代理与 sslVerify 设置（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t3sg9e26.js (13)
 * attribution: placement 13
 */

//@ chunk-t3sg9e26.js:1313-1375 placement
/**
 * 导出函数 `gitConfigPairs`：参数 e，返回 e.flatMap(([n, t]) => ["-c", `${n}=${t}`])。
 */
function gitConfigPairs(e) {
  return e.flatMap(([n, t]) => ["-c", `${n}=${t}`]);
}
//@ chunk-t3sg9e26.js:1375-1440 placement
var EMPTY_TLS_TRUST_PLAN = {
  envOverrides: {},
  commandScopeEntries: [],
  fileSeedLines: "",
};
//@ chunk-t3sg9e26.js:1440-1908 placement
/**
 * 按 git 角色（prep/resume/outcome/child/hook）决定证书文件与 sslVerify 设置如何处理：无路由时保持原样，否则分别交给对应的处理函数，返回环境覆盖、命令级配置和决策记录。
 */
function planGitTlsTrust(e) {
  let hasCertificateFile = e.operator.certificateFile.length > 0;
  let skipsVerification =
    e.operator.skipVerification.length > 0 || (e.role === "child" && e.serverSetsSkipVerification);
  if (!e.routing)
    return {
      ...EMPTY_TLS_TRUST_PLAN,
      decision: {
        role: e.role,
        certificateFile: hasCertificateFile ? "left_no_routing" : "left_unset",
        skipVerification: skipsVerification ? "left" : "unset",
        mountEntries: false,
        mountVerificationPinned: false,
      },
    };
  switch (e.role) {
    case "prep":
    case "resume":
    case "outcome":
      return planFetchGitTrust(e, hasCertificateFile, skipsVerification);
    case "child":
      return armGitSslVerify(e, e.routing, skipsVerification);
    case "hook":
      return planHookGitTrust(e, e.routing, hasCertificateFile, skipsVerification);
  }
}
//@ chunk-t3sg9e26.js:1908-2462 placement
/**
 * 为 hook 角色规划 git 证书与 TLS 校验设置：不访问 git 挂载时保持原样，否则为挂载地址生成作用域配置并在需要时迁移关闭校验的设置。
 */
function planHookGitTrust(input, routing, hasCertificateFile, skipsVerification) {
  let certificateDecision = hasCertificateFile ? "left_operators_hook" : "left_unset";
  if (!input.reachesGitMount)
    return {
      ...EMPTY_TLS_TRUST_PLAN,
      decision: {
        role: "hook",
        certificateFile: certificateDecision,
        skipVerification: skipsVerification ? "left" : "unset",
        mountEntries: false,
        mountVerificationPinned: false,
      },
    };
  let mountOrigins = URL.canParse(routing.mountBaseUrl) ? mountUrlOrigins(routing) : [];
  let pinnedEntries = sslVerifyEntries(mountOrigins, []);
  let movesSkip = skipsVerification && mountOrigins.length > 0;
  return {
    ...EMPTY_TLS_TRUST_PLAN,
    envOverrides: skipsVerification ? unsetEnvOverrides(input.operator.skipVerification) : {},
    commandScopeEntries: movesSkip ? [["http.sslVerify", "false"], ...pinnedEntries] : pinnedEntries,
    decision: {
      role: "hook",
      certificateFile: certificateDecision,
      skipVerification: !skipsVerification ? "unset" : movesSkip ? "moved" : "pinned_off",
      mountEntries: false,
      mountVerificationPinned: mountOrigins.length > 0,
    },
  };
}
//@ chunk-t3sg9e26.js:2462-2557 placement
function sslCaInfoEntries(url, path) {
  return ["", `${new URL(url).origin}.`, `${url}.`].map((r) => [`http.${r}sslCAInfo`, path]);
}
//@ chunk-t3sg9e26.js:2557-2622 placement
function unsetEnvOverrides(e) {
  let n = {};
  for (let { name: t } of e) n[t] = undefined;
  return n;
}
//@ chunk-t3sg9e26.js:2622-3629 placement
/**
 * prep/resume/outcome 角色的 TLS 信任方案：目标不走挂载路由时保持原设置；有运营方证书且信任包已构建时，把证书改为按目标 URL 作用的命令级配置。
 */
function planFetchGitTrust(input, hasCertificateFile, skipsVerification) {
  if (!input.target.mountRouted)
    return {
      ...EMPTY_TLS_TRUST_PLAN,
      decision: {
        role: input.role,
        certificateFile: hasCertificateFile ? "left_direct_target" : "left_unset",
        skipVerification: skipsVerification ? "left" : "unset",
        mountEntries: false,
        mountVerificationPinned: false,
      },
    };
  let skipEnvOverrides = unsetEnvOverrides(input.operator.skipVerification);
  let skipDecision = skipsVerification ? "pinned_off" : "unset";
  if (!hasCertificateFile)
    return {
      envOverrides: skipEnvOverrides,
      commandScopeEntries: [],
      fileSeedLines: "",
      decision: {
        role: input.role,
        certificateFile: "left_unset",
        skipVerification: skipDecision,
        mountEntries: false,
        mountVerificationPinned: false,
      },
    };
  if (input.trustBundle.status !== "built" || !URL.canParse(input.target.url))
    return {
      envOverrides: skipEnvOverrides,
      commandScopeEntries: [],
      fileSeedLines: "",
      decision: {
        role: input.role,
        certificateFile:
          input.trustBundle.status !== "built" ? "left_no_trust_bundle" : "left_unparseable_target",
        skipVerification: skipDecision,
        mountEntries: false,
        mountVerificationPinned: false,
      },
    };
  return {
    envOverrides: {
      ...unsetEnvOverrides(input.operator.certificateFile),
      ...skipEnvOverrides,
    },
    commandScopeEntries: sslCaInfoEntries(input.target.url, input.trustBundle.path),
    fileSeedLines: "",
    decision: {
      role: input.role,
      certificateFile: "moved",
      skipVerification: skipDecision,
      mountEntries: true,
      mountVerificationPinned: false,
    },
  };
}
//@ chunk-t3sg9e26.js:3629-3764 placement
function certificateFileFor(e) {
  let trimmed = (e.serverCertificateFile ?? e.operator.certificateFile[0]?.value)?.trim();
  if (!trimmed || /[\n\r\0]/.test(trimmed)) return;
  return trimmed;
}
//@ chunk-t3sg9e26.js:3764-3837 placement
function quoteGitConfigValue(e) {
  return `"${e.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
//@ chunk-t3sg9e26.js:3837-4008 placement
function mountUrlOrigins(e) {
  let n = new Set();
  for (let t of [e.mountBaseUrl, e.pushBaseUrl])
    if (t && URL.canParse(t)) {
      for (let r of [new URL(t).origin, t]) if (!r.includes("=")) n.add(r);
    }
  return [...n];
}
//@ chunk-t3sg9e26.js:4008-4110 placement
function sslVerifyEntries(e, n) {
  return [...e, ...n.map((t) => `https://${t}/`)].map((t) => [`http.${t}.sslVerify`, "true"]);
}
//@ chunk-t3sg9e26.js:4110-4231 placement
function sslVerifyConfigLines(e) {
  return e
    .map(([n, t]) => {
      let sliced = n.slice(5, n.length - 10);
      return `[http ${quoteGitConfigValue(sliced)}]
	sslVerify = ${t}
`;
    })
    .join("");
}
//@ chunk-t3sg9e26.js:4231-5396 placement
function armGitSslVerify(e, routing, t) {
  let r = e.serverCertificateFile !== undefined || e.operator.certificateFile.length > 0;
  let s = certificateFileFor(e);
  let o = !r
    ? "left_unset"
    : !e.gitConfigArm
      ? "left_git_config_arm_off"
      : s === undefined
        ? "left_unusable_value"
        : !e.gitReadsEnvironmentConfig
          ? "left_old_git"
          : "moved";
  let a = mountUrlOrigins(routing);
  let c = !t ? "unset" : e.gitConfigArm && e.gitReadsEnvironmentConfig && a.length > 0 ? "moved" : "left";
  let d = [];
  let u = "";
  let h = {};
  if (o === "moved" && s !== undefined) {
    d.push(["http.sslCAInfo", s]);
    u += `
[http]
	sslCAInfo = ${quoteGitConfigValue(s)}
`;
    if (e.trustBundle.status === "built")
      for (let f of a) {
        d.push([`http.${f}.sslCAInfo`, e.trustBundle.path]);
        u += `[http ${quoteGitConfigValue(f)}]
	sslCAInfo = ${quoteGitConfigValue(e.trustBundle.path)}
`;
      }
    h = {
      GIT_SSL_CAINFO: undefined,
      ...unsetEnvOverrides(e.operator.certificateFile),
    };
  }
  if (c === "moved") {
    d.push(["http.sslVerify", "false"]);
    u += `${
      u === ""
        ? `
`
        : ""
    }[http]
	sslVerify = false
`;
    h = {
      ...h,
      GIT_SSL_NO_VERIFY: undefined,
      ...unsetEnvOverrides(e.operator.skipVerification),
    };
  }
  let y = sslVerifyEntries(a, e.gitConfigArm ? routing.governedHosts : []);
  d.push(...y);
  if (y.length > 0)
    u += `${
      u === ""
        ? `
`
        : ""
    }${sslVerifyConfigLines(y)}`;
  return {
    envOverrides: h,
    commandScopeEntries: d,
    fileSeedLines: u,
    decision: {
      role: "child",
      certificateFile: o,
      skipVerification: c,
      mountEntries: o === "moved" && e.trustBundle.status === "built" && a.length > 0,
      mountVerificationPinned: a.length > 0,
    },
  };
}
export { planGitTlsTrust, gitConfigPairs };
