import type { WebContainer3D } from '@etherealjs/web-layer/three'
import { State } from '@hookstate/core'
import React from 'react'

import { isNode } from '../../common/functions/getEnvironment'
import { Entity } from '../../ecs/classes/Entity'
import { addComponent } from '../../ecs/functions/ComponentFunctions'
import { createEntity } from '../../ecs/functions/EntityFunctions'
import { addObjectToGroup } from '../../scene/components/GroupComponent'
import { Object3DComponent } from '../../scene/components/Object3DComponent'
import { VisibleComponent } from '../../scene/components/VisibleComponent'
import { ObjectLayers } from '../../scene/constants/ObjectLayers'
import { setObjectLayers } from '../../scene/functions/setObjectLayers'
import { setTransformComponent } from '../../transform/components/TransformComponent'
import { XRUIComponent } from '../components/XRUIComponent'
import { XRUIStateContext } from '../XRUIStateContext'

let Ethereal: typeof import('@etherealjs/web-layer/three')
let ReactDOM: typeof import('react-dom')

export async function loadXRUIDeps() {
  ;[Ethereal, ReactDOM] = await Promise.all([import('@etherealjs/web-layer/three'), import('react-dom')])
}

export function createXRUI<S extends State<any> | null>(UIFunc: React.FC, state = null as S): XRUI<S> {
  if (isNode) throw new Error('XRUI is not supported in nodejs')

  const entity = createEntity()

  const containerElement = document.createElement('div')
  containerElement.style.position = 'fixed'
  containerElement.id = 'xrui-' + UIFunc.name

  ReactDOM.render(
    //@ts-ignore
    <XRUIStateContext.Provider value={state}>
      <UIFunc />
    </XRUIStateContext.Provider>,
    containerElement
  )

  const container = new Ethereal.WebContainer3D(containerElement, { manager: Ethereal.WebLayerManager.instance })

  container.raycaster.layers.enableAll()

  addObjectToGroup(entity, container)
  setTransformComponent(entity)
  setObjectLayers(container, ObjectLayers.UI)
  addComponent(entity, XRUIComponent, { container, state })
  addComponent(entity, VisibleComponent, true)

  return { entity, state, container }
}

export interface XRUI<S> {
  entity: Entity
  state: S
  container: WebContainer3D
}
