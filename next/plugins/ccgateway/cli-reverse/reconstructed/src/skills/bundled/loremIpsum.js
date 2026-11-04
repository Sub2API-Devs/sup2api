/**
 * skills/bundled/loremIpsum.ts
 *
 * lorem-ipsum 测试 skill：按目标 token 数生成填充文本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/loremIpsum.ts
 * pieces: chunk-hantmvxa.js (2), chunk-p583jsvp.js (1)
 * attribution: fingerprint 1, callgraph-fingerprint 2
 */
import { registerBundledSkill } from "../bundledSkills.js";
import { isArtifactTypeAliasReady, buildArtifactTypeAliasPrompt } from "./artifactTypeAlias.js";

//@ chunk-p583jsvp.js:4803-5032 callgraph-fingerprint = registerLoremIpsumSkill (0.389)
/**
 * 通用注册器：按传入定义注册一个只能用户调用的内置 skill（例如 lorem-ipsum 测试 skill），isEnabled 由调用方给出。
 */
function registerLoremIpsumSkill(skillDefinition, policyGate) {
  registerBundledSkill({
    name: skillDefinition.name,
    description: skillDefinition.description,
    argumentHint: skillDefinition.argumentHint,
    policyGate,
    isEnabled: () => isArtifactTypeAliasReady(skillDefinition),
    userInvocable: true,
    disableModelInvocation: true,
    async getPromptForCommand(args) {
      return [
        {
          type: "text",
          text: buildArtifactTypeAliasPrompt(skillDefinition, args),
        },
      ];
    },
  });
}
//@ chunk-hantmvxa.js:181559-182847 fingerprint = ONE_TOKEN_WORDS (1)
/**
 * lorem-ipsum skill 用的「一个 token 的英文单词」表，用于生成指定 token 数的填充文本。
 */
var ONE_TOKEN_WORDS = [
  "the",
  "a",
  "an",
  "I",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "me",
  "him",
  "her",
  "us",
  "them",
  "my",
  "your",
  "his",
  "its",
  "our",
  "this",
  "that",
  "what",
  "who",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "can",
  "could",
  "may",
  "might",
  "must",
  "shall",
  "should",
  "make",
  "made",
  "get",
  "got",
  "go",
  "went",
  "come",
  "came",
  "see",
  "saw",
  "know",
  "take",
  "think",
  "look",
  "want",
  "use",
  "find",
  "give",
  "tell",
  "work",
  "call",
  "try",
  "ask",
  "need",
  "feel",
  "seem",
  "leave",
  "put",
  "time",
  "year",
  "day",
  "way",
  "man",
  "thing",
  "life",
  "hand",
  "part",
  "place",
  "case",
  "point",
  "fact",
  "good",
  "new",
  "first",
  "last",
  "long",
  "great",
  "little",
  "own",
  "other",
  "old",
  "right",
  "big",
  "high",
  "small",
  "large",
  "next",
  "early",
  "young",
  "few",
  "public",
  "bad",
  "same",
  "able",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "from",
  "by",
  "about",
  "like",
  "through",
  "over",
  "before",
  "between",
  "under",
  "since",
  "without",
  "and",
  "or",
  "but",
  "if",
  "than",
  "because",
  "as",
  "until",
  "while",
  "so",
  "though",
  "both",
  "each",
  "when",
  "where",
  "why",
  "how",
  "not",
  "now",
  "just",
  "more",
  "also",
  "here",
  "there",
  "then",
  "only",
  "very",
  "well",
  "back",
  "still",
  "even",
  "much",
  "too",
  "such",
  "never",
  "again",
  "most",
  "once",
  "off",
  "away",
  "down",
  "out",
  "up",
  "test",
  "code",
  "data",
  "file",
  "line",
  "text",
  "word",
  "number",
  "system",
  "program",
  "set",
  "run",
  "value",
  "name",
  "type",
  "state",
  "end",
  "start",
];
//@ chunk-hantmvxa.js:182847-183105 callgraph-fingerprint = generateLoremIpsum (1)
function generateLoremIpsum(targetTokens) {
  let tokens = 0;
  let result = "";
  while (tokens < targetTokens) {
    let sentenceLength = 10 + Math.floor(Math.random() * 11);
    let wordsInSentence = 0;
    for (let i = 0; i < sentenceLength && tokens < targetTokens; i++) {
      let word = ONE_TOKEN_WORDS[Math.floor(Math.random() * ONE_TOKEN_WORDS.length)];
      result += word;
      tokens++;
      wordsInSentence++;
      if (i === sentenceLength - 1 || tokens >= targetTokens) result += ". ";
      else result += " ";
    }
    if (wordsInSentence > 0 && Math.random() < 0.2 && tokens < targetTokens)
      result += `

`;
  }
  return result.trim();
}
export { registerLoremIpsumSkill };
