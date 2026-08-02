import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock { observe() {} unobserve() {} disconnect() {} }
class IntersectionObserverMock { observe() {} unobserve() {} disconnect() {} }
Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: ResizeObserverMock });
Object.defineProperty(globalThis, 'IntersectionObserver', { configurable: true, value: IntersectionObserverMock });
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect() {}, fillRect() {}, drawImage() {}, fillText() {}, measureText: () => ({ width: 10 }),
  save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, beginPath() {}, closePath() {}, stroke() {}, fill() {},
}));
