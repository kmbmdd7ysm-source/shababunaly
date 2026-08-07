import { useMemo, useState } from 'react';
import { updateSiteContent } from '../../../services/operations';
import { safeJson } from './shared';

export default function ContentCms({ state, pick, saving, run }) {
  const defaults = useMemo(() => ({
    home_sections: { enabled: false, sections: [] },
    our_work_projects: { enabled: false, projects: [] },
    policies: { enabled: false, pages: [] },
    translation_overrides: { enabled: false, en: {}, ar: {} },
  }), []);
  const current = (key) => state.siteContent.find((row) => row.content_key === key)?.content_value || defaults[key];
  const [key, setKey] = useState('home_sections');
  const [text, setText] = useState(() => JSON.stringify(current('home_sections'), null, 2));
  const switchKey = (next) => { setKey(next); setText(JSON.stringify(current(next), null, 2)); };
  return <section className="operations-subsection"><h3>{pick({ en: 'Content publishing control', ar: 'التحكم في نشر المحتوى' })}</h3><p>{pick({ en: 'Unpublished content remains hidden. JSON is validated and written through the audited site-content RPC.', ar: 'يبقى المحتوى غير المنشور مخفيًا. يتم التحقق من JSON وحفظه عبر دالة محتوى موثقة في سجل التدقيق.' })}</p><div className="enterprise-action-card"><select value={key} onChange={(event) => switchKey(event.target.value)}><option value="home_sections">Home sections</option><option value="our_work_projects">Our Work projects</option><option value="policies">Policies</option><option value="translation_overrides">Translation overrides</option></select><textarea className="operations-json-editor" rows={14} value={text} onChange={(event) => setText(event.target.value)} spellCheck="false" /><button type="button" className="btn-primary compact" disabled={saving === `content-${key}`} onClick={() => run(`content-${key}`, () => updateSiteContent({ contentKey: key, contentValue: safeJson(text), publicRead: true }), pick({ en: 'Content configuration saved.', ar: 'تم حفظ إعداد المحتوى.' }))}>{pick({ en: 'Validate & save', ar: 'تحقق واحفظ' })}</button></div></section>;
}



