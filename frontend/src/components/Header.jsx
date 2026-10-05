import { Download, MessageSquareText, Moon, Sun } from "lucide-react";

function Header({ theme, onToggleTheme, onAsk, resumeHref }) {
  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark">LS</div>
        <span className="brand-name">LokiBot</span>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="ask-header-button"
          onClick={onAsk}
          aria-label="Ask LokiBot about this portfolio"
        >
          <MessageSquareText size={15} />
          <span>Ask LokiBot</span>
        </button>
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <a href={resumeHref} className="cv-button" aria-label="Download Lokesh Singh resume">
          <Download size={15} />
          <span>Resume</span>
        </a>
      </div>
    </header>
  );
}

export default Header;
