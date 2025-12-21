import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

// Custom render function - can be extended with providers if needed
export function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return rtlRender(ui, options);
}

// Re-export everything from testing library
export { waitFor, screen, within } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
