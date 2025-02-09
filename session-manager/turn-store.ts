import { Turn } from "./turn-store.entities";

export class TurnStore {
  private turnMap: Map<string, Turn>;

  constructor() {
    this.turnMap = new Map();
  }

  add = (turn: Turn) => this.turnMap.set(turn.id, turn);
  get = (id: string) => this.turnMap.get(id);

  list = () => [...this.turnMap.values()];
}
