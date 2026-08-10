import { describe, expect, test, vi } from 'vitest';

let activeLanguage = 'en';
let reduced = false;

vi.mock('../../src/context/LanguageContext', () => ({
  useLanguage: () => ({
    lang: activeLanguage,
    dir: activeLanguage === 'ar' ? 'rtl' : 'ltr',
    pick: (value) =>
      value && typeof value === 'object' ? (value[activeLanguage] ?? value.en) : value,
    t: {},
  }),
}));
vi.mock('../../src/hooks/useReducedMotion', () => ({ useReducedMotion: () => reduced }));
vi.mock('../../src/components/custom/DesignPreview', () => ({
  default: ({ className }) => <div data-testid="artboard" className={className} />,
}));

import { fireEvent, render, screen } from '@testing-library/react';
import StudioStage, {
  SWIPE_THRESHOLD,
  resolveSwipe,
} from '../../src/components/custom/StudioStage';

const design = {
  productType: 'game-set',
  primary: '#000000',
  secondary: '#ffffff',
  accent: '#ff0000',
};
const stageOf = () =>
  screen.getByRole('group', { name: activeLanguage === 'ar' ? 'لوحة التصميم' : 'Design artboard' });
const root = (container) => container.querySelector('.gw-studio');

describe('StudioStage — accuracy is read, never asserted', () => {
  test('with no preflight result at all it defaults to concept, never to approved', () => {
    activeLanguage = 'en';
    const { container } = render(<StudioStage design={design} />);
    expect(screen.getByText('Concept preview')).toBeVisible();
    expect(screen.getByText(/not a production proof/i)).toBeVisible();
    expect(container.querySelector('.gw-studio-accuracy--verified')).toBeNull();
  });

  test('a passed preflight WITHOUT factory approval is still only a concept preview', () => {
    render(
      <StudioStage
        design={design}
        preflight={{
          status: 'preflight_passed_pending_factory_proof',
          readyForManufacturing: false,
          readyForQuote: true,
        }}
      />,
    );
    expect(screen.getByText('Concept preview')).toBeVisible();
  });

  test('claiming factory_approved without readyForManufacturing does NOT upgrade the badge', () => {
    render(
      <StudioStage
        design={design}
        preflight={{ status: 'factory_approved', readyForManufacturing: false }}
      />,
    );
    expect(screen.getByText('Concept preview')).toBeVisible();
  });

  test('only a genuinely approved, manufacturable result reads factory-accurate', () => {
    const { container } = render(
      <StudioStage
        design={design}
        preflight={{ status: 'factory_approved', readyForManufacturing: true }}
      />,
    );
    expect(screen.getByText('Factory-accurate')).toBeVisible();
    expect(container.querySelector('.gw-studio-accuracy--verified')).not.toBeNull();
  });
});

describe('StudioStage — camera, lighting, zoom and overlays', () => {
  test('all five garment views are real buttons and drive the stage state', () => {
    activeLanguage = 'en';
    const { container } = render(<StudioStage design={design} />);
    for (const name of ['Front', 'Right', 'Back', 'Left', 'Detail']) {
      expect(screen.getByRole('button', { name })).toBeVisible();
    }
    expect(root(container)).toHaveAttribute('data-view', 'front');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(root(container)).toHaveAttribute('data-view', 'back');
    expect(screen.getByRole('button', { name: 'Back' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('lighting modes are named and switchable', () => {
    const { container } = render(<StudioStage design={design} />);
    expect(root(container)).toHaveAttribute('data-lighting', 'production');
    fireEvent.click(screen.getByRole('button', { name: 'Arena' }));
    expect(root(container)).toHaveAttribute('data-lighting', 'arena');
  });

  test('the print-zone overlay toggles and is announced', () => {
    const { container } = render(<StudioStage design={design} />);
    const toggle = screen.getByRole('button', { name: 'Print zones' });
    expect(root(container)).toHaveAttribute('data-overlay', 'off');
    fireEvent.click(toggle);
    expect(root(container)).toHaveAttribute('data-overlay', 'on');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  test('zoom is a labelled slider with a readable value, usable without a pointer', () => {
    render(<StudioStage design={design} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('100');
    fireEvent.change(slider, { target: { value: '160' } });
    expect(screen.getByText('160%')).toBeVisible();
  });

  test('the whole camera ring is reachable by keyboard, and zoom too', () => {
    activeLanguage = 'en';
    const { container } = render(<StudioStage design={design} />);
    const stage = stageOf();
    expect(stage).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(stage, { key: 'ArrowRight' });
    expect(root(container)).toHaveAttribute('data-view', 'right');
    fireEvent.keyDown(stage, { key: 'ArrowLeft' });
    expect(root(container)).toHaveAttribute('data-view', 'front');
    // Wraps backwards to the last preset rather than sticking.
    fireEvent.keyDown(stage, { key: 'ArrowLeft' });
    expect(root(container)).toHaveAttribute('data-view', 'detail');
    fireEvent.keyDown(stage, { key: '+' });
    expect(screen.getByText('120%')).toBeVisible();
    fireEvent.keyDown(stage, { key: '-' });
    expect(screen.getByText('100%')).toBeVisible();
    // Zoom clamps rather than running away.
    fireEvent.keyDown(stage, { key: '-' });
    expect(screen.getByText('100%')).toBeVisible();
    fireEvent.keyDown(stage, { key: 'Escape' });
    expect(root(container)).toHaveAttribute('data-view', 'detail');
  });

  test('in Arabic the garment keeps its own left and right; only "forward" flips', () => {
    activeLanguage = 'ar';
    const { container } = render(<StudioStage design={design} />);
    expect(screen.getByRole('button', { name: 'يسار' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'يمين' })).toBeVisible();
    const stage = stageOf();
    fireEvent.keyDown(stage, { key: 'ArrowLeft' });
    expect(root(container)).toHaveAttribute('data-view', 'right');
    fireEvent.keyDown(stage, { key: 'ArrowRight' });
    expect(root(container)).toHaveAttribute('data-view', 'front');
    activeLanguage = 'en';
  });

  test('reduced motion disables the stage transitions', () => {
    reduced = true;
    render(<StudioStage design={design} />);
    expect(stageOf()).toHaveAttribute('data-reduced', 'on');
    reduced = false;
  });
});

// jsdom implements no PointerEvent, so `fireEvent.pointerDown` drops clientX
// entirely. Dispatching a plain event with the coordinate attached reproduces
// exactly what a real PointerEvent delivers to the handler.
function dispatch(node, type, clientX) {
  const event = new Event(type, { bubbles: true });
  if (clientX != null) Object.assign(event, { clientX });
  // The generic `fireEvent(node, event)` form dispatches a hand-built event and
  // still flushes the resulting React state update, which a bare
  // `node.dispatchEvent` would not.
  fireEvent(node, event);
}

function drag(node, from, to) {
  dispatch(node, 'pointerdown', from);
  dispatch(node, 'pointerup', to);
}

describe('StudioStage — pointer drag', () => {
  test('a drag steps the same preset ring the buttons use', () => {
    activeLanguage = 'en';
    const { container } = render(<StudioStage design={design} />);
    const stage = stageOf();
    drag(stage, 300, 200);
    expect(root(container)).toHaveAttribute('data-view', 'right');
    // Below the threshold it is a tap, not a rotation.
    drag(stage, 300, 290);
    expect(root(container)).toHaveAttribute('data-view', 'right');
    // A release with no preceding press is ignored.
    dispatch(stage, 'pointerup', 10);
    expect(root(container)).toHaveAttribute('data-view', 'right');
    // A cancelled press does not become a rotation on the next release.
    dispatch(stage, 'pointerdown', 100);
    dispatch(stage, 'pointercancel');
    dispatch(stage, 'pointerup', 900);
    expect(root(container)).toHaveAttribute('data-view', 'right');
  });

  test('in Arabic a rightward drag moves forward', () => {
    activeLanguage = 'ar';
    const { container } = render(<StudioStage design={design} />);
    drag(stageOf(), 100, 300);
    expect(root(container)).toHaveAttribute('data-view', 'right');
    activeLanguage = 'en';
  });
});

describe('resolveSwipe — the drag decision, tested directly', () => {
  // jsdom implements no PointerEvent, so a synthetic drag arrives with no
  // clientX and the gesture cannot be driven through the DOM. The decision it
  // feeds is pure, so it is tested here and the gesture itself is verified in
  // a real browser.
  test('a short drag is a tap, not a rotation', () => {
    expect(resolveSwipe(0, 'ltr')).toBe(0);
    expect(resolveSwipe(SWIPE_THRESHOLD - 1, 'ltr')).toBe(0);
    expect(resolveSwipe(-(SWIPE_THRESHOLD - 1), 'rtl')).toBe(0);
  });

  test('a missing or non-finite coordinate never rotates', () => {
    expect(resolveSwipe(Number.NaN, 'ltr')).toBe(0);
    expect(resolveSwipe(Number.POSITIVE_INFINITY, 'ltr')).toBe(0);
  });

  test('forward follows the reading direction', () => {
    // LTR: dragging leftward advances.
    expect(resolveSwipe(-120, 'ltr')).toBe(1);
    expect(resolveSwipe(120, 'ltr')).toBe(-1);
    // RTL: dragging rightward advances.
    expect(resolveSwipe(120, 'rtl')).toBe(1);
    expect(resolveSwipe(-120, 'rtl')).toBe(-1);
  });
});
