import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AssetHolding, AssetCategory, CategorySummary, PortfolioSnapshot, Currency } from './types';
import { INITIAL_HOLDINGS, saveSnapshot, getSnapshots, hasEntryForDate, deleteSnapshot, importData } from './services/mockStockService';
import { analyzePortfolio } from './services/geminiService';
import AllocationChart from './components/AllocationChart';
import TrendChart from './components/TrendChart';

// --- Constants ---
const EXCHANGE_RATE = 32.5;

// --- Utilities ---
const safeCalculate = (expression: string): number | null => {
  // Allow digits, spaces, decimal points and basic math operators
  const cleanExpr = expression.replace(/[^0-9+\-*/.() ]/g, '');
  if (!cleanExpr) return null;
  
  try {
    // Determine if it's a math expression (has operators)
    if (!/[+\-*/]/.test(cleanExpr)) return parseFloat(cleanExpr);

    // Use Function constructor for a safer alternative to direct eval, 
    // strictly limited to the regex check above.
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${cleanExpr}`)();
    return isFinite(result) ? result : null;
  } catch {
    return null;
  }
};

// --- Icons ---
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
);
const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
);
const BrainIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
);
const CalculatorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="16" y2="18"></line><path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M8 10h.01"></path><path d="M12 14h.01"></path><path d="M8 14h.01"></path><path d="M12 18h.01"></path><path d="M8 18h.01"></path></svg>
);
const BackspaceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
);
const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>
);
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
);

const App: React.FC = () => {
  // State
  const [holdings, setHoldings] = useState<AssetHolding[]>(INITIAL_HOLDINGS);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [chartView, setChartView] = useState<'All' | AssetCategory>('All');
  
  // Analysis State
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Input State
  const [newSymbol, setNewSymbol] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');
  const [newCurrency, setNewCurrency] = useState<Currency>('TWD');
  const [activeCategory, setActiveCategory] = useState<AssetCategory | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    setSnapshots(getSnapshots());
  }, []);

  // Derived Data
  const categories = useMemo((): CategorySummary[] => {
    const getCat = (type: AssetCategory, label: string, color: string) => {
      const items = holdings.filter(h => h.category === type);
      const subtotalTWD = items.filter(h => h.currency === 'TWD').reduce((sum, h) => sum + h.value, 0);
      const subtotalUSD = items.filter(h => h.currency === 'USD').reduce((sum, h) => sum + h.value, 0);
      const totalValueTWD = subtotalTWD + (subtotalUSD * EXCHANGE_RATE);
      return { type, label, color, totalValueTWD, subtotalTWD, subtotalUSD, holdings: items };
    };
    return [
      getCat('MarketETF', 'Market ETF', '#0f172a'),      // Slate-900
      getCat('BondETF', 'Bond ETF', '#475569'),        // Slate-600
      getCat('IndividualStock', 'Stocks', '#94a3b8') // Slate-400
    ];
  }, [holdings]);

  // Global Totals
  const totalRawTWD = categories.reduce((sum, c) => sum + c.subtotalTWD, 0);
  const totalRawUSD = categories.reduce((sum, c) => sum + c.subtotalUSD, 0);
  const totalPortfolioValueTWD = totalRawTWD + (totalRawUSD * EXCHANGE_RATE);

  // Status Logic
  const currentHistoryRecord = useMemo(() => snapshots.find(s => s.date === selectedDate), [snapshots, selectedDate]);
  const isDateRecorded = !!currentHistoryRecord;
  
  // Compare current workspace with history to determine "Unsaved" state
  const isWorkspaceSynced = useMemo(() => {
    if (!currentHistoryRecord) return false;
    // Simple deep compare
    const currentJson = JSON.stringify(holdings.map(h => ({ symbol: h.symbol, value: h.value, currency: h.currency, category: h.category })));
    const historyJson = JSON.stringify(currentHistoryRecord.holdings.map(h => ({ symbol: h.symbol, value: h.value, currency: h.currency, category: h.category })));
    return currentJson === historyJson;
  }, [holdings, currentHistoryRecord]);

  const historyDates = useMemo(() => snapshots.map(s => s.date).sort().reverse(), [snapshots]);

  // Handlers
  const handleAddOrUpdateHolding = (category: AssetCategory) => {
    if (!newSymbol || !newValue) return;
    
    const calculatedValue = safeCalculate(newValue);
    if (calculatedValue === null || isNaN(calculatedValue)) {
      alert("Invalid value format");
      return;
    }

    const valueNum = calculatedValue;
    const upperSymbol = newSymbol.toUpperCase().trim();

    if (editingId) {
      // Update logic
      const updatedHoldings = holdings.map(h => 
        h.id === editingId 
          ? { ...h, symbol: upperSymbol, value: valueNum, currency: newCurrency, category } 
          : h
      );
      setHoldings(updatedHoldings);
      setEditingId(null);
    } else {
      // Add or Merge logic
      const existingIndex = holdings.findIndex(h => h.symbol === upperSymbol && h.category === category && h.currency === newCurrency);
      if (existingIndex >= 0) {
        const updatedHoldings = [...holdings];
        updatedHoldings[existingIndex] = {
          ...updatedHoldings[existingIndex],
          value: updatedHoldings[existingIndex].value + valueNum
        };
        setHoldings(updatedHoldings);
      } else {
        const newItem: AssetHolding = {
          id: Date.now().toString(),
          symbol: upperSymbol,
          value: valueNum,
          currency: newCurrency,
          category
        };
        setHoldings([...holdings, newItem]);
      }
    }
    
    // Reset inputs
    setNewSymbol('');
    setNewValue('');
    setShowCalculator(false);
    setActiveCategory(null);
  };

  const handleEditHolding = (holding: AssetHolding) => {
    setActiveCategory(holding.category);
    setNewSymbol(holding.symbol);
    setNewValue(holding.value.toString());
    setNewCurrency(holding.currency);
    setEditingId(holding.id);
    setShowCalculator(false);
  };

  const handleRemoveHolding = (id: string) => {
    setHoldings(holdings.filter(h => h.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setNewSymbol('');
      setNewValue('');
    }
  };

  const handleSaveJournal = () => {
    saveSnapshot(selectedDate, holdings);
    setSnapshots(getSnapshots()); // Refresh history
    alert(`Successfully archived assets for ${selectedDate}.`);
  };

  const handleLoadSnapshot = () => {
    if (currentHistoryRecord) {
      if (confirm(`Load history from ${selectedDate}? This will overwrite your current workspace.`)) {
        setHoldings(currentHistoryRecord.holdings);
      }
    }
  };

  const handleDeleteSnapshot = () => {
    if (confirm(`Delete history for ${selectedDate}? This cannot be undone.`)) {
        deleteSnapshot(selectedDate);
        setSnapshots(getSnapshots());
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysis(null);
    const result = await analyzePortfolio(categories, totalPortfolioValueTWD);
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleKeypadClick = (key: string, category: AssetCategory) => {
    if (key === 'AC') {
      setNewValue('');
    } else if (key === 'DEL') {
      setNewValue(prev => prev.slice(0, -1));
    } else if (key === '=') {
      const res = safeCalculate(newValue);
      if (res !== null) setNewValue(res.toString());
    } else if (key === 'OK') {
       handleAddOrUpdateHolding(category);
    } else {
      setNewValue(prev => prev + key);
    }
  };
  
  const handleChartDateSelect = (date: string) => {
      setSelectedDate(date);
  };

  const handleExportData = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshots, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `smartalloc_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const json = JSON.parse(e.target?.result as string);
              const newSnapshots = importData(json);
              setSnapshots(newSnapshots);
              alert("Data imported successfully!");
          } catch (err) {
              alert("Failed to import data. Please check the file format.");
          }
      };
      reader.readAsText(file);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Calculate preview value if input contains operators
  const calculatedPreview = useMemo(() => {
    if (/[+\-*/]/.test(newValue)) {
      const res = safeCalculate(newValue);
      return res !== null ? res : null;
    }
    return null;
  }, [newValue]);

  // Determine status badge color/text
  const getStatusBadge = () => {
      if (!isDateRecorded) return { label: 'No Record', color: 'bg-slate-600 text-slate-300' };
      if (isWorkspaceSynced) return { label: 'Synced', color: 'bg-green-600 text-white' };
      return { label: 'Unsaved Changes', color: 'bg-amber-500 text-white' };
  };
  const statusBadge = getStatusBadge();

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-32 font-sans selection:bg-slate-200">
      
      {/* 1. Header */}
      <header className="px-6 py-8 max-w-7xl mx-auto border-b border-slate-100 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-3xl font-serif font-medium tracking-tight text-slate-900">Portfolio Journal</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-2">Asset Allocation & Tracking</p>
        </div>
        
        <div className="flex flex-col items-end gap-4">
           {/* Backup Controls */}
           <div className="flex gap-2">
               <input type="file" ref={fileInputRef} hidden accept=".json" onChange={handleImportData} />
               <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-colors"
                >
                   <UploadIcon /> Import
               </button>
               <button 
                  onClick={handleExportData}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-colors"
               >
                   <DownloadIcon /> Export
               </button>
           </div>

           <div className="flex flex-col items-end gap-1 text-right">
                <div className="flex items-center gap-6 mb-1 text-xs text-slate-500 uppercase tracking-wider font-bold">
                    <div className="flex flex-col items-end">
                    <span className="text-slate-400 text-[10px]">USD Assets</span>
                    <span className="font-mono text-slate-700">${totalRawUSD.toLocaleString()}</span>
                    </div>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div className="flex flex-col items-end">
                    <span className="text-slate-400 text-[10px]">TWD Assets</span>
                    <span className="font-mono text-slate-700">${totalRawTWD.toLocaleString()}</span>
                    </div>
                </div>
                
                <div className="mt-2">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5 text-right">Est. Total (TWD)</p>
                    <div className="text-4xl font-light tracking-tighter text-slate-900 font-mono">
                    ${totalPortfolioValueTWD.toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-12 space-y-16">
        
        {/* 2. Visual Analytics (Charts) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Allocation */}
          <div className="md:col-span-1">
             <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-2">
               <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Allocation</h3>
               <span className="text-[10px] text-slate-400">Current</span>
             </div>
             <AllocationChart categories={categories} />
          </div>

          {/* Trend (Journal History) */}
          <div className="md:col-span-2">
             <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-2">
               <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">History Trend</h3>
               
               {/* View Switcher Tabs */}
               <div className="flex gap-1 bg-slate-100 p-1 rounded-md">
                 {(['All', 'MarketETF', 'BondETF', 'IndividualStock'] as const).map(view => (
                   <button
                     key={view}
                     onClick={() => setChartView(view)}
                     className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
                       chartView === view 
                         ? 'bg-white text-slate-900 shadow-sm' 
                         : 'text-slate-400 hover:text-slate-600'
                     }`}
                   >
                     {view === 'All' ? 'Overview' : view === 'MarketETF' ? 'Market' : view === 'BondETF' ? 'Bond' : 'Stock'}
                   </button>
                 ))}
               </div>
             </div>
             <TrendChart 
                snapshots={snapshots} 
                filterCategory={chartView} 
                onDateSelect={handleChartDateSelect}
             />
             <p className="text-[10px] text-slate-400 text-center mt-2 italic">Click chart to select date</p>
          </div>
        </section>

        {/* 3. Asset Management (Cards) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {categories.map((cat) => (
            <div key={cat.type} className="flex flex-col group">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-lg font-serif font-medium text-slate-800">{cat.label}</h2>
                <span className="font-mono text-sm text-slate-500">${cat.totalValueTWD.toLocaleString()}</span>
              </div>
              
              {/* Asset List - Dynamic Height */}
              <div className="border-t-2 border-slate-900 pt-2 min-h-[80px]">
                {cat.holdings.length > 0 ? (
                  <ul className="space-y-3">
                    {cat.holdings.map(h => (
                      <li key={h.id} className="flex justify-between items-center group/item hover:bg-slate-50 -mx-2 px-2 py-1 rounded transition-colors">
                        <div className="flex items-center gap-3">
                           <span className={`text-[10px] font-bold px-1.5 py-0.5 border ${h.currency === 'USD' ? 'border-slate-800 text-slate-800' : 'border-slate-300 text-slate-400'}`}>
                             {h.currency}
                           </span>
                           <span className="font-medium text-sm text-slate-700">{h.symbol}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-slate-600">{h.value.toLocaleString()}</span>
                          <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEditHolding(h)}
                              className="p-1 text-slate-400 hover:text-slate-900 transition-colors"
                              title="Edit"
                            >
                              <EditIcon />
                            </button>
                            <button 
                              onClick={() => handleRemoveHolding(h.id)}
                              className="p-1 text-slate-400 hover:text-red-700 transition-colors"
                              title="Delete"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 uppercase tracking-widest py-8">Empty</div>
                )}
              </div>

              {/* Add Input */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                {activeCategory === cat.type ? (
                   <div className={`animate-in fade-in duration-200 p-3 rounded ${editingId ? 'bg-amber-50 ring-1 ring-amber-100' : 'bg-slate-50'}`}>
                      <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-2">
                        <span>{editingId ? 'Edit Asset' : 'New Asset'}</span>
                        <div className="flex gap-2">
                           <button onClick={() => { setShowCalculator(!showCalculator) }} className={`hover:text-slate-900 ${showCalculator ? 'text-slate-900' : ''}`} title="Calculator">
                              <CalculatorIcon />
                           </button>
                           {(editingId || showCalculator) && (
                              <button onClick={() => {setEditingId(null); setActiveCategory(null); setNewSymbol(''); setNewValue(''); setShowCalculator(false)}} className="hover:text-slate-600">Cancel</button>
                           )}
                        </div>
                      </div>
                      <div className="flex gap-2 mb-2">
                        <select 
                          className="bg-white border border-slate-200 text-xs font-bold p-1 rounded focus:outline-none"
                          value={newCurrency}
                          onChange={(e) => setNewCurrency(e.target.value as Currency)}
                        >
                          <option value="TWD">TWD</option>
                          <option value="USD">USD</option>
                        </select>
                        <input 
                          autoFocus
                          className="flex-1 bg-white border border-slate-200 text-sm p-1.5 rounded focus:ring-1 focus:ring-slate-900 outline-none uppercase"
                          placeholder="SYMBOL"
                          value={newSymbol}
                          onChange={e => setNewSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        />
                      </div>
                      
                      {/* Value Input */}
                      <div className="relative mb-2">
                         <input 
                          type="text"
                          inputMode="text"
                          className="w-full bg-white border border-slate-200 text-sm p-1.5 pr-8 rounded focus:ring-1 focus:ring-slate-900 outline-none font-mono"
                          placeholder="Value (e.g. 1500+200)"
                          value={newValue}
                          onChange={e => setNewValue(e.target.value)}
                          onFocus={() => setShowCalculator(true)}
                          onKeyDown={e => e.key === 'Enter' && handleAddOrUpdateHolding(cat.type)}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <CalculatorIcon />
                        </div>
                      </div>

                       {/* On-screen Keypad */}
                       {showCalculator && (
                        <div className="grid grid-cols-4 gap-1 mb-2 animate-in slide-in-from-top-2 duration-200">
                          {/* Row 1 */}
                          <button onClick={() => handleKeypadClick('AC', cat.type)} className="col-span-1 p-2 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold text-slate-700">AC</button>
                          <button onClick={() => handleKeypadClick('DEL', cat.type)} className="col-span-1 p-2 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold text-slate-700 flex items-center justify-center"><BackspaceIcon/></button>
                          <button onClick={() => handleKeypadClick('/', cat.type)} className="col-span-1 p-2 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold text-slate-700">/</button>
                          <button onClick={() => handleKeypadClick('*', cat.type)} className="col-span-1 p-2 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold text-slate-700">*</button>
                          
                          {/* Row 2 */}
                          <button onClick={() => handleKeypadClick('7', cat.type)} className="col-span-1 p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded text-sm font-medium text-slate-800">7</button>
                          <button onClick={() => handleKeypadClick('8', cat.type)} className="col-span-1 p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded text-sm font-medium text-slate-800">8</button>
                          <button onClick={() => handleKeypadClick('9', cat.type)} className="col-span-1 p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded text-sm font-medium text-slate-800">9</button>
                          <button onClick={() => handleKeypadClick('-', cat.type)} className="col-span-1 p-2 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold text-slate-700">-</button>

                          {/* Row 3 */}
                          <button onClick={() => handleKeypadClick('4', cat.type)} className="col-span-1 p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded text-sm font-medium text-slate-800">4</button>
                          <button onClick={() => handleKeypadClick('5', cat.type)} className="col-span-1 p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded text-sm font-medium text-slate-800">5</button>
                          <button onClick={() => handleKeypadClick('6', cat.type)} className="col-span-1 p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded text-sm font-medium text-slate-800">6</button>
                          <button onClick={() => handleKeypadClick('+', cat.type)} className="col-span-1 p-2 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold text-slate-700">+</button>
                          
                          {/* Row 4 */}
                          <button onClick={() => handleKeypadClick('1', cat.type)} className="col-span-1 p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded text-sm font-medium text-slate-800">1</button>
                          <button onClick={() => handleKeypadClick('2', cat.type)} className="col-span-1 p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded text-sm font-medium text-slate-800">2</button>
                          <button onClick={() => handleKeypadClick('3', cat.type)} className="col-span-1 p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded text-sm font-medium text-slate-800">3</button>
                          <button onClick={() => handleKeypadClick('OK', cat.type)} className="row-span-2 p-2 bg-slate-900 hover:bg-slate-800 rounded text-xs font-bold text-white flex items-center justify-center">OK</button>

                          {/* Row 5 */}
                          <button onClick={() => handleKeypadClick('0', cat.type)} className="col-span-1 p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded text-sm font-medium text-slate-800">0</button>
                          <button onClick={() => handleKeypadClick('.', cat.type)} className="col-span-1 p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded text-sm font-medium text-slate-800">.</button>
                          <button onClick={() => handleKeypadClick('=', cat.type)} className="col-span-1 p-2 bg-amber-200 hover:bg-amber-300 border border-amber-300 rounded text-sm font-bold text-slate-800">=</button>
                        </div>
                      )}

                      {/* Math Calculation Preview */}
                      {calculatedPreview !== null && !showCalculator && (
                         <div className="flex justify-end mb-2">
                           <div className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1 shadow-sm animate-in zoom-in duration-200">
                             <span>=</span>
                             <span>{calculatedPreview.toLocaleString()}</span>
                           </div>
                         </div>
                      )}

                      {!showCalculator && (
                        <button 
                          onClick={() => handleAddOrUpdateHolding(cat.type)}
                          className="w-full bg-slate-900 text-white py-1.5 rounded hover:bg-slate-700 flex items-center justify-center text-xs font-bold uppercase tracking-wider"
                        >
                          {editingId ? 'Update' : 'Confirm'}
                        </button>
                      )}
                   </div>
                ) : (
                   <button 
                     onClick={() => { setActiveCategory(cat.type); setEditingId(null); setNewSymbol(''); setNewValue(''); setShowCalculator(false); }}
                     className="w-full py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors border border-dashed border-slate-200 hover:border-slate-400 rounded"
                   >
                     + Add Asset
                   </button>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* 4. AI Analysis */}
        <section className="bg-slate-50 p-8 rounded-none border border-slate-200">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white border border-slate-200 rounded-full">
                <BrainIcon />
              </div>
              <h3 className="font-serif font-medium text-lg">AI Portfolio Advisor</h3>
            </div>
            <button
               onClick={handleAnalyze}
               disabled={isAnalyzing}
               className="text-xs font-bold uppercase tracking-widest px-4 py-2 bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50 transition-all"
             >
               {isAnalyzing ? 'Processing...' : 'Generate Report'}
             </button>
          </div>
          
          <div className="prose prose-slate max-w-none text-sm text-slate-600 leading-relaxed font-light">
             {analysis ? (
               <div className="whitespace-pre-wrap">{analysis}</div>
             ) : (
               <p className="italic text-slate-400">No analysis generated yet. Click the button to get insights on your portfolio structure.</p>
             )}
          </div>
        </section>
      </main>

      {/* 5. Fixed Journal Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-4 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
           <div className="flex items-center gap-4">
             <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusBadge.color}`}>
                   {statusBadge.label}
                </span>
                
                <div className="flex items-center gap-2">
                    <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-slate-800 text-white border-none rounded px-3 py-1 text-sm focus:ring-1 focus:ring-slate-500 font-mono"
                    />
                    {historyDates.length > 0 && (
                        <select 
                            className="bg-slate-800 text-slate-400 text-xs border-none rounded py-1 px-2 focus:ring-1 focus:ring-slate-500 max-w-[100px]"
                            onChange={(e) => { if(e.target.value) setSelectedDate(e.target.value); }}
                            value=""
                        >
                            <option value="">Jump to...</option>
                            {historyDates.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    )}
                </div>
             </div>
           </div>
           
           <div className="flex items-center gap-3">
              {isDateRecorded ? (
                 <>
                   <button 
                     onClick={handleLoadSnapshot}
                     className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white hover:bg-slate-600 transition-colors rounded text-xs font-bold uppercase tracking-wider"
                     title="Load this record to edit"
                   >
                     <HistoryIcon />
                     <span className="hidden sm:inline">Load</span>
                   </button>
                   
                   <button 
                     onClick={handleDeleteSnapshot}
                     className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-red-400 hover:bg-red-900/30 transition-colors rounded text-xs font-bold uppercase tracking-wider"
                     title="Delete this record"
                   >
                     <TrashIcon />
                   </button>

                   <div className="h-6 w-px bg-slate-700 mx-1"></div>

                   <button 
                    onClick={handleSaveJournal}
                    className="flex items-center gap-2 px-6 py-2 bg-white text-slate-900 hover:bg-slate-200 transition-colors rounded text-sm font-bold uppercase tracking-wider"
                  >
                    <SaveIcon />
                    <span>Update</span>
                  </button>
                 </>
              ) : (
                  <button 
                    onClick={handleSaveJournal}
                    className="flex items-center gap-2 px-6 py-2 bg-white text-slate-900 hover:bg-slate-200 transition-colors rounded text-sm font-bold uppercase tracking-wider"
                  >
                    <SaveIcon />
                    <span>Archive Assets</span>
                  </button>
              )}
           </div>
        </div>
      </div>

    </div>
  );
};

export default App;