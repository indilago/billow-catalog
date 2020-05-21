import {Construct, RemovalPolicy, Stack, StackProps} from '@aws-cdk/core'
import {AttributeType, BillingMode, ProjectionType, Table} from '@aws-cdk/aws-dynamodb'

export class BillowCatalogStack extends Stack {
  public catalogTable: Table
  // public readonly subscriptionsTable: Table
  public plansIndex: string
  public resourcesIndex: string
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.database()
  }

  database() {
    this.catalogTable = new Table(this, 'CatalogTable', {
      tableName: 'BillowCatalog',
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'productId', type: AttributeType.STRING },
      sortKey: { name: 'plan', type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      serverSideEncryption: true,
    })

    const createdAt = { name: 'createdAt', type: AttributeType.NUMBER }
    //
    this.plansIndex = 'PlansIndex'
    this.catalogTable.addGlobalSecondaryIndex({
      indexName: this.plansIndex,
      projectionType: ProjectionType.ALL, // @todo scope down to plan attributes
      partitionKey: { name: 'planId', type: AttributeType.STRING },
      sortKey: createdAt,
    })


    this.resourcesIndex = 'ResourcesIndex'
    this.catalogTable.addGlobalSecondaryIndex({
      indexName: this.resourcesIndex,
      partitionKey: {name:'resourceId', type: AttributeType.STRING},
      sortKey: createdAt,
    })
  }
}
