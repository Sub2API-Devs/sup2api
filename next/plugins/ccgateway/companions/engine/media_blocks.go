package engine

import (
	"encoding/base64"
	"fmt"
	"net/url"
	"time"
)

// Media source objects stay in the protocol. URL sources are never fetched by
// the Worker, and PDF bytes are never converted into text or re-indexed pages.
func checkDocument(b Object, role string, ttl *time.Duration, access ...*resourceAdmission) error {
	if role != "user" {
		return fmt.Errorf("document must be user content")
	}
	if err := keys(b, "type", "source", "title", "context", "citations"); err != nil {
		return err
	}
	for _, name := range []string{"title", "context"} {
		if value, exists := b[name]; exists && value != nil {
			if _, ok := value.(string); !ok {
				return fmt.Errorf("document %s must be text or null", name)
			}
		}
	}
	if value := b["citations"]; value != nil {
		c, ok := value.(map[string]any)
		if !ok {
			return fmt.Errorf("document citations must be an object")
		}
		if err := keys(c, "enabled"); err != nil {
			return err
		}
		if enabled, exists := c["enabled"]; exists {
			if _, ok := enabled.(bool); !ok {
				return fmt.Errorf("document citations.enabled must be boolean")
			}
		}
	}
	source, ok := b["source"].(map[string]any)
	if !ok {
		return fmt.Errorf("document source must be an object")
	}
	switch str(source, "type") {
	case "base64":
		if err := keys(source, "type", "media_type", "data"); err != nil {
			return err
		}
		if str(source, "media_type") != "application/pdf" || str(source, "data") == "" {
			return fmt.Errorf("document base64 source requires application/pdf data")
		}
		if _, err := base64.StdEncoding.Strict().DecodeString(str(source, "data")); err != nil {
			return fmt.Errorf("invalid document base64 data")
		}
	case "text":
		if err := keys(source, "type", "media_type", "data"); err != nil {
			return err
		}
		if str(source, "media_type") != "text/plain" {
			return fmt.Errorf("document text source requires text/plain")
		}
		if _, ok := source["data"].(string); !ok {
			return fmt.Errorf("document text data must be a string")
		}
	case "url":
		if err := keys(source, "type", "url"); err != nil {
			return err
		}
		return checkMediaURL(source["url"])
	case "content":
		if err := keys(source, "type", "content"); err != nil {
			return err
		}
		if _, ok := source["content"].(string); ok {
			return nil
		}
		items, ok := source["content"].([]any)
		if !ok {
			return fmt.Errorf("document content must be text or text/image blocks")
		}
		for _, value := range items {
			block, ok := value.(map[string]any)
			if !ok {
				return fmt.Errorf("invalid document source block")
			}
			if str(block, "type") != "text" && str(block, "type") != "image" {
				return fmt.Errorf("document content supports text/image blocks only")
			}
			if err := cacheTTL(block["cache_control"], ttl); err != nil {
				return err
			}
			copy := Object{}
			for key, value := range block {
				if key != "cache_control" {
					copy[key] = value
				}
			}
			if err := checkBlock(copy, "user", ttl, access...); err != nil {
				return err
			}
		}
	case "file":
		return checkFileSource(source, access...)
	default:
		return fmt.Errorf("unsupported document source %q", str(source, "type"))
	}
	return nil
}

func checkMediaURL(value any) error {
	text, ok := value.(string)
	if !ok {
		return fmt.Errorf("media URL must be a string")
	}
	u, err := url.ParseRequestURI(text)
	if err != nil || (u.Scheme != "https" && u.Scheme != "http") || u.Host == "" || u.User != nil {
		return fmt.Errorf("media URL must be an absolute HTTP(S) URL without credentials")
	}
	return nil
}

func checkImageSource(source Object, access ...*resourceAdmission) error {
	switch str(source, "type") {
	case "url":
		if err := keys(source, "type", "url"); err != nil {
			return err
		}
		return checkMediaURL(source["url"])
	case "file":
		return checkFileSource(source, access...)
	case "base64":
		if err := keys(source, "type", "media_type", "data"); err != nil {
			return err
		}
		if str(source, "data") == "" {
			return fmt.Errorf("image base64 data must be nonempty")
		}
		switch str(source, "media_type") {
		case "image/png", "image/jpeg", "image/gif", "image/webp":
			return nil
		}
		return fmt.Errorf("unsupported image media_type")
	default:
		return fmt.Errorf("unsupported image source %q", str(source, "type"))
	}
}

func checkImageTransformations(value any) error {
	if value == nil {
		return nil
	}
	config, ok := value.(map[string]any)
	if !ok {
		return fmt.Errorf("image transformations must be an object or null")
	}
	if err := keys(config, "oversized_image"); err != nil {
		return err
	}
	if mode, exists := config["oversized_image"]; exists && mode != "downsize" && mode != "error" {
		return fmt.Errorf("image transformations.oversized_image must be downsize or error")
	}
	return nil
}
