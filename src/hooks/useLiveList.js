import { useEffect, useRef } from "react";
import { liveChannelUrl } from "../lib/wsUrl";
import { tokenStore } from "../lib/tokenStore";

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const PING_INTERVAL_MS = 25000;
const DEBOUNCE_MS = 500;

/**
 * Subscribes to a backend "live update" channel (see the Live Menu Updates
 * via WebSocket handoff doc) and calls `onChanged` whenever the server
 * reports a create/edit/delete/etc. for that resource, so the caller can
 * refetch instead of the page only refreshing on its own mutations.
 *
 * `path` is the same resource path already used for REST calls (e.g.
 * "master/menu", no leading slash) — pass `null`/`undefined` to skip
 * connecting (e.g. while the entity key isn't known yet).
 *
 * This is a pure "refetch on signal" subscription: `changed` may carry only
 * ids and status (a change made elsewhere), so `onChanged` re-fetches. Any
 * action name may come, so none is filtered; one change can arrive twice,
 * so pushes within half a second make one call.
 *
 * `auth_error` (an ended session, or no permission for this screen) stops
 * without reconnecting on the same token. `session_ended` (logged out on
 * any device, expired, or the permission removed) signs out here.
 */
export function useLiveList(path, onChanged) {
  const onChangedRef = useRef(onChanged);
  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  useEffect(() => {
    if (!path) return undefined;

    let socket;
    let reconnectTimer;
    let pingTimer;
    let backoff = INITIAL_BACKOFF_MS;
    let stopped = false;
    let hasConnectedBefore = false;
    let debounceTimer;

    const notify = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => onChangedRef.current?.(), DEBOUNCE_MS);
    };

    const clearTimers = () => {
      clearTimeout(reconnectTimer);
      clearInterval(pingTimer);
      clearTimeout(debounceTimer);
    };

    const scheduleReconnect = () => {
      if (stopped) return;
      clearTimers();
      reconnectTimer = setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    };

    function connect() {
      if (stopped) return;

      const token = tokenStore.getAccessToken();
      if (!token) {
        // Not logged in (yet) — try again shortly rather than giving up,
        // since this can run during the brief window right after login.
        scheduleReconnect();
        return;
      }

      socket = new WebSocket(liveChannelUrl(path));

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: "auth", token: `Bearer ${token}`, page: 1, limit: 10, search: "" }));
      };

      socket.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }

        if (message.type === "auth_ok") {
          backoff = INITIAL_BACKOFF_MS;
          // Reconnecting after a drop can miss events — do one unconditional
          // refetch to cover anything missed while disconnected.
          if (hasConnectedBefore) notify();
          hasConnectedBefore = true;
          clearInterval(pingTimer);
          pingTimer = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "ping" }));
          }, PING_INTERVAL_MS);
        } else if (message.type === "changed") {
          notify();
        } else if (message.type === "auth_error") {
          stopped = true;
          clearTimers();
          socket.close();
        } else if (message.type === "session_ended") {
          stopped = true;
          clearTimers();
          socket.close();
          tokenStore.clear();
          window.location.href = "/login";
        }
      };

      socket.onclose = () => {
        clearInterval(pingTimer);
        scheduleReconnect();
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      stopped = true;
      clearTimers();
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      }
    };
  }, [path]);
}
