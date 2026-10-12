package engine

// continuation is a CLI transport input, never an API message or model prompt.
func (r *Request) configureContinuation() {
	if len(r.Messages) > 0 && r.Messages[len(r.Messages)-1].Role == "assistant" {
		r.continuation = "ccgateway-continuation-" + uuid() + "-" + uuid()
	}
}

func (r *Request) stopsAtAPITerminal(reason string) bool {
	return len(r.ServerTools) > 0 && reason == "pause_turn"
}
