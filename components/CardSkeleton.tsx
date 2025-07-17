
import React from 'react';

export const CardSkeleton = () => (
  <div className="bg-white p-4 rounded-lg shadow-md border border-neutral-DEFAULT/30 animate-pulse">
    <div className="flex items-center mb-3">
      <div className="w-12 h-12 rounded-full bg-neutral-light mr-3"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-neutral-light rounded w-3/4"></div>
        <div className="h-3 bg-neutral-light rounded w-1/2"></div>
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-neutral-light rounded w-full"></div>
      <div className="h-3 bg-neutral-light rounded w-5/6"></div>
    </div>
    <div className="flex justify-between items-center mt-4">
      <div className="h-4 bg-neutral-light rounded w-1/4"></div>
      <div className="h-8 bg-neutral-light rounded-full w-1/3"></div>
    </div>
  </div>
);
