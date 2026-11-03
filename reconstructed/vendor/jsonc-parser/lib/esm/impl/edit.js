/**
 * jsonc-parser/lib/esm/impl/edit.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonc-parser@3.2.1..3.3.1
 * pieces: chunk-kndsyy4v.js (3)
 * attribution: esm-fingerprint 3
 */
import { parseTree, findNodeAtLocation } from "./parser.js";
import { isEOL, format } from "./format.js";

//@ chunk-kndsyy4v.js:12432-14948 esm-fingerprint
function ee(text, s, value, options) {
  let path = s.slice();
  let root = parseTree(text, []);
  let parent = undefined;
  let lastSegment = undefined;
  while (path.length > 0) {
    lastSegment = path.pop();
    parent = findNodeAtLocation(root, path);
    if (parent === undefined && value !== undefined) {
      if (typeof lastSegment === "string")
        value = {
          [lastSegment]: value,
        };
      else value = [value];
    } else break;
  }
  if (!parent) {
    if (value === undefined) throw Error("Can not delete in empty document");
    return withFormatting(
      text,
      {
        offset: root ? root.offset : 0,
        length: root ? root.length : 0,
        content: JSON.stringify(value),
      },
      options,
    );
  } else if (parent.type === "object" && typeof lastSegment === "string" && Array.isArray(parent.children)) {
    let existing = findNodeAtLocation(parent, [lastSegment]);
    if (existing !== undefined) {
      if (value === undefined) {
        if (!existing.parent) throw Error("Malformed AST");
        let propertyIndex = parent.children.indexOf(existing.parent);
        let removeBegin;
        let removeEnd = existing.parent.offset + existing.parent.length;
        if (propertyIndex > 0) {
          let previous = parent.children[propertyIndex - 1];
          removeBegin = previous.offset + previous.length;
        } else {
          removeBegin = parent.offset + 1;
          if (parent.children.length > 1) removeEnd = parent.children[1].offset;
        }
        return withFormatting(
          text,
          {
            offset: removeBegin,
            length: removeEnd - removeBegin,
            content: "",
          },
          options,
        );
      } else
        return withFormatting(
          text,
          {
            offset: existing.offset,
            length: existing.length,
            content: JSON.stringify(value),
          },
          options,
        );
    } else {
      if (value === undefined) return [];
      let newProperty = `${JSON.stringify(lastSegment)}: ${JSON.stringify(value)}`;
      let index = options.getInsertionIndex
        ? options.getInsertionIndex(parent.children.map((p) => p.children[0].value))
        : parent.children.length;
      let edit;
      if (index > 0) {
        let previous = parent.children[index - 1];
        edit = {
          offset: previous.offset + previous.length,
          length: 0,
          content: "," + newProperty,
        };
      } else if (parent.children.length === 0)
        edit = {
          offset: parent.offset + 1,
          length: 0,
          content: newProperty,
        };
      else
        edit = {
          offset: parent.offset + 1,
          length: 0,
          content: newProperty + ",",
        };
      return withFormatting(text, edit, options);
    }
  } else if (parent.type === "array" && typeof lastSegment === "number" && Array.isArray(parent.children)) {
    let insertIndex = lastSegment;
    if (insertIndex === -1) {
      let newProperty = `${JSON.stringify(value)}`;
      let edit;
      if (parent.children.length === 0)
        edit = {
          offset: parent.offset + 1,
          length: 0,
          content: newProperty,
        };
      else {
        let previous = parent.children[parent.children.length - 1];
        edit = {
          offset: previous.offset + previous.length,
          length: 0,
          content: "," + newProperty,
        };
      }
      return withFormatting(text, edit, options);
    } else if (value === undefined && parent.children.length >= 0) {
      let removalIndex = lastSegment;
      let toRemove = parent.children[removalIndex];
      let edit;
      if (parent.children.length === 1)
        edit = {
          offset: parent.offset + 1,
          length: parent.length - 2,
          content: "",
        };
      else if (parent.children.length - 1 === removalIndex) {
        let previous = parent.children[removalIndex - 1];
        let offset = previous.offset + previous.length;
        let parentEndOffset = parent.offset + parent.length;
        edit = {
          offset,
          length: parentEndOffset - 2 - offset,
          content: "",
        };
      } else
        edit = {
          offset: toRemove.offset,
          length: parent.children[removalIndex + 1].offset - toRemove.offset,
          content: "",
        };
      return withFormatting(text, edit, options);
    } else if (value !== undefined) {
      let edit;
      let newProperty = `${JSON.stringify(value)}`;
      if (!options.isArrayInsertion && parent.children.length > lastSegment) {
        let toModify = parent.children[lastSegment];
        edit = {
          offset: toModify.offset,
          length: toModify.length,
          content: newProperty,
        };
      } else if (parent.children.length === 0 || lastSegment === 0)
        edit = {
          offset: parent.offset + 1,
          length: 0,
          content: parent.children.length === 0 ? newProperty : newProperty + ",",
        };
      else {
        let index = lastSegment > parent.children.length ? parent.children.length : lastSegment;
        let previous = parent.children[index - 1];
        edit = {
          offset: previous.offset + previous.length,
          length: 0,
          content: "," + newProperty,
        };
      }
      return withFormatting(text, edit, options);
    } else
      throw Error(
        `Can not ${value === undefined ? "remove" : options.isArrayInsertion ? "insert" : "modify"} Array index ${insertIndex} as length is not sufficient`,
      );
  } else
    throw Error(
      `Can not add ${typeof lastSegment !== "number" ? "index" : "property"} to parent of type ${parent.type}`,
    );
}
//@ chunk-kndsyy4v.js:14948-15435 esm-fingerprint
function withFormatting(text, edit, options) {
  if (!options.formattingOptions) return [edit];
  let newText = applyEdit(text, edit);
  let begin = edit.offset;
  let end = edit.offset + edit.content.length;
  if (edit.length === 0 || edit.content.length === 0) {
    while (begin > 0 && !isEOL(newText, begin - 1)) begin--;
    while (end < newText.length && !isEOL(newText, end)) end++;
  }
  let edits = format(
    newText,
    {
      offset: begin,
      length: end - begin,
    },
    {
      ...options.formattingOptions,
      keepLines: false,
    },
  );
  for (let i = edits.length - 1; i >= 0; i--) {
    let edit = edits[i];
    newText = applyEdit(newText, edit);
    begin = Math.min(begin, edit.offset);
    end = Math.max(end, edit.offset + edit.length);
    end += edit.content.length - edit.length;
  }
  let editLength = text.length - (newText.length - end) - begin;
  return [
    {
      offset: begin,
      length: editLength,
      content: newText.substring(begin, end),
    },
  ];
}
//@ chunk-kndsyy4v.js:15435-15523 esm-fingerprint
function applyEdit(text, edit) {
  return text.substring(0, edit.offset) + edit.content + text.substring(edit.offset + edit.length);
}
export { ee, applyEdit };
