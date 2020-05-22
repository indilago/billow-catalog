import bodyParser from 'body-parser'
import DynamoDB from 'aws-sdk/clients/dynamodb'
import Express from 'express'
import {DataMapper} from '@aws/dynamodb-data-mapper'

import {DDBResourceDao} from './persistence/dynamodb/resource'
import {DDBProductDao} from './persistence/dynamodb/product'
import {DDBPlanDao}  from './persistence/dynamodb/plan'
import PlansController from './controllers/plans'
import ResourcesController from './controllers/resources'
import ProductsController from './controllers/products'

const app = Express()
app.use(bodyParser.json())
app.set('port', process.env.PORT || 3000)

const dynamoDB = new DynamoDB({ region: 'us-west-2' })
const mapper = new DataMapper({ client: dynamoDB })
export const resourceDao = new DDBResourceDao(mapper)
export const productDao = new DDBProductDao(mapper, resourceDao)
export const planDao = new DDBPlanDao(mapper)

app.get('/', (req, res) => {
    res.send('BillowCatalog')
})

// Register controllers
ResourcesController(app, resourceDao)
ProductsController(app, productDao, resourceDao)
PlansController(app, planDao, productDao)

export default app
