"use client";

import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { convertImageToData } from "./actions/convert";

export default function Home() {
  // ==========================================
  // ✨ 1. ORIGINAL UI STATES
  // ==========================================
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any[] | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // 🔐 2. AUTH GATEWAY STATES
  // ==========================================
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 🔄 Auth Sync Engine
  useEffect(() => {
    async function syncAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setSessionUser(session.user);
          localStorage.setItem("app_user_role", "user");
        } else {
          const localAdmin = localStorage.getItem("admin_session");
          if (localAdmin) {
            setSessionUser(JSON.parse(localAdmin));
            localStorage.setItem("app_user_role", "admin");
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setTimeout(() => setCheckingAuth(false), 800);
      }
    }
    syncAuth();
  }, []);

  const saveLogHistory = async (loggedEmail: string, role: string) => {
    await supabase.from("login_history").insert([{ email: loggedEmail, role: role }]);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email === "admin@" && password === "Admin#99") {
      const adminSession = { id: "admin-bypass", email: "admin@" };
      localStorage.setItem("admin_session", JSON.stringify(adminSession));
      localStorage.setItem("app_user_role", "admin");
      setSessionUser(adminSession);
      await saveLogHistory("admin@", "admin");
      alert("Welcome Back, Admin!");
      return;
    }

    if (!email.includes(".") || email.endsWith("@")) {
      alert("Invalid Format! Normal users must use a valid Gmail.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else if (data.user) {
      localStorage.setItem("app_user_role", "user");
      localStorage.removeItem("admin_session");
      setSessionUser(data.user);
      await saveLogHistory(data.user.email || email, "user");
    }
  };

  const handleSignUp = async () => {
    if (!email.includes(".") || email.endsWith("@")) {
      alert("Please enter a valid Gmail to register.");
      return;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Registration link sent to Gmail!");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    setSessionUser(null);
  };

  // ==========================================
  // 📥 3. DOCUMENT LOGIC & DATA EXTRACTION ENGINE
  // ==========================================
  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  // 🚨 🛠️ FIXED: TypeScript Compatibility & FormData Conversion
  const handleExtractStructure = async () => {
    if (!selectedFile) return;
    setLoading(true);

    try {
      // 1. Server Action එකට ඕනෙ වෙන විදිහට FormData එකක් හදනවා
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Server Action එකට FormData එක පාස් කරනවා
      const aiResponse: any = await convertImageToData(formData);
      
      // 2. Response එක ආවද සහ ඒක ඇතුළේ data/items තියෙනවද කියලා check කරනවා
      let itemsList: any[] = [];
      let totalAmount = 0;

      if (aiResponse && aiResponse.success && aiResponse.data) {
        itemsList = aiResponse.data.items || [];
        totalAmount = aiResponse.data.total || 0;
      } else if (aiResponse && aiResponse.items) {
        itemsList = aiResponse.items || [];
        totalAmount = aiResponse.total || 0;
      } else {
        throw new Error("AI Extraction engine returned empty matrix structured dataset.");
      }

      setExtractedData(itemsList);

      // 3. User Session ID එක ගන්නවා
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || null;

      // 4. Supabase 'bills' ටේබල් එකට insert කරනවා
      const { data: billData, error: billError } = await supabase
        .from("bills")
        .insert([
          {
            total_amount: totalAmount,
            user_id: currentUserId
          }
        ])
        .select();

      if (billError) throw billError;

      const insertedBillId = billData[0]?.id;

      // 5. Items ටික 'bill_items' ටේබල් එකට insert කරනවා
      if (insertedBillId && itemsList.length > 0) {
        const itemsToInsert = itemsList.map((item: any) => ({
          bill_id: insertedBillId,
          name: item.name || "Unknown Product",
          price: parseFloat(item.price) || 0,
          quantity: parseInt(item.quantity) || 1
        }));

        const { error: itemsError } = await supabase.from("bill_items").insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      alert("Handshake Success! Data structure synchronized and stored into Ledger database.");

    } catch (error: any) {
      console.error(error);
      alert(error.message || "Extraction Gateway node failure.");
    } finally {
      setLoading(false);
    }
  };

  // 🔄 4. 🔐 BRAND NEW LOADING HANDSHAKE SCREEN
  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 antialiased">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="relative mx-auto h-12 w-12 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-ping"></div>
            <div className="h-8 w-8 rounded-full border-t-2 border-b-2 border-cyan-400 animate-spin"></div>
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold tracking-wider text-cyan-400 uppercase">Synchronizing Node...</h2>
            <p className="text-[11px] text-slate-500 font-mono">Verifying authorization handshake, please wait.</p>
          </div>
        </div>
      </main>
    );
  }

  // 🔒 SYSTEM GATEWAY (LOGIN)
  if (!sessionUser) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 antialiased">
        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button onClick={() => setIsSignUp(false)} className={`py-2 text-xs font-bold uppercase rounded-lg transition-all ${!isSignUp ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow' : 'text-slate-400'}`}>Sign In</button>
            <button onClick={() => setIsSignUp(true)} className={`py-2 text-xs font-bold uppercase rounded-lg transition-all ${isSignUp ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow' : 'text-slate-400'}`}>Create Account</button>
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">{isSignUp ? "Account Registration" : "System Gateway"}</h1>
            <p className="text-xs text-slate-400">{isSignUp ? "Register using your Gmail account." : "Credentials required to access AI Converter."}</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); isSignUp ? handleSignUp() : handleLoginSubmit(e); }} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Gmail / Admin Identifier</label>
              <input type="text" placeholder={isSignUp ? "yourname@gmail.com" : "user@gmail.com OR admin@"} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none text-slate-200" required />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none text-slate-200" required />
            </div>

            {isSignUp && (
              <div className="text-[10px] text-amber-400/80 bg-amber-950/20 border border-amber-900/40 p-2.5 rounded-lg leading-relaxed">
                <p className="font-bold mb-1">⚠️ Notice:</p>
                <p>Registration is strictly for Users. After submitting,</p>
                <p className="mt-0.5">a validation handshake link will be deployed to your Gmail inbox.</p>
              </div>
            )}

            <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black py-3 rounded-xl transition text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/10">{isSignUp ? "Deploy New Account" : "Authorize Session"}</button>
          </form>
        </div>
      </main>
    );
  }

  // ==========================================
  // 🔓 5. MAIN APPLICATION INTERFACE
  // ==========================================
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 antialiased">
      <div className="max-w-xl w-full bg-slate-900/60 border border-slate-800/80 p-8 rounded-3xl shadow-2xl relative space-y-6 backdrop-blur-xl">
        
        {/* Top Operational Status Bar */}
        <div className="flex justify-between items-center bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400 font-mono flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Node: <span className="text-cyan-400 font-bold">{sessionUser.email}</span>
          </span>
          <button onClick={handleLogout} className="text-rose-400 font-bold hover:text-rose-300 transition underline decoration-dotted">
            Disconnect
          </button>
        </div>

        {/* Header Titles */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20 shadow-inner">
            ✨
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            AI Document Engine
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Convert static invoices and bills into interactive spreadsheets.
          </p>
        </div>

        {/* DRAG & DROP BOX */}
        <div 
          onClick={triggerFileSelect}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragActive ? "border-cyan-500 bg-cyan-500/5" : "border-slate-800 hover:border-slate-700 bg-slate-950/40"
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])} 
            className="hidden" 
            accept="image/*,application/pdf"
          />
          
          {imagePreview ? (
            <div className="space-y-3">
              <img src={imagePreview} alt="Preview" className="max-h-32 mx-auto rounded-lg object-contain border border-slate-800" />
              <p className="text-xs text-slate-400 font-mono truncate">{selectedFile?.name}</p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              <div className="text-2xl">📥</div>
              <p className="text-xs text-slate-400">
                Drag & drop your bill here, or <span className="text-cyan-400 font-bold hover:underline">browse</span>
              </p>
              <p className="text-[10px] text-slate-600">Supports PNG, JPG, JPEG, and PDF</p>
            </div>
          )}
        </div>

        {/* Process Action Button */}
        <button 
          onClick={handleExtractStructure}
          disabled={!selectedFile || loading}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 disabled:from-slate-900 disabled:to-slate-900 text-black disabled:text-slate-600 font-black py-3.5 rounded-xl transition text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/5"
        >
          {loading ? "Analyzing Matrix Structure..." : "Extract Data Structure"}
        </button>

        {/* Navigation Footer */}
        <div className="text-center pt-2">
          <Link href="/summary" className="text-xs text-slate-500 hover:text-cyan-400 transition underline decoration-dotted">
            Open Ledger Analytics Summary →
          </Link>
        </div>

      </div>
    </main>
  );
}