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
        navigate(`/room/${id}/join`);
    };

    const joinMeeting = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomId.trim()) navigate(`/room/${roomId}/join`);
    };

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#050505]">
            {/* Subtle Gradient Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-primary/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-secondary/10 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[40vw] h-[40vw] bg-primary/5 rounded-full blur-[100px]" />
            </div>

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
                        <span className="font-semibold text-lg tracking-tight text-white">Calmoraa</span>
                    </motion.div>
                    <motion.button
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="btn btn-secondary hover:bg-white/10"
                    >
                        Sign In
                    </motion.button>
                </div>
            </header>

            {/* Main hero area */}
            <main className="flex-1 flex items-center justify-center px-4 relative z-10 py-20 md:py-0">
                <div className="glass-panel bg-white/[0.03] border-white/10 p-8 md:p-16 max-w-4xl w-full text-center space-y-10 shadow-2xl backdrop-blur-2xl">
                    {/* Hero tagline */}
                    <div className="space-y-6">
                        <motion.h1
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                            className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1]"
                        >
                            <span className="block text-white">Connect.</span>
                            <span className="block gradient-text">Effortlessly.</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed"
                        >
                            The most seamless video experience ever created. No downloads, no friction – just you and the people you care about.
                        </motion.p>
                    </div>

                    {/* Call‑to‑action */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col sm:flex-row items-center gap-4 justify-center max-w-lg mx-auto"
                    >
                        <button
                            onClick={createMeeting}
                            className="btn btn-primary flex-1 h-14 text-lg w-full sm:w-auto shadow-lg shadow-primary/25 hover:shadow-primary/40"
                        >
                            <Video className="w-5 h-5" />
                            New Meeting
                        </button>

                        <form onSubmit={joinMeeting} className="w-full sm:w-auto flex-[1.5] relative group">
                            <div
                                className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${inputFocused ? 'bg-gradient-to-r from-primary/20 to-secondary/20 blur-xl opacity-100' : 'opacity-0'}`}
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
                                    className="bg-transparent border-none p-0 text-white placeholder:text-white/40 focus:ring-0 h-full w-full font-medium"
                                />
                                <button
                                    type="submit"
                                    disabled={!roomId}
                                    className="ml-2 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 hover:bg-white hover:text-black transition-all disabled:opacity-0 disabled:pointer-events-none"
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
                        className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto border-t border-white/5"
                    >
                        {[{ icon: Shield, label: 'End‑to‑End Encryption' }, { icon: Zap, label: 'Ultra‑Low Latency' }, { icon: Globe, label: 'Global Edge Network' }].map((item, i) => (
                            <div key={i} className="flex flex-col items-center gap-3 text-center group">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/50 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{item.label}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </main>
        </div>
    );
};

export default Home;
