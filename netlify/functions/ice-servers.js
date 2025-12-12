const axios = require('axios');

exports.handler = async function (event, context) {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

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
        const iceServers = [
            ...freeIceServers,
            ...(response.data.v?.iceServers || [])
        ];

        return {
            statusCode: 200,
            body: JSON.stringify(iceServers),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    } catch (error) {
        console.error('Xirsys API Error:', error.message);
        // Fallback to just free STUN servers if Xirsys fails
        return {
            statusCode: 200, // Return 200 even on error so the app can still try with STUN
            body: JSON.stringify([
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};
