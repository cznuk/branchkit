import { useCallback, useEffect, useRef, useState } from "react";

export type ConnectionStatus = "connected" | "disconnected" | "connecting" | "failed";

export type WebSocketMessageType =
  | "duplicate_version"
  | "delete_version"
  | "new_version"
  | "rename_version"
  | "rename_label"
  | "promote_version";

interface UseWebSocketConnectionOptions {
  port: number;
  selectedComponent: string;
  onFileChanged?: () => void;
  onComponentsUpdate?: (
    components: Array<{
      targetId: string;
      name: string;
      kind?: "page" | "component";
      path: string;
      versions: string[];
    }>,
  ) => void;
  onVersionAck?: (payload: { version: string; message?: string; newVersion?: string }) => void;
  onPromoted?: (componentName: string) => void;
  onError?: (message: string) => void;
}

export function useWebSocketConnection({
  port,
  selectedComponent,
  onFileChanged,
  onComponentsUpdate,
  onVersionAck,
  onPromoted,
  onError,
}: UseWebSocketConnectionOptions) {
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

  // Keep refs for callbacks to avoid reconnection on callback changes
  const selectedComponentRef = useRef(selectedComponent);
  const onFileChangedRef = useRef(onFileChanged);
  const onComponentsUpdateRef = useRef(onComponentsUpdate);
  const onVersionAckRef = useRef(onVersionAck);
  const onPromotedRef = useRef(onPromoted);
  const onErrorRef = useRef(onError);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectingRef = useRef(false);
  const wsConnectionRef = useRef<WebSocket | null>(null);
  const shouldReconnectRef = useRef(true);
  const hasEverConnectedRef = useRef(false);
  const retryCountRef = useRef(0);
  const connectionStatusRef = useRef<ConnectionStatus>("disconnected");

  // Keep wsConnectionRef in sync with state
  useEffect(() => {
    wsConnectionRef.current = wsConnection;
  }, [wsConnection]);

  // Keep connectionStatusRef in sync with state
  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  useEffect(() => {
    selectedComponentRef.current = selectedComponent;
  }, [selectedComponent]);

  useEffect(() => {
    onFileChangedRef.current = onFileChanged;
    onComponentsUpdateRef.current = onComponentsUpdate;
    onVersionAckRef.current = onVersionAck;
    onPromotedRef.current = onPromoted;
    onErrorRef.current = onError;
  }, [onFileChanged, onComponentsUpdate, onVersionAck, onPromoted, onError]);

  // WebSocket connection function
  const connectWebSocket = useCallback(() => {
    // Don't create a new connection if we're already connected or connecting
    if (wsConnectionRef.current?.readyState === WebSocket.OPEN || isConnectingRef.current) {
      return;
    }

    const wsUrl = `ws://localhost:${port}/ws`;
    isConnectingRef.current = true;

    if (
      (retryCountRef.current === 0 || hasEverConnectedRef.current) &&
      connectionStatusRef.current !== "failed"
    ) {
      setConnectionStatus("connecting");
    }
    retryCountRef.current++;

    const ws = new WebSocket(wsUrl);
    let hasConnected = false;

    ws.onopen = () => {
      hasConnected = true;
      hasEverConnectedRef.current = true;
      retryCountRef.current = 0;
      isConnectingRef.current = false;
      setConnectionStatus("connected");
      setWsConnection(ws);
      wsConnectionRef.current = ws;
      onFileChangedRef.current?.();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onclose = () => {
      isConnectingRef.current = false;
      if (!hasConnected) {
        if (connectionStatusRef.current !== "failed") {
          setConnectionStatus("failed");
        }
      } else {
        setConnectionStatus("disconnected");
      }
      setWsConnection(null);
      wsConnectionRef.current = null;

      if (shouldReconnectRef.current) {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          if (shouldReconnectRef.current) {
            connectWebSocket();
          }
        }, 3000);
      }
    };

    ws.onerror = (_error) => {
      isConnectingRef.current = false;
      if (!hasConnected) {
        if (connectionStatusRef.current !== "failed") {
          setConnectionStatus("failed");
        }
      } else {
        setConnectionStatus("disconnected");
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "components" && data.payload?.components) {
          onComponentsUpdateRef.current?.(data.payload.components);
        } else if (data.type === "file_changed") {
          onFileChangedRef.current?.();
        } else if (data.type === "ack" && data.payload?.version) {
          const message = data.payload.message || "";
          const newVersion = data.payload.newVersion;

          if (message.includes("promoted")) {
            const promotedComponent =
              data.payload.targetId || data.payload.component || selectedComponentRef.current;
            onPromotedRef.current?.(promotedComponent);
            return;
          }

          onVersionAckRef.current?.({
            version: data.payload.version,
            message,
            newVersion,
          });
        } else if (data.type === "error") {
          onErrorRef.current?.(data.payload?.message || "Unknown error");
        }
      } catch {
        // Error parsing WebSocket message
      }
    };
  }, [port]);

  // Initial connection and reconnection polling
  useEffect(() => {
    shouldReconnectRef.current = true;
    retryCountRef.current = 0;

    if (wsConnectionRef.current?.readyState === WebSocket.OPEN) {
      wsConnectionRef.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    connectWebSocket();

    return () => {
      shouldReconnectRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsConnectionRef.current?.readyState === WebSocket.OPEN) {
        wsConnectionRef.current.close();
      }
    };
  }, [port, connectWebSocket]);

  // Send WebSocket message helper
  const sendMessage = useCallback(
    (type: WebSocketMessageType, payload: Record<string, unknown>) => {
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(
          JSON.stringify({
            type,
            payload: {
              ...payload,
              targetId: selectedComponentRef.current,
              component: selectedComponentRef.current,
            },
          }),
        );
        return true;
      }

      onErrorRef.current?.("BranchKit is not connected. Start the watch server with `npx branchkit watch`.");
      return false;
    },
    [wsConnection],
  );

  return {
    connectionStatus,
    sendMessage,
  };
}
