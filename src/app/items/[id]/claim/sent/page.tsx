'use client';

import React from 'react';
import Link from 'next/link';

export default function ClaimSentPage() {
  return (
    <main className="max-w-md mx-auto min-h-screen bg-[#FDFCF7] px-4 py-4 space-y-6 font-body pb-12">
      {/* Top Close Button */}
      <div className="flex justify-start pt-1">
        <Link href="/dashboard" className="text-gray-900 text-lg font-bold p-1">
          ✕
        </Link>
      </div>

      {/* Hero Icon & Title */}
      <div className="text-center space-y-2 pt-2">
        <div className="w-16 h-16 bg-[#FFF2C2] rounded-full flex items-center justify-center mx-auto text-xl font-bold text-gray-900">
          ➔
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-gray-900">
          Claim sent
        </h1>
        <p className="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
          The finder will compare your answers. We&apos;ll notify you as soon as they decide.
        </p>
      </div>

      {/* Timeline Card */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[#107C41] text-white flex items-center justify-center text-xs font-bold">
            ✓
          </div>
          <span className="font-bold text-gray-900">Claim submitted</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[#6344F5] text-white flex items-center justify-center text-xs font-bold">
            2
          </div>
          <span className="font-bold text-gray-900">Finder reviews your answers</span>
        </div>

        <div className="flex items-center gap-3 opacity-50">
          <div className="w-6 h-6 rounded-full bg-[#EFECE6] text-gray-600 flex items-center justify-center text-xs font-bold">
            3
          </div>
          <span className="font-medium text-gray-700">Approved — contact details shared</span>
        </div>

        <div className="flex items-center gap-3 opacity-50">
          <div className="w-6 h-6 rounded-full bg-[#EFECE6] text-gray-600 flex items-center justify-center text-xs font-bold">
            4
          </div>
          <span className="font-medium text-gray-700">Meet up and get it back</span>
        </div>
      </div>

      {/* Primary Action */}
      <div className="space-y-3 pt-2">
        <Link
          href="/dashboard"
          className="block w-full py-3.5 bg-white border border-gray-300 text-gray-900 text-center font-bold text-sm rounded-xl hover:bg-gray-50 shadow-sm"
        >
          Back to browse
        </Link>

        {/* Demo Link */}
        <div className="text-center pt-2">
          <Link
            href="/items/1/claims"
            className="text-xs font-bold text-[#6344F5] hover:underline"
          >
            Demo: switch to the finder&apos;s view →
          </Link>
        </div>
      </div>
    </main>
  );
}
