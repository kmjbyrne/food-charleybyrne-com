import * as cdk from 'aws-cdk-lib/core'
import * as iam from 'aws-cdk-lib/aws-iam'
import type * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import type { Construct } from 'constructs'
import type { InfraConfig } from '../config'

export interface DeployRoleStackProps extends cdk.StackProps {
  readonly config: InfraConfig
  readonly distribution: cloudfront.IDistribution
}

const GITHUB_OIDC_URL = 'https://token.actions.githubusercontent.com'


export class DeployRoleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DeployRoleStackProps) {
    super(scope, id, props)

    const { config, distribution } = props

    const provider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
      url: GITHUB_OIDC_URL,
      clientIds: ['sts.amazonaws.com']
    })

    // Only the default branch of this one repo may assume the role. Without the
    // sub condition any repo on GitHub could.
    //
    // Two patterns because GitHub is migrating to immutable subject claims,
    // which append numeric owner and repo ids. Both are pinned exactly; a
    // wildcard between owner and repo would match unrelated repositories.
    const role = new iam.Role(this, 'DeployRole', {
      roleName: `${config.domainName.replace(/\./g, '-')}-deploy`,
      description: `GitHub Actions deploy role for ${config.domainName}`,
      maxSessionDuration: cdk.Duration.hours(1),
      assumedBy: new iam.OpenIdConnectPrincipal(provider, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com'
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': [
            `repo:${config.githubRepo}:ref:refs/heads/${config.deployBranch}`,
            `repo:${config.githubRepoImmutable}:ref:refs/heads/${config.deployBranch}`
          ]
        }
      })
    })

    const bucketArn = `arn:aws:s3:::${config.bucketName}`

    // GetObject is required, not optional: s3 sync HEADs each remote object to
    // decide whether to re-upload, and that is authorised as GetObject.
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'SyncSiteObjects',
        actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
        resources: [`${bucketArn}/*`]
      })
    )

    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'ListSiteBucket',
        actions: ['s3:ListBucket'],
        resources: [bucketArn]
      })
    )

    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'InvalidateDistribution',
        actions: ['cloudfront:CreateInvalidation'],
        resources: [
          `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`
        ]
      })
    )

    new cdk.CfnOutput(this, 'DeployRoleArn', {
      value: role.roleArn,
      description: 'Role ARN for the GitHub Actions deploy workflow'
    })
  }
}
