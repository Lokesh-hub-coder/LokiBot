import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDown,
  ArrowUp,
  BriefcaseBusiness,
  Check,
  CircleHelp,
  Code2,
  Copy,
  FileText,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import "./style.css";

const STORAGE_KEY = "portbot-conversations-v1";
const THEME_STORAGE_KEY = "portbot-theme-v1";

const suggestions = [
  { icon: BriefcaseBusiness, label: "Tell me about his experience" },
  { icon: Code2, label: "What has he built?" },
  { icon: FileText, label: "Summarize his technical skills" },
];

const jobSuggestions = [
  { icon: BriefcaseBusiness, label: "Is this candidate suitable for this role?" },
  { icon: CircleHelp, label: "Which required skills are missing?" },
  { icon: FileText, label: "What are his strengths, and should we interview him?" },
];

function readConversations() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function readTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  return isToday
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function updateAssistantMessage(setConversations, conversationId, messageId, token) {
  setConversations((current) =>
    current.map((conversation) => {
      if (conversation.id !== conversationId) return conversation;

      return {
        ...conversation,
        updatedAt: Date.now(),
        messages: conversation.messages.map((message) =>
          message.id === messageId
            ? { ...message, content: message.content + token }
            : message,
        ),
      };
    }),
  );
}

async function streamAnswer(question, history, jobDescription, onToken) {
  const response = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      history,
      job_description: jobDescription || null,
    }),
  });

  if (!response.ok) {
    let message = "The chat service is unavailable. Please try again.";
    try {
      const body = await response.json();
      message = body.detail || message;
    } catch {
      // Keep the friendly fallback if the response is not JSON.
    }
    throw new Error(message);
  }

  if (!response.body) throw new Error("The browser could not read the response stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";

    for (const rawEvent of events) {
      const lines = rawEvent.split(/\r?\n/);
      const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
      const data = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");

      if (eventName === "error") {
        const payload = JSON.parse(data || "{}");
        throw new Error(payload.message || "The response could not be generated.");
      }

      if (data && eventName !== "done") {
        const payload = JSON.parse(data);
        if (payload.token) onToken(payload.token);
      }
    }

    if (done) break;
  }
}

function App() {
  const [conversations, setConversations] = useState(readConversations);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [showJobDescription, setShowJobDescription] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [theme, setTheme] = useState(readTheme);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [error, setError] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const textareaRef = useRef(null);
  const scrollRef = useRef(null);
  const copyTimerRef = useRef(null);
  const messages = conversations.find((conversation) => conversation.id === activeId)?.messages || [];
  const hasMessages = messages.length > 0;
  const visibleSuggestions = jobDescription.trim() ? jobSuggestions : suggestions;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => () => window.clearTimeout(copyTimerRef.current), []);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [activeId, messages]);

  function startNewChat() {
    if (isSending) return;
    setActiveId(null);
    setJobDescription("");
    setShowJobDescription(false);
    setShowMobileHistory(false);
    setDraft("");
    setError("");
    setCopiedMessageId(null);
    textareaRef.current?.focus();
  }

  function clearChat() {
    if (!activeId || isSending) return;
    setConversations((current) => current.filter((conversation) => conversation.id !== activeId));
    setActiveId(null);
    setJobDescription("");
    setShowJobDescription(false);
    setDraft("");
    setError("");
    setCopiedMessageId(null);
  }

  async function copyResponse(message) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopiedMessageId(null), 1800);
    } catch {
      setError("Clipboard access is unavailable. You can select and copy the response text.");
    }
  }

  function deleteConversation(event, conversationId) {
    event.stopPropagation();
    if (isSending) return;
    setConversations((current) => current.filter((conversation) => conversation.id !== conversationId));
    if (activeId === conversationId) {
      setActiveId(null);
      setJobDescription("");
    }
  }

  function updateJobDescription(value) {
    setJobDescription(value);
    if (activeId) {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeId
            ? { ...conversation, jobDescription: value }
            : conversation,
        ),
      );
    }
  }

  function handleJobDescriptionChange(event) {
    updateJobDescription(event.target.value);
  }

  async function sendMessage(value = draft) {
    const question = value.trim();
    if (!question || isSending) return;

    const existing = conversations.find((conversation) => conversation.id === activeId);
    const history = (existing?.messages || [])
      .filter((message) =>
        (message.role === "user" || message.role === "assistant") && message.content.trim(),
      )
      .slice(-20)
      .map(({ role, content }) => ({ role, content }));
    const conversationId = existing?.id || crypto.randomUUID();
    const userMessage = { id: crypto.randomUUID(), role: "user", content: question };
    const assistantMessage = { id: crypto.randomUUID(), role: "assistant", content: "" };

    setConversations((current) => {
      const conversation = current.find((item) => item.id === conversationId);
      if (conversation) {
        return current.map((item) =>
          item.id === conversationId
            ? {
                ...item,
                title: item.messages.length === 0 ? question : item.title,
                updatedAt: Date.now(),
                jobDescription: jobDescription.trim(),
                messages: [...item.messages, userMessage, assistantMessage],
              }
            : item,
        );
      }

      return [
        {
          id: conversationId,
          title: question,
          updatedAt: Date.now(),
          jobDescription: jobDescription.trim(),
          messages: [userMessage, assistantMessage],
        },
        ...current,
      ];
    });
    setActiveId(conversationId);
    setDraft("");
    setError("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsSending(true);

    try {
      await streamAnswer(question, history, jobDescription.trim(), (token) => {
        updateAssistantMessage(setConversations, conversationId, assistantMessage.id, token);
      });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Something went wrong.";
      setError(message);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: conversation.messages.map((item) =>
                  item.id === assistantMessage.id
                    ? { ...item, content: item.content || "I couldn't complete that response." }
                    : item,
                ),
              }
            : conversation,
        ),
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleDraftChange(event) {
    setDraft(event.target.value);
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 180)}px`;
  }

  function handleComposerKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendMessage();
    }
  }

  function handleScroll() {
    const element = scrollRef.current;
    if (!element) return;
    setShowScrollButton(element.scrollHeight - element.scrollTop - element.clientHeight > 180);
  }

  return (
    <div className="app-shell" data-theme={theme}>
      {showMobileHistory && <button className="mobile-sidebar-backdrop" aria-label="Close conversation history" onClick={() => setShowMobileHistory(false)} />}
      <aside className={`sidebar${showMobileHistory ? " is-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true"><Sparkles size={18} strokeWidth={2.2} /></div>
          <span className="brand-name">portbot<span>.</span></span>
          <span className="brand-tag">PROFILE AI</span>
          <button className="mobile-sidebar-close" aria-label="Close conversation history" onClick={() => setShowMobileHistory(false)}><X size={18} /></button>
        </div>

        <button className="new-chat-button" onClick={startNewChat} disabled={isSending}>
          <Plus size={17} />
          <span>New conversation</span>
          <span className="shortcut">⌘ K</span>
        </button>

        <div className="history-heading">YOUR CONVERSATIONS</div>
        <div className="conversation-list">
          {conversations.length === 0 ? (
            <p className="history-empty">Your chats will show up here.</p>
          ) : (
            [...conversations]
              .sort((first, second) => second.updatedAt - first.updatedAt)
              .map((conversation) => (
                <button
                  key={conversation.id}
                  className={`history-item${activeId === conversation.id ? " is-active" : ""}`}
                  onClick={() => {
                    if (!isSending) {
                      setActiveId(conversation.id);
                      setJobDescription(conversation.jobDescription || "");
                      setShowJobDescription(Boolean(conversation.jobDescription));
                      setShowMobileHistory(false);
                    }
                  }}
                  title={conversation.title}
                >
                  <MessageSquare size={15} />
                  <span className="history-title">{conversation.title}</span>
                  <span className="history-actions">
                    <span className="history-date">{formatDate(conversation.updatedAt)}</span>
                    <span
                      className="delete-chat"
                      role="button"
                      tabIndex={isSending ? -1 : 0}
                      aria-label={`Delete ${conversation.title}`}
                      onClick={(event) => deleteConversation(event, conversation.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") deleteConversation(event, conversation.id);
                      }}
                    ><Trash2 size={14} /></span>
                  </span>
                </button>
              ))
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="online-indicator"><span /> Grounded in profile details</div>
          <div className="profile-row">
            <div className="profile-avatar">LS</div>
            <div className="profile-copy"><strong>Lokesh Singh</strong><span>Candidate profile</span></div>
            <CircleHelp size={17} className="help-icon" aria-label="About PortBot" />
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-history-toggle" aria-label="Open conversation history" onClick={() => setShowMobileHistory(true)}><Menu size={19} /></button>
          <div className="mobile-brand"><div className="brand-mark"><Sparkles size={16} /></div>portbot<span>.</span></div>
          <div className="topbar-context">
            <span className="context-label">TALKING TO</span>
            <span className="context-name">Lokesh Singh</span>
          </div>
          <div className="topbar-actions">
            <button
              className="topbar-icon-button theme-toggle"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            {hasMessages && (
              <button
                className="topbar-icon-button clear-chat-button"
                aria-label="Clear chat"
                title="Clear chat"
                onClick={clearChat}
                disabled={isSending}
              >
                <Trash2 size={15} />
                <span>Clear chat</span>
              </button>
            )}
            <button
              className={`job-description-toggle${jobDescription.trim() ? " has-description" : ""}`}
              aria-label={jobDescription.trim() ? "Edit job description" : "Add job description"}
              aria-expanded={showJobDescription}
              aria-controls="job-description-panel"
              title={jobDescription.trim() ? "Edit job description" : "Add job description"}
              onClick={() => setShowJobDescription((visible) => !visible)}
            >
              <BriefcaseBusiness size={15} />
              <span>{jobDescription.trim() ? "Job description added" : "Add job description"}</span>
            </button>
            <div className="grounded-badge" aria-label="Profile-grounded"><span /><span className="grounded-label">Profile-grounded</span></div>
          </div>
        </header>

        {showJobDescription && (
          <section className="job-description-panel" id="job-description-panel" aria-label="Job description">
            <div className="job-description-heading">
              <label htmlFor="job-description-input">JOB DESCRIPTION</label>
              <span>{jobDescription.length.toLocaleString()} / 12,000</span>
            </div>
            <textarea
              id="job-description-input"
              value={jobDescription}
              onChange={handleJobDescriptionChange}
              placeholder="Paste the role, responsibilities, and requirements..."
              maxLength={12000}
              rows={4}
            />
            <div className="job-description-footer">
              <span>Recommendations are for human review.</span>
              <div>
                {jobDescription && <button className="job-description-clear" onClick={() => updateJobDescription("")}>Clear</button>}
                <button className="job-description-done" onClick={() => setShowJobDescription(false)}>Done</button>
              </div>
            </div>
          </section>
        )}

        <section className="chat-region" ref={scrollRef} onScroll={handleScroll} aria-label="Conversation">
          {!hasMessages ? (
            <div className="welcome-screen">
              <div className="welcome-kicker"><span className="kicker-line" /> THE PERSON BEHIND THE PROFILE</div>
              <h1>Curious about<br /><em>Lokesh?</em></h1>
              <p className="welcome-copy">Ask about his work, projects, or technical background.<br className="desktop-break" /> Get thoughtful answers, grounded in what he’s actually done.</p>
              <div className="suggestion-list">
                {visibleSuggestions.map(({ icon: Icon, label }, index) => (
                  <button className="suggestion-button" key={label} onClick={() => sendMessage(label)} disabled={isSending}>
                    <span className="suggestion-icon"><Icon size={17} strokeWidth={1.8} /></span>
                    <span>{label}</span>
                    <ArrowUp size={15} className="suggestion-arrow" />
                    <span className="suggestion-index">0{index + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-thread">
              <div className="thread-date"><span /> A CONVERSATION WITH PORTBOT <span /></div>
              {messages.map((message) => (
                <article className={`message-row ${message.role}`} key={message.id}>
                  {message.role === "assistant" && <div className="assistant-avatar"><Sparkles size={15} /></div>}
                  <div className="message-content">
                    {message.role === "assistant" && <div className="message-label">PORTBOT <span>·</span> LOKESH’S PROFILE</div>}
                    <div className={`message-bubble ${message.role}`}>
                      {message.content || (isSending && (
                        <span className="typing-indicator" role="status" aria-label="PortBot is responding">
                          <i /><i /><i /><span>Thinking</span>
                        </span>
                      ))}
                      {message.role === "assistant" && isSending && message.content && <span className="stream-cursor" />}
                    </div>
                    {message.role === "assistant" && message.content && !(isSending && message.id === messages[messages.length - 1]?.id) && (
                      <div className="message-actions">
                        <button
                          className="copy-response-button"
                          aria-label={copiedMessageId === message.id ? "Response copied" : "Copy response"}
                          title={copiedMessageId === message.id ? "Copied" : "Copy response"}
                          onClick={() => copyResponse(message)}
                        >
                          {copiedMessageId === message.id ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedMessageId === message.id ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
              {error && <div className="error-note">{error}</div>}
              <div className="thread-end" />
            </div>
          )}
        </section>

        {showScrollButton && hasMessages && (
          <button className="scroll-to-bottom" aria-label="Scroll to latest message" onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })}>
            <ArrowDown size={16} />
          </button>
        )}

        <footer className="composer-area">
          <form className="composer" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={handleDraftChange}
              onKeyDown={handleComposerKeyDown}
              placeholder="Ask anything about Lokesh..."
              aria-label="Message PortBot"
              rows={1}
              maxLength={4000}
              disabled={isSending}
            />
            <div className="composer-bottom">
              <span className="composer-hint">{draft.length > 0 ? `${draft.length} / 4000` : "Be curious. Ask anything."}</span>
              <button className="send-button" type="submit" aria-label="Send message" disabled={!draft.trim() || isSending}>
                <ArrowUp size={19} strokeWidth={2.2} />
              </button>
            </div>
          </form>
          <div className="disclaimer">PortBot can make mistakes. Verify important details.</div>
        </footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);