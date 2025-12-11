import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Peer from 'peerjs';
import type { MediaConnection } from 'peerjs';
import { VideoPlayer } from '../components/VideoPlayer';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, MicOff, Video as VideoIcon, VideoOff,
    PhoneOff, Copy, Users, Check, Settings, MoreHorizontal, Share2
} from 'lucide-react';

const Room = () => {
    const { id: rawRoomId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Extract the actual room ID
    const extractRoomId = (input: string | undefined): string | null => {
        if (!input) return null;
        const roomMatch = input.match(/\/room\/([^\/\s]+)/);
        if (roomMatch) return roomMatch[1];
        if (input.includes('http') || input.includes('localhost')) {
            try {
                const url = new URL(input.startsWith('http') ? input : `http://${input}`);
                const pathParts = url.pathname.split('/').filter(p => p);
                const lastPart = pathParts[pathParts.length - 1];
                if (lastPart && lastPart.length > 10) return lastPart;
            } catch { }
        }
        return input;
    };

    const roomId = extractRoomId(rawRoomId);

    const [myStream, setMyStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<{ peerId: string; stream: MediaStream }[]>([]);
    const [isHost, setIsHost] = useState(false);
    const [status, setStatus] = useState('Initializing...');
    const [copied, setCopied] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [showControls, setShowControls] = useState(true);

    const peerRef = useRef<Peer | null>(null);
    const myStreamRef = useRef<MediaStream | null>(null);
    const guestStreamRef = useRef<MediaStream | null>(null);
    const pendingCallsRef = useRef<MediaConnection[]>([]);
    const receivedStreamRef = useRef(false);
    const controlsTimeoutRef = useRef<any>(null);

    // Auto-hide controls
    useEffect(() => {
        const handleMouseMove = () => {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (!roomId) return;

        const init = async () => {
            const peer = new Peer(roomId, {
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            peer.on('open', async (id) => {
                console.log('[Host] Connected as Host with ID:', id);
                setIsHost(true);
                setStatus('Requesting camera...');

                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    setMyStream(stream);
                    myStreamRef.current = stream;
                    setStatus('Ready');

                    pendingCallsRef.current.forEach(call => {
                        if (myStreamRef.current) {
                            call.answer(myStreamRef.current);
                            handleCall(call);
                        }
                    });
                    pendingCallsRef.current = [];
                } catch (err) {
                    console.error('Error accessing media devices:', err);
                    setStatus('Camera Error');
                }
            });

            peer.on('call', (call) => {
                if (myStreamRef.current) {
                    call.answer(myStreamRef.current);
                    handleCall(call);
                } else {
                    pendingCallsRef.current.push(call);
                }
            });

            peer.on('error', (err: any) => {
                if (err.type === 'unavailable-id') {
                    console.log('[Guest] Room ID taken, joining as Guest');
                    const guestPeer = new Peer({
                        config: {
                            iceServers: [
                                { urls: 'stun:stun.l.google.com:19302' },
                                { urls: 'stun:global.stun.twilio.com:3478' }
                            ]
                        }
                    });

                    guestPeer.on('open', async (id) => {
                        console.log('[Guest] Connected as Guest with ID:', id);
                        setIsHost(false);
                        setStatus('Connecting...');
                        receivedStreamRef.current = false;

                        let callAttempts = 0;
                        const maxAttempts = 3;

                        const connectToHost = async () => {
                            callAttempts++;
                            try {
                                if (!guestStreamRef.current) {
                                    const guestStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                                    guestStream.getTracks().forEach(track => { track.enabled = false; });
                                    guestStreamRef.current = guestStream;
                                }

                                const call = guestPeer.call(roomId, guestStreamRef.current);
                                if (call) {
                                    handleCall(call);
                                    const checkConnection = setTimeout(() => {
                                        if (!receivedStreamRef.current && callAttempts < maxAttempts) {
                                            setStatus('Retrying...');
                                            setTimeout(() => connectToHost(), 2000);
                                        } else if (!receivedStreamRef.current) {
                                            setStatus('Unable to connect');
                                        }
                                    }, 5000);

                                    call.on('stream', () => {
                                        receivedStreamRef.current = true;
                                        clearTimeout(checkConnection);
                                    });
                                } else {
                                    if (callAttempts < maxAttempts) setTimeout(() => connectToHost(), 2000);
                                    else setStatus('Failed to connect');
                                }
                            } catch (err) {
                                if (callAttempts < maxAttempts) setTimeout(() => connectToHost(), 2000);
                                else setStatus('Failed to connect');
                            }
                        };
                        connectToHost();
                    });

                    guestPeer.on('error', () => setStatus('Connection error'));
                    peerRef.current = guestPeer;
                } else {
                    setStatus('Connection error');
                }
            });

            peerRef.current = peer;
        };

        init();

        return () => {
            myStreamRef.current?.getTracks().forEach(track => track.stop());
            guestStreamRef.current?.getTracks().forEach(track => track.stop());
            peerRef.current?.destroy();
        };
    }, [roomId]);

    const handleCall = (call: MediaConnection) => {
        call.on('stream', (remoteStream) => {
            if (remoteStream.getTracks().length === 0) return;
            if (!isHost) receivedStreamRef.current = true;
            setRemoteStreams(prev => {
                if (prev.find(p => p.peerId === call.peer)) return prev;
                const updated = [...prev, { peerId: call.peer, stream: remoteStream }];
                if (!isHost) setStatus('Connected');
                return updated;
            });
        });
        call.on('close', () => {
            setRemoteStreams(prev => prev.filter(p => p.peerId !== call.peer));
            if (!isHost) setStatus('Stream ended');
        });
        call.on('error', () => {
            if (!isHost) setStatus('Connection error');
        });
    };

    const toggleMute = () => {
        if (myStreamRef.current) {
            myStreamRef.current.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (myStreamRef.current) {
            myStreamRef.current.getVideoTracks().forEach(track => { track.enabled = !track.enabled; });
            setIsVideoOff(!isVideoOff);
        }
    };

    const copyLink = () => {
        if (roomId) {
            const cleanUrl = `${window.location.origin}/room/${roomId}`;
            navigator.clipboard.writeText(cleanUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const leaveRoom = () => navigate('/');

    if (!roomId) return null;

    // Grid calculation
    const totalParticipants = (isHost ? 1 : 0) + remoteStreams.length;
    const gridCols = totalParticipants <= 1 ? 'grid-cols-1' : totalParticipants <= 4 ? 'grid-cols-2' : 'grid-cols-3';

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative">
            {/* Aurora Background (Subtle) */}
            <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/20 rounded-full blur-[120px]" />
            </div>

            {/* Header */}
            <AnimatePresence>
                {showControls && (
                    <motion.header
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-start pointer-events-none"
                    >
                        <div className="pointer-events-auto flex items-center gap-3 glass-panel px-4 py-2">
                            <div className={`w-2 h-2 rounded-full ${status === 'Connected' || status === 'Ready' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                            <span className="text-sm font-medium text-white/80">{status}</span>
                            <div className="w-px h-4 bg-white/10 mx-1" />
                            <span className="text-xs font-mono text-white/40">{roomId.slice(0, 8)}...</span>
                        </div>

                        <div className="pointer-events-auto flex items-center gap-2">
                            <button onClick={copyLink} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                            </button>
                            <div className="bg-black/40 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full flex items-center gap-2">
                                <Users className="w-4 h-4 text-white/60" />
                                <span className="text-sm font-medium">{totalParticipants}</span>
                            </div>
                        </div>
                    </motion.header>
                )}
            </AnimatePresence>

            {/* Video Grid */}
            <main className="h-screen w-full p-4 md:p-8 flex items-center justify-center">
                <div className={`grid ${gridCols} gap-4 w-full max-w-[1600px] h-full max-h-[90vh] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]`}>

                    {/* My Video (Host Only) */}
                    {isHost && (
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative rounded-3xl overflow-hidden bg-[#111] border border-white/5 shadow-2xl group"
                        >
                            {myStream ? (
                                <VideoPlayer stream={myStream} muted={true} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span>You</span>
                                {isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                            </div>
                        </motion.div>
                    )}

                    {/* Remote Videos */}
                    {remoteStreams.map((remote) => (
                        <motion.div
                            layout
                            key={remote.peerId}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative rounded-3xl overflow-hidden bg-[#111] border border-white/5 shadow-2xl"
                        >
                            <VideoPlayer stream={remote.stream} className="w-full h-full object-cover" />
                            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                {isHost ? 'Guest' : 'Host'}
                            </div>
                        </motion.div>
                    ))}

                    {/* Waiting State */}
                    {(!isHost || remoteStreams.length === 0) && remoteStreams.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-full flex items-center justify-center h-full"
                        >
                            <div className="text-center space-y-6 max-w-md">
                                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto relative">
                                    {isHost && <div className="absolute inset-0 rounded-full border border-white/10 animate-ping opacity-50" />}
                                    <Users className="w-10 h-10 text-white/40" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-semibold mb-2">
                                        {isHost ? 'Waiting for others...' : 'Connecting...'}
                                    </h3>
                                    <p className="text-white/40">
                                        {isHost
                                            ? 'Share the link to invite participants.'
                                            : 'Establishing secure connection to the host.'}
                                    </p>
                                </div>
                                {isHost && (
                                    <button onClick={copyLink} className="btn btn-primary w-full justify-center">
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copied' : 'Copy Link'}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
            </main>

            {/* Floating Controls */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
                    >
                        <div className="glass-panel p-2 rounded-2xl shadow-2xl flex items-center gap-2">
                            {isHost && (
                                <>
                                    <button
                                        onClick={toggleMute}
                                        className={`w-12 h-12 btn-icon ${isMuted ? 'bg-red-500/20 text-red-500' : ''}`}
                                    >
                                        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                    </button>
                                    <button
                                        onClick={toggleVideo}
                                        className={`w-12 h-12 btn-icon ${isVideoOff ? 'bg-red-500/20 text-red-500' : ''}`}
                                    >
                                        {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
                                    </button>
                                    <div className="w-px h-6 bg-white/10 mx-1" />
                                </>
                            )}

                            <button className="btn-icon">
                                <Settings className="w-5 h-5" />
                            </button>
                            <button className="btn-icon">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>

                            <button
                                onClick={leaveRoom}
                                className="btn btn-primary h-12 px-6 ml-2"
                            >
                                <PhoneOff className="w-5 h-5" />
                                <span className="hidden sm:inline">End</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Room;
