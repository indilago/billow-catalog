import bodyParser from 'body-parser'
import DynamoDB from 'aws-sdk/clients/dynamodb'
import Express from 'express'
import {DataMapper} from '@aws/dynamodb-data-mapper'
import winston from 'winston'
import expressWinston from 'express-winston'

import {DDBResourceDao} from './persistence/dynamodb/resource'
import {DDBProductDao} from './persistence/dynamodb/product'
import {DDBPlanDao}  from './persistence/dynamodb/plan'
import PlansController from './controllers/plans'
import ResourcesController from './controllers/resources'
import ProductsController from './controllers/products'
import {DDBSubscriptionDao} from './persistence/dynamodb/subscription'
import SubscriptionsController from './controllers/subscriptions'

const app = Express()
app.use(bodyParser.json())
app.set('port', process.env.PORT || 3000)

const dynamoDB = new DynamoDB({ region: process.env.AWS_REGION || 'us-west-2' })
const mapper = new DataMapper({ client: dynamoDB })
export const resourceDao = new DDBResourceDao(mapper)
export const productDao = new DDBProductDao(mapper, resourceDao)
export const planDao = new DDBPlanDao(mapper)
export const subscriptionDao = new DDBSubscriptionDao(mapper)

app.use(expressWinston.logger({
    transports: [
        new winston.transports.Console()
    ],
    // format: winston.format.combine(
    //     winston.format.colorize(),
    //     winston.format.json()
    // ),
    meta: true, // optional: control whether you want to log the meta data about the request (default to true)
    msg: "HTTP {{req.method}} {{req.url}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
    // expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
    colorize: false, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
    ignoreRoute: function (req, res) { return false; } // optional: allows to skip some log messages based on request and/or response
}));

app.get('/', (req, res) => {
    res.send('Billow')
})

// Register controllers
ResourcesController(app, resourceDao)
ProductsController(app, productDao, resourceDao)
PlansController(app, planDao, productDao)
SubscriptionsController(app, subscriptionDao, planDao)

export default app
