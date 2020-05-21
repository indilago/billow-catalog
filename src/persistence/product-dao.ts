import {CreateProductInput, CreateProductOutput, DeleteProductInput, Product} from '../models/product'

export interface ProductDao {
    listProducts(): Promise<Product[]>
    getProduct(id: string): Promise<Product>
    createProduct(input: CreateProductInput): Promise<CreateProductOutput>
    deleteProduct(input: DeleteProductInput): Promise<void>
}
