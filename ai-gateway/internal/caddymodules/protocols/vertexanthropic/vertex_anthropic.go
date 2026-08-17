package vertexanthropic

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/protocoltransform"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/streamjson"
	"github.com/caddyserver/caddy/v2"
)

const (
	contextManagementBeta = "context-management-2025-06-27"
)

var forwardedHeaders = map[string]struct{}{
	"accept": {}, "x-stainless-retry-count": {}, "x-stainless-timeout": {},
	"x-stainless-lang": {}, "x-stainless-package-version": {}, "x-stainless-os": {},
	"x-stainless-arch": {}, "x-stainless-runtime": {}, "x-stainless-runtime-version": {},
	"x-stainless-helper-method": {}, "anthropic-dangerous-direct-browser-access": {},
	"x-app": {}, "accept-language": {}, "sec-fetch-mode": {}, "user-agent": {},
	"content-type": {}, "accept-encoding": {}, "x-claude-code-session-id": {},
	"x-client-request-id": {},
}

func init() { caddy.RegisterModule(Transformer{}) }

// Transformer converts the native Anthropic Messages body into Vertex raw
// prediction shape without buffering or re-encoding multimodal values.
type Transformer struct{}

func (Transformer) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{ID: "sup2api.protocols.vertex_anthropic", New: func() caddy.Module { return new(Transformer) }}
}

func (*Transformer) HandlesModelRewrite() bool { return true }

func (*Transformer) ForwardClientAddress() bool { return false }

func (*Transformer) TransformRequest(request *http.Request, plan *controlv1.ExecutionPlan, _ *requeststate.State) error {
	if request == nil || plan == nil || request.Body == nil {
		return fmt.Errorf("Anthropic Vertex request body is required")
	}
	version := strings.TrimSpace(plan.GetProtocolOptions()["anthropic_version"])
	if version == "" {
		return fmt.Errorf("Anthropic Vertex version is required")
	}
	finalBeta := strings.TrimSpace(plan.GetProtocolOptions()["anthropic_beta"])
	keepContextManagement := tokenListContains(finalBeta, contextManagementBeta)

	for key := range request.Header {
		if _, ok := forwardedHeaders[strings.ToLower(strings.TrimSpace(key))]; !ok {
			request.Header.Del(key)
		}
	}
	request.Header.Del("anthropic-version")
	request.Header.Del("anthropic-beta")
	request.Header.Del("authorization")
	request.Header.Del("x-api-key")
	request.Header.Del("x-goog-api-key")
	request.Header.Del("cookie")
	request.Header.Del("content-length")

	request.Body = rewriteBody(request.Body, version, keepContextManagement)
	request.ContentLength = -1
	request.GetBody = nil
	return nil
}

func (*Transformer) TransformResponse(*http.Response, *controlv1.ExecutionPlan, *requeststate.State) error {
	return nil
}

func rewriteBody(source io.ReadCloser, version string, keepContextManagement bool) io.ReadCloser {
	reader, writer := io.Pipe()
	go func() {
		defer source.Close()
		err := rewriteTopLevelObject(writer, bufio.NewReaderSize(source, 32<<10), version, keepContextManagement)
		_ = writer.CloseWithError(err)
	}()
	return reader
}

func rewriteTopLevelObject(output io.Writer, input *bufio.Reader, version string, keepContextManagement bool) error {
	first, err := streamjson.ReadNonSpace(input)
	if err != nil || first != '{' {
		return fmt.Errorf("Anthropic Vertex body must be a JSON object")
	}
	if _, err := io.WriteString(output, "{"); err != nil {
		return err
	}
	firstOutput := true
	sawVersion := false
	afterComma := false
	for {
		next, err := streamjson.ReadNonSpace(input)
		if err != nil {
			return fmt.Errorf("read Anthropic Vertex object: %w", err)
		}
		if next == '}' {
			if afterComma {
				return fmt.Errorf("Anthropic Vertex object contains a trailing comma")
			}
			break
		}
		if next != '"' {
			return fmt.Errorf("Anthropic Vertex object contains an invalid field name")
		}
		rawKey, key, err := streamjson.ReadString(input, next)
		if err != nil {
			return err
		}
		colon, err := streamjson.ReadNonSpace(input)
		if err != nil || colon != ':' {
			return fmt.Errorf("Anthropic Vertex object field %q is missing a colon", key)
		}

		writeField := key != "model" && (key != "context_management" || keepContextManagement)
		normalizeVersion := key == "anthropic_version"
		if normalizeVersion {
			writeField = !sawVersion
			sawVersion = true
		}
		if writeField {
			if !firstOutput {
				if _, err := io.WriteString(output, ","); err != nil {
					return err
				}
			}
			firstOutput = false
			if normalizeVersion {
				if _, err := io.WriteString(output, `"anthropic_version":`+strconv.Quote(version)); err != nil {
					return err
				}
			} else {
				if _, err := output.Write(rawKey); err != nil {
					return err
				}
				if _, err := io.WriteString(output, ":"); err != nil {
					return err
				}
			}
		}
		valueOutput := io.Discard
		if writeField && !normalizeVersion {
			valueOutput = output
		}
		delimiter, err := streamjson.CopyValue(input, valueOutput)
		if err != nil {
			return fmt.Errorf("transform Anthropic Vertex field %q: %w", key, err)
		}
		if delimiter == '}' {
			break
		}
		afterComma = true
	}
	if !sawVersion {
		if !firstOutput {
			if _, err := io.WriteString(output, ","); err != nil {
				return err
			}
		}
		if _, err := io.WriteString(output, `"anthropic_version":`+strconv.Quote(version)); err != nil {
			return err
		}
	}
	if _, err := io.WriteString(output, "}"); err != nil {
		return err
	}
	if err := streamjson.EnsureEOF(input); err != nil {
		return fmt.Errorf("Anthropic Vertex body: %w", err)
	}
	return nil
}

func tokenListContains(list, token string) bool {
	for _, candidate := range strings.Split(list, ",") {
		if strings.TrimSpace(candidate) == token {
			return true
		}
	}
	return false
}

var (
	_ caddy.Module                          = (*Transformer)(nil)
	_ protocoltransform.Transformer         = (*Transformer)(nil)
	_ protocoltransform.ModelRewriteOwner   = (*Transformer)(nil)
	_ protocoltransform.ClientAddressPolicy = (*Transformer)(nil)
)
