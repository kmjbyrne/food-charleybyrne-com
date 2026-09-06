export interface InfraConfig {
  readonly domainName: string;
  readonly hostedZoneName: string;
}

const { DOMAIN_NAME, HOSTED_ZONE_NAME } = process.env;

if (!DOMAIN_NAME || !HOSTED_ZONE_NAME) {
  throw new Error("DOMAIN_NAME and HOSTED_ZONE_NAME must be provided for CDK.");
}

const config: InfraConfig = {
  domainName: DOMAIN_NAME,
  hostedZoneName: HOSTED_ZONE_NAME,
};

export default config;
