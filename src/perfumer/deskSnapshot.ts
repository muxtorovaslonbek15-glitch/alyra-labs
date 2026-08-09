import type { DeskVessel } from "@/types";
import { useDeskStore } from "@/store/deskStore";

/** One-level undo snapshot for Build (P0). */
export interface DeskSnapshot {
  vessels: DeskVessel[];
  activeVesselId: string | null;
  lastExplanationVesselId: string | null;
  pourAmountMl: number;
  capturedAt: string;
}

export function captureDeskSnapshot(): DeskSnapshot {
  const s = useDeskStore.getState();
  return {
    vessels: structuredClone(s.vessels),
    activeVesselId: s.activeVesselId,
    lastExplanationVesselId: s.lastExplanationVesselId,
    pourAmountMl: s.pourAmountMl,
    capturedAt: new Date().toISOString(),
  };
}

export function restoreDeskSnapshot(snap: DeskSnapshot): void {
  useDeskStore.setState({
    vessels: structuredClone(snap.vessels),
    activeVesselId: snap.activeVesselId,
    lastExplanationVesselId: snap.lastExplanationVesselId,
    pourAmountMl: snap.pourAmountMl,
  });
}
