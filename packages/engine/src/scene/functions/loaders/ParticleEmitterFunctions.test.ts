import assert from 'assert'
import { afterEach, beforeEach, describe } from 'mocha'
import { createSandbox, SinonSandbox } from 'sinon'

import { Engine } from '../../../ecs/classes/Engine'
import { Entity } from '../../../ecs/classes/Entity'
import { EntityTreeNode } from '../../../ecs/classes/EntityTree'
import { World } from '../../../ecs/classes/World'
import { getComponent, hasComponent } from '../../../ecs/functions/ComponentFunctions'
import { createEntity } from '../../../ecs/functions/EntityFunctions'
import { addEntityNodeInTree, createEntityNode } from '../../../ecs/functions/EntityTreeFunctions'
import { initSystems } from '../../../ecs/functions/SystemFunctions'
import { SystemUpdateType } from '../../../ecs/functions/SystemUpdateType'
import { createEngine, initializeCoreSystems, setupEngineActionSystems } from '../../../initializeEngine'
import { ParticleEmitterComponent } from '../../components/ParticleEmitterComponent'
import { deserializeParticleEmitter } from './ParticleEmitterFunctions'

describe('ParticleEmitterFunctions', async () => {
  let entity: Entity
  let node: EntityTreeNode
  let world: World
  let sandbox: SinonSandbox

  let nextFixedStep: Promise<void>
  const initEntity = () => {
    entity = createEntity()
    node = createEntityNode(entity)
    world = Engine.instance.currentWorld
    addEntityNodeInTree(node)
  }
  beforeEach(async () => {
    sandbox = createSandbox()
    createEngine()
    setupEngineActionSystems()
    initEntity()
    Engine.instance.engineTimer.start()
    Engine.instance.publicPath = ''
    await initializeCoreSystems()

    await initSystems(world, [
      {
        uuid: 'Particle',
        type: SystemUpdateType.FIXED_LATE,
        systemLoader: () =>
          Promise.resolve({
            default: async () => {
              let resolve: () => void
              nextFixedStep = new Promise<void>((r) => (resolve = r))
              return () => {
                resolve()
                nextFixedStep = new Promise<void>((r) => (resolve = r))
              }
            }
          })
      }
    ])
  })
  afterEach(async () => {
    sandbox.restore()
  })
})
