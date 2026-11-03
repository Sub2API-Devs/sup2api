/**
 * @smithy/shared-ini-file-loader/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/shared-ini-file-loader@4.4.0..4.4.3
 * pieces: chunk-a1ttyqdw.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_getHomeDir } from "./getHomeDir.js";
import { require_getSSOTokenFilepath } from "./getSSOTokenFilepath.js";
import { require_getSSOTokenFromFile } from "./getSSOTokenFromFile.js";
import { require_types } from "../../types/dist-cjs/index.js";
import { require_readFile } from "./readFile.js";

//@ chunk-a1ttyqdw.js:1663-4692 cjs-fingerprint
var require_shared_ini_file_loader = x(function (cjsExports) {
  var getHomeDir = require_getHomeDir();
  var getSSOTokenFilepath = require_getSSOTokenFilepath();
  var getSSOTokenFromFile = require_getSSOTokenFromFile();
  var path = importMetaRequire("path");
  var types = require_types();
  var readFile = require_readFile();
  var ENV_PROFILE = "AWS_PROFILE";
  var DEFAULT_PROFILE = "default";
  var getProfileName = (init) => init.profile || process.env[ENV_PROFILE] || DEFAULT_PROFILE;
  var CONFIG_PREFIX_SEPARATOR = ".";
  var getConfigData = (data) =>
    Object.entries(data)
      .filter(([key]) => {
        let indexOfSeparator = key.indexOf(CONFIG_PREFIX_SEPARATOR);
        if (indexOfSeparator === -1) return false;
        return Object.values(types.IniSectionType).includes(key.substring(0, indexOfSeparator));
      })
      .reduce(
        (acc, [key, value]) => {
          let indexOfSeparator = key.indexOf(CONFIG_PREFIX_SEPARATOR);
          let updatedKey =
            key.substring(0, indexOfSeparator) === types.IniSectionType.PROFILE
              ? key.substring(indexOfSeparator + 1)
              : key;
          acc[updatedKey] = value;
          return acc;
        },
        {
          ...(data.default && {
            default: data.default,
          }),
        },
      );
  var ENV_CONFIG_PATH = "AWS_CONFIG_FILE";
  var getConfigFilepath = () =>
    process.env[ENV_CONFIG_PATH] || path.join(getHomeDir.getHomeDir(), ".aws", "config");
  var ENV_CREDENTIALS_PATH = "AWS_SHARED_CREDENTIALS_FILE";
  var getCredentialsFilepath = () =>
    process.env[ENV_CREDENTIALS_PATH] || path.join(getHomeDir.getHomeDir(), ".aws", "credentials");
  var prefixKeyRegex = /^([\w-]+)\s(["'])?([\w-@\+\.%:/]+)\2$/;
  var profileNameBlockList = ["__proto__", "profile __proto__"];
  var parseIni = (iniData) => {
    let map = {};
    let currentSection;
    let currentSubSection;
    for (let iniLine of iniData.split(/\r?\n/)) {
      let trimmedLine = iniLine.split(/(^|\s)[;#]/)[0].trim();
      if (trimmedLine[0] === "[" && trimmedLine[trimmedLine.length - 1] === "]") {
        currentSection = undefined;
        currentSubSection = undefined;
        let sectionName = trimmedLine.substring(1, trimmedLine.length - 1);
        let matches = prefixKeyRegex.exec(sectionName);
        if (matches) {
          let [, prefix, , name] = matches;
          if (Object.values(types.IniSectionType).includes(prefix))
            currentSection = [prefix, name].join(CONFIG_PREFIX_SEPARATOR);
        } else currentSection = sectionName;
        if (profileNameBlockList.includes(sectionName))
          throw Error(`Found invalid profile name "${sectionName}"`);
      } else if (currentSection) {
        let indexOfEqualsSign = trimmedLine.indexOf("=");
        if (![0, -1].includes(indexOfEqualsSign)) {
          let [name, value] = [
            trimmedLine.substring(0, indexOfEqualsSign).trim(),
            trimmedLine.substring(indexOfEqualsSign + 1).trim(),
          ];
          if (value === "") currentSubSection = name;
          else {
            if (currentSubSection && iniLine.trimStart() === iniLine) currentSubSection = undefined;
            map[currentSection] = map[currentSection] || {};
            let key = currentSubSection ? [currentSubSection, name].join(CONFIG_PREFIX_SEPARATOR) : name;
            map[currentSection][key] = value;
          }
        }
      }
    }
    return map;
  };
  var swallowError$1 = () => ({});
  var loadSharedConfigFiles = async (init = {}) => {
    let { filepath = getCredentialsFilepath(), configFilepath = getConfigFilepath() } = init;
    let homeDir = getHomeDir.getHomeDir();
    let relativeHomeDirPrefix = "~/";
    let resolvedFilepath = filepath;
    if (filepath.startsWith("~/")) resolvedFilepath = path.join(homeDir, filepath.slice(2));
    let resolvedConfigFilepath = configFilepath;
    if (configFilepath.startsWith("~/")) resolvedConfigFilepath = path.join(homeDir, configFilepath.slice(2));
    let parsedFiles = await Promise.all([
      readFile
        .readFile(resolvedConfigFilepath, {
          ignoreCache: init.ignoreCache,
        })
        .then(parseIni)
        .then(getConfigData)
        .catch(swallowError$1),
      readFile
        .readFile(resolvedFilepath, {
          ignoreCache: init.ignoreCache,
        })
        .then(parseIni)
        .catch(swallowError$1),
    ]);
    return {
      configFile: parsedFiles[0],
      credentialsFile: parsedFiles[1],
    };
  };
  var getSsoSessionData = (data) =>
    Object.entries(data)
      .filter(([key]) => key.startsWith(types.IniSectionType.SSO_SESSION + CONFIG_PREFIX_SEPARATOR))
      .reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key.substring(key.indexOf(CONFIG_PREFIX_SEPARATOR) + 1)]: value,
        }),
        {},
      );
  var swallowError = () => ({});
  var loadSsoSessionData = async (init = {}) =>
    readFile
      .readFile(init.configFilepath ?? getConfigFilepath())
      .then(parseIni)
      .then(getSsoSessionData)
      .catch(swallowError);
  var mergeConfigFiles = (...files) => {
    let merged = {};
    for (let file of files)
      for (let [key, values] of Object.entries(file))
        if (merged[key] !== undefined) Object.assign(merged[key], values);
        else merged[key] = values;
    return merged;
  };
  var parseKnownFiles = async (init) => {
    let parsedFiles = await loadSharedConfigFiles(init);
    return mergeConfigFiles(parsedFiles.configFile, parsedFiles.credentialsFile);
  };
  var externalDataInterceptor = {
    getFileRecord() {
      return readFile.fileIntercept;
    },
    interceptFile(path, contents) {
      readFile.fileIntercept[path] = Promise.resolve(contents);
    },
    getTokenRecord() {
      return getSSOTokenFromFile.tokenIntercept;
    },
    interceptToken(id, contents) {
      getSSOTokenFromFile.tokenIntercept[id] = contents;
    },
  };
  Object.defineProperty(cjsExports, "getSSOTokenFromFile", {
    enumerable: true,
    get: function () {
      return getSSOTokenFromFile.getSSOTokenFromFile;
    },
  });
  Object.defineProperty(cjsExports, "readFile", {
    enumerable: true,
    get: function () {
      return readFile.readFile;
    },
  });
  cjsExports.CONFIG_PREFIX_SEPARATOR = CONFIG_PREFIX_SEPARATOR;
  cjsExports.DEFAULT_PROFILE = DEFAULT_PROFILE;
  cjsExports.ENV_PROFILE = ENV_PROFILE;
  cjsExports.externalDataInterceptor = externalDataInterceptor;
  cjsExports.getProfileName = getProfileName;
  cjsExports.loadSharedConfigFiles = loadSharedConfigFiles;
  cjsExports.loadSsoSessionData = loadSsoSessionData;
  cjsExports.parseKnownFiles = parseKnownFiles;
  Object.keys(getHomeDir).forEach(function (k) {
    if (k !== "default" && !Object.prototype.hasOwnProperty.call(cjsExports, k))
      Object.defineProperty(cjsExports, k, {
        enumerable: true,
        get: function () {
          return getHomeDir[k];
        },
      });
  });
  Object.keys(getSSOTokenFilepath).forEach(function (k) {
    if (k !== "default" && !Object.prototype.hasOwnProperty.call(cjsExports, k))
      Object.defineProperty(cjsExports, k, {
        enumerable: true,
        get: function () {
          return getSSOTokenFilepath[k];
        },
      });
  });
});
export { require_shared_ini_file_loader };
