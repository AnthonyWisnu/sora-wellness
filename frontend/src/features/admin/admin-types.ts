export type AdminTab =
  | 'sessions'
  | 'manage'
  | 'classes'
  | 'packages'
  | 'rules'
  | 'accounts'
  | 'attendance'
  | 'policy'
  | 'payment'
  | 'lockers'
  | 'content'
  | 'finance'
export type GatewayForm = { merchantId: string; clientKey: string; serverKey: string }
