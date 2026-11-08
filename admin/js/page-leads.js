/**
 * [DEPRECATED - ĐÃ GỘP VÀO page-crm.js]
 * Module "CRM B2B / Leads" (#/leads) đã được hợp nhất hoàn toàn vào "Quản lý CRM B2B" (#/crm - admin/js/page-crm.js).
 * Toàn bộ yêu cầu báo giá từ Website (supabase.from('lead')) hiện nằm tại Tab 7: "7. Leads Báo giá Web" trong #/crm.
 */
(function (Admin) {
  'use strict';
  if (!Admin || typeof Admin.registerPage !== 'function') return;
  Admin.registerPage('leads', {
    title: 'Quản lý CRM B2B',
    render: async function (root) {
      window.location.hash = '#/crm';
      if (Admin.pages && Admin.pages.crm && typeof Admin.pages.crm.render === 'function') {
        return Admin.pages.crm.render(root);
      }
    }
  });
})(window.Admin);
