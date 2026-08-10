import { describe, expect, test, vi } from 'vitest';

vi.mock('../../src/context/LanguageContext', () => ({
  useLanguage: () => ({
    pick: ({ en }) => en,
    t: {
      common: { close: 'Close', results: 'No results' },
      nav: { home: 'Home' },
      a11y: {
        quantity: 'Quantity',
        decrease: 'Decrease',
        increase: 'Increase',
        breadcrumb: 'Breadcrumb',
      },
    },
  }),
}));
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Accordion from '../../src/components/common/Accordion';
import Avatar from '../../src/components/common/Avatar';
import Badge from '../../src/components/common/Badge';
import Breadcrumbs from '../../src/components/common/Breadcrumbs';
import ColorSwatch from '../../src/components/common/ColorSwatch';
import EmptyState from '../../src/components/common/EmptyState';
import LoadingScreen from '../../src/components/common/LoadingScreen';
import Modal from '../../src/components/common/Modal';
import PageHero from '../../src/components/common/PageHero';
import QuantitySelector from '../../src/components/common/QuantitySelector';
import SectionHeading from '../../src/components/common/SectionHeading';

const withRouter = (node) => render(<MemoryRouter>{node}</MemoryRouter>);

describe('shared accessible UI primitives', () => {
  test('renders headings, badges, avatars, colors and breadcrumbs', () => {
    withRouter(
      <>
        <Badge>New</Badge>
        <Avatar name="Shababuna" src="" />
        <ColorSwatch color="#000000" />
        <Breadcrumbs items={[{ label: 'Shop', to: '/shop' }, { label: 'Product' }]} />
        <PageHero label="Label" title="Title" description="Description" />
        <SectionHeading title="Featured" />
      </>,
    );
    expect(screen.getByText('New')).toBeVisible();
    expect(screen.getByText('S')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Shop' })).toHaveAttribute('href', '/shop');
    expect(screen.getByRole('heading', { name: 'Title' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Featured' })).toBeVisible();
  });

  test('accordion and quantity selector support keyboard-safe state changes', () => {
    const onChange = vi.fn();
    render(
      <>
        <Accordion items={[{ title: 'Details', content: 'Body' }]} />
        <QuantitySelector value={2} min={1} max={3} onChange={onChange} />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Details/i }));
    expect(screen.getByText('Body')).toBeVisible();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons.at(-1));
    expect(onChange).toHaveBeenCalled();
  });

  test('modal traps the dialog surface and closes by explicit action and Escape', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal open title="Secure dialog" onClose={onClose}>
        <button>Inside</button>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Secure dialog' })).toBeVisible();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
    rerender(
      <Modal open={false} title="Secure dialog" onClose={onClose}>
        Hidden
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('empty and loading states expose meaningful status text', () => {
    render(
      <>
        <EmptyState message="Nothing yet" hint="Try again later" />
        <LoadingScreen />
      </>,
    );
    expect(screen.getByText('Nothing yet')).toBeVisible();
    expect(screen.getByText('Try again later')).toBeVisible();
  });
});
