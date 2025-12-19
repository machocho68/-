import React, { useState } from 'react';
import { CarePlanItem, SoapNote } from '../types';
import { Check, Edit2, FileText, Activity, Sparkles, Users, Share2, Loader2, X, Copy, Crosshair, AlertTriangle, ShieldAlert, Skull, Brain } from 'lucide-react';
import { generateSupportContent } from '../services/geminiService';

interface CarePlanViewProps {
  soap: SoapNote;
  carePlan: CarePlanItem[];
  summary: string;
  threatLevel: 'WOLF' | 'TIGER' | 'DEMON' | 'DRAGON';
  otsuboneWisdom: string;
}

const CarePlanView: React.FC<CarePlanViewProps> = ({ soap, carePlan, summary, threatLevel, otsuboneWisdom }) => {
  const [activeTab, setActiveTab] = useState<'soap' | 'plan'>('soap');
  const [supportResult, setSupportResult] = useState<{title: string, content: string} | null>(null);
  const [loadingType, setLoadingType] = useState<'hints' | 'family' | 'handover' | null>(null);

  const handleSupport = async (type: 'hints' | 'family' | 'handover') => {
    setLoadingType(type);
    let title = type === 'hints' ? "臨床的洞察 / INSIGHT" : type === 'family' ? "市民（家族）報告" : "本部（多職種）共有";
    try {
      const content = await generateSupportContent(type, soap, carePlan);
      setSupportResult({ title, content });
    } catch (e) {
      alert("エラーだ！");
    } finally {
      setLoadingType(null);
    }
  };

  const threatColor = {
    WOLF: 'bg-zinc-500',
    TIGER: 'bg-yellow-500',
    DEMON: 'bg-orange-600',
    DRAGON: 'bg-red-600 animate-pulse'
  }[threatLevel];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 font-sans">
      {/* Risk Assessment Panel */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className={`flex-1 ${threatColor} border-4 border-black p-4 comic-shadow-sm flex items-center gap-4`}>
          <Skull className="text-white w-12 h-12 shrink-0" />
          <div className="text-white">
            <h3 className="font-black italic text-xl leading-none">THREAT LEVEL</h3>
            <p className="text-4xl font-black tracking-tighter">{threatLevel}</p>
          </div>
        </div>
        <div className="flex-[2] bg-white border-4 border-black p-4 comic-shadow-sm flex items-start gap-4">
          <Brain className="text-black w-8 h-8 shrink-0 mt-1" />
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest text-red-600 mb-1">お局の洞察（臨床的アセスメント）</h4>
            <p className="font-bold text-sm leading-tight text-black">{otsuboneWisdom}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border-4 border-black relative comic-shadow">
        <div className="bg-black text-white p-4 flex justify-between items-center">
            <div className="font-black text-2xl italic tracking-tighter text-yellow-400 uppercase">Mission Report Dossier</div>
            <div className="text-xs font-bold text-gray-400">ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</div>
        </div>

        <div className="p-6 border-b-4 border-black bg-yellow-50 relative">
          <div className="absolute -top-3 left-4 bg-white border-2 border-black px-3 font-bold text-xs">SUMMARY</div>
          <p className="text-black font-bold text-lg">{summary}</p>
        </div>

        <div className="flex border-b-4 border-black">
          <button onClick={() => setActiveTab('soap')} className={`flex-1 py-4 font-black text-xl italic border-r-4 border-black ${activeTab === 'soap' ? 'bg-red-600 text-white' : 'bg-white text-black'}`}>SOAP DATA</button>
          <button onClick={() => setActiveTab('plan')} className={`flex-1 py-4 font-black text-xl italic ${activeTab === 'plan' ? 'bg-yellow-400 text-black' : 'bg-white text-black'}`}>CARE PLAN</button>
        </div>

        <div className="p-8 min-h-[400px] bg-white relative">
          <div className="absolute inset-0 bg-[radial-gradient(#000_1px,transparent_1px)] bg-[length:16px_16px] opacity-10 pointer-events-none"></div>
          {activeTab === 'soap' ? (
            <div className="space-y-6 relative z-10">
              {Object.entries(soap).map(([key, val]) => (
                <div key={key} className="border-4 border-black bg-white comic-shadow-sm mb-4">
                  <div className={`p-2 border-b-4 border-black font-black uppercase flex items-center gap-2 ${key==='assessment'?'bg-yellow-300':key==='plan'?'bg-purple-300':'bg-gray-100'}`}>
                    <span className="bg-black text-white w-8 h-8 flex items-center justify-center rounded-sm">{key[0].toUpperCase()}</span>
                    {key}
                  </div>
                  <div className="p-4 font-bold text-base whitespace-pre-wrap">{val}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6 relative z-10">
              {carePlan.map((item, index) => (
                <div key={index} className="border-4 border-black bg-white comic-shadow-sm">
                  <div className="bg-black text-white p-2 font-black italic">PROBLEM #{index+1}</div>
                  <div className="p-4">
                    <h4 className="text-lg font-black mb-3 pb-1 border-b-2 border-gray-200">{item.problem}</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 border-2 border-black p-3 pt-5 relative">
                        <div className="absolute -top-2 left-2 bg-blue-500 text-white px-2 border-2 border-black text-[10px] font-bold">GOAL</div>
                        <p className="font-bold text-sm">{item.goal}</p>
                      </div>
                      <div className="bg-red-50 border-2 border-black p-3 pt-5 relative">
                        <div className="absolute -top-2 left-2 bg-red-600 text-white px-2 border-2 border-black text-[10px] font-bold">INTERVENTION</div>
                        <p className="font-bold text-sm">{item.intervention}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { type: 'hints', icon: Sparkles, color: 'red', label: 'お局のガチ指導', sub: 'Insight' },
          { type: 'family', icon: Users, color: 'blue', label: '家族への活動報告', sub: 'Care Report' },
          { type: 'handover', icon: Share2, color: 'yellow', label: '多職種プロ共有', sub: 'Handover' }
        ].map((btn) => (
          <button 
            key={btn.type}
            onClick={() => handleSupport(btn.type as any)}
            disabled={loadingType !== null}
            className="relative bg-white border-4 border-black p-6 comic-shadow hover:-translate-y-2 transition-all disabled:opacity-50"
          >
            <btn.icon size={32} className="text-black mb-4" />
            <h4 className="font-black text-lg italic uppercase">{btn.label}</h4>
            <p className="text-[10px] font-bold text-gray-500 tracking-widest">{btn.sub}</p>
            {loadingType === btn.type && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-black" /></div>}
          </button>
        ))}
      </div>

      {supportResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSupportResult(null)}>
            <div className="bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] max-w-lg w-full max-h-[85vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                <div className="bg-black text-yellow-400 p-4 flex justify-between items-center">
                    <h3 className="font-black text-xl italic uppercase">{supportResult.title}</h3>
                    <button onClick={() => setSupportResult(null)} className="bg-white text-black p-1 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-8 overflow-y-auto font-bold text-lg leading-relaxed">{supportResult.content}</div>
                <div className="p-4 border-t-4 border-black bg-gray-100 flex justify-end gap-3">
                     <button onClick={() => {navigator.clipboard.writeText(supportResult.content); alert('記録完了！');}} className="bg-black text-white px-6 py-2 font-black uppercase flex items-center gap-2 comic-shadow-sm active:shadow-none active:translate-x-1 active:translate-y-1">
                        <Copy size={18} /> COPY
                     </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CarePlanView;