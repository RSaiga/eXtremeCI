import {ReadTime} from "./read.time";

export class ReadTimes {
  readonly values: ReadTime[];

  constructor(values:ReadTime[]) {
    this.values = values;
  }

  median() {
    if (this.values.length === 0) {
      return 0
    }
    const half = (this.values.length / 2) | 0
    const arr = [...this.values].sort((a, b) => {
      return a.getDisplayTime() - b.getDisplayTime();
    })
    if (arr.length % 2) {
      return arr[half].getDisplayTime()
    }

    return parseFloat(((arr[half - 1].getDisplayTime() + arr[half].getDisplayTime()) / 2).toFixed(3))
  }

  avg() {
    if (this.values.length === 0) {
      return 0;
    }
    const s = this.values.map(v => v.getDisplayTime());
    const sum = s.reduce((acc, cur) => acc + cur);
    return parseFloat((sum / this.values.length).toFixed(3));
  }
}