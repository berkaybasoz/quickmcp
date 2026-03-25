import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../shared/layout/AppLayout';
import { AuthorizationPage } from '../pages/AuthorizationPage';
import { GeneratePage } from '../pages/GeneratePage';
import { HowToUsePage } from '../pages/HowToUsePage';
import { LandingPage } from '../pages/LandingPage';
import { ManageServersPage } from '../pages/ManageServersPage';
import { PricingPage } from '../pages/PricingPage';
import { QuickAskPage } from '../pages/QuickAskPage';
import { TestServersPage } from '../pages/TestServersPage';
import { UsersPage } from '../pages/UsersPage';
import { useBootstrapStore } from '../shared/store/bootstrapStore';

function RootEntryRedirect() {
  const status = useBootstrapStore((state) => state.status);
  const me = useBootstrapStore((state) => state.me);
  const config = useBootstrapStore((state) => state.config);
  const isAuthRequired = (config?.authMode || 'NONE') !== 'NONE';

  if (status === 'ready' && (!isAuthRequired || me)) {
    return <Navigate to="/quick-ask" replace />;
  }

  return <LandingPage />;
}

export const router = createBrowserRouter([
  {
    path: '/landing',
    element: <LandingPage />
  },
  {
    path: '/pricing',
    element: <PricingPage />
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <RootEntryRedirect /> },
      { path: 'quick-ask', element: <QuickAskPage /> },
      { path: 'generate', element: <GeneratePage /> },
      { path: 'manage-servers', element: <ManageServersPage /> },
      { path: 'test-servers', element: <TestServersPage /> },
      { path: 'authorization', element: <AuthorizationPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'how-to-use', element: <HowToUsePage /> }
    ]
  }
]);
