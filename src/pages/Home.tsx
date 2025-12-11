import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import { Video, ArrowRight, Command, Globe, Shield, Zap } from 'lucide-react';

const Home = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [inputFocused, setInputFocused] = useState(false);

    const createMeeting = () => {
        const id = uuidv4();
        navigate(`/room/${id}`);
    };

    const joinMeeting = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomId.trim()) navigate(`/room/${roomId}`);
    };

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden">
            {/* Background video – subtle loop */}
            <video
                className="absolute inset-0 w-full h-full object-cover -z-10"
                autoPlay
                loop
                muted
                playsInline
                src="https://cdn.pixabay.com/vimeo/398726378/abstract-technology-4k-1920x1080-1440p-26475.mp4?width=1280&hash=5b8c5e5e5c5c5b5c5d5e5f5a5b5c5d5e"
            />

            {/* Header – minimal glass */}
            <header className="fixed top-0 left-0 right-0 z-50 p-6">
                <div className="container flex items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-center gap-2"
                    >
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/5">
                            <Video className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-lg tracking-tight text-white">Antigravity</span>
                    </motion.div>
                    <motion.button
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="btn btn-secondary"
                    >
                        Sign In
                    </motion.button>
                </div>
            </header>

            {/* Main hero area */}
            <main className="flex-1 flex items-center justify-center px-4 relative z-10">
                <div className="glass-panel p-8 md:p-12 max-w-3xl w-full text-center space-y-8">
                    {/* Hero tagline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        className="text-5xl md:text-6xl font-bold tracking-tighter leading-[0.95]"
                    >
                        <span className="block gradient-text">Connect.</span>
                        <span className="block text-white/40">Effortlessly.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="text-lg text-white/60 max-w-xl mx-auto"
                    >
                        The most seamless video experience ever created. No downloads, no friction – just you and the people you care about.
                    </motion.p>

                    {/* Call‑to‑action */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col sm:flex-row items-center gap-4 justify-center"
                    >
                        <button
                            onClick={createMeeting}
                            className="btn btn-primary flex-1 h-14"
                        >
                            <Video className="w-5 h-5" />
                            New Meeting
                        </button>

                        <form onSubmit={joinMeeting} className="w-full sm:w-auto flex-[1.5] relative group">
                            <div
                                className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${inputFocused ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl opacity-100' : 'opacity-0'}`}
                            />
                            <div className="relative h-14 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center px-4 transition-colors group-hover:bg-white/10 focus-within:bg-black/40 focus-within:border-white/20">
                                <Command className="w-5 h-5 text-white/40 mr-3" />
                                <input
                                    type="text"
                                    placeholder="Enter code…"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    onFocus={() => setInputFocused(true)}
                                    onBlur={() => setInputFocused(false)}
                                    className="bg-transparent border-none p-0 text-white placeholder:text-white/30 focus:ring-0 h-full w-full"
                                />
                                <button
                                    type="submit"
                                    disabled={!roomId}
                                    className="ml-2 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-white hover:text-black transition-all disabled:opacity-0 disabled:pointer-events-none"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    </motion.div>

                    {/* Feature grid */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.8 }}
                        className="pt-8 grid grid-cols-3 gap-6 max-w-2xl mx-auto"
                    >
                        {[{ icon: Shield, label: 'End‑to‑End Encryption' }, { icon: Zap, label: 'Ultra‑Low Latency' }, { icon: Globe, label: 'Global Edge Network' }].map((item, i) => (
                            <div key={i} className="flex flex-col items-center gap-2 text-center">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-medium text-white/60">{item.label}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </main>
        </div>
    );
};

export default Home;
