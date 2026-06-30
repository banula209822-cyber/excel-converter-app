"use client";

import { useState } from "react";
import { convertImageToData } from "./actions/convert";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
// 🚀 ෆෝන් එකේ ස්ටෝරේජ් එකට ෆයිල් සේව් කරන්න මේවා උඩින්ම ඉම්පෝර්ට් කරන්න
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any[] | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert("Please select a bill or PDF file first!");
      return;
    }

    setLoading(true);
    setExtractedData(null);

    const formData = new FormData();
    formData.append("billImage", selectedFile);

    const result = await convertImageToData(formData);

    if (result.success && result.data) {
      setExtractedData(result.data);

      try {
        const totalAmount = result.data.reduce((sum: number, item: any) => {
          const itemPrice = parseFloat(item.price || item.Price || 0);
          const itemQty = parseInt(item.quantity || item.Quantity || 1);
          return sum + (itemPrice * itemQty);
        }, 0);

        const { data: billData, error: billError } = await supabase
          .from("bills")
          .insert([{ total_amount: totalAmount }])
          .select()
          .single();

        if (billError) throw billError;

        if (billData) {
          const itemsToInsert = result.data.map((item: any) => {
            const name = item.item_name || item.Item_Name || item.name || item.Name || "Unknown Item";
            const price = parseFloat(item.price || item.Price || 0);
            const qty = parseInt(item.quantity || item.Quantity || item.qty || 1);
            
            let size = item.item_size || item.size || item.Size || "";
            if (!size) {
              const match = name.match(/(\d+(?:\.\d+)?\s*(?:L|l|ml|ML|g|G|kg|KG|ක්‌))/);
              if (match) size = match[0];
            }

            return {
              bill_id: billData.id,
              item_name: name,
              item_size: size || "Normal",
              quantity: qty,
              price: price
            };
          });

          const { error: itemsError } = await supabase
            .from("bill_items")
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;

          console.log("Bill and items successfully saved to cloud!");
        }
      } catch (dbError) {
        console.error("Database Save Error:", dbError);
        alert("Failed to save to database, but you can still download the Excel file.");
      }

    } else {
      alert(result.error || "Something went wrong!");
    }
    setLoading(false);
  };

 const downloadExcel = async () => {
    if (!extractedData || extractedData.length === 0) return;

    try {
      // 1. Excel ඩේටා ටික Base64 කරගන්නවා
      const worksheet = XLSX.utils.json_to_sheet(extractedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      const filename = `Converted_Bill_${Date.now()}.xlsx`;

      // 2. 🚀 කෙළින්ම Android එකේ පොදු Documents/Downloads තැනට සේව් කරනවා
      // (Share කරන කෑල්ල සම්පූර්ණයෙන්ම අයින් කරලා තියෙන්නේ)
      await Filesystem.writeFile({
        path: filename,
        data: excelBuffer,
        directory: Directory.Documents, 
      });

      // 3. 📥 ෂෙයාර් වෙන්නේ නැතුව කෙළින්ම සක්සස් මැසේජ් එකක් දෙනවා
      alert(`📥 File Downloaded Successfully!\nSaved as: ${filename}\nCheck your device 'Documents' or 'Downloads' folder.`);

    } catch (err: any) {
      console.error("Excel Download Error:", err);
      alert("Failed to download file: " + err.message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <h1 className="text-2xl font-black text-center mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          AI Document Converter
        </h1>
        <p className="text-slate-400 text-xs text-center mb-6">
          Instantly convert scanned documents, PDFs, and receipts into clean Excel sheets.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-6 text-center cursor-pointer transition bg-slate-950/50">
            <input 
              type="file" 
              name="billImage" 
              accept="image/*,application/pdf" 
              required 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-black hover:file:bg-cyan-400 cursor-pointer" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Reading..." : "Convert to Excel"}
          </button>
        </form>

        {extractedData && (
          /* 🔥 මෙන්න මෙතන තිබ්බ සිංහල පැරග්‍රාෆ් එක සම්පූර්ණයෙන්ම English කරා මචං */
          <div className="mt-6 p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-center">
            <p className="text-emerald-400 text-sm font-semibold mb-3">🎉 Data extracted and saved to Cloud successfully!</p>
            <button 
              onClick={downloadExcel} 
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-xl transition"
            >
              📥 Download Excel File
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <Link 
            href="/summary" 
            className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium inline-flex items-center gap-1 py-1"
          >
            📊 View Weekly Expenses Summary →
          </Link>
        </div>

      </div>
    </main>
  );
}