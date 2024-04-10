export class Author {
  readonly user: string;
  readonly count: number;

  constructor(user: string, count: number) {
    this.user = user;
    this.count = count;
  }
}
export class Commiter {
  readonly date: string;
  readonly author: Author[];

  constructor(date: string, author: Author[]) {
    this.date = date;
    this.author = author;
  }
}