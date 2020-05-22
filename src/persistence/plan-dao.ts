import {Currency} from './dynamodb/plan'
import {CreatePlanInput, ModifyPlanInput, Plan} from '../models/plan'
import {CreateProductInput, ModifyProductInput, Product} from '../models/product'


export default interface PlanDao {
    listPlans(productId?: string, currency?: Currency, effectiveDate?: Date): Promise<Plan[]>
    getPlan(planId: string): Promise<Plan|null>
    createPlan(input: CreatePlanInput): Promise<Plan>
    deletePlan(planId: string): Promise<Plan|null>
    updatePlan(input: ModifyPlanInput): Promise<Plan>
}
