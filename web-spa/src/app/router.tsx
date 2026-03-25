import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../shared/layout/AppLayout';
import { AuthorizationPage } from '../pages/AuthorizationPage';
import { GeneratePage } from '../pages/GeneratePage';
import { HowToUsePage } from '../pages/HowToUsePage';
import { ManageServersPage } from '../pages/ManageServersPage';
import { QuickAskPage } from '../pages/QuickAskPage';
import { TestServersPage } from '../pages/TestServersPage';
import { UsersPage } from '../pages/UsersPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/quick-ask" replace /> },
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
