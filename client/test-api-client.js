/**
 * Verification Script for Centralized API Client Expansion (Task FE-1)
 * Validates that api.js exports all expected namespaces and functions
 */

import { api } from './src/services/api.js';

console.log('Testing api.js client structure...');

const expectedModules = [
  'auth',
  'walkins',
  'callLogs',
  'schedules',
  'dailyActivities',
  'sports',
  'bookings',
  'member360',
  'crm',
  'leaves',
  'wallet',
  'financials',
  'shop',
  'superAdmin',
  'membership',
  'cafe',
  'health',
];

for (const mod of expectedModules) {
  if (!api[mod]) {
    throw new Error(`Missing expected module in api: ${mod}`);
  }
}

// Check sports
if (typeof api.sports.getSports !== 'function' || typeof api.sports.getSlots !== 'function' || typeof api.sports.getPricing !== 'function') {
  throw new Error('Sports module missing required functions');
}

// Check bookings
if (typeof api.bookings.createHold !== 'function' || typeof api.bookings.confirmHold !== 'function' || typeof api.bookings.cancelBooking !== 'function') {
  throw new Error('Bookings module missing required functions');
}

// Check member360
if (typeof api.member360.search !== 'function' || typeof api.member360.getHistory !== 'function' || typeof api.member360.checkin !== 'function') {
  throw new Error('Member360 module missing required functions');
}

// Check crm
if (typeof api.crm.submitEnquiry !== 'function' || typeof api.crm.getEnquiries !== 'function' || typeof api.crm.updateStatus !== 'function') {
  throw new Error('CRM module missing required functions');
}

// Check leaves
if (typeof api.leaves.submit !== 'function' || typeof api.leaves.approve !== 'function' || typeof api.leaves.getCoverage !== 'function') {
  throw new Error('Leaves module missing required functions');
}

// Check wallet
if (typeof api.wallet.topup !== 'function' || typeof api.wallet.requestOtp !== 'function' || typeof api.wallet.pay !== 'function') {
  throw new Error('Wallet module missing required functions');
}

// Check financials
if (typeof api.financials.getConsolidated !== 'function') {
  throw new Error('Financials module missing getConsolidated');
}

// Check shop
if (typeof api.shop.getProducts !== 'function' || typeof api.shop.checkout !== 'function' || typeof api.shop.createStringing !== 'function' || typeof api.shop.getLowStockAlerts !== 'function') {
  throw new Error('Shop module missing required functions');
}

// Check superAdmin
if (typeof api.superAdmin.getOverview !== 'function' || typeof api.superAdmin.getSubAdmins !== 'function' || typeof api.superAdmin.updateUserRole !== 'function') {
  throw new Error('SuperAdmin module missing required functions');
}

// Check membership
if (typeof api.membership.getPlans !== 'function' || typeof api.membership.getStatus !== 'function' || typeof api.membership.renew !== 'function' || typeof api.membership.upgrade !== 'function') {
  throw new Error('Membership module missing required functions');
}

// Check cafe
if (typeof api.cafe.getMenu !== 'function' || typeof api.cafe.createOrder !== 'function' || typeof api.cafe.getOrders !== 'function' || typeof api.cafe.updateOrderStatus !== 'function') {
  throw new Error('Cafe module missing required functions');
}

console.log('✓ All 17 API namespaces and functions verified successfully!');
