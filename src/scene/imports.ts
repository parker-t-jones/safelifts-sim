/**
 * Session-only geometry for imported meshes.
 * The obstacle record stays JSON-serializable. Reloading the page
 * drops the triangles and leaves the 1 m placeholder cube.
 */
import { BufferGeometry, Mesh, type Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { MeshBVH } from 'three-mesh-bvh'

export interface ImportedMesh {
  geometry: BufferGeometry
  bvh: MeshBVH
}

const meshes = new Map<string, ImportedMesh>()

export function hasImportedMesh(id: string): boolean {
  return meshes.has(id)
}

export function getImportedMesh(id: string): ImportedMesh | null {
  return meshes.get(id) ?? null
}

export function setImportedMesh(id: string, geometry: BufferGeometry): void {
  const previous = meshes.get(id)
  previous?.geometry.dispose()
  meshes.set(id, { geometry, bvh: new MeshBVH(geometry, { indirect: true }) })
}

export function duplicateImportedMesh(fromId: string, toId: string): void {
  const existing = meshes.get(fromId)
  if (!existing) {
    return
  }
  const geometry = existing.geometry.clone()
  meshes.set(toId, { geometry, bvh: new MeshBVH(geometry, { indirect: true }) })
}

export function deleteImportedMesh(id: string): void {
  const existing = meshes.get(id)
  if (!existing) {
    return
  }
  existing.geometry.dispose()
  meshes.delete(id)
}

export function clearImportedMeshes(): void {
  for (const id of [...meshes.keys()]) {
    deleteImportedMesh(id)
  }
}

export async function loadObstacleFile(file: File): Promise<BufferGeometry> {
  const buffer = await file.arrayBuffer()
  const name = file.name.toLowerCase()
  if (name.endsWith('.obj')) {
    const text = new TextDecoder().decode(buffer)
    return centerGeometry(geometryFromObject(new OBJLoader().parse(text)))
  }
  if (name.endsWith('.glb') || name.endsWith('.gltf')) {
    const scene = await new Promise<Object3D>((resolve, reject) => {
      new GLTFLoader().parse(
        buffer,
        '',
        (gltf) => resolve(gltf.scene),
        (error) => reject(error instanceof Error ? error : new Error('Could not read that GLB file.')),
      )
    })
    return centerGeometry(geometryFromObject(scene))
  }
  throw new Error('Import an OBJ or GLB file.')
}

function geometryFromObject(root: Object3D): BufferGeometry {
  root.updateMatrixWorld(true)
  const parts: BufferGeometry[] = []
  root.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh || !mesh.geometry) {
      return
    }
    const positions = positionsOnly(mesh.geometry)
    positions.applyMatrix4(mesh.matrixWorld)
    parts.push(positions)
  })
  if (parts.length === 0) {
    throw new Error('That file has no mesh.')
  }
  if (parts.length === 1) {
    return parts[0]
  }
  const merged = mergeGeometries(parts)
  for (const part of parts) {
    part.dispose()
  }
  if (!merged) {
    throw new Error('Could not combine the meshes in that file.')
  }
  return merged
}

function positionsOnly(geometry: BufferGeometry): BufferGeometry {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  const next = new BufferGeometry()
  const position = source.getAttribute('position')
  if (!position) {
    source.dispose()
    throw new Error('That mesh has no vertex positions.')
  }
  next.setAttribute('position', position.clone())
  source.dispose()
  return next
}

function centerGeometry(geometry: BufferGeometry): BufferGeometry {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) {
    return geometry
  }
  const center = box.getCenter(box.min.clone())
  geometry.translate(-center.x, -center.y, -center.z)
  return geometry
}
