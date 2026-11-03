/**
 * services/pluginEval/evalSandbox.ts
 *
 * 2.1.316 新增：plugin eval 子会话的沙箱配置（网络域、文件系统读写围栏、shell 授权条件）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (5)
 * attribution: placement 5
 */
import os_2 from "os";
import path from "path";
import { realpath, lstat, readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { SHELL_TOOLS, hasToolRule } from "./runToolRules.js";
import { uniq } from "../../utils/collections.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { getSettingsForSource, getAllPolicyTierSettings } from "../../utils/settings/settings.js";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { getPlatform } from "../../utils/platform.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
} from "../../utils/errors.js";
import { SANDBOX_UNAVAILABLE_TEXT, nfcKeyIfEnabled } from "./runTrace.js";
import {
  isRootDir,
  detectWslWindowsMounts,
  withDirname,
  withPathDirectories,
  getTempDirs,
  hasGlobChars,
  buildEvalFence,
  checkPathSegmentWhitespace,
  MAX_SCANNED_FILE_BYTES,
  getXdgConfigHome,
  KUBECONFIG_ENV,
  CREDENTIAL_FILE_ENV_VARS,
  CONFIG_DIR_ENV_VARS,
  toSandboxPathForPlatform,
  GIT_METADATA_ENTRIES,
  SECRET_MOUNT_DIRS,
  PROXY_ENV_VARS_EXTRA,
  toSandboxRulePath,
  checkCaseInsideRoot,
  getSuiteRealRoots,
} from "./evalFence.js";
import { env } from "../../utils/env.js";
import { toEvalPathError } from "./evalDir.js";
import {
  probePathDirectories,
  readAnthropicProfileConfigs,
  describeUnreadableCredentialsPointer,
  parseAnsibleVaultSources,
  parseSshCommandIdentities,
  parseJvmBuildToolCredentials,
  parseKerberosCacheName,
  parseKrb5Config,
  parsePgServiceConf,
  probeMacKeychain,
  parseSshConfigIdentities,
  SYSTEM_GITCONFIG_PATHS,
  parseGitconfigIncludes,
  parseGoAuth,
  parseKubeconfigCredentials,
  describeAwsCredentialProcess,
  parseAwsSourceCredentials,
  listGcloudConfigurations,
  parseAzureServicePrincipals,
  NULL_DEVICE,
  parseMavenArgs,
} from "./credentialExclusion.js";
import { caCertEnvVars } from "../../utils/settings/managedSettingsKeys.js";
import { PRIVATE_KEY_PATTERN, secretEnvNameCandidates } from "../../utils/settings/policyHelper/helperEnv.js";
import { resolveConfigDir } from "../../utils/wifProfile.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import {
  EMPTY_ENTRY_SET,
  CLOUD_CLI_SAFE_ENTRIES,
  SSH_CONFIG_ENTRIES,
  GNUPG_CONFIG_ENTRIES,
  DOCKER_SAFE_ENTRIES,
  TOOL_BIN_ENTRIES,
  KUBE_CACHE_ENTRIES,
  checkCredentialStoreLinks,
  resolveLinkTarget,
  realPathOf,
  AWS_CACHE_DIRS,
} from "./childEnvironment.js";
import { EVAL_ARTIFACTS_DIR } from "./artifactStub.js";
import { DANGEROUS_DIRECTORIES, DANGEROUS_FILES } from "../../utils/permissions/filesystem.js";
import { PLACEHOLDER_CREDENTIAL_KEYS } from "../../upstreamproxy/upstreamproxy.js";
import { PROXY_INJECTED_MARKER } from "../../utils/subprocessEnv.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-qchp9vrd.js:129357-147750 placement
/**
 * 生成子会话沙箱设置：允许域、读写路径、凭据排除；无法保证时拒绝 shell 授权（约 18 KB）。
 */
async function buildEvalSandboxSettings(sandbox, allowedTools, operatorAllowedTools, case_, s, h, w) {
  if (!SHELL_TOOLS.some((L) => hasToolRule(allowedTools, L))) return;
  let b = uniq(
    operatorAllowedTools.flatMap((L) => {
      let ee = permissionRuleValueFromString(L);
      return ee.toolName === WEBFETCH && ee.ruleContent?.startsWith("domain:")
        ? [ee.ruleContent.slice(7)]
        : [];
    }),
  );
  let flattened = [getSettingsForSource("policySettings"), ...getAllPolicyTierSettings()].flatMap((L) =>
    L?.sandbox ? [L.sandbox] : [],
  );
  let R = (L) => flattened.some(L);
  let S =
    !SandboxManager.isPlatformInEnabledList() ||
    R((L) => Array.isArray(L.enabledPlatforms) && !L.enabledPlatforms.includes(getPlatform()))
      ? `sandbox.enabledPlatforms excludes ${getPlatform()}`
      : R((L) => L.enabled === false)
        ? "sandbox.enabled is false"
        : R((L) => L.failIfUnavailable === false)
          ? "sandbox.failIfUnavailable is false (a missing backend would run the shell unconfined)"
          : R((L) => L.allowUnsandboxedCommands === true)
            ? "sandbox.allowUnsandboxedCommands is true"
            : R((L) => (L.excludedCommands?.length ?? 0) > 0)
              ? "sandbox.excludedCommands exempts commands"
              : R((L) => L.autoAllowBashIfSandboxed === true)
                ? "sandbox.autoAllowBashIfSandboxed would run commands the operator never granted"
                : R((L) => L.enableWeakerNestedSandbox === true)
                  ? "sandbox.enableWeakerNestedSandbox exposes the host /proc"
                  : R((L) => L.enableWeakerNetworkIsolation === true)
                    ? "sandbox.enableWeakerNetworkIsolation loosens the egress lock"
                    : R((L) => L.allowAppleEvents === true)
                      ? "sandbox.allowAppleEvents removes macOS automation isolation"
                      : R((L) => L.filesystem?.disabled === true)
                        ? "sandbox.filesystem.disabled turns filesystem confinement off"
                        : R((L) => L.filesystem?.allowManagedReadPathsOnly === true)
                          ? "sandbox.filesystem.allowManagedReadPathsOnly would drop the sandbox's own directories from the readable set"
                          : b.length > 0 && R((L) => L.network?.allowManagedDomainsOnly === true)
                            ? "sandbox.network.allowManagedDomainsOnly means the WebFetch domains you granted cannot open the sandboxed shell's network on this machine"
                            : R((L) => L.allowNestedUserNamespaces === true)
                              ? "sandbox.allowNestedUserNamespaces lets sandboxed commands get around file deny rules"
                              : null;
  if (S !== null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${SANDBOX_UNAVAILABLE_TEXT} (this machine's managed settings: ${S})`,
      "eval shell grant refused: managed policy suppresses the sandbox",
    );
  let T = (L) => s[L] ?? Object.entries(s).find(([key]) => key.toUpperCase() === L)?.[1];
  let env_2 = case_.execution.env ?? {};
  let x = T("PATH");
  let j = os_2.homedir();
  if (isRootDir(j))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "the operator's home directory is the filesystem root, so the Bash sandbox cannot exclude it \u2014 a Bash-granting evaluation cannot run here (set HOME to a real home directory)",
      "eval shell grant refused: home is the filesystem root",
    );
  let K = getPlatform() === "wsl" ? await detectWslWindowsMounts(h) : [];
  let filtered = uniq([
    j,
    withDirname(j),
    ...K,
    sandbox.operatorConfigDir,
    ...(await withPathDirectories(uniq([...case_.pluginDirsUnderTest, case_.caseDir]))).map(withDirname),
    path.dirname(sandbox.root),
    ...getTempDirs(),
    os_2.tmpdir(),
    T("XDG_RUNTIME_DIR") ?? process.env.XDG_RUNTIME_DIR ?? "",
    T("CLAUDE_CODE_FEDERATION_CACHE_DIR") ?? "",
    env.CLAUDE_CODE_TMPDIR ? path.join(env.CLAUDE_CODE_TMPDIR, `claude-${process.getuid?.() ?? ""}`) : "",
    env.CLAUDE_CODE_TMPDIR ?? "",
    env.XDG_CONFIG_HOME ?? "",
    env.XDG_DATA_HOME ?? "",
    env.XDG_CACHE_HOME ?? "",
    env.XDG_STATE_HOME ?? "",
  ])
    .filter((L) => L !== "" && path.isAbsolute(L))
    .filter((L) => !isRootDir(L));
  let W = await withPathDirectories(filtered);
  if (W.some(hasGlobChars))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "the home, Claude config, temp, plugin-parent or case-parent directory on this machine has a glob character (* ? [ ]) in its path (as written or where it really points), so the Bash sandbox cannot exclude it \u2014 a Bash-granting evaluation cannot run here",
      "eval shell grant refused: glob char in a sandbox deny root",
    );
  let G = w?.addDirs ?? (await checkAddDirsInsideCase(case_));
  let J = w?.readScope ?? (await buildEvalFence(case_, G));
  let Z = uniq(J.denyPaths);
  for (let L of Z) checkPathSegmentWhitespace(L, "eval deny path");
  let se = await withPathDirectories([j, sandbox.operatorConfigDir]);
  let Q = (L) => se.some((ee) => toEvalPathError(ee, L));
  let Se = (L) => [...getTempDirs(), os_2.tmpdir()].some((ee) => toEvalPathError(ee, L));
  let filtered_2 = (
    await probePathDirectories(
      Promise.all(
        (x ?? "")
          .split(path.delimiter)
          .filter((L) => path.isAbsolute(L) && (!Se(L) || Q(L)))
          .map((L) => realpath(L).catch(() => null)),
      ),
    )
  )
    .filter((L) => L !== null)
    .filter(
      (L) =>
        !hasGlobChars(L) &&
        W.some((ee) => toEvalPathError(ee, L)) &&
        !W.some((ee) => ee === L || toEvalPathError(L, ee)) &&
        (!Se(L) || Q(L)) &&
        !Z.some(
          (ee) =>
            nfcKeyIfEnabled(ee) === nfcKeyIfEnabled(L) ||
            toEvalPathError(ee, L, nfcKeyIfEnabled) ||
            toEvalPathError(L, ee, nfcKeyIfEnabled),
        ),
    )
    .filter((L) => !K.some((ee) => ee === L || toEvalPathError(ee, L)));
  let Be = [];
  await probePathDirectories(
    (async () => {
      for (let L of filtered_2)
        try {
          if ((await lstat(L)).isDirectory()) Be.push(L);
        } catch {}
    })(),
  );
  let Je = uniq(
    (
      await probePathDirectories(
        Promise.all(
          [...caCertEnvVars, "NODE_EXTRA_CA_CERTS"]
            .map((L) => T(L)?.trim())
            .filter((L) => !!L && path.isAbsolute(L) && (!Se(L) || Q(L)))
            .map(async (L) =>
              path.join(await realpath(path.dirname(L)).catch(() => path.dirname(L)), path.basename(L)),
            ),
        ),
        "a CA-bundle pointer",
      )
    ).filter(
      (L) =>
        !hasGlobChars(L) &&
        W.some((ee) => toEvalPathError(ee, L)) &&
        !W.some((ee) => ee === L || toEvalPathError(L, ee)) &&
        (!Se(L) || Q(L)),
    ),
  );
  let Ee = [];
  await probePathDirectories(
    (async () => {
      for (let L of Je)
        try {
          let ee = await lstat(L);
          if (!ee.isFile() || ee.nlink !== 1 || ee.size > MAX_SCANNED_FILE_BYTES) continue;
          if (
            Z.some(
              (We) => nfcKeyIfEnabled(We) === nfcKeyIfEnabled(L) || toEvalPathError(We, L, nfcKeyIfEnabled),
            )
          )
            continue;
          let file = await readFile(L, "utf8");
          if (file.includes("-----BEGIN CERTIFICATE-----") && !PRIVATE_KEY_PATTERN.test(file)) Ee.push(L);
        } catch {}
    })(),
    "a CA-bundle pointer",
  );
  let Qe =
    T("ANTHROPIC_CONFIG_DIR")?.trim() || process.env.ANTHROPIC_CONFIG_DIR?.trim() || resolveConfigDir() || "";
  let joined = path.join(getXdgConfigHome(), "anthropic");
  let je = uniq([joined, Qe].filter((L) => L && path.isAbsolute(L)));
  let pt = (
    await Promise.all(
      je.map((L) => readAnthropicProfileConfigs(L, T("ANTHROPIC_PROFILE") ?? process.env.ANTHROPIC_PROFILE)),
    )
  ).flat();
  let Pt = (L) => process.env[L];
  let ce = (L) => s[L] ?? Pt(L);
  let At = (L) =>
    uniq(
      [...Object.entries(s), ...Object.entries(process.env)]
        .filter(([ee]) => ee.toUpperCase() === L)
        .map(([, ee]) => ee)
        .filter((ee) => ee !== undefined)
        .flatMap((ee) => (KUBECONFIG_ENV.has(L) ? ee.split(path.delimiter) : [ee]))
        .filter((ee) => !(L === "GOENV" && ee.trim() === "off")),
    );
  let B = os_2.homedir();
  let ie = (L) => L.replace(/^~(?=[\\/]|$)/, B);
  let mapped = CREDENTIAL_FILE_ENV_VARS.flatMap(At).map(ie);
  if (mapped.some((L) => L && L.trim() !== "" && !path.isAbsolute(L.trim())))
    throw describeUnreadableCredentialsPointer(
      "a credentials pointer variable (AWS_CONFIG_FILE, GOOGLE_APPLICATION_CREDENTIALS, ANTHROPIC_CONFIG_DIR and the like) holds a relative path",
    );
  let Ae = (L) => !!L && path.isAbsolute(L);
  let De = (L, ee) => {
    let Le = ie(ce(L)?.trim() || ee);
    if (!path.isAbsolute(Le)) throw describeUnreadableCredentialsPointer(`${L} holds a relative path`);
    return Le;
  };
  let he = (L, ee) => uniq([ee, De(L, ee)].filter(Ae));
  let xe = [
    ...he("AWS_CONFIG_FILE", path.join(B, ".aws", "config")),
    ...he("AWS_SHARED_CREDENTIALS_FILE", path.join(B, ".aws", "credentials")),
  ];
  let Me = De("CLOUDSDK_CONFIG", path.join(B, ".config", "gcloud"));
  let Ne = (L) => {
    let trimmed = ce(L)?.trim();
    if (!trimmed) return [];
    let Le = ie(trimmed);
    if (!path.isAbsolute(Le)) throw describeUnreadableCredentialsPointer(`${L} holds a relative path`);
    return [Le];
  };
  let filtered_3 = [
    ...Ne("GOOGLE_APPLICATION_CREDENTIALS"),
    ...Ne("CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE"),
    ...he("CLOUDSDK_CONFIG", path.join(B, ".config", "gcloud")).map((L) =>
      path.join(L, "application_default_credentials.json"),
    ),
  ].filter(Ae);
  let nt = De("AZURE_CONFIG_DIR", path.join(B, ".azure"));
  let mt = Ne("CLOUDSDK_ROOT_DIR")[0];
  let xdgConfigHome = getXdgConfigHome();
  let lt = uniq(
    [...At("NPM_CONFIG_PREFIX"), ce("PREFIX")]
      .map((L) => L?.trim())
      .filter((L) => !!L)
      .map(ie),
  );
  if (lt.some((L) => !path.isAbsolute(L)))
    throw describeUnreadableCredentialsPointer("an npm prefix variable holds a relative path");
  let Ge = [
    ...Ne("PGSYSCONFDIR").map((L) => path.join(L, "pg_service.conf")),
    "/etc/postgresql-common/pg_service.conf",
    "/etc/pg_service.conf",
    "/usr/local/etc/postgresql/pg_service.conf",
    "/opt/homebrew/etc/postgresql/pg_service.conf",
    "/opt/local/etc/postgresql/pg_service.conf",
  ];
  let Lt = () => {
    let trimmed = ce("COURSIER_CREDENTIALS")?.trim();
    if (!trimmed || /[\r\n]|^[^/]*=/.test(trimmed)) return [];
    let ee = trimmed;
    if (/^file:/i.test(trimmed))
      try {
        ee = fileURLToPath(trimmed);
      } catch {
        throw describeUnreadableCredentialsPointer(
          "COURSIER_CREDENTIALS holds a file: URL that is not a local path",
        );
      }
    else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return [];
    if (!path.isAbsolute(ee))
      throw describeUnreadableCredentialsPointer("COURSIER_CREDENTIALS holds a relative path");
    return [ee];
  };
  let filtered_4 = [
    ...he("DOCKER_CONFIG", path.join(B, ".docker")).flatMap((L) => [
      path.join(L, "config.json"),
      path.join(L, "contexts"),
      path.join(L, "key.pem"),
    ]),
    ...he("DOCKER_CERT_PATH", path.join(B, ".docker")).map((L) => path.join(L, "key.pem")),
    ...uniq([path.join(B, ".config", "gh"), ...he("GH_CONFIG_DIR", path.join(xdgConfigHome, "gh"))]).map(
      (L) => path.join(L, "hosts.yml"),
    ),
    ...he("NETRC", path.join(B, ".netrc")),
    ...he("NPM_CONFIG_USERCONFIG", path.join(B, ".npmrc")),
    ...he("NPM_CONFIG_GLOBALCONFIG", "/usr/local/etc/npmrc"),
    "/opt/homebrew/etc/npmrc",
    "/usr/etc/npmrc",
    "/etc/npmrc",
    ...lt.map((L) => path.join(L, "etc", "npmrc")),
    path.join(B, ".vault-token"),
    path.join(B, ".boto"),
    "/etc/boto.cfg",
    path.join(B, ".s3cfg"),
    ...(ce("BOTO_PATH") ?? "")
      .split(path.delimiter)
      .map((L) => L.trim())
      .filter(Boolean)
      .map((L) => {
        let ee = ie(L);
        if (!path.isAbsolute(ee))
          throw describeUnreadableCredentialsPointer("BOTO_PATH names a relative path");
        return ee;
      }),
    path.join(xdgConfigHome, "sops", "age", "keys.txt"),
    path.join(B, ".config", "sops", "age", "keys.txt"),
    path.join(B, "Library", "Application Support", "sops", "age", "keys.txt"),
    path.join(B, ".vault_pass.txt"),
    ...(await parseAnsibleVaultSources(ce, B, getOriginalCwd())),
    ...(await parseSshCommandIdentities(ce("GIT_SSH_COMMAND") ?? "", B)),
    path.join(B, ".yarnrc.yml"),
    path.join(B, ".yarnrc"),
    path.join(B, ".bunfig.toml"),
    path.join(xdgConfigHome, ".bunfig.toml"),
    ...Ne("HF_HOME").flatMap((L) => [path.join(L, "token"), path.join(L, "stored_tokens")]),
    path.join(xdgConfigHome, "containers", "auth.json"),
    ...Ne("XDG_RUNTIME_DIR").map((L) => path.join(L, "containers", "auth.json")),
    ...he("CARGO_HOME", path.join(B, ".cargo")).flatMap((L) => [
      path.join(L, "credentials.toml"),
      path.join(L, "credentials"),
    ]),
    ...uniq([
      path.join(xdgConfigHome, "composer"),
      path.join(B, ".composer"),
      ...he("COMPOSER_HOME", path.join(B, ".config", "composer")),
    ]).map((L) => path.join(L, "auth.json")),
    ...he("GRADLE_USER_HOME", path.join(B, ".gradle")).map((L) => path.join(L, "gradle.properties")),
    path.join(B, ".m2", "settings.xml"),
    path.join(B, ".m2", "settings-security.xml"),
    ...parseJvmBuildToolCredentials(ce),
    ...Ne("M2_HOME").map((L) => path.join(L, "conf", "settings.xml")),
    ...Ne("MAVEN_HOME").map((L) => path.join(L, "conf", "settings.xml")),
    ...(Ne("LEIN_HOME")[0] !== undefined ? Ne("LEIN_HOME") : [path.join(B, ".lein")]).flatMap((L) => [
      path.join(L, "profiles.clj"),
      path.join(L, "credentials.clj"),
      path.join(L, "credentials.clj.gpg"),
    ]),
    ...Ne("BUNDLE_CONFIG"),
    ...Ne("BUNDLE_USER_CONFIG"),
    ...Ne("BUNDLE_USER_HOME").map((L) => path.join(L, "config")),
    path.join(B, ".bundle", "config"),
    ...Ne("BUNDLE_APP_CONFIG").map((L) => path.join(L, "config")),
    "/usr/local/bundle/config",
    path.join(B, ".gem", "credentials"),
    path.join(B, ".local", "share", "gem", "credentials"),
    ...[
      ...he("HELM_CONFIG_HOME", path.join(xdgConfigHome, "helm")),
      path.join(B, "Library", "Preferences", "helm"),
    ].flatMap((L) => [path.join(L, "registry", "config.json"), path.join(L, "repositories.yaml")]),
    path.join(B, ".nuget", "NuGet", "NuGet.Config"),
    path.join(B, ".config", "NuGet", "NuGet.Config"),
    path.join(xdgConfigHome, "NuGet", "NuGet.Config"),
    ...["KRB5CCNAME", "KRB5_KTNAME", "KRB5_CLIENT_KTNAME"].flatMap((L) => parseKerberosCacheName(ce(L))),
    ...(await parseKrb5Config(ce("KRB5_CONFIG"))),
    path.join(B, ".pypirc"),
    path.join(xdgConfigHome, "pypoetry", "auth.toml"),
    path.join(B, "Library", "Application Support", "pypoetry", "auth.toml"),
    path.join(B, ".condarc"),
    ...[
      "/etc/conda",
      "/var/lib/conda",
      path.join(xdgConfigHome, "conda"),
      path.join(B, ".config", "conda"),
      path.join(B, ".conda"),
    ].flatMap((L) => [path.join(L, ".condarc"), path.join(L, "condarc"), path.join(L, "condarc.d")]),
    ...Ne("CONDARC"),
    ...Ne("POETRY_CONFIG_DIR").map((L) => path.join(L, "auth.toml")),
    path.join(xdgConfigHome, "uv", "uv.toml"),
    ...Ne("UV_CONFIG_FILE"),
    path.join(B, ".sbt", ".credentials"),
    ...Ne("SBT_CREDENTIALS"),
    path.join(B, ".ivy2", ".credentials"),
    path.join(xdgConfigHome, "coursier", "credentials.properties"),
    path.join(B, "Library", "Preferences", "Coursier", "credentials.properties"),
    ...Ne("COURSIER_CONFIG_DIR").map((L) => path.join(L, "credentials.properties")),
    ...Lt(),
    path.join(xdgConfigHome, "rclone", "rclone.conf"),
    path.join(B, ".config", "rclone", "rclone.conf"),
    path.join(B, ".rclone.conf"),
    path.join(B, ".pgpass"),
    path.join(B, ".pg_service.conf"),
    ...(await parsePgServiceConf([path.join(B, ".pg_service.conf"), ...Ne("PGSERVICEFILE"), ...Ge])),
    ...Ge,
    ...Ne("SYSTEM_WGETRC"),
    "/etc/wgetrc",
    "/usr/local/etc/wgetrc",
    "/opt/homebrew/etc/wgetrc",
    "/opt/local/etc/wgetrc",
    path.join(B, ".postgresql", "postgresql.key"),
    path.join(B, ".terraformrc"),
    path.join(B, ".terraform.d", "credentials.tfrc.json"),
    path.join(B, ".wgetrc"),
    path.join(xdgConfigHome, "curlrc"),
    path.join(xdgConfigHome, "pip", "pip.conf"),
    path.join(B, ".pip", "pip.conf"),
    path.join(B, "Library", "Application Support", "pip", "pip.conf"),
    "/etc/pip.conf",
    "/etc/xdg/pip/pip.conf",
    ...he("CURL_HOME", B).map((L) => path.join(L, ".curlrc")),
    ...(mt && path.isAbsolute(mt) ? [path.join(mt, "properties")] : []),
    path.join(B, ".git-credentials"),
    path.join(B, ".config", "git", "credentials"),
    path.join(xdgConfigHome, "git", "credentials"),
    path.join(B, ".kube", "cache", "kubelogin"),
    path.join(B, ".kube", "cache", "oidc-login"),
  ].filter(Ae);
  let filtered_5 = (T("PATH") ?? "").split(path.delimiter).filter((L) => path.isAbsolute(L));
  let fn = await probePathDirectories(probeMacKeychain(filtered_5));
  let yn = uniq(
    [path.join(B, ".kube", "config"), ...(ce("KUBECONFIG") ?? "").split(path.delimiter)]
      .map((L) => ie(L.trim()))
      .filter(Boolean)
      .map((L) => {
        if (!path.isAbsolute(L))
          throw describeUnreadableCredentialsPointer("KUBECONFIG names a relative path");
        return L;
      }),
  );
  let et = () => {
    let L = Number(Pt("GIT_CONFIG_COUNT") ?? "0");
    if (!Number.isInteger(L) || L < 0 || L > 256)
      throw describeUnreadableCredentialsPointer("GIT_CONFIG_COUNT is not a count this can follow");
    let ee = [];
    let Le = String.raw`'([^']*(?:'\\[!'](?:'[^']*)?)*)'?`;
    let We = ($t) => $t.replace(/'\\(['!])'?/g, "$1");
    let wt = Pt("GIT_CONFIG_PARAMETERS") ?? "";
    let regExp = new RegExp(`${Le}(?:=${Le})?`, "g");
    if (wt.replace(regExp, "").trim() !== "")
      throw describeUnreadableCredentialsPointer("GIT_CONFIG_PARAMETERS is not in a form this can follow");
    for (let $t of wt.matchAll(regExp)) {
      let Jt = We($t[1]);
      let gt = $t[2] === undefined ? Jt.indexOf("=") : Jt.length;
      let Wt = gt === -1 ? Jt : Jt.slice(0, gt);
      let ur = $t[2] === undefined ? (gt === -1 ? "true" : Jt.slice(gt + 1)) : We($t[2]);
      let index = Wt.lastIndexOf(".");
      if (index > 0)
        ee.push(`[${Wt.slice(0, Wt.indexOf("."))}]`, `${Wt.slice(index + 1)} = ${JSON.stringify(ur)}`);
    }
    for (let idx = 0; idx < L; idx++) {
      let Jt = Pt(`GIT_CONFIG_KEY_${idx}`) ?? "";
      let gt = Pt(`GIT_CONFIG_VALUE_${idx}`) ?? "";
      let index = Jt.lastIndexOf(".");
      if (index > 0)
        ee.push(`[${Jt.slice(0, Jt.indexOf("."))}]`, `${Jt.slice(index + 1)} = ${JSON.stringify(gt)}`);
    }
    return ee.join(`
`);
  };
  let Et = () =>
    ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"].flatMap((L) => {
      let trimmed = ce(L)?.trim();
      if (!trimmed) return [];
      if (!path.isAbsolute(trimmed)) throw describeUnreadableCredentialsPointer(`${L} holds a relative path`);
      return [trimmed];
    });
  let Ht = [
    ...(await parseSshConfigIdentities(path.join(j, ".ssh", "config"), j)),
    ...(await parseSshConfigIdentities("/etc/ssh/ssh_config", j, 0, "/etc/ssh")),
    ...(
      await Promise.all(
        uniq([
          path.join(j, ".gitconfig"),
          path.join(xdgConfigHome, "git", "config"),
          ...Et(),
          ...SYSTEM_GITCONFIG_PATHS,
        ]).map((L) => parseGitconfigIncludes(L, j)),
      )
    ).flat(),
    ...(await parseGitconfigIncludes(null, j, 0, et())),
  ];
  let goAuth = await parseGoAuth(ce("GOAUTH"), j, filtered_5);
  let results = await Promise.all(yn.map(parseKubeconfigCredentials));
  let Xr = new Set([...results.flatMap((L) => L.execFiles), ...goAuth.programs]);
  let bn = [
    ...results.flatMap((L) => [...L.files, ...L.execFiles]),
    ...Ht,
    ...goAuth.stores,
    ...goAuth.programs,
    ...(await Promise.all(xe.map(describeAwsCredentialProcess))).flat(),
    ...(await Promise.all(filtered_3.map(parseAwsSourceCredentials))).flat(),
    ...(
      await Promise.all(
        he("CLOUDSDK_CONFIG", path.join(B, ".config", "gcloud")).map((L) =>
          listGcloudConfigurations(L, mt).then(async ({ overrides, tokenFiles }) => [
            ...overrides,
            ...tokenFiles,
            ...(await Promise.all(overrides.map(parseAwsSourceCredentials))).flat(),
          ]),
        ),
      )
    ).flat(),
    ...(
      await Promise.all(he("AZURE_CONFIG_DIR", path.join(B, ".azure")).map(parseAzureServicePrincipals))
    ).flat(),
  ];
  let vn = uniq(
    [
      ...mapped,
      ...mapped.map((L) => L?.trim()),
      ...je,
      ...xe,
      ...filtered_3,
      ...pt,
      ...filtered_4,
      ...fn,
      ...yn,
      ...bn,
    ]
      .filter((L) => !!L && path.isAbsolute(L))
      .filter((L) => L !== NULL_DEVICE),
  );
  let flattened_2 = CREDENTIAL_FILE_ENV_VARS.filter((L) => !CONFIG_DIR_ENV_VARS.has(L)).flatMap(At);
  let V = new Set(
    [...flattened_2, ...flattened_2.map((L) => L.trim()), ...pt, ...bn.filter((L) => !Xr.has(L))].filter(
      (L) => !!L && path.isAbsolute(L),
    ),
  );
  let q = [];
  let re = new Map();
  let ue = [
    [path.join(j, ".aws"), "AWS (~/.aws)", EMPTY_ENTRY_SET],
    [path.join(B, ".config", "gcloud"), "gcloud (~/.config/gcloud)", CLOUD_CLI_SAFE_ENTRIES],
    [Me, "gcloud (CLOUDSDK_CONFIG)", CLOUD_CLI_SAFE_ENTRIES],
    [path.join(B, ".azure"), "Azure CLI (~/.azure)", CLOUD_CLI_SAFE_ENTRIES],
    [nt, "Azure CLI (AZURE_CONFIG_DIR)", CLOUD_CLI_SAFE_ENTRIES],
    [joined, "Anthropic profile (default)", CLOUD_CLI_SAFE_ENTRIES],
    [path.join(j, ".ssh"), "SSH (~/.ssh)", SSH_CONFIG_ENTRIES],
    ...he("GNUPGHOME", path.join(j, ".gnupg")).map((L) => [
      L,
      "GnuPG (~/.gnupg, GNUPGHOME)",
      GNUPG_CONFIG_ENTRIES,
    ]),
    ...he("DOCKER_CONFIG", path.join(B, ".docker")).map((L) => [
      L,
      "Docker (~/.docker, DOCKER_CONFIG)",
      DOCKER_SAFE_ENTRIES,
      TOOL_BIN_ENTRIES,
    ]),
    [path.join(B, ".kube"), "Kubernetes (~/.kube)", KUBE_CACHE_ENTRIES],
    [Qe, "Anthropic profile (ANTHROPIC_CONFIG_DIR)", CLOUD_CLI_SAFE_ENTRIES],
    [
      ce("CLAUDE_CODE_FEDERATION_CACHE_DIR")?.trim() ?? "",
      "federation token cache (CLAUDE_CODE_FEDERATION_CACHE_DIR)",
      EMPTY_ENTRY_SET,
    ],
  ];
  for (let [L, ee, Le, We = EMPTY_ENTRY_SET] of ue)
    if (L && path.isAbsolute(L)) {
      let wt = re.get(L);
      re.set(L, {
        label: wt?.label ?? ee,
        skipped: wt ? new Set([...Le].filter((cn) => wt.skipped.has(cn))) : Le,
        skippedAtRoot: wt
          ? new Set([...Le, ...We].filter((cn) => wt.skipped.has(cn) || wt.skippedAtRoot.has(cn)))
          : We,
      });
    }
  for (let [L, { label: ee, skipped: Le, skippedAtRoot: We }] of re) {
    let wt = await probePathDirectories(checkCredentialStoreLinks(L, ee, Le, We), "a credential store");
    if (wt !== null) q.push(wt);
  }
  let ae = [...(await withPathDirectories([...re.keys()])), ...q];
  let Ot = (L) => ae.some((ee) => ee === L || toEvalPathError(ee, L) || toEvalPathError(L, ee));
  for (let L of [Be, Ee]) {
    let filtered = L.filter((Le) => !Ot(Le));
    L.length = 0;
    L.push(...filtered);
  }
  let qe = [sandbox.home, sandbox.tmpDir, ...case_.pluginDirs, ...G, ...Be, ...Ee];
  let results_2 = await Promise.all(qe.map((L) => realpath(L).catch(() => L)));
  let Pe = [];
  for (let L of vn) {
    let ee =
      filtered.some((We) => toEvalPathError(We, L)) && !qe.some((We) => We === L || toEvalPathError(We, L));
    let linkTarget = await resolveLinkTarget(L);
    if (linkTarget === NULL_DEVICE) {
      if (!ee) Pe.push(L, await realPathOf(L));
      continue;
    }
    if (!ee) {
      Pe.push(L);
      if (linkTarget !== null && linkTarget !== "absent" && linkTarget !== L) Pe.push(linkTarget);
      if (V.has(L)) {
        for (let We of [L, linkTarget])
          if (We !== null && We !== "absent") {
            let dir = path.dirname(We);
            if (path.dirname(dir) !== path.parse(dir).root) Pe.push(dir);
          }
      }
      continue;
    }
    if (linkTarget === "absent") continue;
    if (
      linkTarget === null ||
      !W.some((We) => toEvalPathError(We, linkTarget)) ||
      results_2.some((We) => We === linkTarget || toEvalPathError(We, linkTarget))
    ) {
      Pe.push(L);
      if (linkTarget !== null && linkTarget !== L) {
        Pe.push(linkTarget);
        let dir = path.dirname(linkTarget);
        if (
          V.has(L) &&
          path.dirname(dir) !== path.parse(dir).root &&
          !W.some((wt) => toEvalPathError(wt, dir))
        )
          Pe.push(dir);
      }
    }
  }
  if ([...Pe, ...W, ...q].some(hasGlobChars))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "a cloud credential file path in this environment (AWS_SHARED_CREDENTIALS_FILE, GOOGLE_APPLICATION_CREDENTIALS and the like) has a glob character (* ? [ ]) in it, so the Bash sandbox cannot exclude it \u2014 a Bash-granting evaluation cannot run here",
      "eval shell grant refused: glob char in a credential file path",
    );
  let tempDirs = getTempDirs();
  let He = [];
  if (getPlatform() === "macos") {
    let dir = path.dirname(sandbox.root);
    let ee = await probePathDirectories(
      Promise.all(
        getTempDirs().map(async (gt) => ({
          dir: gt,
          real: await realpath(gt).catch(() => gt),
        })),
      ),
      "a directory",
    );
    let Le = (gt) => gt.dir === dir || gt.real === dir;
    tempDirs = ee.filter((gt) => !Le(gt)).map(({ dir }) => dir);
    let filtered = ee.filter(Le);
    let wt = process.getuid?.() ?? 0;
    let cn = [`claude-${wt}`, `cc-daemon-${wt}`, "cc-socks", `cc-socks-${wt}`];
    let CLAUDE_CODE_TMPDIR = env.CLAUDE_CODE_TMPDIR;
    let Jt = CLAUDE_CODE_TMPDIR
      ? uniq([
          CLAUDE_CODE_TMPDIR,
          await probePathDirectories(resolveDirSymlink(CLAUDE_CODE_TMPDIR), "a directory"),
        ]).flatMap((gt) => [`claude-${wt}`, "cc-socks"].map((Wt) => path.join(gt, Wt)))
      : [];
    He = uniq([
      ...filtered.flatMap(({ dir, real }) =>
        uniq([dir, real]).flatMap((ur) => cn.map((Jr) => path.join(ur, Jr))),
      ),
      ...Jt.filter((gt) =>
        filtered.some(({ dir, real }) => toEvalPathError(dir, gt) || toEvalPathError(real, gt)),
      ),
    ]);
  }
  let ln = {
    sandbox: {
      enabled: true,
      failIfUnavailable: true,
      autoAllowBashIfSandboxed: false,
      allowUnsandboxedCommands: false,
      filesystem: {
        allowWrite: [sandbox.home, sandbox.tmpDir].map(toSandboxPathForPlatform),
        denyWrite: [
          ...tempDirs,
          ...He,
          sandbox.configDir,
          sandbox.outDir,
          ...(await withPathDirectories(uniq([...case_.pluginDirsUnderTest, case_.caseDir]))),
          ...J.denyPaths,
          path.join(sandbox.home, ".config", "git"),
          path.join(sandbox.home, ".local", "lib"),
          ...uniq(
            AWS_CACHE_DIRS.flatMap((L) => [
              path.join(sandbox.home, L),
              path.join(sandbox.home, path.dirname(L)),
            ]),
          ),
          ...GIT_METADATA_ENTRIES.map((L) => path.join(sandbox.home, ".git", L)),
          path.join(sandbox.cwd, EVAL_ARTIFACTS_DIR),
          ...DANGEROUS_DIRECTORIES.filter((L) => L !== ".git").map((L) => path.join(sandbox.home, L)),
          ...DANGEROUS_FILES.map((L) => path.join(sandbox.home, L)),
        ].map(toSandboxPathForPlatform),
        denyRead: [
          ...W,
          ...(await withPathDirectories([
            ...SECRET_MOUNT_DIRS,
            ...(process.getuid ? [`/run/user/${process.getuid()}`] : []),
          ])),
          ...q,
          sandbox.configDir,
          sandbox.outDir,
          ...AWS_CACHE_DIRS.map((L) => path.join(sandbox.home, L)),
          ...Z,
        ].map(toSandboxPathForPlatform),
        allowRead: uniq(
          [
            sandbox.home,
            sandbox.tmpDir,
            ...(await withPathDirectories(case_.pluginDirs)).filter(
              (L) =>
                !Z.some(
                  (ee) =>
                    nfcKeyIfEnabled(ee) === nfcKeyIfEnabled(L) || toEvalPathError(ee, L, nfcKeyIfEnabled),
                ),
            ),
            ...G,
            ...Be,
            ...Ee,
          ].map(toSandboxPathForPlatform),
        ),
      },
      network: {
        allowedDomains: b,
      },
      credentials: {
        envVars: uniq([...secretEnvNameCandidates(s), ...PROXY_ENV_VARS_EXTRA, ...parseMavenArgs(s)])
          .filter((L) => !(Object.hasOwn(env_2, L) && s[L] === env_2[L]))
          .filter((L) => !(PLACEHOLDER_CREDENTIAL_KEYS.includes(L) && s[L] === PROXY_INJECTED_MARKER))
          .map((name) => ({
            name,
            mode: "deny",
          })),
        files: Pe.map((L) => ({
          path: toSandboxPathForPlatform(L),
          mode: "deny",
        })),
      },
    },
  };
  if (getPlatform() === "linux" || getPlatform() === "wsl") {
    let filesystem = ln.sandbox.filesystem;
    filesystem.denyWrite = await resolveSandboxPaths(filesystem.denyWrite);
    filesystem.denyRead = await resolveSandboxPaths(filesystem.denyRead);
    filesystem.allowRead = await resolveSandboxPaths(filesystem.allowRead);
    let credentials = ln.sandbox.credentials;
    credentials.files = (await resolveSandboxPaths(credentials.files.map((file) => file.path))).map(
      (path) => ({
        path,
        mode: "deny",
      }),
    );
  }
  await writeFile(path.join(sandbox.configDir, "settings.json"), jsonStringify(ln, null, 2), {
    flag: "wx",
  });
}
//@ chunk-qchp9vrd.js:147750-147924 placement
async function resolveSandboxPaths(e) {
  let n = [];
  let r = new Set();
  for (let a of e) {
    let s = a.startsWith("//") ? a.slice(1) : a;
    let h = a.startsWith("//") ? toSandboxRulePath(await resolveDirSymlink(s)) : a;
    if (!r.has(h)) {
      r.add(h);
      n.push(h);
    }
  }
  return n;
}
//@ chunk-qchp9vrd.js:147924-148077 placement
async function resolveDirSymlink(e) {
  let n = await realpathOfExistingPrefix(e);
  try {
    if ((await lstat(n)).isSymbolicLink()) {
      let r = await realpath(n);
      if ((await lstat(r)).isDirectory()) return r;
    }
  } catch {}
  return n;
}
//@ chunk-qchp9vrd.js:148077-148300 placement
async function realpathOfExistingPrefix(e) {
  let dir = path.dirname(e);
  let r = [path.basename(e)];
  for (;;)
    try {
      return path.join(await realpath(dir), ...r);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if ((errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") || dir === path.parse(dir).root) return e;
      r.unshift(path.basename(dir));
      dir = path.dirname(dir);
    }
}
//@ chunk-qchp9vrd.js:148300-148702 placement
async function checkAddDirsInsideCase(e) {
  let results = await Promise.all(e.context.add_dirs.map((addDir) => checkCaseInsideRoot(e, addDir)));
  let suiteRealRoots = await getSuiteRealRoots(e);
  for (let [a, s] of results.entries())
    if (!suiteRealRoots.some((suiteRealRoot) => suiteRealRoot === s || toEvalPathError(suiteRealRoot, s)))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `case "${e.name}": add_dirs entry "${e.context.add_dirs[a]}" resolves (through a link) outside the case directory and the plugin under test \u2014 it may only grant reads inside them`,
        "add_dirs resolves outside case/plugin",
      );
  return results;
}
export { checkAddDirsInsideCase, buildEvalSandboxSettings };
