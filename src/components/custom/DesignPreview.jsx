import { useId } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { getCustomProductType } from '../../data/customization';

const safeText = (value, fallback, limit = 18) => String(value || fallback).trim().toUpperCase().slice(0, limit);

function PatternDefs({ id, design }) {
  return (
    <defs>
      <linearGradient id={`${id}-gradient`} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor={design.primary} />
        <stop offset="100%" stopColor={design.secondary} />
      </linearGradient>
      <pattern id={`${id}-geometric`} width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
        <rect width="34" height="34" fill={design.primary} />
        <path d="M0 0h12v34H0z" fill={design.secondary} opacity=".38" />
        <path d="M22 0h4v34h-4z" fill={design.accent} opacity=".65" />
      </pattern>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="160%">
        <feDropShadow dx="0" dy="14" stdDeviation="12" floodOpacity=".22" />
      </filter>
    </defs>
  );
}

function fillFor(design, id) {
  if (design.pattern === 'gradient') return `url(#${id}-gradient)`;
  if (design.pattern === 'geometric') return `url(#${id}-geometric)`;
  return design.primary;
}

function TextBlock({ design, back = false, x = 210, y = 190, numberY = 285, width = 230 }) {
  const team = safeText(design.teamName, 'SHABABUNA');
  const player = safeText(design.playerName, 'PLAYER', 14);
  const number = safeText(design.number, '00', 2);
  const fontFamily = design.font === 'condensed' ? 'Arial Narrow, sans-serif' : design.font === 'modern' ? 'system-ui, sans-serif' : 'Impact, Arial Black, sans-serif';
  return (
    <g textAnchor="middle" fill={design.secondary} fontFamily={fontFamily}>
      {!back && design.logoPreview ? <image href={design.logoPreview} x={x - 34} y={y - 86} width="68" height="68" preserveAspectRatio="xMidYMid meet" /> : null}
      <text x={x} y={y} fontSize="26" fontWeight="800" letterSpacing="2.2">{back ? player : team}</text>
      <text x={x} y={numberY} fontSize="104" fontWeight="900" letterSpacing="-5">{number}</text>
      {!back && design.sponsorName ? <text x={x} y={numberY + 50} fontSize="15" fontWeight="700" letterSpacing="1.8">{safeText(design.sponsorName, '', 22)}</text> : null}
      <text x={x} y={numberY + 94} fontSize="11" fontWeight="800" letterSpacing="2.4">BUILT DIFFERENT</text>
      <rect x={x - width / 2} y={numberY + 110} width={width} height="2" rx="1" fill={design.accent} opacity=".8" />
    </g>
  );
}

function UniformPreview({ design, id }) {
  const baseFill = fillFor(design, id);
  const stripe = design.pattern === 'side-stripe';
  const split = design.pattern === 'split';
  return (
    <svg viewBox="0 0 920 650" role="img" aria-label="Custom uniform front and back preview">
      <PatternDefs id={id} design={design} />
      <g filter={`url(#${id}-shadow)`}>
        {[70, 500].map((offset, index) => {
          const back = index === 1;
          return (
            <g key={offset} transform={`translate(${offset} 38)`}>
              <path d="M116 20L172 54H248L304 20L384 82L350 150L318 128V466H102V128L70 150L36 82Z" fill={baseFill} stroke={design.secondary} strokeWidth="5" />
              {split ? <path d="M210 55H384V466H210Z" fill={design.secondary} opacity=".33" /> : null}
              {stripe ? <path d="M100 126L132 141V466H102V128ZM320 141L350 126V466H318Z" fill={design.secondary} opacity=".9" /> : null}
              <path d={design.neckline === 'v-neck' ? 'M172 54L210 105L248 54' : design.neckline === 'crew' ? 'M172 54Q210 98 248 54' : 'M172 54Q210 122 248 54'} fill="none" stroke={design.secondary} strokeWidth="13" />
              <path d="M70 150L102 128M318 128L350 150" stroke={design.accent} strokeWidth="8" />
              <TextBlock design={design} back={back} x={210} y={190} numberY={292} />
              <path d="M118 478H302L324 604H96Z" fill={baseFill} stroke={design.secondary} strokeWidth="5" />
              {stripe ? <path d="M96 604L118 478H142L132 604ZM324 604L302 478H278L288 604Z" fill={design.secondary} /> : null}
              {split ? <path d="M210 478H302L324 604H210Z" fill={design.secondary} opacity=".33" /> : null}
              <text x="210" y="570" textAnchor="middle" fill={design.secondary} fontFamily="Impact, sans-serif" fontSize="45" fontWeight="900">{safeText(design.number, '00', 2)}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function JerseyPreview({ design, id, shirt = false }) {
  const baseFill = fillFor(design, id);
  return (
    <svg viewBox="0 0 920 570" role="img" aria-label="Custom jersey preview">
      <PatternDefs id={id} design={design} />
      {[70, 500].map((offset, index) => (
        <g key={offset} transform={`translate(${offset} 44)`} filter={`url(#${id}-shadow)`}>
          <path d={shirt ? 'M84 80L164 24H256L336 80L390 126L344 192L316 166V484H104V166L76 192L30 126Z' : 'M118 20L172 54H248L302 20L384 82L350 150L318 128V466H102V128L70 150L36 82Z'} fill={baseFill} stroke={design.secondary} strokeWidth="5" />
          {design.pattern === 'side-stripe' ? <path d="M102 128H132V466H102ZM288 128H318V466H288Z" fill={design.secondary} /> : null}
          {design.pattern === 'split' ? <path d="M210 54H350V466H210Z" fill={design.secondary} opacity=".33" /> : null}
          <TextBlock design={design} back={index === 1} x={210} y={190} numberY={292} />
        </g>
      ))}
    </svg>
  );
}


function ShortsPreview({ design, id }) {
  const baseFill = fillFor(design, id);
  return (
    <svg viewBox="0 0 920 580" role="img" aria-label="Custom basketball shorts preview">
      <PatternDefs id={id} design={design} />
      {[110, 510].map((offset, index) => <g key={offset} transform={`translate(${offset} 42)`} filter={`url(#${id}-shadow)`}>
        <path d="M95 30H305L348 470L230 462L200 280L170 462L52 470Z" fill={baseFill} stroke={design.secondary} strokeWidth="7" />
        {design.pattern === 'side-stripe' ? <><path d="M52 470L95 30H132L116 458Z" fill={design.secondary}/><path d="M348 470L305 30H268L284 458Z" fill={design.secondary}/></> : null}
        {design.pattern === 'split' ? <path d="M200 30H305L348 470L230 462L200 280Z" fill={design.secondary} opacity=".33"/> : null}
        <text x="200" y="220" textAnchor="middle" fill={design.secondary} fontFamily="Impact, sans-serif" fontSize="82" fontWeight="900">{safeText(design.number, '00', 2)}</text>
        <text x="200" y="330" textAnchor="middle" fill={design.accent} fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="800" letterSpacing="2">{index ? 'BACK' : 'FRONT'}</text>
      </g>)}
    </svg>
  );
}

function PantsPreview({ design, id }) {
  const baseFill = fillFor(design, id);
  return (
    <svg viewBox="0 0 920 650" role="img" aria-label="Custom team pants preview">
      <PatternDefs id={id} design={design} />
      {[110, 510].map((offset, index) => <g key={offset} transform={`translate(${offset} 24)`} filter={`url(#${id}-shadow)`}>
        <path d="M90 30H310L350 590H225L200 280L175 590H50Z" fill={baseFill} stroke={design.secondary} strokeWidth="7" />
        <path d="M200 30V280" stroke={design.accent} strokeWidth="6" />
        {design.pattern === 'side-stripe' ? <><path d="M50 590L90 30H122L112 586Z" fill={design.secondary}/><path d="M350 590L310 30H278L288 586Z" fill={design.secondary}/></> : null}
        <text x="200" y="200" textAnchor="middle" fill={design.secondary} fontFamily="Impact, sans-serif" fontSize="28" fontWeight="900">{safeText(design.teamName, 'SHABABUNA')}</text>
        <text x="200" y="246" textAnchor="middle" fill={design.accent} fontFamily="system-ui, sans-serif" fontSize="13" fontWeight="800" letterSpacing="2">{index ? 'BACK' : 'FRONT'}</text>
      </g>)}
    </svg>
  );
}

function HoodiePreview({ design, id, tracksuit = false }) {
  const baseFill = fillFor(design, id);
  return (
    <svg viewBox="0 0 920 650" role="img" aria-label="Custom team apparel preview">
      <PatternDefs id={id} design={design} />
      <g transform="translate(235 30)" filter={`url(#${id}-shadow)`}>
        <path d="M168 24Q225 -10 282 24L324 62L400 112L364 184L324 164V512H126V164L86 184L50 112L126 62Z" fill={baseFill} stroke={design.secondary} strokeWidth="6" />
        <path d="M168 24Q225 90 282 24Q274 104 225 116Q176 104 168 24Z" fill={design.secondary} opacity=".26" />
        <path d="M150 350Q225 316 300 350V448H150Z" fill={design.secondary} opacity=".2" />
        <text x="225" y="230" textAnchor="middle" fill={design.secondary} fontFamily="Impact, sans-serif" fontSize="31" fontWeight="900" letterSpacing="2">{safeText(design.teamName, 'SHABABUNA')}</text>
        <text x="225" y="268" textAnchor="middle" fill={design.accent} fontFamily="system-ui, sans-serif" fontSize="15" fontWeight="800" letterSpacing="3">BUILT DIFFERENT</text>
        {tracksuit ? <>
          <path d="M148 524H222L210 638H112Z" fill={baseFill} stroke={design.secondary} strokeWidth="5" />
          <path d="M228 524H302L338 638H240Z" fill={baseFill} stroke={design.secondary} strokeWidth="5" />
          <path d="M215 524V638" stroke={design.accent} strokeWidth="6" />
        </> : null}
      </g>
    </svg>
  );
}

function BagPreview({ design, id }) {
  const baseFill = fillFor(design, id);
  return (
    <svg viewBox="0 0 760 560" role="img" aria-label="Custom bag preview">
      <PatternDefs id={id} design={design} />
      <g filter={`url(#${id}-shadow)`}>
        <path d="M225 122Q380 20 535 122" fill="none" stroke={design.secondary} strokeWidth="24" />
        <rect x="155" y="102" width="450" height="390" rx="72" fill={baseFill} stroke={design.secondary} strokeWidth="7" />
        <path d="M155 260H605" stroke={design.secondary} strokeWidth="6" opacity=".6" />
        <rect x="248" y="218" width="264" height="170" rx="32" fill={design.secondary} opacity=".14" />
        <text x="380" y="300" textAnchor="middle" fill={design.secondary} fontFamily="Impact, sans-serif" fontSize="38" fontWeight="900">{safeText(design.teamName, 'SHABABUNA')}</text>
        <text x="380" y="342" textAnchor="middle" fill={design.accent} fontFamily="system-ui, sans-serif" fontSize="15" fontWeight="800" letterSpacing="3">BUILT DIFFERENT</text>
      </g>
    </svg>
  );
}

function SleevePreview({ design, id }) {
  const baseFill = fillFor(design, id);
  return (
    <svg viewBox="0 0 760 560" role="img" aria-label="Custom sleeve preview">
      <PatternDefs id={id} design={design} />
      <g transform="translate(185 38)" filter={`url(#${id}-shadow)`}>
        <path d="M104 20H286L340 490H50Z" fill={baseFill} stroke={design.secondary} strokeWidth="8" />
        <path d="M77 260H313" stroke={design.secondary} strokeWidth="30" opacity=".85" />
        <text transform="translate(195 354) rotate(-90)" textAnchor="middle" fill={design.secondary} fontFamily="Impact, sans-serif" fontSize="39" fontWeight="900" letterSpacing="2">{safeText(design.teamName, 'SHABABUNA')}</text>
      </g>
    </svg>
  );
}

function BallPreview({ design, id }) {
  const baseFill = fillFor(design, id);
  return (
    <svg viewBox="0 0 760 560" role="img" aria-label="Custom basketball preview">
      <PatternDefs id={id} design={design} />
      <g filter={`url(#${id}-shadow)`}>
        <circle cx="380" cy="280" r="205" fill={baseFill} stroke={design.secondary} strokeWidth="8" />
        <path d="M175 280H585M380 75V485M236 135Q380 280 524 425M524 135Q380 280 236 425" fill="none" stroke={design.secondary} strokeWidth="8" opacity=".85" />
        <circle cx="380" cy="280" r="95" fill={design.primary} stroke={design.secondary} strokeWidth="5" />
        <text x="380" y="270" textAnchor="middle" fill={design.secondary} fontFamily="Impact, sans-serif" fontSize="30" fontWeight="900">{safeText(design.teamName, 'SHABABUNA')}</text>
        <text x="380" y="307" textAnchor="middle" fill={design.accent} fontFamily="system-ui, sans-serif" fontSize="12" fontWeight="800" letterSpacing="2">BUILT DIFFERENT</text>
      </g>
    </svg>
  );
}

function PaddingPreview({ design, id }) {
  const baseFill = fillFor(design, id);
  return (
    <svg viewBox="0 0 920 580" role="img" aria-label="Custom basketball hoop padding preview">
      <PatternDefs id={id} design={design} />
      <g filter={`url(#${id}-shadow)`}>
        <rect x="110" y="86" width="700" height="74" rx="14" fill={design.secondary} opacity=".18" />
        <rect x="412" y="120" width="96" height="384" rx="24" fill={baseFill} stroke={design.secondary} strokeWidth="7" />
        <rect x="274" y="470" width="372" height="80" rx="24" fill={baseFill} stroke={design.secondary} strokeWidth="7" />
        <text transform="translate(460 330) rotate(-90)" textAnchor="middle" fill={design.secondary} fontFamily="Impact, sans-serif" fontSize="31" fontWeight="900" letterSpacing="2">{safeText(design.teamName, 'SHABABUNA')}</text>
        <text x="460" y="520" textAnchor="middle" fill={design.secondary} fontFamily="Impact, sans-serif" fontSize="29" fontWeight="900">BUILT DIFFERENT</text>
      </g>
    </svg>
  );
}

export default function DesignPreview({ design, className = '' }) {
  const { pick } = useLanguage();
  const id = useId().replace(/:/g, '');
  const product = getCustomProductType(design.productType);
  const preview = product.preview;
  return (
    <div className={`design-preview ${className}`.trim()}>
      <div className="design-preview-label">
        <span>{pick(product.label)}</span>
        <small>{design.variant === 'away' ? pick({ en: 'Away', ar: 'الاحتياطي' }) : design.variant === 'third' ? pick({ en: 'Third', ar: 'الثالث' }) : pick({ en: 'Home', ar: 'الأساسي' })}</small>
      </div>
      {preview === 'uniform' ? <UniformPreview design={design} id={id} /> : null}
      {preview === 'jersey' ? <JerseyPreview design={design} id={id} /> : null}
      {preview === 'shirt' ? <JerseyPreview design={design} id={id} shirt /> : null}
      {preview === 'shorts' ? <ShortsPreview design={design} id={id} /> : null}
      {preview === 'hoodie' ? <HoodiePreview design={design} id={id} /> : null}
      {preview === 'pants' ? <PantsPreview design={design} id={id} /> : null}
      {preview === 'tracksuit' ? <HoodiePreview design={design} id={id} tracksuit /> : null}
      {preview === 'bag' ? <BagPreview design={design} id={id} /> : null}
      {preview === 'sleeve' ? <SleevePreview design={design} id={id} /> : null}
      {preview === 'ball' ? <BallPreview design={design} id={id} /> : null}
      {preview === 'padding' ? <PaddingPreview design={design} id={id} /> : null}
      <p className="design-preview-disclaimer">{pick({ en: 'Interactive design draft. Manufacturing starts only after the final production proof is approved.', ar: 'مسودة تصميم تفاعلية. لا يبدأ التصنيع إلا بعد اعتماد بروفة الإنتاج النهائية.' })}</p>
    </div>
  );
}
