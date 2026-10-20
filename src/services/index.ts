/**
 * The service layer is the only thing that touches data. Components import
 * from here and never from `src/mock`, so replacing the mock backend with a
 * real one is a change confined to these files.
 */
export * as appointmentService from './appointmentService';
export * as authService from './authService';
export * as catalogService from './catalogService';
export * as customerService from './customerService';
export * as expenseService from './expenseService';
export * as inventoryService from './inventoryService';
export * as notificationService from './notificationService';
export * as productService from './productService';
export * as reportService from './reportService';
export * as saleService from './saleService';
export * as settingsService from './settingsService';
export * as shopService from './shopService';
export * as staffService from './staffService';

export * from './availability';
export * from './pricing';
export { ServiceError } from './db';
