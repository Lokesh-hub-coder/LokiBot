import ReactMarkdown from "react-markdown";

function MessageContent({ content }) {
  return (
    <div className="message-content">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),

          table: ({ children }) => (
            <div className="markdown-table-wrapper">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MessageContent;