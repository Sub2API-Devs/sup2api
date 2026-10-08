package engine

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// Server-owned tools retain their API type and are never registered with MCP.
// Newer web versions default to code execution, which needs its own adapter.
func serverToolName(kind string) string {
	if codeExecutionVersion(kind) {
		return "code_execution"
	}
	if name := serverSearchName(kind); name != "" {
		return name
	}
	switch kind {
	case "advisor_20260301":
		return "advisor"
	case "web_search_20250305", "web_search_20260209", "web_search_20260318":
		return "web_search"
	case "web_fetch_20250910", "web_fetch_20260209", "web_fetch_20260309", "web_fetch_20260318":
		return "web_fetch"
	}
	return ""
}

func serverResultType(name string) string {
	switch name {
	case "code_execution", "bash_code_execution", "text_editor_code_execution":
		return name + "_tool_result"
	case "advisor":
		return "advisor_tool_result"
	case "tool_search_tool_regex", "tool_search_tool_bm25":
		return "tool_search_tool_result"
	case "web_search":
		return "web_search_tool_result"
	case "web_fetch":
		return "web_fetch_tool_result"
	}
	return ""
}

func checkWebTool(t Object) error {
	kind, name := str(t, "type"), str(t, "name")
	fields := []string{"type", "name", "cache_control", "defer_loading", "strict", "allowed_callers", "allowed_domains", "blocked_domains", "max_uses"}
	if name == "web_search" {
		fields = append(fields, "user_location")
	} else {
		fields = append(fields, "citations", "max_content_tokens", "url_sources")
	}
	if strings.HasSuffix(kind, "20260318") {
		fields = append(fields, "response_inclusion")
	}
	if kind == "web_fetch_20260309" || kind == "web_fetch_20260318" {
		fields = append(fields, "use_cache")
	}
	if err := keys(t, fields...); err != nil {
		return err
	}
	if t["allowed_domains"] != nil && t["blocked_domains"] != nil {
		return fmt.Errorf("allowed_domains and blocked_domains are mutually exclusive")
	}
	for _, key := range []string{"allowed_domains", "blocked_domains"} {
		if value := t[key]; value != nil {
			list, ok := value.([]any)
			if !ok {
				return fmt.Errorf("%s must be an array or null", key)
			}
			for _, item := range list {
				if text, ok := item.(string); !ok || text == "" {
					return fmt.Errorf("%s entries must be nonempty strings", key)
				}
			}
		}
	}
	for _, key := range []string{"max_uses", "max_content_tokens"} {
		if value := t[key]; value != nil {
			n, ok := value.(json.Number)
			if !ok {
				return fmt.Errorf("%s must be a nonnegative integer or null", key)
			}
			v, err := n.Int64()
			if err != nil || v < 0 {
				return fmt.Errorf("%s must be a nonnegative integer or null", key)
			}
		}
	}
	for _, key := range []string{"defer_loading", "use_cache"} {
		if value, exists := t[key]; exists {
			if _, ok := value.(bool); !ok {
				return fmt.Errorf("%s must be boolean", key)
			}
		}
	}
	if value, exists := t["response_inclusion"]; exists && value != "full" && value != "excluded" {
		return fmt.Errorf("response_inclusion must be full or excluded")
	}
	if value := t["user_location"]; value != nil {
		loc, ok := value.(map[string]any)
		if !ok || str(loc, "type") != "approximate" {
			return fmt.Errorf("invalid approximate user_location")
		}
		if err := keys(loc, "type", "city", "region", "country", "timezone"); err != nil {
			return err
		}
		for key, value := range loc {
			if key != "type" && value == nil {
				continue
			}
			if _, ok := value.(string); !ok {
				return fmt.Errorf("user_location.%s must be a string", key)
			}
		}
	}
	if value := t["citations"]; value != nil {
		citations, ok := value.(map[string]any)
		if !ok {
			return fmt.Errorf("citations must be an object or null")
		}
		if err := keys(citations, "enabled"); err != nil {
			return err
		}
		if v, exists := citations["enabled"]; exists {
			if _, ok := v.(bool); !ok {
				return fmt.Errorf("citations.enabled must be boolean")
			}
		}
	}
	return checkURLSources(t["url_sources"], nil)
}

// Named URL sources are route identifiers, unlike ordinary strings in tool
// input. Validate and translate only this documented location.
func checkURLSources(value any, resolve func(string, string) string) error {
	if value == nil {
		return nil
	}
	sources, ok := value.(map[string]any)
	if !ok {
		return fmt.Errorf("url_sources must be an object or null")
	}
	if err := keys(sources, "user_input", "client_tool_results", "server_tool_results"); err != nil {
		return err
	}
	for source, value := range sources {
		filter, ok := value.(map[string]any)
		if !ok {
			return fmt.Errorf("url_sources.%s requires a tagged filter", source)
		}
		kind := str(filter, "type")
		if kind == "all" || kind == "none" {
			if err := keys(filter, "type"); err != nil {
				return err
			}
			continue
		}
		if source == "user_input" || kind != "only" && kind != "except" {
			return fmt.Errorf("invalid url_sources filter")
		}
		if err := keys(filter, "type", "tools"); err != nil {
			return err
		}
		refs, ok := filter["tools"].([]any)
		if !ok {
			return fmt.Errorf("url_sources tools must be an array")
		}
		for _, value := range refs {
			ref, ok := value.(map[string]any)
			if !ok || str(ref, "type") != "tool_reference" || str(ref, "name") == "" {
				return fmt.Errorf("invalid url_sources tool reference")
			}
			if err := keys(ref, "type", "name"); err != nil {
				return err
			}
			if resolve != nil {
				name := resolve(source, str(ref, "name"))
				if name == "" {
					return fmt.Errorf("url_sources references an undeclared %s tool", source)
				}
				ref["name"] = name
			}
		}
	}
	return nil
}

func (r *Request) resolveURLSource(source, name string) string {
	if source == "server_tool_results" {
		if (name == "web_search" || name == "web_fetch") && r.hasServerSearch(name) {
			return name
		}
		return ""
	}
	for _, tool := range r.Tools {
		if tool.Name == name {
			return r.wireName(name)
		}
	}
	return ""
}

func checkWebResult(b Object) error {
	if err := keys(b, "type", "tool_use_id", "content", "caller", "cache_control"); err != nil {
		return err
	}
	if str(b, "tool_use_id") == "" {
		return fmt.Errorf("server result requires tool_use_id")
	}
	if caller, exists := b["caller"]; exists {
		if err := checkProviderCaller(caller); err != nil {
			return err
		}
	}
	kind := str(b, "type")
	if content, ok := b["content"].(map[string]any); ok {
		if str(content, "type") == strings.TrimSuffix(kind, "_result")+"_result_error" {
			if str(content, "error_code") == "" {
				return fmt.Errorf("server error result requires error_code")
			}
			return nil
		}
		if kind != "web_fetch_tool_result" || str(content, "type") != "web_fetch_result" || str(content, "url") == "" {
			return fmt.Errorf("invalid web fetch result")
		}
		doc, ok := content["content"].(map[string]any)
		if !ok || str(doc, "type") != "document" {
			return fmt.Errorf("web fetch requires a document result")
		}
		ttl := 5 * time.Minute
		if err := cacheTTL(doc["cache_control"], &ttl); err != nil {
			return err
		}
		copy := Object{}
		for key, value := range doc {
			if key != "cache_control" {
				copy[key] = value
			}
		}
		return checkDocument(copy, "user", &ttl)
	}
	results, ok := b["content"].([]any)
	if kind != "web_search_tool_result" || !ok {
		return fmt.Errorf("invalid web search result")
	}
	for _, value := range results {
		result, ok := value.(map[string]any)
		if !ok || str(result, "type") != "web_search_result" || str(result, "url") == "" || str(result, "encrypted_content") == "" {
			return fmt.Errorf("web search result requires URL and encrypted_content")
		}
		if _, ok := result["title"].(string); !ok {
			return fmt.Errorf("web search result requires title")
		}
	}
	return nil
}

func webFetchedDocument(block Object) Object {
	if str(block, "type") != "web_fetch_tool_result" {
		return nil
	}
	result, _ := block["content"].(map[string]any)
	if str(result, "type") != "web_fetch_result" {
		return nil
	}
	doc, _ := result["content"].(map[string]any)
	if str(doc, "type") != "document" {
		return nil
	}
	return doc
}
