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
import os_2, { default as os_2_2, default as os_3 } from "os";
import path, {
  default as path_2,
  default as path_3,
  default as path_4,
  default as path_5,
  default as path_6,
  default as path_7,
  default as path_8,
  default as path_9,
  default as path_10,
  default as path_11,
  default as path_12,
  default as path_13,
  default as path_14,
  default as path_15,
  default as path_16,
  default as path_17,
  default as path_18,
} from "path";
import {
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  readFile,
  readFile as readFile_2,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
} from "fs/promises";
import { fileURLToPath } from "url";
import { Hr, Li } from "./runToolRules.js";
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
import { jl, nfcKeyIfEnabled } from "./runTrace.js";
import {
  Oi,
  detectWslWindowsMounts,
  ul,
  withPathDirectories,
  getTempDirs,
  Jn,
  buildEvalFence,
  checkPathSegmentWhitespace,
  If,
  getXdgConfigHome,
  Pf,
  al,
  $f,
  $r,
  GIT_METADATA_ENTRIES,
  SECRET_MOUNT_DIRS,
  Tf,
  toSandboxRulePath,
  Io,
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
import { Gle } from "../../utils/settings/managedSettingsKeys.js";
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
  Mr,
  To,
} from "./childEnvironment.js";
import { Kt } from "./artifactStub.js";
import { DANGEROUS_DIRECTORIES, DANGEROUS_FILES } from "../../utils/permissions/filesystem.js";
import { PLACEHOLDER_CREDENTIAL_KEYS } from "../../upstreamproxy/upstreamproxy.js";
import { PROXY_INJECTED_MARKER } from "../../utils/subprocessEnv.js";
import { jsonStringify } from "../../utils/slowOperations.js";

/**
 * 生成子会话沙箱设置：允许域、读写路径、凭据排除；无法保证时拒绝 shell 授权（约 18 KB）。
 */
//@ chunk-qchp9vrd.js:129357-147750 placement
async function buildEvalSandboxSettings(e, n, r, a, s, h, w) {
  if (!Hr.some((L) => Li(n, L))) return;
  let b = uniq(
      r.flatMap((L) => {
        let ee = permissionRuleValueFromString(L);
        return ee.toolName === WEBFETCH && ee.ruleContent?.startsWith("domain:")
          ? [ee.ruleContent.slice(7)]
          : [];
      }),
    ),
    flattened = [getSettingsForSource("policySettings"), ...getAllPolicyTierSettings()].flatMap((L) =>
      L?.sandbox ? [L.sandbox] : [],
    ),
    R = (L) => flattened.some(L),
    S =
      !SandboxManager.isPlatformInEnabledList() ||
      R((L) => Array.isArray(L.enabledPlatforms) && !L.enabledPlatforms.includes(getPlatform()))
        ? `sandbox.enabledPlatforms excludes ${getPlatform()}`
        : R((L) => L.enabled === !1)
          ? "sandbox.enabled is false"
          : R((L) => L.failIfUnavailable === !1)
            ? "sandbox.failIfUnavailable is false (a missing backend would run the shell unconfined)"
            : R((L) => L.allowUnsandboxedCommands === !0)
              ? "sandbox.allowUnsandboxedCommands is true"
              : R((L) => (L.excludedCommands?.length ?? 0) > 0)
                ? "sandbox.excludedCommands exempts commands"
                : R((L) => L.autoAllowBashIfSandboxed === !0)
                  ? "sandbox.autoAllowBashIfSandboxed would run commands the operator never granted"
                  : R((L) => L.enableWeakerNestedSandbox === !0)
                    ? "sandbox.enableWeakerNestedSandbox exposes the host /proc"
                    : R((L) => L.enableWeakerNetworkIsolation === !0)
                      ? "sandbox.enableWeakerNetworkIsolation loosens the egress lock"
                      : R((L) => L.allowAppleEvents === !0)
                        ? "sandbox.allowAppleEvents removes macOS automation isolation"
                        : R((L) => L.filesystem?.disabled === !0)
                          ? "sandbox.filesystem.disabled turns filesystem confinement off"
                          : R((L) => L.filesystem?.allowManagedReadPathsOnly === !0)
                            ? "sandbox.filesystem.allowManagedReadPathsOnly would drop the sandbox's own directories from the readable set"
                            : b.length > 0 && R((L) => L.network?.allowManagedDomainsOnly === !0)
                              ? "sandbox.network.allowManagedDomainsOnly means the WebFetch domains you granted cannot open the sandboxed shell's network on this machine"
                              : R((L) => L.allowNestedUserNamespaces === !0)
                                ? "sandbox.allowNestedUserNamespaces lets sandboxed commands get around file deny rules"
                                : null;
  if (S !== null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${jl} (this machine's managed settings: ${S})`,
      "eval shell grant refused: managed policy suppresses the sandbox",
    );
  let T = (L) => s[L] ?? Object.entries(s).find(([ee]) => ee.toUpperCase() === L)?.[1],
    N = a.execution.env ?? {},
    x = T("PATH"),
    homedir = os_3.homedir();
  if (Oi(homedir))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "the operator's home directory is the filesystem root, so the Bash sandbox cannot exclude it \u2014 a Bash-granting evaluation cannot run here (set HOME to a real home directory)",
      "eval shell grant refused: home is the filesystem root",
    );
  let K = getPlatform() === "wsl" ? await detectWslWindowsMounts(h) : [],
    filtered = uniq([
      homedir,
      ul(homedir),
      ...K,
      e.operatorConfigDir,
      ...(await withPathDirectories(uniq([...a.pluginDirsUnderTest, a.caseDir]))).map(ul),
      path_15.dirname(e.root),
      ...getTempDirs(),
      os_3.tmpdir(),
      T("XDG_RUNTIME_DIR") ?? process.env.XDG_RUNTIME_DIR ?? "",
      T("CLAUDE_CODE_FEDERATION_CACHE_DIR") ?? "",
      env.CLAUDE_CODE_TMPDIR
        ? path_15.join(env.CLAUDE_CODE_TMPDIR, `claude-${process.getuid?.() ?? ""}`)
        : "",
      env.CLAUDE_CODE_TMPDIR ?? "",
      env.XDG_CONFIG_HOME ?? "",
      env.XDG_DATA_HOME ?? "",
      env.XDG_CACHE_HOME ?? "",
      env.XDG_STATE_HOME ?? "",
    ])
      .filter((L) => L !== "" && path_15.isAbsolute(L))
      .filter((L) => !Oi(L)),
    W = await withPathDirectories(filtered);
  if (W.some(Jn))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "the home, Claude config, temp, plugin-parent or case-parent directory on this machine has a glob character (* ? [ ]) in its path (as written or where it really points), so the Bash sandbox cannot exclude it \u2014 a Bash-granting evaluation cannot run here",
      "eval shell grant refused: glob char in a sandbox deny root",
    );
  let G = w?.addDirs ?? (await checkAddDirsInsideCase(a)),
    J = w?.readScope ?? (await buildEvalFence(a, G)),
    Z = uniq(J.denyPaths);
  for (let L of Z) checkPathSegmentWhitespace(L, "eval deny path");
  let se = await withPathDirectories([homedir, e.operatorConfigDir]),
    Q = (L) => se.some((ee) => toEvalPathError(ee, L)),
    Se = (L) => [...getTempDirs(), os_3.tmpdir()].some((ee) => toEvalPathError(ee, L)),
    filtered_2 = (
      await probePathDirectories(
        Promise.all(
          (x ?? "")
            .split(path_15.delimiter)
            .filter((L) => path_15.isAbsolute(L) && (!Se(L) || Q(L)))
            .map((L) => realpath_8(L).catch(() => null)),
        ),
      )
    )
      .filter((L) => L !== null)
      .filter(
        (L) =>
          !Jn(L) &&
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
      .filter((L) => !K.some((ee) => ee === L || toEvalPathError(ee, L))),
    Be = [];
  await probePathDirectories(
    (async () => {
      for (let L of filtered_2)
        try {
          if ((await lstat_11(L)).isDirectory()) Be.push(L);
        } catch {}
    })(),
  );
  let Je = uniq(
      (
        await probePathDirectories(
          Promise.all(
            [...Gle, "NODE_EXTRA_CA_CERTS"]
              .map((L) => T(L)?.trim())
              .filter((L) => !!L && path_15.isAbsolute(L) && (!Se(L) || Q(L)))
              .map(async (L) =>
                path_15.join(
                  await realpath_8(path_15.dirname(L)).catch(() => path_15.dirname(L)),
                  path_15.basename(L),
                ),
              ),
          ),
          "a CA-bundle pointer",
        )
      ).filter(
        (L) =>
          !Jn(L) &&
          W.some((ee) => toEvalPathError(ee, L)) &&
          !W.some((ee) => ee === L || toEvalPathError(L, ee)) &&
          (!Se(L) || Q(L)),
      ),
    ),
    Ee = [];
  await probePathDirectories(
    (async () => {
      for (let L of Je)
        try {
          let ee = await lstat_11(L);
          if (!ee.isFile() || ee.nlink !== 1 || ee.size > If) continue;
          if (
            Z.some(
              (We) => nfcKeyIfEnabled(We) === nfcKeyIfEnabled(L) || toEvalPathError(We, L, nfcKeyIfEnabled),
            )
          )
            continue;
          let Le = await readFile_2(L, "utf8");
          if (Le.includes("-----BEGIN CERTIFICATE-----") && !PRIVATE_KEY_PATTERN.test(Le)) Ee.push(L);
        } catch {}
    })(),
    "a CA-bundle pointer",
  );
  let Qe =
      T("ANTHROPIC_CONFIG_DIR")?.trim() ||
      process.env.ANTHROPIC_CONFIG_DIR?.trim() ||
      resolveConfigDir() ||
      "",
    joined = path_15.join(getXdgConfigHome(), "anthropic"),
    je = uniq([joined, Qe].filter((L) => L && path_15.isAbsolute(L))),
    flat = (
      await Promise.all(
        je.map((L) =>
          readAnthropicProfileConfigs(L, T("ANTHROPIC_PROFILE") ?? process.env.ANTHROPIC_PROFILE),
        ),
      )
    ).flat(),
    Pt = (L) => process.env[L],
    ce = (L) => s[L] ?? Pt(L),
    At = (L) =>
      uniq(
        [...Object.entries(s), ...Object.entries(process.env)]
          .filter(([ee]) => ee.toUpperCase() === L)
          .map(([, ee]) => ee)
          .filter((ee) => ee !== void 0)
          .flatMap((ee) => (Pf.has(L) ? ee.split(path_15.delimiter) : [ee]))
          .filter((ee) => !(L === "GOENV" && ee.trim() === "off")),
      ),
    homedir_2 = os_3.homedir(),
    ie = (L) => L.replace(/^~(?=[\\/]|$)/, homedir_2),
    mapped = al.flatMap(At).map(ie);
  if (mapped.some((L) => L && L.trim() !== "" && !path_15.isAbsolute(L.trim())))
    throw describeUnreadableCredentialsPointer(
      "a credentials pointer variable (AWS_CONFIG_FILE, GOOGLE_APPLICATION_CREDENTIALS, ANTHROPIC_CONFIG_DIR and the like) holds a relative path",
    );
  let Ae = (L) => !!L && path_15.isAbsolute(L),
    De = (L, ee) => {
      let Le = ie(ce(L)?.trim() || ee);
      if (!path_15.isAbsolute(Le)) throw describeUnreadableCredentialsPointer(`${L} holds a relative path`);
      return Le;
    },
    he = (L, ee) => uniq([ee, De(L, ee)].filter(Ae)),
    xe = [
      ...he("AWS_CONFIG_FILE", path_15.join(homedir_2, ".aws", "config")),
      ...he("AWS_SHARED_CREDENTIALS_FILE", path_15.join(homedir_2, ".aws", "credentials")),
    ],
    Me = De("CLOUDSDK_CONFIG", path_15.join(homedir_2, ".config", "gcloud")),
    Ne = (L) => {
      let ee = ce(L)?.trim();
      if (!ee) return [];
      let Le = ie(ee);
      if (!path_15.isAbsolute(Le)) throw describeUnreadableCredentialsPointer(`${L} holds a relative path`);
      return [Le];
    },
    filtered_3 = [
      ...Ne("GOOGLE_APPLICATION_CREDENTIALS"),
      ...Ne("CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE"),
      ...he("CLOUDSDK_CONFIG", path_15.join(homedir_2, ".config", "gcloud")).map((L) =>
        path_15.join(L, "application_default_credentials.json"),
      ),
    ].filter(Ae),
    nt = De("AZURE_CONFIG_DIR", path_15.join(homedir_2, ".azure")),
    mt = Ne("CLOUDSDK_ROOT_DIR")[0],
    Ye = getXdgConfigHome(),
    lt = uniq(
      [...At("NPM_CONFIG_PREFIX"), ce("PREFIX")]
        .map((L) => L?.trim())
        .filter((L) => !!L)
        .map(ie),
    );
  if (lt.some((L) => !path_15.isAbsolute(L)))
    throw describeUnreadableCredentialsPointer("an npm prefix variable holds a relative path");
  let Ge = [
      ...Ne("PGSYSCONFDIR").map((L) => path_15.join(L, "pg_service.conf")),
      "/etc/postgresql-common/pg_service.conf",
      "/etc/pg_service.conf",
      "/usr/local/etc/postgresql/pg_service.conf",
      "/opt/homebrew/etc/postgresql/pg_service.conf",
      "/opt/local/etc/postgresql/pg_service.conf",
    ],
    Lt = () => {
      let L = ce("COURSIER_CREDENTIALS")?.trim();
      if (!L || /[\r\n]|^[^/]*=/.test(L)) return [];
      let ee = L;
      if (/^file:/i.test(L))
        try {
          ee = fileURLToPath(L);
        } catch {
          throw describeUnreadableCredentialsPointer(
            "COURSIER_CREDENTIALS holds a file: URL that is not a local path",
          );
        }
      else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(L)) return [];
      if (!path_15.isAbsolute(ee))
        throw describeUnreadableCredentialsPointer("COURSIER_CREDENTIALS holds a relative path");
      return [ee];
    },
    filtered_4 = [
      ...he("DOCKER_CONFIG", path_15.join(homedir_2, ".docker")).flatMap((L) => [
        path_15.join(L, "config.json"),
        path_15.join(L, "contexts"),
        path_15.join(L, "key.pem"),
      ]),
      ...he("DOCKER_CERT_PATH", path_15.join(homedir_2, ".docker")).map((L) => path_15.join(L, "key.pem")),
      ...uniq([path_15.join(homedir_2, ".config", "gh"), ...he("GH_CONFIG_DIR", path_15.join(Ye, "gh"))]).map(
        (L) => path_15.join(L, "hosts.yml"),
      ),
      ...he("NETRC", path_15.join(homedir_2, ".netrc")),
      ...he("NPM_CONFIG_USERCONFIG", path_15.join(homedir_2, ".npmrc")),
      ...he("NPM_CONFIG_GLOBALCONFIG", "/usr/local/etc/npmrc"),
      "/opt/homebrew/etc/npmrc",
      "/usr/etc/npmrc",
      "/etc/npmrc",
      ...lt.map((L) => path_15.join(L, "etc", "npmrc")),
      path_15.join(homedir_2, ".vault-token"),
      path_15.join(homedir_2, ".boto"),
      "/etc/boto.cfg",
      path_15.join(homedir_2, ".s3cfg"),
      ...(ce("BOTO_PATH") ?? "")
        .split(path_15.delimiter)
        .map((L) => L.trim())
        .filter(Boolean)
        .map((L) => {
          let ee = ie(L);
          if (!path_15.isAbsolute(ee))
            throw describeUnreadableCredentialsPointer("BOTO_PATH names a relative path");
          return ee;
        }),
      path_15.join(Ye, "sops", "age", "keys.txt"),
      path_15.join(homedir_2, ".config", "sops", "age", "keys.txt"),
      path_15.join(homedir_2, "Library", "Application Support", "sops", "age", "keys.txt"),
      path_15.join(homedir_2, ".vault_pass.txt"),
      ...(await parseAnsibleVaultSources(ce, homedir_2, getOriginalCwd())),
      ...(await parseSshCommandIdentities(ce("GIT_SSH_COMMAND") ?? "", homedir_2)),
      path_15.join(homedir_2, ".yarnrc.yml"),
      path_15.join(homedir_2, ".yarnrc"),
      path_15.join(homedir_2, ".bunfig.toml"),
      path_15.join(Ye, ".bunfig.toml"),
      ...Ne("HF_HOME").flatMap((L) => [path_15.join(L, "token"), path_15.join(L, "stored_tokens")]),
      path_15.join(Ye, "containers", "auth.json"),
      ...Ne("XDG_RUNTIME_DIR").map((L) => path_15.join(L, "containers", "auth.json")),
      ...he("CARGO_HOME", path_15.join(homedir_2, ".cargo")).flatMap((L) => [
        path_15.join(L, "credentials.toml"),
        path_15.join(L, "credentials"),
      ]),
      ...uniq([
        path_15.join(Ye, "composer"),
        path_15.join(homedir_2, ".composer"),
        ...he("COMPOSER_HOME", path_15.join(homedir_2, ".config", "composer")),
      ]).map((L) => path_15.join(L, "auth.json")),
      ...he("GRADLE_USER_HOME", path_15.join(homedir_2, ".gradle")).map((L) =>
        path_15.join(L, "gradle.properties"),
      ),
      path_15.join(homedir_2, ".m2", "settings.xml"),
      path_15.join(homedir_2, ".m2", "settings-security.xml"),
      ...parseJvmBuildToolCredentials(ce),
      ...Ne("M2_HOME").map((L) => path_15.join(L, "conf", "settings.xml")),
      ...Ne("MAVEN_HOME").map((L) => path_15.join(L, "conf", "settings.xml")),
      ...(Ne("LEIN_HOME")[0] !== void 0 ? Ne("LEIN_HOME") : [path_15.join(homedir_2, ".lein")]).flatMap(
        (L) => [
          path_15.join(L, "profiles.clj"),
          path_15.join(L, "credentials.clj"),
          path_15.join(L, "credentials.clj.gpg"),
        ],
      ),
      ...Ne("BUNDLE_CONFIG"),
      ...Ne("BUNDLE_USER_CONFIG"),
      ...Ne("BUNDLE_USER_HOME").map((L) => path_15.join(L, "config")),
      path_15.join(homedir_2, ".bundle", "config"),
      ...Ne("BUNDLE_APP_CONFIG").map((L) => path_15.join(L, "config")),
      "/usr/local/bundle/config",
      path_15.join(homedir_2, ".gem", "credentials"),
      path_15.join(homedir_2, ".local", "share", "gem", "credentials"),
      ...[
        ...he("HELM_CONFIG_HOME", path_15.join(Ye, "helm")),
        path_15.join(homedir_2, "Library", "Preferences", "helm"),
      ].flatMap((L) => [path_15.join(L, "registry", "config.json"), path_15.join(L, "repositories.yaml")]),
      path_15.join(homedir_2, ".nuget", "NuGet", "NuGet.Config"),
      path_15.join(homedir_2, ".config", "NuGet", "NuGet.Config"),
      path_15.join(Ye, "NuGet", "NuGet.Config"),
      ...["KRB5CCNAME", "KRB5_KTNAME", "KRB5_CLIENT_KTNAME"].flatMap((L) => parseKerberosCacheName(ce(L))),
      ...(await parseKrb5Config(ce("KRB5_CONFIG"))),
      path_15.join(homedir_2, ".pypirc"),
      path_15.join(Ye, "pypoetry", "auth.toml"),
      path_15.join(homedir_2, "Library", "Application Support", "pypoetry", "auth.toml"),
      path_15.join(homedir_2, ".condarc"),
      ...[
        "/etc/conda",
        "/var/lib/conda",
        path_15.join(Ye, "conda"),
        path_15.join(homedir_2, ".config", "conda"),
        path_15.join(homedir_2, ".conda"),
      ].flatMap((L) => [
        path_15.join(L, ".condarc"),
        path_15.join(L, "condarc"),
        path_15.join(L, "condarc.d"),
      ]),
      ...Ne("CONDARC"),
      ...Ne("POETRY_CONFIG_DIR").map((L) => path_15.join(L, "auth.toml")),
      path_15.join(Ye, "uv", "uv.toml"),
      ...Ne("UV_CONFIG_FILE"),
      path_15.join(homedir_2, ".sbt", ".credentials"),
      ...Ne("SBT_CREDENTIALS"),
      path_15.join(homedir_2, ".ivy2", ".credentials"),
      path_15.join(Ye, "coursier", "credentials.properties"),
      path_15.join(homedir_2, "Library", "Preferences", "Coursier", "credentials.properties"),
      ...Ne("COURSIER_CONFIG_DIR").map((L) => path_15.join(L, "credentials.properties")),
      ...Lt(),
      path_15.join(Ye, "rclone", "rclone.conf"),
      path_15.join(homedir_2, ".config", "rclone", "rclone.conf"),
      path_15.join(homedir_2, ".rclone.conf"),
      path_15.join(homedir_2, ".pgpass"),
      path_15.join(homedir_2, ".pg_service.conf"),
      ...(await parsePgServiceConf([
        path_15.join(homedir_2, ".pg_service.conf"),
        ...Ne("PGSERVICEFILE"),
        ...Ge,
      ])),
      ...Ge,
      ...Ne("SYSTEM_WGETRC"),
      "/etc/wgetrc",
      "/usr/local/etc/wgetrc",
      "/opt/homebrew/etc/wgetrc",
      "/opt/local/etc/wgetrc",
      path_15.join(homedir_2, ".postgresql", "postgresql.key"),
      path_15.join(homedir_2, ".terraformrc"),
      path_15.join(homedir_2, ".terraform.d", "credentials.tfrc.json"),
      path_15.join(homedir_2, ".wgetrc"),
      path_15.join(Ye, "curlrc"),
      path_15.join(Ye, "pip", "pip.conf"),
      path_15.join(homedir_2, ".pip", "pip.conf"),
      path_15.join(homedir_2, "Library", "Application Support", "pip", "pip.conf"),
      "/etc/pip.conf",
      "/etc/xdg/pip/pip.conf",
      ...he("CURL_HOME", homedir_2).map((L) => path_15.join(L, ".curlrc")),
      ...(mt && path_15.isAbsolute(mt) ? [path_15.join(mt, "properties")] : []),
      path_15.join(homedir_2, ".git-credentials"),
      path_15.join(homedir_2, ".config", "git", "credentials"),
      path_15.join(Ye, "git", "credentials"),
      path_15.join(homedir_2, ".kube", "cache", "kubelogin"),
      path_15.join(homedir_2, ".kube", "cache", "oidc-login"),
    ].filter(Ae),
    filtered_5 = (T("PATH") ?? "").split(path_15.delimiter).filter((L) => path_15.isAbsolute(L)),
    fn = await probePathDirectories(probeMacKeychain(filtered_5)),
    yn = uniq(
      [path_15.join(homedir_2, ".kube", "config"), ...(ce("KUBECONFIG") ?? "").split(path_15.delimiter)]
        .map((L) => ie(L.trim()))
        .filter(Boolean)
        .map((L) => {
          if (!path_15.isAbsolute(L))
            throw describeUnreadableCredentialsPointer("KUBECONFIG names a relative path");
          return L;
        }),
    ),
    et = () => {
      let L = Number(Pt("GIT_CONFIG_COUNT") ?? "0");
      if (!Number.isInteger(L) || L < 0 || L > 256)
        throw describeUnreadableCredentialsPointer("GIT_CONFIG_COUNT is not a count this can follow");
      let ee = [],
        Le = String.raw`'([^']*(?:'\\[!'](?:'[^']*)?)*)'?`,
        We = ($t) => $t.replace(/'\\(['!])'?/g, "$1"),
        wt = Pt("GIT_CONFIG_PARAMETERS") ?? "",
        regExp = new RegExp(`${Le}(?:=${Le})?`, "g");
      if (wt.replace(regExp, "").trim() !== "")
        throw describeUnreadableCredentialsPointer("GIT_CONFIG_PARAMETERS is not in a form this can follow");
      for (let $t of wt.matchAll(regExp)) {
        let Jt = We($t[1]),
          gt = $t[2] === void 0 ? Jt.indexOf("=") : Jt.length,
          Wt = gt === -1 ? Jt : Jt.slice(0, gt),
          ur = $t[2] === void 0 ? (gt === -1 ? "true" : Jt.slice(gt + 1)) : We($t[2]),
          index = Wt.lastIndexOf(".");
        if (index > 0)
          ee.push(`[${Wt.slice(0, Wt.indexOf("."))}]`, `${Wt.slice(index + 1)} = ${JSON.stringify(ur)}`);
      }
      for (let $t = 0; $t < L; $t++) {
        let Jt = Pt(`GIT_CONFIG_KEY_${$t}`) ?? "",
          gt = Pt(`GIT_CONFIG_VALUE_${$t}`) ?? "",
          index = Jt.lastIndexOf(".");
        if (index > 0)
          ee.push(`[${Jt.slice(0, Jt.indexOf("."))}]`, `${Jt.slice(index + 1)} = ${JSON.stringify(gt)}`);
      }
      return ee.join(`
`);
    },
    Et = () =>
      ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"].flatMap((L) => {
        let ee = ce(L)?.trim();
        if (!ee) return [];
        if (!path_15.isAbsolute(ee)) throw describeUnreadableCredentialsPointer(`${L} holds a relative path`);
        return [ee];
      }),
    Ht = [
      ...(await parseSshConfigIdentities(path_15.join(homedir, ".ssh", "config"), homedir)),
      ...(await parseSshConfigIdentities("/etc/ssh/ssh_config", homedir, 0, "/etc/ssh")),
      ...(
        await Promise.all(
          uniq([
            path_15.join(homedir, ".gitconfig"),
            path_15.join(Ye, "git", "config"),
            ...Et(),
            ...SYSTEM_GITCONFIG_PATHS,
          ]).map((L) => parseGitconfigIncludes(L, homedir)),
        )
      ).flat(),
      ...(await parseGitconfigIncludes(null, homedir, 0, et())),
    ],
    lr = await parseGoAuth(ce("GOAUTH"), homedir, filtered_5),
    results = await Promise.all(yn.map(parseKubeconfigCredentials)),
    Xr = new Set([...results.flatMap((L) => L.execFiles), ...lr.programs]),
    bn = [
      ...results.flatMap((L) => [...L.files, ...L.execFiles]),
      ...Ht,
      ...lr.stores,
      ...lr.programs,
      ...(await Promise.all(xe.map(describeAwsCredentialProcess))).flat(),
      ...(await Promise.all(filtered_3.map(parseAwsSourceCredentials))).flat(),
      ...(
        await Promise.all(
          he("CLOUDSDK_CONFIG", path_15.join(homedir_2, ".config", "gcloud")).map((L) =>
            listGcloudConfigurations(L, mt).then(async ({ overrides: overrides, tokenFiles: tokenFiles }) => [
              ...overrides,
              ...tokenFiles,
              ...(await Promise.all(overrides.map(parseAwsSourceCredentials))).flat(),
            ]),
          ),
        )
      ).flat(),
      ...(
        await Promise.all(
          he("AZURE_CONFIG_DIR", path_15.join(homedir_2, ".azure")).map(parseAzureServicePrincipals),
        )
      ).flat(),
    ],
    vn = uniq(
      [
        ...mapped,
        ...mapped.map((L) => L?.trim()),
        ...je,
        ...xe,
        ...filtered_3,
        ...flat,
        ...filtered_4,
        ...fn,
        ...yn,
        ...bn,
      ]
        .filter((L) => !!L && path_15.isAbsolute(L))
        .filter((L) => L !== NULL_DEVICE),
    ),
    flattened_2 = al.filter((L) => !$f.has(L)).flatMap(At),
    V = new Set(
      [...flattened_2, ...flattened_2.map((L) => L.trim()), ...flat, ...bn.filter((L) => !Xr.has(L))].filter(
        (L) => !!L && path_15.isAbsolute(L),
      ),
    ),
    q = [],
    re = new Map(),
    ue = [
      [path_15.join(homedir, ".aws"), "AWS (~/.aws)", EMPTY_ENTRY_SET],
      [path_15.join(homedir_2, ".config", "gcloud"), "gcloud (~/.config/gcloud)", CLOUD_CLI_SAFE_ENTRIES],
      [Me, "gcloud (CLOUDSDK_CONFIG)", CLOUD_CLI_SAFE_ENTRIES],
      [path_15.join(homedir_2, ".azure"), "Azure CLI (~/.azure)", CLOUD_CLI_SAFE_ENTRIES],
      [nt, "Azure CLI (AZURE_CONFIG_DIR)", CLOUD_CLI_SAFE_ENTRIES],
      [joined, "Anthropic profile (default)", CLOUD_CLI_SAFE_ENTRIES],
      [path_15.join(homedir, ".ssh"), "SSH (~/.ssh)", SSH_CONFIG_ENTRIES],
      ...he("GNUPGHOME", path_15.join(homedir, ".gnupg")).map((L) => [
        L,
        "GnuPG (~/.gnupg, GNUPGHOME)",
        GNUPG_CONFIG_ENTRIES,
      ]),
      ...he("DOCKER_CONFIG", path_15.join(homedir_2, ".docker")).map((L) => [
        L,
        "Docker (~/.docker, DOCKER_CONFIG)",
        DOCKER_SAFE_ENTRIES,
        TOOL_BIN_ENTRIES,
      ]),
      [path_15.join(homedir_2, ".kube"), "Kubernetes (~/.kube)", KUBE_CACHE_ENTRIES],
      [Qe, "Anthropic profile (ANTHROPIC_CONFIG_DIR)", CLOUD_CLI_SAFE_ENTRIES],
      [
        ce("CLAUDE_CODE_FEDERATION_CACHE_DIR")?.trim() ?? "",
        "federation token cache (CLAUDE_CODE_FEDERATION_CACHE_DIR)",
        EMPTY_ENTRY_SET,
      ],
    ];
  for (let [L, ee, Le, We = EMPTY_ENTRY_SET] of ue)
    if (L && path_15.isAbsolute(L)) {
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
  let ae = [...(await withPathDirectories([...re.keys()])), ...q],
    Ot = (L) => ae.some((ee) => ee === L || toEvalPathError(ee, L) || toEvalPathError(L, ee));
  for (let L of [Be, Ee]) {
    let filtered = L.filter((Le) => !Ot(Le));
    ((L.length = 0), L.push(...filtered));
  }
  let qe = [e.home, e.tmpDir, ...a.pluginDirs, ...G, ...Be, ...Ee],
    results_2 = await Promise.all(qe.map((L) => realpath_8(L).catch(() => L))),
    Pe = [];
  for (let L of vn) {
    let ee =
        filtered.some((We) => toEvalPathError(We, L)) && !qe.some((We) => We === L || toEvalPathError(We, L)),
      Le = await resolveLinkTarget(L);
    if (Le === NULL_DEVICE) {
      if (!ee) Pe.push(L, await Mr(L));
      continue;
    }
    if (!ee) {
      if ((Pe.push(L), Le !== null && Le !== "absent" && Le !== L)) Pe.push(Le);
      if (V.has(L)) {
        for (let We of [L, Le])
          if (We !== null && We !== "absent") {
            let dir = path_15.dirname(We);
            if (path_15.dirname(dir) !== path_15.parse(dir).root) Pe.push(dir);
          }
      }
      continue;
    }
    if (Le === "absent") continue;
    if (
      Le === null ||
      !W.some((We) => toEvalPathError(We, Le)) ||
      results_2.some((We) => We === Le || toEvalPathError(We, Le))
    ) {
      if ((Pe.push(L), Le !== null && Le !== L)) {
        Pe.push(Le);
        let dir = path_15.dirname(Le);
        if (
          V.has(L) &&
          path_15.dirname(dir) !== path_15.parse(dir).root &&
          !W.some((wt) => toEvalPathError(wt, dir))
        )
          Pe.push(dir);
      }
    }
  }
  if ([...Pe, ...W, ...q].some(Jn))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "a cloud credential file path in this environment (AWS_SHARED_CREDENTIALS_FILE, GOOGLE_APPLICATION_CREDENTIALS and the like) has a glob character (* ? [ ]) in it, so the Bash sandbox cannot exclude it \u2014 a Bash-granting evaluation cannot run here",
      "eval shell grant refused: glob char in a credential file path",
    );
  let Xe = getTempDirs(),
    He = [];
  if (getPlatform() === "macos") {
    let dir = path_15.dirname(e.root),
      ee = await probePathDirectories(
        Promise.all(
          getTempDirs().map(async (gt) => ({ dir: gt, real: await realpath_8(gt).catch(() => gt) })),
        ),
        "a directory",
      ),
      Le = (gt) => gt.dir === dir || gt.real === dir;
    Xe = ee.filter((gt) => !Le(gt)).map(({ dir: dir }) => dir);
    let filtered = ee.filter(Le),
      wt = process.getuid?.() ?? 0,
      cn = [`claude-${wt}`, `cc-daemon-${wt}`, "cc-socks", `cc-socks-${wt}`],
      CLAUDE_CODE_TMPDIR = env.CLAUDE_CODE_TMPDIR,
      Jt = CLAUDE_CODE_TMPDIR
        ? uniq([
            CLAUDE_CODE_TMPDIR,
            await probePathDirectories(resolveDirSymlink(CLAUDE_CODE_TMPDIR), "a directory"),
          ]).flatMap((gt) => [`claude-${wt}`, "cc-socks"].map((Wt) => path_15.join(gt, Wt)))
        : [];
    He = uniq([
      ...filtered.flatMap(({ dir: dir, real: real }) =>
        uniq([dir, real]).flatMap((ur) => cn.map((Jr) => path_15.join(ur, Jr))),
      ),
      ...Jt.filter((gt) =>
        filtered.some(({ dir: dir, real: real }) => toEvalPathError(dir, gt) || toEvalPathError(real, gt)),
      ),
    ]);
  }
  let ln = {
    sandbox: {
      enabled: !0,
      failIfUnavailable: !0,
      autoAllowBashIfSandboxed: !1,
      allowUnsandboxedCommands: !1,
      filesystem: {
        allowWrite: [e.home, e.tmpDir].map($r),
        denyWrite: [
          ...Xe,
          ...He,
          e.configDir,
          e.outDir,
          ...(await withPathDirectories(uniq([...a.pluginDirsUnderTest, a.caseDir]))),
          ...J.denyPaths,
          path_15.join(e.home, ".config", "git"),
          path_15.join(e.home, ".local", "lib"),
          ...uniq(To.flatMap((L) => [path_15.join(e.home, L), path_15.join(e.home, path_15.dirname(L))])),
          ...GIT_METADATA_ENTRIES.map((L) => path_15.join(e.home, ".git", L)),
          path_15.join(e.cwd, Kt),
          ...DANGEROUS_DIRECTORIES.filter((L) => L !== ".git").map((L) => path_15.join(e.home, L)),
          ...DANGEROUS_FILES.map((L) => path_15.join(e.home, L)),
        ].map($r),
        denyRead: [
          ...W,
          ...(await withPathDirectories([
            ...SECRET_MOUNT_DIRS,
            ...(process.getuid ? [`/run/user/${process.getuid()}`] : []),
          ])),
          ...q,
          e.configDir,
          e.outDir,
          ...To.map((L) => path_15.join(e.home, L)),
          ...Z,
        ].map($r),
        allowRead: uniq(
          [
            e.home,
            e.tmpDir,
            ...(await withPathDirectories(a.pluginDirs)).filter(
              (L) =>
                !Z.some(
                  (ee) =>
                    nfcKeyIfEnabled(ee) === nfcKeyIfEnabled(L) || toEvalPathError(ee, L, nfcKeyIfEnabled),
                ),
            ),
            ...G,
            ...Be,
            ...Ee,
          ].map($r),
        ),
      },
      network: { allowedDomains: b },
      credentials: {
        envVars: uniq([...secretEnvNameCandidates(s), ...Tf, ...parseMavenArgs(s)])
          .filter((L) => !(Object.hasOwn(N, L) && s[L] === N[L]))
          .filter((L) => !(PLACEHOLDER_CREDENTIAL_KEYS.includes(L) && s[L] === PROXY_INJECTED_MARKER))
          .map((L) => ({ name: L, mode: "deny" })),
        files: Pe.map((L) => ({ path: $r(L), mode: "deny" })),
      },
    },
  };
  if (getPlatform() === "linux" || getPlatform() === "wsl") {
    let filesystem = ln.sandbox.filesystem;
    ((filesystem.denyWrite = await resolveSandboxPaths(filesystem.denyWrite)),
      (filesystem.denyRead = await resolveSandboxPaths(filesystem.denyRead)),
      (filesystem.allowRead = await resolveSandboxPaths(filesystem.allowRead)));
    let credentials = ln.sandbox.credentials;
    credentials.files = (await resolveSandboxPaths(credentials.files.map((file) => file.path))).map((Le) => ({
      path: Le,
      mode: "deny",
    }));
  }
  await writeFile_2(path_15.join(e.configDir, "settings.json"), jsonStringify(ln, null, 2), { flag: "wx" });
}
//@ chunk-qchp9vrd.js:147750-147924 placement
async function resolveSandboxPaths(e) {
  let n = [],
    r = new Set();
  for (let a of e) {
    let s = a.startsWith("//") ? a.slice(1) : a,
      h = a.startsWith("//") ? toSandboxRulePath(await resolveDirSymlink(s)) : a;
    if (!r.has(h)) (r.add(h), n.push(h));
  }
  return n;
}
//@ chunk-qchp9vrd.js:147924-148077 placement
async function resolveDirSymlink(e) {
  let n = await realpathOfExistingPrefix(e);
  try {
    if ((await lstat_11(n)).isSymbolicLink()) {
      let r = await realpath_8(n);
      if ((await lstat_11(r)).isDirectory()) return r;
    }
  } catch {}
  return n;
}
//@ chunk-qchp9vrd.js:148077-148300 placement
async function realpathOfExistingPrefix(e) {
  let dir = path_15.dirname(e),
    r = [path_15.basename(e)];
  for (;;)
    try {
      return path_15.join(await realpath_8(dir), ...r);
    } catch (error) {
      let s = getErrnoCode(error);
      if ((s !== "ENOENT" && s !== "ENOTDIR") || dir === path_15.parse(dir).root) return e;
      (r.unshift(path_15.basename(dir)), (dir = path_15.dirname(dir)));
    }
}
//@ chunk-qchp9vrd.js:148300-148702 placement
async function checkAddDirsInsideCase(e) {
  let results = await Promise.all(e.context.add_dirs.map((add_dir) => Io(e, add_dir))),
    r = await getSuiteRealRoots(e);
  for (let [a, s] of results.entries())
    if (!r.some((h) => h === s || toEvalPathError(h, s)))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `case "${e.name}": add_dirs entry "${e.context.add_dirs[a]}" resolves (through a link) outside the case directory and the plugin under test \u2014 it may only grant reads inside them`,
        "add_dirs resolves outside case/plugin",
      );
  return results;
}

export { checkAddDirsInsideCase, buildEvalSandboxSettings };
