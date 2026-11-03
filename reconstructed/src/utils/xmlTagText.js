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

//@ chunk-e6aww6q8.js:128547-128660 placement
/**
 * 生成 forked skill launch 标签（描述截断后 JSON 序列化并做 XML 转义）。
 */
function forkedSkillLaunchTag(e) {
  let n = {
    ...e,
    description: truncateToLength(e.description, MAX_DESCRIPTION_LENGTH),
  };
  return `<${FORKED_SKILL_LAUNCH}>${escapeXml(JSON.stringify(n))}</${FORKED_SKILL_LAUNCH}>`;
}
//@ chunk-e6aww6q8.js:128660-128759 placement
var REPLACEMENT_CHAR = "\uFFFD";
var regExp = new RegExp(
  `^[\\s${REPLACEMENT_CHAR}]*<${FORKED_SKILL_LAUNCH}>([^<]*)</${FORKED_SKILL_LAUNCH}>\\s*$`,
);
var QUOTED_TAG_NAMES = [
  LOCAL_COMMAND_STDOUT,
  LOCAL_COMMAND_STDERR,
  COMMAND_NAME,
  COMMAND_MESSAGE,
  COMMAND_ARGS,
];
//@ chunk-e6aww6q8.js:128759-129010 placement
function stripQuotedTagBlocks(e) {
  let n = "";
  let r = 0;
  for (;;) {
    let s = -1;
    let h = -1;
    for (let y of QUOTED_TAG_NAMES) {
      let index = e.indexOf(`<${y}>`, r);
      let index_2 = e.lastIndexOf(`</${y}>`);
      if (index !== -1 && index_2 >= index + `<${y}>`.length && (s === -1 || index < s)) {
        s = index;
        h = index_2 + `</${y}>`.length;
      }
    }
    if (s === -1) return n + e.slice(r);
    n += e.slice(r, s) + REPLACEMENT_CHAR;
    r = h;
  }
}
//@ chunk-e6aww6q8.js:129010-129049 placement
var regExp_2 = new RegExp(`<(/?)${FORKED_SKILL_LAUNCH}>`, "g");
//@ chunk-e6aww6q8.js:129049-129111 placement
/**
 * 把 forked skill launch 标签转义。
 */
function escapeForkedSkillTag(e) {
  return e.replace(regExp_2, (n, r) => `&lt;${r}${FORKED_SKILL_LAUNCH}>`);
}
//@ chunk-e6aww6q8.js:129111-129314 placement
/**
 * 从文本中解析 forked skill launch 标签内容（反转义后 JSON 解析并校验）。
 */
function parseForkedSkillLaunches(content) {
  if (!content.includes(`<${FORKED_SKILL_LAUNCH}>`)) return [];
  let r = stripQuotedTagBlocks(content).match(regExp)?.[1];
  if (r === undefined) return [];
  let s;
  try {
    s = JSON.parse(unescapeHtmlEntities(r));
  } catch {
    return [];
  }
  let h = AGENT_SKILL_REF_SCHEMA().safeParse(s);
  return h.success ? [h.data] : [];
}
export { escapeForkedSkillTag, parseForkedSkillLaunches, forkedSkillLaunchTag };
