import { useEffect, useRef, useState } from "react";
import type { SessionController } from "../terminal/SessionController";
import type { ChatState } from "../chat/chat-state";
import { AgentClient } from "./agent-client";

const INITIAL_STATE: ChatState = {
  messages: [],
  suggestions: [],
  active: false,
};

export function useAgent(getController: () => SessionController | null) {
  const [state, setState] = useState<ChatState>(INITIAL_STATE);
  const clientRef = useRef<AgentClient | null>(null);
  const getControllerRef = useRef(getController);
  getControllerRef.current = getController;

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${protocol}://${window.location.host}/ws`;
    const client = new AgentClient(url, {
      onState: setState,
      getController: () => getControllerRef.current(),
    });
    clientRef.current = client;
  }, []);

  return {
    state,
    sendPrompt: (text: string) => {
      clientRef.current?.sendPrompt(text);
    },
  };
}
