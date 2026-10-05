export interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  lastUpdatedAt: number; // timestamp in ms
}

const partyStates: Record<string, VideoState> = {};

export function getPartyState(shareId: string): VideoState | null {
  return partyStates[shareId] || null;
}

export function setPartyState(shareId: string, state: VideoState) {
  partyStates[shareId] = state;
}

export function deletePartyState(shareId: string) {
  delete partyStates[shareId];
}
