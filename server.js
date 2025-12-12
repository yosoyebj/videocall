import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());

app.get('/api/ice-servers', async (req, res) => {
    try {
        const response = await axios.put('https://global.xirsys.net/_turn/betrora', {}, {
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${process.env.XIRSYS_IDENT}:${process.env.XIRSYS_SECRET}`).toString('base64'),
                'Content-Type': 'application/json'
            }
        });

        // Default free STUN servers
        const freeIceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
        ];

        // Combine free STUN with Xirsys TURN
        // Xirsys returns a list, we append it.
        // Note: Xirsys might return its own STUN servers too, which is fine.
        const iceServers = [
            ...freeIceServers,
            ...(response.data.v?.iceServers || [])
        ];

        res.json(iceServers);
    } catch (error) {
        console.error('Xirsys API Error:', error.message);
        // Fallback to just free STUN servers if Xirsys fails
        res.json([
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
        ]);
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
