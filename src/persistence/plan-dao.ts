import {Currency} from './dynamodb/plan'
import {Plan} from '../models/plan'


export default interface PlanDao {
    listPlans(productId: string, currency: Currency, effectiveDate: Date): Promise<Plan[]>
}
