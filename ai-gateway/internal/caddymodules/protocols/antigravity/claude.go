package antigravity

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	protocol "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/antigravityprotocol"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
)

func transformClaudeRequest(request *http.Request, plan *controlv1.ExecutionPlan, state *requeststate.State) error {
	if request == nil || request.Body == nil || plan == nil || state == nil {
		return fmt.Errorf("Antigravity Claude request state is incomplete")
	}
	if strings.TrimSpace(plan.GetProtocolOptions()["action"]) != "messages" {
		return fmt.Errorf("invalid Antigravity Claude action")
	}
	payload, err := readBounded(request.Body, maxBodyBytes, "Antigravity Claude request")
	if err != nil {
		return clientError(err)
	}
	decoder := json.NewDecoder(bytes.NewReader(payload))
	var claudeRequest protocol.ClaudeRequest
	if err := decoder.Decode(&claudeRequest); err != nil {
		return clientError(fmt.Errorf("invalid Anthropic Messages request: %w", err))
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		return clientError(fmt.Errorf("Anthropic Messages request contains trailing JSON data"))
	}
	if strings.TrimSpace(claudeRequest.Model) == "" || len(claudeRequest.Messages) == 0 {
		return clientError(fmt.Errorf("Anthropic Messages request requires model and messages"))
	}
	// Client metadata is not an upstream session authority. The pure converter
	// derives an opaque session ID from request content instead of forwarding a
	// caller-controlled metadata.user_id.
	claudeRequest.Metadata = nil
	mappedModel := strings.TrimSpace(plan.GetMappedModel())
	if claudeRequest.Thinking != nil && (claudeRequest.Thinking.Type == "enabled" || claudeRequest.Thinking.Type == "adaptive") && mappedModel == "claude-sonnet-4-5" {
		mappedModel = "claude-sonnet-4-5-thinking"
	}
	projectID := strings.TrimSpace(plan.GetProtocolOptions()["project_id"])
	if mappedModel == "" || projectID == "" {
		return fmt.Errorf("Antigravity Claude execution plan is incomplete")
	}
	options := protocol.DefaultTransformOptions()
	options.EnableIdentityPatch = true
	transformed, err := protocol.TransformClaudeToGeminiWithOptions(&claudeRequest, projectID, mappedModel, options)
	if err != nil {
		return clientError(fmt.Errorf("convert Anthropic request: %w", err))
	}
	request.Body = io.NopCloser(bytes.NewReader(transformed))
	request.ContentLength = int64(len(transformed))
	request.GetBody = func() (io.ReadCloser, error) { return io.NopCloser(bytes.NewReader(transformed)), nil }
	for key := range request.Header {
		request.Header.Del(key)
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Del("Content-Length")
	return nil
}
