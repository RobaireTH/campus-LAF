'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Claim {
  id: string;
  claimerName: string;
  hallOrDept: string;
  submittedAgo: string;
  hiddenDetailMatch: string;
  theirAnswer: string;
  description: string;
  matchRating: 'Strong match' | 'Weak match';
  proofUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const INITIAL_CLAIMS: Claim[] = [
  {
    id: 'c1',
    claimerName: 'Kemi B.',
    hallOrDept: 'Fajuyi Hall',
    submittedAgo: '2h ago',
    hiddenDetailMatch: 'Name written in black marker',
    theirAnswer: 'My name, Kemi, in black marker',
    description: 'Lost it after the CPE exam on Wednesday. There\'s a small crack on the solar panel.',
    matchRating: 'Strong match',
    proofUrl: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=500&auto=format&fit=crop&q=60',
    status: 'PENDING',
  },
  {
    id: 'c2',
    claimerName: 'Emeka N.',
    hallOrDept: 'Angola Hall',
    submittedAgo: '4h ago',
    hiddenDetailMatch: 'Name written in black marker',
    theirAnswer: 'A sticker on the lid',
    description: 'I lost my calculator near the library cafeteria.',
    matchRating: 'Weak match',
    status: 'PENDING',
  },
];

export default function ReviewClaimsPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>(INITIAL_CLAIMS);

  // Dialog & Modal States
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [enlargedMedia, setEnlargedMedia] = useState<string | null>(null);

  // Handle Dialog Actions
  const handleConfirmAction = () => {
    if (!selectedClaim || !actionType) return;

    if (actionType === 'APPROVE') {
      // Approve selected, reject all others automatically
      setClaims((prev) =>
        prev.map((c) =>
          c.id === selectedClaim.id
            ? { ...c, status: 'APPROVED' }
            : { ...c, status: 'REJECTED' }
        )
      );
      setSelectedClaim(null);
      setActionType(null);
      // Navigate to contact & handover screen
      router.push('/items/1/handover');
    } else {
      // Reject single claim
      setClaims((prev) =>
        prev.map((c) => (c.id === selectedClaim.id ? { ...c, status: 'REJECTED' } : c))
      );
      setSelectedClaim(null);
      setActionType(null);
    }
  };

  const pendingClaims = claims.filter((c) => c.status === 'PENDING');

  return (
    <main className="max-w-md mx-auto min-h-screen bg-[#FDFCF7] px-4 py-3 space-y-4 font-body pb-12 relative">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <Link href="/items/1" className="text-gray-900 text-xl font-bold hover:opacity-75">
            ←
          </Link>
          <h1 className="font-heading text-lg font-extrabold text-gray-900">
            Review claims ({claims.length})
          </h1>
        </div>

        {/* Demo Toggle Empty State */}
        <button
          onClick={() => setClaims(claims.length > 0 ? [] : INITIAL_CLAIMS)}
          className="text-[10px] font-bold px-2 py-1 bg-gray-200 text-gray-700 rounded-lg"
        >
          {claims.length > 0 ? 'Demo: Empty' : 'Demo: Reset'}
        </button>
      </div>

      {/* EMPTY STATE */}
      {claims.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-dashed border-gray-200 text-center space-y-3 my-6">
          <span className="text-4xl block">📭</span>
          <h2 className="font-heading font-extrabold text-base text-gray-900">
            No claims submitted yet
          </h2>
          <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
            When someone claims this item and answers your verification question, their submission will appear here.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-block px-4 py-2.5 bg-gray-900 text-white text-xs font-bold rounded-xl"
            >
              Return to Feed
            </Link>
          </div>
        </div>
      ) : (
        /* CLAIMS LIST */
        <div className="space-y-4 pt-1">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className={`bg-white rounded-2xl p-4 border transition-all ${
                claim.status === 'REJECTED'
                  ? 'border-gray-100 opacity-60'
                  : 'border-gray-100 shadow-sm'
              }`}
            >
              {/* User Header */}
              <div className="flex justify-between items-start">
                <div className="flex gap-2.5 items-center">
                  <div className="w-10 h-10 rounded-full bg-[#F5E6AD] text-gray-900 font-bold flex items-center justify-center text-xs">
                    {claim.claimerName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <h3 className="font-heading font-bold text-sm text-gray-900">
                        {claim.claimerName}
                      </h3>
                      <span className="text-emerald-600 text-xs">✔</span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Verified student · {claim.hallOrDept} · {claim.submittedAgo}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    claim.status === 'PENDING'
                      ? 'bg-[#FFF2C2] text-amber-900'
                      : claim.status === 'APPROVED'
                      ? 'bg-[#E2F5D8] text-[#2D7A14]'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {claim.status}
                </span>
              </div>

              {/* Detail & Answer Comparison */}
              <div className="space-y-2 mt-3">
                <div className="bg-[#F5F2EB] p-3 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-gray-500 font-medium block">
                    Your hidden detail
                  </span>
                  <p className="text-xs font-bold text-gray-900">
                    {claim.hiddenDetailMatch}
                  </p>
                </div>

                <div className="bg-[#F5F2EB] p-3 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-gray-500 font-medium block">
                    Their answer
                  </span>
                  <p className="text-xs font-bold text-gray-900">{claim.theirAnswer}</p>
                </div>
              </div>

              {/* Match Rating Badge */}
              <div className="mt-2.5">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    claim.matchRating === 'Strong match'
                      ? 'bg-[#E2F5D8] text-[#2D7A14]'
                      : 'bg-[#FFE5E5] text-[#D32F2F]'
                  }`}
                >
                  {claim.matchRating}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-600 italic mt-2 leading-relaxed">
                "{claim.description}"
              </p>

              {/* Proof Photo (Tap to Enlarge) */}
              {claim.proofUrl && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Proof Media (Tap to Enlarge)
                  </p>
                  <button
                    type="button"
                    onClick={() => setEnlargedMedia(claim.proofUrl || null)}
                    className="w-20 h-16 rounded-xl overflow-hidden border border-gray-200 relative hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={claim.proofUrl}
                      alt="Proof"
                      className="w-full h-full object-cover"
                    />
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              {claim.status === 'PENDING' && (
                <div className="flex gap-3 pt-3 mt-1">
                  <button
                    onClick={() => {
                      setSelectedClaim(claim);
                      setActionType('APPROVE');
                    }}
                    className="flex-1 py-3 bg-[#6344F5] text-white text-xs font-bold rounded-xl hover:bg-[#5235E0] transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setSelectedClaim(claim);
                      setActionType('REJECT');
                    }}
                    className="flex-1 py-3 bg-white border border-gray-300 text-gray-900 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Callout */}
      {claims.length > 0 && (
        <div className="p-3.5 bg-[#F5F2EB] rounded-2xl text-xs text-gray-600 leading-relaxed">
          ℹ Approving shares contact details with that person only. Other claims are closed automatically.
        </div>
      )}

      {/* TAP-TO-ENLARGE MEDIA MODAL */}
      {enlargedMedia && (
        <div
          onClick={() => setEnlargedMedia(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <div className="relative max-w-sm w-full bg-black rounded-2xl overflow-hidden">
            <img src={enlargedMedia} alt="Proof Enlarged" className="w-full h-auto max-h-[80vh] object-contain" />
            <button
              onClick={() => setEnlargedMedia(null)}
              className="absolute top-3 right-3 bg-white/20 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG MODAL */}
      {selectedClaim && actionType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full space-y-3 text-center shadow-xl">
            <h3 className="font-heading font-extrabold text-lg text-gray-900">
              {actionType === 'APPROVE'
                ? `Approve ${selectedClaim.claimerName}'s claim?`
                : `Reject ${selectedClaim.claimerName}'s claim?`}
            </h3>

            <p className="text-xs text-gray-600 leading-relaxed">
              {actionType === 'APPROVE'
                ? 'All other pending claims will be automatically rejected, and your contact details will be shared with this person.'
                : 'This claimant will be notified that their claim was rejected.'}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmAction}
                className={`flex-1 py-2.5 text-white font-bold text-xs rounded-xl ${
                  actionType === 'APPROVE' ? 'bg-[#6344F5]' : 'bg-red-600'
                }`}
              >
                {actionType === 'APPROVE' ? 'Yes, Approve' : 'Yes, Reject'}
              </button>
              <button
                onClick={() => {
                  setSelectedClaim(null);
                  setActionType(null);
                }}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}