import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Code2,
  Github,
  Linkedin,
  MessageSquareText,
} from "lucide-react";
import Avatar from "./components/Avatar";
import ChatComposer from "./components/ChatComposer";
import ChatInterface from "./components/ChatInterface";
import Header from "./components/Header";
import MessageContent from "./components/MessageContent";
import QuickActions from "./components/QuickActions";

const STORAGE_KEY = "loki-chat-history";
const THEME_KEY = "loki-theme";
const CANDIDATE_NAME = "Lokesh Singh";
const SOCIAL_LINKS = [
  { label: "GitHub", href: "https://github.com/Lokesh-hub-coder", icon: Github },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/lokesh-singh-70833b27b/?isSelfProfile=true", icon: Linkedin },
  { label: "LeetCode", href: "https://leetcode.com/u/Lokesh_leetcoder/", icon: Code2 },
];
const MIN_JOB_DESCRIPTION_LENGTH = 30;
const MIN_JOB_DESCRIPTION_WORDS = 5;
const API_BASE_URL = (
  import.meta.env.NEXT_PUBLIC_API_URL || import.meta.env.VITE_API_URL || ""
).trim().replace(/\/+$/, "").replace(/\/chat$/i, "");
const CHAT_ENDPOINT = import.meta.env.DEV ? "/chat" : `${API_BASE_URL}/chat`;
const RESUME_ENDPOINT = import.meta.env.DEV ? "/resume" : `${API_BASE_URL}/resume`;

function readHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value)
      ? value.map((message) => (
        typeof message?.error === "string" && /failed to fetch/i.test(message.error)
          ? { ...message, error: "The earlier request could not reach the API. You can retry it now." }
          : message
      ))
      : [];
  } catch {
    return [];
  }
}

function readTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return "light";
}

function sanitizeHistory(messages) {
  return (messages || [])
    .filter((message) => message && typeof message.role === "string" && typeof message.content === "string")
    .slice(-20)
    .map((message) => ({ role: message.role, content: message.content.trim() }))
    .filter((message) => message.content.length > 0);
}

async function streamAnswer(question, history, jobDescription, onToken) {
  if (import.meta.env.PROD && !API_BASE_URL) {
    throw new Error("The production API URL is not configured. Set NEXT_PUBLIC_API_URL to your deployed FastAPI origin in Vercel, and allow the Vercel site origin with FRONTEND_ORIGINS on FastAPI.");
  }

  const endpoint = CHAT_ENDPOINT;
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        history: sanitizeHistory(history),
        job_description: jobDescription?.trim() || null,
      }),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Could not reach the LokiBot API at ${endpoint}. Check that FastAPI is online over HTTPS and that its FRONTEND_ORIGINS includes this site's exact origin.`);
    }
    throw error;
  }

  if (!response.ok) {
    let message = "The AI assistant is unavailable right now.";
    try {
      const errorData = await response.json();
      message = errorData.detail || message;
    } catch {
      // ignore non-JSON error responses
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("The browser could not read the response stream.");
  }
  if (!response.headers.get("content-type")?.includes("text/event-stream")) {
    throw new Error("The API returned an unexpected response instead of a chat stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";

    for (const eventBlock of events) {
      const lines = eventBlock.split(/\r?\n/);
      const eventName = lines.find((line) => line.startsWith("event:"))?.replace("event:", "").trim();
      const data = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.replace(/^data:\s?/, ""))
        .join("\n");

      if (eventName === "error") {
        const payload = JSON.parse(data || "{}");
        throw new Error(payload.message || payload.error || "The response could not be generated.");
      }

      if (data && eventName !== "done") {
        const payload = JSON.parse(data);
        if (payload.token) {
          onToken(payload.token);
        }
      }
    }

    if (done) break;
  }
}

function App() {
  const [theme, setTheme] = useState(readTheme);
  const [messages, setMessages] = useState(() => readHistory());
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [language, setLanguage] = useState("en");
  const [jobText, setJobText] = useState("");
  const [jobMatch, setJobMatch] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [speakingId, setSpeakingId] = useState("");
  const [expandedChat, setExpandedChat] = useState(false);
  const textareaRef = useRef(null);
  const chatRef = useRef(null);
  const chatPanelRef = useRef(null);
  const heroRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechRef = useRef(null);

  const visibleMessages = useMemo(() => messages.filter((message) => message.role === "user" || message.role === "assistant"), [messages]);
  const isJobDescriptionReady = jobText.trim().length >= MIN_JOB_DESCRIPTION_LENGTH
    && jobText.trim().split(/\s+/).length >= MIN_JOB_DESCRIPTION_WORDS;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === "hi" ? "hi-IN" : "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      setDraft((current) => (current ? `${current} ${transcript}`.trim() : transcript));
      setStatusMessage("Voice input captured. Review and send when ready.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      const message = event.error === "not-allowed"
        ? "Microphone permission was denied. You can still type your question."
        : event.error === "no-speech"
          ? "No speech was detected. Try again or type your question."
          : "Voice input is not available right now. You can still type manually.";
      setStatusMessage(message);
    };

    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, [language]);

  useEffect(() => {
    const element = chatRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [visibleMessages, expandedChat]);

  useEffect(() => {
    if (expandedChat) {
      chatPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [expandedChat]);

  function updateMessageContent(messageId, token) {
    setMessages((current) =>
      current.map((message) => (message.id === messageId ? { ...message, content: message.content + token } : message)),
    );
  }

  async function sendMessage(questionInput, options = {}) {
    const question = (questionInput || draft).trim();
    if (!question || isSending) return;
    const conversationHistory = options.history || messages;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      createdAt: Date.now(),
    };

    const assistantMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };

    setMessages((current) => [
      ...current.filter((message) => !options.replaceMessageIds?.includes(message.id)),
      userMessage,
      assistantMessage,
    ]);
    setDraft("");
    setExpandedChat(true);
    setIsSending(true);
    setStatusMessage("");

    let fullReply = "";

    try {
      const backendQuestion = language === "hi" ? `कृपया हिंदी में उत्तर दें। ${question}` : question;
      await streamAnswer(backendQuestion, conversationHistory, options.jobDescription || "", (token) => {
        fullReply += token;
        updateMessageContent(assistantMessage.id, token);
      });
      if (!fullReply.trim()) {
        const message = "The response stream ended without a reply. Please try again.";
        setMessages((current) =>
          current.map((entry) => entry.id === assistantMessage.id
            ? { ...entry, error: message }
            : entry),
        );
        setStatusMessage(message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setMessages((current) =>
        current.map((entry) =>
          entry.id === assistantMessage.id
            ? { ...entry, content: "", error: message }
            : entry,
        ),
      );
      setStatusMessage(message);
    } finally {
      setIsSending(false);
    }

  }

  function handleDraftChange(event) {
    setDraft(event.target.value);
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`;
  }

  function handleComposerKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendMessage();
    }
  }

  function openAssistant() {
    setExpandedChat(true);
    window.setTimeout(() => chatPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function backToPortfolio() {
    setExpandedChat(false);
    window.setTimeout(() => heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function retryMessage(message, index) {
    const previousMessage = visibleMessages[index - 1];
    if (previousMessage?.role !== "user") return;
    sendMessage(previousMessage.content, {
      history: visibleMessages.slice(0, index - 1),
      replaceMessageIds: [previousMessage.id, message.id],
    });
  }

  async function analyzeJobMatch() {
    if (!isJobDescriptionReady) {
      setStatusMessage(`Please paste a complete job description with at least ${MIN_JOB_DESCRIPTION_WORDS} words and ${MIN_JOB_DESCRIPTION_LENGTH} characters.`);
      return;
    }
    setStatusMessage("");
    const question = language === "hi"
      ? "उम्मीदवार की प्रोफ़ाइल की केवल स्पष्ट जानकारी का उपयोग करके नौकरी का मिलान करें। संक्षिप्त अनुभाग दें: Suitability (0 से 10 तक अनुमानित गुणात्मक फिट स्कोर, यह संभावना या अंतिम निर्णय नहीं है; संक्षेप में आधार बताएं), Strengths and Matching Skills, Relevant Experience and Project Evidence, Missing or Unlisted Requirements (जो जानकारी प्रोफ़ाइल में नहीं है उसे अज्ञात बताएं, पक्का कौशल-अभाव नहीं), और Interview Recommendation (मानव समीक्षा के लिए अस्थायी सुझाव)। डिग्री पूरी मानकर न चलें, पेशेवर अनुभव का अनुमान न लगाएँ, और प्रोफ़ाइल में स्पष्ट उल्लेख न होने पर किसी कौशल को परियोजना में उपयोग किया हुआ न बताएँ। योग्यता या परिणाम न गढ़ें।"
      : "Compare the job description with the candidate profile using only explicit profile evidence. Return concise sections titled Suitability (an approximate qualitative fit score from 0 to 10, not a probability or final decision; briefly explain its evidence-based rationale), Strengths and Matching Skills, Relevant Experience and Project Evidence, Missing or Unlisted Requirements (treat anything absent from the profile as unknown, not a confirmed skill gap), and Interview Recommendation (tentative, for human review). Do not assume the degree is complete, infer professional experience, or claim a listed skill was used in a project unless the profile explicitly says so. Do not invent qualifications or project outcomes.";

    setMatchLoading(true);
    setStatusMessage("");
    let fullReply = "";

    try {
      await streamAnswer(question, [], jobText, (token) => {
        fullReply += token;
      });
      setJobMatch(fullReply.trim()
        ? { raw: fullReply }
        : { raw: "The backend returned an empty match assessment.", error: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The matching service failed.";
      setJobMatch({ raw: message, error: true });
    } finally {
      setMatchLoading(false);
    }
  }

  function copyMessage(content, messageId) {
    if (!navigator.clipboard?.writeText) {
      setStatusMessage("Copy is unavailable in this browser context.");
      return;
    }

    navigator.clipboard.writeText(content)
      .then(() => {
        setCopiedId(messageId);
        window.setTimeout(() => setCopiedId(""), 1800);
      })
      .catch(() => setStatusMessage("Could not copy the response. Check clipboard permissions."));
  }

  function handleVoiceToggle() {
    if (!recognitionRef.current) {
      setStatusMessage("Voice input is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    recognitionRef.current.lang = language === "hi" ? "hi-IN" : "en-US";
    try {
      recognitionRef.current.start();
      setIsListening(true);
      setStatusMessage("Listening... speak naturally.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not start voice input.");
    }
  }

  function playSpeech(text, messageId) {
    if (!text) return;
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setStatusMessage("Text-to-speech is not supported in this browser.");
      return;
    }
    if (speechRef.current) {
      window.speechSynthesis.cancel();
      speechRef.current = null;
      setSpeakingId("");
      if (speakingId === messageId) return;
    }

    const spokenText = text
      .replace(/\*\*/g, "")
      .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, "")
      .replace(/https?:\/\/\S+/g, "");
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = language === "hi" ? "hi-IN" : "en-US";
    speechRef.current = utterance;

    utterance.onend = () => {
      speechRef.current = null;
      setSpeakingId("");
    };

    window.speechSynthesis.speak(utterance);
    setSpeakingId(messageId);
  }

  function clearConversation() {
    setMessages([]);
    setExpandedChat(false);
    setStatusMessage("Conversation cleared.");
    window.speechSynthesis?.cancel();
    setSpeakingId("");
  }

  function exportChat() {
    if (!messages.length) return;

    const printable = messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .filter((message) => message.content)
      .map((message) => ({
        speaker: message.role === "user" ? "You" : "LokiBot",
        content: message.content,
      }));
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setStatusMessage("Allow pop-ups to save the conversation as a PDF.");
      return;
    }

    const escapeHtml = (value) =>
      value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]);
    const transcript = printable.map(({ speaker, content }) => `
      <article>
        <h2>${escapeHtml(speaker)}</h2>
        <p>${escapeHtml(content).replace(/\n/g, "<br>")}</p>
      </article>
    `).join("");

    printWindow.document.write(`<!doctype html>
      <html><head><meta charset="utf-8"><title>LokiBot conversation</title>
      <style>
        body{font:15px/1.65 Arial,sans-serif;color:#111;max-width:760px;margin:48px auto;padding:0 24px}
        h1{font-size:24px;margin-bottom:6px} .date{color:#666;margin-bottom:32px}
        article{border-top:1px solid #eaeaea;padding:18px 0} h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#666}
        p{white-space:normal;margin:0}@media print{body{margin:24px auto}}
      </style></head><body><h1>LokiBot conversation</h1>
      <div class="date">${new Date().toLocaleString()}</div>${transcript}
      <script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
  }

  function renderMatchInfo() {
    if (!jobMatch) return null;

    return (
      <div className="match-panel">
        <MessageContent content={jobMatch.raw || ""} />
      </div>
    );
  }

  return (
    <div className="portfolio-shell" data-theme={theme}>
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        onAsk={openAssistant}
        resumeHref={RESUME_ENDPOINT}
      />

      <main className="page-shell">
        <section className="hero-section" ref={heroRef}>
          <div className="hero-main">
            <div className="hero-copy">
              <p className="eyebrow">AI-powered developer portfolio</p>
              <p className="greeting">Hello, I&apos;m</p>
              <h1>{CANDIDATE_NAME}</h1>
              <p className="hero-role">LokiBot · AI Portfolio Assistant</p>
              <p className="hero-summary">
                Ask LokiBot about Lokesh&apos;s work, skills, or background. It answers from his candidate profile.
              </p>
              <button type="button" className="hero-ask-button" onClick={() => sendMessage("Tell me about Lokesh's projects and work.")}>
                <MessageSquareText size={16} />
                Ask LokiBot about my work
                <ArrowRight className="hero-ask-arrow" size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="hero-visual">
              <Avatar />
            </div>
          </div>

          <ChatComposer
            mode="hero"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
            onVoiceToggle={handleVoiceToggle}
            isListening={isListening}
            isSending={isSending}
            voiceSupported={voiceSupported}
          />
          {!expandedChat && statusMessage && <p className="hero-status" role="status">{statusMessage}</p>}
          <div className="try-asking">
            <span className="try-asking-label">Try asking</span>
            <button type="button" onClick={() => sendMessage("What has Lokesh built?")} disabled={isSending}>“What has Lokesh built?”</button>
            <button type="button" onClick={() => sendMessage("What technologies does Lokesh use?")} disabled={isSending}>“What technologies does he use?”</button>
            <button type="button" onClick={() => sendMessage("Why should I hire Lokesh?")} disabled={isSending}>“Why should I hire him?”</button>
          </div>
          <QuickActions onSelect={sendMessage} disabled={isSending} />
        </section>

        {expandedChat && (
          <ChatInterface
            panelRef={chatPanelRef}
            messages={visibleMessages}
            chatRef={chatRef}
            isSending={isSending}
            language={language}
            onLanguageChange={setLanguage}
            onClear={clearConversation}
            onExport={exportChat}
            onBack={backToPortfolio}
            statusMessage={statusMessage}
            draft={draft}
            onDraftChange={handleDraftChange}
            onComposerKeyDown={handleComposerKeyDown}
            onSend={(event) => {
              event.preventDefault();
              sendMessage();
            }}
            onVoiceToggle={handleVoiceToggle}
            isListening={isListening}
            voiceSupported={voiceSupported}
            textareaRef={textareaRef}
            speakingId={speakingId}
            copiedId={copiedId}
            onRetry={retryMessage}
            onSpeak={playSpeech}
            onCopy={copyMessage}
          />
        )}

        <section id="job-match" className="content-section">
          <div className="section-heading">
            <span className="eyebrow">For recruiters</span>
            <h2>Match Me With This Job</h2>
          </div>

          <div className="card match-card">
            <div className="section-head-row">
              <div>
                <span className="eyebrow">Evidence-based role review</span>
                <h3>Share a job description</h3>
              </div>
              <button type="button" className="mini-button" onClick={analyzeJobMatch} disabled={matchLoading || !isJobDescriptionReady}>
                {matchLoading ? "Reviewing..." : "Assess fit"}
              </button>
            </div>

            <textarea
              value={jobText}
              onChange={(event) => {
                setJobText(event.target.value);
                setJobMatch(null);
                setStatusMessage("");
              }}
              placeholder="Paste a job description. LokiBot will compare its requirements with profile evidence and provide an approximate fit rating out of 10."
              rows={5}
              aria-label="Paste a job description"
            />
            {jobText.trim() && !isJobDescriptionReady && (
              <p className="job-match-hint" role="status">
                Add a complete job description (at least {MIN_JOB_DESCRIPTION_WORDS} words and {MIN_JOB_DESCRIPTION_LENGTH} characters) to assess fit.
              </p>
            )}

            {matchLoading && <p className="status-message" role="status">Comparing the role requirements with the candidate profile…</p>}
            {jobMatch?.error && (
              <div className="match-error">
                <p className="status-message error-message" role="alert">{jobMatch.raw}</p>
                <button type="button" className="action-link" onClick={analyzeJobMatch} disabled={matchLoading || !isJobDescriptionReady}>
                  Try again
                </button>
              </div>
            )}
            {!jobMatch?.error && renderMatchInfo()}
          </div>
        </section>

        <footer id="contact" className="portfolio-contact" aria-label="Contact and social links">
          <nav className="social-links" aria-label="Social links">
            {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}>
                <Icon size={16} /> <span>{label}</span>
              </a>
            ))}
          </nav>
        </footer>
      </main>
    </div>
  );
}

export default App;
