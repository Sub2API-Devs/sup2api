package convert

// builtinPair is a built-in pair declared by its request side; the
// response side is generic (CONVERT-MATRIX §3).
type builtinPair struct {
	from, to string
	grade    Grade
	req      requestFunc
}

// builtinPairs are the built-in pairs besides chat -> responses
// (CONVERT-MATRIX §0, §9.9). Those between OpenAI chat, OpenAI responses
// and Anthropic messages convert their request through canonReq.
var builtinPairs = []builtinPair{
	{"openai.responses", "openai.chat", GradeGood, canonRequest(parseResponsesRequest, buildChatRequest("max_completion_tokens"))},
	{"openai.chat", "anthropic.messages", GradeFair, canonRequest(parseChatRequest, buildAnthropicRequest)},
	{"openai.responses", "anthropic.messages", GradeFair, canonRequest(parseResponsesRequest, buildAnthropicRequest)},
	{"anthropic.messages", "openai.chat", GradeFair, canonRequest(parseAnthropicRequest, buildChatRequest("max_tokens"))},
	{"anthropic.messages", "openai.responses", GradeFair, canonRequest(parseAnthropicRequest, buildResponsesRequest)},
}

// builtinConverters returns new instances of the built-in converters.
func builtinConverters() []Converter {
	out := []Converter{&chatResponses{}}
	for _, p := range builtinPairs {
		out = append(out, newPair(p.from, p.to, p.grade, p.req))
	}
	return out
}
