/**
 * selfHostedRunner/git/proxyTrust.ts
 *
 * BYOC git 代理与 sslVerify 设置（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rzkdv0c6.js (13)
 * attribution: placement 13
 */

//@ chunk-rzkdv0c6.js:1312-1374 placement
/**
 * 导出函数 `gitConfigPairs`：参数 e，返回 e.flatMap(([n, t]) => ["-c", `${n}=${t}`])。
 */
function gitConfigPairs(pairs) {
  return pairs.flatMap(([key, value]) => ["-c", `${key}=${value}`]);
}
//@ chunk-rzkdv0c6.js:1374-1439 placement
var EMPTY_TLS_TRUST_PLAN = {
  envOverrides: {},
  commandScopeEntries: [],
  fileSeedLines: "",
};
//@ chunk-rzkdv0c6.js:1439-1907 placement
/**
 * 按 git 角色（prep/resume/outcome/child/hook）决定证书文件与 sslVerify 设置如何处理：无路由时保持原样，否则分别交给对应的处理函数，返回环境覆盖、命令级配置和决策记录。
 */
function planGitTlsTrust(input) {
  let hasCertificateFile = input.operator.certificateFile.length > 0;
  let skipVerification =
    input.operator.skipVerification.length > 0 ||
    (input.role === "child" && input.serverSetsSkipVerification);
  if (!input.routing)
    return {
      ...EMPTY_TLS_TRUST_PLAN,
      decision: {
        role: input.role,
        certificateFile: hasCertificateFile ? "left_no_routing" : "left_unset",
        skipVerification: skipVerification ? "left" : "unset",
        mountEntries: false,
        mountVerificationPinned: false,
      },
    };
  switch (input.role) {
    case "prep":
    case "resume":
    case "outcome":
      return planFetchGitTrust(input, hasCertificateFile, skipVerification);
    case "child":
      return armGitSslVerify(input, input.routing, skipVerification);
    case "hook":
      return planHookGitTrust(input, input.routing, hasCertificateFile, skipVerification);
  }
}
//@ chunk-rzkdv0c6.js:1907-2461 placement
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
//@ chunk-rzkdv0c6.js:2461-2556 placement
function sslCaInfoEntries(url, path) {
  return ["", `${new URL(url).origin}.`, `${url}.`].map((scope) => [`http.${scope}sslCAInfo`, path]);
}
//@ chunk-rzkdv0c6.js:2556-2621 placement
function unsetEnvOverrides(overrides) {
  let env = {};
  for (let { name } of overrides) env[name] = undefined;
  return env;
}
//@ chunk-rzkdv0c6.js:2621-3628 placement
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
//@ chunk-rzkdv0c6.js:3628-3763 placement
function certificateFileFor(config) {
  let trimmed = (config.serverCertificateFile ?? config.operator.certificateFile[0]?.value)?.trim();
  if (!trimmed || /[\n\r\0]/.test(trimmed)) return;
  return trimmed;
}
//@ chunk-rzkdv0c6.js:3763-3836 placement
function quoteGitConfigValue(value) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
//@ chunk-rzkdv0c6.js:3836-4007 placement
function mountUrlOrigins(config) {
  let origins = new Set();
  for (let url of [config.mountBaseUrl, config.pushBaseUrl])
    if (url && URL.canParse(url)) {
      for (let origin of [new URL(url).origin, url]) if (!origin.includes("=")) origins.add(origin);
    }
  return [...origins];
}
//@ chunk-rzkdv0c6.js:4007-4109 placement
function sslVerifyEntries(urls, hosts) {
  return [...urls, ...hosts.map((host) => `https://${host}/`)].map((url) => [
    `http.${url}.sslVerify`,
    "true",
  ]);
}
//@ chunk-rzkdv0c6.js:4109-4230 placement
function sslVerifyConfigLines(entries) {
  return entries
    .map(([key, value]) => {
      let sliced = key.slice(5, key.length - 10);
      return `[http ${quoteGitConfigValue(sliced)}]
	sslVerify = ${value}
`;
    })
    .join("");
}
//@ chunk-rzkdv0c6.js:4230-5395 placement
function armGitSslVerify(input, config, output) {
  let hasCert = input.serverCertificateFile !== undefined || input.operator.certificateFile.length > 0;
  let certFile = certificateFileFor(input);
  let reason = !hasCert
    ? "left_unset"
    : !input.gitConfigArm
      ? "left_git_config_arm_off"
      : certFile === undefined
        ? "left_unusable_value"
        : !input.gitReadsEnvironmentConfig
          ? "left_old_git"
          : "moved";
  let mountOrigins = mountUrlOrigins(config);
  let gitConfigState = !output
    ? "unset"
    : input.gitConfigArm && input.gitReadsEnvironmentConfig && mountOrigins.length > 0
      ? "moved"
      : "left";
  let configEntries = [];
  let configText = "";
  let envOverrides = {};
  if (reason === "moved" && certFile !== undefined) {
    configEntries.push(["http.sslCAInfo", certFile]);
    configText += `
[http]
	sslCAInfo = ${quoteGitConfigValue(certFile)}
`;
    if (input.trustBundle.status === "built")
      for (let origin of mountOrigins) {
        configEntries.push([`http.${origin}.sslCAInfo`, input.trustBundle.path]);
        configText += `[http ${quoteGitConfigValue(origin)}]
	sslCAInfo = ${quoteGitConfigValue(input.trustBundle.path)}
`;
      }
    envOverrides = {
      GIT_SSL_CAINFO: undefined,
      ...unsetEnvOverrides(input.operator.certificateFile),
    };
  }
  if (gitConfigState === "moved") {
    configEntries.push(["http.sslVerify", "false"]);
    configText += `${
      configText === ""
        ? `
`
        : ""
    }[http]
	sslVerify = false
`;
    envOverrides = {
      ...envOverrides,
      GIT_SSL_NO_VERIFY: undefined,
      ...unsetEnvOverrides(input.operator.skipVerification),
    };
  }
  let verifyEntries = sslVerifyEntries(mountOrigins, input.gitConfigArm ? config.governedHosts : []);
  configEntries.push(...verifyEntries);
  if (verifyEntries.length > 0)
    configText += `${
      configText === ""
        ? `
`
        : ""
    }${sslVerifyConfigLines(verifyEntries)}`;
  return {
    envOverrides,
    commandScopeEntries: configEntries,
    fileSeedLines: configText,
    decision: {
      role: "child",
      certificateFile: reason,
      skipVerification: gitConfigState,
      mountEntries: reason === "moved" && input.trustBundle.status === "built" && mountOrigins.length > 0,
      mountVerificationPinned: mountOrigins.length > 0,
    },
  };
}
export { planGitTlsTrust, gitConfigPairs };
