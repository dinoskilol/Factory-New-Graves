export type FrameId = 'assault' | 'power' | 'marksman' | 'other'

export type NodePosition = {
  x: number
  y: number
}

export type UpgradeNode = {
  id: string
  name: string
  description: string
  cost: number
  iconFile: string
  frame: FrameId
  parents: string[]
  position: NodePosition
}

export type UpgradeDisplayNode = {
  id: string
  upgradeId: string
  frame: FrameId
  parents: string[]
  position: NodePosition
}
