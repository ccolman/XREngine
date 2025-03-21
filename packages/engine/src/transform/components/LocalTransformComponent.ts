import { Matrix4, Quaternion, Vector3 } from 'three'

import { createQuaternionProxy, createVector3Proxy } from '../../common/proxies/three'
import { Engine } from '../../ecs/classes/Engine'
import { Entity } from '../../ecs/classes/Entity'
import { createMappedComponent, setComponent } from '../../ecs/functions/ComponentFunctions'
import { TransformComponentType, TransformSchema } from './TransformComponent'

type LocalTransformComponentType = TransformComponentType & { parentEntity: Entity }

export const LocalTransformComponent = createMappedComponent<LocalTransformComponentType, typeof TransformSchema>(
  'LocalTransformComponent',
  TransformSchema
)

export function setLocalTransformComponent(
  entity: Entity,
  parentEntity: Entity,
  position = new Vector3(),
  rotation = new Quaternion(),
  scale = new Vector3(1, 1, 1)
) {
  const dirtyTransforms = Engine.instance.currentWorld.dirtyTransforms
  return setComponent(entity, LocalTransformComponent, {
    parentEntity,
    // clone incoming transform properties, because we don't want to accidentally bind obj properties to local transform
    position: createVector3Proxy(LocalTransformComponent.position, entity, dirtyTransforms, position.clone()),
    rotation: createQuaternionProxy(LocalTransformComponent.rotation, entity, dirtyTransforms, rotation.clone()),
    scale: createVector3Proxy(LocalTransformComponent.scale, entity, dirtyTransforms, scale.clone()),
    matrix: new Matrix4()
  })
}
