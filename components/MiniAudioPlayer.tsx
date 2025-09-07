import React, { useState, useRef, useEffect } from 'react';

interface MiniAudioPlayerProps {
  audioUrl: string;
  icon: '🎙️' | '🎶';
}

const CIRCLE_RADIUS = 14;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export const MiniAudioPlayer: React.FC<MiniAudioPlayerProps> = ({ audioUrl, icon }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);
    const requestRef = useRef<number | null>(null);

    const animate = () => {
        const audio = audioRef.current;
        if (audio) {
            setProgress((audio.currentTime / audio.duration) * 100);
            requestRef.current = requestAnimationFrame(animate);
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        
        const handleEnd = () => {
            setIsPlaying(false);
            setProgress(0);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
        
        audio.addEventListener('ended', handleEnd);
        return () => {
            audio.removeEventListener('ended', handleEnd);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    const togglePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (!audio) return;
        
        if (isPlaying) {
            audio.pause();
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        } else {
            audio.play().catch(err => console.error("Audio play failed:", err));
            requestRef.current = requestAnimationFrame(animate);
        }
        setIsPlaying(!isPlaying);
    };
    
    const offset = CIRCLE_CIRCUMFERENCE - (progress / 100) * CIRCLE_CIRCUMFERENCE;

    return (
        <button
            type="button"
            onClick={togglePlayPause}
            className="relative w-8 h-8 flex items-center justify-center rounded-full bg-white/70 backdrop-blur-sm text-sm focus:outline-none"
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
        >
            <audio ref={audioRef} src={audioUrl} preload="metadata" />
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 32 32">
                 <circle
                    cx="16" cy="16" r={CIRCLE_RADIUS}
                    className="stroke-neutral-gray"
                    strokeWidth="2" fill="transparent"
                />
                 <circle
                    cx="16" cy="16" r={CIRCLE_RADIUS}
                    className="stroke-primary-blue"
                    strokeWidth="2" fill="transparent"
                    strokeDasharray={CIRCLE_CIRCUMFERENCE}
                    strokeDashoffset={offset}
                    transform="rotate(-90 16 16)"
                    style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                 />
            </svg>
             <span className="relative z-10">
                {isPlaying ? '⏸️' : icon}
            </span>
        </button>
    );
};