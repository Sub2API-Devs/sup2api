/**
 * utils/settings/validateEditTool.ts
 *
 * Edit/Write 修改 Claude 设置文件后的内容校验与错误提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/validateEditTool.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { isClaudeSettingsPath } from "../permissions/filesystem.js";
import { validateSettingsFileContent } from "./validation.js";

/**
 * Edit/Write 工具编辑 Claude 设置文件时，校验修改后的内容，失败则返回带完整 schema 的错误提示给模型。
 */
//@ chunk-e6aww6q8.js:4644843-4645172 fingerprint = validateInputForSettingsFileEdit (1)
function validateInputForSettingsFileEdit(filePath, originalContent, getUpdatedContent) {
  if (!isClaudeSettingsPath(filePath)) return null;
  if (!validateSettingsFileContent(originalContent).isValid) return null;
  let updatedContent = getUpdatedContent(),
    afterValidation = validateSettingsFileContent(updatedContent);
  if (!afterValidation.isValid)
    return {
      result: !1,
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
