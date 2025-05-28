export interface Asset {
  asset_id: number;
  asset_code: string;
  asset_name: string;
  category_id: number;
  brand: string;
  model: string;
  serial_number: string;
  type: string;
  ip_address?: string;
  mac_address?: string;
  hub?: string;
  vcs_lan_no?: string;
  start_use_date?: Date;
  factory_area?: string;
  belongs_to_dept_id?: number;
  vendor_id?: number;
  location_id?: string;
  purchase_date?: Date;
  purchase_price?: number;
  warranty_expiry?: Date;
  maintenance_cycle?: number;
  status_id: number;
  upgrade_infor?: string;
  notes?: string;
  old_ip?: string;
  OS?: string;
  OFFICE?: string;
  software_used?: string[];
  configuration?: string;
  initial_assignment?: {
    employee_id: number;
    handover_by: number;
    department_id: number;
    floor?: string;
    position?: string;
    mac_address?: string;
    history_status?: string;
    note?: string;
  };
}

export interface AssetStatus {
  status_id: number;
  status_name: string;
}

export interface AssetCategory {
  category_id: number;
  category_name: string;
}

export interface AssetHistory {
  history_id: number;
  asset_id: number;
  employee_id: number;
  handover_by: number;
  department_id?: number;
  handover_date: Date;
  returned_date?: Date;
  floor?: string;
  position?: string;
  mac_address?: string;
  history_status?: string;
  note?: string;
}

export interface SoftwareUsed {
  software_used_id: number;
  software_used_name: string;
  note?: string;
}

export interface Department {
  department_id: number;
  department_code: string;
  department_name: string;
  business_unit_id: number;
  business_unit_name?: string;
}

export interface Vendor {
  vendor_id: number;
  vendor_name: string;
  contact_info?: string;
}

export interface Location {
  location_id: number;
  location_name: string;
  description?: string;
}

export interface BusinessUnit {
  business_unit_id: number;
  name: string;
} 