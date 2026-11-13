import { render, screen } from '@testing-library/react';
import App from './App';

test('renders keyboard input visualizer app', () => {
  render(<App />);
  const titleElement = screen.getByText(/KEYBOARD INPUT VISUALIZER/i);
  expect(titleElement).toBeInTheDocument();
});
