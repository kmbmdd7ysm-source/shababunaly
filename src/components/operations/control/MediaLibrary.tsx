import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { updateMediaAsset, uploadOperationalMedia } from '../../../services/operations';
import type { OperationsRunFn } from '../../../types/operations';

export default function MediaLibrary({
  state,
  accessToken,
  pick,
  saving,
  run,
}: {
  state: unknown;
  accessToken?: string | undefined;
  pick: (value: string | { en?: string; ar?: string }) => string;
  saving?: string | boolean | undefined;
  run: OperationsRunFn;
}): ReactElement {
  const stateRecord = (state || {}) as Record<string, unknown>;
  const mediaAssets = Array.isArray(stateRecord.mediaAssets)
    ? (stateRecord.mediaAssets as Array<Record<string, unknown>>)
    : [];
  const [upload, setUpload] = useState<{
    entityType: string;
    entityId: string;
    assetRole: string;
    files: FileList | null;
  }>({
    entityType: 'site_content',
    entityId: 'home',
    assetRole: 'reference',
    files: null,
  });
  const [edits, setEdits] = useState<Record<string, Record<string, unknown>>>({});
  const doUpload = () => uploadOperationalMedia({ accessToken, ...upload });
  return (
    <section className="operations-subsection">
      <h3>{pick({ en: 'Secure media library', ar: 'مكتبة الوسائط الآمنة' })}</h3>
      <p>
        {pick({
          en: 'Every upload enters private quarantine. Public visibility is blocked until the malware worker marks it clean.',
          ar: 'كل ملف يدخل الحجر الخاص، ولا يمكن نشره قبل أن يعتمد عامل فحص البرمجيات الخبيثة حالته كملف نظيف.',
        })}
      </p>
      <form
        className="enterprise-action-card"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void Promise.resolve(
            run(
              'media-upload',
              doUpload,
              pick({ en: 'Media uploaded to quarantine.', ar: 'تم رفع الوسائط إلى الحجر.' }),
            ),
          );
        }}
      >
        <div className="operations-form-grid">
          <input
            value={upload.entityType}
            onChange={(event) => setUpload({ ...upload, entityType: event.target.value })}
            placeholder="entity_type"
            required
          />
          <input
            value={upload.entityId}
            onChange={(event) => setUpload({ ...upload, entityId: event.target.value })}
            placeholder="entity_id"
            required
          />
          <select
            value={upload.assetRole}
            onChange={(event) => setUpload({ ...upload, assetRole: event.target.value })}
          >
            <option value="reference">reference</option>
            <option value="logo">logo</option>
            <option value="sponsor">sponsor</option>
            <option value="proof">proof</option>
            <option value="production">production</option>
            <option value="tech_pack">tech_pack</option>
          </select>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf,text/csv,.xlsx"
            onChange={(event) => setUpload({ ...upload, files: event.target.files })}
            required
          />
        </div>
        <button className="btn-primary compact" disabled={saving === 'media-upload'}>
          {pick({ en: 'Upload securely', ar: 'رفع آمن' })}
        </button>
      </form>
      <div className="workspace-list">
        {mediaAssets.slice(0, 50).map((asset: Record<string, unknown>) => {
          const assetId = String(asset.id || '');
          const edit = edits[assetId] || {
            altTextEn: String(asset.alt_text_en || ''),
            altTextAr: String(asset.alt_text_ar || ''),
            sortOrder: Number(asset.sort_order) || 0,
            visibility: String(asset.visibility || 'private'),
          };
          return (
            <article key={assetId}>
              <div>
                <span
                  className="workspace-status-dot"
                  data-status={String(asset.scan_status || '')}
                />
                <div>
                  <h3>{String(asset.original_name || '')}</h3>
                  <p>
                    {String(asset.entity_type || 'media')} · {String(asset.scan_status || '')} ·{' '}
                    {String(asset.visibility || '')}
                  </p>
                  <div className="operations-form-grid">
                    <input
                      aria-label="English alt text"
                      value={String(edit.altTextEn || '')}
                      onChange={(event) =>
                        setEdits({
                          ...edits,
                          [assetId]: { ...edit, altTextEn: event.target.value },
                        })
                      }
                      placeholder="Alt text EN"
                    />
                    <input
                      aria-label="Arabic alt text"
                      value={String(edit.altTextAr || '')}
                      onChange={(event) =>
                        setEdits({
                          ...edits,
                          [assetId]: { ...edit, altTextAr: event.target.value },
                        })
                      }
                      placeholder="النص البديل"
                    />
                    <input
                      type="number"
                      value={Number(edit.sortOrder) || 0}
                      onChange={(event) =>
                        setEdits({
                          ...edits,
                          [assetId]: { ...edit, sortOrder: Number(event.target.value) || 0 },
                        })
                      }
                    />
                    <select
                      value={String(edit.visibility || 'private')}
                      disabled={asset.scan_status !== 'clean'}
                      onChange={(event) =>
                        setEdits({
                          ...edits,
                          [assetId]: { ...edit, visibility: event.target.value },
                        })
                      }
                    >
                      <option value="private">private</option>
                      <option value="public">public</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="quote-pay-actions">
                <button
                  type="button"
                  className="btn-secondary compact"
                  disabled={Boolean(saving)}
                  onClick={() => {
                    void Promise.resolve(
                      run(
                        `media-${assetId}`,
                        () => updateMediaAsset({ assetId, ...edit }),
                        pick({ en: 'Media metadata saved.', ar: 'تم حفظ بيانات الوسائط.' }),
                      ),
                    );
                  }}
                >
                  {pick({ en: 'Save', ar: 'حفظ' })}
                </button>
                {asset.scan_status === 'failed' ? (
                  <button
                    type="button"
                    className="btn-secondary compact"
                    disabled={Boolean(saving)}
                    onClick={() => {
                      void Promise.resolve(
                        run(
                          `media-retry-${assetId}`,
                          () => updateMediaAsset({ assetId, retryScan: true }),
                          pick({
                            en: 'Media scan queued again.',
                            ar: 'تمت إعادة الملف لقائمة الفحص.',
                          }),
                        ),
                      );
                    }}
                  >
                    {pick({ en: 'Retry scan', ar: 'إعادة الفحص' })}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
