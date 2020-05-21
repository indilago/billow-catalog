import {CreateProductInput, CreateProductOutput, ModifyProductInput, Product} from '../models/product'

export interface ProductDao {
    listProducts(): Promise<Product[]>
    getProduct(productId: string): Promise<Product|null>
    createProduct(input: CreateProductInput): Promise<Product>
    deleteProduct(productId: string): Promise<Product|null>
    updateProduct(input: ModifyProductInput): Promise<Product>
}
