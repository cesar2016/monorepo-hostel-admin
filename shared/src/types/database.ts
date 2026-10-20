
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "areas": {
                  Row: {
                    "activa": boolean,"created_at": string,"created_by": string | null,"descripcion": string | null,"id": string,"nombre": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activa"?: boolean,"created_at"?: string,"created_by"?: string | null,"descripcion"?: string | null,"id"?: string,"nombre": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "activa"?: boolean,"created_at"?: string,"created_by"?: string | null,"descripcion"?: string | null,"id"?: string,"nombre"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "areas_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "areas_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "area_id": string | null,"created_at": string,"datos_antes": Json | null,"datos_despues": Json | null,"id": number,"operacion": string,"registro_id": string,"tabla": string,"usuario_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id"?: string | null,"created_at"?: string,"datos_antes"?: Json | null,"datos_despues"?: Json | null,"id"?: never,"operacion": string,"registro_id": string,"tabla": string,"usuario_id"?: string | null
                  }
                  Update: {
                    "area_id"?: string | null,"created_at"?: string,"datos_antes"?: Json | null,"datos_despues"?: Json | null,"id"?: never,"operacion"?: string,"registro_id"?: string,"tabla"?: string,"usuario_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"egresos": {
                  Row: {
                    "area_id": string,"cantidad": number,"created_at": string,"created_by": string | null,"fecha": string,"id": string,"motivo": string,"producto_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": string,"cantidad": number,"created_at"?: string,"created_by"?: string | null,"fecha": string,"id"?: string,"motivo": string,"producto_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "area_id"?: string,"cantidad"?: number,"created_at"?: string,"created_by"?: string | null,"fecha"?: string,"id"?: string,"motivo"?: string,"producto_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "egresos_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "egresos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "egresos_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "egresos_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "v_stock"
      referencedColumns: ["producto_id"]
    },{
      foreignKeyName: "egresos_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ingreso_items": {
                  Row: {
                    "cantidad": number,"costo_unitario": number,"created_at": string,"created_by": string | null,"id": string,"ingreso_id": string,"producto_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"costo_unitario": number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"ingreso_id": string,"producto_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "cantidad"?: number,"costo_unitario"?: number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"ingreso_id"?: string,"producto_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ingreso_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ingreso_items_ingreso_id_fkey"
      columns: ["ingreso_id"]
isOneToOne: false
      referencedRelation: "ingresos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ingreso_items_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ingreso_items_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "v_stock"
      referencedColumns: ["producto_id"]
    },{
      foreignKeyName: "ingreso_items_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ingresos": {
                  Row: {
                    "area_id": string,"created_at": string,"created_by": string | null,"fecha": string,"id": string,"nro_factura": string,"observaciones": string | null,"proveedor_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": string,"created_at"?: string,"created_by"?: string | null,"fecha": string,"id"?: string,"nro_factura": string,"observaciones"?: string | null,"proveedor_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "area_id"?: string,"created_at"?: string,"created_by"?: string | null,"fecha"?: string,"id"?: string,"nro_factura"?: string,"observaciones"?: string | null,"proveedor_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ingresos_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ingresos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ingresos_proveedor_id_fkey"
      columns: ["proveedor_id"]
isOneToOne: false
      referencedRelation: "proveedores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ingresos_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"productos": {
                  Row: {
                    "activo": boolean,"area_id": string,"created_at": string,"created_by": string | null,"id": string,"nombre": string,"sku": string | null,"stock_minimo": number,"unidad_id": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"area_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"nombre": string,"sku"?: string | null,"stock_minimo"?: number,"unidad_id": number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "activo"?: boolean,"area_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"nombre"?: string,"sku"?: string | null,"stock_minimo"?: number,"unidad_id"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "productos_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "productos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "productos_unidad_id_fkey"
      columns: ["unidad_id"]
isOneToOne: false
      referencedRelation: "unidades_medida"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "productos_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "activo": boolean,"area_id": string | null,"created_at": string,"created_by": string | null,"email": string,"id": string,"nombre": string,"rol": Database["public"]['Enums']["rol_usuario"],"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"area_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"email": string,"id": string,"nombre": string,"rol"?: Database["public"]['Enums']["rol_usuario"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "activo"?: boolean,"area_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string,"id"?: string,"nombre"?: string,"rol"?: Database["public"]['Enums']["rol_usuario"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"proveedores": {
                  Row: {
                    "activo": boolean,"area_id": string,"contacto": string | null,"created_at": string,"created_by": string | null,"cuit": string | null,"email": string | null,"id": string,"nombre": string,"telefono": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"area_id": string,"contacto"?: string | null,"created_at"?: string,"created_by"?: string | null,"cuit"?: string | null,"email"?: string | null,"id"?: string,"nombre": string,"telefono"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "activo"?: boolean,"area_id"?: string,"contacto"?: string | null,"created_at"?: string,"created_by"?: string | null,"cuit"?: string | null,"email"?: string | null,"id"?: string,"nombre"?: string,"telefono"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "proveedores_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proveedores_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proveedores_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"unidades_medida": {
                  Row: {
                    "activa": boolean,"codigo": string,"created_at": string,"created_by": string | null,"id": number,"nombre": string,"permite_decimales": boolean,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activa"?: boolean,"codigo": string,"created_at"?: string,"created_by"?: string | null,"id"?: never,"nombre": string,"permite_decimales"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "activa"?: boolean,"codigo"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: never,"nombre"?: string,"permite_decimales"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "unidades_medida_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "unidades_medida_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "v_movimientos": {
                  Row: {
                    "area_id": string | null,"area_nombre": string | null,"cantidad": number | null,"costo_unitario": number | null,"created_at": string | null,"created_by": string | null,"created_by_nombre": string | null,"fecha": string | null,"id": string | null,"motivo": string | null,"movimiento_id": string | null,"nro_factura": string | null,"observaciones": string | null,"producto_id": string | null,"producto_nombre": string | null,"proveedor_id": string | null,"proveedor_nombre": string | null,"sku": string | null,"tipo": string | null,"unidad_codigo": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"v_stock": {
                  Row: {
                    "activo": boolean | null,"area_id": string | null,"area_nombre": string | null,"bajo_minimo": boolean | null,"nombre": string | null,"producto_id": string | null,"sku": string | null,"stock_actual": number | null,"stock_minimo": number | null,"total_egresado": number | null,"total_ingresado": number | null,"ultimo_movimiento": string | null,"unidad_codigo": string | null,"unidad_id": number | null,"unidad_nombre": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "productos_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "productos_unidad_id_fkey"
      columns: ["unidad_id"]
isOneToOne: false
      referencedRelation: "unidades_medida"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "actualizar_ingreso":
{ Args: { "p_fecha": string,"p_ingreso_id": string,"p_items": Json,"p_nro_factura": string,"p_observaciones": string,"p_proveedor_id": string }; Returns: string
                           },
"registrar_ingreso":
{ Args: { "p_fecha": string,"p_items": Json,"p_nro_factura": string,"p_observaciones": string,"p_proveedor_id": string }; Returns: string
                           }
          }
          Enums: {
            "rol_usuario": "encargado"|"admin"|"super_admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "rol_usuario": ["encargado", "admin", "super_admin"]
          }
        }
} as const
