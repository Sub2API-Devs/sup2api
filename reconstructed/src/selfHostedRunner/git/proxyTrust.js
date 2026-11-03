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
function DUt(e) {
  return e.flatMap(([n, t]) => ["-c", `${n}=${t}`]);
}
//@ chunk-t3sg9e26.js:1375-1440 placement
var Ee = { envOverrides: {}, commandScopeEntries: [], fileSeedLines: "" };
/**
 * 按 git 角色（prep/resume/outcome/child/hook）决定证书文件与 sslVerify 设置如何处理：无路由时保持原样，否则分别交给对应的处理函数，返回环境覆盖、命令级配置和决策记录。
 */
//@ chunk-t3sg9e26.js:1440-1908 placement
function planGitTlsTrust(e) {
  let n = e.operator.certificateFile.length > 0,
    t = e.operator.skipVerification.length > 0 || (e.role === "child" && e.serverSetsSkipVerification);
  if (!e.routing)
    return {
      ...Ee,
      decision: {
        role: e.role,
        certificateFile: n ? "left_no_routing" : "left_unset",
        skipVerification: t ? "left" : "unset",
        mountEntries: !1,
        mountVerificationPinned: !1,
      },
    };
  switch (e.role) {
    case "prep":
    case "resume":
    case "outcome":
      return planFetchGitTrust(e, n, t);
    case "child":
      return armGitSslVerify(e, e.routing, t);
    case "hook":
      return planHookGitTrust(e, e.routing, n, t);
  }
}
/**
 * 为 hook 角色规划 git 证书与 TLS 校验设置：不访问 git 挂载时保持原样，否则为挂载地址生成作用域配置并在需要时迁移关闭校验的设置。
 */
//@ chunk-t3sg9e26.js:1908-2462 placement
function planHookGitTrust(input, routing, hasCertificateFile, skipsVerification) {
  let certificateDecision = hasCertificateFile ? "left_operators_hook" : "left_unset";
  if (!input.reachesGitMount)
    return {
      ...Ee,
      decision: {
        role: "hook",
        certificateFile: certificateDecision,
        skipVerification: skipsVerification ? "left" : "unset",
        mountEntries: !1,
        mountVerificationPinned: !1,
      },
    };
  let mountOrigins = URL.canParse(routing.mountBaseUrl) ? mountUrlOrigins(routing) : [],
    pinnedEntries = sslVerifyEntries(mountOrigins, []),
    movesSkip = skipsVerification && mountOrigins.length > 0;
  return {
    ...Ee,
    envOverrides: skipsVerification ? re(input.operator.skipVerification) : {},
    commandScopeEntries: movesSkip ? [["http.sslVerify", "false"], ...pinnedEntries] : pinnedEntries,
    decision: {
      role: "hook",
      certificateFile: certificateDecision,
      skipVerification: !skipsVerification ? "unset" : movesSkip ? "moved" : "pinned_off",
      mountEntries: !1,
      mountVerificationPinned: mountOrigins.length > 0,
    },
  };
}
//@ chunk-t3sg9e26.js:2462-2557 placement
function mt(e, n) {
  return ["", `${new URL(e).origin}.`, `${e}.`].map((r) => [`http.${r}sslCAInfo`, n]);
}
//@ chunk-t3sg9e26.js:2557-2622 placement
function re(e) {
  let n = {};
  for (let { name: t } of e) n[t] = void 0;
  return n;
}
/**
 * prep/resume/outcome 角色的 TLS 信任方案：目标不走挂载路由时保持原设置；有运营方证书且信任包已构建时，把证书改为按目标 URL 作用的命令级配置。
 */
//@ chunk-t3sg9e26.js:2622-3629 placement
function planFetchGitTrust(input, hasCertificateFile, skipsVerification) {
  if (!input.target.mountRouted)
    return {
      ...Ee,
      decision: {
        role: input.role,
        certificateFile: hasCertificateFile ? "left_direct_target" : "left_unset",
        skipVerification: skipsVerification ? "left" : "unset",
        mountEntries: !1,
        mountVerificationPinned: !1,
      },
    };
  let skipEnvOverrides = re(input.operator.skipVerification),
    skipDecision = skipsVerification ? "pinned_off" : "unset";
  if (!hasCertificateFile)
    return {
      envOverrides: skipEnvOverrides,
      commandScopeEntries: [],
      fileSeedLines: "",
      decision: {
        role: input.role,
        certificateFile: "left_unset",
        skipVerification: skipDecision,
        mountEntries: !1,
        mountVerificationPinned: !1,
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
        mountEntries: !1,
        mountVerificationPinned: !1,
      },
    };
  return {
    envOverrides: { ...re(input.operator.certificateFile), ...skipEnvOverrides },
    commandScopeEntries: mt(input.target.url, input.trustBundle.path),
    fileSeedLines: "",
    decision: {
      role: input.role,
      certificateFile: "moved",
      skipVerification: skipDecision,
      mountEntries: !0,
      mountVerificationPinned: !1,
    },
  };
}
//@ chunk-t3sg9e26.js:3629-3764 placement
function certificateFileFor(e) {
  let t = (e.serverCertificateFile ?? e.operator.certificateFile[0]?.value)?.trim();
  if (!t || /[\n\r\0]/.test(t)) return;
  return t;
}
//@ chunk-t3sg9e26.js:3764-3837 placement
function _e(e) {
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
      return `[http ${_e(sliced)}]
	sslVerify = ${t}
`;
    })
    .join("");
}
//@ chunk-t3sg9e26.js:4231-5396 placement
function armGitSslVerify(e, n, t) {
  let r = e.serverCertificateFile !== void 0 || e.operator.certificateFile.length > 0,
    s = certificateFileFor(e),
    o = !r
      ? "left_unset"
      : !e.gitConfigArm
        ? "left_git_config_arm_off"
        : s === void 0
          ? "left_unusable_value"
          : !e.gitReadsEnvironmentConfig
            ? "left_old_git"
            : "moved",
    a = mountUrlOrigins(n),
    c = !t ? "unset" : e.gitConfigArm && e.gitReadsEnvironmentConfig && a.length > 0 ? "moved" : "left",
    d = [],
    u = "",
    h = {};
  if (o === "moved" && s !== void 0) {
    if (
      (d.push(["http.sslCAInfo", s]),
      (u += `
[http]
	sslCAInfo = ${_e(s)}
`),
      e.trustBundle.status === "built")
    )
      for (let f of a)
        (d.push([`http.${f}.sslCAInfo`, e.trustBundle.path]),
          (u += `[http ${_e(f)}]
	sslCAInfo = ${_e(e.trustBundle.path)}
`));
    h = { GIT_SSL_CAINFO: void 0, ...re(e.operator.certificateFile) };
  }
  if (c === "moved")
    (d.push(["http.sslVerify", "false"]),
      (u += `${
        u === ""
          ? `
`
          : ""
      }[http]
	sslVerify = false
`),
      (h = { ...h, GIT_SSL_NO_VERIFY: void 0, ...re(e.operator.skipVerification) }));
  let y = sslVerifyEntries(a, e.gitConfigArm ? n.governedHosts : []);
  if ((d.push(...y), y.length > 0))
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

export { planGitTlsTrust, DUt };
