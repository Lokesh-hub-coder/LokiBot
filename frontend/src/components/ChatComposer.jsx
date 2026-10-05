import { ArrowRight, Mic, Send, VolumeX } from "lucide-react";

function ChatComposer({
  mode,
  value,
  onChange,
  onKeyDown,
  onSubmit,
  onVoiceToggle,
  isListening,
  isSending,
  voiceSupported,
  inputRef,
}) {
  const isChat = mode === "chat";

  return (
    <form
      className={isChat ? "chat-input-row" : "chat-launcher"}
      aria-label={isChat ? undefined : "Ask Lokesh anything"}
      onSubmit={onSubmit}
    >
      {isChat ? (
        <textarea
          ref={inputRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Ask about projects, skills, or experience..."
          aria-label="Chat with LokiBot"
          rows={1}
          disabled={isSending}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder="Ask me anything..."
          aria-label="Ask me anything"
          disabled={isSending}
        />
      )}

      <button
        type="button"
        className={`voice-button${isChat ? " small" : ""}`}
        aria-label={voiceSupported ? "Voice input" : "Voice input is not supported"}
        title={voiceSupported ? "Voice input" : "Voice input is not supported in this browser"}
        onClick={onVoiceToggle}
        disabled={isSending}
      >
        {isListening ? <VolumeX size={isChat ? 15 : 16} /> : <Mic size={isChat ? 15 : 16} />}
      </button>
      <button
        type="submit"
        className={`send-button${isChat ? " compact" : ""}`}
        aria-label={isChat ? "Send message" : "Send question"}
        disabled={!value.trim() || isSending}
      >
        {isSending
          ? <span className="button-spinner" aria-hidden="true" />
          : isChat ? <Send size={16} /> : <ArrowRight size={18} />}
      </button>
    </form>
  );
}

export default ChatComposer;
