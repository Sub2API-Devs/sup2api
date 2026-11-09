// Command convert-record records real upstream replies for the conversion
// golden samples and checks converted requests against real upstreams
// (docs/CONVERT-MATRIX.md §10.1). It is run by hand against test accounts,
// never in CI.
//
// Recording (default): for every testdata/recorded/<protocol>/<case>.request.json
// it sends the request natively and writes <case>.response.json and
// <case>.stream.sse, with ids, signatures and encrypted state replaced by
// fixed fakes. error_midstream samples are hand-made and skipped.
//
//	go run ./cmd/convert-record [-protocol anthropic.messages] [-case tools]
//
// Live check: every golden sample of a pair is converted and sent to the
// upstream; the reply must be 2xx and convert completely.
//
//	go run ./cmd/convert-record -live openai.chat~anthropic.messages [-case tools_call]
//
// Upstreams come from the environment, per family: CONVERT_RECORD_OPENAI_KEY,
// CONVERT_RECORD_ANTHROPIC_KEY, CONVERT_RECORD_GEMINI_KEY and the optional
// CONVERT_RECORD_<FAMILY>_BASE_URL (official endpoints by default).
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
)

func main() {
	testdata := flag.String("testdata", "internal/gateway/convert/testdata", "the convert package's testdata directory")
	protocol := flag.String("protocol", "", "record only this upstream protocol")
	only := flag.String("case", "", "only this case")
	live := flag.String("live", "", "check the golden samples of <from>~<to> against the real upstream")
	timeout := flag.Duration("timeout", 5*time.Minute, "timeout per request")
	flag.Parse()
	run := func(ctx context.Context, f func(context.Context) error) error {
		ctx, cancel := context.WithTimeout(ctx, *timeout)
		defer cancel()
		return f(ctx)
	}
	var failed bool
	report := func(name string, err error) {
		if err != nil {
			failed = true
			log.Printf("FAIL %s: %v", name, err)
			return
		}
		log.Printf("ok   %s", name)
	}
	if *live != "" {
		for _, dir := range cases(filepath.Join(*testdata, "golden", *live, "*"), *only) {
			report(dir, run(context.Background(), func(ctx context.Context) error { return checkLive(ctx, *live, dir) }))
		}
	} else {
		pattern := filepath.Join(*testdata, "recorded", or(*protocol, "*"), or(*only, "*")+".request.json")
		for _, req := range cases(pattern, "") {
			if strings.HasPrefix(filepath.Base(req), "error_midstream.") {
				continue
			}
			report(req, run(context.Background(), func(ctx context.Context) error { return record(ctx, req) }))
		}
	}
	if failed {
		os.Exit(1)
	}
}

func or(s, def string) string {
	if s == "" {
		return def
	}
	return s
}

// cases lists the paths matching pattern, only the one named only when set.
func cases(pattern, only string) []string {
	paths, err := filepath.Glob(pattern)
	if err != nil {
		log.Fatal(err)
	}
	var out []string
	for _, p := range paths {
		if only == "" || filepath.Base(p) == only {
			out = append(out, p)
		}
	}
	if len(out) == 0 {
		log.Fatalf("nothing matches %s", pattern)
	}
	return out
}

// record sends one recorded request natively and writes its reply: a
// JSON reply and a stream for OpenAI and Anthropic, the endpoint's kind for
// Gemini.
func record(ctx context.Context, reqPath string) error {
	protocol := filepath.Base(filepath.Dir(reqPath))
	body, err := os.ReadFile(reqPath)
	if err != nil {
		return err
	}
	base := strings.TrimSuffix(reqPath, ".request.json")
	for _, stream := range streamsOf(protocol) {
		u, err := upstreamFor(protocol, modelOf(body, ""))
		if err != nil {
			return err
		}
		reply, err := u.send(ctx, withStream(protocol, body, stream))
		if err != nil {
			return err
		}
		out, name := sanitizeJSON(reply), base+".response.json"
		if stream {
			out, name = sanitizeSSE(reply), base+".stream.sse"
		}
		if err := os.WriteFile(name, out, 0o644); err != nil {
			return err
		}
	}
	return nil
}

// streamsOf lists the reply kinds recorded for a protocol.
func streamsOf(protocol string) []bool {
	switch protocol {
	case "gemini.generate":
		return []bool{false}
	case "gemini.stream_generate":
		return []bool{true}
	}
	return []bool{false, true}
}

// withStream sets the request's stream member (Gemini streams by endpoint).
func withStream(protocol string, body []byte, stream bool) []byte {
	if strings.HasPrefix(protocol, "gemini.") {
		return body
	}
	var m map[string]any
	if json.Unmarshal(body, &m) != nil {
		return body
	}
	m["stream"] = stream
	if !stream || protocol != "openai.chat" {
		delete(m, "stream_options")
	}
	out, _ := json.Marshal(m)
	return out
}

func modelOf(body []byte, def string) string {
	var m struct {
		Model string `json:"model"`
	}
	_ = json.Unmarshal(body, &m)
	return or(m.Model, def)
}

// goldenSpec is the part of a golden case.json the live check needs.
type goldenSpec struct {
	Options struct {
		Model  string `json:"model"`
		Stream bool   `json:"stream"`
	} `json:"options"`
}

// checkLive converts a golden sample's request, sends it to the real
// upstream and converts the reply back.
func checkLive(ctx context.Context, pair, dir string) error {
	from, to, _ := strings.Cut(pair, "~")
	conv, ok := convert.Default().Resolve(from, to)
	if !ok {
		return fmt.Errorf("no converter %s", pair)
	}
	in, err := os.ReadFile(filepath.Join(dir, "in.request.json"))
	if err != nil {
		return err
	}
	var spec goldenSpec
	if raw, err := os.ReadFile(filepath.Join(dir, "case.json")); err == nil {
		if err := json.Unmarshal(raw, &spec); err != nil {
			return fmt.Errorf("case.json: %w", err)
		}
	}
	model := or(spec.Options.Model, modelOf(in, ""))
	bound, out, err := conv.Prepare(in, convert.Options{Ctx: ctx, Model: model, Stream: spec.Options.Stream,
		Fetch: fetchMedia, ClaudeDefaultMaxTokens: func(string) int { return 8192 }})
	if err != nil {
		return fmt.Errorf("prepare: %w", err)
	}
	u, err := upstreamFor(to, modelOf(out, model))
	if err != nil {
		return err
	}
	reply, err := u.send(ctx, out)
	if err != nil {
		return err
	}
	if !spec.Options.Stream {
		_, err = bound.Response(reply)
		return err
	}
	sc := bound.NewStream()
	for _, ev := range splitSSE(reply) {
		if _, err := sc.Event(ev); err != nil {
			return err
		}
	}
	_, err = sc.Flush()
	return err
}
