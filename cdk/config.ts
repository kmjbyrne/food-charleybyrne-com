export interface InfraConfig {
  readonly domainName: string;
  readonly hostedZoneName: string;
  readonly bucketName: string;
  readonly distributionId: string;
  readonly githubRepo: string;
  readonly deployBranch: string;
}

const {
  DOMAIN_NAME,
  HOSTED_ZONE_NAME,
  DISTRIBUTION_ID,
  GITHUB_REPO,
  DEPLOY_BRANCH,
} = process.env;

if (!DOMAIN_NAME || !HOSTED_ZONE_NAME) {
  throw new Error("DOMAIN_NAME and HOSTED_ZONE_NAME must be provided for CDK.");
}

const config: InfraConfig = {
  domainName: DOMAIN_NAME,
  hostedZoneName: HOSTED_ZONE_NAME,
  bucketName: DOMAIN_NAME.replace(/\./g, "-"),
  // Empty is tolerated so the site stacks synth without it. bin/cdk.ts skips
  // DeployRoleStack entirely when it is unset.
  distributionId: DISTRIBUTION_ID ?? "",
  // No default: this is the trust boundary, and a baked-in slug would point a
  // fork's deploy role at the original repo.
  githubRepo: GITHUB_REPO ?? "",
  deployBranch: DEPLOY_BRANCH ?? "main",
};

export default config;
