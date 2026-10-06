'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type ClaimState = 'READY' | 'NOT_SIGNED_IN' | 'IS_OWNER' | 'ALREADY_CLAIMED';

export default function ClaimFormPage() {
  const router = useRouter();

  // Edge state demo toggle
  const [userState, setUserState] = useState<ClaimState>('READY');

  // Form State
  const [answer, setAnswer] = useState('My name, Kemi, in black marker');
  const [description, setDescription] = useState('');
  const [dateLost, setDateLost] = useState('2026-09-30');
  const [location, setLocation] = useState('Engineering Block');
  const [confirmed, setConfirmed] = useState(true);

  // Upload state (simulating presigned upload SOF-14 / SOF-16)
  const [files, setFiles] = useState<{ name: string; url: string; progress: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File Upload Handler (Simulated)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const selectedFile = e.target.files[0];
    const newFile = {
      name: selectedFile.name,
      url: URL.createObjectURL(selectedFile),
      progress: 0,
    };

    setFiles((prev) => [...prev, newFile]);

    // Simulate upload progress
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 25;
      setFiles((prev) =>
        prev.map((f) =>
          f.name === selectedFile.name ? { ...f, progress: currentProgress } : f
        )
      );
      if (currentProgress >= 100) clearInterval(interval);
    }, 200);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Form Submission Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed || !answer.trim()) return;

    setIsSubmitting(true);

    // Simulate POST /api/items/:id/claims payload delay
    setTimeout(() => {
      setIsSubmitting(false);
      router.push('/items/1/claim/sent');
    }, 1200);
  };

  // EDGE STATE 1: Not Signed In
  if (userState === 'NOT_SIGNED_IN') {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-[#FDFCF7] px-4 py-12 font-body text-center space-y-4">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          🔑
        </div>
        <h1 className="font-heading text-xl font-extrabold text-gray-900">
          Sign in to claim
        </h1>
        <p className="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
          You need an account with your campus email to make claims on lost items.
        </p>
        <div className="pt-2">
          <button
            onClick={() => setUserState('READY')}
            className="w-full py-3 bg-[#6344F5] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#5235E0]"
          >
            Log in / Register
          </button>
        </div>
        {/* Demo Switcher */}
        <p className="text-[10px] text-gray-400 pt-6">Demo State Switcher: Click "Log in" above to restore claim form</p>
      </main>
    );
  }

  // EDGE STATE 2: User Owns This Item
  if (userState === 'IS_OWNER') {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-[#FDFCF7] px-4 py-12 font-body text-center space-y-4">
        <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          👤
        </div>
        <h1 className="font-heading text-xl font-extrabold text-gray-900">
          This is your post
        </h1>
        <p className="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
          You reported this item yourself. You cannot submit a claim on your own post.
        </p>
        <div className="pt-2">
          <Link
            href="/items/1/claims"
            className="inline-block w-full py-3 bg-gray-900 text-white text-xs font-bold rounded-xl"
          >
            Manage Received Claims
          </Link>
        </div>
        <button onClick={() => setUserState('READY')} className="text-[11px] text-gray-400 underline">
          Reset demo view
        </button>
      </main>
    );
  }

  // EDGE STATE 3: Already Claimed
  if (userState === 'ALREADY_CLAIMED') {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-[#FDFCF7] px-4 py-12 font-body text-center space-y-4">
        <div className="w-16 h-16 bg-[#FFF2C2] text-amber-900 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          ⏳
        </div>
        <h1 className="font-heading text-xl font-extrabold text-gray-900">
          Claim Pending
        </h1>
        <p className="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
          You have already submitted a claim for this item. Please wait for the finder to review your answer.
        </p>
        <div className="pt-2">
          <Link
            href="/items/1/claim/sent"
            className="inline-block w-full py-3 bg-[#6344F5] text-white text-xs font-bold rounded-xl"
          >
            View Claim Status
          </Link>
        </div>
        <button onClick={() => setUserState('READY')} className="text-[11px] text-gray-400 underline">
          Reset demo view
        </button>
      </main>
    );
  }

  // MAIN CLAIM FORM VIEW
  return (
    <main className="max-w-md mx-auto min-h-screen bg-[#FDFCF7] px-4 py-3 space-y-4 font-body pb-12">
      {/* Demo Switcher Bar */}
      <div className="bg-gray-100 p-2 rounded-xl flex justify-between items-center text-[10px]">
        <span className="font-bold text-gray-600">Demo State:</span>
        <div className="flex gap-1">
          <button onClick={() => setUserState('READY')} className={`px-1.5 py-0.5 rounded font-bold ${userState === 'READY' ? 'bg-white shadow' : 'text-gray-500'}`}>Normal</button>
          <button onClick={() => setUserState('NOT_SIGNED_IN')} className="px-1.5 py-0.5 rounded font-bold text-gray-500">Log In</button>
          <button onClick={() => setUserState('IS_OWNER')} className="px-1.5 py-0.5 rounded font-bold text-gray-500">My Post</button>
          <button onClick={() => setUserState('ALREADY_CLAIMED')} className="px-1.5 py-0.5 rounded font-bold text-gray-500">Claimed</button>
        </div>
      </div>

      {/* Top Header */}
      <div className="flex items-center gap-3 py-1">
        <Link href="/items/1" className="text-gray-900 text-xl font-bold hover:opacity-75">
          ←
        </Link>
        <h1 className="font-heading text-lg font-extrabold text-gray-900">
          Claim item
        </h1>
      </div>

      {/* Item Summary Card */}
      <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex gap-3 items-center">
        <div className="w-16 h-16 bg-[#F2C94C] rounded-xl flex items-center justify-center text-xs font-bold text-gray-800 shrink-0">
          photo
        </div>
        <div className="space-y-0.5 min-w-0">
          <h3 className="font-heading font-bold text-sm text-gray-900 truncate">
            Casio fx-991ES calculator
          </h3>
          <p className="text-xs text-gray-500">Engineering Block · 5 hours ago</p>
          <span className="inline-block bg-[#E2F5D8] text-[#2D7A14] text-[10px] font-bold px-2 py-0.5 rounded-full mt-1">
            FOUND
          </span>
        </div>
      </div>

      {/* Form Title & Subtitle */}
      <div className="space-y-1 pt-1">
        <h2 className="font-heading text-lg font-extrabold text-gray-900">
          Prove it's yours
        </h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          The finder compares your answers with what they know about the item.
        </p>
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Finder Question Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-800">
            The finder asks: What's written on the back? *
          </label>
          <input
            type="text"
            required
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full text-sm p-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6344F5]"
          />
        </div>

        {/* Additional Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-800">
            Describe something only the owner would know
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Scratches, stickers, details, lock screen, etc..."
            className="w-full text-sm p-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6344F5] resize-none"
          />
        </div>

        {/* When & Where */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-800">When lost?</label>
            <input
              type="date"
              value={dateLost}
              onChange={(e) => setDateLost(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-800">Where?</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-xl"
            >
              <option value="Engineering Block">Engineering Block</option>
              <option value="Main Library">Main Library</option>
              <option value="Health Centre">Health Centre</option>
            </select>
          </div>
        </div>

        {/* Proof Upload with Previews & Progress (SOF-14 / SOF-16) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-800">
            Proof photo or video (optional)
          </label>

          <div className="flex gap-2 items-center flex-wrap">
            {/* Active Previews */}
            {files.map((file, idx) => (
              <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                <img src={file.url} alt="Proof preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                >
                  ✕
                </button>
                {/* Upload Progress Overlay */}
                {file.progress < 100 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[10px] text-white font-bold">
                    {file.progress}%
                  </div>
                )}
              </div>
            ))}

            {/* Upload Button */}
            <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-xs text-gray-500 hover:bg-gray-50 cursor-pointer">
              <span className="text-base font-bold">+</span>
              <span>Add</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-[11px] text-gray-500">
            Photo of you with the item, a purchase receipt, or box
          </p>
        </div>

        {/* Confirmation Checkbox */}
        <div className="flex items-start gap-2.5 pt-1">
          <input
            type="checkbox"
            id="confirm"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded text-[#6344F5] focus:ring-[#6344F5]"
          />
          <label htmlFor="confirm" className="text-xs text-gray-700 leading-snug">
            I confirm this item is mine. False claims get accounts suspended.
          </label>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!confirmed || isSubmitting}
            className="w-full py-3.5 bg-[#6344F5] text-white font-bold text-base rounded-xl shadow-sm hover:bg-[#5235E0] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin text-sm">⏳</span> Submitting claim...
              </>
            ) : (
              'Submit claim'
            )}
          </button>
        </div>
      </form>
    </main>
  );
}