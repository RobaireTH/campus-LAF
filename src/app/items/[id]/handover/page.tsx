'use client';

import React, { useState } from 'react';
import Link from 'next/link';

// Mock user roles for testing the screen states
type UserRole = 'POSTER' | 'CLAIMANT' | 'UNAUTHORIZED';
type HandoverStatus = 'IN_PROGRESS' | 'RETURNED' | 'CANCELLED';

export default function HandoverPage() {
  const [role, setRole] = useState<UserRole>('POSTER');
  const [status, setStatus] = useState<HandoverStatus>('IN_PROGRESS');
  
  // Dialog modal states
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Mock contact details (SOF-18 shape)
  const contact = {
    name: role === 'POSTER' ? 'Kemi B. (Claimant)' : 'Ada O. (Poster)',
    phone: '08012345678',
    email: 'kemi.b@student.oauife.edu.ng',
    whatsappLink: 'https://wa.me/2348012345678',
    handoverCode: 'FND-4821',
  };

  const handleMarkReturned = () => {
    setStatus('RETURNED');
    setShowReturnModal(false);
  };

  const handleCancelHandover = () => {
    setStatus('CANCELLED');
    setShowCancelModal(false);
  };

  // 1. Unauthorized State
  if (role === 'UNAUTHORIZED') {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-[#FDFCF7] px-4 py-8 font-body text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          🔒
        </div>
        <h1 className="font-heading text-xl font-extrabold text-gray-900">
          Not Authorized
        </h1>
        <p className="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
          You do not have permission to view this handover screen. Contact details are only shared between the poster and the approved claimant.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-block px-5 py-2.5 bg-gray-900 text-white text-xs font-bold rounded-xl"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Role Switcher for Demo Testing */}
        <div className="pt-8 border-t border-gray-200">
          <p className="text-[10px] font-bold text-gray-400 mb-2">DEMO ROLE SWITCHER</p>
          <div className="flex justify-center gap-2">
            <button onClick={() => setRole('POSTER')} className="px-2 py-1 bg-gray-200 text-[10px] rounded font-bold">As Poster</button>
            <button onClick={() => setRole('CLAIMANT')} className="px-2 py-1 bg-gray-200 text-[10px] rounded font-bold">As Claimant</button>
          </div>
        </div>
      </main>
    );
  }

  // 2. Resolved Success State ("Item returned 🎉")
  if (status === 'RETURNED') {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-[#FDFCF7] px-4 py-12 font-body text-center space-y-4">
        <div className="w-20 h-20 bg-[#E2F5D8] text-[#2D7A14] rounded-full flex items-center justify-center mx-auto text-3xl">
          🎉
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-gray-900">
          Item returned 🎉
        </h1>
        <p className="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
          This item has been successfully handed over and resolved. Thank you for making the campus community safer and more helpful!
        </p>
        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-block w-full py-3.5 bg-[#6344F5] text-white text-sm font-bold rounded-xl shadow-sm hover:bg-[#5235E0]"
          >
            Return to Feed
          </Link>
        </div>
      </main>
    );
  }

  // 3. Cancelled / Reopened State
  if (status === 'CANCELLED') {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-[#FDFCF7] px-4 py-12 font-body text-center space-y-4">
        <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
          ↺
        </div>
        <h1 className="font-heading text-xl font-extrabold text-gray-900">
          Handover Cancelled
        </h1>
        <p className="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
          This handover was cancelled. The item post has been reopened for other claims.
        </p>
        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-block w-full py-3.5 bg-gray-900 text-white text-sm font-bold rounded-xl"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  // 4. Main Active Handover State
  return (
    <main className="max-w-md mx-auto min-h-screen bg-[#FDFCF7] px-4 py-3 space-y-4 font-body pb-12 relative">
      {/* Role Indicator Bar for Demo */}
      <div className="bg-gray-100 p-2 rounded-xl flex justify-between items-center text-[10px]">
        <span className="font-bold text-gray-600">Viewing as: <span className="text-gray-900">{role}</span></span>
        <div className="flex gap-1">
          <button onClick={() => setRole('POSTER')} className={`px-2 py-0.5 rounded font-bold ${role === 'POSTER' ? 'bg-white shadow' : 'text-gray-500'}`}>Poster</button>
          <button onClick={() => setRole('CLAIMANT')} className={`px-2 py-0.5 rounded font-bold ${role === 'CLAIMANT' ? 'bg-white shadow' : 'text-gray-500'}`}>Claimant</button>
          <button onClick={() => setRole('UNAUTHORIZED')} className="px-2 py-0.5 rounded font-bold text-gray-500">Unauthorized</button>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <Link href="/items/1/claims" className="text-gray-900 text-xl font-bold hover:opacity-75">
          ←
        </Link>
        <h1 className="font-heading text-lg font-extrabold text-gray-900">
          Contact & Handover
        </h1>
      </div>

      {/* Success Badge */}
      <div className="p-3.5 bg-[#E2F5D8] text-[#2D7A14] rounded-2xl text-xs font-semibold flex items-center gap-2">
        <span>✓</span>
        <span>Claim approved — contact details unlocked.</span>
      </div>

      {/* Contact Card with Action Buttons */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
        <div>
          <h3 className="font-heading font-bold text-sm text-gray-900">
            {contact.name}
          </h3>
          <p className="text-xs text-gray-500">{contact.email}</p>
          <p className="text-xs text-gray-500">{contact.phone}</p>
        </div>

        {/* Action Buttons: WhatsApp, Call, Email */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <a
            href={contact.whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="py-2.5 bg-[#CCFF00] text-gray-900 text-center font-bold text-xs rounded-xl hover:opacity-90 flex items-center justify-center gap-1"
          >
            <span>💬</span> WhatsApp
          </a>
          <a
            href={`tel:${contact.phone}`}
            className="py-2.5 bg-white border border-gray-300 text-gray-900 text-center font-bold text-xs rounded-xl hover:bg-gray-50 flex items-center justify-center gap-1"
          >
            <span>📞</span> Call
          </a>
          <a
            href={`mailto:${contact.email}`}
            className="py-2.5 bg-white border border-gray-300 text-gray-900 text-center font-bold text-xs rounded-xl hover:bg-gray-50 flex items-center justify-center gap-1"
          >
            <span>✉️</span> Email
          </a>
        </div>
      </div>

      {/* Handover Code Box */}
      <div className="bg-[#FFF2C2] rounded-2xl p-4 text-center space-y-1 border border-amber-200">
        <span className="text-[11px] font-medium text-gray-700 block">
          Handover code
        </span>
        <h3 className="font-heading text-3xl font-black text-gray-900 tracking-wider">
          {contact.handoverCode}
        </h3>
        <p className="text-[11px] text-gray-700 pt-1">
          Verify this code during meetup before completing the handover.
        </p>
      </div>

      {/* Safety Note Callout */}
      <div className="p-3.5 bg-[#FFF9E6] border border-[#FFE082] rounded-2xl text-xs text-gray-800 leading-relaxed space-y-1">
        <span className="font-bold block text-amber-900">🛡️ Safety Note</span>
        <p>
          Meet in a busy public place on campus (e.g., library entrance, security post), in daylight if possible, and bring your ID.
        </p>
      </div>

      {/* Poster Actions */}
      {role === 'POSTER' && (
        <div className="pt-2 space-y-2">
          <button
            onClick={() => setShowReturnModal(true)}
            className="w-full py-3.5 bg-[#6344F5] text-white font-bold text-base rounded-xl shadow-sm hover:bg-[#5235E0] transition-colors"
          >
            Mark as returned
          </button>
          <button
            onClick={() => setShowCancelModal(true)}
            className="w-full py-3 bg-white border border-gray-300 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel handover
          </button>
        </div>
      )}

      {/* Confirmation Dialog: Mark as Returned */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full space-y-3 text-center shadow-xl">
            <h3 className="font-heading font-extrabold text-lg text-gray-900">
              Mark as returned?
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              This will resolve the post and mark the item as successfully returned to its owner.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleMarkReturned}
                className="flex-1 py-2.5 bg-[#6344F5] text-white font-bold text-xs rounded-xl"
              >
                Yes, Return
              </button>
              <button
                onClick={() => setShowReturnModal(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Cancel Handover */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full space-y-3 text-center shadow-xl">
            <h3 className="font-heading font-extrabold text-lg text-gray-900">
              Cancel handover?
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              This will cancel the current agreement and reopen the item post for other claims.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCancelHandover}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold text-xs rounded-xl"
              >
                Yes, Cancel Handover
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
