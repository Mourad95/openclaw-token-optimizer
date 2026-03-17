declare module 'vectra' {
  export class LocalIndex {
    constructor(indexPath: string);
    createIndex(): Promise<void>;
    isIndexCreated(): Promise<boolean>;
    insertItem(item: { vector: number[]; metadata: Record<string, unknown> }): Promise<void>;
    queryItems(vector: number[], limit: number): Promise<Array<{ item: { metadata: Record<string, unknown> }; score: number }>>;
    deleteIndex(): Promise<void>;
  }
}
