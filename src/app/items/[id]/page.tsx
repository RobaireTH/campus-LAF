'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ItemDetailsPage() {
  const [activePhoto, setActivePhoto] = useState(1);

  return (
    <main className="max-w-md mx-auto min-h-screen bg-[#FDFCF7] px-4 py-3 space-y-4 font-body">
      {/* Top Navigation Bar */}
      <div className="flex items-center py-1">
        <button 
          onClick={() => window.history.back()} 
          className="text-gray-900 text-xl font-bold p-1 hover:opacity-75 transition-opacity"
          aria-label="Go back"
        >
          ←
        </button>
      </div>

      {/* Main Image View */}
      <div className="w-full h-64 bg-[#F2C94C] rounded-3xl flex items-center justify-center text-center p-4 shadow-sm">
        <span className="text-gray-900 font-medium text-sm">
          photo {activePhoto} of 2 · swipe
        </span>
      </div>

      {/* Image Thumbnails */}
      <div className="flex gap-2">
        <button
          onClick={() => setActivePhoto(1)}
          className={`w-12 h-12 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
            activePhoto === 1
              ? 'bg-[#F2C94C] text-gray-900 ring-2 ring-gray-900/10'
              : 'bg-[#56CCF2] text-gray-900 opacity-80'
          }`}
        >
          1
        </button>
        <button
          onClick={() => setActivePhoto(2)}
          className={`w-12 h-12 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
            activePhoto === 2
              ? 'bg-[#F2C94C] text-gray-900 ring-2 ring-gray-900/10'
              : 'bg-[#56CCF2] text-gray-900 opacity-80'
          }`}
        >
          2
        </button>
      </div>

      {/* Status Badges */}
      <div className="flex gap-2 pt-1">
        <span className="bg-[#E2F5D8] text-[#2D7A14] text-xs font-medium px-3 py-1 rounded-full">
          FOUND
        </span>
        <span className="bg-[#E0EBFF] text-[#2F65D9] text-xs font-medium px-3 py-1 rounded-full">
          Open
        </span>
      </div>

      {/* Title (Bricolage Grotesque) */}
      <h1 className="font-heading text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">
        Casio fx-991ES calculator
      </h1>

      {/* Metadata Card Container (DM Sans) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3 text-sm">
        <div className="flex justify-between items-start">
          <span className="text-gray-500 w-1/3">Category</span>
          <span className="font-bold text-gray-900 w-2/3">Electronics</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-gray-500 w-1/3">Found at</span>
          <div className="w-2/3">
            <p className="font-bold text-gray-900">Engineering Block</p>
            <p className="text-gray-500 text-xs mt-0.5">Room 104</p>
          </div>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-gray-500 w-1/3">Date found</span>
          <span className="font-bold text-gray-900 w-2/3">Today</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-gray-500 w-1/3">Posted by</span>
          <span className="font-bold text-gray-900 w-2/3">Ada O.</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-gray-500 w-1/3">Posted</span>
          <span className="font-bold text-gray-900 w-2/3">5 hours ago</span>
        </div>
      </div>

      {/* Description Section */}
      <div className="space-y-1 pt-1">
        <h2 className="font-heading font-bold text-gray-900 text-base">Description</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Silver scientific calculator, no cover. Found on a desk after the CPE exam.
        </p>
      </div>

      {/* Action Button */}
      <div className="pt-2 space-y-2">
        <Link
          href="/items/1/claim"
          className="block w-full py-3.5 bg-[#6344F5] text-white text-center font-bold text-base rounded-xl shadow-sm hover:bg-[#5235E0] transition-colors"
        >
          This is mine — claim it
        </Link>
        <p className="text-xs text-center text-gray-500 px-4 leading-normal">
          You'll answer a question only the real owner would know.
        </p>
      </div>

      {/* Privacy Callout */}
      <div className="p-3.5 bg-[#F5F2EB] rounded-2xl flex gap-2.5 items-start text-xs text-gray-700 leading-relaxed">
        <span className="text-sm">ℹ</span>
        <p>
          Contact details stay private. They're only shared once the poster approves a claim.
        </p>
      </div>

      {/* Report Button */}
      <div className="text-left pt-1 pb-6">
        <button className="text-xs text-gray-500 hover:text-gray-800">
          Report this post
        </button>
      </div>
    </main>
  );
}