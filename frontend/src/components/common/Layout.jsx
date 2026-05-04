import React from 'react';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';
import ChatbotWidget from './ChatbotWidget';

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 lg:p-8 animate-fade-in">
          {children}
        </div>
      </main>
      <ChatbotWidget />
      <Toaster
        position="top-right"
        toastOptions={{
          className: '!bg-white dark:!bg-[#1a1d27] !text-gray-900 dark:!text-white !border !border-gray-100 dark:!border-[#2d3148] !shadow-card',
          duration: 3000,
        }}
      />
    </div>
  );
}
