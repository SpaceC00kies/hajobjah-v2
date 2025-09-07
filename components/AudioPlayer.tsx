import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button.tsx';

interface AudioPlayerProps {
  audioUrl: string;
}

const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time) || time === 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        
        const setAudioData = () => setDuration(audio.duration);
        const setAudioTime = () => setCurrentTime(audio.currentTime);
        const handleEnd = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('loadedmetadata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', handleEnd);

        if (audio.readyState > 0) {
            setAudioData();
        }

        return () => {
            audio.removeEventListener('loadedmetadata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('ended', handleEnd);
        };
    }, [audioUrl]);

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(console.error);
        }
        setIsPlaying(!isPlaying);
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const progressBar = progressBarRef.current;
        const audio = audioRef.current;
        if (!progressBar || !audio || !duration) return;

        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const newTime = (clickX / width) * duration;
        
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="flex items-center gap-3 p-3 bg-neutral-light rounded-full border border-primary-light shadow-sm w-full">
            <audio ref={audioRef} src={audioUrl} preload="metadata" />
            <Button
                onClick={togglePlayPause}
                variant="primary"
                size="sm"
                className="!w-12 !h-12 !p-0 !rounded-full flex-shrink-0 focus:outline-none focus:ring-0 focus:ring-offset-0"
                aria-label={isPlaying ? "Pause" : "Play"}
            >
                {isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M6 5h2v10H6V5zm6 0h2v10h-2V5z"/></svg>
                ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M7 5.5v9l7-4.5-7-4.5z"/></svg>
                )}
            </Button>
            <div className="flex-grow flex items-center gap-2 min-w-0">
                <div 
                    ref={progressBarRef}
                    onClick={handleProgressClick}
                    className="w-full h-2 bg-primary-light rounded-full cursor-pointer group"
                >
                    <div 
                        className="h-full bg-primary-medium rounded-full relative"
                        style={{ width: `${progressPercentage}%` }}
                    >
                         <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary-medium rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
                 <div className="font-mono text-xs text-primary-dark font-medium w-24 text-center whitespace-nowrap">
                    <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};