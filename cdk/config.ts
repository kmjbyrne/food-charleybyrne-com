export interface InfraConfig {
  readonly domainName: string;
  readonly hostedZoneName: string;
  readonly bucketName: string;
  readonly githubRepo: string;
  readonly githubRepoImmutable: string;
  readonly deployBranch: string;
}

// Committed defaults: none of these are secret, and requiring them on every
// invocation is how the role stack got silently skipped once already.
const DEFAULTS = {
  DOMAIN_NAME: "food.charleybyrne.com",
  HOSTED_ZONE_NAME: "charleybyrne.com",
  GITHUB_REPO: "kmjbyrne/food-charleybyrne-com",
  // GitHub now issues immutable subject claims with numeric owner and repo ids
  // appended. Read the live value with:
  //   gh api repos/<owner>/<repo>/actions/oidc/customization/sub
  GITHUB_REPO_IMMUTABLE: "kmjbyrne@10832705/food-charleybyrne-com@1359213941",
  DEPLOY_BRANCH: "main",
} as const;

const DOMAIN_NAME = process.env.DOMAIN_NAME ?? DEFAULTS.DOMAIN_NAME;
const HOSTED_ZONE_NAME = process.env.HOSTED_ZONE_NAME ?? DEFAULTS.HOSTED_ZONE_NAME;
const GITHUB_REPO = process.env.GITHUB_REPO ?? DEFAULTS.GITHUB_REPO;
const GITHUB_REPO_IMMUTABLE =
  process.env.GITHUB_REPO_IMMUTABLE ?? DEFAULTS.GITHUB_REPO_IMMUTABLE;
const DEPLOY_BRANCH = process.env.DEPLOY_BRANCH ?? DEFAULTS.DEPLOY_BRANCH;

const config: InfraConfig = {
  domainName: DOMAIN_NAME,
  hostedZoneName: HOSTED_ZONE_NAME,
  bucketName: DOMAIN_NAME.replace(/\./g, "-"),
  // The trust boundary. Override GITHUB_REPO when deploying from a fork, or the
  // role will trust the original repo instead.
  githubRepo: GITHUB_REPO,
  githubRepoImmutable: GITHUB_REPO_IMMUTABLE,
  deployBranch: DEPLOY_BRANCH,
};

export default config;
