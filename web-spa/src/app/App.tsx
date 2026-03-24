import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AppProviders } from './AppProviders';

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
