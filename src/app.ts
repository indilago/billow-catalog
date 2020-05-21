import Express from 'express'
import ResourceController from './controllers/resources'
import ProductController from './controllers/products'
import DynamoDB from 'aws-sdk/clients/dynamodb'
import {DataMapper} from '@aws/dynamodb-data-mapper'
import {DDBResourceDao} from './persistence/dynamodb/resource'
import bodyParser from 'body-parser'
import {DDBProductDao} from './persistence/dynamodb/product'

const app = Express()
app.use(bodyParser.json())
app.set('port', process.env.PORT || 3000)

const dynamoDB = new DynamoDB({ region: 'us-west-2' })
const mapper = new DataMapper({ client: dynamoDB })
export const resourceDao = new DDBResourceDao(mapper)
export const productDao = new DDBProductDao(mapper, resourceDao)

app.get('/', (req, res) => {
    res.send('Hi')
})

// Register controllers
ResourceController(app, resourceDao)
ProductController(app, productDao, resourceDao)

export default app
