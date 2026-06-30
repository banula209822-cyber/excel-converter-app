"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function SummaryPage() {
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [itemsList, setItemsList] = useState<any[]>([]);

  useEffect(() => {
    async function fetchSummaryData() {
      setLoading(true);
      try {
        const { data: items, error: itemsError } = await supabase
          .from("bill_items")
          .select("*");

        if (itemsError) throw itemsError;

        if (items) {
          setItemsList(items);
          
          const total = items.reduce((sum, item) => {
            const price = parseFloat(item.price || 0);
            const qty = parseInt(item.quantity || 1);
            return sum + (price * qty);
          }, 0);
          
          setTotalSpent(total);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSummaryData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-xl font-semibold animate-pulse">Loading Summary...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative">
        
        <Link href="/" className="text-xs text-slate-400 hover:text-white absolute top-4 left-4 border border-slate-800 px-3 py-1 rounded-lg bg-slate-950">
          ← Back
        </Link>

        <h1 className="text-3xl font-black text-center mb-6 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mt-4">
          Weekly Expenses Summary
        </h1>

        {/* 💰 Total Spent */}
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl p-6 text-center mb-8">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Weekly Expenses</p>
          <p className="text-4xl font-black text-cyan-400 mt-2">
            Rs. {totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* 🛒 Purchased Items List */}
        <h2 className="text-xl font-bold mb-4 text-slate-300 border-b border-slate-800 pb-2">
          Purchipped Items ({itemsList.length})
        </h2>

        {itemsList.length === 0 ? (
          <p className="text-slate-500 text-center py-4">No receipts or items found yet.</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {itemsList.map((item) => (
              <div 
                key={item.id} 
                className="flex justify-between items-center bg-slate-950/50 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition"
              >
                <div>
                  {/* 🚀 බිලේ සිංහලෙන් තිබ්බොත් සිංහලෙන්ම පේන්න මෙතන item_name එක කෙළින්ම දැම්මා */}
                  <p className="font-bold text-slate-200">{item.item_name || "Unknown Item"}</p>
                  <p className="text-xs text-slate-500">
                    Qty: {item.quantity || 1} | Size: {item.item_size || "Normal"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-emerald-400">
                    Rs. {((item.price || 0) * (item.quantity || 1)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    Rs. {(item.price || 0).toLocaleString()} each
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}