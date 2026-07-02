"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function SummaryPage() {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<"admin" | "user" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("all");
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState({ item_name: "", price: 0, quantity: 1 });

  // 🔄 ඇප් එක ලෝඩ් වෙද්දීම දැනට ලොග් වෙලා ඉන්න කෙනාව සින්ක් කරනවා
  useEffect(() => {
    async function checkActiveSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setSessionUser(session.user);
        // ඇඩ්මින් බයිපාස් එකක් නැත්නම් සාමාන්‍ය යූසර්
        const role = localStorage.getItem("app_user_role") as any || "user";
        setUserRole(role);
      } else {
        // බ්‍රවුසර් එකේ ඇඩ්මින් ලොගින් එකක් තියෙද බලනවා
        const localAdmin = localStorage.getItem("admin_session");
        if (localAdmin) {
          setSessionUser(JSON.parse(localAdmin));
          setUserRole("admin");
        }
      }
      setLoading(false);
    }
    checkActiveSession();
  }, []);

  const saveLogHistory = async (loggedEmail: string, role: string) => {
    await supabase.from("login_history").insert([{ email: loggedEmail, role: role }]);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 👑 ADMIN LOGIN
    if (email === "admin@" && password === "Admin#99") {
      const adminSession = { id: "admin-bypass", email: "admin@" };
      localStorage.setItem("admin_session", JSON.stringify(adminSession));
      localStorage.setItem("app_user_role", "admin");
      setSessionUser(adminSession);
      setUserRole("admin");
      await saveLogHistory("admin@", "admin");
      alert("Welcome Back, Commander Admin!");
      window.location.reload(); // මුළු ඇප් එකටම සින්ක් වෙන්න රීලෝඩ් කරනවා
      return;
    }

    // 🛡️ NORMAL USER LOGIN
    if (!email.includes(".") || email.endsWith("@")) {
      alert("Invalid Format! Normal users must use a valid Gmail (e.g., user@gmail.com)");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
    } else if (data.user) {
      localStorage.setItem("app_user_role", "user");
      localStorage.removeItem("admin_session");
      setSessionUser(data.user);
      setUserRole("user");
      await saveLogHistory(data.user.email || email, "user");
      window.location.reload(); // සෙෂන් එක හෝම් පේජ් එකට සින්ක් කරන්න රීලෝඩ් එකක් දානවා
    }
  };

  const handleSignUp = async () => {
    if (!email.includes(".") || email.endsWith("@")) {
      alert("Please enter a valid Gmail to register.");
      return;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Registration link sent! Check your Gmail inbox.");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("admin_session");
    localStorage.removeItem("app_user_role");
    setSessionUser(null);
    setUserRole(null);
    window.location.reload();
  };

 const fetchSummaryData = async () => {
  try {
    // 1. LocalStorage eken user ge role eka gannava
    const currentRole = localStorage.getItem("app_user_role"); // 'admin' ho 'user'

    // 2. Supabase session eken දැනට log vela inna user ge email eka gannava
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserEmail = session?.user?.email;

    // 3. Base Query eka hadagannava (Ube parana select kalla meke thiyenava)
    let query = supabase
      .from("bill_items")
      .select(`*, bills ( created_at, email )`); // Methanata email kallath ekathu kala filter karanna lesi venna

    // 4. 🚨 MEKA THAMYI ADMIN LOGIC EKA!
    // Log vela inna kkena ADMIN nemei nam, eyage email ekata adala bills vitharak filter karanava
    if (currentRole !== "admin" && currentUserEmail) {
      query = query.eq("bills.email", currentUserEmail);
    }

    const { data: items, error: itemsError } = await query;

    if (itemsError) throw itemsError;

    if (items) {
      // 5. Methanin pahuva ube parana states set vana logic tika elatama veda
      setItemsList(items);
      setFilteredItems(items);
      calculateTotal(items);

      const dates = items.map((item: any) => {
        if (!item.bills?.created_at) return null;
        return new Date(item.bills.created_at).toLocaleDateString();
      }).filter((date, index, self) => date !== null && self.indexOf(date) === index);

      setAvailableDates(dates as string[]);
    }
  } catch (error) {
    console.error(error);
  }
};

  useEffect(() => {
    if (sessionUser) {
      fetchSummaryData();
    }
  }, [sessionUser]);

  const calculateTotal = (items: any[]) => {
    const total = items.reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 1)), 0);
    setTotalSpent(total);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (date === "all") {
      setFilteredItems(itemsList);
      calculateTotal(itemsList);
    } else {
      const filtered = itemsList.filter((item: any) => item.bills?.created_at && new Date(item.bills.created_at).toLocaleDateString() === date);
      setFilteredItems(filtered);
      calculateTotal(filtered);
    }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditFields({ item_name: item.item_name, price: item.price, quantity: item.quantity });
  };

  const saveEdit = async (id: number) => {
    try {
      await supabase.from("bill_items").update({
        item_name: editFields.item_name,
        price: parseFloat(editFields.price as any),
        quantity: parseInt(editFields.quantity as any),
      }).eq("id", id);

      const updatedList = itemsList.map((item) => item.id === id ? { ...item, ...editFields } : item);
      setItemsList(updatedList);
      const updatedFiltered = filteredItems.map((item) => item.id === id ? { ...item, ...editFields } : item);
      setFilteredItems(updatedFiltered);
      calculateTotal(updatedFiltered);
      setEditingId(null);
    } catch (err) {
      alert("Sync error.");
    }
  };

  const chartData = filteredItems.map((item) => ({
    name: item.item_name?.length > 12 ? item.item_name.substring(0, 10) + ".." : item.item_name || "Unknown",
    value: parseFloat(item.price || 0) * parseInt(item.quantity || 1),
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center font-mono">Verifying Ecosystem Session...</div>;
  }

 if (!sessionUser) {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-sm w-full bg-slate-900/60 border border-slate-800 p-6 rounded-2xl text-center space-y-4">
        <p className="text-xs text-slate-400">🔒 Access Denied. Gateway Session Not Initialized.</p>
        <Link href="/" className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-[11px] font-black px-4 py-2 rounded-xl uppercase">
          Go to Home & Sign In
        </Link>
      </div>
    </main>
  );
}

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 antialiased">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between bg-slate-900/40 border border-slate-800/60 p-4 rounded-2xl backdrop-blur-md">
          <Link href="/" className="text-xs font-semibold text-slate-400 hover:text-white border border-slate-800 px-4 py-2 rounded-xl bg-slate-950 transition">← Back to Engine</Link>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              ⚡ Status: <span className={userRole === "admin" ? "text-amber-400 font-bold" : "text-cyan-400"} >{userRole?.toUpperCase()}</span> ({sessionUser.email})
            </span>
            <button onClick={handleLogout} className="text-xs font-bold text-rose-400 border border-rose-950/40 px-3 py-1.5 rounded-xl bg-rose-950/10 hover:bg-rose-950/30 transition">Disconnect</button>
          </div>
        </div>

        {/* Charts & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl flex flex-col justify-center space-y-2">
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Aggregated View Volume</p>
            <p className="text-3xl font-black text-cyan-400">Rs. {totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            <div className="pt-4 border-t border-slate-800/60 mt-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Statement Registry Filter</label>
              <select value={selectedDate} onChange={(e) => handleDateChange(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-cyan-500"><option value="all">📊 All Cumulative Records</option>{availableDates.map((date) => <option key={date} value={date}>📅 {date}</option>)}</select>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl md:col-span-2 min-h-[220px]">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Top 5 Highest Expenses</h3>
            {chartData.length === 0 ? <p className="text-xs text-slate-600 py-8">No records parsed.</p> : (
              <div className="w-full h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }} labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }} />
                    <Bar dataKey="value" radius={[5, 5, 0, 0]}>{chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={["#22d3ee", "#38bdf8", "#3b82f6", "#6366f1", "#4f46e5"][index % 5]} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-md font-black text-slate-200"><span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-lg border border-blue-500/20">Granular Statement Records</span></h2>
            <span className="text-[11px] font-bold bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-full text-slate-400">{filteredItems.length} Entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider bg-slate-950/40">
                  <th className="py-3 px-4">Item Registry Name</th>
                  <th className="py-3 px-4 text-center w-16">Qty</th>
                  <th className="py-3 px-4 text-right w-28">Unit Price</th>
                  <th className="py-3 px-4 text-right w-32">Total Net</th>
                  <th className="py-3 px-4 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-950/40 transition-colors group">
                    {editingId === item.id ? (
                      <>
                        <td className="py-2.5 px-4"><input type="text" value={editFields.item_name} onChange={(e) => setEditFields({ ...editFields, item_name: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 w-full outline-none focus:border-cyan-500" /></td>
                        <td className="py-2.5 px-4 text-center"><input type="number" value={editFields.quantity} onChange={(e) => setEditFields({ ...editFields, quantity: parseInt(e.target.value) || 1 })} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 w-12 text-center outline-none focus:border-cyan-500" /></td>
                        <td className="py-2.5 px-4 text-right"><input type="number" value={editFields.price} onChange={(e) => setEditFields({ ...editFields, price: parseFloat(e.target.value) || 0 })} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 w-20 text-right outline-none focus:border-cyan-500" /></td>
                        <td className="py-2.5 px-4 text-right font-bold text-cyan-400">Rs. {(editFields.price * editFields.quantity).toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-center space-x-2 text-[11px]"><button onClick={() => saveEdit(item.id)} className="text-emerald-400 hover:underline font-bold">Save</button><button onClick={() => setEditingId(null)} className="text-slate-500 hover:underline">Cancel</button></td>
                      </>
                    ) : (
                      <>
                        <td className="py-3.5 px-4 font-medium text-slate-300 group-hover:text-white transition-colors">{item.item_name || "Unknown Item"}</td>
                        <td className="py-3.5 px-4 text-center text-slate-400 font-mono">{item.quantity}</td>
                        <td className="py-3.5 px-4 text-right text-slate-400 font-mono">Rs. {parseFloat(item.price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-400 font-mono">Rs. {((item.price || 0) * (item.quantity || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-3.5 px-4 text-center">
                          {userRole === "admin" ? (
                            <button onClick={() => startEdit(item)} className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline">Edit</button>
                          ) : (
                            <span className="text-[10px] text-slate-600 italic">Locked</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}