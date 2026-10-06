'use client';

import React from 'react';
import ItemCard, { ItemCardSkeleton, ItemCardData } from '@/components/ItemCard';

const SAMPLE_ITEM: ItemCardData = {
  id: '1',
  title: 'Casio fx-991ES calculator',
  type: 'FOUND',
  status: 'OPEN',
  category: 'Electronics',
  location: 'Engineering Block',
  dateAgo: '5 hours ago',
  claimsCount: 2,
};

export default function ComponentsDemoPage() {
  return (
    <main className="max-w-4xl mx-auto min-h-screen bg-[#FDFCF7] p-6 space-y-6 font-body">
      <h1 className="font-heading text-2xl font-black">ItemCard Component Showcase</h1>

      <div className="space-y-4">
        <div>
          <h2 className="font-bold text-sm text-gray-500 mb-2">1. Default Variant (Browse/Search Feed)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ItemCard item={SAMPLE_ITEM} variant="default" />
          </div>
        </div>

        <div>
          <h2 className="font-bold text-sm text-gray-500 mb-2">2. Owner Variant (My Posts)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ItemCard item={SAMPLE_ITEM} variant="owner" />
          </div>
        </div>

        <div>
          <h2 className="font-bold text-sm text-gray-500 mb-2">3. Loading Skeleton State</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ItemCardSkeleton />
          </div>
        </div>
      </div>
    </main>
  );
}