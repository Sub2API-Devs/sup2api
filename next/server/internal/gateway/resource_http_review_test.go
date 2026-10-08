package gateway

import (
	"bytes"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"strings"
	"testing"
)

func TestReviewFilesProtocolAndResponseHeaders(t *testing.T) {
	for _, status := range []int{200, 429} {
		t.Run(http.StatusText(status), func(t *testing.T) {
			e, _, tr := resourceTestEnv(t)
			tr.fn = func(r *http.Request) (*http.Response, error) {
				if r.Header.Get("Anthropic-Version") != "2099-01-01" || strings.Join(r.Header.Values("Anthropic-Beta"), ",") != "feature-a,feature-b" {
					t.Errorf("client protocol controls changed: %v", r.Header)
				}
				var response *http.Response
				if status == 200 {
					response = resourceTestResponse(200, fileTestMetadata())
				} else {
					response = resourceTestResponse(status, `{"type":"error","error":{"type":"rate_limit_error","message":"try later"}}`)
				}
				response.Header.Set("Request-Id", "upstream_request")
				response.Header.Set("Anthropic-Ratelimit-Requests-Remaining", "0")
				response.Header.Set("Anthropic-Request-Id", "legacy_alias")
				response.Header.Set("Set-Cookie", "must_not_escape")
				response.Header.Set("X-CCGateway-Resource-Principal", "must_not_escape")
				return response, nil
			}
			body, ct := fileMultipart(t, "abc")
			req, _ := http.NewRequest("POST", e.srv.URL+"/v1/files", bytes.NewReader(body))
			req.Header.Set("X-Api-Key", testKey)
			req.Header.Set("Content-Type", ct)
			req.Header.Set("Anthropic-Version", "2099-01-01")
			req.Header.Add("Anthropic-Beta", "feature-a")
			req.Header.Add("Anthropic-Beta", "feature-b")
			res, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatal(err)
			}
			defer res.Body.Close()
			raw, _ := io.ReadAll(res.Body)
			if res.StatusCode != status || res.Header.Get("Request-Id") != "upstream_request" || res.Header.Get("Anthropic-Ratelimit-Requests-Remaining") != "0" || res.Header.Get("Anthropic-Request-Id") != "legacy_alias" {
				t.Fatalf("status/headers lost %d %s %v", res.StatusCode, raw, res.Header)
			}
			if res.Header.Get("Set-Cookie") != "" || res.Header.Get("X-CCGateway-Resource-Principal") != "" {
				t.Fatal("internal/unrelated headers leaked")
			}
		})
	}
}

func TestReviewStableFileNameReachesProviderUnchanged(t *testing.T) {
	for _, name := range []string{"absent", "", "a/b.txt", `a\b.txt`, "bad?.txt"} {
		t.Run(name, func(t *testing.T) {
			e, _, tr := resourceTestEnv(t)
			tr.fn = func(r *http.Request) (*http.Response, error) {
				mr, err := r.MultipartReader()
				if err != nil {
					return nil, err
				}
				part, err := mr.NextPart()
				if err != nil {
					return nil, err
				}
				_, params, err := mime.ParseMediaType(part.Header.Get("Content-Disposition"))
				if err != nil {
					return nil, err
				}
				actual, present := params["filename"]
				if (name == "absent" && present) || (name != "absent" && (!present || actual != name)) {
					t.Errorf("filename was rewritten: present=%v value=%q", present, actual)
				}
				data, _ := io.ReadAll(part)
				if string(data) != "abc" {
					t.Error("file bytes changed")
				}
				return resourceTestResponse(200, fileTestMetadata()), nil
			}
			var buf bytes.Buffer
			mw := multipart.NewWriter(&buf)
			params := map[string]string{"name": "file"}
			if name != "absent" {
				params["filename"] = name
			}
			head := textproto.MIMEHeader{}
			head.Set("Content-Disposition", mime.FormatMediaType("form-data", params))
			part, _ := mw.CreatePart(head)
			_, _ = part.Write([]byte("abc"))
			_ = mw.Close()
			status, raw := fileRequest(t, e, "POST", "/v1/files", testKey, "", buf.Bytes(), mw.FormDataContentType())
			if status != 200 {
				t.Fatalf("stable upload rejected %d %s", status, raw)
			}
		})
	}
}

func TestReviewFilesManagedScopeInSecondBetaRejected(t *testing.T) {
	e, _, tr := resourceTestEnv(t)
	req, _ := http.NewRequest("GET", e.srv.URL+"/v1/files", nil)
	req.Header.Set("X-Api-Key", testKey)
	req.Header.Add("Anthropic-Beta", "feature-a")
	req.Header.Add("Anthropic-Beta", "managed-agents-scope-fixture")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != 400 || tr.calls != 0 {
		t.Fatal("scope in second header bypassed admission", res.StatusCode)
	}
}

func TestReviewFilesAmbiguousScopeAndVersionRejected(t *testing.T) {
	for _, header := range []string{"Anthropic-Workspace-Id", "Anthropic-Version"} {
		t.Run(header, func(t *testing.T) {
			e, _, tr := resourceTestEnv(t)
			req, _ := http.NewRequest("GET", e.srv.URL+"/v1/files", nil)
			req.Header.Set("X-Api-Key", testKey)
			if header == "Anthropic-Workspace-Id" {
				req.Header.Add(header, "")
				req.Header.Add(header, "workspace_fixture")
			} else {
				req.Header.Add(header, "2023-06-01")
				req.Header.Add(header, "2099-01-01")
			}
			res, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatal(err)
			}
			defer res.Body.Close()
			if res.StatusCode != 400 || tr.calls != 0 {
				t.Fatalf("ambiguous %s silently accepted: %d", header, res.StatusCode)
			}
		})
	}
}
