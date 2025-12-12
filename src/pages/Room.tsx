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
    const [connectionMode, setConnectionMode] = useState<string>(''); // STUN, TURN, or P2P

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
            let iceServers = [];

            // Fetch ICE servers from our backend (which handles Xirsys auth)
            try {
                const response = await fetch('/api/ice-servers');
                iceServers = await response.json();
            } catch (err) {
                console.error('Failed to fetch ICE servers:', err);
                // Fallback to free STUN if API fails
                iceServers = [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ];
            }

            const peer = new Peer(roomId, {
                config: {
                    iceServers: iceServers
                },
                debug: 2 // Log errors and warnings
            });

            // Instrumentation helper
            const logEvent = (event: string, data?: any) => {
                console.log(`[Calmoraa Analytics] ${event}`, data || '');
                // TODO: Send to your observability stack (e.g., PostHog, Sentry)
            };

            peer.on('disconnected', () => {
                logEvent('Peer disconnected');
                setStatus('Disconnected. Reconnecting...');
                peer.reconnect();
            });

            peer.on('close', () => {
                logEvent('Peer closed');
                setStatus('Connection closed');
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
                logEvent('Peer error', err);
                if (err.type === 'unavailable-id') {
                    console.log('[Guest] Room ID taken, joining as Guest');
                    const guestPeer = new Peer({
                        config: {
                            iceServers: iceServers
                        },
                        debug: 2
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
                                    // Fix: Request video for guest as well
                                    const guestStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                                    setMyStream(guestStream); // Allow guest to see themselves
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
        // Start monitoring connection stats
        const checkStats = () => {
            if (!call.peerConnection) return;
            call.peerConnection.getStats().then(stats => {
                stats.forEach(report => {
                    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                        const localCandidate = stats.get(report.localCandidateId);
                        // const remoteCandidate = stats.get(report.remoteCandidateId);

                        if (localCandidate) {
                            if (localCandidate.candidateType === 'host') setConnectionMode('P2P (Local)');
                            else if (localCandidate.candidateType === 'srflx') setConnectionMode('STUN (Direct)');
                            else if (localCandidate.candidateType === 'relay') setConnectionMode('TURN (Relay)');
                            else setConnectionMode(localCandidate.candidateType.toUpperCase());
                        }
                    }
                });
            });
        };

        const statsInterval = setInterval(checkStats, 2000);

        call.on('stream', (remoteStream) => {
            console.log(`[Peer] Received stream from ${call.peer}`, remoteStream.getTracks());
            if (remoteStream.getTracks().length === 0) {
                console.warn('[Peer] Received stream with no tracks');
                return;
            }
            if (!isHost) receivedStreamRef.current = true;
            setRemoteStreams(prev => {
                if (prev.find(p => p.peerId === call.peer)) {
                    console.log('[Peer] Stream already exists for', call.peer);
                    return prev;
                }
                console.log('[Peer] Adding new remote stream for', call.peer);
                const updated = [...prev, { peerId: call.peer, stream: remoteStream }];
                if (!isHost) setStatus('Connected');
                return updated;
            });
        });
        call.on('close', () => {
            clearInterval(statsInterval);
            setConnectionMode('');
            setRemoteStreams(prev => prev.filter(p => p.peerId !== call.peer));
            if (!isHost) setStatus('Stream ended');
        });
        call.on('error', () => {
            clearInterval(statsInterval);
            if (!isHost) setStatus('Connection error');
        });
    };

    const toggleMute = () => {
        const stream = myStreamRef.current || guestStreamRef.current;
        if (stream) {
            stream.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        const stream = myStreamRef.current || guestStreamRef.current;
        if (stream) {
            stream.getVideoTracks().forEach(track => { track.enabled = !track.enabled; });
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
    const gridCols = totalParticipants <= 1
        ? 'grid-cols-1'
        : totalParticipants === 2
            ? 'grid-cols-1 md:grid-cols-2'
            : totalParticipants <= 4
                ? 'grid-cols-2'
                : 'grid-cols-2 md:grid-cols-3';

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative">
            {/* Aurora Background (Subtle) */}
            <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-secondary/20 rounded-full blur-[120px]" />
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
                            {connectionMode && (
                                <>
                                    <div className="w-px h-4 bg-white/10 mx-1" />
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${connectionMode.includes('TURN') ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                            connectionMode.includes('STUN') ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                'bg-green-500/20 text-green-400 border border-green-500/30'
                                        }`}>
                                        {connectionMode}
                                    </div>
                                </>
                            )}
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
                    {/* My Video (Visible to both Host and Guest) */}
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
                        className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] md:w-auto max-w-md md:max-w-none"
                    >
                        <div className="glass-panel p-2 rounded-2xl shadow-2xl flex items-center justify-between md:justify-center gap-2 md:gap-4 overflow-x-auto no-scrollbar">
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

                            <button className="btn-icon">
                                <Settings className="w-5 h-5" />
                            </button>
                            <button className="btn-icon">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>

                            <button
                                onClick={leaveRoom}
                                className="btn h-12 px-6 ml-2 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
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
