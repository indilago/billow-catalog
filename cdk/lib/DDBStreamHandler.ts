import {Construct} from '@aws-cdk/core'
import {Table} from '@aws-cdk/aws-dynamodb'
import {Code, Function, Runtime, StartingPosition} from '@aws-cdk/aws-lambda'
import {DynamoEventSource, SqsDlq} from '@aws-cdk/aws-lambda-event-sources'
import {Queue} from '@aws-cdk/aws-sqs'

export interface DDBStreamHandlerProps {
    table: Table
    code: Code
    handler: string
    runtime?: Runtime
    batchSize?: number
    retryAttempts?: number
    environment?: {[key: string]: string}
}
export default class DDBStreamHandler extends Construct {
    public readonly function: Function
    public readonly dlq: Queue

    constructor(scope: Construct, id: string, props: DDBStreamHandlerProps) {
        super(scope, id);

        this.function = new Function(this, id + 'Fn', {
            code: props.code,
            handler: props.handler,
            runtime: props.runtime || Runtime.NODEJS_12_X,
            environment: props.environment,
        })
        this.dlq = new Queue(this, id + 'Dlq')
        this.function.addEventSource(new DynamoEventSource(props.table, {
            startingPosition: StartingPosition.TRIM_HORIZON,
            batchSize: props.batchSize,
            bisectBatchOnError: true,
            onFailure: new SqsDlq(this.dlq),
            retryAttempts: props.retryAttempts,
        }))
    }
}
