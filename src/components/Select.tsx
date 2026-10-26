import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';

type Option = { value: string; label: string };

type SelectProps = {
  options: (Option | string)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
};

const normalize = (o: Option | string): Option => (typeof o === 'string' ? { value: o, label: o } : o);

export const Select = ({ options, value, onChange, placeholder = 'Select', className = '', ...aria }: SelectProps) => {
  const items = options.map(normalize);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const selected = items.findIndex(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const show = () => {
    setActive(Math.max(selected, 0));
    setOpen(true);
  };

  const pick = (i: number) => {
    onChange(items[i].value);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const last = items.length - 1;
    const keys: Record<string, () => void> = {
      ArrowDown: () => (open ? setActive(a => Math.min(a + 1, last)) : show()),
      ArrowUp: () => (open ? setActive(a => Math.max(a - 1, 0)) : show()),
      Home: () => setActive(0),
      End: () => setActive(last),
      Enter: () => (open ? pick(active) : show()),
      ' ': () => (open ? pick(active) : show()),
      Escape: () => setOpen(false),
      Tab: () => setOpen(false),
    };
    if (keys[e.key]) {
      if (e.key !== 'Tab') e.preventDefault();
      keys[e.key]();
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const from = open ? active : selected;
      const order = [...items.slice(from + 1), ...items.slice(0, from + 1)];
      const match = order.find(o => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (!match) return;
      const i = items.indexOf(match);
      if (open) setActive(i);
      else onChange(match.value);
    }
  };

  return (
    <div className={`dropdown ${className}`} ref={root} data-open={open || undefined}>
      <button
        type="button"
        className="dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        {...aria}
      >
        <span className={selected < 0 ? 'dropdown-placeholder' : undefined}>{selected < 0 ? placeholder : items[selected].label}</span>
        <ChevronDown />
      </button>
      {open && (
        <ul className="dropdown-list" role="listbox" id={id} ref={list} onClick={e => e.preventDefault()} {...aria}>
          {items.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === selected}
              data-active={i === active || undefined}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
