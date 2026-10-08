package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func searchFixture() Object {
	return Object{"type": "search_result", "source": "kb://one", "title": "Same title", "content": []any{Object{"type": "text", "text": "SAME_SOURCE_TEXT", "cache_control": Object{"type": "ephemeral", "ttl": "5m"}}}, "citations": Object{"enabled": true}}
}
func searchCitationFixture() Object {
	return Object{"type": "search_result_location", "source": "kb://one", "title": "Same title", "cited_text": "SAME_SOURCE_TEXT", "search_result_index": 0, "start_block_index": 0, "end_block_index": 1}
}

func TestSearchResultAndImageTransformationsValidation(t *testing.T) {
	for _, config := range []any{nil, Object{}, Object{"oversized_image": "error"}, Object{"oversized_image": "downsize"}} {
		if err := checkImageTransformations(config); err != nil {
			t.Fatal(err)
		}
	}
	for _, config := range []any{true, Object{"oversized_image": nil}, Object{"oversized_image": "resize"}, Object{"unrecognized": true}} {
		if err := checkImageTransformations(config); err == nil {
			t.Fatal("invalid transformations admitted")
		}
	}
	first, second := searchFixture(), searchFixture()
	second["citations"] = Object{"enabled": false}
	body := basic()
	body["messages"] = []any{Object{"role": "user", "content": []any{first, second}}}
	if _, err := parsePolicyRequest(mustServerJSON(body), nil); err == nil {
		t.Fatal("mixed search citation policy admitted")
	}
	second["citations"] = Object{"enabled": true}
	second["source"] = "kb://two"
	r, err := parsePolicyRequest(mustServerJSON(body), nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(historyDocuments(r.Messages[0].Content)) != 2 {
		t.Fatal("search source corpus lost")
	}
	changed, _ := jsonCopyObject(first)
	changed["source"] = "kb://two"
	if digest(historySkeleton([]Object{first})) == digest(historySkeleton([]Object{changed})) {
		t.Fatal("source identity not bound")
	}
}

func TestRealCLISearchImageMetadata(t *testing.T) {
	for _, mode := range []string{"search", "search-tool", "image", "image-tool", "image-document", "image-null", "image-empty", "image-downsize", "image-base64", "image-base64-tool", "image-base64-document"} {
		t.Run(mode, func(t *testing.T) {
			block := Object{"type": "image", "source": Object{"type": "url", "url": "https://example.invalid/image.png"}, "transformations": Object{"oversized_image": "error"}}
			switch mode {
			case "image-null":
				block["transformations"] = nil
			case "image-empty":
				block["transformations"] = Object{}
			case "image-downsize":
				block["transformations"] = Object{"oversized_image": "downsize"}
			case "image-base64", "image-base64-tool", "image-base64-document":
				block["source"] = Object{"type": "base64", "media_type": "image/png", "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jU1sAAAAASUVORK5CYII="}
			}
			search := strings.HasPrefix(mode, "search")
			if search {
				block = searchFixture()
			}
			if mode == "image-document" || mode == "image-base64-document" {
				block = Object{"type": "document", "source": Object{"type": "content", "content": []any{block}}}
			}
			wires := make(chan Object, 8)
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				wire, _ := decodeObject(raw)
				wires <- wire
				text := Object{"type": "text", "text": "ANSWER"}
				if search {
					text["citations"] = []any{searchCitationFixture()}
				}
				writeSurfaceFixture(w, str(wire, "model"), []Object{text})
			})
			endpoint, fixtureCache := newThinkingOutputFixture(t, handler)
			body := basic()
			body["model"] = "claude-opus-5-5"
			body["messages"] = []any{Object{"role": "user", "content": []any{block, Object{"type": "text", "text": "READ_SOURCE"}}}}
			if strings.HasSuffix(mode, "-tool") {
				body["tools"] = []any{Object{"name": "lookup", "input_schema": Object{"type": "object"}}}
				body["messages"] = []any{Object{"role": "user", "content": "lookup"}, Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "tu_source", "name": "lookup", "input": Object{}}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "tu_source", "content": []any{block}}}}}
			}
			post := func(endpoint, label string) Object {
				t.Helper()
				raw, _ := json.Marshal(body)
				res, err := http.Post(endpoint+"/v1/messages", "application/json", bytes.NewReader(raw))
				if err != nil {
					t.Fatal(err)
				}
				defer res.Body.Close()
				out, _ := io.ReadAll(res.Body)
				if res.StatusCode != 200 || bytes.Contains(out, []byte(`"type":"error"`)) {
					_ = filepath.Walk(filepath.Join(filepath.Dir(fixtureCache.dir), "request-logs"), func(path string, info os.FileInfo, e error) error {
						if e == nil && !info.IsDir() && strings.Contains(info.Name(), "upstream-refused") {
							raw, _ := os.ReadFile(path)
							value, _ := decodeObject(raw)
							t.Logf("synthetic refused messages: %#v", value["messages"])
						}
						return nil
					})
					t.Fatalf("%s HTTP%d %s", label, res.StatusCode, out)
				}
				wire := <-wires
				if !messageProbeContainsBlock(wire, block) {
					for _, value := range wire["messages"].([]any) {
						m := value.(Object)
						content, _ := historyContent(m["content"])
						for _, b := range content {
							if str(b, "type") == "image" {
								t.Logf("synthetic image wire: %#v", b)
							}
						}
					}
					t.Fatalf("%s exact source/transformations/cache lost", label)
				}
				if label != "new" && search {
					assertCitationOnWire(t, wire, []any{searchCitationFixture()})
				}
				if body["stream"] == true {
					if !bytes.Contains(out, []byte("event: message_stop")) {
						t.Fatal("stream incomplete")
					}
					return nil
				}
				answer, err := decodeObject(out)
				if err != nil {
					t.Fatal(err)
				}
				return answer
			}
			first := post(endpoint, "new")
			base := append(body["messages"].([]any), Object{"role": "assistant", "content": first["content"]})
			body["messages"] = append(append([]any{}, base...), Object{"role": "user", "content": "continue"})
			post(endpoint, "continue")
			body["messages"] = append(append([]any{}, base...), Object{"role": "user", "content": "branch"})
			post(endpoint, "rollback")
			cold, _ := newThinkingOutputFixture(t, handler)
			post(cold, "cold")
			body["stream"] = true
			post(endpoint, "SSE")
		})
	}
}

func TestSearchCitationHistoryRejectsReorderedSameTextSources(t *testing.T) {
	one, two := searchFixture(), searchFixture()
	two["source"] = "kb://two"
	r := &Request{Messages: []Message{
		{Role: "user", Content: []Object{one, two}},
		{Role: "assistant", Content: []Object{{"type": "text", "text": "same"}}},
		{Role: "user", Content: []Object{{"type": "text", "text": "cite earlier sources"}}},
		{Role: "assistant", Content: []Object{{"type": "text", "text": "same", "citations": []any{searchCitationFixture()}}}},
		{Role: "user", Content: []Object{{"type": "text", "text": "next"}}},
	}}
	for _, mutation := range []string{"unchanged", "source", "title", "order", "text"} {
		wire, _ := jsonCopyObject(Object{"messages": r.Messages})
		ms := wire["messages"].([]any)
		cited := ms[3].(Object)["content"].([]any)[0].(Object)
		delete(cited, "citations")
		content := ms[0].(Object)["content"].([]any)
		first := content[0].(Object)
		switch mutation {
		case "source":
			first["source"] = "kb://changed"
		case "title":
			first["title"] = "changed"
		case "order":
			content[0], content[1] = content[1], content[0]
		case "text":
			first["content"].([]any)[0].(Object)["text"] = "changed"
		}
		err := restoreHistoryCitations(r, wire)
		if mutation == "unchanged" && err != nil || mutation != "unchanged" && err == nil {
			t.Fatal(mutation, err)
		}
	}
}
