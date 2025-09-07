

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from './Modal.tsx';
import { Button } from './Button.tsx';

interface VoiceRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (audioBlob: Blob) => void;
  title: string;
}

type RecordingState = 'idle' | 'permission_denied' | 'recording' | 'recorded' | 'submitting';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const SoundWave: React.FC<{ isAnimating: boolean }> = ({ isAnimating }) => (
    <div className="flex items-center justify-center h-16 w-32 gap-1 my-4">
        {Array.from({ length: 5 }).map((_, i) => (
            <div
                key={i}
                className="w-2 bg-primary-medium rounded-full"
                style={{
                    height: isAnimating ? `${Math.random() * 80 + 20}%` : '20%',
                    animation: isAnimating ? `soundwave 1.2s ease-in-out ${i * 0.1}s infinite alternate` : 'none',
                }}
            />
        ))}
        <style>{`
        @keyframes soundwave {
            0% { height: 20%; }
            100% { height: 100%; }
        }
        `}</style>
    </div>
);


export const VoiceRecordingModal: React.FC<VoiceRecordingModalProps> = ({ isOpen, onClose, onSave, title }) => {
    const [state, setState] = useState<RecordingState>('idle');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [timer, setTimer] = useState(0);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        stream?.getTracks().forEach(track => track.stop());
        setStream(null);
        setState('recorded');
    }, [stream]);

    useEffect(() => {
        if (timer >= 60) {
            stopRecording();
        }
    }, [timer, stopRecording]);
    
    const cleanup = useCallback(() => {
        stream?.getTracks().forEach(track => track.stop());
        setStream(null);
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        setTimer(0);
        setState('idle');
    }, [stream, audioUrl]);

    useEffect(() => {
      if (!isOpen) {
        cleanup();
      }
    }, [isOpen, cleanup]);


    const startRecording = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(mediaStream);
            setState('recording');
            setTimer(0);
            
            mediaRecorderRef.current = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
            };
            
            mediaRecorderRef.current.start();

            timerIntervalRef.current = window.setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Microphone access denied:", err);
            setState('permission_denied');
        }
    };
    
    const handleReRecord = () => {
        cleanup();
        startRecording();
    };

    const handleSave = () => {
        if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            onSave(audioBlob);
            setState('submitting');
        }
    };
    
    const renderContent = () => {
      switch(state) {
        case 'permission_denied':
            return <div className="text-center p-4">
                <p className="font-sans font-semibold text-error-red mb-2">ปิดกั้นการเข้าถึงไมโครโฟน</p>
                <p className="text-sm font-serif">กรุณาอนุญาตให้แอปนี้ใช้ไมโครโฟนของคุณในตั้งค่าเบราว์เซอร์</p>
            </div>;
        case 'recording':
            return <div className="flex flex-col items-center">
                <p className="font-mono text-4xl text-primary-dark tracking-wider">{formatTime(timer)} / 01:00</p>
                <SoundWave isAnimating={true} />
                <Button onClick={stopRecording} size="lg" colorScheme="accent" className="!bg-error-red hover:!bg-red-700 !rounded-xl !w-32">
                    <span className="text-2xl mr-2">🟥</span> หยุด
                </Button>
            </div>;
        case 'recorded':
            return <div className="flex flex-col items-center">
                <p className="font-sans font-semibold text-lg text-primary-dark mb-2">ตรวจสอบเสียงของคุณ</p>
                {audioUrl && <audio ref={audioRef} src={audioUrl} controls className="w-full mb-4" />}
                <div className="flex gap-4 w-full mt-4">
                    <Button onClick={handleReRecord} variant="outline" colorScheme="neutral" size="lg" className="flex-1">
                        อัดใหม่
                    </Button>
                    <Button onClick={handleSave} variant="primary" size="lg" className="flex-1">
                        ส่ง
                    </Button>
                </div>
            </div>;
        case 'submitting':
             return <div className="text-center p-4">
                <p className="font-sans font-semibold text-primary-dark mb-2 animate-pulse">กำลังส่ง...</p>
            </div>;
        case 'idle':
        default:
            return <div className="flex flex-col items-center justify-center p-8">
                 <Button onClick={startRecording} variant="secondary" size="lg" className="!rounded-full !w-32 !h-32 flex flex-col items-center justify-center">
                     <span className="text-5xl mb-1">🎙️</span>
                     <span className="font-sans font-semibold">อัดเสียง</span>
                 </Button>
            </div>;
      }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            {renderContent()}
        </Modal>
    );
};