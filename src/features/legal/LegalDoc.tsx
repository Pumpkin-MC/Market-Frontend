import { useState, type ReactNode } from 'react';
import '../../styles/legal.css';

interface LegalDocProps {
  kicker?: ReactNode;
  title: ReactNode;
  lede: ReactNode;
  updated: ReactNode;
  toc?: { id: string; title: string }[];
  children: ReactNode;
  footer?: ReactNode;
}

const LegalDoc = ({ kicker, title, lede, updated, toc, children, footer }: LegalDocProps) => {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="page lg">
      <header className="lg-head">
        {kicker && <span className="sticker">{kicker}</span>}
        <h1 className="display-2">{title}</h1>
        <p className="lede">{lede}</p>
        <p className="label">{updated}</p>
      </header>

      <div className={`lg-layout${toc ? '' : ' lg-solo'}`}>
        {toc && (
          <nav className="lg-toc" aria-label="On this page">
            <span className="label">On this page</span>
            <ol>
              {toc.map(s => (
                <li key={s.id}>
                  <a href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined} onClick={() => setActive(s.id)}>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <article className="lg-doc">{children}</article>
      </div>

      {footer && <footer className="lg-foot">{footer}</footer>}
    </div>
  );
};

export default LegalDoc;
