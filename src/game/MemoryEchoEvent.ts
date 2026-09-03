export const MEMORY_ECHO_EVENT = 'beacon:memory-echo';

export interface MemoryEchoEventDetail {
  id: string;
  speaker: string;
  text: string;
  duration: number;
}

export type MemoryEchoCustomEvent = CustomEvent<MemoryEchoEventDetail>;

export function dispatchMemoryEcho(detail: MemoryEchoEventDetail) {
  const event = new CustomEvent<MemoryEchoEventDetail>(MEMORY_ECHO_EVENT, {
    detail,
    cancelable: true,
  });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}
