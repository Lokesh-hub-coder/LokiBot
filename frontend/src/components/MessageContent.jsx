function renderInline(text) {
  const segments = text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s]+)/g);

  return segments.map((segment, index) => {
    if (segment.startsWith("**") && segment.endsWith("**")) {
      return <strong key={index}>{segment.slice(2, -2)}</strong>;
    }

    if (/^https?:\/\//.test(segment)) {
      return <a key={index} href={segment} target="_blank" rel="noreferrer">{segment}</a>;
    }

    return segment;
  });
}

function MessageContent({ content }) {
  const blocks = [];
  let listItems = [];

  function flushList() {
    if (!listItems.length) return;
    blocks.push(
      <ul key={`list-${blocks.length}`}>
        {listItems.map((item, index) => <li key={`${index}-${item}`}>{renderInline(item)}</li>)}
      </ul>,
    );
    listItems = [];
  }

  content.split(/\r?\n/).forEach((line) => {
    const bullet = line.match(/^\s*(?:[-*]|\d+\.)\s+(.+)$/);
    if (bullet) {
      listItems.push(bullet[1]);
      return;
    }

    flushList();
    if (line.trim()) {
      blocks.push(<p key={`paragraph-${blocks.length}`}>{renderInline(line)}</p>);
    }
  });
  flushList();

  return <div className="message-content">{blocks}</div>;
}

export default MessageContent;
