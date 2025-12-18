import {OpenPr, ReviewState} from "./open_pr";

export interface StatusCount {
  draft: number;
  approved: number;
  changesRequested: number;
  pending: number;
  reviewWaiting: number;
}

export class OpenPrs {
  readonly values: OpenPr[];

  constructor(values: OpenPr[]) {
    this.values = values;
  }

  get totalCount(): number {
    return this.values.length;
  }

  get staleCount(): number {
    return this.values.filter(pr => pr.isStale).length;
  }

  get oldCount(): number {
    return this.values.filter(pr => pr.isOld).length;
  }

  get avgOpenDays(): number {
    if (this.values.length === 0) return 0;
    const sum = this.values.reduce((acc, pr) => acc + pr.openDays, 0);
    return parseFloat((sum / this.values.length).toFixed(1));
  }

  statusCount(): StatusCount {
    const counts: StatusCount = {
      draft: 0,
      approved: 0,
      changesRequested: 0,
      pending: 0,
      reviewWaiting: 0
    };

    this.values.forEach(pr => {
      if (pr.isDraft) {
        counts.draft++;
      } else {
        switch (pr.reviewState) {
          case 'APPROVED':
            counts.approved++;
            break;
          case 'CHANGES_REQUESTED':
            counts.changesRequested++;
            break;
          case 'PENDING':
            counts.pending++;
            break;
          case 'COMMENTED':
            counts.pending++;
            break;
          case 'NONE':
            counts.reviewWaiting++;
            break;
        }
      }
    });

    return counts;
  }

  sortedByOpenDays(): OpenPr[] {
    return [...this.values].sort((a, b) => b.openDays - a.openDays);
  }

  sortedByLastUpdate(): OpenPr[] {
    return [...this.values].sort((a, b) => b.daysSinceLastUpdate - a.daysSinceLastUpdate);
  }
}
