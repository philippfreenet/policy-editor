import globalJsdom from 'global-jsdom'

/* Registriert jsdom global und ergänzt Browser-APIs, die Headless UI voraussetzt. */
globalJsdom(undefined, {url: 'http://localhost/'})

class ResizeObserverStub {
  /** Beobachtet nichts; jsdom kennt keine Layoutgrößen. */
  observe(): void {}
  /** Beendet die Beobachtung einzelner Elemente (No-op). */
  unobserve(): void {}
  /** Beendet die Beobachtung vollständig (No-op). */
  disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub

window.matchMedia ??= (query: string): MediaQueryList =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList

Element.prototype.scrollIntoView = (): void => {}
