import type { FormEvent, ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Seo from '../components/common/Seo';
import '../styles/composition.css';
import '../styles/studio.css';
import LoadingScreen from '../components/common/LoadingScreen';
import ProductionDesignEditor from '../components/custom/ProductionDesignEditor';
import TurnstileWidget from '../components/security/TurnstileWidget';
import { useLanguage } from '../context/LanguageContext';
import {
  addSharedDesignComment,
  loadSharedDesign,
  respondToSharedDesign,
} from '../services/designStudio';

type ShareComment = {
  name: string;
  email: string;
  text: string;
  view: string;
  x: number;
  y: number;
};

export default function DesignSharePage(): ReactElement {
  const { token = '' } = useParams();
  const { pick, lang } = useLanguage();
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [state, setState] = useState('loading');
  const [message, setMessage] = useState('');
  const [comment, setComment] = useState<ShareComment>({
    name: '',
    email: '',
    text: '',
    view: 'front',
    x: 50,
    y: 50,
  });
  const [decisionNote, setDecisionNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const refresh = async () => {
    setState('loading');
    try {
      setRecord(await loadSharedDesign(token));
      setState('ready');
    } catch {
      setState('invalid');
    }
  };
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dependency scope
  }, [token]);

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setBusy(true);
    try {
      const created = await addSharedDesignComment(token, { ...comment, turnstileToken });
      setRecord((current) => ({
        ...(current || {}),
        comments: [
          ...((Array.isArray(current?.comments) ? current.comments : []) as unknown[]),
          created,
        ],
      }));
      setComment((current) => ({ ...current, text: '' }));
      setTurnstileToken('');
      setMessage(pick({ en: 'Comment added securely.', ar: 'تمت إضافة التعليق بأمان.' }));
    } catch {
      setMessage(
        pick({
          en: 'The comment could not be added. Check the link and try again.',
          ar: 'تعذر إضافة التعليق. تحقق من الرابط وحاول مرة أخرى.',
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const decide = async (decision: string) => {
    setMessage('');
    setBusy(true);
    try {
      const result = await respondToSharedDesign(token, decision, decisionNote, turnstileToken);
      const decisionResult = result as Record<string, unknown>;
      setRecord((current) => ({
        ...(current || {}),
        status: decisionResult.status,
        approvalNote: decisionNote,
      }));
      setTurnstileToken('');
      setMessage(
        decision === 'approve'
          ? pick({
              en: 'Design approved. Production can proceed under the approved commercial quote.',
              ar: 'تم اعتماد التصميم. يمكن بدء الإنتاج وفق عرض السعر المعتمد.',
            })
          : pick({
              en: 'Change request sent to SHABABUNA.',
              ar: 'تم إرسال طلب التعديل إلى شبابنا.',
            }),
      );
    } catch {
      setMessage(
        pick({
          en: 'The decision could not be saved. The link may be expired or the proof is not ready.',
          ar: 'تعذر حفظ القرار. قد يكون الرابط منتهيًا أو البروفة غير جاهزة.',
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') return <LoadingScreen />;
  if (state === 'invalid')
    return (
      <section className="gw-terminal gw-review-invalid">
        <Seo title="Design link unavailable" noindex />
        <p className="section-label">SECURE DESIGN REVIEW</p>
        <h1>{pick({ en: 'This design link is unavailable', ar: 'رابط التصميم غير متاح' })}</h1>
        <p>
          {pick({
            en: 'It may be expired, revoked or incomplete. Ask SHABABUNA for a new secure link.',
            ar: 'قد يكون الرابط منتهيًا أو ملغيًا أو غير مكتمل. اطلب من شبابنا رابطًا آمنًا جديدًا.',
          })}
        </p>
      </section>
    );

  if (!record) return <LoadingScreen />;
  const permissions = String(record.permissions || '');
  const canComment = ['comment', 'approve'].includes(permissions);
  const canApprove = permissions === 'approve';
  return (
    <section className="gw-review">
      <Seo
        title={`${String(record.name || 'Design Review')} | SHABABUNA`}
        description="Secure SHABABUNA production design review."
        noindex
      />
      <header className="gw-review-head">
        <div>
          <p className="section-label">SECURE DESIGN REVIEW</p>
          <h1>{String(record.name || '')}</h1>
          <p>
            {pick({
              en: `Version ${String(record.version || '')} · Status: ${String(record.status || '')}`,
              ar: `النسخة ${String(record.version || '')} · الحالة: ${String(record.status || '')}`,
            })}
          </p>
        </div>
        <span className="secure-review-badge">
          {pick({ en: 'Private expiring link', ar: 'رابط خاص مؤقت' })}
        </span>
      </header>
      <div className="gw-layer-console gw-share-desk">
        <ProductionDesignEditor
          design={record.design}
          value={record.studio}
          onChange={() => {}}
          readOnly
          onCanvasPoint={(point: { view?: string; x?: number; y?: number }) =>
            setComment((current) => ({
              ...current,
              ...(point.view ? { view: point.view } : {}),
              ...(typeof point.x === 'number' ? { x: point.x } : {}),
              ...(typeof point.y === 'number' ? { y: point.y } : {}),
            }))
          }
        />
      </div>
      {(Array.isArray(record.comments) ? record.comments : []).length > 0 && (
        <section className="design-share-comments">
          <h2>{pick({ en: 'Review comments', ar: 'تعليقات المراجعة' })}</h2>
          {(record.comments as Array<Record<string, unknown>>).map((item) => (
            <article key={String(item.id)}>
              <strong>{String(item.author || 'Reviewer')}</strong>
              <span>
                {String(item.view || 'front').toUpperCase()} ·{' '}
                {new Date(String(item.createdAt || Date.now())).toLocaleString()}
              </span>
              <p>{String(item.text || '')}</p>
            </article>
          ))}
        </section>
      )}
      {canComment && (
        <form
          className="design-share-form"
          onSubmit={(event) => {
            void submitComment(event);
          }}
        >
          <h2>{pick({ en: 'Add a pinned review comment', ar: 'أضف تعليق مراجعة مثبتًا' })}</h2>
          <p>
            {pick({
              en: 'Select the exact point on the design preview, or enter coordinates below.',
              ar: 'اختر الموضع الدقيق على معاينة التصميم أو أدخل الإحداثيات أدناه.',
            })}
          </p>
          <div className="design-share-form-grid">
            <label>
              <span>{pick({ en: 'Name', ar: 'الاسم' })}</span>
              <input
                value={comment.name}
                maxLength={120}
                onChange={(event) => setComment({ ...comment, name: event.target.value })}
                required
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={comment.email}
                maxLength={254}
                onChange={(event) => setComment({ ...comment, email: event.target.value })}
              />
            </label>
            <label>
              <span>{pick({ en: 'View', ar: 'الواجهة' })}</span>
              <select
                value={comment.view}
                onChange={(event) => setComment({ ...comment, view: event.target.value })}
              >
                <option value="front">Front</option>
                <option value="back">Back</option>
                <option value="side">Side</option>
              </select>
            </label>
            <label>
              <span>X %</span>
              <input
                type="number"
                min="0"
                max="100"
                value={comment.x}
                onChange={(event) => setComment({ ...comment, x: Number(event.target.value) })}
              />
            </label>
            <label>
              <span>Y %</span>
              <input
                type="number"
                min="0"
                max="100"
                value={comment.y}
                onChange={(event) => setComment({ ...comment, y: Number(event.target.value) })}
              />
            </label>
          </div>
          <label>
            <span>{pick({ en: 'Comment', ar: 'التعليق' })}</span>
            <textarea
              required
              minLength={2}
              maxLength={1000}
              rows={4}
              value={comment.text}
              onChange={(event) => setComment({ ...comment, text: event.target.value })}
            />
          </label>
          <TurnstileWidget onToken={setTurnstileToken} language={lang} />
          <button className="btn-primary" disabled={busy || !turnstileToken}>
            {pick({ en: 'Submit Comment', ar: 'إرسال التعليق' })}
          </button>
        </form>
      )}
      {canApprove && (
        <section className="design-share-decision">
          <h2>{pick({ en: 'Proof decision', ar: 'قرار البروفة' })}</h2>
          <label>
            <span>
              {pick({
                en: 'Approval note or required changes',
                ar: 'ملاحظة الاعتماد أو التعديلات المطلوبة',
              })}
            </span>
            <textarea
              rows={4}
              maxLength={2000}
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
            />
          </label>
          <TurnstileWidget onToken={setTurnstileToken} language={lang} />
          <div>
            <button
              className="btn-primary"
              disabled={busy || !turnstileToken || record.status === 'approved'}
              onClick={() => {
                void decide('approve');
              }}
            >
              {pick({ en: 'Approve Final Proof', ar: 'اعتماد البروفة النهائية' })}
            </button>
            <button
              className="btn-secondary"
              disabled={busy || !turnstileToken || decisionNote.trim().length < 2}
              onClick={() => {
                void decide('request_changes');
              }}
            >
              {pick({ en: 'Request Changes', ar: 'طلب تعديلات' })}
            </button>
          </div>
        </section>
      )}
      {message && (
        <p role="alert" className="form-status">
          {message}
        </p>
      )}
    </section>
  );
}
