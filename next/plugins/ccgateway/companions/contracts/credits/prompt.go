// Package credits defines the public protocol fingerprints used by both core
// admission and the Worker's attributed wire snapshot. It stores no tokens.
package credits

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"sort"
	"strings"
	"time"
	"unicode"
)

const Lifetime = 5 * time.Minute
const MaxTokenBytes = 64 << 10
const MaxBodyBytes = 32 << 20
const AdmissionHeader = "X-CCGateway-Fallback-Credit"
const ReadyHeader = "X-CCGateway-Fallback-Credit-Ready"
const TrackingHeader = "X-CCGateway-Fallback-Credit-Track"

// FailureHeader is an internal custody result, not the provider stop reason.
const FailureHeader = "X-CCGateway-Fallback-Credit-Failure"

func Enabled(headers []string) bool {
	for _, header := range headers {
		for _, beta := range strings.Split(header, ",") {
			switch strings.TrimSpace(beta) {
			case "fallback-credit-2026-06-01", "fallback-credit-2026-07-01", "server-side-fallback-2026-07-01":
				return true
			}
		}
	}
	return false
}

func TokenHash(token string) (string, error) {
	if token == "" || len(token) > MaxTokenBytes {
		return "", fmt.Errorf("invalid fallback credit token size")
	}
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:]), nil
}

func Object(raw []byte) (map[string]any, error) {
	if len(raw) > MaxBodyBytes {
		return nil, fmt.Errorf("credit protocol body exceeds limit")
	}
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	var value map[string]any
	if dec.Decode(&value) != nil || value == nil || dec.Decode(new(any)) != io.EOF {
		return nil, fmt.Errorf("invalid credit protocol object")
	}
	return value, nil
}

// All unlisted fields remain bound, including newly introduced prompt fields.
// Do not guess which unknown controls are safe to change.
func Prompt(body []byte) (json.RawMessage, error) {
	object, err := Object(body)
	if err != nil {
		return nil, err
	}
	for _, key := range []string{"model", "max_tokens", "stop_sequences", "temperature", "top_p", "top_k", "stream", "metadata", "service_tier", "fallback_credit_token", "fallbacks"} {
		delete(object, key)
	}
	return json.Marshal(object)
}

func MatchingBetas(headers []string) []string {
	unique := map[string]bool{}
	for _, header := range headers {
		for _, beta := range strings.Split(header, ",") {
			beta = strings.TrimSpace(beta)
			if beta != "" && !strings.HasPrefix(beta, "server-side-fallback-") && !strings.HasPrefix(beta, "fallback-credit-") {
				unique[beta] = true
			}
		}
	}
	out := make([]string, 0, len(unique))
	for beta := range unique {
		out = append(out, beta)
	}
	sort.Strings(out)
	return out
}

func Digest(body []byte, betas []string) (string, error) {
	prompt, err := Prompt(body)
	if err != nil {
		return "", err
	}
	raw, _ := json.Marshal(struct {
		Prompt json.RawMessage
		Betas  []string
	}{prompt, MatchingBetas(betas)})
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:]), nil
}

type Claim struct {
	TokenHash   string
	SourceModel string
	Prefill     *bool
	Digests     []string
}

// ClaimForResponse binds both provider-permitted request shapes. The provider
// retains final authority when completed server tools forbid the base shape.
// This never initiates the documented retry ladder on the caller's behalf.
func ClaimForResponse(body, response []byte, betas []string) (*Claim, error) {
	object, err := Object(response)
	if err != nil {
		return nil, err
	}
	details, _ := object["stop_details"].(map[string]any)
	value, present := details["fallback_credit_token"]
	if !present || value == nil {
		return nil, nil
	}
	token, ok := value.(string)
	if !ok {
		return nil, fmt.Errorf("invalid fallback credit response token")
	}
	hash, err := TokenHash(token)
	if err != nil {
		return nil, err
	}
	if object["stop_reason"] != "refusal" {
		return nil, fmt.Errorf("fallback credit was not issued by a refusal")
	}
	model, ok := object["model"].(string)
	if !ok || model == "" {
		return nil, fmt.Errorf("fallback credit source model missing")
	}
	claim := &Claim{TokenHash: hash, SourceModel: model}
	if value := details["fallback_has_prefill_claim"]; value != nil {
		v, ok := value.(bool)
		if !ok {
			return nil, fmt.Errorf("invalid fallback credit prefill claim")
		}
		claim.Prefill = &v
	}
	base, err := Digest(body, betas)
	if err != nil {
		return nil, err
	}
	claim.Digests = []string{base}
	if claim.Prefill != nil && !*claim.Prefill {
		return claim, nil
	}
	content, ok := object["content"].([]any)
	if !ok {
		return nil, fmt.Errorf("fallback credit response content missing")
	}
	source, err := Object(body)
	if err != nil {
		return nil, err
	}
	messages, ok := source["messages"].([]any)
	if !ok {
		return nil, fmt.Errorf("fallback credit request messages missing")
	}
	for _, echo := range [][]any{content, ContinuationContent(content)} {
		source["messages"] = append(append([]any{}, messages...), map[string]any{"role": "assistant", "content": echo})
		raw, _ := json.Marshal(source)
		digest, err := Digest(raw, betas)
		if err != nil {
			return nil, err
		}
		found := false
		for _, old := range claim.Digests {
			found = found || old == digest
		}
		if !found {
			claim.Digests = append(claim.Digests, digest)
		}
	}
	return claim, nil
}

// ContinuationContent performs only the adjustments documented for a credit
// echo. Thinking/signatures/fallback boundaries stay at their original places.
func ContinuationContent(content []any) []any {
	results := map[string]bool{}
	for _, value := range content {
		block, _ := value.(map[string]any)
		if block["type"] == "tool_result" {
			id, _ := block["tool_use_id"].(string)
			results[id] = true
		}
	}
	out := make([]any, 0, len(content))
	for _, value := range content {
		block, _ := value.(map[string]any)
		id, _ := block["id"].(string)
		if block["type"] == "tool_use" && !results[id] {
			continue
		}
		out = append(out, value)
	}
	if len(out) > 0 {
		last, ok := out[len(out)-1].(map[string]any)
		if ok && last["type"] == "text" {
			copy := map[string]any{}
			for key, value := range last {
				copy[key] = value
			}
			if text, ok := copy["text"].(string); ok {
				copy["text"] = strings.TrimRightFunc(text, func(r rune) bool { return unicode.IsSpace(r) || r >= 0x1c && r <= 0x1f })
			}
			out[len(out)-1] = copy
		}
	}
	return out
}
