import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAppDispatch } from './hooks/redux';
import { initializeApp } from './store/slices/appSlice';
import MainLayout from './components/layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Timeline from './pages/Timeline';
import Analytics from './pages/Analytics';
import Projects from './pages/Projects';
import Goals from './pages/Goals';
import Settings from './pages/Settings';
import CommandPalette from './components/common/CommandPalette';
import NotificationContainer from './components/common/NotificationContainer';
import ModalManager from './components/modals/ModalManager';
import { ThemeProvider } from './contexts/ThemeContext';
import KeyboardShortcutProvider from './components/providers/KeyboardShortcutProvider';

const App: React.FC = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Initialize app on mount
    dispatch(initializeApp());
  }, [dispatch]);

  return (
    <ThemeProvider>
      <KeyboardShortcutProvider>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/settings/*" element={<Settings />} />
          </Routes>
          <CommandPalette />
          <NotificationContainer />
          <ModalManager />
        </MainLayout>
      </KeyboardShortcutProvider>
    </ThemeProvider>
  );
};

export default App;