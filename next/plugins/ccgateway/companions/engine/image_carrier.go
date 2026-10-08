package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
)

type imageCarrier struct {
	URL    string
	Source Object
	Count  int
}

const imageCarrierPrefix = "https://ccgateway-image.invalid/"

func (r *Request) prepareImageCarriers() {
	for _, message := range r.Messages {
		for _, image := range imageBlocks(message.Content) {
			source, _ := image["source"].(map[string]any)
			if _, explicit := image["transformations"]; !explicit || str(source, "type") != "base64" {
				continue
			}
			if r.imageCarriers == nil {
				r.imageCarriers = map[string]*imageCarrier{}
			}
			key := imageCarrierKey(image)
			if r.imageCarriers[key] == nil {
				owned, _ := jsonCopyObject(source)
				r.imageCarriers[key] = &imageCarrier{URL: imageCarrierPrefix + uuid() + "/" + uuid(), Source: owned}
			}
			r.imageCarriers[key].Count++
		}
	}
}

func imageCarrierKey(image Object) string { return digest(withoutProtocolCache([]Object{image})) }

// A URL-shaped, request-owned carrier avoids CLI's base64 decoding, temporary
// local image files and extra image-path text. It is never sent to a provider.
func (r *Request) cliWireMessage(message Message) Message {
	out := r.wireMessage(message)
	if len(r.imageCarriers) == 0 {
		return out
	}
	owned, _ := jsonCopyObject(Object{"content": out.Content})
	out.Content, _ = historyContent(owned["content"])
	for _, image := range imageBlocks(out.Content) {
		if carrier := r.imageCarriers[imageCarrierKey(image)]; carrier != nil {
			image["source"] = Object{"type": "url", "url": carrier.URL}
		}
	}
	return out
}

func (r *Request) containsImageCarrier(raw []byte) bool {
	for _, carrier := range r.imageCarriers {
		if bytes.Contains(raw, []byte(carrier.URL)) {
			return true
		}
	}
	return false
}

func (r *Request) restoreImageCarriers(body Object) error {
	if len(r.imageCarriers) == 0 {
		return nil
	}
	byURL := map[string]*imageCarrier{}
	seen := map[string]int{}
	for _, carrier := range r.imageCarriers {
		byURL[carrier.URL] = carrier
	}
	messages, ok := body["messages"].([]any)
	if !ok {
		return fmt.Errorf("image carrier messages missing")
	}
	for _, value := range messages {
		message, _ := value.(map[string]any)
		content, err := historyContent(message["content"])
		if err != nil {
			return err
		}
		for _, image := range imageBlocks(content) {
			source, _ := image["source"].(map[string]any)
			url := str(source, "url")
			if !strings.HasPrefix(url, imageCarrierPrefix) {
				continue
			}
			carrier := byURL[url]
			if carrier == nil || str(source, "type") != "url" || len(source) != 2 {
				return fmt.Errorf("image carrier source changed")
			}
			original, err := jsonCopyObject(carrier.Source)
			if err != nil {
				return err
			}
			image["source"] = original
			seen[url]++
		}
	}
	for url, carrier := range byURL {
		if seen[url] != carrier.Count {
			return fmt.Errorf("image carrier count changed")
		}
	}
	raw, _ := json.Marshal(body)
	if r.containsImageCarrier(raw) {
		return fmt.Errorf("image carrier leaked outside its registered image source")
	}
	if r.diagnostic != nil {
		count := 0
		for _, carrier := range byURL {
			count += carrier.Count
		}
		r.diagnostic.trace("image_carriers_restored", Object{"images": count, "history_mode": "rebuild", "original_sources_restored": true})
	}
	return nil
}
