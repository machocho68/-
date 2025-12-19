
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, PhoneOff, Loader2, User, Radio, Zap, Phone, Key, AlertTriangle } from 'lucide-react';

interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// Global declaration removed to prevent duplicate modifier/type errors in current environment; use window casting.

interface LiveDiscussionProps {
  onEnd: () => void;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// Audio Helper Functions - Manual implementation following SDK guidelines.
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const LiveDiscussion: React.FC<LiveDiscussionProps> = ({ onEnd }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');
  
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, currentInput, currentOutput]);

  const cleanupSession = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    sourcesRef.current.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    
    if (sessionRef.current) {
      sessionRef.current.then((s: any) => {
          if (s && s.close) s.close();
      }).catch(() => {});
      sessionRef.current = null;
    }
  }, []);

  const handleOpenSelectKey = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      // Assume the key selection was successful to mitigate race conditions.
      connectToLiveAPI();
    } catch (e) {
      console.error("Key selection failed", e);
    }
  };

  const connectToLiveAPI = useCallback(async () => {
    // Check if key is selected; use casting to avoid global interface conflicts.
    if ((window as any).aistudio && !(await (window as any).aistudio.hasSelectedApiKey())) {
      await (window as any).aistudio.openSelectKey();
    }

    setStatus('connecting');
    let accumulatedInput = '';
    let accumulatedOutput = '';

    try {
      // Always initialize with a fresh instance inside the connect call.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalalities: [Modality.AUDIO], 
          inputAudioTranscription: {}, 
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: 'あなたは看護歴30年、S級2位ヒーローの「戦慄のお局看護師」です。態度は非常に傲慢で口が悪いですが、指示は的確で、内心は新人を助けたいと思っています。',
        },
        callbacks: {
          onopen: () => {
            setStatus('connected');
            if (!inputAudioContextRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const base64Data = arrayBufferToBase64(int16.buffer);
              
              // Rely on sessionPromise resolution before sending realtime input.
              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  media: { mimeType: 'audio/pcm;rate=16000', data: base64Data }
                });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              accumulatedInput += message.serverContent.inputTranscription.text;
              setCurrentInput(accumulatedInput);
            }
            if (message.serverContent?.outputTranscription) {
              accumulatedOutput += message.serverContent.outputTranscription.text;
              setCurrentOutput(accumulatedOutput);
            }
            if (message.serverContent?.turnComplete) {
              if (accumulatedInput.trim()) setHistory(prev => [...prev, { role: 'user', text: accumulatedInput.trim() }]);
              if (accumulatedOutput.trim()) setHistory(prev => [...prev, { role: 'model', text: accumulatedOutput.trim() }]);
              accumulatedInput = ''; accumulatedOutput = ''; setCurrentInput(''); setCurrentOutput('');
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              setIsPlaying(true);
              const ctx = outputAudioContextRef.current;
              const bytes = base64ToUint8Array(base64Audio);
              const dataInt16 = new Int16Array(bytes.buffer);
              // PCM data decoding must be done manually for raw streams.
              const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
              const channelData = buffer.getChannelData(0);
              for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsPlaying(false);
              };
            }
            
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsPlaying(false);
            }
          },
          onclose: () => setStatus('idle'),
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            const errorMsg = err?.message || "";
            // Reset key selection if entity not found.
            if (errorMsg.includes("Requested entity was not found")) {
                (window as any).aistudio.openSelectKey();
            }
            setStatus('error');
          }
        }
      });
      sessionRef.current = sessionPromise;
    } catch (e: any) {
      console.error("Connection initiation failed", e);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    return () => cleanupSession();
  }, [cleanupSession]);

  return (
    <div className="flex flex-col h-full bg-white border-4 border-black comic-shadow relative font-sans overflow-hidden">
      {/* Comms Header */}
      <div className="bg-black text-white p-4 flex items-center justify-between z-20 border-b-4 border-black">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 border-2 border-white rounded-full flex items-center justify-center ${status === 'connected' ? 'bg-yellow-400' : 'bg-gray-600'}`}>
             <Radio className={`w-6 h-6 ${status === 'connected' ? 'text-black animate-pulse' : 'text-white'}`} />
          </div>
          <div>
              <h2 className="font-black text-xl italic uppercase text-yellow-400 leading-none">HERO COMMS</h2>
              <div className="text-xs font-bold text-gray-400">S-CLASS SECURE LINK</div>
          </div>
        </div>
        <div className={`px-3 py-1 font-black uppercase text-sm transform -skew-x-12 border-2 border-white ${status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-blue-500' : 'bg-red-500'}`}>
           {status === 'connected' ? 'ONLINE' : status === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-yellow-50 relative z-10 bg-[radial-gradient(#000_1px,transparent_1px)] bg-[length:20px_20px]">
         {status === 'idle' && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 z-30 p-6">
             <div className="bg-white border-4 border-black p-8 max-w-sm text-center comic-shadow relative">
               <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-4 fill-yellow-400" />
               <h3 className="text-3xl font-black text-black uppercase italic mb-4">ESTABLISH COMMS</h3>
               <p className="font-bold text-lg mb-6 text-black">お局様に現場の状況を報告し、指示を仰ぎますか？</p>
               <button onClick={connectToLiveAPI} className="w-full bg-yellow-400 border-4 border-black font-black text-xl py-4 uppercase hover:bg-yellow-300 transition-all flex items-center justify-center gap-2 comic-shadow-sm mb-4">
                 <Phone size={24} /> CONNECT
               </button>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">S-Class encryption active</p>
             </div>
           </div>
         )}

         {status === 'connecting' && (
           <div className="flex flex-col items-center justify-center h-full gap-4">
             <Loader2 className="w-16 h-16 animate-spin text-black" strokeWidth={3} />
             <p className="font-black text-2xl uppercase italic animate-pulse text-black">LINKING TO HQ...</p>
           </div>
         )}
         
         {status === 'error' && (
           <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
             <div className="text-center bg-white border-4 border-black p-8 comic-shadow relative max-w-md w-full">
               <div className="bg-red-600 text-white font-black px-4 py-1 border-2 border-black absolute -top-4 left-1/2 -translate-x-1/2 uppercase italic flex items-center gap-2">
                 <AlertTriangle size={16} /> Signal Lost
               </div>
               <p className="font-black text-2xl uppercase italic text-red-600 mb-4">CONNECTION ERROR</p>
               <p className="font-bold text-black mb-6 leading-relaxed">
                 通信が途絶しました。怪人の妨害、あるいは<span className="text-red-600">APIキーの設定不備</span>が考えられます。
               </p>
               <div className="flex flex-col gap-3">
                 <button onClick={connectToLiveAPI} className="w-full bg-black text-white px-8 py-4 font-black uppercase border-2 border-black hover:bg-zinc-800 transition-all">
                   RETRY CONNECTION
                 </button>
                 <button onClick={handleOpenSelectKey} className="w-full bg-yellow-400 text-black px-8 py-4 font-black uppercase border-2 border-black hover:bg-yellow-300 transition-all flex items-center justify-center gap-2 comic-shadow-sm">
                   <Key size={20} /> RE-SET API KEY (FIX)
                 </button>
               </div>
               <p className="mt-4 text-[10px] text-gray-400 font-bold uppercase">Note: Paid GCP Project key required for Live API</p>
             </div>
           </div>
         )}

         {history.map((msg, idx) => (
           <div key={idx} className={`flex gap-4 items-end ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'model' && (
                <div className="w-10 h-10 bg-black border-2 border-black rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                  <span className="text-yellow-400 font-black text-[10px]">S-2</span>
                </div>
              )}
              <div className={`max-w-[80%] p-4 text-lg font-bold border-4 border-black relative comic-shadow-sm ${
                msg.role === 'user' ? 'bg-blue-400 text-white rounded-t-2xl rounded-bl-2xl' : 'bg-white text-black rounded-t-2xl rounded-br-2xl'
              }`}>
                {msg.text}
              </div>
              {msg.role === 'user' && (
                <div className="w-10 h-10 bg-blue-500 border-2 border-black rounded-full flex items-center justify-center shrink-0">
                  <User size={20} className="text-white" />
                </div>
              )}
           </div>
         ))}

         {(currentInput || currentOutput) && (
           <div className={`flex gap-4 ${currentInput ? 'justify-end' : 'justify-start'}`}>
              <div className="bg-white/50 border-2 border-black border-dashed p-3 font-bold text-sm animate-pulse italic text-gray-600">
                {currentInput || currentOutput}...
              </div>
           </div>
         )}
      </div>

      {/* Controls */}
      <div className="bg-white border-t-4 border-black p-6 z-20 flex items-center justify-between">
         <div className="flex-1 flex items-center gap-2">
            <Zap className={`w-6 h-6 ${isPlaying ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
            <div className="h-4 w-24 bg-gray-200 border-2 border-black overflow-hidden transform skew-x-12 relative">
                {isPlaying && (
                  <div className="absolute inset-0 bg-red-600 animate-pulse w-full"></div>
                )}
            </div>
         </div> 
         <div className="flex-1 flex justify-center">
            <div className={`w-24 h-24 rounded-full border-4 border-black flex flex-col items-center justify-center transition-all ${status === 'connected' ? (isPlaying ? 'bg-red-600 scale-110 shadow-xl' : 'bg-yellow-400') : 'bg-gray-200'}`}>
               <Mic className={`w-10 h-10 ${isPlaying ? 'text-white' : 'text-black'}`} />
               <span className={`text-[10px] font-black uppercase mt-1 ${isPlaying ? 'text-white' : 'text-black'}`}>
                 {isPlaying ? 'SPEAKING' : 'LISTENING'}
               </span>
            </div>
         </div>
         <div className="flex-1 flex justify-end">
            <button onClick={onEnd} className="bg-black text-white px-6 py-3 border-2 border-black hover:bg-red-600 transition-colors font-black uppercase text-xs flex items-center gap-2 comic-shadow-sm">
              <PhoneOff size={16} /> HANG UP
            </button>
         </div>
      </div>
    </div>
  );
};

export default LiveDiscussion;
