import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Mic, MicOff, Video as VideoIcon, VideoOff, ArrowRight } from 'lucide-react';

const PreJoin = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const getMedia = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error('Error accessing media devices:', err);
            }
        };
        getMedia();

        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    }, []);

    const toggleMute = () => {
        if (stream) {
            stream.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks().forEach(track => { track.enabled = !track.enabled; });
            setIsVideoOff(!isVideoOff);
        }
    };

    const joinRoom = () => {
        // In a real app, we would pass the device IDs or state via context/state
        // For now, we just navigate to the room
        navigate(`/room/${id}`);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-black text-white">
            {/* Aurora Background */}
            <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-secondary/20 rounded-full blur-[120px]" />
            </div>

            <div className="glass-panel p-6 md:p-8 max-w-2xl w-full flex flex-col items-center gap-6 md:gap-8 relative z-10">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Ready to join?</h1>
                    <p className="text-white/60">Check your audio and video settings before entering.</p>
                </div>

                {/* Video Preview */}
                <div className="relative w-full aspect-video bg-black/50 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transform scale-x-[-1] ${isVideoOff ? 'hidden' : ''}`}
                    />
                    {isVideoOff && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                                <VideoOff className="w-8 h-8 text-white/40" />
                            </div>
                        </div>
                    )}

                    {/* Controls Overlay */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                        <button
                            onClick={toggleMute}
                            className={`w-12 h-12 btn-icon ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-black/40 backdrop-blur-md'}`}
                        >
                            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={toggleVideo}
                            className={`w-12 h-12 btn-icon ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-black/40 backdrop-blur-md'}`}
                        >
                            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Join Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Your Name</label>
                        <input
                            type="text"
                            placeholder="Enter your name"
                            className="w-full"
                            defaultValue="Guest User"
                        />
                    </div>
                    <button
                        onClick={joinRoom}
                        className="btn btn-primary w-full sm:w-auto h-[52px] mt-auto"
                    >
                        Join Meeting
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PreJoin;
