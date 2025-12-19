import React, { useState, useRef, useEffect } from 'react';
import { Send, Radio, Square, Mic, Zap } from 'lucide-react';

interface RecorderProps {
  onRecordingComplete: (blob: Blob | null, text: string) => void;
  isProcessing: boolean;
}

const Recorder: React.FC<RecorderProps> = ({ onRecordingComplete, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startVisualizer = (stream: MediaStream) => {
    if (!canvasRef.current) return;

    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
    
    sourceRef.current.connect(analyserRef.current);
    analyserRef.current.fftSize = 64; // Low for blocky look
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    
    if (!canvasCtx) return;

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      // Clear
      canvasCtx.fillStyle = '#ffffff';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength);
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        // Comic Style Bars
        // Determine color based on height (Threat Level)
        if (barHeight > 80) canvasCtx.fillStyle = '#dc2626'; // Red
        else if (barHeight > 40) canvasCtx.fillStyle = '#facc15'; // Yellow
        else canvasCtx.fillStyle = '#000000'; // Black
        
        // Draw solid bar with border
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        
        // Add black outline effect
        if (barHeight > 0) {
            canvasCtx.strokeStyle = '#000000';
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        }

        x += barWidth;
      }
    };

    draw();
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const options: MediaRecorderOptions = {
         audioBitsPerSecond: 16000, 
         mimeType: 'audio/webm;codecs=opus'
      };
      
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
         delete options.mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(blob, textInput);
        stopVisualizer();
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      startVisualizer(stream);

      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Microphone access denied:", err);
      setError("マイク接続不能。ヒーロー協会に連絡せよ。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
  };

  const handleTextOnlySubmit = () => {
    if (textInput.trim()) {
      onRecordingComplete(null, textInput);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopVisualizer();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white border-4 border-black comic-shadow max-w-lg mx-auto w-full relative">
      
      {/* Visualizer Frame */}
      <div className="w-full mb-6 border-4 border-black bg-white p-1 relative">
         <div className="absolute -top-3 left-2 bg-yellow-400 px-2 border-2 border-black font-bold text-xs">AUDIO WAVE</div>
         <canvas ref={canvasRef} width={300} height={100} className="w-full h-24" />
      </div>

      {/* Text Input */}
      <div className="w-full relative mb-6">
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="テキスト情報入力（任意）..."
          className="w-full p-4 bg-gray-50 border-4 border-black text-black font-bold text-lg placeholder:text-gray-400 focus:bg-yellow-50 focus:outline-none resize-none"
          rows={3}
          disabled={isProcessing}
        />
        <div className="absolute bottom-2 right-2">
            <Send size={20} className="text-black" />
        </div>
      </div>

      {/* Timer */}
      <div className="mb-6 transform -rotate-1">
         <span className={`text-6xl font-black italic tracking-tighter ${isRecording ? 'text-red-600' : 'text-black'}`}>
           {formatTime(duration)}
         </span>
      </div>

      {error && (
        <div className="bg-red-600 text-white font-bold p-2 mb-4 border-2 border-black transform rotate-1">
          ERROR: {error}
        </div>
      )}

      {/* Main Button */}
      <div className="flex flex-col items-center gap-4 w-full">
        {!isRecording ? (
          <>
            <button
              onClick={startRecording}
              disabled={isProcessing}
              className={`group relative w-28 h-28 rounded-full border-4 border-black transition-all flex items-center justify-center ${
                isProcessing ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 hover:scale-105 active:scale-95 comic-shadow'
              }`}
            >
              <div className="flex flex-col items-center">
                 <div className="bg-yellow-400 p-2 rounded-full border-2 border-black mb-1">
                     <Mic className="text-black w-8 h-8" strokeWidth={3} />
                 </div>
                 <span className="text-white font-black italic uppercase text-sm leading-none">RECORD</span>
              </div>
              
              {/* Speed lines decoration */}
              <div className="absolute -right-4 -top-4 text-black text-4xl font-black hidden group-hover:block transform rotate-12">DON!</div>
            </button>

            {textInput.trim().length > 0 && (
               <button
                 onClick={handleTextOnlySubmit}
                 disabled={isProcessing}
                 className="w-full mt-2 bg-yellow-400 border-4 border-black text-black py-3 font-black text-xl italic uppercase hover:bg-yellow-300 transition-all comic-shadow-sm"
               >
                 TRANSMIT TEXT
               </button>
            )}
          </>
        ) : (
          <button
            onClick={stopRecording}
            className="group relative w-28 h-28 rounded-full border-4 border-black bg-white hover:bg-gray-100 transition-all flex items-center justify-center hover:scale-105 active:scale-95 comic-shadow"
          >
             <div className="w-10 h-10 bg-black"></div>
             <span className="absolute -bottom-10 bg-black text-white px-2 font-bold transform -rotate-2">STOP</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Recorder;