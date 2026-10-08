package engine

import (
	"fmt"
	"time"
)

func checkSearchResult(block Object, role string, ttl *time.Duration) error {
	if role != "user" {
		return fmt.Errorf("search_result must be user content")
	}
	if err := keys(block, "type", "source", "title", "content", "citations"); err != nil {
		return err
	}
	for _, field := range []string{"source", "title"} {
		if _, ok := block[field].(string); !ok {
			return fmt.Errorf("search_result %s must be text", field)
		}
	}
	items, ok := block["content"].([]any)
	if !ok || len(items) == 0 {
		return fmt.Errorf("search_result content must be a nonempty text block array")
	}
	for _, value := range items {
		text, ok := value.(map[string]any)
		if !ok || str(text, "type") != "text" || str(text, "text") == "" {
			return fmt.Errorf("search_result content must contain nonempty text only")
		}
		if _, err := blocks([]any{text}, "user", ttl); err != nil {
			return err
		}
	}
	_, err := searchResultCitations(block)
	return err
}

func searchResultCitations(block Object) (bool, error) {
	value, exists := block["citations"]
	if !exists {
		return false, nil
	}
	config, ok := value.(map[string]any)
	if !ok {
		return false, fmt.Errorf("search_result citations must be an object")
	}
	if err := keys(config, "enabled"); err != nil {
		return false, err
	}
	value, exists = config["enabled"]
	if !exists {
		return false, nil
	}
	enabled, ok := value.(bool)
	if !ok {
		return false, fmt.Errorf("search_result citations.enabled must be boolean")
	}
	return enabled, nil
}

func (r *Request) validateSearchResultCitations() error {
	var setting *bool
	for _, message := range r.Messages {
		if err := visitProtocolBlocks(message.Content, func(block Object) error {
			if str(block, "type") != "search_result" {
				return nil
			}
			enabled, err := searchResultCitations(block)
			if err != nil {
				return err
			}
			if setting != nil && *setting != enabled {
				return fmt.Errorf("all search_result blocks must use the same citations.enabled setting")
			}
			setting = &enabled
			return nil
		}); err != nil {
			return err
		}
	}
	return nil
}
