import { Component } from 'react';
import { reportClientError } from '../../services/telemetry';

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
};

function currentLanguage() {
  const html = globalThis.document?.documentElement;
  return html?.lang === 'ar' || html?.dir === 'rtl' ? 'ar' : 'en';
}

function eventId() {
  const value = globalThis.crypto?.randomUUID?.();
  return value || `ERR-${Date.now().toString(36).toUpperCase()}`;
}

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, eventId: null, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(error) {
    return { error, eventId: eventId() };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) {
      return { error: null, eventId: null, resetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error, info) {
    reportClientError(error, {
      source: this.props.scope || 'react_error_boundary',
      eventId: this.state.eventId,
      componentStack: info?.componentStack || '',
    });
  }

  retry = () => {
    this.setState({ error: null, eventId: null, resetKey: this.props.resetKey });
  };

  render() {
    if (!this.state.error) return this.props.children;
    const lang = currentLanguage();
    const t = copy[lang];
    return (
      <section className="section error-boundary" role="alert" aria-live="assertive">
        <div className="container narrow">
          <p className="section-label">SHABABUNA</p>
          <h1>{t.title}</h1>
          <p>{t.body}</p>
          <p className="error-reference"><strong>{t.reference}:</strong> {this.state.eventId}</p>
          <div className="error-boundary-actions">
            <button type="button" className="btn-primary" onClick={this.retry}>{t.retry}</button>
            <a className="btn-secondary" href="/">{t.home}</a>
          </div>
        </div>
      </section>
    );
  }
}
