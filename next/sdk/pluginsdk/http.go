package pluginsdk

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// HandlerFunc serves one plugin route.
type HandlerFunc func(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error)

// Router dispatches HTTPService calls by method and manifest route pattern
// (HTTPRequest.route_path, falling back to path). It implements HTTP.
type Router struct {
	routes map[string]HandlerFunc
}

// NewRouter returns an empty router.
func NewRouter() *Router { return &Router{routes: map[string]HandlerFunc{}} }

// Handle registers h for method and the manifest route path, e.g.
// Handle("GET", "/models", h).
func (r *Router) Handle(method, path string, h HandlerFunc) {
	r.routes[strings.ToUpper(method)+" "+path] = h
}

// HandleHTTP implements HTTP.
func (r *Router) HandleHTTP(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	method := strings.ToUpper(req.GetMethod())
	for _, p := range []string{req.GetRoutePath(), req.GetPath()} {
		if p == "" {
			continue
		}
		// Try exact match first
		if h, ok := r.routes[method+" "+p]; ok {
			return h(ctx, req)
		}
		// Try pattern match (e.g., /models/:id)
		for pattern, h := range r.routes {
			if !strings.HasPrefix(pattern, method+" ") {
				continue
			}
			patternPath := strings.TrimPrefix(pattern, method+" ")
			if params := matchPath(patternPath, p); params != nil {
				// Fill path_params for Param() helper
				if req.PathParams == nil {
					req.PathParams = make(map[string]string)
				}
				for k, v := range params {
					req.PathParams[k] = v
				}
				return h(ctx, req)
			}
		}
	}
	return ErrorResponse(http.StatusNotFound, "not_found", fmt.Sprintf("no route for %s %s", method, req.GetPath())), nil
}

// matchPath checks if path matches pattern (e.g., /models/:id matches /models/123).
// Returns nil if no match, or a map of parameter names to values.
func matchPath(pattern, path string) map[string]string {
	patternParts := strings.Split(strings.Trim(pattern, "/"), "/")
	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	if len(patternParts) != len(pathParts) {
		return nil
	}
	params := make(map[string]string)
	for i, pp := range patternParts {
		if strings.HasPrefix(pp, ":") {
			params[strings.TrimPrefix(pp, ":")] = pathParts[i]
		} else if pp != pathParts[i] {
			return nil
		}
	}
	return params
}

// ---------------------------------------------------------------- responses (CONTRACTS §3.1)

// JSONResponse encodes v as the response body.
func JSONResponse(status int, v any) *pluginv1.HTTPResponse {
	b, err := json.Marshal(v)
	if err != nil {
		return ErrorResponse(http.StatusInternalServerError, "internal", "encode response: "+err.Error())
	}
	return &pluginv1.HTTPResponse{
		Status:  int32(status),
		Headers: map[string]*pluginv1.HeaderValues{"content-type": {Values: []string{"application/json; charset=utf-8"}}},
		Body:    b,
	}
}

// DataResponse returns 200 {"data": v}.
func DataResponse(v any) *pluginv1.HTTPResponse {
	return JSONResponse(http.StatusOK, map[string]any{"data": v})
}

// Page is the pagination block of list responses.
type Page struct {
	Page     int   `json:"page"`
	PageSize int   `json:"page_size"`
	Total    int64 `json:"total"`
}

// ListResponse returns 200 {"data": items, "page": page}.
func ListResponse(items any, page Page) *pluginv1.HTTPResponse {
	return JSONResponse(http.StatusOK, map[string]any{"data": items, "page": page})
}

// ErrorResponse returns {"error": {"code", "message"}} with status.
func ErrorResponse(status int, code, message string) *pluginv1.HTTPResponse {
	return JSONResponse(status, map[string]any{"error": map[string]any{"code": code, "message": message}})
}

// FieldErrorResponse returns 400 invalid_argument with details.fields.
func FieldErrorResponse(message string, fields FieldErrors) *pluginv1.HTTPResponse {
	list := make([]map[string]string, 0, len(fields))
	for _, f := range fields {
		list = append(list, map[string]string{"field": f.GetField(), "code": f.GetCode(), "message": f.GetMessage()})
	}
	return JSONResponse(http.StatusBadRequest, map[string]any{"error": map[string]any{
		"code": "invalid_argument", "message": message, "details": map[string]any{"fields": list},
	}})
}

// ---------------------------------------------------------------- request helpers

// Query returns the first value of a query parameter.
func Query(req *pluginv1.HTTPRequest, name string) string {
	if v, ok := req.GetQuery()[name]; ok && len(v.GetValues()) > 0 {
		return v.GetValues()[0]
	}
	return ""
}

// Header returns the first value of a request header (case-insensitive).
func Header(req *pluginv1.HTTPRequest, name string) string {
	for k, v := range req.GetHeaders() {
		if strings.EqualFold(k, name) && len(v.GetValues()) > 0 {
			return v.GetValues()[0]
		}
	}
	return ""
}

// DecodeJSON unmarshals the request body into v.
func DecodeJSON(req *pluginv1.HTTPRequest, v any) error {
	if len(req.GetBody()) == 0 {
		return fmt.Errorf("empty request body")
	}
	return json.Unmarshal(req.GetBody(), v)
}

// Pagination reads page/page_size (CONTRACTS §3.1: max page_size 200).
func Pagination(req *pluginv1.HTTPRequest, defaultSize int) (page, size int) {
	page, _ = strconv.Atoi(Query(req, "page"))
	size, _ = strconv.Atoi(Query(req, "page_size"))
	if page < 1 {
		page = 1
	}
	if size < 1 {
		size = defaultSize
	}
	if size > 200 {
		size = 200
	}
	return page, size
}

// Param returns a path parameter by name, falling back to the last path segment
// when path_params is empty (a host that never filled it degrades gracefully).
func Param(req *pluginv1.HTTPRequest, name string) string {
	if v, ok := req.GetPathParams()[name]; ok {
		return v
	}
	path := strings.TrimSuffix(req.GetPath(), "/")
	if i := strings.LastIndexByte(path, '/'); i >= 0 && !strings.HasPrefix(path[i+1:], ":") {
		return path[i+1:]
	}
	return ""
}

// Unavailable is a 503 for "database unavailable" or similar errors.
func Unavailable(msg string) *pluginv1.HTTPResponse {
	return ErrorResponse(http.StatusServiceUnavailable, "unavailable", msg)
}

// BadRequest is a 400 with one field error.
func BadRequest(field, code, msg string) *pluginv1.HTTPResponse {
	return FieldErrorResponse("invalid request / 请求参数不正确", FieldErrors{}.Add(field, code, msg))
}
