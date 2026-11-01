package api

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"testing"
)

var genContract = flag.Bool("gen-contract", false, "rewrite testdata/api-contract from the case table")

// ---- builders ----

type C = contractCase

func strp(s string) *string { return &s }
func i64(n int64) *int64    { return &n }
func boolp(b bool) *bool    { return &b }

func get(path string) contractReq { return contractReq{Method: "GET", Path: path} }
func del(path string) contractReq { return contractReq{Method: "DELETE", Path: path} }
func js(method, path string, body any) contractReq {
	return contractReq{Method: method, Path: path, JSON: body}
}
func raw(method, path, ctype string, body []byte) contractReq {
	return contractReq{Method: method, Path: path, ContentType: ctype, BodyBase64: base64.StdEncoding.EncodeToString(body)}
}

func okKeys(status int, keys ...string) contractResp { return contractResp{Status: status, Keys: keys} }
func okBody(status int, body map[string]any, keys ...string) contractResp {
	return contractResp{Status: status, Body: body, Keys: keys}
}
func noBody(status int) contractResp { return contractResp{Status: status} }

func fail(status int, code, reason string, names ...string) contractResp {
	b := map[string]any{"error": code}
	if reason != "" {
		b["reason"] = reason
	}
	if len(names) > 0 {
		b["names"] = names
	}
	return contractResp{Status: status, Body: b}
}

var unchanged = &after{DockerUnchanged: true}

const (
	sub21  = "10.52.74.0/24"
	app21  = "10.52.74.5"
	gw21   = "10.52.74.2"
	appImg = "ccgateway-app:1"
	imgID  = "sha256:1111111111111111111111111111111111111111111111111111111111111111"
)

var (
	ctlImg  = setupImage{Ref: "ccgateway-controller:2", Labels: map[string]string{"io.sup2api.ccgateway.guard-api": "1", "io.sup2api.ccgateway.shared-egress": "1"}}
	xray1   = setupImage{Ref: "ccgateway-xray:1", Labels: map[string]string{"io.sup2api.ccgateway.shared-egress": "1"}}
	xray2   = setupImage{Ref: "ccgateway-xray:2", Labels: map[string]string{"io.sup2api.ccgateway.shared-egress": "1"}}
	appImgS = setupImage{Ref: appImg}
	uplink  = setupNet{AID: "d0000000000000000", Role: "xray-uplink", Subnet: "10.117.81.0/24"}
)

// account: network, volume and a checked resolv.conf for 21.
func account() setup {
	return setup{Images: []setupImage{appImgS}, Networks: []setupNet{{AID: "21", Subnet: sub21}},
		Volumes: []setupVol{{AID: "21", Quota: true}}, Files: map[string]string{"21/resolv.conf": "ok"}}
}

func withApp(status string) setup {
	s := account()
	s.Containers = []setupCtr{{AID: "21", Status: status, IPv4: app21}}
	return s
}

func withGateway(s setup) setup {
	s.Images = append(s.Images, xray1)
	s.Networks = append(s.Networks, uplink)
	s.Gateway = &setupGw{Networks: map[string]string{"21": gw21}}
	return s
}

func tarOf(entries ...[3]string) []byte { // name, content, type ("" | "symlink:<target>" | "dir")
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	for _, e := range entries {
		h := &tar.Header{Name: e[0], Mode: 0o644, Typeflag: tar.TypeReg, Size: int64(len(e[1]))}
		switch {
		case strings.HasPrefix(e[2], "symlink:"):
			h.Typeflag, h.Linkname, h.Size = tar.TypeSymlink, strings.TrimPrefix(e[2], "symlink:"), 0
		case e[2] == "dir":
			h.Typeflag, h.Size = tar.TypeDir, 0
		}
		_ = tw.WriteHeader(h)
		if h.Typeflag == tar.TypeReg {
			_, _ = tw.Write([]byte(e[1]))
		}
	}
	_ = tw.Close()
	return buf.Bytes()
}

func gz(b []byte) []byte {
	var z bytes.Buffer
	w := gzip.NewWriter(&z)
	_, _ = w.Write(b)
	_ = w.Close()
	return z.Bytes()
}

func manifest(tags ...string) string {
	b, _ := json.Marshal([]map[string]any{{"Config": "blobs/sha256/" + strings.Repeat("a", 64), "RepoTags": tags, "Layers": []string{}}})
	return string(b)
}

func b64(s string) string { return base64.StdEncoding.EncodeToString([]byte(s)) }

func patch(s setup, f func(*setup)) setup { f(&s); return s }

// ---- the table ----

func contractCases() map[string][]C {
	m := map[string][]C{}
	add := func(dir string, cs ...C) { m[dir] = append(m[dir], cs...) }
	validApp := map[string]any{"image": appImg, "ipv4": app21, "env": map[string]string{"TZ": "UTC"}, "auth_label": "fp-1", "image_label": imgID}
	appWith := func(k string, v any) map[string]any {
		out := map[string]any{}
		for a, b := range validApp {
			out[a] = b
		}
		if v == nil {
			delete(out, k)
		} else {
			out[k] = v
		}
		return out
	}
	job := func(over map[string]any) map[string]any {
		out := map[string]any{"image": appImg, "entrypoint": []string{"sh", "-ec"}, "argv": []string{"true"}, "user": "0",
			"volume": "rw", "caps": []string{"CHOWN", "DAC_OVERRIDE"}}
		for k, v := range over {
			if v == nil {
				delete(out, k)
			} else {
				out[k] = v
			}
		}
		return out
	}
	net := func(over map[string]any) map[string]any {
		out := map[string]any{"subnet": "10.60.1.0/24", "gateway": "10.60.1.1", "policy_label": `{"allocation": "random", "pool": "10.0.0.0/8"}`}
		for k, v := range over {
			out[k] = v
		}
		return out
	}

	// ---- authentication, routing, availability ----
	authBad := map[string]string{
		"no header":        "none",
		"bare token":       testToken,
		"uppercase hex":    "Bearer " + strings.ToUpper(testToken),
		"63 digits":        "Bearer " + testToken[:63],
		"wrong token":      "Bearer " + strings.Repeat("f", 64),
		"basic scheme":     "Basic " + testToken,
		"lowercase bearer": "bearer " + testToken,
		"non ASCII":        "Bearer " + testToken[:63] + "é",
		"trailing space":   "Bearer " + testToken + " ",
	}
	keys := make([]string, 0, len(authBad))
	for k := range authBad {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		add("auth", C{Name: "401 " + k, Covers: "U6 BUG-11(fixed)", Request: contractReq{Method: "GET", Path: "/v1/inventory", Auth: authBad[k]},
			Response: fail(401, "unauthorized", ""), After: unchanged})
	}
	add("auth",
		C{Name: "401 two authorization headers", Covers: "U6", Request: contractReq{Method: "GET", Path: "/v1/inventory",
			Headers: map[string][]string{"Authorization": {"Bearer " + testToken, "Bearer " + testToken}}}, Response: fail(401, "unauthorized", "")},
		C{Name: "401 wrong source address", Covers: "U6", Request: contractReq{Method: "GET", Path: "/v1/health", Remote: "172.29.255.3:4000"},
			Response: fail(401, "unauthorized", "")},
		C{Name: "401 host loopback", Covers: "U6 N4", Request: contractReq{Method: "GET", Path: "/v1/health", Remote: "127.0.0.1:4000"},
			Response: fail(401, "unauthorized", "")},
		C{Name: "401 before 405 for unknown method", Covers: "BUG-12(fixed)", Request: contractReq{Method: "HEAD", Path: "/v1/inventory", Auth: "none"},
			Response: noBody(401)},
		C{Name: "405 after auth", Covers: "BUG-12(fixed)", Request: contractReq{Method: "PATCH", Path: "/v1/inventory"},
			Response: fail(405, "method_not_allowed", "")},
		C{Name: "404 unknown endpoint", Request: get("/v1/nothing"), Response: fail(404, "not_found", "")},
		C{Name: "403 controller unguarded", Covers: "U6 03§3.2", Setup: setup{ControllerUnguarded: true}, Request: get("/v1/inventory"),
			Response: fail(403, "forbidden", "controller_unguarded"), After: unchanged},
		C{Name: "health is allowed while unguarded", Covers: "03§3.4.1", Setup: setup{ControllerUnguarded: true}, Request: get("/v1/health"),
			Response: okBody(200, map[string]any{"controller": "unguarded"}, "version", "prefix", "features", "docker", "firewall", "controller", "starting")},
		C{Name: "503 starting", Covers: "03§2.4", Setup: setup{Starting: true}, Request: get("/v1/inventory"),
			Response: fail(503, "unavailable", "starting")},
		C{Name: "400 unknown query parameter", Covers: "03§3.3", Request: get("/v1/inventory?x=1"), Response: fail(400, "invalid_request", "")},
		C{Name: "400 invalid account key 0", Covers: "03§11.3", Request: get("/v1/accounts/0"), Response: fail(400, "invalid_request", "")},
		C{Name: "400 invalid account key 01", Request: get("/v1/accounts/01"), Response: fail(400, "invalid_request", "")},
		C{Name: "400 invalid account key 19 digits", Request: get("/v1/accounts/1234567890123456789"), Response: fail(400, "invalid_request", "")},
		C{Name: "400 invalid account key d+15", Request: get("/v1/accounts/d000000000000000"), Response: fail(400, "invalid_request", "")},
	)

	// ---- system ----
	add("health", C{Name: "200", Covers: "R17 03§3.4.1", Request: get("/v1/health"),
		Response: okBody(200, map[string]any{"prefix": "ccg", "controller": "ok", "starting": false,
			"features": []string{"account-state-v1", "exec-combined-v1", "gateway-compose-v1", "raw-inspect-v1", "jobs-v1", "load-gzip-v1", "upgrade-compose-v1"}},
			"version", "prefix", "features", "docker", "firewall", "controller", "starting")})
	add("subnets", C{Name: "200 all docker networks", Covers: "R16", Setup: patch(account(), func(s *setup) {
		s.OtherNetworks = []setupOtherNet{{Name: "ccg-control", Subnet: "172.29.255.0/29"}}
	}), Request: get("/v1/subnets"), Response: okKeys(200, "host_routes", "networks")})
	add("inventory",
		C{Name: "200", Covers: "03§3.4.3", Setup: withGateway(withApp("running")), Request: get("/v1/inventory"),
			Response: okKeys(200, "containers", "networks", "volumes")},
	)

	// ---- images ----
	add("images-inspect",
		C{Name: "200", Covers: "R10", Setup: setup{Images: []setupImage{ctlImg}}, Request: get("/v1/images/inspect?ref=ccgateway-controller:2"),
			Response: okBody(200, map[string]any{"RepoTags": []string{"ccgateway-controller:2"}}, "Id", "RepoTags", "Config")},
		C{Name: "404 image", Covers: "R10", Request: get("/v1/images/inspect?ref=ccgateway-app:404"), Response: fail(404, "not_found", "image")},
		C{Name: "400 invalid ref", Request: get("/v1/images/inspect?ref=Bad%20Ref"), Response: fail(400, "invalid_request", "")},
		C{Name: "400 repeated ref", Request: get("/v1/images/inspect?ref=a:1&ref=b:1"), Response: fail(400, "invalid_request", "")},
	)
	for _, ref := range []string{"caddy:latest", "docker.io/library/postgres:16", "ghcr.io/sub2api-devs/other:1", "ccgateway-x"} {
		add("images-pull", C{Name: "403 " + ref, Covers: "A5 03§3.6.2", Setup: setup{Pullable: []string{ref}},
			Request: js("POST", "/v1/images/pull", map[string]any{"ref": ref}), Response: fail(403, "forbidden", "image_not_allowed"), After: unchanged})
	}
	add("images-pull",
		C{Name: "204 allowed repository by tag", Covers: "R4", Setup: setup{Pullable: []string{"ghcr.io/sub2api-devs/ccgateway-app:0.1.119"}},
			Request: js("POST", "/v1/images/pull", map[string]any{"ref": "ghcr.io/sub2api-devs/ccgateway-app:0.1.119"}), Response: noBody(204)},
		C{Name: "204 any repository by digest", Covers: "03§3.6.2", Setup: setup{Pullable: []string{"caddy@sha256:" + strings.Repeat("d", 64)}},
			Request: js("POST", "/v1/images/pull", map[string]any{"ref": "caddy@sha256:" + strings.Repeat("d", 64)}), Response: noBody(204)},
		C{Name: "502 pull_failed", Covers: "R4", Request: js("POST", "/v1/images/pull", map[string]any{"ref": "ghcr.io/sub2api-devs/ccgateway-app:404"}),
			Response: fail(502, "docker_error", "pull_failed")},
		C{Name: "400 image id", Request: js("POST", "/v1/images/pull", map[string]any{"ref": imgID}), Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "400 unknown field", Covers: "03§3.3", Request: js("POST", "/v1/images/pull", map[string]any{"ref": "ccgateway-app:1", "tag": "x"}),
			Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "400 trailing JSON value", Covers: "03§3.3", Request: contractReq{Method: "POST", Path: "/v1/images/pull", ContentType: "application/json",
			Text: strp(`{"ref":"ccgateway-app:1"} {}`)}, Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "400 wrong content type", Covers: "03§3.3", Request: contractReq{Method: "POST", Path: "/v1/images/pull", ContentType: "text/plain",
			Text: strp(`{"ref":"ccgateway-app:1"}`)}, Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "413 body over 1 MiB", Covers: "03§3.3", Request: contractReq{Method: "POST", Path: "/v1/images/pull", ContentType: "application/json",
			Text: strp(`{"ref":"ccgateway-app:1"}`), Length: i64(1<<20 + 1)}, Response: fail(413, "too_large", ""), After: unchanged},
	)
	good := tarOf([3]string{"manifest.json", manifest("ccgateway-app:9"), ""}, [3]string{"blobs/sha256/" + strings.Repeat("a", 64), "{}", ""})
	add("images-load",
		C{Name: "200 tar", Covers: "R9", Setup: setup{LoadLines: []string{"Loaded image: ccgateway-app:9"}},
			Request: raw("POST", "/v1/images/load", "application/x-tar", good), Response: okKeys(200, "images")},
		C{Name: "200 gzip", Covers: "R9", Setup: setup{LoadLines: []string{"Loaded image: ccgateway-app:9"}},
			Request: raw("POST", "/v1/images/load", "application/gzip", gz(good)), Response: okKeys(200, "images")},
		C{Name: "403 caddy:latest", Covers: "A5 R9", Request: raw("POST", "/v1/images/load", "application/x-tar",
			tarOf([3]string{"manifest.json", manifest("caddy:latest"), ""})), Response: fail(403, "forbidden", "load_forbidden"), After: unchanged},
		C{Name: "403 duplicate manifest.json", Covers: "A5 X15", Request: raw("POST", "/v1/images/load", "application/x-tar",
			tarOf([3]string{"manifest.json", manifest("ccgateway-app:9"), ""}, [3]string{"manifest.json", manifest("caddy:latest"), ""})),
			Response: fail(403, "forbidden", "load_forbidden"), After: unchanged},
		C{Name: "403 ./manifest.json and manifest.json", Covers: "X15", Request: raw("POST", "/v1/images/load", "application/x-tar",
			tarOf([3]string{"./manifest.json", manifest("ccgateway-app:9"), ""}, [3]string{"manifest.json", manifest("ccgateway-app:9"), ""})),
			Response: fail(403, "forbidden", "load_forbidden"), After: unchanged},
		C{Name: "403 manifest.json symlink", Covers: "X15", Request: raw("POST", "/v1/images/load", "application/x-tar",
			tarOf([3]string{"m.json", manifest("caddy:latest"), ""}, [3]string{"manifest.json", "", "symlink:m.json"})),
			Response: fail(403, "forbidden", "load_forbidden"), After: unchanged},
		C{Name: "403 repositories names a foreign tag", Covers: "X15", Request: raw("POST", "/v1/images/load", "application/x-tar",
			tarOf([3]string{"manifest.json", manifest(), ""}, [3]string{"repositories", `{"postgres":{"16":"x"}}`, ""})),
			Response: fail(403, "forbidden", "load_forbidden"), After: unchanged},
		C{Name: "403 index.json containerd name", Covers: "X15", Request: raw("POST", "/v1/images/load", "application/x-tar",
			tarOf([3]string{"manifest.json", manifest(), ""}, [3]string{"index.json",
				`{"manifests":[{"digest":"sha256:` + strings.Repeat("b", 64) + `","annotations":{"io.containerd.image.name":"docker.io/library/caddy:latest"}}]}`, ""})),
			Response: fail(403, "forbidden", "load_forbidden"), After: unchanged},
		C{Name: "403 no manifest.json", Covers: "X15", Request: raw("POST", "/v1/images/load", "application/x-tar",
			tarOf([3]string{"index.json", `{"manifests":[]}`, ""})), Response: fail(403, "forbidden", "load_forbidden"), After: unchanged},
		C{Name: "400 xz compression", Covers: "R9", Request: raw("POST", "/v1/images/load", "application/x-tar",
			[]byte{0xfd, '7', 'z', 'X', 'Z', 0, 0, 0}), Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "400 chunked body", Covers: "03§3.3", Request: contractReq{Method: "POST", Path: "/v1/images/load", ContentType: "application/x-tar",
			BodyBase64: base64.StdEncoding.EncodeToString(good), Chunked: true}, Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "413 over 4 GiB", Covers: "R20", Request: contractReq{Method: "POST", Path: "/v1/images/load", ContentType: "application/x-tar",
			BodyBase64: base64.StdEncoding.EncodeToString(good), Length: i64(4<<30 + 1)}, Response: fail(413, "too_large", ""), After: unchanged},
		C{Name: "400 wrong content type", Request: raw("POST", "/v1/images/load", "application/octet-stream", good),
			Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "503 busy disk", Covers: "03§3.6.4", Setup: setup{DiskFull: true}, Request: raw("POST", "/v1/images/load", "application/x-tar", good),
			Response: fail(503, "busy", ""), After: unchanged},
		C{Name: "502 load_failed", Covers: "R9", Setup: setup{LoadError: "invalid tar"}, Request: raw("POST", "/v1/images/load", "application/x-tar", good),
			Response: fail(502, "docker_error", "load_failed")},
		C{Name: "502 loaded name not in archive", Covers: "03§3.6.4 step 5", Setup: setup{LoadLines: []string{"Loaded image: ccgateway-other:1"}},
			Request: raw("POST", "/v1/images/load", "application/x-tar", good), Response: fail(502, "docker_error", "load_failed")},
	)
	fileImg := setupImage{Ref: appImg, Files: map[string]string{"/usr/local/lib/version": "2.1.310", "/usr/local/lib": "<dir>",
		"/etc/link": "x"}}
	add("images-file",
		C{Name: "200 file", Covers: "R4 R20", Setup: setup{Images: []setupImage{fileImg}},
			Request:  get("/v1/images/file?ref=ccgateway-app:1&path=/usr/local/lib/version&limit=1024"),
			Response: contractResp{Status: 200, BodyBase64: b64("2.1.310"), Headers: map[string]string{"Content-Type": "application/octet-stream", "Content-Length": "7"}}},
		C{Name: "404 image", Request: get("/v1/images/file?ref=ccgateway-app:404&path=/x&limit=10"), Response: fail(404, "not_found", "image")},
		C{Name: "404 path", Covers: "R4", Setup: setup{Images: []setupImage{fileImg}}, Request: get("/v1/images/file?ref=ccgateway-app:1&path=/nope&limit=10"),
			Response: fail(404, "not_found", "path")},
		C{Name: "422 directory", Covers: "R4", Setup: setup{Images: []setupImage{fileImg}}, Request: get("/v1/images/file?ref=ccgateway-app:1&path=/usr/local/lib&limit=10"),
			Response: fail(422, "unprocessable", "not_regular_file")},
		C{Name: "422 over limit", Covers: "R4 R20", Setup: setup{Images: []setupImage{fileImg}}, Request: get("/v1/images/file?ref=ccgateway-app:1&path=/usr/local/lib/version&limit=3"),
			Response: fail(422, "unprocessable", "too_large")},
		C{Name: "400 limit 0", Request: get("/v1/images/file?ref=ccgateway-app:1&path=/x&limit=0"), Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "400 limit over 512 MiB", Request: get("/v1/images/file?ref=ccgateway-app:1&path=/x&limit=536870913"), Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "400 relative path", Request: get("/v1/images/file?ref=ccgateway-app:1&path=x&limit=1"), Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "400 dotdot path", Request: get("/v1/images/file?ref=ccgateway-app:1&path=/a/../b&limit=1"), Response: fail(400, "invalid_request", ""), After: unchanged},
	)

	// ---- accounts: queries ----
	add("accounts-get",
		C{Name: "200 full", Covers: "R1 R3 R19", Setup: withGateway(patch(withApp("running"), func(s *setup) {
			s.Containers = append(s.Containers, setupCtr{AID: "21", Role: "egress", Status: "exited", Mounts: "none"})
		})), Request: get("/v1/accounts/21"),
			Response: okBody(200, map[string]any{"gateway_attached": true, "network_foreign": []any{}},
				"app", "others", "network", "uplink", "volume", "volume_users", "network_foreign", "gateway_attached")},
		C{Name: "200 empty account", Request: get("/v1/accounts/22"), Response: okBody(200, map[string]any{"app": nil, "network": nil,
			"volume": nil, "uplink": nil, "others": []any{}, "gateway_attached": false},
			"app", "others", "network", "uplink", "volume", "volume_users", "network_foreign", "gateway_attached")},
		C{Name: "409 app owned by another account", Covers: "I5 03§3.5.1", Setup: setup{Containers: []setupCtr{{AID: "21", Owner: "22", Mounts: "none"}}},
			Request: get("/v1/accounts/21"), Response: fail(409, "conflict", "ownership_mismatch", "ccg-21-app")},
		C{Name: "409 network owned by another account", Setup: setup{Networks: []setupNet{{AID: "21", Subnet: sub21, Owner: "22"}}},
			Request: get("/v1/accounts/21"), Response: fail(409, "conflict", "ownership_mismatch", "ccg-21-net")},
		C{Name: "409 volume owned by another account", Setup: setup{Volumes: []setupVol{{AID: "21", Owner: "22"}}},
			Request: get("/v1/accounts/21"), Response: fail(409, "conflict", "ownership_mismatch", "ccg-21-data")},
		C{Name: "200 fields=state", Covers: "R2 BUG-2(fixed)", Setup: withGateway(withApp("running")), Request: get("/v1/accounts/21?fields=state"),
			Response: okKeys(200, "app", "gateway")},
		C{Name: "200 fields=state empty", Request: get("/v1/accounts/21?fields=state"), Response: okBody(200, map[string]any{"app": nil, "gateway": nil}, "app", "gateway")},
		C{Name: "409 fields=state foreign gateway", Covers: "R2 BUG-13", Setup: setup{Gateway: &setupGw{Owner: "ccg-other"}, Images: []setupImage{xray1}},
			Request: get("/v1/accounts/21?fields=state"), Response: fail(409, "conflict", "ownership_mismatch", "ccg-shared-egress")},
		C{Name: "400 fields=all", Request: get("/v1/accounts/21?fields=all"), Response: fail(400, "invalid_request", "")},
	)

	// ---- accounts: network ----
	add("accounts-network-put",
		C{Name: "201 created", Covers: "X8 03§3.5.2", Request: js("PUT", "/v1/accounts/21/network", net(nil)), Response: okKeys(201, netKeys...),
			After: &after{Recompute: false}},
		C{Name: "409 exists", Covers: "03§3.5.2", Setup: account(), Request: js("PUT", "/v1/accounts/21/network", net(map[string]any{"subnet": "10.60.1.0/24"})),
			Response: fail(409, "conflict", "exists", "ccg-21-net"), After: unchanged},
		C{Name: "409 ownership_mismatch", Setup: setup{Networks: []setupNet{{AID: "21", Subnet: sub21, Owner: "22"}}},
			Request: js("PUT", "/v1/accounts/21/network", net(nil)), Response: fail(409, "conflict", "ownership_mismatch", "ccg-21-net"), After: unchanged},
		C{Name: "409 subnet_overlap docker network", Covers: "03§3.5.2", Setup: setup{OtherNetworks: []setupOtherNet{{Name: "other", Subnet: "10.60.0.0/16"}}},
			Request: js("PUT", "/v1/accounts/21/network", net(nil)), Response: fail(409, "conflict", "subnet_overlap"), After: unchanged},
		C{Name: "409 subnet_overlap host route", Request: js("PUT", "/v1/accounts/21/network", net(map[string]any{"subnet": "192.168.100.0/24", "gateway": "192.168.100.1"})),
			Response: fail(409, "conflict", "subnet_overlap"), After: unchanged},
		C{Name: "409 subnet_overlap control network", Request: js("PUT", "/v1/accounts/21/network", net(map[string]any{"subnet": "172.29.255.0/24", "gateway": "172.29.255.1"})),
			Response: fail(409, "conflict", "subnet_overlap"), After: unchanged},
		C{Name: "403 uplink key", Covers: "03§3.5.2", Request: js("PUT", "/v1/accounts/d0000000000000000/network", net(nil)),
			Response: fail(403, "forbidden", "policy"), After: unchanged},
	)
	for name, over := range map[string]map[string]any{
		"public subnet":         {"subnet": "8.8.8.0/24", "gateway": "8.8.8.1"},
		"prefix 23":             {"subnet": "10.60.0.0/23", "gateway": "10.60.0.1"},
		"prefix 30":             {"subnet": "10.60.1.0/30", "gateway": "10.60.1.1"},
		"gateway not .1":        {"gateway": "10.60.1.2"},
		"policy_label array":    {"policy_label": "[]"},
		"policy_label too long": {"policy_label": `{"a":"` + strings.Repeat("x", 4096) + `"}`},
		"non canonical subnet":  {"subnet": "10.60.1.7/24"},
	} {
		add("accounts-network-put", C{Name: "400 " + name, Covers: "03§11.3", Request: js("PUT", "/v1/accounts/21/network", net(over)),
			Response: fail(400, "invalid_request", ""), After: unchanged})
	}
	add("accounts-network-delete",
		C{Name: "204", Covers: "R18", Setup: account(), Request: del("/v1/accounts/21/network?role=net"), Response: noBody(204), After: &after{Recompute: true}},
		C{Name: "204 legacy uplink", Setup: setup{Networks: []setupNet{{AID: "21", Role: "uplink", Subnet: "10.70.0.0/24"}}},
			Request: del("/v1/accounts/21/network?role=uplink"), Response: noBody(204)},
		C{Name: "204 after removing an exited Python helper", Covers: "R15", Setup: patch(account(), func(s *setup) {
			s.Oneshots = []setupOneshot{{Status: "exited", Network: "21"}}
		}), Request: del("/v1/accounts/21/network?role=net"), Response: noBody(204)},
		C{Name: "204 gateway is disconnected first", Covers: "03§3.5.3", Setup: withGateway(account()), Request: del("/v1/accounts/21/network?role=net"),
			Response: noBody(204)},
		C{Name: "404 network", Covers: "R18", Request: del("/v1/accounts/21/network?role=net"), Response: fail(404, "not_found", "network")},
		C{Name: "409 resource_in_use", Covers: "03§3.5.3", Setup: withApp("running"), Request: del("/v1/accounts/21/network?role=net"),
			Response: fail(409, "conflict", "resource_in_use", "ccg-21-app"), After: unchanged},
		C{Name: "409 running helper is a user", Covers: "R15", Setup: patch(account(), func(s *setup) {
			s.Oneshots = []setupOneshot{{Status: "running", Network: "21"}}
		}), Request: del("/v1/accounts/21/network?role=net"), Response: fail(409, "conflict", "resource_in_use"), After: unchanged},
		C{Name: "400 missing role", Request: del("/v1/accounts/21/network"), Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "400 role xray-uplink", Request: del("/v1/accounts/21/network?role=xray-uplink"), Response: fail(400, "invalid_request", ""), After: unchanged},
	)

	// ---- accounts: volume ----
	add("accounts-volume-put",
		C{Name: "201 created with quota", Covers: "03§3.5.4", Request: js("PUT", "/v1/accounts/21/volume", map[string]any{"size_bytes": 10 << 30}),
			Response: okBody(201, map[string]any{"created": true, "quota_supported": true}, "volume", "created", "quota_supported")},
		C{Name: "200 existing", Setup: account(), Request: js("PUT", "/v1/accounts/21/volume", map[string]any{"size_bytes": 10 << 30}),
			Response: okBody(200, map[string]any{"created": false, "quota_supported": nil}, "volume", "created", "quota_supported"), After: unchanged},
		C{Name: "201 unbounded when allowed", Covers: "03§3.5.4", Setup: setup{NoQuota: true},
			Request:  js("PUT", "/v1/accounts/21/volume", map[string]any{"size_bytes": 10 << 30, "allow_unbounded": true}),
			Response: okBody(201, map[string]any{"created": true, "quota_supported": false}, "volume", "created", "quota_supported")},
		C{Name: "503 disk_quota_unavailable", Covers: "03§3.5.4", Setup: setup{NoQuota: true},
			Request: js("PUT", "/v1/accounts/21/volume", map[string]any{"size_bytes": 10 << 30}), Response: fail(503, "disk_quota_unavailable", "")},
		C{Name: "409 ownership_mismatch", Setup: setup{Volumes: []setupVol{{AID: "21", Owner: "22"}}},
			Request: js("PUT", "/v1/accounts/21/volume", map[string]any{"size_bytes": 10 << 30}), Response: fail(409, "conflict", "ownership_mismatch", "ccg-21-data"), After: unchanged},
		C{Name: "400 under 1 GiB", Request: js("PUT", "/v1/accounts/21/volume", map[string]any{"size_bytes": 1<<30 - 1}), Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "400 over 1 TiB", Request: js("PUT", "/v1/accounts/21/volume", map[string]any{"size_bytes": 1<<40 + 1}), Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "400 not an integer", Request: js("PUT", "/v1/accounts/21/volume", map[string]any{"size_bytes": 1073741824.5}), Response: fail(400, "invalid_request", ""), After: unchanged},
	)
	add("accounts-volume-delete",
		C{Name: "204", Setup: account(), Request: del("/v1/accounts/21/volume"), Response: noBody(204)},
		C{Name: "204 after removing an exited Python helper", Covers: "R15", Setup: patch(account(), func(s *setup) {
			s.Oneshots = []setupOneshot{{Status: "exited", Volume: "21"}}
		}), Request: del("/v1/accounts/21/volume"), Response: noBody(204)},
		C{Name: "404 volume", Covers: "R18", Request: del("/v1/accounts/21/volume"), Response: fail(404, "not_found", "volume")},
		C{Name: "409 resource_in_use", Setup: withApp("exited"), Request: del("/v1/accounts/21/volume"),
			Response: fail(409, "conflict", "resource_in_use", "ccg-21-app"), After: unchanged},
	)

	// ---- accounts: app ----
	add("accounts-app-put",
		C{Name: "201 created not started", Covers: "R21 O1", Setup: account(), Request: js("PUT", "/v1/accounts/21/app", validApp),
			Response: okBody(201, map[string]any{"Name": "/ccg-21-app"}, inspectKeys...)},
		C{Name: "409 exists", Covers: "R21", Setup: withApp("exited"), Request: js("PUT", "/v1/accounts/21/app", appWith("ipv4", "10.52.74.6")),
			Response: fail(409, "conflict", "exists", "ccg-21-app"), After: unchanged},
		C{Name: "404 network", Setup: setup{Images: []setupImage{appImgS}, Volumes: []setupVol{{AID: "21"}}, Files: map[string]string{"21/resolv.conf": "ok"}},
			Request: js("PUT", "/v1/accounts/21/app", validApp), Response: fail(404, "not_found", "network"), After: unchanged},
		C{Name: "404 volume", Setup: setup{Images: []setupImage{appImgS}, Networks: []setupNet{{AID: "21", Subnet: sub21}}, Files: map[string]string{"21/resolv.conf": "ok"}},
			Request: js("PUT", "/v1/accounts/21/app", validApp), Response: fail(404, "not_found", "volume"), After: unchanged},
		C{Name: "404 image", Setup: patch(account(), func(s *setup) { s.Images = nil }), Request: js("PUT", "/v1/accounts/21/app", validApp),
			Response: fail(404, "not_found", "image"), After: unchanged},
		C{Name: "403 resolv.conf missing", Covers: "R21", Setup: patch(account(), func(s *setup) { s.Files = nil }),
			Request: js("PUT", "/v1/accounts/21/app", validApp), Response: fail(403, "forbidden", "mount_source_rejected"), After: unchanged},
		C{Name: "403 resolv.conf symlink", Covers: "A3 BUG-20(fixed)", Setup: patch(account(), func(s *setup) { s.Files = map[string]string{"21/resolv.conf": "symlink"} }),
			Request: js("PUT", "/v1/accounts/21/app", validApp), Response: fail(403, "forbidden", "mount_source_rejected"), After: unchanged},
		C{Name: "403 resolv.conf hardlink", Covers: "A4", Setup: patch(account(), func(s *setup) { s.Files = map[string]string{"21/resolv.conf": "hardlink"} }),
			Request: js("PUT", "/v1/accounts/21/app", validApp), Response: fail(403, "forbidden", "mount_source_rejected"), After: unchanged},
		C{Name: "409 network owned by another account", Setup: patch(account(), func(s *setup) { s.Networks[0].Owner = "22" }),
			Request: js("PUT", "/v1/accounts/21/app", validApp), Response: fail(409, "conflict", "ownership_mismatch", "ccg-21-net"), After: unchanged},
	)
	for name, body := range map[string]map[string]any{
		"ipv4 .0":               appWith("ipv4", "10.52.74.0"),
		"ipv4 .1":               appWith("ipv4", "10.52.74.1"),
		"ipv4 broadcast":        appWith("ipv4", "10.52.74.255"),
		"ipv4 outside subnet":   appWith("ipv4", "10.9.9.9"),
		"ipv4 in use":           appWith("ipv4", gw21),
		"env name":              appWith("env", map[string]string{"1X": "a"}),
		"env NUL":               appWith("env", map[string]string{"X": "a\x00"}),
		"image_label not an id": appWith("image_label", "ccgateway-app:1"),
		"memory 8 GiB":          appWith("memory_bytes", 8<<30),
		"unknown field":         appWith("privileged", true),
		"missing auth_label":    appWith("auth_label", nil),
	} {
		s := withGateway(account())
		add("accounts-app-put", C{Name: "400 " + name, Covers: "03§11.3", Setup: s, Request: js("PUT", "/v1/accounts/21/app", body),
			Response: fail(400, "invalid_request", ""), After: unchanged})
	}
	add("accounts-app-action",
		C{Name: "204 start", Covers: "R21 03§3.5.7", Setup: withApp("created"), Request: js("POST", "/v1/accounts/21/app/start", map[string]any{}),
			Response: noBody(204), After: &after{Recompute: true}},
		C{Name: "204 start without body", Setup: withApp("created"), Request: contractReq{Method: "POST", Path: "/v1/accounts/21/app/start"}, Response: noBody(204)},
		C{Name: "204 start already running", Setup: withApp("running"), Request: js("POST", "/v1/accounts/21/app/start", map[string]any{}), Response: noBody(204)},
		C{Name: "204 stop", Setup: withApp("running"), Request: js("POST", "/v1/accounts/21/app/stop", map[string]any{"timeout": 0}), Response: noBody(204)},
		C{Name: "204 stop already stopped", Setup: withApp("exited"), Request: js("POST", "/v1/accounts/21/app/stop", map[string]any{}), Response: noBody(204)},
		C{Name: "204 restart", Setup: withApp("running"), Request: js("POST", "/v1/accounts/21/app/restart", map[string]any{"timeout": 120}), Response: noBody(204)},
		C{Name: "403 extra mount", Covers: "03§3.5.7", Setup: patch(withApp("created"), func(s *setup) { s.Containers[0].Mounts = "extra" }),
			Request: js("POST", "/v1/accounts/21/app/start", map[string]any{}), Response: fail(403, "forbidden", "mount_source_rejected"), After: unchanged},
		C{Name: "403 resolv.conf replaced by a link", Covers: "A3", Setup: patch(withApp("created"), func(s *setup) { s.Files = map[string]string{"21/resolv.conf": "symlink"} }),
			Request: js("POST", "/v1/accounts/21/app/restart", map[string]any{}), Response: fail(403, "forbidden", "mount_source_rejected"), After: unchanged},
		C{Name: "400 timeout 121", Setup: withApp("running"), Request: js("POST", "/v1/accounts/21/app/stop", map[string]any{"timeout": 121}),
			Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "404 container", Request: js("POST", "/v1/accounts/21/app/start", map[string]any{}), Response: fail(404, "not_found", "container")},
		C{Name: "404 unknown action", Setup: withApp("running"), Request: js("POST", "/v1/accounts/21/app/pause", map[string]any{}), Response: fail(404, "not_found", ""), After: unchanged},
	)
	add("accounts-containers-delete",
		C{Name: "204 app", Covers: "R18", Setup: withApp("running"), Request: del("/v1/accounts/21/containers/app"), Response: noBody(204), After: &after{Recompute: true}},
		C{Name: "204 legacy egress", Covers: "R19", Setup: setup{Containers: []setupCtr{{AID: "21", Role: "egress-old", Mounts: "none"}}},
			Request: del("/v1/accounts/21/containers/egress-old"), Response: noBody(204)},
		C{Name: "404 container", Covers: "R18", Request: del("/v1/accounts/21/containers/app"), Response: fail(404, "not_found", "container")},
		C{Name: "409 ownership_mismatch", Covers: "A13", Setup: setup{Containers: []setupCtr{{AID: "21", Owner: "22", Mounts: "none"}}},
			Request: del("/v1/accounts/21/containers/app"), Response: fail(409, "conflict", "ownership_mismatch", "ccg-21-app"), After: unchanged},
		C{Name: "400 suffix data", Covers: "A13", Request: del("/v1/accounts/21/containers/data"), Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "400 suffix controller", Request: del("/v1/accounts/21/containers/controller"), Response: fail(400, "invalid_request", ""), After: unchanged},
	)
	add("accounts-app-exec",
		C{Name: "200 merged output", Covers: "R5", Setup: patch(withApp("running"), func(s *setup) {
			s.Exec = &setupExec{Stdout: "out\n", Stderr: "err\n", ExitCode: 3}
		}), Request: js("POST", "/v1/accounts/21/app/exec", map[string]any{"argv": []string{"sh", "-c", "x"}, "user": "0"}),
			Response: okBody(200, map[string]any{"exit_code": 3, "output": b64("out\nerr\n")}, "exit_code", "output")},
		C{Name: "409 not_running", Covers: "R5", Setup: withApp("exited"), Request: js("POST", "/v1/accounts/21/app/exec", map[string]any{"argv": []string{"true"}, "user": ""}),
			Response: fail(409, "conflict", "not_running"), After: unchanged},
		C{Name: "404 container", Request: js("POST", "/v1/accounts/21/app/exec", map[string]any{"argv": []string{"true"}, "user": ""}),
			Response: fail(404, "not_found", "container")},
		C{Name: "502 output_too_large", Covers: "03§3.5.9", Setup: patch(withApp("running"), func(s *setup) { s.Exec = &setupExec{StdoutBytes: 16<<20 + 1} }),
			Request: js("POST", "/v1/accounts/21/app/exec", map[string]any{"argv": []string{"cat"}, "user": "1000"}), Response: fail(502, "docker_error", "output_too_large")},
		C{Name: "504 exec_timeout", Covers: "03§3.5.9", Setup: patch(withApp("running"), func(s *setup) { s.Exec = &setupExec{Hang: true} }),
			Request: js("POST", "/v1/accounts/21/app/exec", map[string]any{"argv": []string{"sleep", "999"}, "user": "1000"}), Response: fail(504, "timeout", "exec_timeout")},
	)
	for name, body := range map[string]map[string]any{
		"user root":      {"argv": []string{"id"}, "user": "root"},
		"user 1000:1000": {"argv": []string{"id"}, "user": "1000:1000"},
		"argv empty":     {"argv": []string{}, "user": ""},
		"argv 257":       {"argv": make([]string, 257), "user": ""},
		"argv NUL":       {"argv": []string{"a\x00b"}, "user": ""},
	} {
		add("accounts-app-exec", C{Name: "400 " + name, Covers: "03§11.3", Setup: withApp("running"), Request: js("POST", "/v1/accounts/21/app/exec", body),
			Response: fail(400, "invalid_request", ""), After: unchanged})
	}
	withFiles := patch(withApp("exited"), func(s *setup) {
		s.Containers[0].Files = map[string]string{"/tmp/x.txt": "hello", "/work": "<dir>"}
	})
	add("accounts-app-archive-get",
		C{Name: "200 stopped container", Covers: "R6", Setup: withFiles, Request: get("/v1/accounts/21/app/archive?path=/tmp/x.txt"),
			Response: contractResp{Status: 200, Headers: map[string]string{"Content-Type": "application/x-tar"}}},
		C{Name: "404 path", Covers: "R6", Setup: withFiles, Request: get("/v1/accounts/21/app/archive?path=/nope"), Response: fail(404, "not_found", "path")},
		C{Name: "404 container", Request: get("/v1/accounts/21/app/archive?path=/tmp"), Response: fail(404, "not_found", "container")},
	)
	for name, p := range map[string]string{"relative": "tmp/x", "dotdot": "/tmp/../etc", "NUL": "/tmp/%00x", "4097 bytes": "/" + strings.Repeat("a", 4096),
		"trailing slash": "/tmp/"} {
		add("accounts-app-archive-get", C{Name: "400 " + name, Covers: "03§11.3", Setup: withFiles, Request: get("/v1/accounts/21/app/archive?path=" + p),
			Response: fail(400, "invalid_request", ""), After: unchanged})
	}
	upload := tarOf([3]string{"new.txt", "data", ""})
	add("accounts-app-archive-put",
		C{Name: "204", Covers: "R6", Setup: withFiles, Request: raw("PUT", "/v1/accounts/21/app/archive?path=/work", "application/x-tar", upload), Response: noBody(204)},
		C{Name: "404 path", Setup: withFiles, Request: raw("PUT", "/v1/accounts/21/app/archive?path=/nope", "application/x-tar", upload), Response: fail(404, "not_found", "path")},
		C{Name: "400 no Content-Length", Covers: "03§3.3", Setup: withFiles, Request: contractReq{Method: "PUT", Path: "/v1/accounts/21/app/archive?path=/work",
			ContentType: "application/x-tar", BodyBase64: base64.StdEncoding.EncodeToString(upload), Chunked: true}, Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "413 over 600 MiB", Covers: "R20", Setup: withFiles, Request: contractReq{Method: "PUT", Path: "/v1/accounts/21/app/archive?path=/work",
			ContentType: "application/x-tar", BodyBase64: base64.StdEncoding.EncodeToString(upload), Length: i64(600<<20 + 1)}, Response: fail(413, "too_large", ""), After: unchanged},
		C{Name: "400 wrong content type", Setup: withFiles, Request: raw("PUT", "/v1/accounts/21/app/archive?path=/work", "application/json", upload),
			Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "400 relative path", Setup: withFiles, Request: raw("PUT", "/v1/accounts/21/app/archive?path=work", "application/x-tar", upload),
			Response: fail(400, "invalid_request", ""), After: unchanged},
	)
	add("accounts-app-top",
		C{Name: "200", Covers: "R7", Setup: withApp("running"), Request: get("/v1/accounts/21/app/top"), Response: okKeys(200, "Titles", "Processes")},
		C{Name: "409 not_running", Setup: withApp("exited"), Request: get("/v1/accounts/21/app/top"), Response: fail(409, "conflict", "not_running")},
		C{Name: "400 ps_args not accepted", Covers: "R7", Setup: withApp("running"), Request: get("/v1/accounts/21/app/top?ps_args=aux"),
			Response: fail(400, "invalid_request", "")},
	)
	add("accounts-resolv",
		C{Name: "204 create", Covers: "R11", Setup: setup{Networks: []setupNet{{AID: "21", Subnet: sub21}}},
			Request:  js("PUT", "/v1/accounts/21/resolv", map[string]any{"nameserver": gw21}),
			Response: noBody(204), After: &after{Files: map[string]string{"21/resolv.conf": "nameserver 10.52.74.2\noptions timeout:2 attempts:2\n"}}},
		C{Name: "204 rewrite", Covers: "R11", Setup: account(), Request: js("PUT", "/v1/accounts/21/resolv", map[string]any{"nameserver": "10.52.74.3"}),
			Response: noBody(204), After: &after{Files: map[string]string{"21/resolv.conf": "nameserver 10.52.74.3\noptions timeout:2 attempts:2\n"}}},
		C{Name: "409 mount_source_replaced", Covers: "03§6.4", Setup: patch(account(), func(s *setup) { s.Files = map[string]string{"21/resolv.conf": "symlink"} }),
			Request: js("PUT", "/v1/accounts/21/resolv", map[string]any{"nameserver": gw21}), Response: fail(409, "conflict", "mount_source_replaced", "ccg-21-app")},
		C{Name: "404 network", Request: js("PUT", "/v1/accounts/21/resolv", map[string]any{"nameserver": gw21}), Response: fail(404, "not_found", "network")},
		C{Name: "400 outside subnet", Setup: account(), Request: js("PUT", "/v1/accounts/21/resolv", map[string]any{"nameserver": "8.8.8.8"}),
			Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "400 .1", Setup: account(), Request: js("PUT", "/v1/accounts/21/resolv", map[string]any{"nameserver": "10.52.74.1"}),
			Response: fail(400, "invalid_request", ""), After: unchanged},
	)
	fwBody := map[string]any{"rules": "table inet ccg_app {}\n", "default_gateway": gw21}
	add("accounts-firewall",
		C{Name: "204", Covers: "R12 A9", Setup: withGateway(withApp("running")), Request: js("PUT", "/v1/accounts/21/firewall", fwBody),
			Response: noBody(204), After: &after{Files: map[string]string{"21/app.nft": "table inet ccg_app {}\n"}, Recompute: true}},
		C{Name: "409 app not running", Setup: withGateway(withApp("exited")), Request: js("PUT", "/v1/accounts/21/firewall", fwBody),
			Response: fail(409, "conflict", "not_running"), After: unchanged},
		C{Name: "409 gateway missing", Covers: "R12", Setup: withApp("running"), Request: js("PUT", "/v1/accounts/21/firewall", fwBody),
			Response: fail(409, "conflict", "not_running", "ccg-shared-egress"), After: unchanged},
		C{Name: "502 helper_failed", Covers: "R4", Setup: patch(withGateway(withApp("running")), func(s *setup) { s.Job = &setupJob{ExitCode: 1} }),
			Request: js("PUT", "/v1/accounts/21/firewall", fwBody), Response: fail(502, "docker_error", "helper_failed")},
		C{Name: "504 job_timeout", Setup: patch(withGateway(withApp("running")), func(s *setup) { s.Job = &setupJob{Hang: true} }),
			Request: js("PUT", "/v1/accounts/21/firewall", fwBody), Response: fail(504, "timeout", "job_timeout")},
		C{Name: "400 default_gateway is the app", Covers: "03§11.3", Setup: withGateway(withApp("running")),
			Request: js("PUT", "/v1/accounts/21/firewall", map[string]any{"rules": "x", "default_gateway": app21}), Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "400 default_gateway outside", Setup: withGateway(withApp("running")),
			Request: js("PUT", "/v1/accounts/21/firewall", map[string]any{"rules": "x", "default_gateway": "10.9.9.9"}), Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "400 rules over 64 KiB", Setup: withGateway(withApp("running")),
			Request: js("PUT", "/v1/accounts/21/firewall", map[string]any{"rules": strings.Repeat("x", 64<<10+1), "default_gateway": gw21}), Response: fail(400, "invalid_request", ""), After: unchanged},
	)
	add("accounts-jobs",
		C{Name: "200 prepare volume", Covers: "D5 BUG-20(fixed) O7", Setup: patch(account(), func(s *setup) { s.Job = &setupJob{ExitCode: 0, Stdout: "{}"} }),
			Request: js("POST", "/v1/accounts/21/jobs", job(nil)), Response: okBody(200, map[string]any{"exit_code": 0, "stdout": b64("{}")}, "exit_code", "stdout")},
		C{Name: "200 nonzero exit is not an error", Covers: "03§3.5.14", Setup: patch(account(), func(s *setup) { s.Job = &setupJob{ExitCode: 7} }),
			Request:  js("POST", "/v1/accounts/21/jobs", job(map[string]any{"volume": "ro", "caps": []string{}, "user": "1000:1000"})),
			Response: okBody(200, map[string]any{"exit_code": 7, "stdout": ""}, "exit_code", "stdout")},
		C{Name: "200 probe without volume", Covers: "R8", Setup: setup{Images: []setupImage{appImgS}, Job: &setupJob{Stdout: "ok"}},
			Request:  js("POST", "/v1/accounts/21/jobs", job(map[string]any{"volume": "none", "caps": nil, "memory_bytes": 2 << 30})),
			Response: okBody(200, map[string]any{"exit_code": 0, "stdout": b64("ok")}, "exit_code", "stdout")},
		C{Name: "404 volume", Setup: setup{Images: []setupImage{appImgS}}, Request: js("POST", "/v1/accounts/21/jobs", job(nil)),
			Response: fail(404, "not_found", "volume"), After: unchanged},
		C{Name: "502 job_failed missing image", Covers: "03§3.5.14", Setup: patch(account(), func(s *setup) { s.Images = nil }),
			Request: js("POST", "/v1/accounts/21/jobs", job(nil)), Response: fail(502, "docker_error", "job_failed")},
		C{Name: "504 job_timeout", Setup: patch(account(), func(s *setup) { s.Job = &setupJob{Hang: true} }),
			Request: js("POST", "/v1/accounts/21/jobs", job(nil)), Response: fail(504, "timeout", "job_timeout")},
		C{Name: "502 output_too_large", Setup: patch(account(), func(s *setup) { s.Job = &setupJob{StdoutBytes: 64<<10 + 1} }),
			Request: js("POST", "/v1/accounts/21/jobs", job(nil)), Response: fail(502, "docker_error", "output_too_large")},
	)
	for name, over := range map[string]map[string]any{
		"caps FOWNER (D5)": {"caps": []string{"FOWNER"}},
		"caps SYS_ADMIN":   {"caps": []string{"SYS_ADMIN"}},
		"caps NET_ADMIN":   {"caps": []string{"NET_ADMIN"}},
		"ro with caps":     {"volume": "ro"},
		"user 1000":        {"user": "1000"},
		"memory 4 GiB":     {"memory_bytes": 4 << 30},
		"entrypoint 5":     {"entrypoint": []string{"a", "b", "c", "d", "e"}},
		"volume host":      {"volume": "/etc"},
		"unknown field":    {"privileged": true},
	} {
		add("accounts-jobs", C{Name: "400 " + name, Covers: "D5 A8 03§11.3", Setup: account(), Request: js("POST", "/v1/accounts/21/jobs", job(over)),
			Response: fail(400, "invalid_request", ""), After: unchanged})
	}

	// ---- gateway ----
	add("gateway-get",
		C{Name: "200 compose", Covers: "R13", Setup: withGateway(setup{}), Request: get("/v1/gateway"),
			Response: okBody(200, map[string]any{"managed_by": "compose"}, "gateway", "managed_by")},
		C{Name: "200 legacy", Covers: "D4", Setup: patch(withGateway(setup{}), func(s *setup) { s.Gateway.ManagedBy = "legacy" }), Request: get("/v1/gateway"),
			Response: okBody(200, map[string]any{"managed_by": "legacy"}, "gateway", "managed_by")},
		C{Name: "200 none", Request: get("/v1/gateway"), Response: okBody(200, map[string]any{"gateway": nil, "managed_by": ""}, "gateway", "managed_by")},
		C{Name: "409 ownership_mismatch", Covers: "R13", Setup: patch(withGateway(setup{}), func(s *setup) { s.Gateway.Owner = "ccg-gt" }), Request: get("/v1/gateway"),
			Response: fail(409, "conflict", "ownership_mismatch", "ccg-shared-egress")},
	)
	add("gateway-ensure",
		C{Name: "200 none", Covers: "R13", Setup: withGateway(setup{}), Request: js("POST", "/v1/gateway/ensure", map[string]any{}),
			Response: okBody(200, map[string]any{"action": "none"}, "gateway", "action"), After: unchanged},
		C{Name: "200 started (docker API, not compose)", Covers: "03§9.3", Setup: patch(withGateway(setup{}), func(s *setup) { s.Gateway.Status = "exited"; s.Gateway.ManagedBy = "legacy" }),
			Request: contractReq{Method: "POST", Path: "/v1/gateway/ensure"}, Response: okBody(200, map[string]any{"action": "started"}, "gateway", "action")},
		C{Name: "200 created by compose", Covers: "X4 R13", Setup: setup{Images: []setupImage{xray1}, Networks: []setupNet{uplink}},
			Request: js("POST", "/v1/gateway/ensure", map[string]any{}), Response: okBody(200, map[string]any{"action": "created"}, "gateway", "action")},
		C{Name: "200 created with uplink", Covers: "X9", Setup: setup{Images: []setupImage{xray1}},
			Request:  js("POST", "/v1/gateway/ensure", map[string]any{"uplink": map[string]any{"subnet": "10.117.81.0/24", "gateway": "10.117.81.1", "policy_label": "{}"}}),
			Response: okBody(200, map[string]any{"action": "created"}, "gateway", "action")},
		C{Name: "409 uplink_missing", Covers: "R13", Setup: setup{Images: []setupImage{xray1}}, Request: js("POST", "/v1/gateway/ensure", map[string]any{}),
			Response: fail(409, "conflict", "uplink_missing"), After: unchanged},
		C{Name: "403 state.json in shared-egress", Covers: "BUG-20(fixed)", Setup: setup{Images: []setupImage{xray1}, Networks: []setupNet{uplink},
			Files: map[string]string{"shared-egress": "name"}}, Request: js("POST", "/v1/gateway/ensure", map[string]any{}),
			Response: fail(403, "forbidden", "mount_source_rejected"), After: unchanged},
		C{Name: "502 compose_failed", Setup: setup{Images: []setupImage{xray1}, Networks: []setupNet{uplink}, ComposeFails: []string{"ccgateway-xray:1"}},
			Request: js("POST", "/v1/gateway/ensure", map[string]any{}), Response: fail(502, "docker_error", "compose_failed")},
		C{Name: "409 upgrade_in_progress", Setup: setup{Images: []setupImage{xray1}, Networks: []setupNet{uplink}, LifecycleBusy: true},
			Request: js("POST", "/v1/gateway/ensure", map[string]any{}), Response: fail(409, "conflict", "upgrade_in_progress"), After: unchanged},
		C{Name: "400 bad uplink", Setup: setup{Images: []setupImage{xray1}},
			Request:  js("POST", "/v1/gateway/ensure", map[string]any{"uplink": map[string]any{"subnet": "8.8.8.0/24", "gateway": "8.8.8.1", "policy_label": "{}"}}),
			Response: fail(400, "invalid_request", ""), After: unchanged},
	)
	add("gateway-recreate",
		C{Name: "200", Covers: "R13", Setup: patch(withGateway(setup{}), func(s *setup) { s.Images = append(s.Images, xray2) }),
			Request: js("POST", "/v1/gateway/recreate", map[string]any{"image": "ccgateway-xray:2"}), Response: okKeys(200, "gateway")},
		C{Name: "409 gateway_not_compose", Covers: "D4", Setup: patch(withGateway(setup{}), func(s *setup) { s.Images = append(s.Images, xray2); s.Gateway.ManagedBy = "legacy" }),
			Request: js("POST", "/v1/gateway/recreate", map[string]any{"image": "ccgateway-xray:2"}), Response: fail(409, "conflict", "gateway_not_compose"), After: unchanged},
		C{Name: "403 image_not_gateway", Covers: "A20", Setup: patch(withGateway(setup{}), func(s *setup) { s.Images = append(s.Images, appImgS) }),
			Request: js("POST", "/v1/gateway/recreate", map[string]any{"image": appImg}), Response: fail(403, "forbidden", "image_not_gateway"), After: unchanged},
		C{Name: "404 image", Setup: withGateway(setup{}), Request: js("POST", "/v1/gateway/recreate", map[string]any{"image": "ccgateway-xray:404"}),
			Response: fail(404, "not_found", "image"), After: unchanged},
		C{Name: "409 upgrade_in_progress", Setup: patch(withGateway(setup{}), func(s *setup) { s.Images = append(s.Images, xray2); s.LifecycleBusy = true }),
			Request: js("POST", "/v1/gateway/recreate", map[string]any{"image": "ccgateway-xray:2"}), Response: fail(409, "conflict", "upgrade_in_progress"), After: unchanged},
		C{Name: "502 compose_failed restored", Covers: "03§3.7.3", Setup: patch(withGateway(setup{}), func(s *setup) {
			s.Images = append(s.Images, xray2)
			s.ComposeFails = []string{"ccgateway-xray:2"}
		}), Request: js("POST", "/v1/gateway/recreate", map[string]any{"image": "ccgateway-xray:2"}), Response: fail(502, "docker_error", "compose_failed")},
	)
	add("gateway-exec",
		C{Name: "200", Covers: "R5", Setup: patch(withGateway(setup{}), func(s *setup) { s.Exec = &setupExec{Stdout: "[]"} }),
			Request:  js("POST", "/v1/gateway/exec", map[string]any{"argv": []string{"ip", "-j", "-4", "addr"}}),
			Response: okBody(200, map[string]any{"exit_code": 0, "output": b64("[]")}, "exit_code", "output")},
		C{Name: "409 not_running", Setup: patch(withGateway(setup{}), func(s *setup) { s.Gateway.Status = "exited" }),
			Request: js("POST", "/v1/gateway/exec", map[string]any{"argv": []string{"true"}}), Response: fail(409, "conflict", "not_running", "ccg-shared-egress")},
		C{Name: "409 no gateway", Request: js("POST", "/v1/gateway/exec", map[string]any{"argv": []string{"true"}}), Response: fail(409, "conflict", "not_running", "ccg-shared-egress")},
		C{Name: "400 user not accepted", Covers: "03§3.7.4", Setup: withGateway(setup{}), Request: js("POST", "/v1/gateway/exec", map[string]any{"argv": []string{"true"}, "user": "0"}),
			Response: fail(400, "invalid_request", ""), After: unchanged},
	)
	add("gateway-networks-put",
		C{Name: "204 attach", Covers: "A2 03§3.7.5", Setup: patch(withGateway(withApp("running")), func(s *setup) { s.Gateway.Networks = nil }),
			Request: js("PUT", "/v1/gateway/networks/21", map[string]any{"ipv4": gw21}), Response: noBody(204), After: &after{Recompute: true}},
		C{Name: "204 already attached same address", Setup: withGateway(withApp("running")),
			Request: js("PUT", "/v1/gateway/networks/21", map[string]any{"ipv4": gw21}), Response: noBody(204), After: unchanged},
		C{Name: "409 exists other address", Setup: withGateway(withApp("running")),
			Request: js("PUT", "/v1/gateway/networks/21", map[string]any{"ipv4": "10.52.74.9"}), Response: fail(409, "conflict", "exists", "ccg-shared-egress"), After: unchanged},
		C{Name: "404 gateway", Setup: withApp("running"), Request: js("PUT", "/v1/gateway/networks/21", map[string]any{"ipv4": gw21}),
			Response: fail(404, "not_found", "gateway"), After: unchanged},
		C{Name: "404 network", Setup: withGateway(setup{}), Request: js("PUT", "/v1/gateway/networks/21", map[string]any{"ipv4": gw21}),
			Response: fail(404, "not_found", "network"), After: unchanged},
		C{Name: "400 address .1", Setup: patch(withGateway(withApp("running")), func(s *setup) { s.Gateway.Networks = nil }),
			Request: js("PUT", "/v1/gateway/networks/21", map[string]any{"ipv4": "10.52.74.1"}), Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "400 address of the app", Setup: patch(withGateway(withApp("running")), func(s *setup) { s.Gateway.Networks = nil }),
			Request: js("PUT", "/v1/gateway/networks/21", map[string]any{"ipv4": app21}), Response: fail(400, "invalid_request", ""), After: unchanged},
	)
	add("gateway-networks-delete",
		C{Name: "204 detach", Covers: "03§3.7.6", Setup: withGateway(withApp("running")), Request: del("/v1/gateway/networks/21"), Response: noBody(204), After: &after{Recompute: true}},
		C{Name: "204 no gateway", Covers: "R18", Setup: account(), Request: del("/v1/gateway/networks/21"), Response: noBody(204), After: unchanged},
		C{Name: "204 no network", Covers: "R18", Setup: withGateway(setup{}), Request: del("/v1/gateway/networks/21"), Response: noBody(204), After: unchanged},
		C{Name: "204 not attached", Setup: patch(withGateway(account()), func(s *setup) { s.Gateway.Networks = nil }), Request: del("/v1/gateway/networks/21"), Response: noBody(204)},
	)
	add("gateway-files",
		C{Name: "204 boot.json without a gateway", Covers: "R13 A11", Request: raw("PUT", "/v1/gateway/files/boot.json", "application/octet-stream", []byte(`{"v":1}`)),
			Response: noBody(204), After: &after{DockerUnchanged: true, Files: map[string]string{"shared-egress/boot.json": `{"v":1}`}}},
		C{Name: "204 operation.json", Request: raw("PUT", "/v1/gateway/files/operation.json", "application/octet-stream", []byte(`{}`)), Response: noBody(204)},
		C{Name: "400 state.json", Covers: "A11 BUG-20(fixed)", Request: raw("PUT", "/v1/gateway/files/state.json", "application/octet-stream", []byte(`{}`)),
			Response: fail(400, "invalid_request", ""), After: unchanged},
		C{Name: "404 ../x", Request: raw("PUT", "/v1/gateway/files/../x", "application/octet-stream", []byte(`{}`)), Response: fail(404, "not_found", "")},
		C{Name: "404 boot.json/", Request: raw("PUT", "/v1/gateway/files/boot.json/", "application/octet-stream", []byte(`{}`)), Response: fail(404, "not_found", "")},
		C{Name: "413 over 4 MiB", Request: contractReq{Method: "PUT", Path: "/v1/gateway/files/boot.json", ContentType: "application/octet-stream",
			BodyBase64: b64("{}"), Length: i64(4<<20 + 1)}, Response: fail(413, "too_large", "")},
		C{Name: "400 wrong content type", Request: raw("PUT", "/v1/gateway/files/boot.json", "application/json", []byte(`{}`)), Response: fail(400, "invalid_request", "")},
	)

	// ---- controller ----
	add("controller-upgrade-post",
		C{Name: "202", Covers: "R14 X5", Setup: setup{Images: []setupImage{ctlImg}}, Request: js("POST", "/v1/controller/upgrade", map[string]any{"image": "ccgateway-controller:2"}),
			Response: okBody(202, map[string]any{"accepted": true}, "accepted")},
		C{Name: "403 image_not_guarded", Covers: "R14 A17 D8", Setup: setup{Images: []setupImage{{Ref: "ccgateway-controller:1", Labels: map[string]string{"io.sup2api.ccgateway.shared-egress": "1"}}}},
			Request: js("POST", "/v1/controller/upgrade", map[string]any{"image": "ccgateway-controller:1"}), Response: fail(403, "forbidden", "image_not_guarded"), After: unchanged},
		C{Name: "404 image", Request: js("POST", "/v1/controller/upgrade", map[string]any{"image": "ccgateway-controller:404"}), Response: fail(404, "not_found", "image"), After: unchanged},
		C{Name: "409 upgrade_in_progress", Setup: setup{Images: []setupImage{ctlImg}, LifecycleBusy: true},
			Request: js("POST", "/v1/controller/upgrade", map[string]any{"image": "ccgateway-controller:2"}), Response: fail(409, "conflict", "upgrade_in_progress"), After: unchanged},
		C{Name: "400 bad reference", Covers: "A18", Request: js("POST", "/v1/controller/upgrade", map[string]any{"image": "a:1\nCCG_GUARD_IMAGE=x"}),
			Response: fail(400, "invalid_request", ""), After: unchanged},
	)
	add("controller-upgrade-get",
		C{Name: "200 idle", Covers: "03§3.8.2", Request: get("/v1/controller/upgrade"),
			Response: okBody(200, map[string]any{"state": "idle"}, "state", "image", "previous", "step", "result", "rollback", "started_at", "ended_at")},
	)
	return m
}

var netKeys = []string{"Name", "Id", "Driver", "Internal", "EnableIPv6", "Labels", "Options", "IPAM", "Containers"}
var inspectKeys = []string{"Id", "Name", "Image", "Created", "RestartCount", "Path", "Args", "State", "Config", "HostConfig", "Mounts", "NetworkSettings"}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func slug(s string) string {
	return strings.Trim(slugRe.ReplaceAllString(strings.ToLower(s), "-"), "-")
}

func renderCase(c C) []byte {
	b, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		panic(err)
	}
	return append(b, '\n')
}

// covers: 05§5 the sample files are exactly the case table (regenerate with -gen-contract)
func TestContractFilesMatchTable(t *testing.T) {
	cases := contractCases()
	want := map[string][]byte{}
	for dir, cs := range cases {
		seen := map[string]bool{}
		for _, c := range cs {
			name := slug(c.Name)
			if seen[name] {
				t.Fatalf("duplicate case %s/%s", dir, name)
			}
			seen[name] = true
			want[filepath.ToSlash(filepath.Join(dir, name+".json"))] = renderCase(c)
		}
	}
	if *genContract {
		_ = os.RemoveAll(contractDir)
		for rel, b := range want {
			p := filepath.Join(contractDir, filepath.FromSlash(rel))
			if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(p, b, 0o644); err != nil {
				t.Fatal(err)
			}
		}
	}
	got := map[string][]byte{}
	_ = filepath.Walk(contractDir, func(p string, info os.FileInfo, err error) error {
		if err == nil && !info.IsDir() && strings.HasSuffix(p, ".json") {
			rel, _ := filepath.Rel(contractDir, p)
			b, _ := os.ReadFile(p)
			got[filepath.ToSlash(rel)] = bytes.ReplaceAll(b, []byte("\r\n"), []byte("\n"))
		}
		return nil
	})
	for rel, b := range want {
		if !bytes.Equal(got[rel], b) {
			t.Errorf("%s differs from the table (run go test ./internal/api -run TestContractFilesMatchTable -gen-contract)", rel)
		}
	}
	for rel := range got {
		if _, ok := want[rel]; !ok {
			t.Errorf("%s is not in the table", rel)
		}
	}
	if len(want) == 0 {
		t.Fatal(fmt.Sprint("empty table"))
	}
}
