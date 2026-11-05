/**
 * @anthropic-ai/sdk/_vendor/partial-json-parser/parser.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
//@ chunk-vn3g7zt8.js:92340-94489 esm-fingerprint
var tokenize = (input) => {
  let current = 0;
  let tokens = [];
  while (current < input.length) {
    let char = input[current];
    if (char === "\\") {
      current++;
      continue;
    }
    if (char === "{") {
      tokens.push({
        type: "brace",
        value: "{",
      });
      current++;
      continue;
    }
    if (char === "}") {
      tokens.push({
        type: "brace",
        value: "}",
      });
      current++;
      continue;
    }
    if (char === "[") {
      tokens.push({
        type: "paren",
        value: "[",
      });
      current++;
      continue;
    }
    if (char === "]") {
      tokens.push({
        type: "paren",
        value: "]",
      });
      current++;
      continue;
    }
    if (char === ":") {
      tokens.push({
        type: "separator",
        value: ":",
      });
      current++;
      continue;
    }
    if (char === ",") {
      tokens.push({
        type: "delimiter",
        value: ",",
      });
      current++;
      continue;
    }
    if (char === '"') {
      let value = "";
      let danglingQuote = false;
      char = input[++current];
      while (char !== '"') {
        if (current === input.length) {
          danglingQuote = true;
          break;
        }
        if (char === "\\") {
          current++;
          if (current === input.length) {
            danglingQuote = true;
            break;
          }
          value += char + input[current];
          char = input[++current];
        } else {
          value += char;
          char = input[++current];
        }
      }
      char = input[++current];
      if (!danglingQuote)
        tokens.push({
          type: "string",
          value,
        });
      continue;
    }
    if (char && /\s/.test(char)) {
      current++;
      continue;
    }
    let NUMBERS = /[0-9]/;
    if ((char && NUMBERS.test(char)) || char === "-" || char === ".") {
      let value = "";
      if (char === "-") {
        value += char;
        char = input[++current];
      }
      while (
        char &&
        (NUMBERS.test(char) ||
          char === "." ||
          char === "e" ||
          char === "E" ||
          ((char === "-" || char === "+") &&
            (value[value.length - 1] === "e" || value[value.length - 1] === "E")))
      ) {
        value += char;
        char = input[++current];
      }
      tokens.push({
        type: "number",
        value,
      });
      continue;
    }
    let LETTERS = /[a-z]/i;
    if (char && LETTERS.test(char)) {
      let value = "";
      while (char && LETTERS.test(char)) {
        if (current === input.length) break;
        value += char;
        char = input[++current];
      }
      if (value == "true" || value == "false" || value === "null")
        tokens.push({
          type: "name",
          value,
        });
      else {
        current++;
        continue;
      }
      continue;
    }
    current++;
  }
  return tokens;
};
var strip = (tokens) => {
  if (tokens.length === 0) return tokens;
  let lastToken = tokens[tokens.length - 1];
  switch (lastToken.type) {
    case "separator":
      tokens = tokens.slice(0, tokens.length - 1);
      return strip(tokens);
      break;
    case "number":
      let lastCharacterOfLastToken = lastToken.value[lastToken.value.length - 1];
      if (
        lastCharacterOfLastToken === "." ||
        lastCharacterOfLastToken === "-" ||
        lastCharacterOfLastToken === "+" ||
        lastCharacterOfLastToken === "e" ||
        lastCharacterOfLastToken === "E"
      ) {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      }
    case "string":
      let tokenBeforeTheLastToken = tokens[tokens.length - 2];
      if (tokenBeforeTheLastToken?.type === "delimiter") {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      } else if (tokenBeforeTheLastToken?.type === "brace" && tokenBeforeTheLastToken.value === "{") {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      }
      break;
    case "delimiter":
      tokens = tokens.slice(0, tokens.length - 1);
      return strip(tokens);
      break;
  }
  return tokens;
};
var unstrip = (tokens) => {
  let tail = [];
  tokens.map((token) => {
    if (token.type === "brace")
      if (token.value === "{") tail.push("}");
      else tail.splice(tail.lastIndexOf("}"), 1);
    if (token.type === "paren")
      if (token.value === "[") tail.push("]");
      else tail.splice(tail.lastIndexOf("]"), 1);
  });
  if (tail.length > 0)
    tail.reverse().map((item) => {
      if (item === "}")
        tokens.push({
          type: "brace",
          value: "}",
        });
      else if (item === "]")
        tokens.push({
          type: "paren",
          value: "]",
        });
    });
  return tokens;
};
var generate = (tokens) => {
  let output = "";
  tokens.map((token) => {
    switch (token.type) {
      case "string":
        output += '"' + token.value + '"';
        break;
      default:
        output += token.value;
        break;
    }
  });
  return output;
};
var partialParse = (input) => JSON.parse(generate(unstrip(strip(tokenize(input)))));
export { partialParse };
