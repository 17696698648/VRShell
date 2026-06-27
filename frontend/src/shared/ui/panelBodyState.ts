export interface PanelBodyState<Kind extends string = string> {
  description: string
  icon: string
  kind: Kind
  title: string
}
