package features

// RequestCatalog does not inherit the legacy agent loop's policy claims.
func RequestCatalog(mode string) Document {
	return Document{CatalogVersion: "2026-10-18.request-v7", PolicySchemaVersion: PolicySchemaVersion, Features: []Feature{{
		ID: "F-REQUEST-MODES", Title: "单次请求 direct/build", Category: "CC 执行上下文", Scope: "cc", Status: "partial",
		BodyPaths: []string{"system", "messages", "tools"}, BetaHeaders: []string{},
		Mechanisms: []string{mode, "CLI 原生单次发送", "API Key 认证", "调用方执行工具"},
		Reason:     "direct 保留 Messages 原文；build 由 Worker 提取上下文后交 CLI 构建，可能改变文本块形状。均不执行工具循环，不启用旧 native 的附件擦除、工具前缀或字段忽略策略。count_tokens 未实现，订阅认证未启用。版本、补丁和哈希在启动前校验；具体上游模型能力需实际验证。",
	}}}
}
