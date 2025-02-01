import React from 'react';
import { Toaster } from 'react-hot-toast';

const DisplayToaster = () => {
  return (
    <Toaster
      position="top-center"
      containerStyle={{
        top: 'env(safe-area-inset-top, 0)',
      }}
      toastOptions={{
        className: 'text-sm sm:text-base',
        duration: 5000,
        style: {
          background: '#19222f',
          color: '#fff',
          padding: '12px 16px',
          fontSize: '14px',
          maxWidth: '90vw',
          wordBreak: 'break-word',
        },
        success: {
          duration: 3000,
          style: {
            background: '#10b981',
            color: '#fff',
            padding: '12px 16px',
            fontSize: '14px',
            maxWidth: '90vw',
            wordBreak: 'break-word',
          },
        },
        error: {
          style: {
            background: '#ef4444',
            color: '#fff',
            padding: '12px 16px',
            fontSize: '14px',
            maxWidth: '90vw',
            wordBreak: 'break-word',
          },
        },
      }}
    />
  );
};

export default DisplayToaster;

