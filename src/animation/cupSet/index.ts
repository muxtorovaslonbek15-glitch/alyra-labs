/**
 * Cup-set shared API for desk / Build / parallel animation agents.
 * Visual stage: `./CupSetStage` (client). Do not import that from server modules.
 */
export type { CupSetPhase, CupSetFrame, CupSetInput } from "./timeline";
export {
  CUP_SET_TIMELINE,
  CUP_SET_WINDOW_MS,
  cupSetFrame,
} from "./timeline";
export { cupSetMaterial, type CupSetMaterial } from "./material";
export { viscousPourParams, type ViscousPourParams } from "./viscousPour";
export {
  CUP_WELL,
  CUP_MOUTH,
  CUP_OUTLINE,
  cupFillPath,
  cupMeniscusStroke,
} from "./cupGeometry";
