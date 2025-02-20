import assert from 'assert'
import { Group, Layers, Mesh, Quaternion, Scene, Vector3 } from 'three'

import { createMockNetwork } from '../../../tests/util/createMockNetwork'
import { Engine } from '../../ecs/classes/Engine'
import { addComponent, createMappedComponent, defineQuery, getComponent } from '../../ecs/functions/ComponentFunctions'
import { createEntity } from '../../ecs/functions/EntityFunctions'
import { createEngine } from '../../initializeEngine'
import { TransformComponent } from '../../transform/components/TransformComponent'
import { addObjectToGroup } from '../components/GroupComponent'
import { ModelComponent, SCENE_COMPONENT_MODEL_DEFAULT_VALUE } from '../components/ModelComponent'
import { NameComponent } from '../components/NameComponent'
import { Object3DComponent } from '../components/Object3DComponent'
import { ObjectLayers } from '../constants/ObjectLayers'
import { parseGLTFModel } from './loadGLTFModel'

describe('loadGLTFModel', () => {
  beforeEach(() => {
    createEngine()
    createMockNetwork()
  })

  // TODO: - this needs to be broken down and more comprehensive
  it('loadGLTFModel', async () => {
    const world = Engine.instance.currentWorld

    const mockComponentData = { src: 'https://mock.site/asset.glb' } as any
    const CustomComponent = createMappedComponent<{ value: number }>('CustomComponent')

    const entity = createEntity()
    addComponent(entity, ModelComponent, {
      ...SCENE_COMPONENT_MODEL_DEFAULT_VALUE,
      ...mockComponentData
    })
    const entityName = 'entity name'
    const number = Math.random()
    const mesh = new Mesh()
    mesh.userData = {
      'xrengine.entity': entityName,
      // 'xrengine.spawn-point': '',
      'xrengine.CustomComponent.value': number
    }
    addObjectToGroup(entity, mesh)
    const modelQuery = defineQuery([TransformComponent, Object3DComponent])
    const childQuery = defineQuery([
      NameComponent,
      TransformComponent,
      Object3DComponent,
      CustomComponent /*, SpawnPointComponent*/
    ])

    parseGLTFModel(entity)

    const expectedLayer = new Layers()
    expectedLayer.set(ObjectLayers.Scene)

    const [mockModelEntity] = modelQuery(world)
    const [mockSpawnPointEntity] = childQuery(world)

    assert.equal(typeof mockModelEntity, 'number')
    assert(getComponent(mockModelEntity, Object3DComponent).value.layers.test(expectedLayer))

    // assert(hasComponent(mockSpawnPointEntity, SpawnPointComponent))
    assert.equal(getComponent(mockSpawnPointEntity, CustomComponent).value, number)
    assert.equal(getComponent(mockSpawnPointEntity, NameComponent).name, entityName)
    assert(getComponent(mockSpawnPointEntity, Object3DComponent).value.layers.test(expectedLayer))
  })

  // TODO
  it.skip('Can load physics objects from gltf metadata', async () => {
    const entity = createEntity()
    const entityName = 'physics test entity'
    const parentGroup = new Group()
    parentGroup.userData = {
      'xrengine.entity': entityName,
      'xrengine.collider.bodyType': 0
    }

    const mesh = new Mesh()
    mesh.userData = {
      type: 'box'
    }
    parentGroup.add(mesh)

    // createShape()
    // createCollider()
  })
})
