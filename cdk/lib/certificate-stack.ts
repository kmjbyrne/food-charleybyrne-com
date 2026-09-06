import * as cdk from 'aws-cdk-lib/core'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as route53 from 'aws-cdk-lib/aws-route53'
import type { Construct } from 'constructs'
import type { InfraConfig } from '../config'

export interface CertificateStackProps extends cdk.StackProps {
  readonly config: InfraConfig
}

export class CertificateStack extends cdk.Stack {
  readonly cert: acm.Certificate

  constructor(scope: Construct, id: string, props: CertificateStackProps) {
    super(scope, id, props)

    const { config } = props

    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: config.hostedZoneName
    })

    this.cert = new acm.Certificate(this, 'SiteCertificate', {
      domainName: config.domainName,
      validation: acm.CertificateValidation.fromDns(hostedZone)
    })
  }
}
