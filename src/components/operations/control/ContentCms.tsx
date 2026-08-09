import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { updateSiteContent } from '../../../services/operations';
import { safeJson } from './shared';

type LocalePick = (value: { en: string; ar: string }) => string;

export default function ContentCms({
  state,
  pick,
  saving,
  run,
}: {
  state: unknown;
  pick: LocalePick;
  saving?: string | boolean;
  run: (key: string, action: () => Promise<unknown>, success: string) => unknown;
}): ReactElement {
  const stateRecord = (state || {}) as Record<string, unknown>;
  const defaults = useMemo(
    () =>
      ({
        home_sections: { enabled: false, sections: [] },
        our_work_projects: { enabled: false, projects: [] },
        policies: { enabled: false, pages: [] },
        translation_overrides: { enabled: false, en: {}, ar: {} },
      }) as Record<string, unknown>,
    [],
  );
  const current = (contentKey: string) => {
    const rows = Array.isArray(stateRecord.siteContent)
      ? (stateRecord.siteContent as Array<Record<string, unknown>>)
      : [];
    const hit = rows.find((row) => row.content_key === contentKey);
    return hit?.content_value || defaults[contentKey];
  };
  const [key, setKey] = useState('home_sections');
  const [text, setText] = useState(() => JSON.stringify(current('home_sections'), null, 2));
  const switchKey = (next: string) => {
    setKey(next);
    setText(JSON.stringify(current(next), null, 2));
  };
  return (
    <section className="operations-subsection">
      <h3>{pick({ en: 'Content publishing control', ar: 'التحكم في نشر المحتوى' })}</h3>
      <p>
        {pick({
          en: 'Unpublished content remains hidden. JSON is validated and written through the audited site-content RPC.',
          ar: 'يبقى المحتوى غير المنشور مخفيًا. يتم التحقق من JSON وحفظه عبر دالة محتوى موثقة في سجل التدقيق.',
        })}
      </p>
      <div className="enterprise-action-card">
        <select value={key} onChange={(event) => switchKey(event.target.value)}>
          <option value="home_sections">Home sections</option>
          <option value="our_work_projects">Our Work projects</option>
          <option value="policies">Policies</option>
          <option value="translation_overrides">Translation overrides</option>
        </select>
        <textarea
          className="operations-json-editor"
          rows={14}
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
        />
        <button
          type="button"
          className="btn-primary compact"
          disabled={saving === `content-${key}`}
          onClick={() => {
            void run(
              `content-${key}`,
              () =>
                updateSiteContent({
                  contentKey: key,
                  contentValue: safeJson(text),
                  publicRead: true,
                }),
              pick({ en: 'Content configuration saved.', ar: 'تم حفظ إعداد المحتوى.' }),
            );
          }}
        >
          {pick({ en: 'Validate & save', ar: 'تحقق واحفظ' })}
        </button>
      </div>
    </section>
  );
}
