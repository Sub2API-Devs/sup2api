package features

// RequestCatalog does not inherit the legacy agent loop's policy claims.
func RequestCatalog(mode string) Document {
	doc := Document{CatalogVersion: "2026-10-20.request-attachments-v1", PolicySchemaVersion: PolicySchemaVersion, Features: []Feature{{
		ID: "F-REQUEST-MODES", Title: "单次请求 direct/build", Category: "CC 执行上下文", Scope: "cc", Status: "partial",
		BodyPaths: []string{"system", "messages", "tools"}, BetaHeaders: []string{},
		Mechanisms: []string{mode, "CLI 原生单次发送", "API Key 认证", "调用方执行工具"},
		Reason:     "direct 保留 Messages 原文；build 由 Worker 提取上下文后交 CLI 构建，可能改变文本块形状。均不执行工具循环，不启用旧 native 的附件擦除、工具前缀或字段忽略策略。count_tokens 未实现。版本、补丁和哈希在启动前校验；具体上游模型能力需实际验证。",
	}}}
	if mode == "request_build" {
		doc.Features = append(doc.Features, Feature{
			ID: "F-BUILD-ATTACHMENTS", Title: "build 环境附件来源", Category: "CC 执行上下文", Scope: "cc", Status: "supported",
			BodyPaths: []string{"system", "messages[].content"}, BetaHeaders: []string{},
			Mechanisms: []string{BuildAttachmentCapability, "build_attachment_sources", "原位字段替换"},
			Reason:     "平台和 OS 版本可使用 Worker 本机事实；默认保留客户端。仅识别完整 CC 环境段落，保留 cwd、Git、Shell、指令、工具结果、媒体和 system 生命周期。未知或歧义格式保留；不调用额外模型。direct 不执行转换。",
		})
	}
	return doc
}
