import {Octokit} from "@octokit/rest";

export const octokit = new Octokit({
    auth: process.env.VITE_GITHUB_TOKEN,
    baseUrl: process.env.VITE_GITHUB_URL,
  }
);
