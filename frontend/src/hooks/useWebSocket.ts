import { useEffect, useRef, useState } from 'react';

interface UseWebSocketOptions<TMessage> {
  enabled?: boolean;
  reconnectDelay?: number;
  onMessage?: (message: TMessage) => void;
}

export function useWebSocket<TMessage = unknown>(
  url: string,
  options: UseWebSocketOptions<TMessage> = {},
) {
  const { enabled = true, reconnectDelay = 3000, onMessage } = options;
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled || !url) return undefined;

    let disposed = false;

    const connect = () => {
      if (disposed) return;

      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => setIsConnected(true);
      socket.onmessage = (event) => {
        try {
          onMessageRef.current?.(JSON.parse(event.data) as TMessage);
        } catch (error) {
          console.error('Message WebSocket invalide :', error);
        }
      };
      socket.onclose = () => {
        setIsConnected(false);
        if (!disposed) {
          reconnectTimerRef.current = setTimeout(connect, reconnectDelay);
        }
      };
      socket.onerror = () => socket.close();
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, reconnectDelay, url]);

  const send = (message: unknown) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  return { isConnected, send };
}

export default useWebSocket;
