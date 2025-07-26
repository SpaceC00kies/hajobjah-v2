import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '/App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { DataProvider } from './context/DataContext.tsx';
import { UsersProvider } from './context/UsersContext.tsx';
import { JobsProvider } from './context/JobsContext.tsx';
import { HelpersProvider } from './context/HelpersContext.tsx';
import { WebboardProvider } from './context/WebboardContext.tsx';
import { BlogProvider } from './context/BlogContext.tsx';
import { BrowserRouter } from 'react-router-dom';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <DataProvider>
        <UsersProvider>
          <JobsProvider>
            <HelpersProvider>
              <WebboardProvider>
                <BlogProvider>
                  <BrowserRouter>
                    <App />
                  </BrowserRouter>
                </BlogProvider>
              </WebboardProvider>
            </HelpersProvider>
          </JobsProvider>
        </UsersProvider>
      </DataProvider>
    </AuthProvider>
  </React.StrictMode>
);