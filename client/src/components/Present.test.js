import { render, screen } from '@testing-library/react';
import Present from './Present';

test('renders a present', () => {
  render(<Present />);

  const present = screen.getByTestId('present');
  const text = screen.getByText('Present');
  const openButton = screen.getByRole('button', {name: 'Open'});
  const stealButton = screen.getByRole('button', {name: 'Steal'});
  expect(present).toBeInTheDocument();
  expect(text).toBeInTheDocument();
  expect(openButton).toBeInTheDocument();
  expect(stealButton).toBeInTheDocument();
});
