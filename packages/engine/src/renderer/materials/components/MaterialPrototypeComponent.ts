import {
  Material,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshMatcapMaterial,
  MeshPhongMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  RawShaderMaterial,
  Shader,
  ShaderMaterial,
  WebGLRenderer
} from 'three'

import { createMappedComponent } from '../../../ecs/functions/ComponentFunctions'

export type MaterialPrototypeComponentType = {
  baseMaterial:
    | typeof MeshBasicMaterial
    | typeof MeshStandardMaterial
    | typeof MeshMatcapMaterial
    | typeof MeshPhysicalMaterial
    | typeof MeshPhongMaterial
    | typeof MeshLambertMaterial
    | typeof MeshToonMaterial
    | typeof ShaderMaterial
    | typeof RawShaderMaterial
  arguments: {
    [_: string]: {
      type: string
      default: any
      min?: number
      max?: number
      options?: any[]
    }
  }
  onBeforeCompile?: (shader: Shader, renderer: WebGLRenderer) => void
}

export const MaterialPrototypeComponent =
  createMappedComponent<MaterialPrototypeComponentType>('MaterialPrototypeComponent')

export const RENDER_COMPONENT_MATERIAL_PROTOTYPE = 'material-prototype'
export const RENDER_COMPONENT_MATERIAL_PROTOTYPE_DEFAULT_VALUES = {
  uuid: '',
  name: '',
  vertexShader: '',
  fragmentShader: '',
  arguments: {}
}
