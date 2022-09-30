import { render, screen } from '@testing-library/react';
import Present from './Present';

const validPresentDataMock = {
  wrapped: {
    id: 1,
    gifter: 1,
    status: 'wrapped',
    holder: null
  },
  open: {
    id: 1,
    gifter: 1,
    status: 'open',
    holder: 2
  }
};

test('renders an unopen present', () => {
  render(<Present data={validPresentDataMock.wrapped} />);

  const present = screen.getByTestId('present');
  const openButton = screen.getByRole('button', {name: 'Open'});
  const stealButton = screen.queryByRole('button', {name: 'Steal'});
  expect(present).toHaveTextContent('Present Holder: Open');
  expect(openButton).toBeInTheDocument();
  expect(stealButton).not.toBeInTheDocument();
});


test('renders an open present', () => {
  render(<Present data={validPresentDataMock.open} />);

  const present = screen.getByTestId('present');
  const openButton = screen.queryByRole('button', {name: 'Open'});
  const stealButton = screen.getByRole('button', {name: 'Steal'});
  expect(present).toHaveTextContent('Present Holder: 2 Steal History: [{"event": "open"}]');
  expect(openButton).not.toBeInTheDocument();
  expect(stealButton).toBeInTheDocument();
});