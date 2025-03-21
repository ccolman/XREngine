import {
  Color,
  DataTexture,
  EquirectangularRefractionMapping,
  Mesh,
  MeshMatcapMaterial,
  MeshStandardMaterial,
  Object3D,
  RGBAFormat,
  Scene,
  sRGBEncoding,
  Texture,
  Vector3
} from 'three'

import { AssetLoader } from '../../../assets/classes/AssetLoader'
import { ComponentDeserializeFunction, ComponentSerializeFunction } from '../../../common/constants/PrefabFunctionType'
import { isClient } from '../../../common/functions/isClient'
import { Engine } from '../../../ecs/classes/Engine'
import { Entity } from '../../../ecs/classes/Entity'
import { getComponent, hasComponent, setComponent } from '../../../ecs/functions/ComponentFunctions'
import {
  EnvmapComponent,
  EnvmapComponentType,
  SCENE_COMPONENT_ENVMAP_DEFAULT_VALUES
} from '../../components/EnvmapComponent'
import { ModelComponent } from '../../components/ModelComponent'
import { Object3DComponent } from '../../components/Object3DComponent'
import { EnvMapSourceType, EnvMapTextureType } from '../../constants/EnvMapEnum'
import { getPmremGenerator, loadCubeMapTexture } from '../../constants/Util'
import { SceneOptions } from '../../systems/SceneObjectSystem'
import { EnvMapBakeTypes } from '../../types/EnvMapBakeTypes'
import { addError, removeError } from '../ErrorFunctions'
import { parseEnvMapBakeProperties } from './EnvMapBakeFunctions'

const tempVector = new Vector3()
const tempColor = new Color()

export const deserializeEnvMap: ComponentDeserializeFunction = (entity: Entity, data: EnvmapComponentType) => {
  if (!isClient) return

  const props = parseEnvMapProperties(data)
  setComponent(entity, EnvmapComponent, props)
}

export const updateEnvMap = (entity: Entity) => {
  const component = getComponent(entity, EnvmapComponent)
  const hasObj3d = getComponent(entity, ModelComponent).scene
  const obj3d = hasObj3d ? getComponent(entity, ModelComponent).scene! : Engine.instance.currentWorld.scene

  switch (component.type) {
    case EnvMapSourceType.Skybox:
      applyEnvMap(obj3d, Engine.instance.currentWorld.scene.background as Texture | null)
      break

    case EnvMapSourceType.Color:
      const col = component.envMapSourceColor ?? tempColor
      const resolution = 64 // Min value required
      const size = resolution * resolution
      const data = new Uint8Array(4 * size)

      for (let i = 0; i < size; i++) {
        const stride = i * 4
        data[stride] = Math.floor(col.r * 255)
        data[stride + 1] = Math.floor(col.g * 255)
        data[stride + 2] = Math.floor(col.b * 255)
        data[stride + 3] = 255
      }

      const texture = new DataTexture(data, resolution, resolution, RGBAFormat)
      texture.needsUpdate = true
      texture.encoding = sRGBEncoding

      applyEnvMap(obj3d, getPmremGenerator().fromEquirectangular(texture).texture)
      break

    case EnvMapSourceType.Texture:
      switch (component.envMapTextureType) {
        case EnvMapTextureType.Cubemap:
          loadCubeMapTexture(
            component.envMapSourceURL,
            (texture) => {
              const EnvMap = getPmremGenerator().fromCubemap(texture).texture
              EnvMap.encoding = sRGBEncoding
              applyEnvMap(obj3d, EnvMap)
              removeError(entity, 'envmapError')
            },
            undefined,
            (_) => addError(entity, 'envmapError', 'Skybox texture could not be found!')
          )
          break

        case EnvMapTextureType.Equirectangular:
          AssetLoader.load(
            component.envMapSourceURL,
            {},
            (texture) => {
              const EnvMap = getPmremGenerator().fromEquirectangular(texture).texture
              EnvMap.encoding = sRGBEncoding
              applyEnvMap(obj3d, EnvMap)
              removeError(entity, 'envmapError')
              texture.dispose()
            },
            (_res) => {
              /* console.log(_res) */
            },
            (_) => {
              addError(entity, 'envmapError', 'Skybox texture could not be found!')
            }
          )
          break
      }
      break

    case EnvMapSourceType.Default:
      const options = component.envMapBake

      if (!hasObj3d) {
        SceneOptions.instance.bpcemOptions.bakeScale = options.bakeScale!
        SceneOptions.instance.bpcemOptions.bakePositionOffset = options.bakePositionOffset!
      }

      switch (options.bakeType) {
        case EnvMapBakeTypes.Baked:
          AssetLoader.load(options.envMapOrigin, {}, (texture) => {
            texture.mapping = EquirectangularRefractionMapping
            applyEnvMap(obj3d, texture)
          })

          break
        case EnvMapBakeTypes.Realtime:
          // const map = new CubemapCapturer(EngineRenderer.instance.renderer, Engine.scene, options.resolution)
          // const EnvMap = (await map.update(options.bakePosition)).cubeRenderTarget.texture
          // applyEnvMap(obj3d, EnvMap)
          break
      }

      if (!hasObj3d) {
        const offset = options.bakePositionOffset!
        tempVector.set(offset.x, offset.y, offset.z)

        SceneOptions.instance.boxProjection = options.boxProjection!
        SceneOptions.instance.bpcemOptions.bakePositionOffset = tempVector
        SceneOptions.instance.bpcemOptions.bakeScale = options.bakeScale!
      }
      break

    default:
      applyEnvMap(obj3d, null)
      break
  }

  if (!hasObj3d) {
    SceneOptions.instance.envMapIntensity = component.envMapIntensity
  }
  if (SceneOptions.instance.envMapIntensity !== component.envMapIntensity) {
    obj3d.traverse((obj: Mesh) => {
      if (!obj.material) return

      if (Array.isArray(obj.material)) {
        obj.material.forEach((m: MeshStandardMaterial) => (m.envMapIntensity = component.envMapIntensity))
      } else {
        ;(obj.material as MeshStandardMaterial).envMapIntensity = component.envMapIntensity
      }
    })
  }
}

export const serializeEnvMap: ComponentSerializeFunction = (entity) => {
  const component = getComponent(entity, EnvmapComponent)
  return {
    type: component.type,
    envMapTextureType: component.envMapTextureType,
    envMapSourceColor: component.envMapSourceColor.getHex(),
    envMapSourceURL: component.envMapSourceURL,
    envMapIntensity: component.envMapIntensity,
    envMapBake: component.envMapBake
  }
}

const parseEnvMapProperties = (props): EnvmapComponentType => {
  return {
    type: props.type ?? SCENE_COMPONENT_ENVMAP_DEFAULT_VALUES.type,
    envMapTextureType: props.envMapTextureType ?? SCENE_COMPONENT_ENVMAP_DEFAULT_VALUES.envMapTextureType,
    envMapSourceColor: new Color(props.envMapSourceColor ?? SCENE_COMPONENT_ENVMAP_DEFAULT_VALUES.envMapSourceColor),
    envMapSourceURL: props.envMapSourceURL ?? SCENE_COMPONENT_ENVMAP_DEFAULT_VALUES.envMapSourceURL,
    envMapIntensity: props.envMapIntensity ?? SCENE_COMPONENT_ENVMAP_DEFAULT_VALUES.envMapIntensity,
    envMapBake: parseEnvMapBakeProperties({
      options: props.envMapBake ?? SCENE_COMPONENT_ENVMAP_DEFAULT_VALUES.envMapBake
    })
  }
}

function applyEnvMap(obj3d: Object3D, envmap: Texture | null) {
  if (!obj3d) return

  if (obj3d instanceof Scene) {
    obj3d.environment = envmap
  } else {
    obj3d.traverse((child: Mesh<any, MeshStandardMaterial>) => {
      if (child.material instanceof MeshMatcapMaterial) return
      if (child.material) child.material.envMap = envmap
    })

    if ((obj3d as Mesh<any, MeshStandardMaterial>).material) {
      if ((obj3d as Mesh).material instanceof MeshMatcapMaterial) return
      ;(obj3d as Mesh<any, MeshStandardMaterial>).material.envMap = envmap
    }
  }
}
