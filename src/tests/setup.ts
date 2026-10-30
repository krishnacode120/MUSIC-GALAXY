import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => `blob:test-${Date.now()}`),
  writable: true,
});
Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true });
Object.defineProperty(HTMLMediaElement.prototype, 'load', { value: vi.fn(), configurable: true });
Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  value: vi.fn(function (this: HTMLMediaElement) {
    this.dispatchEvent(new Event('pause'));
  }),
  configurable: true,
});
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  value: vi.fn(function (this: HTMLMediaElement) {
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  }),
  configurable: true,
});
