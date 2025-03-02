'use client';

import { useState } from 'react';
import { usePassword } from '@/lib/contexts/PasswordContext';

export default function PasswordProtection() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { authenticate } = usePassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isCorrect = authenticate(password);
    if (!isCorrect) {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Password Protected</h1>
        <p className="mb-4 text-gray-600 text-center">
          Please enter the password to access this site.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          {error && (
            <div className="mb-4 text-red-500 text-sm text-center">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
} 