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
)

const (
	maxSSELine      = 16 << 20
	maxUsageJSONBuf = 32 << 20
)

var errLineTooLong = errors.New("sse line too long")

// forward relays a successful upstream response. From here on bytes reach
// the client, so the attempt is final whatever happens.
func (c *call) forward(ctx context.Context, pb core.PlatformBinding, resp *http.Response) attemptResult {
	u := newUsageAcc(pb.Platform.Usage)
	c.rec.StatusCode = resp.StatusCode
	c.rec.Success = true
	c.rec.ErrorType = ""
	c.rec.ErrorMessage = ""
	var err error
	if isSSE(resp.Header.Get("Content-Type")) {
		err = c.forwardSSE(ctx, resp, u)
	} else {
		err = c.forwardJSON(resp, u)
	}
	c.rec.Tokens = u.tokens()
	if len(u.metrics) > 0 {
		c.rec.Metrics = u.metrics
	}
	if c.rec.UpstreamModel == "" && u.model != "" && u.model != c.model {
		c.rec.UpstreamModel = u.model
	}
	if err != nil {
		c.rec.Success = false
		if ctx.Err() != nil || errors.Is(err, errClientGone) {
			c.rec.ErrorType = errTypeClientCanceled
			c.rec.StatusCode = statusClientClosed
			c.rec.ErrorMessage = "client canceled"
		} else {
			c.rec.ErrorType = errTypeUpstream
			c.rec.ErrorMessage = truncateUTF8("upstream stream interrupted: "+err.Error(), 1000)
			slog.WarnContext(ctx, "gateway: upstream response interrupted", "request_id", c.rid, "err", err)
		}
	} else if u.streamError != "" {
		c.rec.Success = false
		c.rec.ErrorType = errTypeUpstream
		c.rec.ErrorMessage = truncateUTF8(u.streamError, 1000)
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

// forwardSSE relays the event stream line by line, flushing at every event
// boundary and whenever the upstream has nothing buffered, and extracts usage
// from the events on the way.
func (c *call) forwardSSE(ctx context.Context, resp *http.Response, u *usageAcc) error {
	w := c.c.Writer
	h := w.Header()
	h.Set("Content-Type", "text/event-stream")
	h.Set("Cache-Control", "no-cache")
	h.Set("X-Accel-Buffering", "no")
	w.WriteHeader(resp.StatusCode)
	w.Flush()

	br := bufio.NewReaderSize(resp.Body, 64<<10)
	var event string
	var data []byte
	dispatch := func() {
		if event == "" && len(data) == 0 {
			return
		}
		if c.rec.FirstTokenMs == 0 && len(data) > 0 {
			c.rec.FirstTokenMs = max(1, int(c.g.now().Sub(c.start)/time.Millisecond))
		}
		u.applySSE(event, data)
		event, data = "", data[:0]
	}
	for {
		line, rerr := readLine(br, maxSSELine)
		if len(line) > 0 {
			if _, werr := w.Write(line); werr != nil {
				return errClientGone
			}
			t := bytes.TrimRight(line, "\r\n")
			switch {
			case len(t) == 0:
				dispatch()
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
			if len(t) == 0 || br.Buffered() == 0 {
				w.Flush()
			}
		}
		if rerr != nil {
			dispatch()
			w.Flush()
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

func (u *usageAcc) applyJSON(body []byte) {
	if len(body) == 0 || !gjson.ValidBytes(body) {
		return
	}
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
	if name == "error" {
		msg := gjson.GetBytes(data, "error.message").String()
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
