import { Navigate, createBrowserRouter, useLocation } from 'react-router-dom';
import { AppLayout } from '../shared/layout/AppLayout';
import { AuthorizationPage } from '../pages/AuthorizationPage';
import { GeneratePage } from '../pages/generate/GeneratePage';
import { HowToUsePage } from '../pages/HowToUsePage';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { ManageServersPage } from '../pages/ManageServersPage';
import { PricingPage } from '../pages/PricingPage';
import { QuickAskPage } from '../pages/QuickAskPage';
import { RolesPage } from '../pages/RolesPage';
import { TestServersPage } from '../pages/TestServersPage';
import { UsersPage } from '../pages/UsersPage';
import { useBootstrapStore } from '../shared/store/bootstrapStore';

function RootEntryRedirect() {
  const status = useBootstrapStore((state) => state.status);
  const me = useBootstrapStore((state) => state.me);
  const config = useBootstrapStore((state) => state.config);
  const location = useLocation();
  const isAuthRequired = (config?.authMode || 'NONE') !== 'NONE';
  const next = (() => {
    const raw = new URLSearchParams(location.search).get('next') || '';
    return raw.startsWith('/') ? raw : '/quick-ask';
  })();
  // kullanıcı yetkilendirilmişse / ile sayfaya istek attığında önce /landing sonra /quick-ask anlık yönlendirimesini engelliyor
  if (status === 'idle' || status === 'loading') {
    return null;
  }

  if (status === 'ready' && (!isAuthRequired || me)) {
    return <Navigate to={next} replace />;
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
    path: '/login',
    element: <LoginPage />
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
      { path: 'roles', element: <RolesPage /> },
      { path: 'how-to-use', element: <HowToUsePage /> }
    ]
  }
]);
