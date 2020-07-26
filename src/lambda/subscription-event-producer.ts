import {DynamoDBStreamHandler} from 'aws-lambda'
import {Subscription} from '../models/subscription'
import {getSchema} from '@aws/dynamodb-data-mapper'
import {DDBSubscription} from '../persistence/dynamodb/subscription'
import {unmarshallItem} from '@aws/dynamodb-data-marshaller'
import EventBridge, {
    PutEventsRequestEntry,
} from 'aws-sdk/clients/eventbridge'

const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME!

type EventName = 'INSERT' | 'MODIFY' | 'REMOVE'

const eventBridge = new EventBridge()

function handleSubscription(eventTime: Date, action: EventName, subscription: Subscription, old?: Subscription) {
    const eventEntry: PutEventsRequestEntry = {
        Time: eventTime,
        Source: 'dev.billow',
        Resources: [], // ARNs related to the event
        /**
         * Free-form string used to decide what fields to expect in the event detail.
         */
        DetailType: 'Subscription',
        /**
         * A valid JSON string. There is no other schema imposed. The JSON string may contain fields and nested subobjects.
         */
        Detail: JSON.stringify(subscription),
        /**
         * The event bus that will receive the event. Only the rules that are associated with this event bus will be able to match the event.
         */
        EventBusName: EVENT_BUS_NAME,
    }
    return eventBridge.putEvents({
        Entries: [eventEntry]
    }).promise()
}

function parseRecord(record?: any): Subscription|null {
    if (!record) {
        return null
    }
    return Object.assign(new DDBSubscription, unmarshallItem(getSchema(new DDBSubscription), record))
}

export const handler: DynamoDBStreamHandler = (event, context) => {
    event.Records.forEach(record => {
        const { ApproximateCreationDateTime, NewImage, OldImage } = record.dynamodb
        const eventTime = ApproximateCreationDateTime ? new Date(ApproximateCreationDateTime * 1000) : new Date()
        try {
            handleSubscription(eventTime, record.eventName, parseRecord(NewImage), parseRecord(OldImage))
        } catch (e) {
            console.error('Failed to handle event', record)
            throw e
        }
    })
}
