import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { Trash2, Save, Activity, TrendingUp, CheckCircle, XCircle, Star, Share2, Download, Copy } from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Components ---

const InputField = ({ label, name, value, onChange, placeholder, type = "text" }) => (
  <div className="flex flex-col space-y-1 w-full">
    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 ml-1">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="border-2 border-gray-900 px-2 py-1.5 font-mono text-sm focus:outline-none focus:bg-yellow-50 transition-colors w-full"
    />
  </div>
);

const SectionHeader = ({ title }) => (
  <div className="w-full border-2 border-gray-900 bg-white py-1 px-2 mt-4 mb-2">
    <h3 className="font-bold text-center text-sm uppercase tracking-widest text-gray-900">{title}</h3>
  </div>
);

const StarRating = ({ rating, setRating, readOnly = false }) => {
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && setRating(star)}
          className={`focus:outline-none transition-transform ${!readOnly ? 'hover:scale-110' : ''}`}
        >
          <Star
            size={readOnly ? 16 : 24}
            className={`${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const ToggleBtn = ({ label, value, onClick }) => (
  <div className="flex items-center justify-between border-2 border-gray-900 px-3 py-2 w-full">
    <span className="text-xs font-bold uppercase tracking-wider text-gray-700">{label}</span>
    <div className="flex space-x-2">
      <button
        type="button"
        onClick={() => onClick('Y')}
        className={`w-8 h-8 flex items-center justify-center font-bold border-2 ${
          value === 'Y' ? 'bg-gray-900 text-white border-gray-900' : 'text-gray-400 border-gray-200'
        }`}
      >
        Y
      </button>
      <button
        type="button"
        onClick={() => onClick('N')}
        className={`w-8 h-8 flex items-center justify-center font-bold border-2 ${
          value === 'N' ? 'bg-gray-900 text-white border-gray-900' : 'text-gray-400 border-gray-200'
        }`}
      >
        N
      </button>
    </div>
  </div>
);

export default function TradeRecordApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Form State
  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    position: '',
    time: '',
    lotSize: '',
    longShort: 'Long',
    type: '',
    strategy: '',
    chartAnalysis: '',
    entry: '',
    stopLoss: '',
    exit: '',
    takeProfit: '',
    rr: '',
    profitLoss: '',
    reason: '',
    assumptions: '',
    disciplined: '',
    followedRules: '',
    rating: 0
  };

  const [formData, setFormData] = useState(initialFormState);

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error", error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'tradeRecords')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTrades = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      fetchedTrades.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTrades(fetchedTrades);
    }, (error) => {
      console.error("Error fetching trades:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'tradeRecords'), {
        ...formData,
        createdAt: serverTimestamp()
      });
      setFormData(initialFormState);
    } catch (error) {
      console.error("Error adding trade:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!user || !window.confirm("Delete this trade record?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tradeRecords', id));
    } catch (error) {
      console.error("Error deleting trade:", error);
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleExportCSV = () => {
    if (trades.length === 0) return alert("No trades to export.");
    
    const headers = ["Date", "Symbol", "Type", "Long/Short", "Entry", "Exit", "P/L", "Rating"];
    const csvContent = [
      headers.join(","),
      ...trades.map(t => [
        t.date, 
        t.symbol, 
        t.type, 
        t.longShort, 
        t.entry, 
        t.exit, 
        t.profitLoss, 
        t.rating
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "trade_records.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-mono">Loading Trade Journal...</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8 font-mono text-gray-800">
      <div className="max-w-4xl mx-auto">
        
        {/* --- FORM SECTION --- */}
        <div className="bg-white p-6 shadow-xl border-t-8 border-gray-900 mb-8">
          
          {/* Header */}
          <div className="bg-gray-900 text-white py-4 px-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-white hidden md:block"></div>
              <h1 className="text-xl md:text-2xl font-bold tracking-[0.2em] uppercase">Trade Record</h1>
            </div>
            
            <button 
              onClick={handleCopyLink}
              className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-2 rounded flex items-center gap-2 transition-colors uppercase tracking-wider"
            >
              {copySuccess ? <CheckCircle size={14} /> : <Share2 size={14} />}
              {copySuccess ? "Copied!" : "Share App"}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Top Row: Date & Symbol */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-2 border-gray-900 p-4">
              <InputField label="Date:" name="date" type="date" value={formData.date} onChange={handleChange} />
              <InputField label="Symbol:" name="symbol" value={formData.symbol} onChange={handleChange} placeholder="e.g. EURUSD" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Trading Setup Column */}
              <div className="lg:col-span-1 space-y-4">
                <SectionHeader title="Trading Setup" />
                <div className="border-2 border-gray-900 p-3 space-y-3">
                  <InputField label="Position:" name="position" value={formData.position} onChange={handleChange} />
                  <InputField label="Time:" name="time" type="time" value={formData.time} onChange={handleChange} />
                  <InputField label="Lot Size:" name="lotSize" value={formData.lotSize} onChange={handleChange} />
                  
                  {/* Long/Short Toggle */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 ml-1">Long/Short</label>
                    <div className="flex w-full border-2 border-gray-900">
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, longShort: 'Long' }))}
                        className={`flex-1 py-1 text-xs font-bold uppercase ${formData.longShort === 'Long' ? 'bg-green-100 text-green-800' : 'bg-white'}`}
                      >
                        Long
                      </button>
                      <div className="w-0.5 bg-gray-900"></div>
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, longShort: 'Short' }))}
                        className={`flex-1 py-1 text-xs font-bold uppercase ${formData.longShort === 'Short' ? 'bg-red-100 text-red-800' : 'bg-white'}`}
                      >
                        Short
                      </button>
                    </div>
                  </div>

                  <InputField label="Type:" name="type" value={formData.type} onChange={handleChange} placeholder="Market/Limit" />
                  <InputField label="Strategy:" name="strategy" value={formData.strategy} onChange={handleChange} />
                </div>
              </div>

              {/* Chart Analysis Column */}
              <div className="lg:col-span-2 flex flex-col">
                <SectionHeader title="Chart Analysis" />
                <div className="flex-grow border-2 border-gray-900 p-2 min-h-[300px]">
                  <textarea
                    name="chartAnalysis"
                    value={formData.chartAnalysis}
                    onChange={handleChange}
                    className="w-full h-full resize-none p-2 font-mono text-sm focus:outline-none focus:bg-yellow-50"
                    placeholder="Describe market structure, indicators, or paste an image URL here..."
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Trade Management */}
            <div>
              <SectionHeader title="Trade Management" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 border-2 border-gray-900 p-4">
                <InputField label="Entry:" name="entry" value={formData.entry} onChange={handleChange} />
                <InputField label="Stop Loss:" name="stopLoss" value={formData.stopLoss} onChange={handleChange} />
                <InputField label="Exit:" name="exit" value={formData.exit} onChange={handleChange} />
                <InputField label="Take Profit:" name="takeProfit" value={formData.takeProfit} onChange={handleChange} />
                <InputField label="R/R:" name="rr" value={formData.rr} onChange={handleChange} />
                <InputField label="Profit/Loss:" name="profitLoss" value={formData.profitLoss} onChange={handleChange} />
              </div>
            </div>

            {/* Trade Analysis */}
            <div>
              <SectionHeader title="Trade Analysis" />
              <div className="border-2 border-gray-900 p-4 space-y-3">
                <InputField label="Reason for Trade:" name="reason" value={formData.reason} onChange={handleChange} />
                <InputField label="Assumptions Before Trade:" name="assumptions" value={formData.assumptions} onChange={handleChange} />
              </div>
            </div>

            {/* Feedback */}
            <div>
              <SectionHeader title="Feedback" />
              <div className="border-2 border-gray-900 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <ToggleBtn 
                    label="Disciplined" 
                    value={formData.disciplined} 
                    onClick={(val) => setFormData(p => ({ ...p, disciplined: val }))} 
                  />
                  <ToggleBtn 
                    label="Followed Rules" 
                    value={formData.followedRules} 
                    onClick={(val) => setFormData(p => ({ ...p, followedRules: val }))} 
                  />
                </div>
                <div className="flex items-center justify-between border-t-2 border-gray-200 pt-4">
                  <span className="font-bold uppercase tracking-widest text-sm ml-1">Rating</span>
                  <StarRating rating={formData.rating} setRating={(r) => setFormData(p => ({ ...p, rating: r }))} />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gray-900 text-white py-4 font-bold text-lg uppercase tracking-widest hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Saving...' : <><Save size={20} /> Save Trade Record</>}
              </button>
            </div>

          </form>
        </div>

        {/* --- DATA TABLE SECTION --- */}
        <div className="bg-white shadow-xl overflow-hidden border-2 border-gray-900">
          <div className="bg-gray-100 px-6 py-4 border-b-2 border-gray-900 flex justify-between items-center">
            <h2 className="text-xl font-bold uppercase tracking-wider flex items-center gap-2">
              <Activity className="text-gray-900" /> Trade Log
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded flex items-center gap-2 transition-colors uppercase font-bold"
                title="Download CSV"
              >
                <Download size={14} /> CSV
              </button>
              <span className="text-sm bg-gray-900 text-white px-3 py-1 rounded-full">{trades.length} Records</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Symbol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry/Exit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P/L</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">
                      No trades recorded yet. Fill out the form above to start your journal.
                    </td>
                  </tr>
                ) : (
                  trades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-yellow-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{trade.symbol}</div>
                        <div className="text-xs text-gray-500">{trade.date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          trade.longShort === 'Long' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {trade.longShort}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">{trade.type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>In: {trade.entry || '-'}</div>
                        <div>Out: {trade.exit || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-bold ${
                          (trade.profitLoss || '').includes('-') ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {trade.profitLoss || '-'}
                        </div>
                        <div className="text-xs text-gray-500">R: {trade.rr || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StarRating rating={trade.rating || 0} readOnly={true} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDelete(trade.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}


