export interface InfraConfig {
  readonly domainName: string;
  readonly hostedZoneName: string;
  readonly bucketName: string;
  readonly distributionId: string;
  readonly githubRepo: string;
  readonly deployBranch: string;
}

// Committed defaults: none of these are secret, and requiring them on every
// invocation is how the role stack got silently skipped once already.
const DEFAULTS = {
  DOMAIN_NAME: "food.charleybyrne.com",
  HOSTED_ZONE_NAME: "charleybyrne.com",
  DISTRIBUTION_ID: "E28JG37EYCTSG0",
  GITHUB_REPO: "kmjbyrne/food-charleybyrne-com",
  DEPLOY_BRANCH: "main",
} as const;

const DOMAIN_NAME = process.env.DOMAIN_NAME ?? DEFAULTS.DOMAIN_NAME;
const HOSTED_ZONE_NAME = process.env.HOSTED_ZONE_NAME ?? DEFAULTS.HOSTED_ZONE_NAME;
const DISTRIBUTION_ID = process.env.DISTRIBUTION_ID ?? DEFAULTS.DISTRIBUTION_ID;
const GITHUB_REPO = process.env.GITHUB_REPO ?? DEFAULTS.GITHUB_REPO;
const DEPLOY_BRANCH = process.env.DEPLOY_BRANCH ?? DEFAULTS.DEPLOY_BRANCH;

const config: InfraConfig = {
  domainName: DOMAIN_NAME,
  hostedZoneName: HOSTED_ZONE_NAME,
  bucketName: DOMAIN_NAME.replace(/\./g, "-"),
  distributionId: DISTRIBUTION_ID,
  // The trust boundary. Override GITHUB_REPO when deploying from a fork, or the
  // role will trust the original repo instead.
  githubRepo: GITHUB_REPO,
  deployBranch: DEPLOY_BRANCH,
};

export default config;
