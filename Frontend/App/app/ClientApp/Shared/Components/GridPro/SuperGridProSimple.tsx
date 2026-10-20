'use client';

import React, { useState, useEffect } from "react";

export interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  status: string;
  isAdmin: boolean;
}

export interface SuperGridProProps {
  data?: User[];
  onRowDoubleClick?: (row: User) => void;
  onRowClick?: (row: User) => void;
}

export default function SuperGridPro({ 
  data = [], 
  onRowDoubleClick, 
  onRowClick 
}: SuperGridProProps) {
  console.log("📊 SuperGridPro rendering with data:", data);
  console.log("📊 Data length:", data.length);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No data available</p>
        <p className="text-sm mt-2">Data length: {data?.length || 0}</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-100 sticky top-0">
          <tr>
            <th className="border p-2">ID</th>
            <th className="border p-2">Name</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Age</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Admin</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={row.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                console.log("Row clicked:", row);
                onRowClick?.(row);
              }}
              onDoubleClick={() => {
                console.log("Row double clicked:", row);
                onRowDoubleClick?.(row);
              }}
            >
              <td className="border p-2">{row.id}</td>
              <td className="border p-2">{row.name}</td>
              <td className="border p-2">{row.email}</td>
              <td className="border p-2">{row.age}</td>
              <td className="border p-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  row.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {row.status}
                </span>
              </td>
              <td className="border p-2">
                {row.isAdmin ? '✅ Yes' : '❌ No'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}