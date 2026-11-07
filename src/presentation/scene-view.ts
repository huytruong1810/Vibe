import type { ActorPresentation, ScenePresentation } from '../domain/presentation-contract';
export function actorInScene(actor: Pick<ActorPresentation, 'sceneId'>, sceneId: string): boolean {
  return (actor.sceneId ?? 'overworld') === sceneId;
}
export function sceneCamera(
  camera: { x: number; y: number },
  scene: Pick<ScenePresentation, 'width' | 'height'>,
  tile: number,
  viewport: { width: number; height: number },
): { x: number; y: number } {
  const width = scene.width * tile,
    height = scene.height * tile;
  return {
    x:
      width < viewport.width
        ? (width - viewport.width) / 2
        : Math.max(0, Math.min(width - viewport.width, camera.x)),
    y:
      height < viewport.height
        ? (height - viewport.height) / 2
        : Math.max(0, Math.min(height - viewport.height, camera.y)),
  };
}
