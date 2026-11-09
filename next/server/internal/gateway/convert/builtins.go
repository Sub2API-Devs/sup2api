package convert

// canonPair is a built-in pair whose request converts through canonReq.
type canonPair struct {
	from, to string
	grade    Grade
	req      requestFunc
}

// canonPairs are the built-in pairs between OpenAI chat, OpenAI responses
// and Anthropic messages declared by their request side
// (CONVERT-MATRIX §0, §9.9); the response side is generic (§3).
var canonPairs = []canonPair{
	{"openai.responses", "openai.chat", GradeGood, canonRequest(parseResponsesRequest, buildChatRequest("max_completion_tokens"))},
	{"openai.chat", "anthropic.messages", GradeFair, canonRequest(parseChatRequest, buildAnthropicRequest)},
	{"openai.responses", "anthropic.messages", GradeFair, canonRequest(parseResponsesRequest, buildAnthropicRequest)},
	{"anthropic.messages", "openai.chat", GradeFair, canonRequest(parseAnthropicRequest, buildChatRequest("max_tokens"))},
	{"anthropic.messages", "openai.responses", GradeFair, canonRequest(parseAnthropicRequest, buildResponsesRequest)},
}

// builtinConverters returns new instances of the built-in converters.
func builtinConverters() []Converter {
	out := []Converter{&chatResponses{}}
	for _, p := range canonPairs {
		out = append(out, newPair(p.from, p.to, p.grade, p.req))
	}
	return out
}
