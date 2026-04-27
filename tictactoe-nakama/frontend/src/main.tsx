/**
 * Browser entrypoint for the Tic-Tac-Toe React app.
 * This mounts the root component and loads the shared visual theme
 * used across the home, lobby, and gameplay screens.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
