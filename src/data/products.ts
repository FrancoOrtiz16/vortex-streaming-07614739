export type ProductCategory = 'streaming' | 'gaming';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  image: string;
  badge?: string;
}

export const products: Product[] = [];