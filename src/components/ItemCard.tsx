'use client';

import React from 'react';
import Link from 'next/link';

export interface ItemCardData {
  id: string;
  title: string;
  type: 'LOST' | 'FOUND';
  status: 'OPEN' | 'CLAIMED' | 'RESOLVED';
  category: string;
  location: string;
  dateAgo: string;
  imageUrl?: string;
  claimsCount?: number;
}

interface ItemCardProps {
  item: ItemCardData;
  variant?: 'default' | 'owner';
  onReviewClaims?: (id: string) => void;
}

export default function ItemCard({
  item,
  variant = 'default',
  onReviewClaims,
}: ItemCardProps) {
  return (
    <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm hover:shadow-md transition-all w-full">
      <Link href={`/items/${item.id}`} className="block">
        <div className="flex gap-3">
          {/* Thumbnail with Fallback */}
          <div className="w-20 h-20 bg-[#F5F2EB] rounded-xl flex items-center justify-center text-xs font-bold text-gray-500 shrink-0 overflow-hidden relative">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-400 text-lg">📦</span>
            )}
          </div>

          {/* Card Info */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Badges Row */}
            <div className="flex justify-between items-start gap-1">
              <div className="flex gap-1.5 items-center">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.type === 'FOUND'
                      ? 'bg-[#E2F5D8] text-[#2D7A14]'
                      : 'bg-[#FFE5E5] text-[#D32F2F]'
                  }`}
                >
                  {item.type}
                </span>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.status === 'OPEN'
                      ? 'bg-blue-100 text-blue-800'
                      : item.status === 'CLAIMED'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <span className="text-[11px] text-gray-400 shrink-0">
                {item.dateAgo}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-heading font-bold text-gray-900 text-sm truncate">
              {item.title}
            </h3>

            {/* Category & Location */}
            <p className="text-xs text-gray-500 truncate">
              {item.category} • 📍 {item.location}
            </p>
          </div>
        </div>
      </Link>

      {/* Owner Variant Quick Actions */}
      {variant === 'owner' && (
        <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-100 text-xs">
          <span className="font-medium text-gray-600">
            📩 {item.claimsCount ?? 0} claim{(item.claimsCount ?? 0) === 1 ? '' : 's'}
          </span>
          <Link
            href={`/items/${item.id}/claims`}
            onClick={(e) => {
              if (onReviewClaims) {
                e.stopPropagation();
                onReviewClaims(item.id);
              }
            }}
            className="px-3.5 py-1.5 bg-[#6344F5] text-white font-bold rounded-xl hover:bg-[#5235E0] transition-colors"
          >
            Review claims
          </Link>
        </div>
      )}
    </div>
  );
}

{/* Loading Skeleton Version */}
export function ItemCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm w-full animate-pulse">
      <div className="flex gap-3">
        <div className="w-20 h-20 bg-gray-200 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2 py-1">
          <div className="flex justify-between">
            <div className="h-4 w-16 bg-gray-200 rounded-full" />
            <div className="h-3 w-10 bg-gray-200 rounded" />
          </div>
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
          <div className="h-3 w-1/2 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}