import {
  BriefcaseBusiness,
  FileText,
  Globe,
  GraduationCap,
  Sparkles,
  Trophy,
  User,
} from "lucide-react";

const actions = [
  { label: "About", question: "What can you tell me about Lokesh?", icon: User },
  { label: "Projects", question: "What projects has Lokesh worked on?", icon: BriefcaseBusiness },
  { label: "Skills", question: "What are Lokesh's technical skills?", icon: Sparkles },
  { label: "Experience", question: "Tell me about Lokesh's experience.", icon: FileText },
  { label: "Education", question: "What is Lokesh's educational background?", icon: GraduationCap },
  { label: "Contact", question: "How can I contact Lokesh?", icon: Globe },
  { label: "Why Hire Me", question: "Why should a recruiter consider Lokesh?", icon: Trophy },
];

function QuickActions({ onSelect, disabled = false }) {
  return (
    <nav className="quick-actions" aria-label="Ask LokiBot about Lokesh">
      {actions.map(({ label, question, icon: Icon }) => (
        <button
          key={label}
          type="button"
          className="quick-action"
          onClick={() => onSelect(question)}
          disabled={disabled}
        >
          <span className="quick-icon"><Icon size={16} /></span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export default QuickActions;
