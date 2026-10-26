package features

import "slices"

const ContainerResourceReportingCapability = "container_resource_reporting_v1"
const RequestIdentityCapability = "request_identity_v1"

// RequestCaptureCapability: the CLI's request command takes
// --capture-request <prefix> (and --capture-body) and writes the request it
// finally sent upstream: <prefix>.json holds its facts and headers with
// credentials masked, <prefix>.body its body bytes. The Worker keeps them in
// the request's log (REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md, 2026-10-26); an
// older CLI refuses the unknown arguments, so the Worker asks only this one.
const RequestCaptureCapability = "request_capture_v1"

// RequestRuntimeCatalog distinguishes declared Worker code from capabilities
// observed on the selected CLI. It never promotes model/provider verification.
func RequestRuntimeCatalog(capabilities []string) Document {
	doc := RequestCatalog("request_direct")
	if slices.Contains(capabilities, BuildAttachmentCapabilityV2) {
		doc.Features = append(doc.Features, Feature{
			ID: "F-BUILD-CONTENT-POLICY", Title: "build 环境与计费内容策略", Category: "CC 执行上下文", Scope: "cc", Status: "supported",
			BodyPaths: []string{"system", "messages[].content"}, BetaHeaders: []string{},
			Mechanisms: []string{BuildAttachmentCapabilityV2}, Reason: "已加载 CLI 声明支持十项环境字段来源及擦除；仅修改匹配字段，未知内容保持。最终上游模型能力未验证。",
		})
	} else if slices.Contains(capabilities, BuildAttachmentCapability) {
		doc.Features = append(doc.Features, buildAttachmentsFeature())
	}
	for _, feature := range []struct{ id, title, capability string }{
		{"F-BUILD-BILLING", "build 计费归属来源", BuildBillingCapability},
		{"F-BUILD-IDENTITY-LINE", "build 计费头入口与身份行", BuildIdentityCapability},
		{"F-BUILD-INJECTION", "build 给非 CC 请求补提示词、附件与工具", BuildInjectionCapability},
		{"F-REQUEST-LEVELS", "注入等级：0 / 微 / 低 / 高", RequestLevelsCapability},
		{"F-DIRECT-BILLING", "direct 补计费头", DirectBillingCapability},
		{"F-REQUEST-AGENT-CONTEXT", "按客户端还原主代理/子代理请求", RequestAgentContextCapability},
		{"F-BUILD-PRESERVATION", "build 内容保真", BuildContentPreservationCapability},
		{"F-REQUEST-POLICY-MODE", "按请求选择 direct/build", RequestPolicyModeCapability},
		{"F-REQUEST-CAPTURE", "请求日志记录最终上游请求", RequestCaptureCapability},
	} {
		if slices.Contains(capabilities, feature.capability) {
			doc.Features = append(doc.Features, Feature{ID: feature.id, Title: feature.title, Category: "CC 执行上下文", Scope: "cc", Status: "supported", BodyPaths: []string{}, BetaHeaders: []string{}, Mechanisms: []string{feature.capability}, Reason: "Worker 与实际加载 CLI 的合同能力交集；不代表模型提供方验证已完成。"})
		}
	}
	return doc
}

// RequestCatalog describes the request command, the only way a Worker answers.
func RequestCatalog(mode string) Document {
	doc := Document{CatalogVersion: "2026-10-20.request-attachments-v1", PolicySchemaVersion: PolicySchemaVersion, Features: []Feature{{
		ID: "F-REQUEST-MODES", Title: "单次请求 direct/build", Category: "CC 执行上下文", Scope: "cc", Status: "partial",
		BodyPaths: []string{"system", "messages", "tools"}, BetaHeaders: []string{},
		Mechanisms: []string{mode, "CLI 原生单次发送", "API Key 认证", "调用方执行工具"},
		Reason:     "direct 保留 Messages 原文，只补缺失的计费头；build 由 CLI 用原生函数按客户端原块组装，Worker 不改写内容。均不执行工具循环，工具由调用方执行。count_tokens 未实现。版本、补丁和哈希在启动前校验；具体上游模型能力需实际验证。",
	}}}
	if mode == "request_build" {
		doc.Features = append(doc.Features, buildAttachmentsFeature())
	}
	return doc
}

// buildAttachmentsFeature is the build environment's attachment sources.
func buildAttachmentsFeature() Feature {
	return Feature{
		ID: "F-BUILD-ATTACHMENTS", Title: "build 环境附件来源", Category: "CC 执行上下文", Scope: "cc", Status: "supported",
		BodyPaths: []string{"system", "messages[].content"}, BetaHeaders: []string{},
		Mechanisms: []string{BuildAttachmentCapabilityV2, "build_attachment_sources", "CLI 原生环境段"},
		Reason:     "环境段各字段按来源由 CLI 的内容适配器生成：默认保留客户端，也可用 Worker 本机事实或擦除。仅识别完整 CC 环境段落，其余内容原样保留；不调用额外模型。direct 不执行转换。",
	}
}
