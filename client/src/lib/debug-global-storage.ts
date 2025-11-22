// Debug utility for testing global poll storage
// This helps verify that polls are truly shared across users

import { sharedPollStorage } from './shared-poll-storage';

export function debugGlobalStorage() {
  console.log('🔍 Debugging Global Poll Storage...');
  
  // Check window global storage
  if (typeof window !== 'undefined') {
    console.log('Window Global Polls:', window.__VASUKII_SHARED_POLLS__);
    console.log('Window Global Counter:', window.__VASUKII_POLL_COUNTER__);
  }
  
  // Check localStorage
  const storedPolls = localStorage.getItem('vasukii_shared_polls_global');
  const storedCounter = localStorage.getItem('vasukii_shared_poll_counter_global');
  console.log('LocalStorage Polls:', storedPolls ? JSON.parse(storedPolls) : 'None');
  console.log('LocalStorage Counter:', storedCounter);
  
  // Check current polls
  const currentPolls = sharedPollStorage.getAllPolls();
  console.log('Current Polls Count:', currentPolls.length);
  console.log('Current Polls:', currentPolls);
  
  return {
    windowPolls: window.__VASUKII_SHARED_POLLS__,
    windowCounter: window.__VASUKII_POLL_COUNTER__,
    localStoragePolls: storedPolls ? JSON.parse(storedPolls) : null,
    localStorageCounter: storedCounter,
    currentPolls: currentPolls
  };
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).debugGlobalStorage = debugGlobalStorage;
  console.log('🛠️ Debug utility available: window.debugGlobalStorage()');
}
