"use client";

import { useState } from "react";
import { convertImageToData } from "./actions/convert";
import * as XLSX from "xlsx";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any[] | null>(null);
  // 🔥 තෝරන ෆයිල් එක මතක තියාගන්න වෙනම state එකක් හැදුවා
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // ෆයිල් එකක් තෝරලා නැත්නම් වැඩේ කරන්න දෙන්නෙ නැහැ
    if (!selectedFile) {
      alert("කරුණාකර මුලින්ම බිල්පතක් හෝ PDF එකක් තෝරන්න!");
      return;
    }

    setLoading(true);
    setExtractedData(null);

    // 🔥 අපිම අතින් පිරිසිදු FormData එකක් හදලා ෆයිල් එක ඇතුළත් කරනවා
    const formData = new FormData();
    formData.append("billImage", selectedFile);

    const result = await convertImageToData(formData);

    if (result.success && result.data) {
      setExtractedData(result.data);
    } else {
      alert(result.error || "යම් දෝෂයක් සිදු වුණා!");
    }
    setLoading(false);
  };

  // JSON දත්ත ටික Excel එකක් කරලා ඩවුන්ලෝඩ් කරවන Function එක
  const downloadExcel = () => {
    if (!extractedData || extractedData.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(extractedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    XLSX.writeFile(workbook, "Converted_Document.xlsx");
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
              // 🔥 බ්‍රවුසර් එකෙන් ෆයිල් එකක් තෝරපු ගමන් ඒක state එකට සේව් කරගන්නවා
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
          <div className="mt-6 p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-center">
            <p className="text-emerald-400 text-sm font-semibold mb-3">🎉 දත්ත සාර්ථකව වෙන් කරගත්තා!</p>
            <button 
              onClick={downloadExcel} 
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-xl transition"
            >
              📥 Download Excel File
            </button>
          </div>
        )}
      </div>
    </main>
  );
}