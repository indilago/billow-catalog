import Express from 'express'
import ResourceController from './controllers/resources'
import DynamoDB from 'aws-sdk/clients/dynamodb'
import {DataMapper} from '@aws/dynamodb-data-mapper'
import {DDBResourceDao} from './persistence/dynamodb/resource'
import bodyParser from 'body-parser'

const app = Express()
app.use(bodyParser.json())
app.set('port', process.env.PORT || 3000)

const dynamoDB = new DynamoDB({ region: 'us-west-2' })
const mapper = new DataMapper({ client: dynamoDB })
export const resourceDao = new DDBResourceDao(mapper)

app.get('/', (req, res) => {
    res.send('Hi')
})

// Register controllers
ResourceController(app, resourceDao)

export default app
