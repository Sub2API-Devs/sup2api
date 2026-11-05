/**
 * utils/git/gitConfigParser.ts
 *
 * 轻量 git config 文本解析（section/subsection/key 取值）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/git/gitConfigParser.ts
 * pieces: chunk-85eyj5gy.js (17), chunk-a04tk21p.js (8)
 * attribution: placement 24, fingerprint 1
 */
import { open } from "fs/promises";
import { join } from "path";
import { readFileSync } from "fs";
import { isUsableGitEntry, REPO_UNREADABLE_RESULT, REPO_NEGATIVE_RESULT } from "./gitRepoCache.js";
import { readPositionIsUnsafe } from "./gitFilesystem.js";
import { isPathAbsent } from "../errors.js";

//@ chunk-85eyj5gy.js:67281-67323 placement
/**
 * 是否含 NUL 字节。
 */
function hasNulByte(text) {
  return text.includes("\x00");
}
//@ chunk-85eyj5gy.js:67323-67404 placement
/**
 * 异步读取 git 配置中的某个值；文件不可读返回 null。
 */
async function readGitConfigValueAsync(cwd, section, subsection, key) {
  let gitConfigFile = await readGitConfigFile(cwd);
  return gitConfigFile.ok ? firstGitConfigValue(gitConfigFile.text, section, subsection, key) : null;
}
//@ chunk-85eyj5gy.js:67404-67885 placement
/**
 * 读取 .git/config（大小上限、NUL 检查）。
 */
async function readGitConfigFile(cwd) {
  try {
    let handle = await open(join(cwd, "config"), "r");
    try {
      let buffer = Buffer.allocUnsafe(1e6);
      let bytesReadTotal = 0;
      while (bytesReadTotal < 1e6) {
        let { bytesRead } = await handle.read(buffer, bytesReadTotal, 1e6 - bytesReadTotal, bytesReadTotal);
        if (bytesRead === 0) break;
        bytesReadTotal += bytesRead;
      }
      let isTruncated = false;
      if (bytesReadTotal === 1e6) {
        let probe = Buffer.allocUnsafe(1);
        let { bytesRead } = await handle.read(probe, 0, 1, bytesReadTotal);
        isTruncated = bytesRead > 0;
      }
      let str = buffer.subarray(0, bytesReadTotal).toString("utf-8");
      if (isTruncated) {
        let index = str.lastIndexOf(`
`);
        str = index === -1 ? "" : str.slice(0, index);
      }
      return hasNulByte(str)
        ? {
            ok: false,
            cause: "nul_byte",
          }
        : {
            ok: true,
            text: str,
          };
    } finally {
      await handle.close();
    }
  } catch {
    return {
      ok: false,
      cause: "read_failed",
    };
  }
}
//@ chunk-85eyj5gy.js:67885-67953 placement
/**
 * 返回 git 配置中指定节/键的第一个值。
 */
function firstGitConfigValue(text, section, subsection, key) {
  for (let value of iterGitConfigValues(text, section, subsection, key)) return value;
  return null;
}
//@ chunk-85eyj5gy.js:67953-67998 placement
/**
 * 返回 git 配置中指定节/键的全部值。
 */
function allGitConfigValues(config, section, subsection, key) {
  return [...iterGitConfigValues(config, section, subsection, key)];
}
//@ chunk-85eyj5gy.js:67998-68050 placement (2.1.88 match: _temp, 1)
/**
 * 同上，但把无值项的默认值按 "true" 处理。
 */
function allGitConfigValuesTrue(config, section, subsection, key) {
  return [...iterGitConfigValues(config, section, subsection, key, "true")];
}
//@ chunk-85eyj5gy.js:68050-68099 placement
var BARE_VALUE_LINE_RE = /^([A-Za-z][A-Za-z0-9-]*)\s*(?:[#;].*)?$/;
//@ chunk-85eyj5gy.js:68099-68433 placement
/**
 * 遍历 git 配置中指定节/键的值。
 */
function* iterGitConfigValues(config, section, subsection, key, bareValue) {
  let lines = config.split(`
`);
  let sectionLower = section.toLowerCase();
  let keyLower = key.toLowerCase();
  let inSection = false;
  for (let line of lines) {
    let trimmed = line.trim();
    if (trimmed.length === 0 || trimmed[0] === "#" || trimmed[0] === ";") continue;
    if (trimmed[0] === "[") {
      inSection = isConfigSection(trimmed, sectionLower, subsection);
      continue;
    }
    if (!inSection) continue;
    let parsed = parseKeyValue(trimmed);
    if (parsed && parsed.key.toLowerCase() === keyLower) yield parsed.value;
    else if (bareValue !== undefined && BARE_VALUE_LINE_RE.exec(trimmed)?.[1]?.toLowerCase() === keyLower)
      yield bareValue;
  }
}
//@ chunk-85eyj5gy.js:68433-68898 placement
/**
 * 解析 git 配置的节与条目。
 */
function parseGitConfigSections(contents) {
  let includes = [];
  let files = [];
  let sectionKind = null;
  for (let line of contents.split(`
`)) {
    let line_2 = line.trim();
    if (line_2.length === 0 || line_2[0] === "#" || line_2[0] === ";") continue;
    if (line_2[0] === "[") {
      sectionKind =
        isConfigSection(line_2, "include", null) || INCLUDEIF_SECTION_RE.test(line_2)
          ? "include"
          : isConfigSection(line_2, "core", null)
            ? "core"
            : null;
      continue;
    }
    let parsed = sectionKind === null ? null : parseKeyValue(line_2);
    if (!parsed || parsed.value.length === 0) continue;
    let lower = parsed.key.toLowerCase();
    if (sectionKind === "include" && lower === "path") includes.push(parsed.value);
    else if (sectionKind === "core" && (lower === "excludesfile" || lower === "attributesfile"))
      files.push(parsed.value);
  }
  return {
    includes,
    files,
  };
}
//@ chunk-85eyj5gy.js:68898-68946 placement
var INCLUDEIF_SECTION_RE = /^\[includeif[ \t]*"(?:[^"\\]|\\.)*"\]/i;
//@ chunk-85eyj5gy.js:68946-69215 placement
function parseKeyValue(line) {
  let i = 0;
  while (i < line.length && isConfigNameChar(line[i])) i++;
  if (i === 0) return null;
  let key = line.slice(0, i);
  while (i < line.length && (line[i] === " " || line[i] === "\t")) i++;
  if (i >= line.length || line[i] !== "=") return null;
  i++;
  while (i < line.length && (line[i] === " " || line[i] === "\t")) i++;
  let value = parseGitConfigValue(line, i);
  return {
    key,
    value,
  };
}
//@ chunk-85eyj5gy.js:69215-69607 placement
/**
 * 解析 git 配置值（引号、转义、注释）。
 */
function parseGitConfigValue(line, start) {
  let result = "";
  let inQuote = false;
  let i = start;
  while (i < line.length) {
    let char = line[i];
    if (!inQuote && (char === "#" || char === ";")) break;
    if (char === '"') {
      inQuote = !inQuote;
      i++;
      continue;
    }
    if (char === "\\" && i + 1 < line.length) {
      let next = line[i + 1];
      if (inQuote) {
        switch (next) {
          case "n":
            result += `
`;
            break;
          case "t":
            result += "\t";
            break;
          case "b":
            result += "\b";
            break;
          case '"':
            result += '"';
            break;
          case "\\":
            result += "\\";
            break;
          default:
            result += next;
            break;
        }
        i += 2;
        continue;
      }
      if (next === "\\") {
        result += "\\";
        i += 2;
        continue;
      }
    }
    result += char;
    i++;
  }
  if (!inQuote) result = trimTrailingWhitespace(result);
  return result;
}
//@ chunk-85eyj5gy.js:69607-69702 placement
function trimTrailingWhitespace(s) {
  let end = s.length;
  while (end > 0 && (s[end - 1] === " " || s[end - 1] === "\t")) end--;
  return s.slice(0, end);
}
//@ chunk-85eyj5gy.js:69702-69787 placement
function isConfigSection(line, sectionLower, subsection) {
  let gitConfigSectionHeader = parseGitConfigSectionHeader(line);
  return (
    gitConfigSectionHeader !== null &&
    gitConfigSectionHeader.sectionLower === sectionLower &&
    gitConfigSectionHeader.subsection === subsection
  );
}
//@ chunk-85eyj5gy.js:69787-70341 placement
/**
 * 解析 git 配置节头。
 */
function parseGitConfigSectionHeader(line) {
  let index = 1;
  while (
    index < line.length &&
    line[index] !== "]" &&
    line[index] !== " " &&
    line[index] !== "\t" &&
    line[index] !== '"'
  )
    index++;
  let sectionLower = line.slice(1, index).toLowerCase();
  if (index < line.length && line[index] === "]")
    return {
      sectionLower,
      subsection: null,
    };
  while (index < line.length && (line[index] === " " || line[index] === "\t")) index++;
  if (index >= line.length || line[index] !== '"') return null;
  index++;
  let subsection = "";
  while (index < line.length && line[index] !== '"') {
    if (line[index] === "\\" && index + 1 < line.length) {
      let char = line[index + 1];
      if (char === "\\" || char === '"') {
        subsection += char;
        index += 2;
        continue;
      }
      subsection += char;
      index += 2;
      continue;
    }
    subsection += line[index];
    index++;
  }
  if (index >= line.length || line[index] !== '"') return null;
  index++;
  if (index >= line.length || line[index] !== "]") return null;
  return {
    sectionLower,
    subsection,
  };
}
//@ chunk-85eyj5gy.js:70341-70419 placement
function isConfigNameChar(char) {
  return (
    (char >= "a" && char <= "z") ||
    (char >= "A" && char <= "Z") ||
    (char >= "0" && char <= "9") ||
    char === "-"
  );
}
//@ chunk-85eyj5gy.js:80934-81097 fingerprint (2.1.88 match: parseGitConfigValue, 0.794)
/**
 * 轻量解析 git config 文本，按 section/subsection/key 取值（处理引号与转义）。
 */
function parseGitConfigValue_2(cwd) {
  try {
    let gitDirPath = isUsableGitEntry(join(cwd, ".git"), cwd);
    let configPath = join(gitDirPath ? join(cwd, ".git") : cwd, "config");
    if (readPositionIsUnsafe(configPath, cwd)) return REPO_UNREADABLE_RESULT;
    let file = readFileSync(configPath, "utf-8");
    return hasNulByte(file) ? REPO_UNREADABLE_RESULT : file;
  } catch (error) {
    return isPathAbsent(error) ? REPO_NEGATIVE_RESULT : REPO_UNREADABLE_RESULT;
  }
}
//@ chunk-a04tk21p.js:191-358 placement
function gitConfigEntries(text, { maxLines = 2000 } = {}) {
  let urls = [];
  parseGitConfig(
    text,
    {
      entry(section, key, value) {
        if (
          value !== undefined &&
          value !== "" &&
          section !== null &&
          isRemoteSection(section) &&
          (key === "url" || key === "pushurl")
        )
          urls.push(value);
      },
    },
    {
      maxLines,
    },
  );
  return urls;
}
//@ chunk-a04tk21p.js:358-498 placement
function isRemoteSection({ name, quoted }) {
  if (quoted) return name === "remote" || name.startsWith("remote.");
  let index = name.indexOf(".");
  return index !== -1 && name.slice(0, index) === "remote";
}
//@ chunk-a04tk21p.js:498-1220 placement
/**
 * 逐行解析 git config 文本（节、子节、键值、续行、引号转义），以回调输出条目。
 */
function parseGitConfig(text, handlers, { maxLines = 2000, keepsBlanksAsWritten = false } = {}) {
  let lines = (text.codePointAt(0) === 65279 ? text.slice(1) : text).split(/\r\n|\n/).slice(0, maxLines);
  let currentSection = null;
  let reportMalformed = () => {
    currentSection = null;
    handlers.malformed?.();
  };
  let lineIndex = 0;
  while (lineIndex < lines.length) {
    let text = lines[lineIndex] ?? "";
    lineIndex++;
    let openIndex = matchesSectionHeader(text, 0);
    let headerFailed = false;
    while (text[openIndex] === "[") {
      let sectionName = readSectionName(text, openIndex);
      if (sectionName === null) {
        reportMalformed();
        headerFailed = true;
        break;
      }
      let { end, ...section } = sectionName;
      currentSection = section;
      handlers.header?.(currentSection);
      openIndex = matchesSectionHeader(text, end);
    }
    if (headerFailed) continue;
    let firstChar = text[openIndex];
    if (firstChar === undefined || firstChar === "#" || firstChar === ";") continue;
    if (!isAsciiLetter(firstChar)) {
      reportMalformed();
      continue;
    }
    let keyStart = openIndex;
    while (openIndex < text.length && isConfigNameCharQuick(text[openIndex] ?? "")) openIndex++;
    let lower = text.slice(keyStart, openIndex).toLowerCase();
    while (openIndex < text.length && (text[openIndex] === " " || text[openIndex] === "\t")) openIndex++;
    if (openIndex >= text.length) {
      handlers.entry?.(currentSection, lower, undefined);
      continue;
    }
    if (text[openIndex] !== "=") {
      reportMalformed();
      continue;
    }
    let configValue = readConfigValue(text, openIndex + 1, lines, lineIndex, keepsBlanksAsWritten);
    lineIndex = configValue.nextLineIndex;
    if (configValue.value === null) {
      reportMalformed();
      continue;
    }
    handlers.entry?.(currentSection, lower, configValue.value);
  }
}
//@ chunk-a04tk21p.js:1220-1729 placement
function readSectionName(text, openIndex) {
  let index = openIndex + 1;
  let nameStart = index;
  while (index < text.length) {
    let char = text[index];
    if (char === undefined || !(isConfigNameCharQuick(char) || char === ".")) break;
    index++;
  }
  let sliced = text.slice(nameStart, index);
  if (text[index] === "]") {
    if (sliced === "") return null;
    return {
      name: sliced.toLowerCase(),
      quoted: false,
      end: index + 1,
    };
  }
  if (text[index] !== " " && text[index] !== "\t" && text[index] !== "\r") return null;
  index = matchesSectionHeader(text, index);
  if (text[index] !== '"') return null;
  index++;
  let subsection = "";
  while (true) {
    if (index >= text.length) return null;
    let char = text[index];
    if (char === "\\") {
      subsection += text[index + 1] ?? "";
      index += 2;
      continue;
    }
    index++;
    if (char === '"') break;
    subsection += char ?? "";
  }
  if (text[index] !== "]") return null;
  return {
    name: sliced.toLowerCase(),
    quoted: true,
    subsection,
    end: index + 1,
  };
}
//@ chunk-a04tk21p.js:1729-2390 placement
function readConfigValue(line, start, lines, nextLineIndex, keepsBlanksAsWritten) {
  let currentLine = line;
  let lineIndex = nextLineIndex;
  let value = "";
  let pendingSpace = "";
  let inQuote = false;
  let position = start;
  while (true) {
    if (position >= currentLine.length) {
      if (inQuote)
        return {
          value: null,
          nextLineIndex: lineIndex,
        };
      break;
    }
    let char = currentLine[position];
    if (!inQuote && (char === " " || char === "\t" || char === "\r")) {
      if (value !== "") pendingSpace += keepsBlanksAsWritten ? char : " ";
      position++;
      continue;
    }
    if (!inQuote && (char === ";" || char === "#")) break;
    value += pendingSpace;
    pendingSpace = "";
    if (char === "\\") {
      if (position + 1 >= currentLine.length) {
        if (lineIndex >= lines.length)
          return {
            value: null,
            nextLineIndex: lineIndex,
          };
        currentLine = lines[lineIndex] ?? "";
        lineIndex++;
        position = 0;
        continue;
      }
      let escaped;
      switch (currentLine[position + 1]) {
        case "\\":
          escaped = "\\";
          break;
        case '"':
          escaped = '"';
          break;
        case "n":
          escaped = `
`;
          break;
        case "t":
          escaped = "\t";
          break;
        case "b":
          escaped = "\b";
          break;
        default:
          return {
            value: null,
            nextLineIndex: lineIndex,
          };
      }
      value += escaped;
      position += 2;
      continue;
    }
    if (char === '"') {
      inQuote = !inQuote;
      position++;
      continue;
    }
    value += char;
    position++;
  }
  let index = value.indexOf("\x00");
  return {
    value: index === -1 ? value : value.slice(0, index),
    nextLineIndex: lineIndex,
  };
}
//@ chunk-a04tk21p.js:2390-2476 placement
function matchesSectionHeader(text, index) {
  while (index < text.length && (text[index] === " " || text[index] === "\t" || text[index] === "\r"))
    index++;
  return index;
}
//@ chunk-a04tk21p.js:2476-2528 placement
function isAsciiLetter(char) {
  return (char >= "a" && char <= "z") || (char >= "A" && char <= "Z");
}
//@ chunk-a04tk21p.js:2528-2579 placement
function isConfigNameCharQuick(char) {
  return isAsciiLetter(char) || (char >= "0" && char <= "9") || char === "-";
}
export {
  hasNulByte,
  parseGitConfigSections,
  readGitConfigValueAsync,
  parseGitConfigValue_2,
  firstGitConfigValue,
  parseGitConfig,
  allGitConfigValues,
  allGitConfigValuesTrue,
  gitConfigEntries,
};
