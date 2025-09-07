import './index.css';
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
import { ApplicationsProvider } from './context/ApplicationsContext.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <AuthProvider>
    <UsersProvider>
      <JobsProvider>
        <HelpersProvider>
          <WebboardProvider>
            <BlogProvider>
              <DataProvider>
                <ApplicationsProvider>
                  <BrowserRouter>
                    <App />
                  </BrowserRouter>
                </ApplicationsProvider>
              </DataProvider>
            </BlogProvider>
          </WebboardProvider>
        </HelpersProvider>
      </JobsProvider>
    </UsersProvider>
  </AuthProvider>
);
