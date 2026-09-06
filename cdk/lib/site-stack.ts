import * as cdk from 'aws-cdk-lib/core'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import type * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as targets from 'aws-cdk-lib/aws-route53-targets'
import type { Construct } from 'constructs'
import type { InfraConfig } from '../config'

export interface SiteStackProps extends cdk.StackProps {
  readonly config: InfraConfig
  readonly cert: acm.Certificate
}

export class SiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props)

    const { config, cert } = props

    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: config.hostedZoneName
    })

    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: config.domainName.replace(/\./g, '-'),
      autoDeleteObjects: true,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      accessControl: s3.BucketAccessControl.PRIVATE
    })

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity')

    siteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [siteBucket.arnForObjects('*')],
        principals: [new iam.CanonicalUserPrincipal(originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId)]
      })
    )

    siteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:ListBucket'],
        resources: [siteBucket.bucketArn],
        principals: [new iam.CanonicalUserPrincipal(originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId)]
      })
    )

    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'SiteDistribution', {
      viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(cert, {
        aliases: [config.domainName],
        securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        sslMethod: cloudfront.SSLMethod.SNI
      }),
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: siteBucket,
            originAccessIdentity
          },
          behaviors: [{ isDefaultBehavior: true }]
        }
      ],
      errorConfigurations: [
        {
          responsePagePath: '/index.html',
          responseCode: 200,
          errorCode: 404
        },
        {
          responsePagePath: '/index.html',
          responseCode: 200,
          errorCode: 403
        }
      ]
    })

    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: config.domainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
    })

    new cdk.CfnOutput(this, 'BucketName', {
      value: siteBucket.bucketName,
      description: 'S3 bucket name — deploy built Nuxt output here'
    })

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID — invalidate after each deploy'
    })

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront domain name'
    })

    new cdk.CfnOutput(this, 'SiteUrl', {
      value: `https://${config.domainName}`,
      description: 'Public URL of the site'
    })
  }
}
