import {Construct, CfnOutput, Stack, StackProps} from '@aws-cdk/core'
import {AttributeType, BillingMode, ProjectionType, StreamViewType, Table, TableEncryption} from '@aws-cdk/aws-dynamodb'
import {EventBus} from '@aws-cdk/aws-events'
import {Code, Function, Runtime} from '@aws-cdk/aws-lambda'
import {FollowMode} from '@aws-cdk/assets'
import DDBStreamHandler from './DDBStreamHandler'
import {HttpApi, LambdaProxyIntegration, PayloadFormatVersion} from '@aws-cdk/aws-apigatewayv2'
import {SUBSCRIPTIONS_TABLE} from '../../src/persistence/dynamodb'

export class BillowCatalogStack extends Stack {
    public catalogTable: Table
    public plansIndex: string
    public resourcesIndex: string

    public subscriptionsTable: Table
    public subscriptionsPlanIndex: string

    public readonly api: HttpApi

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props)

        this.database()

        const code = Code.fromAsset('../dist', {follow: FollowMode.ALWAYS})

        const handler = new Function(this, 'Fn', {
            code,
            handler: 'lambda.handler',
            runtime: Runtime.NODEJS_12_X,
            environment: {
                CATALOG_TABLE: this.catalogTable.tableName,
                SUBSCRIPTIONS_TABLE: this.subscriptionsTable.tableName,
            },
        })
        this.subscriptionsTable.grantFullAccess(handler)
        this.catalogTable.grantFullAccess(handler)
        this.api = this.apiGateway(handler)
        new CfnOutput(this, 'ApiUrl', {
            value: this.api.url!
        })

        const eventBus = new EventBus(this, 'EventBus', {
            eventBusName: 'billow'
        })
        const subscriptionEventHandler = new DDBStreamHandler(this, 'SubscriptionEvent', {
            table: this.subscriptionsTable,
            code,
            handler: 'lambda/subscription-event-producer.handler',
            runtime: Runtime.NODEJS_12_X,
            environment: {
                EVENT_BUS_ARN: eventBus.eventBusArn,
                EVENT_BUS_NAME: eventBus.eventBusName,
            }
        })
    }

    database() {
        this.catalogTable = new Table(this, 'CatalogTable', {
            tableName: 'BillowCatalog',
            billingMode: BillingMode.PAY_PER_REQUEST,
            partitionKey: {name: 'productId', type: AttributeType.STRING},
            sortKey: {name: 'plan', type: AttributeType.STRING},
            encryption: TableEncryption.AWS_MANAGED,
        })

        const createdAt = {name: 'createdAt', type: AttributeType.NUMBER}
        this.plansIndex = 'PlansIndex'
        this.catalogTable.addGlobalSecondaryIndex({
            indexName: this.plansIndex,
            projectionType: ProjectionType.ALL, // @todo scope down to plan attributes
            partitionKey: {name: 'planId', type: AttributeType.STRING},
            sortKey: createdAt,
        })

        this.resourcesIndex = 'ResourcesIndex'
        this.catalogTable.addGlobalSecondaryIndex({
            indexName: this.resourcesIndex,
            partitionKey: {name: 'resourceId', type: AttributeType.STRING},
            sortKey: createdAt,
        })

        this.subscriptionsTable = new Table(this, 'SubscriptionsTable', {
            tableName: 'BillowSubscriptions',
            billingMode: BillingMode.PAY_PER_REQUEST,
            partitionKey: {name: 'accountId', type: AttributeType.STRING},
            sortKey: {name: 'planId', type: AttributeType.STRING},
            encryption: TableEncryption.AWS_MANAGED,
            stream: StreamViewType.NEW_AND_OLD_IMAGES,
        })

        this.subscriptionsPlanIndex = 'PlanIndex'
        this.subscriptionsTable.addGlobalSecondaryIndex({
            indexName: this.subscriptionsPlanIndex,
            partitionKey: {name: 'planId', type: AttributeType.STRING},
        })
    }

    apiGateway(handler: Function) {
        return new HttpApi(this, 'Api', {
            defaultIntegration: new LambdaProxyIntegration({
                handler,
                payloadFormatVersion: PayloadFormatVersion.VERSION_1_0,
            })
        })
    }
}
