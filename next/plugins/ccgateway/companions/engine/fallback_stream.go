package engine

// CLI 2.1.292 omits fallback partial events while retaining their indexes in
// subsequent events. Recover only closed boundaries observed on this relay's
// authenticated main response, identified by message ID and block index.
type fallbackCapture struct {
	block  Object
	closed bool
}

func (o *apiTerminalObserver) observeFallback(event Object) {
	if str(event, "type") == "message_start" {
		message, _ := event["message"].(Object)
		o.fallbackMessageID = str(message, "id")
		return
	}
	if o.fallbackMessageID == "" {
		return
	}
	index, ok := integer(event["index"])
	if !ok {
		return
	}
	o.relay.mu.Lock()
	defer o.relay.mu.Unlock()
	if str(event, "type") == "content_block_start" {
		block, _ := event["content_block"].(Object)
		if str(block, "type") != "fallback" || checkFallbackBlock(block, "assistant") != nil {
			return
		}
		copied, err := jsonCopyObject(block)
		if err != nil {
			return
		}
		if o.relay.fallbackEvents == nil {
			o.relay.fallbackEvents = map[string]map[int]*fallbackCapture{}
		}
		if o.relay.fallbackEvents[o.fallbackMessageID] == nil {
			o.relay.fallbackEvents[o.fallbackMessageID] = map[int]*fallbackCapture{}
		}
		o.relay.fallbackEvents[o.fallbackMessageID][index] = &fallbackCapture{block: copied}
	}
	if str(event, "type") == "content_block_stop" {
		if capture := o.relay.fallbackEvents[o.fallbackMessageID][index]; capture != nil {
			capture.closed = true
		}
	}
}

func (r *outboundRelay) takeFallback(message string, index int) Object {
	r.mu.Lock()
	defer r.mu.Unlock()
	entries := r.fallbackEvents[message]
	capture := entries[index]
	if capture == nil || !capture.closed {
		return nil
	}
	delete(entries, index)
	if len(entries) == 0 {
		delete(r.fallbackEvents, message)
	}
	return capture.block
}

func (s *cliSession) restoreFallbackEvents(next Object) error {
	if s.relay == nil || s.acc.Message == nil {
		return nil
	}
	target := len(s.acc.Blocks)
	switch str(next, "type") {
	case "content_block_start":
		index, ok := integer(next["index"])
		if !ok {
			return nil
		}
		target = index
	case "message_delta", "message_stop":
		target = 100000
	default:
		return nil
	}
	for len(s.acc.Blocks) < target {
		index := len(s.acc.Blocks)
		block := s.relay.takeFallback(str(s.acc.Message, "id"), index)
		if block == nil {
			break
		}
		events := []Object{{"type": "content_block_start", "index": index, "content_block": block}, {"type": "content_block_stop", "index": index}}
		for _, event := range events {
			if err := s.acc.push(event, s.responseReq); err != nil {
				return err
			}
			if s.req.bufferedResponse() {
				s.buffered = append(s.buffered, event)
			} else if err := s.emit(event); err != nil {
				return err
			}
		}
	}
	return nil
}
