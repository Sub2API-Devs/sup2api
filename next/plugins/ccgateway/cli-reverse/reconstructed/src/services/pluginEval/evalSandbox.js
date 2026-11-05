/**
 * services/pluginEval/evalSandbox.ts
 *
 * 2.1.316 新增：plugin eval 子会话的沙箱配置（网络域、文件系统读写围栏、shell 授权条件）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-af1hzzme.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import os from "os";
import { default as path_3 } from "path";
import { realpath, lstat, readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { SHELL_TOOLS, hasToolRule } from "./runToolRules.js";
import {
  normalizeCaseForComparison_2,
  DANGEROUS_DIRECTORIES,
  DANGEROUS_FILES,
} from "../../utils/permissions/filesystem.js";
import { parseRuleString } from "../../utils/permissions/permissionRuleParser.js";
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
import { PLACEHOLDER_CREDENTIAL_KEYS } from "../../upstreamproxy/upstreamproxy.js";
import { PROXY_INJECTED_MARKER } from "../../utils/subprocessEnv.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-af1hzzme.js:130718-149116 placement
/**
 * 生成子会话沙箱设置：允许域、读写路径、凭据排除；无法保证时拒绝 shell 授权（约 18 KB）。
 */
async function buildEvalSandboxSettings(
  sandbox,
  rules,
  operatorAllowedTools,
  evalCase,
  envVars,
  signal,
  options,
) {
  if (!SHELL_TOOLS.some((toolName) => hasToolRule(rules, toolName))) return;
  let networkDomains = normalizeCaseForComparison_2(
    operatorAllowedTools.flatMap((ruleString) => {
      let rule = parseRuleString(ruleString);
      return rule.toolName === WEBFETCH && rule.ruleContent?.startsWith("domain:")
        ? [rule.ruleContent.slice(7)]
        : [];
    }),
  );
  let flattened = [getSettingsForSource("policySettings"), ...getAllPolicyTierSettings()].flatMap(
    (settings) => (settings?.sandbox ? [settings.sandbox] : []),
  );
  let anySandboxSetting = (sandboxSetting) => flattened.some(sandboxSetting);
  let policyProblem =
    !SandboxManager.isPlatformInEnabledList() ||
    anySandboxSetting(
      (setting) =>
        Array.isArray(setting.enabledPlatforms) && !setting.enabledPlatforms.includes(getPlatform()),
    )
      ? `sandbox.enabledPlatforms excludes ${getPlatform()}`
      : anySandboxSetting((setting) => setting.enabled === false)
        ? "sandbox.enabled is false"
        : anySandboxSetting((setting) => setting.failIfUnavailable === false)
          ? "sandbox.failIfUnavailable is false (a missing backend would run the shell unconfined)"
          : anySandboxSetting((setting) => setting.allowUnsandboxedCommands === true)
            ? "sandbox.allowUnsandboxedCommands is true"
            : anySandboxSetting((setting) => (setting.excludedCommands?.length ?? 0) > 0)
              ? "sandbox.excludedCommands exempts commands"
              : anySandboxSetting((setting) => setting.autoAllowBashIfSandboxed === true)
                ? "sandbox.autoAllowBashIfSandboxed would run commands the operator never granted"
                : anySandboxSetting((setting) => setting.enableWeakerNestedSandbox === true)
                  ? "sandbox.enableWeakerNestedSandbox exposes the host /proc"
                  : anySandboxSetting((setting) => setting.enableWeakerNetworkIsolation === true)
                    ? "sandbox.enableWeakerNetworkIsolation loosens the egress lock"
                    : anySandboxSetting((setting) => setting.allowAppleEvents === true)
                      ? "sandbox.allowAppleEvents removes macOS automation isolation"
                      : anySandboxSetting((setting) => setting.filesystem?.disabled === true)
                        ? "sandbox.filesystem.disabled turns filesystem confinement off"
                        : anySandboxSetting(
                              (setting) => setting.filesystem?.allowManagedReadPathsOnly === true,
                            )
                          ? "sandbox.filesystem.allowManagedReadPathsOnly would drop the sandbox's own directories from the readable set"
                          : networkDomains.length > 0 &&
                              anySandboxSetting(
                                (setting) => setting.network?.allowManagedDomainsOnly === true,
                              )
                            ? "sandbox.network.allowManagedDomainsOnly means the WebFetch domains you granted cannot open the sandboxed shell's network on this machine"
                            : anySandboxSetting((setting) => setting.allowNestedUserNamespaces === true)
                              ? "sandbox.allowNestedUserNamespaces lets sandboxed commands get around file deny rules"
                              : null;
  if (policyProblem !== null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${SANDBOX_UNAVAILABLE_TEXT} (this machine's managed settings: ${policyProblem})`,
      "eval shell grant refused: managed policy suppresses the sandbox",
    );
  let caseEnvVar = (name) =>
    envVars[name] ?? Object.entries(envVars).find(([key]) => key.toUpperCase() === name)?.[1];
  let env_2 = evalCase.execution.env ?? {};
  let pathEnv = caseEnvVar("PATH");
  let homeDir = os.homedir();
  if (isRootDir(homeDir))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "the operator's home directory is the filesystem root, so the Bash sandbox cannot exclude it \u2014 a Bash-granting evaluation cannot run here (set HOME to a real home directory)",
      "eval shell grant refused: home is the filesystem root",
    );
  let wslMounts = getPlatform() === "wsl" ? await detectWslWindowsMounts(signal) : [];
  let filtered = normalizeCaseForComparison_2([
    homeDir,
    withDirname(homeDir),
    ...wslMounts,
    sandbox.operatorConfigDir,
    ...(
      await withPathDirectories(
        normalizeCaseForComparison_2([...evalCase.pluginDirsUnderTest, evalCase.caseDir]),
      )
    ).map(withDirname),
    path_3.dirname(sandbox.root),
    ...getTempDirs(),
    os.tmpdir(),
    caseEnvVar("XDG_RUNTIME_DIR") ?? process.env.XDG_RUNTIME_DIR ?? "",
    caseEnvVar("CLAUDE_CODE_FEDERATION_CACHE_DIR") ?? "",
    env.CLAUDE_CODE_TMPDIR ? path_3.join(env.CLAUDE_CODE_TMPDIR, `claude-${process.getuid?.() ?? ""}`) : "",
    env.CLAUDE_CODE_TMPDIR ?? "",
    env.XDG_CONFIG_HOME ?? "",
    env.XDG_DATA_HOME ?? "",
    env.XDG_CACHE_HOME ?? "",
    env.XDG_STATE_HOME ?? "",
  ])
    .filter((candidate) => candidate !== "" && path_3.isAbsolute(candidate))
    .filter((candidate) => !isRootDir(candidate));
  let denyRoots = await withPathDirectories(filtered);
  if (denyRoots.some(hasGlobChars))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "the home, Claude config, temp, plugin-parent or case-parent directory on this machine has a glob character (* ? [ ]) in its path (as written or where it really points), so the Bash sandbox cannot exclude it \u2014 a Bash-granting evaluation cannot run here",
      "eval shell grant refused: glob char in a sandbox deny root",
    );
  let addDirs = options?.addDirs ?? (await checkAddDirsInsideCase(evalCase));
  let readScope = options?.readScope ?? (await buildEvalFence(evalCase, addDirs));
  let denyPaths = normalizeCaseForComparison_2(readScope.denyPaths);
  for (let denyPath of denyPaths) checkPathSegmentWhitespace(denyPath, "eval deny path");
  let privateDirs = await withPathDirectories([homeDir, sandbox.operatorConfigDir]);
  let underPrivateDirs = (path) => privateDirs.some((dir) => toEvalPathError(dir, path));
  let underTemp = (path) => [...getTempDirs(), os.tmpdir()].some((dir) => toEvalPathError(dir, path));
  let filtered_2 = (
    await probePathDirectories(
      Promise.all(
        (pathEnv ?? "")
          .split(path_3.delimiter)
          .filter(
            (pathEntry) =>
              path_3.isAbsolute(pathEntry) && (!underTemp(pathEntry) || underPrivateDirs(pathEntry)),
          )
          .map((pathEntry) => realpath(pathEntry).catch(() => null)),
      ),
    )
  )
    .filter((realPath) => realPath !== null)
    .filter(
      (realPath) =>
        !hasGlobChars(realPath) &&
        denyRoots.some((root) => toEvalPathError(root, realPath)) &&
        !denyRoots.some((root) => root === realPath || toEvalPathError(realPath, root)) &&
        (!underTemp(realPath) || underPrivateDirs(realPath)) &&
        !denyPaths.some(
          (denyPath) =>
            nfcKeyIfEnabled(denyPath) === nfcKeyIfEnabled(realPath) ||
            toEvalPathError(denyPath, realPath, nfcKeyIfEnabled) ||
            toEvalPathError(realPath, denyPath, nfcKeyIfEnabled),
        ),
    )
    .filter((realPath) => !wslMounts.some((mount) => mount === realPath || toEvalPathError(mount, realPath)));
  let readableBinDirs = [];
  await probePathDirectories(
    (async () => {
      for (let dir of filtered_2)
        try {
          if ((await lstat(dir)).isDirectory()) readableBinDirs.push(dir);
        } catch {}
    })(),
  );
  let caFiles = normalizeCaseForComparison_2(
    (
      await probePathDirectories(
        Promise.all(
          [...caCertEnvVars, "NODE_EXTRA_CA_CERTS"]
            .map((name) => caseEnvVar(name)?.trim())
            .filter(
              (value) =>
                !!value && path_3.isAbsolute(value) && (!underTemp(value) || underPrivateDirs(value)),
            )
            .map(async (value) =>
              path_3.join(
                await realpath(path_3.dirname(value)).catch(() => path_3.dirname(value)),
                path_3.basename(value),
              ),
            ),
        ),
        "a CA-bundle pointer",
      )
    ).filter(
      (filePath) =>
        !hasGlobChars(filePath) &&
        denyRoots.some((root) => toEvalPathError(root, filePath)) &&
        !denyRoots.some((root) => root === filePath || toEvalPathError(filePath, root)) &&
        (!underTemp(filePath) || underPrivateDirs(filePath)),
    ),
  );
  let readableCaFiles = [];
  await probePathDirectories(
    (async () => {
      for (let filePath of caFiles)
        try {
          let stats = await lstat(filePath);
          if (!stats.isFile() || stats.nlink !== 1 || stats.size > MAX_SCANNED_FILE_BYTES) continue;
          if (
            denyPaths.some(
              (denyPath) =>
                nfcKeyIfEnabled(denyPath) === nfcKeyIfEnabled(filePath) ||
                toEvalPathError(denyPath, filePath, nfcKeyIfEnabled),
            )
          )
            continue;
          let file = await readFile(filePath, "utf8");
          if (file.includes("-----BEGIN CERTIFICATE-----") && !PRIVATE_KEY_PATTERN.test(file))
            readableCaFiles.push(filePath);
        } catch {}
    })(),
    "a CA-bundle pointer",
  );
  let anthropicConfigDir =
    caseEnvVar("ANTHROPIC_CONFIG_DIR")?.trim() ||
    process.env.ANTHROPIC_CONFIG_DIR?.trim() ||
    resolveConfigDir() ||
    "";
  let joined = path_3.join(getXdgConfigHome(), "anthropic");
  let profileDirs = normalizeCaseForComparison_2(
    [joined, anthropicConfigDir].filter((dir) => dir && path_3.isAbsolute(dir)),
  );
  let profileFiles = (
    await Promise.all(
      profileDirs.map((dir) =>
        readAnthropicProfileConfigs(dir, caseEnvVar("ANTHROPIC_PROFILE") ?? process.env.ANTHROPIC_PROFILE),
      ),
    )
  ).flat();
  let processEnv = (name) => process.env[name];
  let envValue = (name) => envVars[name] ?? processEnv(name);
  let envValues = (name) =>
    normalizeCaseForComparison_2(
      [...Object.entries(envVars), ...Object.entries(process.env)]
        .filter(([key]) => key.toUpperCase() === name)
        .map(([, value]) => value)
        .filter((value) => value !== undefined)
        .flatMap((value) => (KUBECONFIG_ENV.has(name) ? value.split(path_3.delimiter) : [value]))
        .filter((value) => !(name === "GOENV" && value.trim() === "off")),
    );
  let home = os.homedir();
  let expandHome = (path) => path.replace(/^~(?=[\\/]|$)/, home);
  let mapped = CREDENTIAL_FILE_ENV_VARS.flatMap(envValues).map(expandHome);
  if (mapped.some((path) => path && path.trim() !== "" && !path_3.isAbsolute(path.trim())))
    throw describeUnreadableCredentialsPointer(
      "a credentials pointer variable (AWS_CONFIG_FILE, GOOGLE_APPLICATION_CREDENTIALS, ANTHROPIC_CONFIG_DIR and the like) holds a relative path",
    );
  let isAbsolutePath = (path) => !!path && path_3.isAbsolute(path);
  let resolveConfigPath = (name, fallback) => {
    let value = expandHome(envValue(name)?.trim() || fallback);
    if (!path_3.isAbsolute(value))
      throw describeUnreadableCredentialsPointer(`${name} holds a relative path`);
    return value;
  };
  let pathsForEnv = (name, fallback) =>
    normalizeCaseForComparison_2([fallback, resolveConfigPath(name, fallback)].filter(isAbsolutePath));
  let awsConfigFiles = [
    ...pathsForEnv("AWS_CONFIG_FILE", path_3.join(home, ".aws", "config")),
    ...pathsForEnv("AWS_SHARED_CREDENTIALS_FILE", path_3.join(home, ".aws", "credentials")),
  ];
  let cloudsdkConfig = resolveConfigPath("CLOUDSDK_CONFIG", path_3.join(home, ".config", "gcloud"));
  let absoluteEnvPaths = (name) => {
    let path = envValue(name)?.trim();
    if (!path) return [];
    let path_2 = expandHome(path);
    if (!path_3.isAbsolute(path_2))
      throw describeUnreadableCredentialsPointer(`${name} holds a relative path`);
    return [path_2];
  };
  let filtered_3 = [
    ...absoluteEnvPaths("GOOGLE_APPLICATION_CREDENTIALS"),
    ...absoluteEnvPaths("CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE"),
    ...pathsForEnv("CLOUDSDK_CONFIG", path_3.join(home, ".config", "gcloud")).map((dir) =>
      path_3.join(dir, "application_default_credentials.json"),
    ),
  ].filter(isAbsolutePath);
  let azureConfigDir = resolveConfigPath("AZURE_CONFIG_DIR", path_3.join(home, ".azure"));
  let cloudsdkRootDir = absoluteEnvPaths("CLOUDSDK_ROOT_DIR")[0];
  let xdgConfigHome = getXdgConfigHome();
  let npmPrefixes = normalizeCaseForComparison_2(
    [...envValues("NPM_CONFIG_PREFIX"), envValue("PREFIX")]
      .map((value) => value?.trim())
      .filter((value) => !!value)
      .map(expandHome),
  );
  if (npmPrefixes.some((prefix) => !path_3.isAbsolute(prefix)))
    throw describeUnreadableCredentialsPointer("an npm prefix variable holds a relative path");
  let pgServiceConfs = [
    ...absoluteEnvPaths("PGSYSCONFDIR").map((dir) => path_3.join(dir, "pg_service.conf")),
    "/etc/postgresql-common/pg_service.conf",
    "/etc/pg_service.conf",
    "/usr/local/etc/postgresql/pg_service.conf",
    "/opt/homebrew/etc/postgresql/pg_service.conf",
    "/opt/local/etc/postgresql/pg_service.conf",
  ];
  let coursierCredentialFiles = () => {
    let trimmed = envValue("COURSIER_CREDENTIALS")?.trim();
    if (!trimmed || /[\r\n]|^[^/]*=/.test(trimmed)) return [];
    let path = trimmed;
    if (/^file:/i.test(trimmed))
      try {
        path = fileURLToPath(trimmed);
      } catch {
        throw describeUnreadableCredentialsPointer(
          "COURSIER_CREDENTIALS holds a file: URL that is not a local path",
        );
      }
    else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return [];
    if (!path_3.isAbsolute(path))
      throw describeUnreadableCredentialsPointer("COURSIER_CREDENTIALS holds a relative path");
    return [path];
  };
  let filtered_4 = [
    ...pathsForEnv("DOCKER_CONFIG", path_3.join(home, ".docker")).flatMap((dir) => [
      path_3.join(dir, "config.json"),
      path_3.join(dir, "contexts"),
      path_3.join(dir, "key.pem"),
    ]),
    ...pathsForEnv("DOCKER_CERT_PATH", path_3.join(home, ".docker")).map((dir) =>
      path_3.join(dir, "key.pem"),
    ),
    ...normalizeCaseForComparison_2([
      path_3.join(home, ".config", "gh"),
      ...pathsForEnv("GH_CONFIG_DIR", path_3.join(xdgConfigHome, "gh")),
    ]).map((dir) => path_3.join(dir, "hosts.yml")),
    ...pathsForEnv("NETRC", path_3.join(home, ".netrc")),
    ...pathsForEnv("NPM_CONFIG_USERCONFIG", path_3.join(home, ".npmrc")),
    ...pathsForEnv("NPM_CONFIG_GLOBALCONFIG", "/usr/local/etc/npmrc"),
    "/opt/homebrew/etc/npmrc",
    "/usr/etc/npmrc",
    "/etc/npmrc",
    ...npmPrefixes.map((prefix) => path_3.join(prefix, "etc", "npmrc")),
    path_3.join(home, ".vault-token"),
    path_3.join(home, ".boto"),
    "/etc/boto.cfg",
    path_3.join(home, ".s3cfg"),
    ...(envValue("BOTO_PATH") ?? "")
      .split(path_3.delimiter)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        let path = expandHome(entry);
        if (!path_3.isAbsolute(path))
          throw describeUnreadableCredentialsPointer("BOTO_PATH names a relative path");
        return path;
      }),
    path_3.join(xdgConfigHome, "sops", "age", "keys.txt"),
    path_3.join(home, ".config", "sops", "age", "keys.txt"),
    path_3.join(home, "Library", "Application Support", "sops", "age", "keys.txt"),
    path_3.join(home, ".vault_pass.txt"),
    ...(await parseAnsibleVaultSources(envValue, home, getOriginalCwd())),
    ...(await parseSshCommandIdentities(envValue("GIT_SSH_COMMAND") ?? "", home)),
    path_3.join(home, ".yarnrc.yml"),
    path_3.join(home, ".yarnrc"),
    path_3.join(home, ".bunfig.toml"),
    path_3.join(xdgConfigHome, ".bunfig.toml"),
    ...absoluteEnvPaths("HF_HOME").flatMap((dir) => [
      path_3.join(dir, "token"),
      path_3.join(dir, "stored_tokens"),
    ]),
    path_3.join(xdgConfigHome, "containers", "auth.json"),
    ...absoluteEnvPaths("XDG_RUNTIME_DIR").map((dir) => path_3.join(dir, "containers", "auth.json")),
    ...pathsForEnv("CARGO_HOME", path_3.join(home, ".cargo")).flatMap((dir) => [
      path_3.join(dir, "credentials.toml"),
      path_3.join(dir, "credentials"),
    ]),
    ...normalizeCaseForComparison_2([
      path_3.join(xdgConfigHome, "composer"),
      path_3.join(home, ".composer"),
      ...pathsForEnv("COMPOSER_HOME", path_3.join(home, ".config", "composer")),
    ]).map((dir) => path_3.join(dir, "auth.json")),
    ...pathsForEnv("GRADLE_USER_HOME", path_3.join(home, ".gradle")).map((dir) =>
      path_3.join(dir, "gradle.properties"),
    ),
    path_3.join(home, ".m2", "settings.xml"),
    path_3.join(home, ".m2", "settings-security.xml"),
    ...parseJvmBuildToolCredentials(envValue),
    ...absoluteEnvPaths("M2_HOME").map((dir) => path_3.join(dir, "conf", "settings.xml")),
    ...absoluteEnvPaths("MAVEN_HOME").map((dir) => path_3.join(dir, "conf", "settings.xml")),
    ...(absoluteEnvPaths("LEIN_HOME")[0] !== undefined
      ? absoluteEnvPaths("LEIN_HOME")
      : [path_3.join(home, ".lein")]
    ).flatMap((dir) => [
      path_3.join(dir, "profiles.clj"),
      path_3.join(dir, "credentials.clj"),
      path_3.join(dir, "credentials.clj.gpg"),
    ]),
    ...absoluteEnvPaths("BUNDLE_CONFIG"),
    ...absoluteEnvPaths("BUNDLE_USER_CONFIG"),
    ...absoluteEnvPaths("BUNDLE_USER_HOME").map((dir) => path_3.join(dir, "config")),
    path_3.join(home, ".bundle", "config"),
    ...absoluteEnvPaths("BUNDLE_APP_CONFIG").map((dir) => path_3.join(dir, "config")),
    "/usr/local/bundle/config",
    path_3.join(home, ".gem", "credentials"),
    path_3.join(home, ".local", "share", "gem", "credentials"),
    ...[
      ...pathsForEnv("HELM_CONFIG_HOME", path_3.join(xdgConfigHome, "helm")),
      path_3.join(home, "Library", "Preferences", "helm"),
    ].flatMap((dir) => [path_3.join(dir, "registry", "config.json"), path_3.join(dir, "repositories.yaml")]),
    path_3.join(home, ".nuget", "NuGet", "NuGet.Config"),
    path_3.join(home, ".config", "NuGet", "NuGet.Config"),
    path_3.join(xdgConfigHome, "NuGet", "NuGet.Config"),
    ...["KRB5CCNAME", "KRB5_KTNAME", "KRB5_CLIENT_KTNAME"].flatMap((name) =>
      parseKerberosCacheName(envValue(name)),
    ),
    ...(await parseKrb5Config(envValue("KRB5_CONFIG"))),
    path_3.join(home, ".pypirc"),
    path_3.join(xdgConfigHome, "pypoetry", "auth.toml"),
    path_3.join(home, "Library", "Application Support", "pypoetry", "auth.toml"),
    path_3.join(home, ".condarc"),
    ...[
      "/etc/conda",
      "/var/lib/conda",
      path_3.join(xdgConfigHome, "conda"),
      path_3.join(home, ".config", "conda"),
      path_3.join(home, ".conda"),
    ].flatMap((dir) => [
      path_3.join(dir, ".condarc"),
      path_3.join(dir, "condarc"),
      path_3.join(dir, "condarc.d"),
    ]),
    ...absoluteEnvPaths("CONDARC"),
    ...absoluteEnvPaths("POETRY_CONFIG_DIR").map((dir) => path_3.join(dir, "auth.toml")),
    path_3.join(xdgConfigHome, "uv", "uv.toml"),
    ...absoluteEnvPaths("UV_CONFIG_FILE"),
    path_3.join(home, ".sbt", ".credentials"),
    ...absoluteEnvPaths("SBT_CREDENTIALS"),
    path_3.join(home, ".ivy2", ".credentials"),
    path_3.join(xdgConfigHome, "coursier", "credentials.properties"),
    path_3.join(home, "Library", "Preferences", "Coursier", "credentials.properties"),
    ...absoluteEnvPaths("COURSIER_CONFIG_DIR").map((dir) => path_3.join(dir, "credentials.properties")),
    ...coursierCredentialFiles(),
    path_3.join(xdgConfigHome, "rclone", "rclone.conf"),
    path_3.join(home, ".config", "rclone", "rclone.conf"),
    path_3.join(home, ".rclone.conf"),
    path_3.join(home, ".pgpass"),
    path_3.join(home, ".pg_service.conf"),
    ...(await parsePgServiceConf([
      path_3.join(home, ".pg_service.conf"),
      ...absoluteEnvPaths("PGSERVICEFILE"),
      ...pgServiceConfs,
    ])),
    ...pgServiceConfs,
    ...absoluteEnvPaths("SYSTEM_WGETRC"),
    "/etc/wgetrc",
    "/usr/local/etc/wgetrc",
    "/opt/homebrew/etc/wgetrc",
    "/opt/local/etc/wgetrc",
    path_3.join(home, ".postgresql", "postgresql.key"),
    path_3.join(home, ".terraformrc"),
    path_3.join(home, ".terraform.d", "credentials.tfrc.json"),
    path_3.join(home, ".wgetrc"),
    path_3.join(xdgConfigHome, "curlrc"),
    path_3.join(xdgConfigHome, "pip", "pip.conf"),
    path_3.join(home, ".pip", "pip.conf"),
    path_3.join(home, "Library", "Application Support", "pip", "pip.conf"),
    "/etc/pip.conf",
    "/etc/xdg/pip/pip.conf",
    ...pathsForEnv("CURL_HOME", home).map((dir) => path_3.join(dir, ".curlrc")),
    ...(cloudsdkRootDir && path_3.isAbsolute(cloudsdkRootDir)
      ? [path_3.join(cloudsdkRootDir, "properties")]
      : []),
    path_3.join(home, ".git-credentials"),
    path_3.join(home, ".config", "git", "credentials"),
    path_3.join(xdgConfigHome, "git", "credentials"),
    path_3.join(home, ".kube", "cache", "kubelogin"),
    path_3.join(home, ".kube", "cache", "oidc-login"),
  ].filter(isAbsolutePath);
  let filtered_5 = (caseEnvVar("PATH") ?? "")
    .split(path_3.delimiter)
    .filter((entry) => path_3.isAbsolute(entry));
  let keychainFiles = await probePathDirectories(probeMacKeychain(filtered_5));
  let kubeconfigPaths = normalizeCaseForComparison_2(
    [path_3.join(home, ".kube", "config"), ...(envValue("KUBECONFIG") ?? "").split(path_3.delimiter)]
      .map((entry) => expandHome(entry.trim()))
      .filter(Boolean)
      .map((path) => {
        if (!path_3.isAbsolute(path))
          throw describeUnreadableCredentialsPointer("KUBECONFIG names a relative path");
        return path;
      }),
  );
  let gitConfigParameters = () => {
    let configCount = Number(processEnv("GIT_CONFIG_COUNT") ?? "0");
    if (!Number.isInteger(configCount) || configCount < 0 || configCount > 256)
      throw describeUnreadableCredentialsPointer("GIT_CONFIG_COUNT is not a count this can follow");
    let lines = [];
    let quotedValue = String.raw`'([^']*(?:'\\[!'](?:'[^']*)?)*)'?`;
    let unquote = (raw) => raw.replace(/'\\(['!])'?/g, "$1");
    let parameters = processEnv("GIT_CONFIG_PARAMETERS") ?? "";
    let regExp = new RegExp(`${quotedValue}(?:=${quotedValue})?`, "g");
    if (parameters.replace(regExp, "").trim() !== "")
      throw describeUnreadableCredentialsPointer("GIT_CONFIG_PARAMETERS is not in a form this can follow");
    for (let match of parameters.matchAll(regExp)) {
      let keyAndValue = unquote(match[1]);
      let separatorIndex = match[2] === undefined ? keyAndValue.indexOf("=") : keyAndValue.length;
      let key = separatorIndex === -1 ? keyAndValue : keyAndValue.slice(0, separatorIndex);
      let value =
        match[2] === undefined
          ? separatorIndex === -1
            ? "true"
            : keyAndValue.slice(separatorIndex + 1)
          : unquote(match[2]);
      let index = key.lastIndexOf(".");
      if (index > 0)
        lines.push(
          `[${key.slice(0, key.indexOf("."))}]`,
          `${key.slice(index + 1)} = ${JSON.stringify(value)}`,
        );
    }
    for (let idx = 0; idx < configCount; idx++) {
      let key = processEnv(`GIT_CONFIG_KEY_${idx}`) ?? "";
      let value = processEnv(`GIT_CONFIG_VALUE_${idx}`) ?? "";
      let index = key.lastIndexOf(".");
      if (index > 0)
        lines.push(
          `[${key.slice(0, key.indexOf("."))}]`,
          `${key.slice(index + 1)} = ${JSON.stringify(value)}`,
        );
    }
    return lines.join(`
`);
  };
  let gitConfigFilePaths = () =>
    ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"].flatMap((name) => {
      let trimmed = envValue(name)?.trim();
      if (!trimmed) return [];
      if (!path_3.isAbsolute(trimmed))
        throw describeUnreadableCredentialsPointer(`${name} holds a relative path`);
      return [trimmed];
    });
  let sshAndGitFiles = [
    ...(await parseSshConfigIdentities(path_3.join(homeDir, ".ssh", "config"), homeDir)),
    ...(await parseSshConfigIdentities("/etc/ssh/ssh_config", homeDir, 0, "/etc/ssh")),
    ...(
      await Promise.all(
        normalizeCaseForComparison_2([
          path_3.join(homeDir, ".gitconfig"),
          path_3.join(xdgConfigHome, "git", "config"),
          ...gitConfigFilePaths(),
          ...SYSTEM_GITCONFIG_PATHS,
        ]).map((filePath) => parseGitconfigIncludes(filePath, homeDir)),
      )
    ).flat(),
    ...(await parseGitconfigIncludes(null, homeDir, 0, gitConfigParameters())),
  ];
  let goAuth = await parseGoAuth(envValue("GOAUTH"), homeDir, filtered_5);
  let results = await Promise.all(kubeconfigPaths.map(parseKubeconfigCredentials));
  let execPrograms = new Set([...results.flatMap((result) => result.execFiles), ...goAuth.programs]);
  let credentialFiles = [
    ...results.flatMap((result) => [...result.files, ...result.execFiles]),
    ...sshAndGitFiles,
    ...goAuth.stores,
    ...goAuth.programs,
    ...(await Promise.all(awsConfigFiles.map(describeAwsCredentialProcess))).flat(),
    ...(await Promise.all(filtered_3.map(parseAwsSourceCredentials))).flat(),
    ...(
      await Promise.all(
        pathsForEnv("CLOUDSDK_CONFIG", path_3.join(home, ".config", "gcloud")).map((dir) =>
          listGcloudConfigurations(dir, cloudsdkRootDir).then(async ({ overrides, tokenFiles }) => [
            ...overrides,
            ...tokenFiles,
            ...(await Promise.all(overrides.map(parseAwsSourceCredentials))).flat(),
          ]),
        ),
      )
    ).flat(),
    ...(
      await Promise.all(
        pathsForEnv("AZURE_CONFIG_DIR", path_3.join(home, ".azure")).map(parseAzureServicePrincipals),
      )
    ).flat(),
  ];
  let credentialPaths = normalizeCaseForComparison_2(
    [
      ...mapped,
      ...mapped.map((credentialPath) => credentialPath?.trim()),
      ...profileDirs,
      ...awsConfigFiles,
      ...filtered_3,
      ...profileFiles,
      ...filtered_4,
      ...keychainFiles,
      ...kubeconfigPaths,
      ...credentialFiles,
    ]
      .filter((value) => !!value && path_3.isAbsolute(value))
      .filter((value) => value !== NULL_DEVICE),
  );
  let flattened_2 = CREDENTIAL_FILE_ENV_VARS.filter((name) => !CONFIG_DIR_ENV_VARS.has(name)).flatMap(
    envValues,
  );
  let credentialFileSet = new Set(
    [
      ...flattened_2,
      ...flattened_2.map((value) => value.trim()),
      ...profileFiles,
      ...credentialFiles.filter((value) => !execPrograms.has(value)),
    ].filter((value) => !!value && path_3.isAbsolute(value)),
  );
  let unreadableStores = [];
  let storesByDir = new Map();
  let storeSpecs = [
    [path_3.join(homeDir, ".aws"), "AWS (~/.aws)", EMPTY_ENTRY_SET],
    [path_3.join(home, ".config", "gcloud"), "gcloud (~/.config/gcloud)", CLOUD_CLI_SAFE_ENTRIES],
    [cloudsdkConfig, "gcloud (CLOUDSDK_CONFIG)", CLOUD_CLI_SAFE_ENTRIES],
    [path_3.join(home, ".azure"), "Azure CLI (~/.azure)", CLOUD_CLI_SAFE_ENTRIES],
    [azureConfigDir, "Azure CLI (AZURE_CONFIG_DIR)", CLOUD_CLI_SAFE_ENTRIES],
    [joined, "Anthropic profile (default)", CLOUD_CLI_SAFE_ENTRIES],
    [path_3.join(homeDir, ".ssh"), "SSH (~/.ssh)", SSH_CONFIG_ENTRIES],
    ...pathsForEnv("GNUPGHOME", path_3.join(homeDir, ".gnupg")).map((dir) => [
      dir,
      "GnuPG (~/.gnupg, GNUPGHOME)",
      GNUPG_CONFIG_ENTRIES,
    ]),
    ...pathsForEnv("DOCKER_CONFIG", path_3.join(home, ".docker")).map((dir) => [
      dir,
      "Docker (~/.docker, DOCKER_CONFIG)",
      DOCKER_SAFE_ENTRIES,
      TOOL_BIN_ENTRIES,
    ]),
    [path_3.join(home, ".kube"), "Kubernetes (~/.kube)", KUBE_CACHE_ENTRIES],
    [anthropicConfigDir, "Anthropic profile (ANTHROPIC_CONFIG_DIR)", CLOUD_CLI_SAFE_ENTRIES],
    [
      envValue("CLAUDE_CODE_FEDERATION_CACHE_DIR")?.trim() ?? "",
      "federation token cache (CLAUDE_CODE_FEDERATION_CACHE_DIR)",
      EMPTY_ENTRY_SET,
    ],
  ];
  for (let [dir, label, skippedEntries, rootSkippedEntries = EMPTY_ENTRY_SET] of storeSpecs)
    if (dir && path_3.isAbsolute(dir)) {
      let existing = storesByDir.get(dir);
      storesByDir.set(dir, {
        label: existing?.label ?? label,
        skipped: existing
          ? new Set([...skippedEntries].filter((entry) => existing.skipped.has(entry)))
          : skippedEntries,
        skippedAtRoot: existing
          ? new Set(
              [...skippedEntries, ...rootSkippedEntries].filter(
                (entry) => existing.skipped.has(entry) || existing.skippedAtRoot.has(entry),
              ),
            )
          : rootSkippedEntries,
      });
    }
  for (let [dir, { label, skipped: skippedEntries, skippedAtRoot: rootSkippedEntries }] of storesByDir) {
    let badStore = await probePathDirectories(
      checkCredentialStoreLinks(dir, label, skippedEntries, rootSkippedEntries),
      "a credential store",
    );
    if (badStore !== null) unreadableStores.push(badStore);
  }
  let storeDirs = [...(await withPathDirectories([...storesByDir.keys()])), ...unreadableStores];
  let insideStoreDir = (path) =>
    storeDirs.some((dir) => dir === path || toEvalPathError(dir, path) || toEvalPathError(path, dir));
  for (let list of [readableBinDirs, readableCaFiles]) {
    let filtered = list.filter((path) => !insideStoreDir(path));
    list.length = 0;
    list.push(...filtered);
  }
  let allowRoots = [
    sandbox.home,
    sandbox.tmpDir,
    ...evalCase.pluginDirs,
    ...addDirs,
    ...readableBinDirs,
    ...readableCaFiles,
  ];
  let results_2 = await Promise.all(allowRoots.map((root) => realpath(root).catch(() => root)));
  let denyFiles = [];
  for (let path of credentialPaths) {
    let covered =
      filtered.some((root) => toEvalPathError(root, path)) &&
      !allowRoots.some((root) => root === path || toEvalPathError(root, path));
    let linkTarget = await resolveLinkTarget(path);
    if (linkTarget === NULL_DEVICE) {
      if (!covered) denyFiles.push(path, await realPathOf(path));
      continue;
    }
    if (!covered) {
      denyFiles.push(path);
      if (linkTarget !== null && linkTarget !== "absent" && linkTarget !== path) denyFiles.push(linkTarget);
      if (credentialFileSet.has(path)) {
        for (let target of [path, linkTarget])
          if (target !== null && target !== "absent") {
            let dir = path_3.dirname(target);
            if (path_3.dirname(dir) !== path_3.parse(dir).root) denyFiles.push(dir);
          }
      }
      continue;
    }
    if (linkTarget === "absent") continue;
    if (
      linkTarget === null ||
      !denyRoots.some((root) => toEvalPathError(root, linkTarget)) ||
      results_2.some((allowRoot) => allowRoot === linkTarget || toEvalPathError(allowRoot, linkTarget))
    ) {
      denyFiles.push(path);
      if (linkTarget !== null && linkTarget !== path) {
        denyFiles.push(linkTarget);
        let dir = path_3.dirname(linkTarget);
        if (
          credentialFileSet.has(path) &&
          path_3.dirname(dir) !== path_3.parse(dir).root &&
          !denyRoots.some((root) => toEvalPathError(root, dir))
        )
          denyFiles.push(dir);
      }
    }
  }
  if ([...denyFiles, ...denyRoots, ...unreadableStores].some(hasGlobChars))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "a cloud credential file path in this environment (AWS_SHARED_CREDENTIALS_FILE, GOOGLE_APPLICATION_CREDENTIALS and the like) has a glob character (* ? [ ]) in it, so the Bash sandbox cannot exclude it \u2014 a Bash-granting evaluation cannot run here",
      "eval shell grant refused: glob char in a credential file path",
    );
  let tempDirs = getTempDirs();
  let macTempDaemonDirs = [];
  if (getPlatform() === "macos") {
    let dir = path_3.dirname(sandbox.root);
    let tempDirInfos = await probePathDirectories(
      Promise.all(
        getTempDirs().map(async (dir) => ({
          dir,
          real: await realpath(dir).catch(() => dir),
        })),
      ),
      "a directory",
    );
    let isSandboxParent = (info) => info.dir === dir || info.real === dir;
    tempDirs = tempDirInfos.filter((info) => !isSandboxParent(info)).map(({ dir }) => dir);
    let filtered = tempDirInfos.filter(isSandboxParent);
    let uid = process.getuid?.() ?? 0;
    let daemonDirNames = [`claude-${uid}`, `cc-daemon-${uid}`, "cc-socks", `cc-socks-${uid}`];
    let CLAUDE_CODE_TMPDIR = env.CLAUDE_CODE_TMPDIR;
    let tmpDirChildPaths = CLAUDE_CODE_TMPDIR
      ? normalizeCaseForComparison_2([
          CLAUDE_CODE_TMPDIR,
          await probePathDirectories(resolveDirSymlink(CLAUDE_CODE_TMPDIR), "a directory"),
        ]).flatMap((tmpDir) =>
          [`claude-${uid}`, "cc-socks"].map((childName) => path_3.join(tmpDir, childName)),
        )
      : [];
    macTempDaemonDirs = normalizeCaseForComparison_2([
      ...filtered.flatMap(({ dir, real }) =>
        normalizeCaseForComparison_2([dir, real]).flatMap((basePath) =>
          daemonDirNames.map((childName) => path_3.join(basePath, childName)),
        ),
      ),
      ...tmpDirChildPaths.filter((childPath) =>
        filtered.some(({ dir, real }) => toEvalPathError(dir, childPath) || toEvalPathError(real, childPath)),
      ),
    ]);
  }
  let sandboxSettings = {
    sandbox: {
      enabled: true,
      failIfUnavailable: true,
      autoAllowBashIfSandboxed: false,
      allowUnsandboxedCommands: false,
      filesystem: {
        allowWrite: [sandbox.home, sandbox.tmpDir].map(toSandboxPathForPlatform),
        denyWrite: [
          ...tempDirs,
          ...macTempDaemonDirs,
          sandbox.configDir,
          sandbox.outDir,
          ...(await withPathDirectories(
            normalizeCaseForComparison_2([...evalCase.pluginDirsUnderTest, evalCase.caseDir]),
          )),
          ...readScope.denyPaths,
          path_3.join(sandbox.home, ".config", "git"),
          path_3.join(sandbox.home, ".local", "lib"),
          ...normalizeCaseForComparison_2(
            AWS_CACHE_DIRS.flatMap((cacheDir) => [
              path_3.join(sandbox.home, cacheDir),
              path_3.join(sandbox.home, path_3.dirname(cacheDir)),
            ]),
          ),
          ...GIT_METADATA_ENTRIES.map((entry) => path_3.join(sandbox.home, ".git", entry)),
          path_3.join(sandbox.cwd, EVAL_ARTIFACTS_DIR),
          ...DANGEROUS_DIRECTORIES.filter((dirName) => dirName !== ".git").map((dirName) =>
            path_3.join(sandbox.home, dirName),
          ),
          ...DANGEROUS_FILES.map((fileName) => path_3.join(sandbox.home, fileName)),
        ].map(toSandboxPathForPlatform),
        denyRead: [
          ...denyRoots,
          ...(await withPathDirectories([
            ...SECRET_MOUNT_DIRS,
            ...(process.getuid ? [`/run/user/${process.getuid()}`] : []),
          ])),
          ...unreadableStores,
          sandbox.configDir,
          sandbox.outDir,
          ...AWS_CACHE_DIRS.map((cacheDir) => path_3.join(sandbox.home, cacheDir)),
          ...denyPaths,
        ].map(toSandboxPathForPlatform),
        allowRead: normalizeCaseForComparison_2(
          [
            sandbox.home,
            sandbox.tmpDir,
            ...(await withPathDirectories(evalCase.pluginDirs)).filter(
              (dir) =>
                !denyPaths.some(
                  (denyPath) =>
                    nfcKeyIfEnabled(denyPath) === nfcKeyIfEnabled(dir) ||
                    toEvalPathError(denyPath, dir, nfcKeyIfEnabled),
                ),
            ),
            ...addDirs,
            ...readableBinDirs,
            ...readableCaFiles,
          ].map(toSandboxPathForPlatform),
        ),
      },
      network: {
        allowedDomains: networkDomains,
      },
      credentials: {
        envVars: normalizeCaseForComparison_2([
          ...secretEnvNameCandidates(envVars),
          ...PROXY_ENV_VARS_EXTRA,
          ...parseMavenArgs(envVars),
        ])
          .filter((name) => !(Object.hasOwn(env_2, name) && envVars[name] === env_2[name]))
          .filter(
            (name) =>
              !(PLACEHOLDER_CREDENTIAL_KEYS.includes(name) && envVars[name] === PROXY_INJECTED_MARKER),
          )
          .map((name) => ({
            name,
            mode: "deny",
          })),
        files: denyFiles.map((filePath) => ({
          path: toSandboxPathForPlatform(filePath),
          mode: "deny",
        })),
      },
    },
  };
  if (getPlatform() === "linux" || getPlatform() === "wsl") {
    let filesystem = sandboxSettings.sandbox.filesystem;
    filesystem.denyWrite = await resolveSandboxPaths(filesystem.denyWrite);
    filesystem.denyRead = await resolveSandboxPaths(filesystem.denyRead);
    filesystem.allowRead = await resolveSandboxPaths(filesystem.allowRead);
    let credentials = sandboxSettings.sandbox.credentials;
    credentials.files = (await resolveSandboxPaths(credentials.files.map((file) => file.path))).map(
      (path) => ({
        path,
        mode: "deny",
      }),
    );
  }
  await writeFile(path_3.join(sandbox.configDir, "settings.json"), jsonStringify(sandboxSettings, null, 2), {
    flag: "wx",
  });
}
//@ chunk-af1hzzme.js:149116-149290 placement
async function resolveSandboxPaths(paths) {
  let resolved = [];
  let seen = new Set();
  for (let path of paths) {
    let unadjustedPath = path.startsWith("//") ? path.slice(1) : path;
    let rulePath = path.startsWith("//") ? toSandboxRulePath(await resolveDirSymlink(unadjustedPath)) : path;
    if (!seen.has(rulePath)) {
      seen.add(rulePath);
      resolved.push(rulePath);
    }
  }
  return resolved;
}
//@ chunk-af1hzzme.js:149290-149443 placement
async function resolveDirSymlink(path) {
  let resolved = await realpathOfExistingPrefix(path);
  try {
    if ((await lstat(resolved)).isSymbolicLink()) {
      let target = await realpath(resolved);
      if ((await lstat(target)).isDirectory()) return target;
    }
  } catch {}
  return resolved;
}
//@ chunk-af1hzzme.js:149443-149666 placement
async function realpathOfExistingPrefix(targetPath) {
  let dir = path_3.dirname(targetPath);
  let missingParts = [path_3.basename(targetPath)];
  for (;;)
    try {
      return path_3.join(await realpath(dir), ...missingParts);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if ((errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") || dir === path_3.parse(dir).root)
        return targetPath;
      missingParts.unshift(path_3.basename(dir));
      dir = path_3.dirname(dir);
    }
}
//@ chunk-af1hzzme.js:149666-150068 placement
async function checkAddDirsInsideCase(evalCase) {
  let results = await Promise.all(
    evalCase.context.add_dirs.map((addDir) => checkCaseInsideRoot(evalCase, addDir)),
  );
  let suiteRealRoots = await getSuiteRealRoots(evalCase);
  for (let [addDirIndex, resolved] of results.entries())
    if (
      !suiteRealRoots.some(
        (suiteRealRoot) => suiteRealRoot === resolved || toEvalPathError(suiteRealRoot, resolved),
      )
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `case "${evalCase.name}": add_dirs entry "${evalCase.context.add_dirs[addDirIndex]}" resolves (through a link) outside the case directory and the plugin under test \u2014 it may only grant reads inside them`,
        "add_dirs resolves outside case/plugin",
      );
  return results;
}
export { checkAddDirsInsideCase, buildEvalSandboxSettings };
