import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
    stream: MediaStream;
    muted?: boolean;
    className?: string;
}

export const VideoPlayer = ({ stream, muted = false, className = '' }: VideoPlayerProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            className={`w-full h-full object-cover rounded-xl bg-gray-900 ${className}`}
        />
    );
};
