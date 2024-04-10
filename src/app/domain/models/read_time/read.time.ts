export class ReadTime {
  readonly user: string;
  readonly title: string;
  readonly date: string;
  readonly time: string;

  constructor(user:string, title: string, date: string, time: string) {
    this.user = user;
    this.title = title;
    this.date = date;
    this.time = time;
  }

  getDisplayTime() {
    return parseFloat((this.time / 60).toFixed(5))
  }
}