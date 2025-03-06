class WebSocketManager {
    constructor(token, apiUrl = 'ws://localhost:8000') {
        this.token = token;
        this.apiUrl = apiUrl;
        this.socket = null;
        this.connectCallbacks = [];
        this.disconnectCallbacks = [];
        this.messageCallbacks = [];

        this.connect();
    }

    connect() {
        // Construct WebSocket URL with token
        const wsUrl = `${this.apiUrl}/ws/livestream/?token=${this.token}`;

        try {
            this.socket = new WebSocket(wsUrl);

            // Connection opened
            this.socket.onopen = () => {
                console.log('WebSocket connection established');
                this.connectCallbacks.forEach(callback => callback());
            };

            // Listen for messages
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.messageCallbacks.forEach(callback => callback(data));
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            // Connection closed
            this.socket.onclose = (event) => {
                console.log('WebSocket connection closed');
                const errorMessage = event.reason || 'Connection closed unexpectedly';
                this.disconnectCallbacks.forEach(callback => callback(errorMessage));

                // Attempt to reconnect after a delay
                setTimeout(() => this.connect(), 3000);
            };

            // Connection error
            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.disconnectCallbacks.forEach(callback => callback('Connection error'));
            };
        } catch (error) {
            console.error('Failed to establish WebSocket connection:', error);
        }
    }

    // Send a message through the WebSocket
    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket is not open. Cannot send message.');
        }
    }

    // Register callback for connection
    onConnect(callback) {
        this.connectCallbacks.push(callback);
    }

    // Register callback for disconnection
    onDisconnect(callback) {
        this.disconnectCallbacks.push(callback);
    }

    // Register callback for incoming messages
    onMessage(callback) {
        this.messageCallbacks.push(callback);
    }

    // Disconnect and clean up
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}

export default WebSocketManager;