// StreamingText — reveals text word-by-word like an LLM streaming its output,
// with a blinking caret while it types. Used in the reasoning terminal and the
// Kitchen Cam summary banner to add a live "AI is thinking / generating" feel
// instead of text appearing instantly.

import { useEffect, useMemo, useState } from 'react';

export default function StreamingText({ text = '', speed = 45, className = '' }) {
  const words = useMemo(() => String(text).split(' '), [text]);
  const [n, setN] = useState(0);

  useEffect(() => {
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= words.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, words.length]);

  const done = n >= words.length;

  return (
    <span className={className}>
      {words.slice(0, n).join(' ')}
      {!done && (
        <span aria-hidden="true" className="ml-0.5 inline-block animate-pulse font-normal">
          ▍
        </span>
      )}
    </span>
  );
}
