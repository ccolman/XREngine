import { World } from '@xrengine/engine/src/ecs/classes/World'
import { defineQuery, getComponent } from '@xrengine/engine/src/ecs/functions/ComponentFunctions'

import { EditorInputComponent } from '../classes/InputComponent'

export default async function InputSystem(world: World) {
  const inputQuery = defineQuery([EditorInputComponent])

  return () => {
    for (const entity of inputQuery()) {
      const inputComponent = getComponent(entity, EditorInputComponent)
      const computed = inputComponent.activeMapping?.computed

      if (!computed) return

      for (let i = 0; i < computed.length; i++) {
        inputComponent.actionState[computed[i].action] = computed[i].transform()
      }
    }
  }
}
