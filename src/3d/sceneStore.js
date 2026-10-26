/**
 * A single mutable scene state, written once per tick by the scroll ticker
 * and read by every 3D component's frame loop.
 *
 * Deliberately not React state and deliberately not a context value: at 60fps
 * this object changes every frame, and pushing that through React would cost
 * far more than the render it drives. The refs below are plain `{current}`
 * boxes so the model components can read a scalar without a subscription.
 */

import { createSceneState, getSceneState } from '../animations/timeline'

export const sceneState = createSceneState()
export const stateRef = { current: sceneState }

/** Read directly by FX30 / GimbalRS3 each frame. */
export const explodeRef = { current: 0 }
export const assembleRef = { current: 0 }
export const gimbalExplodeRef = { current: 0 }

/** Called from the scroll ticker. The one place scene state is written. */
export function updateSceneState(p, opts) {
  getSceneState(p, sceneState, opts)
  explodeRef.current = sceneState.explode
  assembleRef.current = sceneState.gimbal.assemble
  gimbalExplodeRef.current = sceneState.gimbal.explode
  return sceneState
}

/** Park the scene at its opening frame (page load, route change). */
export function resetSceneState(opts) {
  updateSceneState(0, opts)
}
