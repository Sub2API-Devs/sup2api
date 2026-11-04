/**
 * services/pluginEval/credentialExclusion.ts
 *
 * 2.1.316 新增：plugin eval 授予 shell 时找出本机各类凭据存储（Anthropic profile、AWS、kube、ssh、krb5、JVM、Ansible、Azure、git 等）以从沙箱中排除
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (45)
 * attribution: placement 45
 */
import { readdir, stat, open, lstat, rm as rm_2 } from "fs/promises";
import { default as path_2 } from "path";
import { constants } from "fs";
import os_2 from "os";
import {
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { describeFenceProbeFailure, hasGlobChars } from "./evalFence.js";
import { getFileKind } from "../../utils/fileKind.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  create,
  strictCreate,
  create_2,
  create_25,
  create_15,
  create_12,
  create_20,
} from "../../../vendor/zod/lib/index.mjs";
import { getPlatform } from "../../utils/platform.js";
import { isResolvablePath, EVAL_AUTH_DIR_TTL_MS, CLAUDE_EVAL_AUTH } from "./childEnvironment.js";
import { parseYaml } from "../../utils/yaml.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import {
  splitQuotedWords,
  parseMavenSettingsFlag,
  normalizeDefineArgs,
  stripJavaLauncherPrefix,
  parseSbtDirFlag,
  BUILD_TOOL_SETTINGS_PROPERTY_PATTERN,
  JVM_OPTIONS_ENV_NAMES,
  normalizeEnvNameForMatch,
  containsCredential,
  tokensContainSecret,
  isCredentialPropertyName,
  isScalarPropertyValue,
} from "../../utils/settings/policyHelper/helperEnv.js";
import { withTimeout } from "../../utils/sleep.js";
import { uniq } from "../../utils/collections.js";

//@ chunk-qchp9vrd.js:201749-202064 placement
/**
 * 列出目录下的子目录（不跟随链接）；目录不存在返回空，无法分类的条目抛出隔离探测失败错误。
 */
async function listSubdirectories(dir, label) {
  let entries;
  try {
    entries = await readdir(dir, {
      withFileTypes: true,
    });
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return [];
    throw describeFenceProbeFailure(label, error);
  }
  let dirs = [];
  for (let entry of entries) {
    let joined = path_2.join(dir, entry.name);
    let fileKind = await getFileKind(entry, joined, "unknown");
    if (fileKind === "unknown")
      throw describeFenceProbeFailure(label, Error("unclassifiable directory entry"));
    if (fileKind === "dir") dirs.push(joined);
  }
  return dirs;
}
//@ chunk-qchp9vrd.js:202064-202173 placement
/**
 * 把环境变量对象的键转为大写（同名保留先出现的值）。
 */
function upperCaseEnvKeys(env) {
  let upperEnv = {};
  for (let [key, value] of Object.entries(env)) {
    let upper = key.toUpperCase();
    if (!(upper in upperEnv)) upperEnv[upper] = value;
  }
  return upperEnv;
}
//@ chunk-qchp9vrd.js:202173-203943 placement
/**
 * 读取 ANTHROPIC_CONFIG_DIR 下的 profile 配置以排除其凭据文件。
 */
async function readAnthropicProfileConfigs(configDir, profileNameHint) {
  let joined = path_2.join(configDir, "configs");
  let profileName =
    profileNameHint?.trim() || (await probeCredentialPath(path_2.join(configDir, "active_config")))?.trim();
  if (profileName && (path_2.isAbsolute(profileName) || profileName.split(/[\\/]/).includes("..")))
    throw describeUnreadableCredentialsPointer(
      "the selected Anthropic profile name leaves the configs directory",
    );
  let configFiles = [];
  let pendingDirs = [""];
  for (let relativeDir = pendingDirs.pop(); relativeDir !== undefined; relativeDir = pendingDirs.pop()) {
    let entries;
    try {
      entries = await readdir(path_2.join(joined, relativeDir), {
        withFileTypes: true,
      });
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (relativeDir === "" && (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")) return [];
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the Anthropic profile configs directory (ANTHROPIC_CONFIG_DIR/configs) could not be read (${errnoCode ?? "unreadable"}), so the Bash sandbox cannot exclude its credential files \u2014 a Bash-granting evaluation cannot run here`,
        "eval shell grant refused: profile configs directory unreadable",
      );
    }
    for (let entry of entries) {
      let joined_2 = path_2.join(relativeDir, entry.name);
      let fileKind = await getFileKind(entry, path_2.join(joined, joined_2), "unknown");
      if (fileKind === "symlink") {
        fileKind = await stat(path_2.join(joined, joined_2)).then(
          (stats) => (stats.isDirectory() ? "dir" : stats.isFile() ? "file" : "other"),
          (error) => {
            let errnoCode = getErrnoCode(error);
            if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return "other";
            throw describeUnreadableCredentialsPointer(
              `a profile configs entry could not be examined (${errnoCode ?? "unreadable"})`,
            );
          },
        );
        if (fileKind === "other") continue;
      }
      if (fileKind !== "dir" && fileKind !== "file")
        throw describeUnreadableCredentialsPointer("a profile configs entry is not a regular file");
      if (fileKind === "dir") {
        if (joined_2.split(path_2.sep).length > MAX_PROFILE_DEPTH)
          throw describeUnreadableCredentialsPointer("profile configs nest too deeply to enumerate");
        pendingDirs.push(joined_2);
      } else if (entry.name.toLowerCase().endsWith(".json")) configFiles.push(joined_2);
    }
  }
  let credentialPaths = [];
  for (let configFile of configFiles) {
    let sliced = configFile.slice(0, -5);
    let configText = await probeCredentialPath(path_2.join(joined, configFile));
    let configValue = undefined;
    if (configText !== null)
      try {
        configValue = jsonParse(configText);
      } catch {
        throw describeUnreadableCredentialsPointer("a profile config is not valid JSON");
      }
    let parsed = anthropicProfileAuthSchema().safeParse(configValue ?? {});
    if (!parsed.success)
      throw describeUnreadableCredentialsPointer(
        "a profile config has an authentication block this cannot follow",
      );
    let authentication = parsed.data.authentication;
    let credentialsPath = authentication?.credentials_path;
    credentialPaths.push(
      credentialsPath === undefined
        ? path_2.join(configDir, "credentials", `${sliced}.json`)
        : absoluteTokenPath(credentialsPath),
    );
    let path = authentication?.identity_token?.path;
    if (typeof path === "string") credentialPaths.push(absoluteTokenPath(path));
  }
  return credentialPaths;
}
//@ chunk-qchp9vrd.js:203943-204271 placement
/**
 * 凭据排除用常量：配置文件递归深度上限、认证配置文件 schema、读取大小上限。
 */
var MAX_PROFILE_DEPTH = 4;
var anthropicProfileAuthSchema = DoctorLazy(() =>
  create({
    authentication: strictCreate({
      type: create_2().optional(),
      credentials_path: create_2().optional(),
      identity_token: strictCreate({
        source: create_25("file"),
        path: create_2(),
      }).optional(),
      federation_rule_id: create_2().optional(),
      service_account_id: create_2().optional(),
      scope: create_2().optional(),
      client_id: create_2().optional(),
      console_url: create_2().optional(),
    }).optional(),
  }),
);
var MAX_CREDENTIAL_FILE_BYTES = 1048576;
//@ chunk-qchp9vrd.js:204271-204330 placement
/**
 * 探测并解析凭据存储路径（含目录存在性）。
 */
async function probeCredentialPath(filePath) {
  return probePathDirectories(resolveCredentialPath(filePath), "a credential store");
}
//@ chunk-qchp9vrd.js:204330-205120 placement
async function resolveCredentialPath(filePath) {
  let handle;
  try {
    handle = await open(
      filePath,
      getPlatform() === "windows" ? "r" : constants.O_RDONLY | constants.O_NONBLOCK,
    );
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (
      (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") &&
      !(await lstat(filePath).then(
        (stats) => stats.isSymbolicLink(),
        () => false,
      )) &&
      (await isResolvablePath(filePath))
    )
      return null;
    if (
      (errnoCode === "EACCES" || errnoCode === "EPERM") &&
      process.getuid !== undefined &&
      (await stat(filePath).then(
        (stats) => stats.uid !== process.getuid?.(),
        () => false,
      ))
    )
      return null;
    throw describeUnreadableCredentialsPointer(getErrnoCode(error) ?? "unreadable");
  }
  try {
    let stats = await handle.stat();
    if (stats.isFIFO() || stats.isSocket())
      throw describeUnreadableCredentialsPointer("it is a pipe, whose content cannot be inspected");
    if (stats.isDirectory() || (await isNullDevice(stats))) return null;
    if (!stats.isFile())
      throw describeUnreadableCredentialsPointer("it is a device, whose content cannot be inspected");
    if (stats.size > MAX_CREDENTIAL_FILE_BYTES)
      throw describeUnreadableCredentialsPointer(`larger than ${MAX_CREDENTIAL_FILE_BYTES} bytes`);
    return await handle.readFile({
      encoding: "utf8",
    });
  } catch (error) {
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    throw describeUnreadableCredentialsPointer(getErrnoCode(error) ?? "unreadable");
  } finally {
    await handle.close();
  }
}
//@ chunk-qchp9vrd.js:205120-205522 placement
function describeUnreadableCredentialsPointer(detail) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `a credentials file in this environment (the AWS config / shared credentials file, the GCP application-default credentials, a kubeconfig, or an Anthropic profile config) could not be followed (${detail}), so the Bash sandbox cannot exclude the files it points at \u2014 a Bash-granting evaluation cannot run here`,
    "eval shell grant refused: credentials pointer file unreadable",
  );
}
//@ chunk-qchp9vrd.js:205522-205966 placement
/**
 * kubeconfig 中 users 段的宽松 schema：用于提取客户端证书/密钥、token 文件、exec 参数与环境、auth-provider 配置中的凭据路径。
 */
var kubeconfigUsersSchema = DoctorLazy(() => {
  let userSchema = create({
    "client-key": create_2().nullish(),
    "client-certificate": create_2().nullish(),
    tokenFile: create_2().nullish(),
    "token-file": create_2().nullish(),
    exec: create({
      args: create_15(create_12()).nullish(),
      env: create_15(
        create({
          name: create_2(),
          value: create_12().optional(),
        }).passthrough(),
      ).nullish(),
    })
      .passthrough()
      .nullish(),
    "auth-provider": create({
      config: create_20(create_12()).nullish(),
    })
      .passthrough()
      .nullish(),
  }).passthrough();
  return create({
    users: create_15(
      create({
        user: userSchema.nullish(),
      }).passthrough(),
    ).nullish(),
  }).passthrough();
});
//@ chunk-qchp9vrd.js:205966-207152 placement
async function parseKubeconfigCredentials(kubeconfigPath) {
  let kubeconfigText = await probeCredentialPath(kubeconfigPath);
  if (kubeconfigText === null)
    return {
      files: [],
      execFiles: [],
    };
  let parsed;
  try {
    parsed = parseYaml(kubeconfigText);
  } catch {
    throw describeUnreadableCredentialsPointer("a kubeconfig does not parse");
  }
  if (parsed === null || parsed === undefined)
    return {
      files: [],
      execFiles: [],
    };
  let usersResult = kubeconfigUsersSchema().safeParse(parsed);
  if (!usersResult.success)
    throw describeUnreadableCredentialsPointer("a kubeconfig does not have the expected shape");
  let files = [];
  let execFiles = [];
  for (let { user } of usersResult.data.users ?? []) {
    if (!user) continue;
    for (let fileValue of [
      user["client-key"],
      user["client-certificate"],
      user.tokenFile,
      user["token-file"],
    ])
      if (fileValue) files.push(path_2.resolve(path_2.dirname(kubeconfigPath), fileValue));
    let exec = user.exec ?? null;
    let authProvider = user["auth-provider"] ?? null;
    let pairs = [];
    let args = exec?.args ?? [];
    for (let j = 0; j < args.length; j++) {
      let arg = args[j];
      if (typeof arg !== "string" || !arg.startsWith("-")) continue;
      let index = arg.indexOf("=");
      if (index !== -1) pairs.push([arg.slice(0, index), arg.slice(index + 1)]);
      else pairs.push([arg, args[j + 1]]);
    }
    for (let envEntry of exec?.env ?? []) pairs.push([envEntry.name, envEntry.value]);
    pairs.push(...Object.entries(authProvider?.config ?? {}));
    for (let [pairKey, pairValue] of pairs) {
      if (
        typeof pairValue !== "string" ||
        !(
          /token|key|secret|cred|passw|pfx|p12/i.test(pairKey) ||
          (/cert/i.test(pairKey) && !/authorit|(?:^|[-_.])ca(?:$|[-_.])/i.test(pairKey))
        )
      )
        continue;
      if (path_2.isAbsolute(pairValue)) execFiles.push(pairValue);
      else if (/^(?:~|\.\.?)\//.test(pairValue) || /-(?:file|path|dir)$/i.test(pairKey))
        throw describeUnreadableCredentialsPointer(
          "a kubeconfig exec plugin names a credential file by a relative path",
        );
    }
  }
  return {
    files,
    execFiles,
  };
}
//@ chunk-qchp9vrd.js:207152-207500 placement
/**
 * 把 shell 通配模式（*、?、[...] 与 [!...]）转换为锚定的正则，其他字符转义。
 */
function globToRegExp(glob) {
  let pattern = "";
  for (let j = 0; j < glob.length; j++) {
    let char = glob[j];
    if (char === "*") pattern += "[^/]*";
    else if (char === "?") pattern += "[^/]";
    else if (char === "[") {
      let index = glob.indexOf("]", j + 1);
      if (index === -1) pattern += "\\[";
      else {
        let replaced = glob.slice(j + 1, index).replace(/\\/g, "\\\\");
        pattern += `[${replaced.startsWith("!") ? `^${replaced.slice(1)}` : replaced}]`;
        j = index;
      }
    } else pattern += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${pattern}$`);
}
//@ chunk-qchp9vrd.js:207500-207507 placement
/**
 * 缓存中的账号名 promise。
 */
var accountNamePromise;
//@ chunk-qchp9vrd.js:207507-207573 placement
/**
 * 取账号名（用于路径模板替换）。
 */
function getAccountNameForTemplate() {
  accountNamePromise ??= getAccountName().catch((error) => {
    accountNamePromise = undefined;
    throw error;
  });
  return accountNamePromise;
}
//@ chunk-qchp9vrd.js:207573-207757 placement
async function getAccountName() {
  let { stdout, code } = await execFileNoThrow("id", ["-un"], {
    preserveOutputOnError: false,
  });
  let trimmed = stdout.trim();
  if (code !== 0 || !trimmed)
    throw describeUnreadableCredentialsPointer("the account name for %u could not be determined");
  return trimmed;
}
//@ chunk-qchp9vrd.js:207757-209172 placement
/**
 * 解析 ssh_config（Include、ProxyCommand、IdentityFile）找出密钥文件。
 */
async function parseSshConfigIdentities(
  configPath,
  home,
  depth = 0,
  includeBaseDir = path_2.join(home, ".ssh"),
) {
  let configText = await probeCredentialPath(configPath);
  if (configText === null) return [];
  if (depth > 16)
    throw describeUnreadableCredentialsPointer(
      "ssh_config Include / ProxyCommand -F chains nest too deeply (a cycle?)",
    );
  let joined = path_2.join(home, ".ssh");
  let resolveToken = async (template, baseDir = joined) => {
    let expanded = await expandSshPathTokens(template, home);
    if (path_2.isAbsolute(expanded)) return expanded;
    if (baseDir === null)
      throw describeUnreadableCredentialsPointer(
        "an ssh_config names a key file by a relative path (resolved against whatever directory ssh runs in)",
      );
    return path_2.join(baseDir, expanded);
  };
  let splitWords = (text) =>
    [...text.matchAll(/"([^"]*)"|(\S+)/g)].map((wordMatch) => wordMatch[1] ?? wordMatch[2]);
  let identities = [];
  for (let line of configText.split(/\r?\n/)) {
    let match = /^\s*(identityfile|certificatefile|include|proxycommand)(?:\s*=\s*|\s+)(.+?)\s*$/i.exec(line);
    if (!match) continue;
    let [, keyword, value] = match;
    if (keyword.toLowerCase() === "proxycommand") {
      if (value.trim().toLowerCase() !== "none")
        identities.push(...(await parseSshCommandIdentities(value, home, depth + 1)));
      continue;
    }
    if (keyword.toLowerCase() !== "include") {
      let firstWord = splitWords(value)[0] ?? value;
      if (firstWord.toLowerCase() === "none") continue;
      identities.push(await resolveToken(firstWord, null));
      continue;
    }
    for (let includePattern of splitWords(value)) {
      let includePath = await resolveToken(includePattern, includeBaseDir);
      if (!hasGlobChars(includePath))
        identities.push(...(await parseSshConfigIdentities(includePath, home, depth + 1, includeBaseDir)));
      else if (!hasGlobChars(path_2.dirname(includePath))) {
        let dir = path_2.dirname(includePath);
        let includeRegex = globToRegExp(path_2.basename(includePath));
        let dirEntries;
        try {
          dirEntries = await readdir(dir);
        } catch (error) {
          let errnoCode = getErrnoCode(error);
          if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") continue;
          throw describeUnreadableCredentialsPointer(
            `an ssh_config Include directory could not be read (${errnoCode ?? "unreadable"})`,
          );
        }
        let allowDotfiles = path_2.basename(includePath).startsWith(".");
        dirEntries = dirEntries.filter(
          (entryName) => includeRegex.test(entryName) && (allowDotfiles || !entryName.startsWith(".")),
        );
        for (let entryName of dirEntries)
          identities.push(
            ...(await parseSshConfigIdentities(path_2.join(dir, entryName), home, depth + 1, includeBaseDir)),
          );
      } else
        throw describeUnreadableCredentialsPointer(
          "an ssh_config Include pattern with a wildcard directory cannot be followed",
        );
    }
  }
  return identities;
}
//@ chunk-qchp9vrd.js:209172-210996 placement
function parseJvmBuildToolCredentials(readEnv) {
  let credentialPaths = [];
  let requireAbsolute = (filePath) => {
    if (!path_2.isAbsolute(filePath))
      throw describeUnreadableCredentialsPointer(
        "a JVM build tool argument names a settings store by a relative path",
      );
    return filePath;
  };
  let readWords = (envName) => {
    let words = splitQuotedWords(readEnv(envName) ?? "");
    if (words === null)
      throw describeUnreadableCredentialsPointer(
        "a JVM build tool argument variable holds an unterminated quotation",
      );
    return words;
  };
  for (let envName of MAVEN_ARGS_ENV_NAMES) {
    let words = readWords(envName);
    for (let j = 0; j < words.length; j++) {
      let mavenSettingsFlag = parseMavenSettingsFlag(words[j]);
      if (mavenSettingsFlag === null) continue;
      let settingsPath = mavenSettingsFlag || words[j + 1];
      if (settingsPath) credentialPaths.push(requireAbsolute(settingsPath));
    }
  }
  let sbtCredentialPaths = (sbtBaseDir) => [
    path_2.join(sbtBaseDir, ".credentials"),
    path_2.join(sbtBaseDir, "1.0", "credentials.sbt"),
    path_2.join(sbtBaseDir, "1.0", "plugins", "credentials.sbt"),
  ];
  for (let envName of JVM_OPTIONS_ENV_SET) {
    let flattened = normalizeDefineArgs(readWords(envName).map(stripJavaLauncherPrefix)).flatMap((token) => {
      let match = /^-D[^=]+=\s*(-.*)$/s.exec(token);
      if (!match) return [token];
      let nestedWords = splitQuotedWords(match[1]);
      if (nestedWords === null)
        throw describeUnreadableCredentialsPointer(
          "a JVM option variable nests an options line with an unterminated quotation",
        );
      return [token, ...normalizeDefineArgs(nestedWords.map(stripJavaLauncherPrefix))];
    });
    for (let idx = 0; idx < flattened.length; idx++) {
      let argument = flattened[idx];
      if (argument.startsWith("@"))
        throw describeUnreadableCredentialsPointer(`${envName} names an @argument file`);
      if (
        argument.includes("\\") &&
        /^-D[^=]*=|^-{1,2}[a-z-]*(?:settings|ivy|sbt-dir)/i.test(argument) &&
        getPlatform() !== "windows"
      )
        throw describeUnreadableCredentialsPointer(
          `${envName} carries a backslash escape in a store-relocating word`,
        );
      let sbtDirFlag = parseSbtDirFlag(argument);
      if (sbtDirFlag !== null) {
        let sbtDirPath = sbtDirFlag || flattened[idx + 1];
        if (sbtDirPath && !/^-{1,2}sbt-boot/.test(argument)) {
          let sbtDir = requireAbsolute(sbtDirPath);
          credentialPaths.push(
            ...(/^-{1,2}ivy/.test(argument)
              ? [path_2.join(sbtDir, ".credentials")]
              : sbtCredentialPaths(sbtDir)),
          );
        }
        continue;
      }
      let match = /^-D([^=]+)=(.+)$/s.exec(argument);
      if (!match || !BUILD_TOOL_SETTINGS_PROPERTY_PATTERN.test(match[1])) continue;
      let lower = match[1].toLowerCase();
      if (lower === "maven.repo.local" || lower === "sbt.boot.directory") continue;
      let propertyPath = requireAbsolute(match[2]);
      if (lower === "gradle.user.home") credentialPaths.push(path_2.join(propertyPath, "gradle.properties"));
      else if (lower === "maven.home")
        credentialPaths.push(path_2.join(propertyPath, "conf", "settings.xml"));
      else if (lower === "sbt.global.base") credentialPaths.push(...sbtCredentialPaths(propertyPath));
      else if (lower === "sbt.ivy.home") credentialPaths.push(path_2.join(propertyPath, ".credentials"));
      else if (lower === "user.home")
        credentialPaths.push(
          path_2.join(propertyPath, ".m2", "settings.xml"),
          path_2.join(propertyPath, ".m2", "settings-security.xml"),
          path_2.join(propertyPath, ".gradle", "gradle.properties"),
          path_2.join(propertyPath, ".ivy2", ".credentials"),
          ...sbtCredentialPaths(path_2.join(propertyPath, ".sbt")),
        );
      else credentialPaths.push(propertyPath);
    }
  }
  return credentialPaths;
}
//@ chunk-qchp9vrd.js:210996-212315 placement
async function parseKrb5Config(configEnv) {
  let filtered = (configEnv?.trim() || "/etc/krb5.conf")
    .split(path_2.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (filtered.some((entry) => !path_2.isAbsolute(entry)))
    throw describeUnreadableCredentialsPointer("KRB5_CONFIG holds a relative path");
  let uid = String(process.getuid?.() ?? "");
  let credentialPaths = [];
  let visited = new Set();
  let scanConfig = async (configPath, depth) => {
    if (visited.has(configPath)) return;
    if (depth > 8) throw describeUnreadableCredentialsPointer("krb5.conf include files nest too deeply");
    visited.add(configPath);
    let configText = await probeCredentialPath(configPath);
    if (configText === null) return;
    let inLibdefaults = false;
    for (let line of configText.split(/\r?\n/)) {
      let trimmed = line.trim();
      let match = /^(include|includedir)\s+(.+)$/i.exec(trimmed);
      if (match) {
        let configPath = match[2].trim();
        if (!path_2.isAbsolute(configPath))
          throw describeUnreadableCredentialsPointer("a krb5.conf include names a relative path");
        if (match[1].toLowerCase() === "include") await scanConfig(configPath, depth + 1);
        else {
          let includeEntries;
          try {
            includeEntries = await readdir(configPath);
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") continue;
            throw describeUnreadableCredentialsPointer("a krb5.conf includedir could not be listed");
          }
          for (let entryName of includeEntries.sort())
            if (/^[A-Za-z0-9_-]+$/.test(entryName) || entryName.endsWith(".conf"))
              await scanConfig(path_2.join(configPath, entryName), depth + 1);
        }
        continue;
      }
      let match_2 = /^\[([^\]]+)\]/.exec(trimmed);
      if (match_2) {
        inLibdefaults = match_2[1].trim().toLowerCase() === "libdefaults";
        continue;
      }
      if (!inLibdefaults) continue;
      let match_3 = /^(default_ccache_name|default_keytab_name|default_client_keytab_name)\s*=\s*(.+)$/i.exec(
        trimmed,
      );
      if (!match_3) continue;
      let cacheName = match_3[2].trim().replace(/%\{(?:uid|euid|USERID)\}/g, uid);
      if (/%\{/.test(cacheName))
        throw describeUnreadableCredentialsPointer(
          "a krb5.conf credential locator uses a parameter expansion that cannot be resolved",
        );
      credentialPaths.push(...parseKerberosCacheName(cacheName));
    }
  };
  for (let configFile of filtered) await scanConfig(configFile, 0);
  return credentialPaths;
}
//@ chunk-qchp9vrd.js:212315-212667 placement
function parseKerberosCacheName(cacheName) {
  let trimmed = cacheName?.trim();
  if (!trimmed) return [];
  let match = /^([A-Za-z]+):(.*)$/.exec(trimmed);
  let kind = match ? match[1].toUpperCase() : "FILE";
  let path = match ? match[2] : trimmed;
  if (kind !== "FILE" && kind !== "WRFILE" && kind !== "DIR") return [];
  let dirKind = false;
  if (kind === "DIR" && path.startsWith(":")) {
    path = path.slice(1);
    dirKind = true;
  }
  if (!path_2.isAbsolute(path))
    throw describeUnreadableCredentialsPointer(
      "a Kerberos ticket cache / keytab is named by a relative path",
    );
  return dirKind ? [path, path_2.dirname(path)] : [path];
}
//@ chunk-qchp9vrd.js:212667-213652 placement
async function parseGoAuth(goauthValue, homeDir, searchDirs) {
  if (!goauthValue?.trim())
    return {
      stores: [],
      programs: [],
    };
  let stores = [];
  let programs = [];
  for (let segment of goauthValue.split(";")) {
    let words = splitShellWords_2(segment);
    if (words === null) throw describeUnreadableCredentialsPointer("GOAUTH holds an unterminated quotation");
    let command = words[0] ?? "";
    if (command === "" || command === "off" || command === "netrc") continue;
    if (command === "git") {
      let gitDir = words[1];
      if (!gitDir || !path_2.isAbsolute(gitDir))
        throw describeUnreadableCredentialsPointer("GOAUTH names a git directory by a relative path");
      programs.push(gitDir);
      stores.push(...(await parseGitconfigIncludes(path_2.join(gitDir, "config"), homeDir)));
      let joined = path_2.join(gitDir, ".git");
      let gitFileText = await probeCredentialPath(joined);
      let gitdirMatch = gitFileText === null ? null : /^gitdir:\s*(.+?)\s*$/m.exec(gitFileText);
      let configDirs = [joined];
      if (gitdirMatch !== null) {
        let resolved = path_2.resolve(gitDir, gitdirMatch[1]);
        let commonDirText = await probeCredentialPath(path_2.join(resolved, "commondir"));
        configDirs.splice(
          0,
          1,
          resolved,
          ...(commonDirText === null ? [] : [path_2.resolve(resolved, commonDirText.trim())]),
        );
      }
      for (let configDir of configDirs)
        stores.push(
          ...(await parseGitconfigIncludes(path_2.join(configDir, "config"), homeDir)),
          ...(await parseGitconfigIncludes(path_2.join(configDir, "config.worktree"), homeDir)),
        );
      continue;
    }
    if (path_2.isAbsolute(command)) programs.push(command);
    else if (command.includes("/") || command.includes(path_2.sep))
      throw describeUnreadableCredentialsPointer("GOAUTH names a credential helper by a relative path");
    else programs.push(...searchDirs.map((searchDir) => path_2.join(searchDir, command)));
    programs.push(...words.slice(1).filter((word) => path_2.isAbsolute(word)));
  }
  return {
    stores,
    programs,
  };
}
//@ chunk-qchp9vrd.js:213652-213955 placement
/**
 * 按空白拆分 shell 单词（支持单/双引号）；引号未闭合返回 null。
 */
function splitShellWords_2(text) {
  let words = [];
  let index = 0;
  while (index < text.length) {
    let char = text[index];
    if (
      char === " " ||
      char === "\t" ||
      char ===
        `
` ||
      char === "\r"
    ) {
      index++;
      continue;
    }
    if (char === "'" || char === '"') {
      let index_2 = text.indexOf(char, index + 1);
      if (index_2 === -1) return null;
      words.push(text.slice(index + 1, index_2));
      index = index_2 + 1;
      continue;
    }
    let wordEnd = index;
    while (wordEnd < text.length && !/[ \t\n\r]/.test(text[wordEnd])) wordEnd++;
    words.push(text.slice(index, wordEnd));
    index = wordEnd;
  }
  return words;
}
//@ chunk-qchp9vrd.js:213955-215682 placement
async function parseGitconfigIncludes(configPath, homeDir, depth = 0, configTextHint) {
  let configText = configTextHint ?? (configPath === null ? null : await probeCredentialPath(configPath));
  if (configText === null || configText === "") return [];
  if (depth > 10) throw describeUnreadableCredentialsPointer("gitconfig include files nest too deeply");
  let replaced = configText.replace(/\\\r?\n/g, "");
  let parseValue = (rawValue) => {
    let parsed = "";
    let inQuotes = false;
    for (let idx = 0; idx < rawValue.length; idx++) {
      let character = rawValue[idx];
      if (character === '"') inQuotes = !inQuotes;
      else if (character === "\\" && idx + 1 < rawValue.length) {
        let escapedChar = rawValue[++idx];
        parsed +=
          escapedChar === "n"
            ? `
`
            : escapedChar === "t"
              ? "\t"
              : escapedChar;
      } else if (!inQuotes && (character === ";" || character === "#")) break;
      else parsed += character;
    }
    return parsed.trim();
  };
  let expandHome = (value) => value.replace(/^~(?=\/|$)/, homeDir);
  let paths = [];
  let section = "";
  for (let line of replaced.split(/\r?\n/)) {
    let match = /^\s*\[\s*([a-z0-9.-]+)[^\]]*\]\s*(.*)$/i.exec(line);
    if (match) {
      section = match[1].toLowerCase();
      line = match[2] ?? "";
    }
    let match_2 = /^\s*([a-z][a-z0-9-]*)\s*=\s*(.+?)\s*$/i.exec(line);
    if (!match_2) continue;
    let lower = match_2[1].toLowerCase();
    if (lower === "path" && (section === "include" || section === "includeif")) {
      let includeValue = expandHome(parseValue(match_2[2]));
      let includePath = path_2.isAbsolute(includeValue)
        ? includeValue
        : path_2.resolve(configPath === null ? homeDir : path_2.dirname(configPath), includeValue);
      paths.push(...(await parseGitconfigIncludes(includePath, homeDir, depth + 1)));
      continue;
    }
    if ((lower === "sslkey" || lower === "sslcert" || lower === "cookiefile") && section === "http") {
      let httpPath = expandHome(parseValue(match_2[2]));
      if (httpPath === "") continue;
      if (path_2.isAbsolute(httpPath)) paths.push(httpPath);
      else throw describeUnreadableCredentialsPointer(`a gitconfig http.${match_2[1]} is a relative path`);
      continue;
    }
    if (lower === "signingkey" && section === "user") {
      let signingKey = expandHome(parseValue(match_2[2]));
      if (path_2.isAbsolute(signingKey)) paths.push(signingKey.replace(/\.pub$/, ""));
      continue;
    }
    if (lower === "sshcommand" && section === "core") {
      paths.push(...(await parseSshCommandIdentities(parseValue(match_2[2]), homeDir)));
      continue;
    }
    if (lower !== "helper" || section !== "credential") continue;
    let mapped = [...parseValue(match_2[2]).matchAll(/(?:"[^"]*"|'[^']*'|\\.|[^\s\\'"])+/g)].map(
      (wordMatch) =>
        wordMatch[0].replace(
          /"([^"]*)"|'([^']*)'|\\(.)/g,
          (quoteMatch, doubleQuoted, singleQuoted, escaped) => doubleQuoted ?? singleQuoted ?? escaped,
        ),
    );
    for (let idx = 0; idx < mapped.length; idx++) {
      let word = mapped[idx];
      let inlineValue = /^--?[A-Za-z][\w-]*=(.*)$/s.exec(word)?.[1];
      let expandedWord = expandHome(inlineValue ?? word);
      if (path_2.isAbsolute(expandedWord)) {
        paths.push(expandedWord);
        continue;
      }
      let matches = /^(?:--file|-f)$/.test(word);
      if (matches || /^--file=/.test(word)) {
        let fileValue = matches ? expandHome(mapped[idx + 1] ?? "") : expandedWord;
        if (!path_2.isAbsolute(fileValue))
          throw describeUnreadableCredentialsPointer(
            "a gitconfig credential helper names its file by a relative path",
          );
        paths.push(fileValue);
        if (matches) idx++;
      }
    }
  }
  return paths;
}
//@ chunk-qchp9vrd.js:215682-216259 placement
/**
 * 展开 ssh 配置里密钥路径的 % 令牌（%d、%u、%i、%l、%L、%%）与开头的 ~；连接期令牌、${ENV} 或他人 ~ 无法静态解析时抛出。
 */
async function expandSshPathTokens(template, home) {
  let hostname = os_2.hostname();
  let result = "";
  for (let j = 0; j < template.length; j++) {
    let char = template[j];
    if (char !== "%") {
      result += char;
      continue;
    }
    let token = template[++j];
    if (token === "%") result += "%";
    else if (token === "d") result += home;
    else if (token === "u") result += await getAccountNameForTemplate();
    else if (token === "i") result += String(process.getuid?.() ?? "");
    else if (token === "l") result += hostname;
    else if (token === "L") result += hostname.replace(/\..*$/s, "");
    else
      throw describeUnreadableCredentialsPointer(
        "an ssh configuration or command names a key file with a connection-time %-token",
      );
  }
  if (/\$\{[^}]*\}/.test(result) || /^~[^/]/.test(result))
    throw describeUnreadableCredentialsPointer(
      "an ssh configuration or command names a key file through ${ENV} or another user's ~",
    );
  return result.replace(/^~(?=\/|$)/, home);
}
//@ chunk-qchp9vrd.js:216259-217157 placement
async function parseSshCommandIdentities(command, home, depth = 0) {
  let words = splitShellWords(command, home);
  let identities = [];
  let configFiles = [];
  let requireAbsolute = async (template) => {
    if (!template || template.toLowerCase() === "none" || template === "/dev/null") return;
    let expanded = await expandSshPathTokens(template, home);
    if (!path_2.isAbsolute(expanded))
      throw describeUnreadableCredentialsPointer(
        "an ssh command names an identity or configuration file by a relative path",
      );
    return expanded;
  };
  let addIdentity = async (template) => {
    let identityPath = await requireAbsolute(template);
    if (identityPath) identities.push(identityPath);
  };
  let sshDestinationIndex = findSshDestinationIndex(words);
  for (
    let wordIndex = sshDestinationIndex === -1 ? 1 : sshDestinationIndex + 1;
    wordIndex < words.length;
    wordIndex++
  ) {
    let word = words[wordIndex];
    if (word === "--") break;
    if (!word.startsWith("-") || word.startsWith("--")) continue;
    for (let idx = 1; idx < word.length; idx++) {
      let letter = word[idx];
      if (!SSH_OPTION_LETTERS.has(letter)) continue;
      let optionValue = idx + 1 < word.length ? word.slice(idx + 1) : words[++wordIndex];
      if (letter === "i") await addIdentity(optionValue);
      else if (letter === "F") {
        let configPath = await requireAbsolute(optionValue);
        if (configPath) configFiles.push(configPath);
      } else if (letter === "o") {
        let match = /^(IdentityFile|CertificateFile|ProxyCommand)(?:\s*=\s*|\s+)(.+)$/i.exec(
          optionValue ?? "",
        );
        if (match && match[1].toLowerCase() === "proxycommand") {
          if (match[2].trim().toLowerCase() !== "none")
            identities.push(...(await parseSshCommandIdentities(match[2], home, depth + 1)));
        } else await addIdentity(match?.[2]);
      }
      break;
    }
  }
  for (let configPath of configFiles)
    identities.push(...(await parseSshConfigIdentities(configPath, home, depth + 1)));
  return identities;
}
//@ chunk-qchp9vrd.js:217157-217193 placement
/**
 * 匹配 ssh 可执行文件名的正则。
 */
var SSH_COMMAND_RE = /(?:^|[\\/])ssh(?:\.exe)?$/i;
//@ chunk-qchp9vrd.js:217193-217360 placement
function findSshDestinationIndex(words) {
  if (words.length > 0 && SSH_COMMAND_RE.test(words[0])) return 0;
  let index = words.indexOf("--");
  if (index !== -1 && index + 1 < words.length && SSH_COMMAND_RE.test(words[index + 1])) return index + 1;
  return words.findLastIndex((word) => SSH_COMMAND_RE.test(word));
}
//@ chunk-qchp9vrd.js:217360-217401 placement
/**
 * ssh 中带参数的选项字母集合。
 */
var SSH_OPTION_LETTERS = new Set("BbcDEeFIiJLlmOoPpQRSWw");
//@ chunk-qchp9vrd.js:217401-218417 placement
function splitShellWords(command, homeDir) {
  let fail = (problem) => {
    throw describeUnreadableCredentialsPointer(`an ssh command ${problem}`);
  };
  let words = [];
  let current = "";
  let hasCurrent = false;
  let index = 0;
  let expandHomeReference = () => {
    let sliced = command.slice(index);
    let match = /^\$\{HOME\}|^\$HOME(?![A-Za-z0-9_])/.exec(sliced);
    if (!match) fail("uses a shell expansion that cannot be resolved here");
    current += homeDir;
    hasCurrent = true;
    index += match[0].length;
  };
  while (index < command.length) {
    let character = command[index];
    if (
      character === " " ||
      character === "\t" ||
      character ===
        `
`
    ) {
      if (hasCurrent) {
        words.push(current);
        current = "";
        hasCurrent = false;
      }
      index++;
    } else if (character === "\\") {
      if (index + 1 < command.length) {
        current += command[index + 1];
        index += 2;
      } else index++;
      hasCurrent = true;
    } else if (character === "'") {
      let index_2 = command.indexOf("'", index + 1);
      if (index_2 === -1) fail("holds an unterminated quotation");
      current += command.slice(index + 1, index_2);
      hasCurrent = true;
      index = index_2 + 1;
    } else if (character === '"') {
      hasCurrent = true;
      index++;
      for (;;) {
        if (index >= command.length) fail("holds an unterminated quotation");
        let character = command[index];
        if (character === '"') {
          index++;
          break;
        }
        if (character === "\\" && index + 1 < command.length && '$`"\\'.includes(command[index + 1])) {
          current += command[index + 1];
          index += 2;
        } else if (character === "$") expandHomeReference();
        else if (character === "`") fail("uses a shell expansion that cannot be resolved here");
        else {
          current += character;
          index++;
        }
      }
    } else if (character === "$") expandHomeReference();
    else if (character === "`") fail("uses a shell expansion that cannot be resolved here");
    else if (
      character === "~" &&
      !hasCurrent &&
      (index + 1 >= command.length || /[\/\s]/.test(command[index + 1]))
    ) {
      current += homeDir;
      hasCurrent = true;
      index++;
    } else {
      current += character;
      hasCurrent = true;
      index++;
    }
  }
  if (hasCurrent) words.push(current);
  return words;
}
//@ chunk-qchp9vrd.js:218417-219644 placement
async function parseAnsibleVaultSources(readEnv, homeDir, originalCwd) {
  let sources = [];
  let addSource = (rawSource) => {
    let replaced = rawSource.trim().replace(/^~(?=\/|$)/, homeDir);
    if (!replaced || replaced === "prompt" || replaced.startsWith("prompt_")) return;
    if (!path_2.isAbsolute(replaced))
      throw describeUnreadableCredentialsPointer("an Ansible vault password source is a relative path");
    sources.push(replaced);
  };
  let addIdentityList = (identityList) => {
    for (let entry of identityList.split(",")) {
      let index = entry.indexOf("@");
      addSource(index === -1 ? entry : entry.slice(index + 1));
    }
  };
  let identityListValue = readEnv("ANSIBLE_VAULT_IDENTITY_LIST");
  if (identityListValue) addIdentityList(identityListValue);
  let trimmed = readEnv("ANSIBLE_CONFIG")?.trim();
  if (trimmed !== undefined && trimmed !== "" && !path_2.isAbsolute(trimmed))
    throw describeUnreadableCredentialsPointer("ANSIBLE_CONFIG holds a relative path");
  let cwdWorldWritable = await stat(originalCwd).then(
    (stats) => (stats.mode & 2) !== 0,
    () => true,
  );
  for (let configCandidate of [
    ...(trimmed ? [trimmed, path_2.join(trimmed, "ansible.cfg")] : []),
    ...(cwdWorldWritable ? [] : [path_2.join(originalCwd, "ansible.cfg")]),
    path_2.join(homeDir, ".ansible.cfg"),
    "/etc/ansible/ansible.cfg",
  ]) {
    let configText = await probeCredentialPath(configCandidate);
    if (configText === null) continue;
    let inDefaults = false;
    let lines = [];
    for (let line of configText.split(/\r?\n/))
      if (/^[ \t]+\S/.test(line) && lines.length > 0 && !/^[ \t]*[#;]/.test(line))
        lines[lines.length - 1] += `
${line.trim()}`;
      else lines.push(line);
    for (let line of lines) {
      let trimmed = line.trim();
      let match = /^\[([^\]]+)\]/.exec(trimmed);
      if (match) {
        inDefaults = match[1].trim().toLowerCase() === "defaults";
        continue;
      }
      if (!inDefaults) continue;
      let match_2 = /^(vault_password_file|vault_identity_list)\s*[=:]\s*([^]*)$/i.exec(trimmed);
      if (!match_2) continue;
      match_2[2] = match_2[2]
        .split(
          `
`,
        )
        .map((line) => line.replace(/\s;.*$/, "").trim())
        .join(",");
      if (match_2[1].toLowerCase() === "vault_password_file") addSource(match_2[2]);
      else addIdentityList(match_2[2]);
    }
    break;
  }
  return sources;
}
//@ chunk-qchp9vrd.js:219644-219656 placement
/**
 * PATH 探测的超时（5000 毫秒）。
 */
var PATH_PROBE_TIMEOUT_MS = 5000;
//@ chunk-qchp9vrd.js:219656-221311 placement
/**
 * 检查 PATH 中的目录（超时视为不可达挂载）以排除凭据助手。
 */
async function probePathDirectories(promise, label = "a PATH entry") {
  try {
    return await withTimeout(promise, PATH_PROBE_TIMEOUT_MS, "PATH probe timed out");
  } catch (error) {
    if (error instanceof Error && error.message === "PATH probe timed out")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        label === "a PATH entry"
          ? `examining the PATH directories took longer than ${PATH_PROBE_TIMEOUT_MS / 1000}s (a PATH entry on an unreachable mount?), so the Bash sandbox's credential exclusions cannot be computed \u2014 a Bash-granting evaluation cannot run until PATH is trimmed`
          : label === "a CA-bundle pointer"
            ? `examining the CA-bundle files named in the environment (SSL_CERT_FILE, CURL_CA_BUNDLE, NODE_EXTRA_CA_CERTS \u2026) took longer than ${PATH_PROBE_TIMEOUT_MS / 1000}s (a pointer at an unreachable mount?), so the Bash sandbox's exclusions cannot be computed \u2014 a Bash-granting evaluation cannot run until that pointer is fixed or unset`
            : label === "a credential store"
              ? `examining a credential store or a credentials pointer file (~/.aws, ~/.kube, CLOUDSDK_CONFIG, GNUPGHOME, a kubeconfig \u2026) took longer than ${PATH_PROBE_TIMEOUT_MS / 1000}s (a store on an unreachable mount?), so the Bash sandbox's credential exclusions cannot be computed \u2014 a Bash-granting evaluation cannot run until that store is reachable or its pointer unset`
              : `resolving a directory this evaluation names (a plugin, suite or case directory, the home, a shared temp dir, a credential root) took longer than ${PATH_PROBE_TIMEOUT_MS / 1000}s (an unreachable mount?), so the sandbox settings cannot be computed`,
        label === "a PATH entry"
          ? "eval shell grant refused: PATH probe timed out"
          : label === "a CA-bundle pointer"
            ? "eval shell grant refused: CA-bundle probe timed out"
            : label === "a credential store"
              ? "eval shell grant refused: credential store probe timed out"
              : "eval refused: directory realpath timed out",
      );
    throw error;
  }
}
//@ chunk-qchp9vrd.js:221311-221896 placement
async function probeMacKeychain(pathDirs) {
  let helpers = ["/usr/bin/security"];
  for (let dir of uniq([...pathDirs, ...GIT_EXEC_PATH_DIRS])) {
    let entries;
    try {
      entries = await readdir(dir);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") continue;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `a PATH directory could not be examined for keychain credential helpers (${errnoCode ?? "unreadable"}), so the Bash sandbox cannot exclude them \u2014 a Bash-granting evaluation cannot run in this environment`,
        "eval shell grant refused: PATH directory unreadable",
      );
    }
    for (let name of entries)
      if (
        name.startsWith("docker-credential-") ||
        name.startsWith("git-credential-") ||
        name === "secret-tool" ||
        name === "kwallet-query"
      )
        helpers.push(path_2.join(dir, name));
  }
  return helpers;
}
//@ chunk-qchp9vrd.js:221896-222241 placement
/**
 * 常见的 git exec-path 目录（git-core、gcm-core、Homebrew、Xcode 等），用于凭据排除。
 */
var GIT_EXEC_PATH_DIRS = [
  "/usr/local/share/gcm-core",
  "/usr/lib/git-core",
  "/usr/libexec/git-core",
  "/usr/local/libexec/git-core",
  "/opt/homebrew/opt/git/libexec/git-core",
  "/usr/local/opt/git/libexec/git-core",
  "/opt/local/libexec/git-core",
  "/Library/Developer/CommandLineTools/usr/libexec/git-core",
  "/Applications/Xcode.app/Contents/Developer/usr/libexec/git-core",
];
//@ chunk-qchp9vrd.js:222241-222534 placement
async function parsePgServiceConf(files) {
  let paths = [];
  for (let filePath of files) {
    let text = await probeCredentialPath(filePath);
    if (text === null) continue;
    for (let line of text.split(/\r?\n/)) {
      let match = /^\s*(sslkey|passfile)\s*=\s*(.+?)\s*$/i.exec(line);
      if (!match) continue;
      if (path_2.isAbsolute(match[2])) paths.push(match[2]);
      else throw describeUnreadableCredentialsPointer(`a pg_service.conf ${match[1]} is a relative path`);
    }
  }
  return paths;
}
//@ chunk-qchp9vrd.js:222534-222945 placement
async function describeAwsCredentialProcess(filePath) {
  let text = await probeCredentialPath(filePath);
  if (text === null) return [];
  if (
    /^[ \t]*credential_process[ \t]*[=:]/im.test(text) ||
    /^[ \t]*credential_source[ \t]*[=:](?![ \t]*environment[ \t]*\r?$)/im.test(text)
  )
    throw describeUnreadableCredentialsPointer(
      "an AWS credential_process / credential_source cannot be excluded from the shell",
    );
  return [...text.matchAll(/^[ \t]*web_identity_token_file[ \t]*[=:][ \t]*(.+?)[ \t\r]*$/gim)]
    .map((match) => match[1])
    .filter((token) => !!token)
    .map(absoluteTokenPath);
}
//@ chunk-qchp9vrd.js:222945-223642 placement
async function parseAwsSourceCredentials(filePath) {
  let text = await probeCredentialPath(filePath);
  if (text === null) return [];
  let parsed;
  try {
    parsed = jsonParse(text);
  } catch {
    throw describeUnreadableCredentialsPointer("not valid JSON");
  }
  let files = [];
  let node = parsed;
  for (let j = 0; node !== null && node !== undefined; j++) {
    if (j >= MAX_AWS_SOURCE_DEPTH)
      throw describeUnreadableCredentialsPointer("its source_credentials chain is too deep");
    let parsedNode = awsCredentialSourceSchema().safeParse(node);
    if (!parsedNode.success)
      throw describeUnreadableCredentialsPointer("its credential_source is not a shape this knows");
    let credentialSource = parsedNode.data.credential_source;
    if (credentialSource?.certificate !== undefined && credentialSource.certificate !== null)
      throw describeUnreadableCredentialsPointer(
        "an X.509 certificate credential source cannot be excluded from the shell",
      );
    if (credentialSource?.executable !== undefined && credentialSource.executable !== null)
      throw describeUnreadableCredentialsPointer(
        "an executable credential source cannot be excluded from the shell",
      );
    if (typeof credentialSource?.file === "string") files.push(absoluteTokenPath(credentialSource.file));
    node = parsedNode.data.source_credentials;
  }
  return files;
}
//@ chunk-qchp9vrd.js:223642-224052 placement
async function parseAzureServicePrincipals(configDir) {
  let text = await probeCredentialPath(path_2.join(configDir, "service_principal_entries.json"));
  if (text === null) return [];
  let parsed;
  try {
    parsed = jsonParse(text);
  } catch {
    throw describeUnreadableCredentialsPointer("the Azure service principal store is not valid JSON");
  }
  let entries = azureServicePrincipalsSchema().safeParse(parsed);
  if (!entries.success)
    throw describeUnreadableCredentialsPointer("the Azure service principal store is not a shape this knows");
  return entries.data
    .flatMap((entry) => [entry.certificate, entry.certificateFile])
    .filter((value) => typeof value === "string" && value !== "")
    .map(absoluteTokenPath);
}
//@ chunk-qchp9vrd.js:224052-224370 placement
/**
 * Azure CLI 服务主体文件的 schema：client_id、tenant、client_secret、证书等字段。
 */
var azureServicePrincipalsSchema = DoctorLazy(() =>
  create_15(
    strictCreate({
      client_id: create_2().nullish(),
      tenant: create_2().nullish(),
      client_secret: create_2().nullish(),
      certificate: create_2().nullish(),
      use_cert_sn_issuer: create_12().optional(),
      servicePrincipalId: create_2().nullish(),
      servicePrincipalTenant: create_2().nullish(),
      accessToken: create_2().nullish(),
      certificateFile: create_2().nullish(),
      thumbprint: create_2().nullish(),
    }),
  ),
);
//@ chunk-qchp9vrd.js:224370-225062 placement
async function listGcloudConfigurations(configDir, activeConfig) {
  let configurationNames;
  try {
    configurationNames = (await readdir(path_2.join(configDir, "configurations"))).filter((entryName) =>
      entryName.startsWith("config_"),
    );
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") configurationNames = [];
    else
      throw describeUnreadableCredentialsPointer(
        `the gcloud configurations directory could not be read (${errnoCode ?? "unreadable"})`,
      );
  }
  let overrides = [];
  let tokenFiles = [];
  for (let propertiesPath of [
    ...(activeConfig && path_2.isAbsolute(activeConfig) ? [path_2.join(activeConfig, "properties")] : []),
    path_2.join(configDir, "properties"),
    ...configurationNames.map((configurationName) =>
      path_2.join(configDir, "configurations", configurationName),
    ),
  ]) {
    let propertiesText = await probeCredentialPath(propertiesPath);
    if (propertiesText === null) continue;
    for (let match of propertiesText.matchAll(
      /^[ \t]*(credential_file_override|access_token_file|authorization_token_file)[ \t]*[=:][ \t]*(.+?)[ \t\r]*$/gim,
    ))
      if (match[2])
        (match[1]?.toLowerCase() === "credential_file_override" ? overrides : tokenFiles).push(
          absoluteTokenPath(match[2]),
        );
  }
  return {
    overrides,
    tokenFiles,
  };
}
//@ chunk-qchp9vrd.js:225062-225110 placement
var NULL_DEVICE = getPlatform() === "windows" ? "\\\\.\\nul" : "/dev/null";
//@ chunk-qchp9vrd.js:225110-225234 placement
async function isNullDevice(stats) {
  if (!stats.isCharacterDevice()) return false;
  nullDeviceRdevPromise ??= stat(NULL_DEVICE).then(
    (nullStats) => nullStats.rdev,
    () => {
      return;
    },
  );
  return stats.rdev === (await nullDeviceRdevPromise);
}
//@ chunk-qchp9vrd.js:225234-225370 placement
var nullDeviceRdevPromise;
var DEFAULT_TRUSTSTORE_PASSWORD_RE = /^-D[\w.-]*trust-?store-?password=changeit$/i;
var JVM_OPTIONS_ENV_SET = new Set(JVM_OPTIONS_ENV_NAMES);
var MAVEN_ARGS_ENV_NAMES = new Set(["MAVEN_ARGS", "MAVEN_CONFIG"]);
var UNTERMINATED_MARKER = "\x00unterminated";
//@ chunk-qchp9vrd.js:225370-225984 placement
function parseMavenArgs(env) {
  let secretKeys = [];
  for (let [key, value] of Object.entries(env)) {
    let envValue = value === undefined ? undefined : String(value).trim();
    if (!envValue) continue;
    let isJvmOptions = JVM_OPTIONS_ENV_SET.has(normalizeEnvNameForMatch(key));
    if (!isJvmOptions && containsCredential(envValue)) {
      secretKeys.push(key);
      continue;
    }
    if (isJvmOptions) {
      let words = splitQuotedWords(envValue);
      let tokens =
        words === null
          ? undefined
          : normalizeDefineArgs(words.map(stripJavaLauncherPrefix)).flatMap((token) => {
              let match = /^-D[^=]+=\s*(-.*)$/s.exec(token);
              return match
                ? [
                    token,
                    ...normalizeDefineArgs(
                      (splitQuotedWords(match[1]) ?? [UNTERMINATED_MARKER]).map(stripJavaLauncherPrefix),
                    ),
                  ]
                : [token];
            });
      if (
        tokens === undefined ||
        tokensContainSecret(tokens.filter((token) => !DEFAULT_TRUSTSTORE_PASSWORD_RE.test(token))) ||
        tokens.some((token) => {
          if (token === UNTERMINATED_MARKER) return true;
          if (DEFAULT_TRUSTSTORE_PASSWORD_RE.test(token)) return false;
          let match = /^-D([^=]+)=(.*)$/s.exec(token);
          return match === null
            ? containsCredential(token)
            : (isCredentialPropertyName(match[1] ?? "") &&
                !isScalarPropertyValue(match[1] ?? "", match[2] ?? "")) ||
                containsCredential(match[2] ?? "");
        })
      )
        secretKeys.push(key);
      continue;
    }
    if (/proxy/i.test(key) && envValue.includes("@")) secretKeys.push(key);
  }
  return secretKeys;
}
//@ chunk-qchp9vrd.js:225984-226235 placement
var SYSTEM_GITCONFIG_PATHS = [
  "/etc/gitconfig",
  "/opt/homebrew/etc/gitconfig",
  "/usr/local/etc/gitconfig",
  "/opt/local/etc/gitconfig",
  "/Library/Developer/CommandLineTools/usr/share/git-core/gitconfig",
  "/Applications/Xcode.app/Contents/Developer/usr/share/git-core/gitconfig",
];
//@ chunk-qchp9vrd.js:226235-226332 placement
/**
 * 校验 token 文件路径必须是绝对路径。
 */
function absoluteTokenPath(path) {
  if (!path_2.isAbsolute(path))
    throw describeUnreadableCredentialsPointer("it names a token file by a relative path");
  return path;
}
//@ chunk-qchp9vrd.js:226332-226524 placement
var MAX_AWS_SOURCE_DEPTH = 8;
var awsCredentialSourceSchema = DoctorLazy(() =>
  create({
    credential_source: strictCreate({
      file: create_2().nullish(),
      format: create_12().optional(),
      executable: create_12().optional(),
      certificate: create_12().optional(),
    }).nullish(),
    source_credentials: create_12().optional(),
  }),
);
//@ chunk-qchp9vrd.js:226524-226805 placement
/**
 * 清理临时目录中过期的评测认证目录。
 */
async function cleanupStaleEvalAuthDirs() {
  let entries;
  try {
    entries = await readdir(os_2.tmpdir());
  } catch {
    return;
  }
  let cutoff = Date.now() - EVAL_AUTH_DIR_TTL_MS;
  await Promise.all(
    entries
      .filter((name) => name.startsWith(CLAUDE_EVAL_AUTH))
      .map(async (name) => {
        let joined = path_2.join(os_2.tmpdir(), name);
        try {
          let stats = await lstat(joined);
          if (stats.isDirectory() && stats.mtimeMs < cutoff)
            await rm_2(joined, {
              recursive: true,
              force: true,
            });
        } catch {}
      }),
  );
}
export {
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
  listSubdirectories,
  cleanupStaleEvalAuthDirs,
  upperCaseEnvKeys,
};
