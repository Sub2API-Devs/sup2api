package engine

import (
	"fmt"
	"time"
)

// Browser state describes the external client's browser. No URL, path or
// download in this structure is opened or resolved inside the Worker.
func checkBrowserState(block Object, ttl *time.Duration) error {
	if err := keys(block, "type", "tabs", "state_changes", "cache_control"); err != nil {
		return err
	}
	if err := cacheTTL(block["cache_control"], ttl); err != nil {
		return err
	}
	tabs, ok := block["tabs"].([]any)
	if !ok {
		return fmt.Errorf("browser_state.tabs must be an array")
	}
	ids := map[string]bool{}
	active := 0
	for _, value := range tabs {
		tab, ok := value.(map[string]any)
		if !ok {
			return fmt.Errorf("invalid browser tab")
		}
		if err := keys(tab, "tab_id", "title", "url", "active"); err != nil {
			return err
		}
		id := str(tab, "tab_id")
		if id == "" || ids[id] {
			return fmt.Errorf("browser tab IDs must be nonempty and unique")
		}
		ids[id] = true
		for _, key := range []string{"title", "url"} {
			if _, ok := tab[key].(string); !ok {
				return fmt.Errorf("browser tab %s must be text", key)
			}
		}
		if v, exists := tab["active"]; exists {
			a, ok := v.(bool)
			if !ok {
				return fmt.Errorf("browser active must be boolean")
			}
			if a {
				active++
			}
		}
	}
	if len(tabs) > 0 && active != 1 {
		return fmt.Errorf("nonempty browser inventory needs exactly one active tab")
	}
	if value, exists := block["state_changes"]; exists && value != nil {
		changes, ok := value.([]any)
		if !ok || len(changes) == 0 {
			return fmt.Errorf("browser state_changes must be a nonempty array")
		}
		seen := map[string]bool{}
		for _, value := range changes {
			change, ok := value.(map[string]any)
			if !ok {
				return fmt.Errorf("invalid browser state change")
			}
			kind := str(change, "type")
			if kind == "tab_opened" {
				if err := keys(change, "type", "tab_id"); err != nil {
					return err
				}
				id := str(change, "tab_id")
				if !ids[id] || seen["tab:"+id] {
					return fmt.Errorf("opened tab must uniquely reference current inventory")
				}
				seen["tab:"+id] = true
				continue
			}
			allowed := []string{"type", "download_id", "url"}
			switch kind {
			case "download_started":
			case "download_completed":
				allowed = append(allowed, "path", "size_bytes")
			case "download_failed":
				allowed = append(allowed, "error")
			default:
				return fmt.Errorf("unknown browser state change")
			}
			if err := keys(change, allowed...); err != nil {
				return err
			}
			id := str(change, "download_id")
			if id == "" || seen["download:"+id] {
				return fmt.Errorf("download state IDs must be nonempty and unique per result")
			}
			seen["download:"+id] = true
			if _, ok := change["url"].(string); !ok {
				return fmt.Errorf("download URL must be text")
			}
			for _, key := range []string{"path", "error"} {
				if value, exists := change[key]; exists && value != nil {
					if _, ok := value.(string); !ok {
						return fmt.Errorf("download %s must be text or null", key)
					}
				}
			}
			if value, exists := change["size_bytes"]; exists && value != nil {
				if err := clientToolInteger(value, false); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

func parseToolResultBlocks(values []any, parent Object, ttl *time.Duration) ([]Object, error) {
	var out []Object
	states := 0
	for _, value := range values {
		block, ok := value.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("invalid tool result block")
		}
		if str(block, "type") == "browser_state" {
			states++
			if states > 1 || str(parent, "toolset_name") != "browser" || parent["is_error"] == true {
				return nil, fmt.Errorf("browser_state requires one successful browser member result")
			}
			if err := checkBrowserState(block, ttl); err != nil {
				return nil, err
			}
			out = append(out, block)
			continue
		}
		parsed, err := blocks([]any{value}, "user", ttl)
		if err != nil {
			return nil, err
		}
		kind := str(parsed[0], "type")
		if kind != "text" && kind != "image" && kind != "document" {
			return nil, fmt.Errorf("unsupported tool_result content")
		}
		out = append(out, parsed[0])
	}
	return out, nil
}
