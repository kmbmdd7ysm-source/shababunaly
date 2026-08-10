import type { ReactElement } from 'react';
import { useState } from 'react';
import { publishDesignProof, uploadDesignProofFiles } from '../../services/operations';
import type { OperationsRunFn } from '../../types/operations';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function DesignProofCard({
  design,
  pick,
  saving,
  run,
  accessToken,
}: {
  design: Record<string, unknown>;
  pick: (value: import('../../context/LanguageContext').LocaleValue) => string;
  saving?: string | boolean | undefined;
  run: OperationsRunFn;
  accessToken?: string | undefined;
}): ReactElement {
  const proofData = asRecord(design.proof_data);
  const proofUrlsInitial = Array.isArray(proofData.urls)
    ? (proofData.urls as unknown[]).map(String)
    : [];
  const [proofUrls, setProofUrls] = useState(proofUrlsInitial.join('\n'));
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [note, setNote] = useState(String(design.approval_note || ''));
  const locked = design.status === 'approved';
  const key = `proof-${String(design.id ?? '')}`;
  return (
    <article className="operations-card">
      <div>
        <span>{String(design.name ?? '')}</span>
        <strong>{String(design.status ?? '')}</strong>
      </div>
      <p>
        {String(design.product_type ?? '')} · v{String(design.version || 1)}
      </p>
      <label>
        <span>
          {pick({
            en: 'Upload proof files (scanned before access)',
            ar: 'رفع ملفات البروفة (يتم فحصها قبل الوصول)',
          })}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          disabled={locked}
          onChange={(event) => setProofFiles(Array.from(event.target.files || []))}
        />
      </label>
      <button
        type="button"
        className="btn-secondary compact"
        disabled={locked || saving === `${key}-upload` || !proofFiles.length}
        onClick={() => {
          void run(
            `${key}-upload`,
            () =>
              uploadDesignProofFiles({
                accessToken,
                designId: String(design.id || ''),
                files: proofFiles,
              }),
            pick({
              en: 'Proof files uploaded to private quarantine for malware scanning.',
              ar: 'تم رفع ملفات البروفة إلى الحجر الخاص لفحصها.',
            }),
          );
        }}
      >
        {pick({ en: 'Upload & Scan', ar: 'رفع وفحص' })}
      </button>
      <textarea
        rows={3}
        value={String(proofUrls ?? '')}
        onChange={(event) => setProofUrls(event.target.value)}
        placeholder={pick({
          en: 'One secure proof image/PDF URL per line',
          ar: 'رابط صورة أو PDF للبروفة في كل سطر',
        })}
        disabled={locked}
      />
      <textarea
        rows={3}
        value={String(note ?? '')}
        onChange={(event) => setNote(event.target.value)}
        placeholder={pick({ en: 'Proof note for the customer', ar: 'ملاحظة البروفة للعميل' })}
        disabled={locked}
      />
      <button
        className="btn-secondary"
        disabled={locked || saving === key || !proofUrls.trim()}
        onClick={() => {
          void run(
            key,
            () =>
              publishDesignProof({
                designId: String(design.id || ''),
                proofUrls: proofUrls.split(/\r?\n|,/),
                note,
              }),
            pick({
              en: 'Proof published and email notification queued.',
              ar: 'تم نشر البروفة وإضافة إشعار البريد.',
            }),
          );
        }}
      >
        {locked
          ? pick({ en: 'Approved & locked', ar: 'معتمد ومقفل' })
          : pick({ en: 'Publish Proof', ar: 'نشر البروفة' })}
      </button>
    </article>
  );
}
