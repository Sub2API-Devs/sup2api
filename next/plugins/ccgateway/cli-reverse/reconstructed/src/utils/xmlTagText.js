/**
 * utils/xmlTagText.ts
 *
 * 2.1.316 新增：XML 标签文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
 */
import { truncateToLength } from "./stringUtils.js";
import { MAX_DESCRIPTION_LENGTH, AGENT_SKILL_REF_SCHEMA } from "../types/ids.js";
import {
  FORKED_SKILL_LAUNCH,
  LOCAL_COMMAND_STDOUT,
  LOCAL_COMMAND_STDERR,
  COMMAND_NAME,
  COMMAND_MESSAGE,
  COMMAND_ARGS,
} from "../constants/xml.js";
import { escapeXml_2 as escapeXml, unescapeHtmlEntities } from "./confusables.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:128547-128660 placement
/**
 * 生成 forked skill launch 标签（描述截断后 JSON 序列化并做 XML 转义）。
 */
function forkedSkillLaunchTag(launch) {
  let cappedLaunch = {
    ...launch,
    description: truncateToLength(launch.description, MAX_DESCRIPTION_LENGTH),
  };
  return `<${FORKED_SKILL_LAUNCH}>${escapeXml(JSON.stringify(cappedLaunch))}</${FORKED_SKILL_LAUNCH}>`;
}
//@ chunk-e6aww6q8.js:128660-128759 placement
var REPLACEMENT_CHAR; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp;
var QUOTED_TAG_NAMES;
deferInit("chunk-e6aww6q8.js:128660", () => {
  REPLACEMENT_CHAR = "\uFFFD";
  regExp = new RegExp(
    `^[\\s${REPLACEMENT_CHAR}]*<${FORKED_SKILL_LAUNCH}>([^<]*)</${FORKED_SKILL_LAUNCH}>\\s*$`,
  );
  QUOTED_TAG_NAMES = [
    LOCAL_COMMAND_STDOUT,
    LOCAL_COMMAND_STDERR,
    COMMAND_NAME,
    COMMAND_MESSAGE,
    COMMAND_ARGS,
  ];
});
//@ chunk-e6aww6q8.js:128759-129010 placement
function stripQuotedTagBlocks(text) {
  let out = "";
  let offset = 0;
  for (;;) {
    let start = -1;
    let end = -1;
    for (let tagName of QUOTED_TAG_NAMES) {
      let index = text.indexOf(`<${tagName}>`, offset);
      let index_2 = text.lastIndexOf(`</${tagName}>`);
      if (index !== -1 && index_2 >= index + `<${tagName}>`.length && (start === -1 || index < start)) {
        start = index;
        end = index_2 + `</${tagName}>`.length;
      }
    }
    if (start === -1) return out + text.slice(offset);
    out += text.slice(offset, start) + REPLACEMENT_CHAR;
    offset = end;
  }
}
//@ chunk-e6aww6q8.js:129010-129049 placement
var regExp_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:129010", () => {
  regExp_2 = new RegExp(`<(/?)${FORKED_SKILL_LAUNCH}>`, "g");
});
//@ chunk-e6aww6q8.js:129049-129111 placement
/**
 * 把 forked skill launch 标签转义。
 */
function escapeForkedSkillTag(text) {
  return text.replace(regExp_2, (match, prefix) => `&lt;${prefix}${FORKED_SKILL_LAUNCH}>`);
}
//@ chunk-e6aww6q8.js:129111-129314 placement
/**
 * 从文本中解析 forked skill launch 标签内容（反转义后 JSON 解析并校验）。
 */
function parseForkedSkillLaunches(text) {
  if (!text.includes(`<${FORKED_SKILL_LAUNCH}>`)) return [];
  let json = stripQuotedTagBlocks(text).match(regExp)?.[1];
  if (json === undefined) return [];
  let parsed;
  try {
    parsed = JSON.parse(unescapeHtmlEntities(json));
  } catch {
    return [];
  }
  let validation = AGENT_SKILL_REF_SCHEMA().safeParse(parsed);
  return validation.success ? [validation.data] : [];
}
export { escapeForkedSkillTag, parseForkedSkillLaunches, forkedSkillLaunchTag };
