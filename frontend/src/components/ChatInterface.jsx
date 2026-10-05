import {
  Check,
  Copy,
  Languages,
  Printer,
  Volume2,
  VolumeX,
} from "lucide-react";
import ChatComposer from "./ChatComposer";
import MessageContent from "./MessageContent";

function MessageBubble({
  message,
  index,
  messages,
  isSending,
  speakingId,
  copiedId,
  onRetry,
  onSpeak,
  onCopy,
}) {
  return (
    <div className={`chat-row ${message.role}`}>
      <div className="chat-bubble">
        <div className="chat-meta">
          <span>{message.role === "user" ? "You" : "LokiBot"}</span>
          <span>{new Date(message.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        {message.error
          ? <p className="message-error">{message.error}</p>
          : message.role === "assistant"
            ? <MessageContent content={message.content} />
            : <p>{message.content}</p>}
      </div>

      {message.role === "assistant" && (
        <div className="bubble-actions">
          {message.error ? (
            <button
              type="button"
              className="retry-button"
              onClick={() => onRetry(message, index)}
              disabled={isSending || messages[index - 1]?.role !== "user"}
            >
              Retry
            </button>
          ) : (
            <>
              <button
                type="button"
                aria-label={speakingId === message.id ? "Stop reading response" : "Read response aloud"}
                onClick={() => onSpeak(message.content, message.id)}
                disabled={!message.content}
              >
                {speakingId === message.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <button
                type="button"
                aria-label="Copy response"
                onClick={() => onCopy(message.content, message.id)}
                disabled={!message.content}
              >
                {copiedId === message.id ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ChatInterface({
  panelRef,
  messages,
  chatRef,
  isSending,
  language,
  onLanguageChange,
  onClear,
  onExport,
  onBack,
  statusMessage,
  draft,
  onDraftChange,
  onComposerKeyDown,
  onSend,
  onVoiceToggle,
  isListening,
  voiceSupported,
  textareaRef,
  speakingId,
  copiedId,
  onRetry,
  onSpeak,
  onCopy,
}) {
  return (
    <section id="ai-assistant" className="chat-panel" aria-live="polite" ref={panelRef}>
      <div className="chat-header-row">
        <div>
          <span className="eyebrow">Portfolio AI</span>
          <h3>LokiBot</h3>
        </div>
        <div className="chat-tools">
          <label className="language-picker">
            <Languages size={14} />
            <select value={language} onChange={(event) => onLanguageChange(event.target.value)} aria-label="Select response language">
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
          </label>
          <button type="button" className="action-link" onClick={onClear}>Clear chat</button>
          <button type="button" className="action-link" onClick={onExport}><Printer size={14} /> Save as PDF</button>
          <button type="button" className="action-link" onClick={onBack}>Back to portfolio</button>
        </div>
      </div>

      <div className="chat-stream" ref={chatRef}>
        {messages.length === 0 ? (
          <div className="empty-chat">Ask a question to begin the conversation.</div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              index={index}
              messages={messages}
              isSending={isSending}
              speakingId={speakingId}
              copiedId={copiedId}
              onRetry={onRetry}
              onSpeak={onSpeak}
              onCopy={onCopy}
            />
          ))
        )}

        {isSending && (
          <div className="typing-row">
            <div className="typing-dots"><span /><span /><span /></div>
            <span>LokiBot is thinking...</span>
          </div>
        )}
      </div>

      <ChatComposer
        mode="chat"
        value={draft}
        onChange={onDraftChange}
        onKeyDown={onComposerKeyDown}
        onSubmit={onSend}
        onVoiceToggle={onVoiceToggle}
        isListening={isListening}
        isSending={isSending}
        voiceSupported={voiceSupported}
        inputRef={textareaRef}
      />
      {statusMessage && <p className="status-message">{statusMessage}</p>}
    </section>
  );
}

export default ChatInterface;
