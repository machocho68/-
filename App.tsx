import React, { useState } from 'react';
import { AppView, CarePlanItem, SoapNote } from './types';
import Recorder from './components/Recorder';
import CarePlanView from './components/CarePlanView';
import LiveDiscussion from './components/LiveDiscussion';
import { analyzeRecord } from './services/geminiService';
import { Stethoscope, Mic, FileText, Loader2, RotateCcw, AlertCircle, Zap, Shield, Trophy } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.RECORDER);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState<{
    soap: SoapNote, 
    carePlan: CarePlanItem[], 
    summary: string,
    threatLevel: 'WOLF' | 'TIGER' | 'DEMON' | 'DRAGON',
    otsuboneWisdom: string
  } | null>(null);

  const handleRecordingComplete = async (blob: Blob | null, text: string) => {
    if (!blob && !text.trim()) {
        alert("やる気あんのか？何か情報をよこしなさい！");
        return;
      }

    setIsProcessing(true);
    try {
      const result = await analyzeRecord(blob, text);
      setCurrentResult(result);
      setCurrentView(AppView.RESULT);
    } catch (error) {
      let errorMessage = (error as any)?.message || "原因不明のエラー。";
      if (errorMessage.includes("overloaded") || errorMessage.includes("503")) {
          errorMessage = "サーバー混雑！災害レベル【竜】だわ！待ちなさい！";
      }
      alert("作戦失敗: " + errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCurrentResult(null);
    setCurrentView(AppView.RECORDER);
  };

  return (
    <div className="min-h-screen pb-20 selection:bg-yellow-400 selection:text-black">
      <header className="bg-white border-b-4 border-black sticky top-0 z-50 h-20 flex items-center justify-between px-4 lg:px-8 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-2 border-2 border-black comic-shadow-sm transform -rotate-2">
            <Stethoscope className="text-white w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-black text-3xl tracking-tighter text-black uppercase leading-none italic">
              HERO <span className="text-red-600">NURSE</span>
            </h1>
            <p className="text-xs font-bold bg-black text-yellow-400 px-1 inline-block transform -skew-x-12 w-max mt-1">
              S-CLASS RANK 2: OTSUBONE
            </p>
          </div>
        </div>
        {currentView === AppView.RESULT && (
           <button onClick={handleReset} className="bg-white border-2 border-black text-black px-4 py-2 font-bold uppercase tracking-wider hover:bg-yellow-300 transition-all comic-shadow-sm flex items-center gap-2">
             <RotateCcw size={16} /> NEXT MISSION
           </button>
        )}
      </header>

      <main className={`container mx-auto px-4 py-8 max-w-4xl ${currentView === AppView.LIVE_DISCUSSION ? 'h-[calc(100vh-80px)]' : 'min-h-[calc(100vh-80px)]'}`}>
        {currentView === AppView.RECORDER && (
          <div className="space-y-12 animate-in zoom-in-95 duration-300">
            <div className="relative text-center py-10">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-red-600 text-white font-black text-lg px-6 py-1 border-2 border-black -rotate-1 comic-shadow-sm z-10">
                 THREAT ASSESSMENT
               </div>
               <div className="bg-white border-4 border-black p-8 comic-shadow relative overflow-hidden">
                 <h2 className="text-5xl md:text-6xl font-black text-black uppercase italic tracking-tighter mb-2">RECORD REPORT</h2>
                 <p className="text-black font-bold text-lg bg-yellow-300 inline-block px-4 py-1 transform -skew-x-12">訪問の記録を報告しなさい。一撃でアセスメントするわよ。</p>
               </div>
            </div>
            <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
            <div className="flex justify-center mt-12">
              <button onClick={() => setCurrentView(AppView.LIVE_DISCUSSION)} className="group relative px-8 py-5 bg-black border-4 border-black text-white hover:text-yellow-400 transition-all comic-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                <div className="flex items-center gap-3 font-black text-xl tracking-wider uppercase italic">
                   <AlertCircle size={24} className="text-yellow-400" />
                   <span>EMERGENCY CALL (LIVE)</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {currentView === AppView.RESULT && currentResult && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="text-center relative">
               <span className="bg-red-600 text-white text-4xl font-black italic px-8 py-2 border-4 border-black comic-shadow inline-block transform -rotate-2">MISSION COMPLETE</span>
             </div>
             <CarePlanView {...currentResult} />
             <div className="flex justify-center gap-4 pt-4 pb-12">
                <button onClick={() => setCurrentView(AppView.LIVE_DISCUSSION)} className="bg-black text-white border-4 border-black px-8 py-4 font-black text-xl italic uppercase comic-shadow hover:bg-zinc-800 hover:text-yellow-400 transition-all flex items-center gap-3 shake-hover">
                  <Shield size={24} className="text-red-500" /> S級ヒーロー（お局）に直接相談
                </button>
             </div>
          </div>
        )}

        {currentView === AppView.LIVE_DISCUSSION && <LiveDiscussion onEnd={() => currentResult ? setCurrentView(AppView.RESULT) : setCurrentView(AppView.RECORDER)} />}
      </main>

      {isProcessing && (
        <div className="fixed inset-0 bg-yellow-400 z-50 flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,#000_20px,#000_22px)]"></div>
            <div className="bg-white border-4 border-black p-12 max-w-md w-full mx-4 relative comic-shadow text-center">
              <div className="absolute -top-6 -left-6 bg-red-600 text-white font-black px-4 py-2 border-2 border-black transform -rotate-6 text-xl">MAJI SERIES</div>
              <div className="flex justify-center mb-6"><Loader2 className="w-20 h-20 text-black animate-spin" strokeWidth={3} /></div>
              <h3 className="text-4xl font-black text-black mb-2 tracking-tighter uppercase italic">SERIOUS ANALYSIS</h3>
              <p className="text-black font-bold text-xl">臨床推論実行中... 黙って待ち返なさい！</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;