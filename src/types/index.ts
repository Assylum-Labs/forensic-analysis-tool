export interface Entity {
    address: string,
    name: string | null,
    type: string | null,
    subtype: string | null,
    verified: boolean,
    website: string | null,
    description: string | null,
    relatedAddresses: string[],
    icon: string | null,
    createdAt: string,
    updatedAt: string
}  