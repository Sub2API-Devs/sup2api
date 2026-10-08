// Package apicompat preserves the legacy API using the shared codec implementation.
package apicompat

import (
	"encoding/json"
	codec "github.com/Sub2API-Devs/sup2api/next/protocol-codec"
)

func AnthropicToResponses(req *AnthropicRequest) (*ResponsesRequest, error) {
	return codec.AnthropicToResponses(req)
}
func AnthropicToResponsesResponse(resp *AnthropicResponse) *ResponsesResponse {
	return codec.AnthropicToResponsesResponse(resp)
}

type AnthropicEventToResponsesState = codec.AnthropicEventToResponsesState

func NewAnthropicEventToResponsesState() *AnthropicEventToResponsesState {
	return codec.NewAnthropicEventToResponsesState()
}
func AnthropicEventToResponsesEvents(
	evt *AnthropicStreamEvent,
	state *AnthropicEventToResponsesState,
) []ResponsesStreamEvent {
	return codec.AnthropicEventToResponsesEvents(evt, state)
}
func FinalizeAnthropicResponsesStream(state *AnthropicEventToResponsesState) []ResponsesStreamEvent {
	return codec.FinalizeAnthropicResponsesStream(state)
}
func ResponsesEventToSSE(evt ResponsesStreamEvent) (string, error) {
	return codec.ResponsesEventToSSE(evt)
}
func AnthropicToChatCompletionsRequest(req *AnthropicRequest) (*ChatCompletionsRequest, error) {
	return codec.AnthropicToChatCompletionsRequest(req)
}
func ChatCompletionsResponseToAnthropic(resp *ChatCompletionsResponse, model string) *AnthropicResponse {
	return codec.ChatCompletionsResponseToAnthropic(resp, model)
}

type ChatCompletionsToAnthropicStreamState = codec.ChatCompletionsToAnthropicStreamState

func NewChatCompletionsToAnthropicStreamState(model string) *ChatCompletionsToAnthropicStreamState {
	return codec.NewChatCompletionsToAnthropicStreamState(model)
}
func ChatCompletionsChunkToAnthropicEvents(
	chunk *ChatCompletionsChunk,
	state *ChatCompletionsToAnthropicStreamState,
) []AnthropicStreamEvent {
	return codec.ChatCompletionsChunkToAnthropicEvents(chunk, state)
}
func FinalizeChatCompletionsAnthropicStream(state *ChatCompletionsToAnthropicStreamState) []AnthropicStreamEvent {
	return codec.FinalizeChatCompletionsAnthropicStream(state)
}

type ResponsesToChatOptions = codec.ResponsesToChatOptions

func ResponsesToChatCompletionsRequest(req *ResponsesRequest) (*ChatCompletionsRequest, error) {
	return codec.ResponsesToChatCompletionsRequest(req)
}
func ResponsesToChatCompletionsRequestWithOptions(req *ResponsesRequest, opts *ResponsesToChatOptions) (*ChatCompletionsRequest, error) {
	return codec.ResponsesToChatCompletionsRequestWithOptions(req, opts)
}
func EffectiveResponsesTools(req *ResponsesRequest) ([]ResponsesTool, error) {
	return codec.EffectiveResponsesTools(req)
}
func CustomToolNames(tools []ResponsesTool) map[string]bool   { return codec.CustomToolNames(tools) }
func FunctionToolNames(tools []ResponsesTool) map[string]bool { return codec.FunctionToolNames(tools) }

type NamespacedToolName = codec.NamespacedToolName

func NamespaceToolNames(tools []ResponsesTool) map[string]NamespacedToolName {
	return codec.NamespaceToolNames(tools)
}
func HasToolSearchTool(tools []ResponsesTool) bool { return codec.HasToolSearchTool(tools) }
func ExtractResponsesReasoningItem(raw json.RawMessage) (id string, text string, ok bool) {
	return codec.ExtractResponsesReasoningItem(raw)
}
func ChatCompletionsResponseToResponses(resp *ChatCompletionsResponse, model string, customTools, functionTools map[string]bool, toolSearch bool, namespaceTools map[string]NamespacedToolName) *ResponsesResponse {
	return codec.ChatCompletionsResponseToResponses(resp, model, customTools, functionTools, toolSearch, namespaceTools)
}
func ChatUsageToResponsesUsage(usage *ChatUsage) *ResponsesUsage {
	return codec.ChatUsageToResponsesUsage(usage)
}

type ChatCompletionsToResponsesStreamState = codec.ChatCompletionsToResponsesStreamState

func NewChatCompletionsToResponsesStreamState(model string) *ChatCompletionsToResponsesStreamState {
	return codec.NewChatCompletionsToResponsesStreamState(model)
}
func ChatCompletionsChunkToResponsesEvents(
	chunk *ChatCompletionsChunk,
	state *ChatCompletionsToResponsesStreamState,
) []ResponsesStreamEvent {
	return codec.ChatCompletionsChunkToResponsesEvents(chunk, state)
}
func FinalizeChatCompletionsResponsesStream(state *ChatCompletionsToResponsesStreamState) []ResponsesStreamEvent {
	return codec.FinalizeChatCompletionsResponsesStream(state)
}
func ChatCompletionsToResponses(req *ChatCompletionsRequest) (*ResponsesRequest, error) {
	return codec.ChatCompletionsToResponses(req)
}

type ResponsesClientToolMapping = codec.ResponsesClientToolMapping

func AdaptResponsesClientTools(req map[string]any) (ResponsesClientToolMapping, bool, error) {
	return codec.AdaptResponsesClientTools(req)
}
func AdaptResponsesClientToolsWithInheritedMapping(
	req map[string]any,
	inherited ResponsesClientToolMapping,
	inheritedLoweredTools ...[]any,
) (ResponsesClientToolMapping, bool, error) {
	return codec.AdaptResponsesClientToolsWithInheritedMapping(req, inherited, inheritedLoweredTools...)
}
func RestoreResponsesClientToolPayload(payload []byte, mapping ResponsesClientToolMapping) ([]byte, bool, error) {
	return codec.RestoreResponsesClientToolPayload(payload, mapping)
}

type ResponsesClientToolStreamRestorer = codec.ResponsesClientToolStreamRestorer

func NewResponsesClientToolStreamRestorer(mapping ResponsesClientToolMapping) *ResponsesClientToolStreamRestorer {
	return codec.NewResponsesClientToolStreamRestorer(mapping)
}

type ResponsesNamespaceName = codec.ResponsesNamespaceName

func FlattenResponsesNamespaces(req map[string]any) (map[string]ResponsesNamespaceName, bool, error) {
	return codec.FlattenResponsesNamespaces(req)
}
func FlattenResponsesNamespacesExcept(req map[string]any, preserved map[string]bool) (map[string]ResponsesNamespaceName, bool, error) {
	return codec.FlattenResponsesNamespacesExcept(req, preserved)
}
func RestoreResponsesNamespaceCalls(payload []byte, names map[string]ResponsesNamespaceName) ([]byte, bool, error) {
	return codec.RestoreResponsesNamespaceCalls(payload, names)
}
func ResponsesToAnthropic(resp *ResponsesResponse, model string) *AnthropicResponse {
	return codec.ResponsesToAnthropic(resp, model)
}

type ResponsesEventToAnthropicState = codec.ResponsesEventToAnthropicState

func NewResponsesEventToAnthropicState() *ResponsesEventToAnthropicState {
	return codec.NewResponsesEventToAnthropicState()
}
func ResponsesEventToAnthropicEvents(
	evt *ResponsesStreamEvent,
	state *ResponsesEventToAnthropicState,
) []AnthropicStreamEvent {
	return codec.ResponsesEventToAnthropicEvents(evt, state)
}
func FinalizeResponsesAnthropicStream(state *ResponsesEventToAnthropicState) []AnthropicStreamEvent {
	return codec.FinalizeResponsesAnthropicStream(state)
}
func ResponsesAnthropicEventToSSE(evt AnthropicStreamEvent) (string, error) {
	return codec.ResponsesAnthropicEventToSSE(evt)
}
func ResponsesToAnthropicRequest(req *ResponsesRequest) (*AnthropicRequest, error) {
	return codec.ResponsesToAnthropicRequest(req)
}
func ResponsesToChatCompletions(resp *ResponsesResponse, model string) *ChatCompletionsResponse {
	return codec.ResponsesToChatCompletions(resp, model)
}

type ResponsesEventToChatState = codec.ResponsesEventToChatState

func NewResponsesEventToChatState() *ResponsesEventToChatState {
	return codec.NewResponsesEventToChatState()
}
func ResponsesEventToChatChunks(evt *ResponsesStreamEvent, state *ResponsesEventToChatState) []ChatCompletionsChunk {
	return codec.ResponsesEventToChatChunks(evt, state)
}
func FinalizeResponsesChatStream(state *ResponsesEventToChatState) []ChatCompletionsChunk {
	return codec.FinalizeResponsesChatStream(state)
}
func ChatChunkToSSE(chunk ChatCompletionsChunk) (string, error) { return codec.ChatChunkToSSE(chunk) }

type BufferedResponseAccumulator = codec.BufferedResponseAccumulator

func NewBufferedResponseAccumulator() *BufferedResponseAccumulator {
	return codec.NewBufferedResponseAccumulator()
}
func LiftResponsesToolOutputMedia(input any) (any, bool) {
	return codec.LiftResponsesToolOutputMedia(input)
}

type AnthropicRequest = codec.AnthropicRequest
type AnthropicOutputConfig = codec.AnthropicOutputConfig
type AnthropicThinking = codec.AnthropicThinking
type AnthropicMessage = codec.AnthropicMessage
type AnthropicContentBlock = codec.AnthropicContentBlock
type AnthropicImageSource = codec.AnthropicImageSource
type AnthropicTool = codec.AnthropicTool
type AnthropicCacheControl = codec.AnthropicCacheControl
type AnthropicResponse = codec.AnthropicResponse

func AnthropicStopReasonPtr(s string) *string    { return codec.AnthropicStopReasonPtr(s) }
func AnthropicStopReasonString(p *string) string { return codec.AnthropicStopReasonString(p) }

type AnthropicPromptTokensDetails = codec.AnthropicPromptTokensDetails
type AnthropicUsage = codec.AnthropicUsage
type AnthropicStreamEvent = codec.AnthropicStreamEvent
type AnthropicDelta = codec.AnthropicDelta
type ResponsesRequest = codec.ResponsesRequest
type ResponsesReasoning = codec.ResponsesReasoning
type ResponsesText = codec.ResponsesText
type ResponsesInputItem = codec.ResponsesInputItem
type ResponsesContentPart = codec.ResponsesContentPart
type ResponsesTool = codec.ResponsesTool
type ResponsesResponse = codec.ResponsesResponse
type ResponsesError = codec.ResponsesError
type ResponsesIncompleteDetails = codec.ResponsesIncompleteDetails
type ResponsesOutput = codec.ResponsesOutput
type WebSearchAction = codec.WebSearchAction
type ResponsesSummary = codec.ResponsesSummary
type ResponsesUsage = codec.ResponsesUsage
type ResponsesInputTokensDetails = codec.ResponsesInputTokensDetails
type ResponsesOutputTokensDetails = codec.ResponsesOutputTokensDetails
type ResponsesStreamEvent = codec.ResponsesStreamEvent
type ChatCompletionsRequest = codec.ChatCompletionsRequest
type ChatStreamOptions = codec.ChatStreamOptions
type ChatMessage = codec.ChatMessage
type ChatContentPart = codec.ChatContentPart
type ChatImageURL = codec.ChatImageURL
type ChatFile = codec.ChatFile
type ChatTool = codec.ChatTool
type ChatFunction = codec.ChatFunction
type ChatToolCall = codec.ChatToolCall
type ChatFunctionCall = codec.ChatFunctionCall
type ChatCompletionsResponse = codec.ChatCompletionsResponse
type ChatChoice = codec.ChatChoice
type ChatUsage = codec.ChatUsage
type ChatTokenDetails = codec.ChatTokenDetails
type ChatCompletionsChunk = codec.ChatCompletionsChunk
type ChatChunkChoice = codec.ChatChunkChoice
type ChatDelta = codec.ChatDelta
