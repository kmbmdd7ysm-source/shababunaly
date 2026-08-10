import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import Chapter from '../../src/components/experience/Chapter';
import SpecBlock from '../../src/components/experience/SpecBlock';
import Stamp, { STAMP_TONES } from '../../src/components/experience/Stamp';
import {
  CAPABILITY_ATTRIBUTE,
  resolveCapabilityTier,
  useDeviceCapability,
} from '../../src/hooks/useDeviceCapability';

function CapabilityProbe() {
  const tier = useDeviceCapability();
  return <output>{tier}</output>;
}

describe('GROUNDWORK experience primitives', () => {
  test('Stamp renders every tone, defaults to neutral and can drop the dot', () => {
    const { container } = render(
      <>
        <Stamp>Neutral default</Stamp>
        <Stamp tone="verified">Ready to Ship</Stamp>
        <Stamp tone="alert">Blocked</Stamp>
        <Stamp tone="warn">Pending</Stamp>
        <Stamp tone="signal">Selected</Stamp>
        <Stamp tone="not-a-tone">Falls back</Stamp>
        <Stamp tone="verified" dot={false}>
          No dot
        </Stamp>
      </>,
    );

    expect(STAMP_TONES).toEqual(['neutral', 'verified', 'alert', 'warn', 'signal']);
    // An unknown tone must degrade to neutral rather than emit a bogus class.
    expect(screen.getByText('Falls back')).toHaveAttribute('data-tone', 'neutral');
    expect(screen.getByText('Falls back').className).toBe('gw-stamp');
    expect(screen.getByText('Ready to Ship').className).toBe('gw-stamp gw-stamp--verified');
    expect(screen.getByText('Neutral default').className).toBe('gw-stamp');
    // Colour is never the only signal: the dot is decorative, the text carries meaning.
    expect(container.querySelectorAll('.gw-stamp-dot')).toHaveLength(6);
    expect(screen.getByText('No dot').querySelector('.gw-stamp-dot')).toBeNull();
    for (const dot of container.querySelectorAll('.gw-stamp-dot')) {
      expect(dot).toHaveAttribute('aria-hidden', 'true');
    }
  });

  test('SpecBlock exposes a real table with row headers and an optional visible caption', () => {
    const { container, rerender } = render(
      <SpecBlock
        caption="Delivery specification"
        rows={[
          { label: 'Ready to Ship', value: '24–72 hours' },
          { label: 'Standard', value: <span>14–18 days</span> },
        ]}
      />,
    );

    // Caption is present for screen readers even when visually hidden.
    expect(container.querySelector('caption')).toHaveTextContent('Delivery specification');
    expect(container.querySelector('caption').className).toBe('sr-only');
    const rowHeaders = screen.getAllByRole('rowheader');
    expect(rowHeaders.map((cell) => cell.textContent)).toEqual(['Ready to Ship', 'Standard']);
    expect(rowHeaders[0]).toHaveAttribute('scope', 'row');
    expect(screen.getByText('24–72 hours')).toBeVisible();
    expect(screen.getByText('14–18 days')).toBeVisible();

    rerender(
      <SpecBlock
        caption="Commercial terms"
        captionVisible
        rows={[{ label: 'Deposit', value: '50%' }]}
      />,
    );
    expect(container.querySelector('caption').className).toBe('gw-spec');
  });

  test('Chapter labels itself by its heading and tolerates every optional prop', () => {
    const { container, rerender } = render(
      <Chapter label="Teams & Wholesale" title="One order. The whole organization.">
        <p>Body</p>
      </Chapter>,
    );

    const region = screen.getByRole('region', { name: 'One order. The whole organization.' });
    expect(region).toHaveClass('gw-chapter');
    const heading = screen.getByRole('heading', { name: 'One order. The whole organization.' });
    expect(heading.className).toBe('gw-display');
    expect(region).toHaveAttribute('aria-labelledby', heading.id);
    expect(screen.getByText('Teams & Wholesale').className).toBe('gw-spec');
    expect(screen.getByText('Body')).toBeVisible();

    // No title: no heading, and no dangling aria-labelledby pointing at nothing.
    rerender(<Chapter />);
    expect(container.querySelector('.gw-chapter')).not.toHaveAttribute('aria-labelledby');
    expect(container.querySelector('h2')).toBeNull();
    expect(container.querySelector('.gw-spec')).toBeNull();

    rerender(<Chapter title="Custom heading class" titleClassName="gw-title" />);
    expect(screen.getByRole('heading', { name: 'Custom heading class' }).className).toBe(
      'gw-title',
    );
  });
});

describe('device capability tiering', () => {
  test('resolves every tier from navigator signals without touching globals', () => {
    // No navigator at all, and a navigator with no connection object.
    expect(resolveCapabilityTier()).toBe('a');
    expect(resolveCapabilityTier({})).toBe('a');
    expect(resolveCapabilityTier({ deviceMemory: 16, hardwareConcurrency: 12 })).toBe('a');

    // Tier C — the explicit user/device signals that must switch everything off.
    expect(resolveCapabilityTier({ connection: { saveData: true }, deviceMemory: 32 })).toBe('c');
    expect(resolveCapabilityTier({ deviceMemory: 2 })).toBe('c');
    expect(resolveCapabilityTier({ hardwareConcurrency: 2, deviceMemory: 16 })).toBe('c');
    expect(
      resolveCapabilityTier({ connection: { effectiveType: 'slow-2g' }, deviceMemory: 16 }),
    ).toBe('c');
    expect(resolveCapabilityTier({ connection: { effectiveType: '2g' }, deviceMemory: 16 })).toBe(
      'c',
    );
    expect(resolveCapabilityTier({ connection: { effectiveType: '3g' }, deviceMemory: 16 })).toBe(
      'c',
    );

    // Tier B — mid memory with everything else healthy.
    expect(resolveCapabilityTier({ deviceMemory: 6, hardwareConcurrency: 8 })).toBe('b');

    // Unknown/zero values must never be read as "weak".
    expect(resolveCapabilityTier({ deviceMemory: 0, hardwareConcurrency: 0 })).toBe('a');
    expect(resolveCapabilityTier({ connection: { effectiveType: '4g' }, deviceMemory: 8 })).toBe(
      'a',
    );
    expect(resolveCapabilityTier({ connection: { saveData: false }, deviceMemory: 8 })).toBe('a');
  });

  test('the hook publishes the tier as an attribute for CSS to read', () => {
    document.documentElement.removeAttribute(CAPABILITY_ATTRIBUTE);
    render(<CapabilityProbe />);
    const published = document.documentElement.getAttribute(CAPABILITY_ATTRIBUTE);
    expect(published).toBe(resolveCapabilityTier(globalThis.navigator));
    expect(screen.getByRole('status')).toHaveTextContent(published);
  });
});
