import { useId, useState } from 'react';

// Accessible accordion. items: [{ title, content }]. `single` collapses others.
export default function Accordion({ items, single = false, defaultOpen = [] }) {
  const [open, setOpen] = useState(new Set(defaultOpen));
  const baseId = useId();
  const toggle = (i) =>
    setOpen((prev) => {
      const isOpen = prev.has(i);
      if (single) return isOpen ? new Set() : new Set([i]);
      const next = new Set(prev);
      if (isOpen) next.delete(i);
      else next.add(i);
      return next;
    });
  return (
    <div className="accordion">
      {items.map((item, i) => {
        const isOpen = open.has(i);
        return (
          <div key={i} className={`accordion-item${isOpen ? ' open' : ''}`}>
            <h3 className="accordion-header">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`${baseId}-panel-${i}`}
                id={`${baseId}-btn-${i}`}
                onClick={() => toggle(i)}
              >
                <span>{item.title}</span>
                <span className="accordion-icon" aria-hidden="true" />
              </button>
            </h3>
            <div
              id={`${baseId}-panel-${i}`}
              role="region"
              aria-labelledby={`${baseId}-btn-${i}`}
              className="accordion-panel"
              hidden={!isOpen}
            >
              <div className="accordion-content">{item.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
