// Package anthropicupstream implements the strict native Anthropic wire
// boundary used by operator-configured Antigravity upstream accounts.
package anthropicupstream

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"strings"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/streamjson"
	"github.com/caddyserver/caddy/v2"
)

const contextManagementBeta = "context-management-2025-06-27"

var forwardedHeaders = map[string]struct{}{
	"accept": {}, "accept-language": {}, "content-type": {}, "user-agent": {},
	"x-stainless-retry-count": {}, "x-stainless-timeout": {}, "x-stainless-lang": {},
	"x-stainless-package-version": {}, "x-stainless-os": {}, "x-stainless-arch": {},
	"x-stainless-runtime": {}, "x-stainless-runtime-version": {}, "x-stainless-helper-method": {},
	"x-app": {}, "x-client-request-id": {}, "x-claude-code-session-id": {},
}

func init() { caddy.RegisterModule(Transformer{}) }

type Transformer struct{}

func (Transformer) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{ID: "sup2api.protocols.anthropic_upstream", New: func() caddy.Module { return new(Transformer) }}
}

func (*Transformer) ForwardClientAddress() bool { return false }

func (*Transformer) TransformRequest(request *http.Request, plan *controlv1.ExecutionPlan, _ *requeststate.State) error {
	if request == nil || request.Body == nil || plan == nil {
		return fmt.Errorf("Anthropic upstream request state is incomplete")
	}
	for key := range request.Header {
		if _, allowed := forwardedHeaders[strings.ToLower(strings.TrimSpace(key))]; !allowed {
			request.Header.Del(key)
		}
	}
	for _, key := range []string{"Authorization", "Proxy-Authorization", "x-api-key", "x-goog-api-key", "Cookie", "anthropic-beta", "anthropic-version", "Content-Length"} {
		request.Header.Del(key)
	}
	keepContext := tokenListContains(plan.GetProtocolOptions()["anthropic_beta"], contextManagementBeta)
	request.Body = sanitizeBody(request.Body, keepContext)
	request.ContentLength = -1
	request.GetBody = nil
	return nil
}

func (*Transformer) TransformResponse(*http.Response, *controlv1.ExecutionPlan, *requeststate.State) error {
	return nil
}

func sanitizeBody(source io.ReadCloser, keepContext bool) io.ReadCloser {
	reader, writer := io.Pipe()
	go func() {
		defer source.Close()
		err := rewriteObject(writer, bufio.NewReaderSize(source, 32<<10), keepContext)
		_ = writer.CloseWithError(err)
	}()
	return reader
}

func rewriteObject(output io.Writer, input *bufio.Reader, keepContext bool) error {
	first, err := streamjson.ReadNonSpace(input)
	if err != nil || first != '{' {
		return fmt.Errorf("Anthropic upstream body must be a JSON object")
	}
	if _, err := io.WriteString(output, "{"); err != nil {
		return err
	}
	firstOutput := true
	afterComma := false
	for {
		next, err := streamjson.ReadNonSpace(input)
		if err != nil {
			return fmt.Errorf("read Anthropic upstream object: %w", err)
		}
		if next == '}' {
			if afterComma {
				return fmt.Errorf("Anthropic upstream object contains a trailing comma")
			}
			break
		}
		if next != '"' {
			return fmt.Errorf("Anthropic upstream object contains an invalid field name")
		}
		rawKey, key, err := streamjson.ReadString(input, next)
		if err != nil {
			return err
		}
		colon, err := streamjson.ReadNonSpace(input)
		if err != nil || colon != ':' {
			return fmt.Errorf("Anthropic upstream field %q is missing a colon", key)
		}
		writeField := key != "context_management" || keepContext
		if writeField {
			if !firstOutput {
				if _, err := io.WriteString(output, ","); err != nil {
					return err
				}
			}
			firstOutput = false
			if _, err := output.Write(rawKey); err != nil {
				return err
			}
			if _, err := io.WriteString(output, ":"); err != nil {
				return err
			}
		}
		valueOutput := io.Discard
		if writeField {
			valueOutput = output
		}
		delimiter, err := streamjson.CopyValue(input, valueOutput)
		if err != nil {
			return fmt.Errorf("transform Anthropic upstream field %q: %w", key, err)
		}
		if delimiter == '}' {
			break
		}
		afterComma = true
	}
	if _, err := io.WriteString(output, "}"); err != nil {
		return err
	}
	if err := streamjson.EnsureEOF(input); err != nil {
		return fmt.Errorf("Anthropic upstream body: %w", err)
	}
	return nil
}

func tokenListContains(value, wanted string) bool {
	for _, token := range strings.Split(value, ",") {
		if strings.TrimSpace(token) == wanted {
			return true
		}
	}
	return false
}

var _ caddy.Module = (*Transformer)(nil)
