import { render, screen } from '@testing-library/react-native';

import RootLayout from '../app/_layout';

describe('RootLayout', () => {
  it('renders the placeholder', () => {
    render(<RootLayout />);
    expect(screen.getByText('Rustle')).toBeOnTheScreen();
  });
});
