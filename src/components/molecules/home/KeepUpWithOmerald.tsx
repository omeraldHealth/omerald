'use client';

import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function KeepUpWithOmerald() {
  const [email, setEmail] = useState('');

  const subscribeUser = async (e: React.FormEvent) => {
    e.preventDefault();
  
    try {
      const response = await axios.post('/api/subscribeUserToNewsletter', { email: email });
      if (response.status === 201) {
        toast.success('Successfully subscribed to newsletter!');
        setEmail('');
      }
    } catch (error) {
      toast.error('Error subscribing user to newsletter');
    }
  };

  return (
    <div className="relative sm:py-16">
      <div className="mx-auto max-w-sm my-10 sm:my-0 px-4 sm:max-w-3xl sm:px-6 md:max-w-7xl lg:px-8">
        <div className="relative rounded-2xl px-6 py-10 bg-orange-300 overflow-hidden shadow-xl sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="absolute inset-0 -mt-72 sm:-mt-32 md:mt-0"
          >
            <svg
              className="absolute inset-0 h-full w-full"
              preserveAspectRatio="xMidYMid slice"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 1463 360"
            >
              <path
                className="text-white text-opacity-40"
                fill="currentColor"
                d="M-82.673 72l1761.849 472.086-134.327 501.315-1761.85-472.086z"
              />
              <path
                className="text-white text-opacity-40"
                fill="currentColor"
                d="M-217.088 544.086L1544.761 72l134.327 501.316-1761.849 472.086z"
              />
            </svg>
          </div>
          <div className="relative">
            <div className="sm:text-center">
              <h2 className="text-white text-3xl sm:text-4xl font-bold text-center">
                Keep up with Omerald.
              </h2>
              <p className="text-lg text-gray-700 text-center mt-4">
                Be the first to know about new market updates discoveries and
                exclusive offers on our Omerald Blog posts.
              </p>
            </div>
            <form onSubmit={subscribeUser} className="mt-12 sm:mx-auto sm:max-w-lg sm:flex">
              <div className="min-w-0 flex-1">
                <label htmlFor="cta-email" className="sr-only">
                  Email address
                </label>
                <input
                  required
                  id="cta-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full border border-transparent rounded-md px-5 py-3 text-base text-gray-900 placeholder-gray-500 shadow-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-rose-500"
                  placeholder="Enter your email"
                />
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-3">
                <button
                  type="submit"
                  className="block w-full rounded-md border border-transparent px-5 py-3 bg-gray-900 text-base font-medium text-white shadow hover:bg-black focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-rose-500 sm:px-10 active:scale-105 transition-transform"
                >
                  Notify me
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

