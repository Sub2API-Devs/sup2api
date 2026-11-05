/**
 * utils/settings/validateEditTool.ts
 *
 * Edit/Write 修改 Claude 设置文件后的内容校验与错误提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/validateEditTool.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isClaudeSettingsPath } from "../permissions/filesystem.js";
import { validateSettingsFileContent } from "./validation.js";

//@ chunk-5xgkngpb.js:4753428-4753757 fingerprint (2.1.88 match: validateInputForSettingsFileEdit, 1)
/**
 * Edit/Write 工具编辑 Claude 设置文件时，校验修改后的内容，失败则返回带完整 schema 的错误提示给模型。
 */
function validateInputForSettingsFileEdit(filePath, originalContent, getUpdatedContent) {
  if (!isClaudeSettingsPath(filePath)) return null;
  if (!validateSettingsFileContent(originalContent).isValid) return null;
  let updatedContent = getUpdatedContent();
  let afterValidation = validateSettingsFileContent(updatedContent);
  if (!afterValidation.isValid)
    return {
      result: false,
      message: `Claude Code settings.json validation failed after edit:
${afterValidation.error}

Full schema:
${afterValidation.fullSchema}
IMPORTANT: Do not update the env unless explicitly instructed to do so.`,
      errorCode: 10,
    };
  return null;
}
export { validateInputForSettingsFileEdit };
