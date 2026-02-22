declare module "algeria-locations" {
  export type Wilaya = {
    id: number;
    code: string;
    name: string;
    name_ar?: string;
  };

  export type Daira = {
    id: number;
    code: string;
    name: string;
    name_ar?: string;
    wilaya_id: number;
  };

  export type Commune = {
    id: number;
    code: string;
    name: string;
    name_ar?: string;
    daira_id: number;
  };

  export const wilayas: Wilaya[];
  export const dairas: Daira[];
  export const communes: Commune[];
}
