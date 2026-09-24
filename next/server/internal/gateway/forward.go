package gateway

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
)

const (
	maxSSELine      = 16 << 20
	maxUsageJSONBuf = 32 << 20
)

var errLineTooLong = errors.New("sse line too long")

// convertError is a failure converting the upstream response to the client
// protocol.
type convertError struct{ err error }

func (e *convertError) Error() string { return "response conversion failed: " + e.err.Error() }
func (e *convertError) Unwrap() error { return e.err }

// forward relays a successful upstream response. From here on bytes reach
// the client, so the attempt is final whatever happens. On a converting
// route the response is converted to the endpoint protocol; usage is always
// read from the upstream response with the upstream protocol's rules.
func (c *call) forward(ctx context.Context, rt *typeRoute, resp *http.Response) attemptResult {
	u := newUsageAcc(rt.usage)
	c.rec.StatusCode = resp.StatusCode
	c.rec.Success = true
	c.rec.ErrorType = ""
	c.rec.ErrorMessage = ""
	var err error
	switch {
	case isSSE(resp.Header.Get("Content-Type")):
		err = c.forwardSSE(ctx, resp, u, rt.conv)
	case rt.conv != nil:
		err = c.forwardJSONConverted(resp, u, rt.conv)
	default:
		err = c.forwardJSON(resp, u)
	}
	c.rec.Tokens = u.tokens()
	if len(u.metrics) > 0 {
		c.rec.Metrics = u.metrics
	}
	if c.rec.UpstreamModel == "" && u.model != "" && u.model != c.model {
		c.rec.UpstreamModel = u.model
	}
	var cerr *convertError
	switch {
	case err == nil:
		if u.streamError != "" {
			c.rec.Success = false
			c.rec.ErrorType = errTypeUpstream
			c.rec.ErrorMessage = truncateUTF8(u.streamError, 1000)
		}
	case errors.As(err, &cerr):
		c.rec.Success = false
		c.rec.ErrorType = errTypeUpstream
		c.rec.ErrorMessage = truncateUTF8(err.Error(), 1000)
		slog.WarnContext(ctx, "gateway: response conversion failed", "request_id", c.rid,
			"from", rt.upstream, "to", c.ep.Protocol, "err", cerr.err)
		if !c.c.Writer.Written() {
			c.rec.StatusCode = http.StatusBadGateway
			writeError(c.c, c.format, &gwError{Status: http.StatusBadGateway, Code: "upstream_error",
				Message: "upstream response could not be converted"})
		}
	case ctx.Err() != nil || errors.Is(err, errClientGone):
		c.rec.Success = false
		c.rec.ErrorType = errTypeClientCanceled
		c.rec.StatusCode = statusClientClosed
		c.rec.ErrorMessage = "client canceled"
	default:
		c.rec.Success = false
		c.rec.ErrorType = errTypeUpstream
		c.rec.ErrorMessage = truncateUTF8("upstream stream interrupted: "+err.Error(), 1000)
		slog.WarnContext(ctx, "gateway: upstream response interrupted", "request_id", c.rid, "err", err)
	}
	return attemptResult{kind: attemptDone}
}

var errClientGone = errors.New("client connection closed")

func isSSE(ct string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(ct)), "text/event-stream")
}

func (c *call) forwardJSON(resp *http.Response, u *usageAcc) error {
	w := c.c.Writer
	ct := resp.Header.Get("Content-Type")
	if ct == "" {
		ct = "application/json"
	}
	w.Header().Set("Content-Type", ct)
	w.WriteHeader(resp.StatusCode)
	var buf bytes.Buffer
	overflow := false
	chunk := make([]byte, 32<<10)
	for {
		n, rerr := resp.Body.Read(chunk)
		if n > 0 {
			if _, werr := w.Write(chunk[:n]); werr != nil {
				return errClientGone
			}
			if !overflow {
				if buf.Len()+n > maxUsageJSONBuf {
					overflow = true
					buf = bytes.Buffer{}
				} else {
					buf.Write(chunk[:n])
				}
			}
		}
		if rerr == io.EOF {
			break
		}
		if rerr != nil {
			return rerr
		}
	}
	w.Flush()
	if overflow {
		slog.Warn("gateway: response too large for usage extraction", "request_id", c.rid)
		return nil
	}
	u.applyJSON(buf.Bytes())
	return nil
}

// forwardJSONConverted reads the whole upstream response, extracts usage
// from it (upstream rules) and writes the converted body. Nothing is written
// when reading or converting fails.
func (c *call) forwardJSONConverted(resp *http.Response, u *usageAcc, conv convert.Converter) error {
	raw, err := io.ReadAll(io.LimitReader(resp.Body, maxUsageJSONBuf+1))
	if err != nil {
		return err
	}
	if len(raw) > maxUsageJSONBuf {
		return &convertError{err: errors.New("upstream response too large")}
	}
	u.applyJSON(raw)
	out, err := conv.Response(raw)
	if err != nil {
		return &convertError{err: err}
	}
	w := c.c.Writer
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	if _, err := w.Write(out); err != nil {
		return errClientGone
	}
	w.Flush()
	return nil
}

// forwardSSE relays the event stream, flushing at every event boundary and
// whenever the upstream has nothing buffered, and extracts usage from the
// upstream events on the way. Without a converter lines pass through
// verbatim; with one each upstream event goes through the stream converter
// and its output events are written instead. When the client asked for a
// JSON array stream (jsonArrayStream) the event data are written as the
// elements of one JSON array instead of SSE.
func (c *call) forwardSSE(ctx context.Context, resp *http.Response, u *usageAcc, conv convert.Converter) error {
	arr := c.jsonArrayStream()
	w := c.c.Writer
	h := w.Header()
	if arr {
		h.Set("Content-Type", "application/json; charset=utf-8")
	} else {
		h.Set("Content-Type", "text/event-stream")
		h.Set("Cache-Control", "no-cache")
	}
	h.Set("X-Accel-Buffering", "no")
	w.WriteHeader(resp.StatusCode)
	w.Flush()

	var sc convert.StreamConverter
	if conv != nil {
		sc = conv.NewStream()
	}
	passthrough := sc == nil && !arr
	var out []byte
	elements := 0
	emit := func(evs []convert.Event, err error) error {
		if err != nil {
			return &convertError{err: err}
		}
		out = out[:0]
		for _, ev := range evs {
			if !arr {
				out = convert.AppendSSE(out, ev)
				continue
			}
			d := bytes.TrimSpace(ev.Data)
			if len(d) == 0 || string(d) == "[DONE]" {
				continue
			}
			if elements == 0 {
				out = append(out, '[')
			} else {
				out = append(out, ",\r\n"...)
			}
			elements++
			out = append(out, d...)
		}
		if len(out) == 0 {
			return nil
		}
		if _, werr := w.Write(out); werr != nil {
			return errClientGone
		}
		w.Flush()
		return nil
	}
	closeArray := func() error {
		if !arr {
			return nil
		}
		end := "]"
		if elements == 0 {
			end = "[]"
		}
		if _, werr := w.Write([]byte(end)); werr != nil {
			return errClientGone
		}
		return nil
	}

	br := bufio.NewReaderSize(resp.Body, 64<<10)
	var event string
	var data []byte
	dispatch := func() error {
		if event == "" && len(data) == 0 {
			return nil
		}
		if c.rec.FirstTokenMs == 0 && len(data) > 0 {
			c.rec.FirstTokenMs = max(1, int(c.g.now().Sub(c.start)/time.Millisecond))
		}
		u.applySSE(event, data)
		var err error
		switch {
		case sc != nil:
			err = emit(sc.Event(convert.Event{Name: event, Data: data}))
		case arr:
			err = emit([]convert.Event{{Name: event, Data: data}}, nil)
		}
		event, data = "", data[:0]
		return err
	}
	for {
		line, rerr := readLine(br, maxSSELine)
		if len(line) > 0 {
			if passthrough {
				if _, werr := w.Write(line); werr != nil {
					return errClientGone
				}
			}
			t := bytes.TrimRight(line, "\r\n")
			switch {
			case len(t) == 0:
				if err := dispatch(); err != nil {
					return err
				}
			case bytes.HasPrefix(t, []byte("event:")):
				event = strings.TrimSpace(string(t[len("event:"):]))
			case bytes.HasPrefix(t, []byte("data:")):
				d := t[len("data:"):]
				if len(d) > 0 && d[0] == ' ' {
					d = d[1:]
				}
				if len(data) > 0 {
					data = append(data, '\n')
				}
				data = append(data, d...)
			}
			if passthrough && (len(t) == 0 || br.Buffered() == 0) {
				w.Flush()
			}
		}
		if rerr != nil {
			derr := dispatch()
			if sc != nil && derr == nil {
				derr = emit(sc.Flush())
			}
			if derr == nil && rerr == io.EOF {
				// An interrupted stream leaves the array open, so the
				// client notices the truncation.
				derr = closeArray()
			}
			w.Flush()
			if derr != nil {
				return derr
			}
			if rerr == io.EOF {
				return nil
			}
			if ctx.Err() != nil {
				return errClientGone
			}
			return rerr
		}
	}
}

// jsonArrayStream reports whether the client of a streaming Gemini endpoint
// expects Google's default stream framing (one JSON array whose elements
// arrive progressively) rather than SSE (?alt=sse). Upstream events are
// re-framed accordingly.
func (c *call) jsonArrayStream() bool {
	return c.ep.Protocol == protocolGeminiStream && !strings.EqualFold(c.c.Query("alt"), "sse")
}

const protocolGeminiStream = manifest.PlatformGemini + ".stream_generate"

// readLine returns the next line including its '\n' (the last line may lack
// it). The slice is only valid until the next read.
func readLine(br *bufio.Reader, limit int) ([]byte, error) {
	line, err := br.ReadSlice('\n')
	if !errors.Is(err, bufio.ErrBufferFull) {
		return line, err
	}
	buf := append([]byte(nil), line...)
	for {
		line, err = br.ReadSlice('\n')
		buf = append(buf, line...)
		if len(buf) > limit {
			return buf, errLineTooLong
		}
		if !errors.Is(err, bufio.ErrBufferFull) {
			return buf, err
		}
	}
}

// ---------------------------------------------------------------- usage extraction

// usageAcc applies the platform's declarative usage rules. Later values win,
// so cumulative counters (message_delta) override earlier ones.
type usageAcc struct {
	rules manifest.UsageRules

	input, output, cacheRead, cacheCreation, cacheCreation1h int64

	model       string
	metrics     map[string]any
	streamError string
}

func newUsageAcc(rules manifest.UsageRules) *usageAcc { return &usageAcc{rules: rules} }

func (u *usageAcc) set(field string, r gjson.Result) {
	if !r.Exists() || r.Type == gjson.Null {
		return
	}
	switch field {
	case manifest.UsageModel:
		u.model = r.String()
	case manifest.UsageInputTokens:
		u.input = r.Int()
	case manifest.UsageOutputTokens:
		u.output = r.Int()
	case manifest.UsageCacheReadTokens:
		u.cacheRead = r.Int()
	case manifest.UsageCacheCreationTokens:
		u.cacheCreation = r.Int()
	case manifest.UsageCacheCreation1h:
		u.cacheCreation1h = r.Int()
	default:
		u.setMetric(field, r, "")
	}
}

func (u *usageAcc) setMetric(key string, r gjson.Result, typ string) {
	if !r.Exists() || r.Type == gjson.Null {
		return
	}
	var v any
	switch {
	case typ == "boolean" || r.Type == gjson.True || r.Type == gjson.False:
		v = r.Bool()
	case typ == "number" || r.Type == gjson.Number:
		v = r.Float()
	default:
		v = r.String()
	}
	if u.metrics == nil {
		u.metrics = map[string]any{}
	}
	u.metrics[key] = v
}

func (u *usageAcc) applyFacts(doc []byte) {
	for key, f := range u.rules.Facts {
		if f.Path != "" {
			u.setMetric(key, gjson.GetBytes(doc, f.Path), f.Type)
		}
	}
}

// applyJSON applies the JSON rules to a response body. A top-level array
// (Gemini's JSON array stream) applies them to each element in order.
func (u *usageAcc) applyJSON(body []byte) {
	if len(body) == 0 || !gjson.ValidBytes(body) {
		return
	}
	if r := gjson.ParseBytes(body); r.IsArray() {
		r.ForEach(func(_, v gjson.Result) bool {
			if v.IsObject() {
				u.applyJSONDoc([]byte(v.Raw))
			}
			return true
		})
		return
	}
	u.applyJSONDoc(body)
}

func (u *usageAcc) applyJSONDoc(body []byte) {
	if m := u.rules.JSON; m != nil {
		for field, path := range m.Map {
			u.set(field, gjson.GetBytes(body, path))
		}
	}
	u.applyFacts(body)
}

func (u *usageAcc) applySSE(event string, data []byte) {
	if len(data) == 0 || !gjson.ValidBytes(data) {
		return
	}
	name := event
	if name == "" {
		name = gjson.GetBytes(data, "type").String()
	}
	// Anthropic/Responses name error events; OpenAI chat and Gemini send an
	// unnamed {"error": {...}} chunk.
	if name == "error" || (name == "" && gjson.GetBytes(data, "error").IsObject()) {
		msg := gjson.GetBytes(data, "error.message").String()
		if msg == "" {
			msg = gjson.GetBytes(data, "message").String()
		}
		if msg == "" {
			msg = string(data)
		}
		u.streamError = "upstream stream error: " + msg
	}
	for _, rule := range u.rules.SSE {
		if rule.Event != "" && rule.Event != name {
			continue
		}
		for field, path := range rule.Map {
			u.set(field, gjson.GetBytes(data, path))
		}
	}
	u.applyFacts(data)
}

// tokens converts to core.UsageTokens. cache_creation_tokens is the total
// cache write (5 minute + 1 hour); the core counts the two separately.
func (u *usageAcc) tokens() core.UsageTokens {
	cc := u.cacheCreation - u.cacheCreation1h
	if cc < 0 {
		cc = 0
	}
	return core.UsageTokens{
		Input:           max(u.input, 0),
		Output:          max(u.output, 0),
		CacheRead:       max(u.cacheRead, 0),
		CacheCreation:   cc,
		CacheCreation1h: max(u.cacheCreation1h, 0),
	}
}

// readPrefix reads at most n bytes of r.
func readPrefix(r io.Reader, n int64) ([]byte, error) {
	return io.ReadAll(io.LimitReader(r, n))
}
