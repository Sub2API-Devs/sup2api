package engine

import (
	"fmt"
	"mime"
	"net/http"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

const resourcePrefix = resources.InternalPrefix
const resourceHardLimit = resources.HardBodyLimit

type resourceRoute struct {
	method, path, query, contentType string
	version                          string
	betas                            []string
	upload                           bool
}

func parseResourceRoute(r *http.Request) (resourceRoute, error) {
	path := strings.TrimPrefix(r.URL.EscapedPath(), resourcePrefix)
	if path == r.URL.EscapedPath() {
		return resourceRoute{}, fmt.Errorf("invalid resource path")
	}
	upload, err := resources.ValidateOperation(resources.Operation{Method: r.Method, Path: path, RawQuery: r.URL.RawQuery})
	if err != nil {
		return resourceRoute{}, err
	}
	contentType := r.Header.Get("Content-Type")
	if upload {
		kind, params, err := mime.ParseMediaType(contentType)
		if err != nil || kind != "multipart/form-data" || params["boundary"] == "" {
			return resourceRoute{}, fmt.Errorf("resource upload requires multipart/form-data with a boundary")
		}
	}
	if !upload && r.ContentLength != 0 {
		return resourceRoute{}, fmt.Errorf("this resource operation does not accept a request body")
	}
	betas := r.Header.Values("Anthropic-Beta")
	if len(strings.Join(betas, ",")) > 8192 {
		return resourceRoute{}, fmt.Errorf("resource beta header exceeds limit")
	}
	return resourceRoute{method: r.Method, path: path, query: r.URL.RawQuery, contentType: contentType, version: r.Header.Get("Anthropic-Version"), upload: upload, betas: betas}, nil
}
