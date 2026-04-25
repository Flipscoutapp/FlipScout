import { useState, useEffect, useCallback } from 'react';
import type { SuccessStory, ChatMessage } from '../types';

export function useFeedback() {
  const [successes, setSuccesses] = useState<SuccessStory[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  effect(() => {
    // Mock feed data
    setSuccesses([
      { id: '1', user: 'FlipperZ', item: 'Sony WW-1000XM5', profit: 82, time: '2m ago' },
      { id: '2', user: 'ArbitrageKing', item: 'Keirig K-Slim', profit: 35, time: '5m ago' },
    ]);
    setMessages([
      { id: '1', user: 'System', text: 'Welcome to FlipScout Chat!', time: '10m ago', isMe: false },
    ]);
  }, []);

  const sendMessage = useCallback((text: string) => {
    const m: ChatMessage = {
      id: Math.random().toString(36),
      user: 'You',
      text,
      time: 'just now',
      isMe: true
    };
    setMessages(prev => [...prev, m]);
  }, []);

  return { successes, messages, sendMessage };
}

function effect(fn, deps) {
  useEffect(fn, deps);
}
