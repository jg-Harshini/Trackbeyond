import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class WebSocketService {
    constructor() {
        this.client = null;
        this.connected = false;
        this.pendingSubscriptions = []; // queued while not yet connected
    }

    connect(onConnected) {
        // Avoid creating duplicate connections
        if (this.client && this.connected) {
            if (onConnected) onConnected();
            return;
        }

        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
        const socket = new SockJS(`${backendUrl}/ws`);

        this.client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        this.client.onConnect = () => {
            console.log('WebSocket Connected');
            this.connected = true;

            // Flush all subscriptions that were queued before connection was ready
            const pending = [...this.pendingSubscriptions];
            this.pendingSubscriptions = [];
            pending.forEach(({ topic, callback, resolve }) => {
                const sub = this.client.subscribe(topic, (message) => {
                    callback(JSON.parse(message.body));
                });
                if (resolve) resolve(sub);
            });

            if (onConnected) onConnected();
        };

        this.client.onStompError = (frame) => {
            console.error('STOMP error: ' + frame.headers['message']);
        };

        this.client.onDisconnect = () => {
            console.log('WebSocket Disconnected');
            this.connected = false;
        };

        this.client.activate();
    }

    disconnect() {
        if (this.client) {
            this.client.deactivate();
            this.connected = false;
            this.pendingSubscriptions = [];
        }
    }

    /**
     * Subscribe to a topic. If the WebSocket isn't connected yet,
     * the subscription is queued and will be executed automatically
     * once the connection is established.
     */
    _subscribe(topic, callback) {
        if (this.client && this.connected) {
            // Already connected — subscribe immediately
            return this.client.subscribe(topic, (message) => {
                callback(JSON.parse(message.body));
            });
        }

        // Not yet connected — enqueue and return a handle that can cancel the pending sub
        let sub = null;
        const pending = { topic, callback, resolve: (s) => { sub = s; } };
        this.pendingSubscriptions.push(pending);

        return {
            unsubscribe: () => {
                if (sub) {
                    sub.unsubscribe();
                } else {
                    // Remove from queue before connection fires
                    this.pendingSubscriptions = this.pendingSubscriptions.filter(p => p !== pending);
                }
            }
        };
    }

    subscribeToLocation(patientId, callback) {
        return this._subscribe(`/topic/location/${patientId}`, callback);
    }

    subscribeToAlerts(patientId, callback) {
        return this._subscribe(`/topic/alerts/${patientId}`, callback);
    }

    subscribeToMedications(patientId, callback) {
        return this._subscribe(`/topic/medications/${patientId}`, callback);
    }
}

export default new WebSocketService();
