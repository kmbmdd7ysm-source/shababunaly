import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportClientError } from '../../services/telemetry.ts';

const copy = {
  en: {
    title: 'Something went wrong',
    body: 'This page could not be displayed safely. Your cart and account data were not changed.',
    retry: 'Try again',
    home: 'Go to Home',
    reference: 'Error reference',
  },
  ar: {
    title: 'حدث خطأ غير متوقع',
    body: 'تعذر عرض هذه الصفحة بأمان. لم يتم تغيير بيانات حسابك أو سلة التسوق.',
    retry: 'حاول مرة أخرى',
    home: 'العودة للرئيسية',
    reference: 'رقم الخطأ',
  },
} as const;

type Props = {
  children?: ReactNode;
  scope?: string;
  resetKey?: string | number;
};

type State = {
  error: Error | null;
  eventId: string | null;
  resetKey?: string | number;
};

function currentLanguage(): 'en' | 'ar' {
  const html = globalThis.document?.documentElement;
  return html?.lang === 'ar' || html?.dir === 'rtl' ? 'ar' : 'en';
}

function makeEventId(): string {
  const value = globalThis.crypto?.randomUUID?.();
  return value || `ERR-${Date.now().toString(36).toUpperCase()}`;
}

export default class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const next: State = { error: null, eventId: null };
    if (props.resetKey !== undefined) next.resetKey = props.resetKey;
    this.state = next;
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error, eventId: makeEventId() };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) {
      const next: Partial<State> = { error: null, eventId: null };
      if (props.resetKey !== undefined) next.resetKey = props.resetKey;
      return next;
    }
    return null;
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    void reportClientError(error, {
      source: this.props.scope || 'react_error_boundary',
      eventId: this.state.eventId,
      componentStack: info?.componentStack || '',
    });
  }

  retry = (): void => {
    const next: State = { error: null, eventId: null };
    if (this.props.resetKey !== undefined) next.resetKey = this.props.resetKey;
    this.setState(next);
  };

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    const lang = currentLanguage();
    const t = copy[lang];
    return (
      <section className="section error-boundary" role="alert" aria-live="assertive">
        <div className="container narrow">
          <p className="section-label">SHABABUNA</p>
          <h1>{t.title}</h1>
          <p>{t.body}</p>
          <p className="error-reference">
            <strong>{t.reference}:</strong> {this.state.eventId}
          </p>
          <div className="error-boundary-actions">
            <button type="button" className="btn-primary" onClick={this.retry}>
              {t.retry}
            </button>
            <a className="btn-secondary" href="/">
              {t.home}
            </a>
          </div>
        </div>
      </section>
    );
  }
}
