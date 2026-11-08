/* ==========================================================================
 * admin/js/page-crm.js — Phân hệ Quản lý CRM B2B Toàn diện (All-in-One CRM)
 *
 * Thiết kế theo chuẩn ứng dụng CRM B2B chuyên nghiệp (dựa trên Stitch UI
 * Prototype & bộ dữ liệu CRM_Theo_Doi_Khach_Hang_B2B_BangKeo_MangPE-v3.xlsx):
 *   1. Bảng Phễu Kanban (7 Giai đoạn Pipeline): Quản lý trực quan 36 Deal B2B,
 *      chuyển bước nhanh 1-click kèm tự động ghi lịch sử chăm sóc.
 *   2. Danh sách 36 KH & Hồ sơ Khách hàng 360° (Customer 360° Modal):
 *      Cập nhật thông tin, Kiểm toán MOQ/Công nợ, Kịch bản Telesale cá nhân hóa
 *      và Nhật ký Chăm sóc / Lịch sử Cuộc gọi (Activity Timeline).
 *   3. Dashboard & Định lượng Phễu: Thống kê tự động 5 Khu vực, 5 Ngành hàng,
 *      7 bước Pipeline và 7 chỉ số định lượng (Count, Sum, Mean, Median, Min, Max, Std Dev).
 *   4. Kiểm toán MOQ & Rủi ro Công nợ: Cảnh báo đỏ 5 KH Bậc 1 (< 500 cuộn)
 *      lệch chuẩn công nợ & Danh sách 5 Key Accounts (1.000 cuộn/tháng).
 *   5. Lịch Đi Tuyến Sample Kit (Thứ 2 -> Thứ 7) & Playbook Telesale.
 *   6. Bảng Tính Giá Vốn, Chiết khấu 3 Bậc MOQ & Biên Lợi Nhuận Ròng sau công nợ.
 * ========================================================================== */

(function (Admin) {
  'use strict';

  var $ = Admin.$, $$ = Admin.$$;
  var esc = Admin.util.esc;
  var fmtNum = Admin.util.num || function (n) {
    var v = Number(n);
    return isFinite(v) ? v.toLocaleString('vi-VN') : '0';
  };
  var ui = Admin.ui;

  var activeTab = 'kanban'; // kanban | customers | dashboard | audit | route | pricing | webleads
  var filterRoute = 'all';  // all | Q12_HM | BD_BC_LA
  var filterSales = 'all';  // all | KAM_VIET | SALE_TUAN | SALE_NAM
  var filterRegion = 'all';
  var filterIndustry = 'all';
  var filterStatus = 'all';
  var filterTier = 'all';
  var searchKeyword = '';
  var selectedScriptCustomerCode = 'KH01';
  var webLeadSource = 'all';
  var webLeadStatus = 'all';
  var webLeadQuery = '';

  var WEB_SOURCE_LABELS = {
    'quick-quote':            'Báo giá nhanh',
    'quick_quote_modal':      'Báo giá nhanh',
    'popup':                  'Popup Lead Magnet',
    'landing':                'Landing Page',
    'cart-checkout':          'Giỏ hàng',
    'product_detail':         'Chi tiết SP (Modal)',
    'product_detail_sidebar': 'Chi tiết SP (Sidebar)'
  };

  Admin.page('crm', {
    title: 'Quản lý CRM B2B',
    label: 'Quản lý CRM B2B',
    icon: 'bi-kanban',
    sub: 'Hệ thống Quản trị Quan hệ Khách hàng B2B: Phễu Kanban 7 bước, Hồ sơ 360°, Kiểm toán MOQ & Công nợ, Lịch Sample Run, Bảng tính Giá vốn & Leads Website',

    badge: function () {
      if (!Admin.b2b) return 0;
      var records = Admin.b2b.getRecords();
      var riskCount = records.filter(function (r) { return Admin.b2b.auditRecord(r).isRisk; }).length;
      return riskCount > 0 ? riskCount : records.length;
    },

    render: function (root) {
      if (!Admin.b2b) {
        root.innerHTML = '<div class="alert alert-warning">Chưa nạp được dữ liệu CRM B2B (b2b-crm-data.js).</div>';
        return;
      }

      var q = Admin.query ? Admin.query() : {};
      if (q.tab && ['kanban', 'customers', 'dashboard', 'audit', 'route', 'pricing', 'webleads'].indexOf(q.tab) !== -1) {
        activeTab = q.tab;
      }

      renderWorkspace(root);
    }
  });

  function fmtMillion(vnd) {
    var m = (Number(vnd) || 0) / 1000000;
    return m >= 100 ? Math.round(m).toLocaleString('vi-VN') + ' tr' : (Math.round(m * 10) / 10).toLocaleString('vi-VN') + ' tr';
  }

  function renderWorkspace(root) {
    var b2b = Admin.b2b;
    var records = b2b.getRecords();
    var regStats = b2b.computeRegionalStats(records);
    var quant = b2b.computeQuantitativeMetrics(records);
    var riskList = records.filter(function (r) { return b2b.auditRecord(r).isRisk; });
    var urgentSlaList = records.filter(function (r) { return b2b.evaluateSlaStatus ? b2b.evaluateSlaStatus(r).isUrgent : false; });
    var keyAccounts = b2b.getKeyAccounts(records);

    var totalMonthlyRev = 0;
    var totalWeightedRev = 0;
    records.forEach(function (r) {
      if (b2b.estimateDealFinancials) {
        var fin = b2b.estimateDealFinancials(r);
        totalMonthlyRev += fin.monthlyRevenue;
        totalWeightedRev += fin.weightedRevenue;
      }
    });

    root.innerHTML =
      /* 1. DẢI TỔNG QUAN CRM HEADER RIBBON */
      '<div class="card p-3 mb-3 border-primary-subtle" style="background:linear-gradient(135deg,#0F172A 0%,#1E3A8A 100%);color:#fff">' +
        '<div class="d-flex flex-wrap justify-content-between align-items-center gap-3">' +
          '<div>' +
            '<div class="d-flex align-items-center gap-2 mb-1">' +
              '<span class="badge bg-info text-dark fw-bold"><i class="bi bi-stars me-1"></i>B2B CRM KANBAN PRO v4.0</span>' +
              '<span class="fs-12 text-white-50">Kéo-Thả 7 Bước · Stage Gate · Dự báo Lợi nhuận · Chu kỳ Re-order &amp; Phân công Sales</span>' +
            '</div>' +
            '<h2 class="h5 fw-bold mb-0 text-white">Trung tâm Quản lý Quan hệ Khách hàng &amp; Phễu Bán sỉ B2B</h2>' +
          '</div>' +
          '<div class="d-flex flex-wrap gap-2 align-items-center">' +
            '<div class="px-3 py-1 rounded bg-white bg-opacity-10 border border-white border-opacity-10 text-center">' +
              '<div class="fs-12 text-white-50">Tổng Sản lượng Phễu</div>' +
              '<div class="fw-bold fs-6 text-info">' + fmtNum(regStats.total.volume) + ' cuộn (' + fmtNum(regStats.total.count) + ' DN)</div>' +
            '</div>' +
            '<div class="px-3 py-1 rounded bg-white bg-opacity-10 border border-white border-opacity-10 text-center" title="Tổng giá trị phễu quy đổi VNĐ và Doanh thu kỳ vọng theo xác suất thắng 7 bước">' +
              '<div class="fs-12 text-white-50">Doanh thu Phễu / Trọng số</div>' +
              '<div class="fw-bold fs-6 text-success" style="color:#6EE7B7!important">' + fmtMillion(totalMonthlyRev) + ' / ' + fmtMillion(totalWeightedRev) + '</div>' +
            '</div>' +
            '<div class="px-3 py-1 rounded bg-white bg-opacity-10 border border-white border-opacity-10 text-center">' +
              '<div class="fs-12 text-white-50">Đã gửi Sample / Chốt</div>' +
              '<div class="fw-bold fs-6 text-warning">' + fmtNum(regStats.total.sampleSent) + ' / ' + fmtNum(regStats.total.converted) + ' KH</div>' +
            '</div>' +
            '<div class="px-3 py-1 rounded bg-danger bg-opacity-25 border border-danger text-center cursor-pointer" data-switch-tab="audit" title="Bấm để xử lý rủi ro công nợ">' +
              '<div class="fs-12 text-white-50">Cảnh báo Công nợ / SLA</div>' +
              '<div class="fw-bold fs-6 text-white"><i class="bi bi-exclamation-triangle-fill text-warning me-1"></i>' + riskList.length + ' Rủi ro · ' + urgentSlaList.length + ' SLA</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* 2. THANH ĐIỀU HƯỚNG 6 PHÂN HỆ CRM */
      '<div class="card p-2 mb-3">' +
        '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2">' +
          '<ul class="nav nav-pills b2b-subnav gap-1" id="crmSubNav">' +
            '<li class="nav-item">' +
              '<button type="button" class="nav-link ' + (activeTab === 'kanban' ? 'active' : '') + '" data-crm-tab="kanban">' +
                '<i class="bi bi-kanban me-1"></i>1. Bảng Phễu Kanban (7 Bước)' +
              '</button>' +
            '</li>' +
            '<li class="nav-item">' +
              '<button type="button" class="nav-link ' + (activeTab === 'customers' ? 'active' : '') + '" data-crm-tab="customers">' +
                '<i class="bi bi-person-vcard me-1"></i>2. Danh sách 36 KH &amp; Hồ sơ 360°' +
              '</button>' +
            '</li>' +
            '<li class="nav-item">' +
              '<button type="button" class="nav-link ' + (activeTab === 'dashboard' ? 'active' : '') + '" data-crm-tab="dashboard">' +
                '<i class="bi bi-bar-chart-line me-1"></i>3. Dashboard &amp; Định lượng (' + fmtNum(quant.mean) + 'c/KH)' +
              '</button>' +
            '</li>' +
            '<li class="nav-item">' +
              '<button type="button" class="nav-link ' + (activeTab === 'audit' ? 'active' : '') + '" data-crm-tab="audit">' +
                '<i class="bi bi-shield-exclamation me-1"></i>4. Kiểm toán MOQ &amp; Công nợ ' +
                (riskList.length ? '<span class="badge bg-danger ms-1">' + riskList.length + '</span>' : '') +
              '</button>' +
            '</li>' +
            '<li class="nav-item">' +
              '<button type="button" class="nav-link ' + (activeTab === 'route' ? 'active' : '') + '" data-crm-tab="route">' +
                '<i class="bi bi-truck me-1"></i>5. Lịch Sample Kit &amp; Kịch bản Gọi' +
              '</button>' +
            '</li>' +
            '<li class="nav-item">' +
              '<button type="button" class="nav-link ' + (activeTab === 'pricing' ? 'active' : '') + '" data-crm-tab="pricing">' +
                '<i class="bi bi-calculator me-1"></i>6. Tính Giá vốn &amp; Báo giá 3 Bậc' +
              '</button>' +
            '</li>' +
            '<li class="nav-item">' +
              '<button type="button" class="nav-link ' + (activeTab === 'webleads' ? 'active' : '') + '" data-crm-tab="webleads">' +
                '<i class="bi bi-globe me-1"></i>7. Leads Báo giá Web' +
              '</button>' +
            '</li>' +
          '</ul>' +
          '<div class="d-flex gap-2 flex-wrap">' +
            '<button type="button" class="btn btn-sm btn-primary" id="btnAddCrmCustomer">' +
              '<i class="bi bi-plus-lg me-1"></i>Thêm KH B2B' +
            '</button>' +
            '<button type="button" class="btn btn-sm btn-outline-success" id="btnExportCrmCsv" title="Xuất danh sách ra file Excel CSV">' +
              '<i class="bi bi-file-earmark-spreadsheet me-1"></i>Xuất CSV' +
            '</button>' +
            '<button type="button" class="btn btn-sm btn-outline-primary" id="btnBackupCrmJson" title="Sao lưu toàn bộ 36 Hồ sơ, Nhật ký &amp; Lịch sử đơn ra file JSON">' +
              '<i class="bi bi-cloud-arrow-down me-1"></i>Sao lưu JSON' +
            '</button>' +
            '<button type="button" class="btn btn-sm btn-outline-dark" id="btnRestoreCrmJson" title="Khôi phục dữ liệu CRM từ file JSON đã sao lưu">' +
              '<i class="bi bi-cloud-arrow-up me-1"></i>Nạp JSON' +
            '</button>' +
            '<input type="file" id="crmRestoreFileInput" accept=".json,application/json" class="d-none">' +
            '<button type="button" class="btn btn-sm btn-outline-secondary" id="btnResetCrmData" title="Khôi phục 36 KH gốc từ file Excel">' +
              '<i class="bi bi-arrow-counterclockwise"></i>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* 3. KHUNG NỘI DUNG TỪNG TAB */
      '<div id="crmTabBody"></div>';

    var body = $('#crmTabBody', root);
    if (activeTab === 'kanban') {
      renderKanbanTab(body, root, records);
    } else if (activeTab === 'customers') {
      renderCustomersTab(body, root, records);
    } else if (activeTab === 'dashboard') {
      renderDashboardTab(body, root, records);
    } else if (activeTab === 'audit') {
      renderAuditTab(body, root, records, riskList, keyAccounts);
    } else if (activeTab === 'route') {
      renderRouteTab(body, root, records);
    } else if (activeTab === 'pricing') {
      renderPricingTab(body, root);
    } else if (activeTab === 'webleads') {
      renderWebLeadsTab(body, root);
    }

    bindGlobalEvents(root, records);
  }

  /* ======================================================================
   * BỘ LỌC DÙNG CHUNG CHO KANBAN & DANH SÁCH KH
   * ====================================================================== */
  function getFilteredRecords(records) {
    var b2b = Admin.b2b;
    return records.filter(function (rec) {
      if (filterRoute === 'Q12_HM' && rec.routeGroup !== 'Q12_HM' && rec.region !== 'Quận 12' && rec.region !== 'Hóc Môn') return false;
      if (filterRoute === 'BD_BC_LA' && rec.routeGroup !== 'BD_BC_LA' && (rec.region === 'Quận 12' || rec.region === 'Hóc Môn')) return false;
      if (filterSales !== 'all') {
        var repInfo = b2b.getSalesRepInfo ? b2b.getSalesRepInfo(rec) : { id: '' };
        if (repInfo.id !== filterSales) return false;
      }
      if (filterRegion !== 'all' && rec.region !== filterRegion) return false;
      if (filterIndustry !== 'all' && rec.industry !== filterIndustry) return false;
      if (filterStatus !== 'all' && rec.status !== filterStatus) return false;

      var audit = b2b.auditRecord(rec);
      var sla = b2b.evaluateSlaStatus ? b2b.evaluateSlaStatus(rec) : { isUrgent: false };
      if (filterTier === 'SLA_URGENT' && !sla.isUrgent) return false;
      if (filterTier === 'RISK' && !audit.isRisk) return false;
      if (filterTier === 'KEY' && (Number(rec.expectedVolume) || 0) < 1000) return false;
      if (filterTier !== 'all' && filterTier !== 'SLA_URGENT' && filterTier !== 'RISK' && filterTier !== 'KEY' && audit.tier.code !== filterTier) return false;

      if (searchKeyword) {
        var kw = searchKeyword.toLowerCase();
        var hay = [rec.code, rec.company, rec.ward, rec.address, rec.phone, rec.mainProduct, rec.contactPerson, rec.notes, rec.lostReason].join(' ').toLowerCase();
        if (hay.indexOf(kw) === -1) return false;
      }
      return true;
    });
  }

  function renderFilterBarHtml(records, filteredCount, filteredVol, showStatusFilter) {
    var b2b = Admin.b2b;
    var salesReps = b2b.SALES_REPS || [];
    return (
      '<div class="card p-3 mb-3 bg-light border-0">' +
        '<div class="row g-2 align-items-end">' +
          '<div class="col-6 col-md-2">' +
            '<label class="form-label mb-1">Tuyến khảo sát</label>' +
            '<select class="form-select form-select-sm" id="crmFilterRoute">' +
              '<option value="all"' + (filterRoute === 'all' ? ' selected' : '') + '>Toàn bộ 2 Tuyến (' + records.length + ' KH)</option>' +
              '<option value="Q12_HM"' + (filterRoute === 'Q12_HM' ? ' selected' : '') + '>Tuyến 1: Q12 - Hóc Môn (24)</option>' +
              '<option value="BD_BC_LA"' + (filterRoute === 'BD_BC_LA' ? ' selected' : '') + '>Tuyến 2: BD - BC - LA (12)</option>' +
            '</select>' +
          '</div>' +
          '<div class="col-6 col-md-2">' +
            '<label class="form-label mb-1">Sales Phụ trách</label>' +
            '<select class="form-select form-select-sm" id="crmFilterSales">' +
              '<option value="all"' + (filterSales === 'all' ? ' selected' : '') + '>Tất cả Sales (' + salesReps.length + ')</option>' +
              salesReps.map(function (sr) {
                return '<option value="' + esc(sr.id) + '"' + (filterSales === sr.id ? ' selected' : '') + '>' + esc(sr.shortName) + '</option>';
              }).join('') +
            '</select>' +
          '</div>' +
          '<div class="col-6 col-md-2">' +
            '<label class="form-label mb-1">Khu vực</label>' +
            '<select class="form-select form-select-sm" id="crmFilterRegion">' +
              '<option value="all">Tất cả khu vực</option>' +
              b2b.REGIONS.map(function (r) {
                return '<option value="' + esc(r) + '"' + (filterRegion === r ? ' selected' : '') + '>' + esc(r) + '</option>';
              }).join('') +
            '</select>' +
          '</div>' +
          '<div class="col-6 col-md-2">' +
            '<label class="form-label mb-1">Ngành hàng</label>' +
            '<select class="form-select form-select-sm" id="crmFilterIndustry">' +
              '<option value="all">Tất cả ngành</option>' +
              b2b.INDUSTRIES.map(function (ind) {
                return '<option value="' + esc(ind) + '"' + (filterIndustry === ind ? ' selected' : '') + '>' + esc(ind) + '</option>';
              }).join('') +
            '</select>' +
          '</div>' +
          '<div class="col-6 col-md-2">' +
            '<label class="form-label mb-1">Phân bậc MOQ / SLA</label>' +
            '<select class="form-select form-select-sm" id="crmFilterTier">' +
              '<option value="all"' + (filterTier === 'all' ? ' selected' : '') + '>Mọi bậc MOQ &amp; SLA</option>' +
              '<option value="SLA_URGENT"' + (filterTier === 'SLA_URGENT' ? ' selected' : '') + '>⏰ Quá hạn SLA / Cần gọi hôm nay</option>' +
              '<option value="RISK"' + (filterTier === 'RISK' ? ' selected' : '') + '>⚠️ Cảnh báo Rủi ro Công nợ</option>' +
              '<option value="KEY"' + (filterTier === 'KEY' ? ' selected' : '') + '>⭐ Key Account (1.000c/th)</option>' +
              '<option value="TIER-3"' + (filterTier === 'TIER-3' ? ' selected' : '') + '>Bậc 3: 800 - 1.000 cuộn</option>' +
              '<option value="TIER-2"' + (filterTier === 'TIER-2' ? ' selected' : '') + '>Bậc 2: 500 - 799 cuộn</option>' +
              '<option value="TIER-1"' + (filterTier === 'TIER-1' ? ' selected' : '') + '>Bậc 1: 300 - 499 cuộn</option>' +
            '</select>' +
          '</div>' +
          (showStatusFilter ? (
            '<div class="col-6 col-md-2">' +
              '<label class="form-label mb-1">Tìm kiếm nhanh</label>' +
              '<div class="input-group input-group-sm">' +
                '<span class="input-group-text bg-white"><i class="bi bi-search"></i></span>' +
                '<input type="search" class="form-control" id="crmSearchInput" placeholder="Mã KH, công ty..." value="' + esc(searchKeyword) + '">' +
              '</div>' +
            '</div>'
          ) : (
            '<div class="col-6 col-md-2">' +
              '<label class="form-label mb-1">Tìm kiếm Deal</label>' +
              '<div class="input-group input-group-sm">' +
                '<span class="input-group-text bg-white"><i class="bi bi-search"></i></span>' +
                '<input type="search" class="form-control" id="crmSearchInput" placeholder="Mã KH, công ty..." value="' + esc(searchKeyword) + '">' +
              '</div>' +
            '</div>'
          )) +
        '</div>' +
        '<div class="d-flex flex-wrap justify-content-between align-items-center mt-2 pt-2 border-top fs-12 text-ink-3 gap-2">' +
          '<div>Đang hiển thị <strong class="text-ink">' + filteredCount + '</strong> / ' + records.length + ' khách hàng · Tổng sản lượng lọc: <strong class="text-primary">' + fmtNum(filteredVol) + ' cuộn/tháng</strong> · <span class="text-primary"><i class="bi bi-arrows-move me-1"></i>Kéo - thả thẻ Deal giữa 7 cột để chuyển bước</span></div>' +
          '<div class="d-flex gap-1 align-items-center flex-wrap">' +
            '<button type="button" class="btn btn-xs ' + (filterTier === 'all' ? 'btn-dark' : 'btn-outline-secondary') + ' py-0 px-2" data-quick-tier="all">Tất cả (' + records.length + ')</button>' +
            '<button type="button" class="btn btn-xs ' + (filterTier === 'SLA_URGENT' ? 'btn-warning text-dark fw-bold' : 'btn-outline-warning text-dark') + ' py-0 px-2" data-quick-tier="SLA_URGENT"><i class="bi bi-alarm-fill me-1"></i>Cần gọi hôm nay / Quá hạn SLA</button>' +
            '<button type="button" class="btn btn-xs ' + (filterTier === 'RISK' ? 'btn-danger' : 'btn-outline-danger') + ' py-0 px-2" data-quick-tier="RISK"><i class="bi bi-exclamation-triangle-fill me-1"></i>Rủi ro Công nợ Bậc 1</button>' +
            '<button type="button" class="btn btn-xs ' + (filterTier === 'KEY' ? 'btn-success' : 'btn-outline-success') + ' py-0 px-2" data-quick-tier="KEY"><i class="bi bi-star-fill me-1"></i>Key Account 1.000c</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  /* ======================================================================
   * TAB 1: BẢNG PHỄU KANBAN (7 BƯỚC PIPELINE — KÉO THẢ & STAGE GATE)
   * ====================================================================== */
  function renderKanbanTab(container, root, records) {
    var b2b = Admin.b2b;
    var filtered = getFilteredRecords(records);
    var filteredVol = filtered.reduce(function (s, r) { return s + (Number(r.expectedVolume) || 0); }, 0);

    var columnsHtml = b2b.PIPELINE_STAGES.map(function (stage, stageIdx) {
      var stageRecords = filtered.filter(function (r) { return r.status === stage; });
      var stageVol = stageRecords.reduce(function (s, r) { return s + (Number(r.expectedVolume) || 0); }, 0);
      var stageMeta = (b2b.STAGE_META && b2b.STAGE_META[stage]) || { probPct: 0, gateHint: '' };
      var stageRev = 0;
      var stageWeightedRev = 0;
      stageRecords.forEach(function (r) {
        if (b2b.estimateDealFinancials) {
          var fin = b2b.estimateDealFinancials(r);
          stageRev += fin.monthlyRevenue;
          stageWeightedRev += fin.weightedRevenue;
        }
      });

      var isWon = stage === 'Đã chốt đơn';
      var nextStage = stageIdx < 5 ? b2b.PIPELINE_STAGES[stageIdx + 1] : null;

      var cardsHtml = stageRecords.length ? stageRecords.map(function (rec) {
        var audit = b2b.auditRecord(rec);
        var fin = b2b.estimateDealFinancials ? b2b.estimateDealFinancials(rec) : { monthlyRevenue: 0 };
        var sla = b2b.evaluateSlaStatus ? b2b.evaluateSlaStatus(rec) : { state: 'none', isUrgent: false, label: '' };
        var repInfo = b2b.getSalesRepInfo ? b2b.getSalesRepInfo(rec) : { shortName: 'Sales B2B', badgeCls: 'bg-light text-dark border' };
        var isKey = (Number(rec.expectedVolume) || 0) >= 1000;
        var cardCls = 'crm-deal-card ' + (audit.isRisk ? 'is-risk ' : (isKey ? 'is-key ' : '')) + (sla.state === 'overdue' ? 'is-overdue' : '');
        var actCount = Array.isArray(rec.activities) ? rec.activities.length : 0;

        /* Nút thao tác thông minh theo đúng chuẩn 7 bước Kanban B2B */
        var actionBtnHtml = '';
        if (stage === 'Chưa gọi') {
          actionBtnHtml =
            '<div class="d-flex gap-1">' +
              '<button type="button" class="btn btn-xs btn-primary py-0 px-2" data-advance-code="' + esc(rec.code) + '" data-next-stage="Đã gọi - Xin gửi mẫu" title="Gọi nghe máy &amp; Đồng ý nhận Sample Kit (Nhảy sang Bước 3)">' +
                '<i class="bi bi-telephone-check me-1"></i>Xin gửi mẫu' +
              '</button>' +
              '<button type="button" class="btn btn-xs btn-outline-secondary py-0 px-1" data-advance-code="' + esc(rec.code) + '" data-next-stage="Không nghe máy / Gọi lại" title="Không nghe máy / Hẹn gọi lại (Sang Bước 2)">' +
                '<i class="bi bi-telephone-x"></i>' +
              '</button>' +
            '</div>';
        } else if (stage === 'Không nghe máy / Gọi lại') {
          actionBtnHtml =
            '<div class="d-flex gap-1">' +
              '<button type="button" class="btn btn-xs btn-primary py-0 px-2" data-advance-code="' + esc(rec.code) + '" data-next-stage="Đã gọi - Xin gửi mẫu" title="Đã liên hệ lại được -> Xin gửi Sample Kit (Bước 3)">' +
                '<i class="bi bi-telephone-forward me-1"></i>Gửi mẫu' +
              '</button>' +
              '<button type="button" class="btn btn-xs btn-outline-warning text-dark py-0 px-1" data-missed-call="' + esc(rec.code) + '" title="Ghi nhận thêm 1 lần gọi nhỡ &amp; hẹn khung giờ vàng ngày mai">' +
                '+1 K.Nghe' +
              '</button>' +
            '</div>';
        } else if (stage === 'Đang báo giá / Thương lượng') {
          actionBtnHtml =
            '<div class="d-flex gap-1">' +
              '<button type="button" class="btn btn-xs btn-outline-dark py-0 px-2" data-print-quote="' + esc(rec.code) + '" title="Xuất Phiếu Báo Giá Sỉ B2B (In / PDF)">' +
                '<i class="bi bi-file-earmark-pdf text-danger me-1"></i>Báo giá' +
              '</button>' +
              '<button type="button" class="btn btn-xs btn-success py-0 px-2" data-advance-code="' + esc(rec.code) + '" data-next-stage="Đã chốt đơn" title="Chốt đơn B2B (Sang Bước 6)">' +
                'Chốt <i class="bi bi-check2"></i>' +
              '</button>' +
            '</div>';
        } else if (stage === 'Đã chốt đơn') {
          actionBtnHtml =
            '<div class="d-flex gap-1">' +
              '<button type="button" class="btn btn-xs btn-success py-0 px-2" data-create-order="' + esc(rec.code) + '" title="Tạo Đơn hàng B2B sang phân hệ Đơn hàng">' +
                '<i class="bi bi-cart-check me-1"></i>Tạo đơn B2B' +
              '</button>' +
              '<button type="button" class="btn btn-xs btn-outline-secondary py-0 px-1" data-print-quote="' + esc(rec.code) + '" title="In Phiếu Báo Giá">' +
                '<i class="bi bi-printer"></i>' +
              '</button>' +
            '</div>';
        } else if (stage === 'Chưa có nhu cầu') {
          actionBtnHtml =
            '<button type="button" class="btn btn-xs btn-outline-primary py-0 px-2" data-advance-code="' + esc(rec.code) + '" data-next-stage="Đã gọi - Xin gửi mẫu" title="Khôi phục chăm sóc lại Deal này">' +
              '<i class="bi bi-arrow-counterclockwise me-1"></i>Chăm sóc lại' +
            '</button>';
        } else if (nextStage) {
          actionBtnHtml =
            '<button type="button" class="btn btn-xs btn-outline-primary fs-12 py-0 px-2" data-advance-code="' + esc(rec.code) + '" data-next-stage="' + esc(nextStage) + '" title="Chuyển sang: ' + esc(nextStage) + '">' +
              'Bước ' + (stageIdx + 2) + ' <i class="bi bi-arrow-right"></i>' +
            '</button>';
        }

        return (
          '<div class="' + cardCls + '" draggable="true" data-drag-code="' + esc(rec.code) + '">' +
            '<div class="d-flex justify-content-between align-items-start mb-1">' +
              '<div class="d-flex align-items-center gap-1 flex-wrap">' +
                '<span class="badge bg-dark font-monospace">' + esc(rec.code) + '</span>' +
                '<span class="badge ' + audit.tier.badgeCls + '" style="font-size:.66rem">' + esc(audit.tier.code) + '</span>' +
                (isKey ? '<span class="badge bg-success text-white" style="font-size:.65rem">KEY 1.000c</span>' : '') +
              '</div>' +
              '<div class="text-end">' +
                '<div class="fw-bold text-primary fs-12">' + fmtNum(rec.expectedVolume) + ' c/th</div>' +
                '<div class="text-ink-3" style="font-size:.68rem">DT: ~' + fmtMillion(fin.monthlyRevenue) + ' · <span class="text-success fw-semibold" title="Lợi nhuận ròng sau công nợ &amp; xe tải">LN: ' + fmtMillion(fin.monthlyNetProfit || 0) + ' (' + (fin.netMarginPct || 0) + '%)</span></div>' +
              '</div>' +
            '</div>' +
            '<div class="fw-bold fs-13 text-ink mb-1 cursor-pointer" data-open-360="' + esc(rec.code) + '">' +
              esc(rec.company) +
            '</div>' +
            '<div class="fs-12 text-ink-3 mb-1">' +
              '<i class="bi bi-geo-alt me-1"></i>' + esc(rec.region) + ' · ' + esc(rec.ward) +
              (rec.contactPerson ? ' · <strong class="text-dark"><i class="bi bi-person-check text-success"></i> ' + esc(rec.contactPerson) + '</strong>' : '') +
            '</div>' +
            '<div class="d-flex justify-content-between align-items-center fs-12 text-ink-2 mb-2 gap-1">' +
              '<span class="text-truncate"><i class="bi bi-box-seam me-1 text-primary"></i>' + esc(rec.mainProduct) + '</span>' +
              '<span class="badge ' + repInfo.badgeCls + '" style="font-size:.63rem" title="Sales phụ trách: ' + esc(repInfo.name || repInfo.shortName) + '"><i class="bi bi-person-badge me-1"></i>' + esc(repInfo.shortName) + '</span>' +
            '</div>' +
            (sla.label ? (
              '<div class="mb-2">' +
                '<span class="badge ' + sla.badgeCls + ' w-100 text-start fw-normal py-1 px-2" style="font-size:.69rem">' +
                  '<i class="bi ' + (sla.isUrgent ? 'bi-alarm-fill' : 'bi-calendar-event') + ' me-1"></i>' + esc(sla.label) +
                '</span>' +
              '</div>'
            ) : '') +
            (rec.status === 'Không nghe máy / Gọi lại' && (Number(rec.callAttempts) || 0) > 0 ? (
              '<div class="p-1 px-2 mb-2 rounded ' + ((Number(rec.callAttempts) || 0) >= 3 ? 'bg-danger-subtle text-danger-emphasis' : 'bg-warning-subtle text-warning-emphasis') + '" style="font-size:.7rem">' +
                '<i class="bi bi-telephone-x-fill me-1"></i><strong>Đã gọi nhỡ ' + (Number(rec.callAttempts) || 1) + ' lần:</strong> ' +
                ((Number(rec.callAttempts) || 0) >= 3 ? 'Nên ghé kho trực tiếp khi đi tuyến Sample Run' : 'Đổi khung giờ vàng (8h30-10h30 / 14h-16h)') +
              '</div>'
            ) : '') +
            (rec.status === 'Chưa có nhu cầu' && rec.lostReason ? (
              '<div class="p-1 px-2 mb-2 rounded bg-secondary-subtle text-secondary-emphasis" style="font-size:.7rem">' +
                '<i class="bi bi-info-circle me-1"></i><strong>Lý do:</strong> ' + esc(rec.lostReason) +
              '</div>'
            ) : '') +
            (audit.isRisk ? (
              '<div class="p-1 px-2 mb-2 rounded bg-danger-subtle text-danger-emphasis" style="font-size:.7rem">' +
                '<i class="bi bi-exclamation-triangle-fill me-1"></i><strong>Lệch chuẩn Bậc 1:</strong> Cần nâng +' + audit.upsellNeeded + 'c hoặc đổi COD' +
              '</div>'
            ) : '') +
            '<div class="d-flex justify-content-between align-items-center pt-2 border-top gap-1">' +
              '<button type="button" class="btn btn-xs btn-light border fs-12 py-0 px-2" data-open-360="' + esc(rec.code) + '">' +
                '<i class="bi bi-person-lines-fill me-1 text-primary"></i>360°' +
                (actCount ? ' <span class="badge bg-primary-subtle text-primary-emphasis ms-1">' + actCount + '</span>' : '') +
              '</button>' +
              actionBtnHtml +
            '</div>' +
          '</div>'
        );
      }).join('') : (
        '<div class="text-center text-ink-3 py-4 fs-12">Kéo thả Deal vào đây (0 KH)</div>'
      );

      return (
        '<div class="crm-kanban-col ' + (isWon ? 'is-won' : '') + '" data-drop-stage="' + esc(stage) + '">' +
          '<div class="crm-kanban-head" title="' + esc(stageMeta.gateHint || '') + '">' +
            '<div class="d-flex justify-content-between align-items-center mb-1">' +
              '<span class="fw-bold fs-12 text-ink">' + (stageIdx + 1) + '. ' + esc(stage) + '</span>' +
              '<div class="d-flex align-items-center gap-1">' +
                '<span class="badge bg-light text-dark border" style="font-size:.65rem" title="Xác suất chốt đơn (Win Probability)">' + stageMeta.probPct + '%</span>' +
                '<span class="badge ' + (isWon ? 'bg-success' : 'bg-secondary') + '">' + stageRecords.length + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="d-flex justify-content-between align-items-center fs-12 text-ink-3">' +
              '<span>SL: <strong class="text-primary">' + fmtNum(stageVol) + 'c</strong></span>' +
              '<span title="Doanh thu kỳ vọng / Doanh thu trọng số">DT: <strong class="text-success">' + fmtMillion(stageRev) + '</strong> <span class="text-ink-3">(' + fmtMillion(stageWeightedRev) + ')</span></span>' +
            '</div>' +
          '</div>' +
          '<div class="crm-kanban-body">' + cardsHtml + '</div>' +
        '</div>'
      );
    }).join('');

    container.innerHTML =
      renderFilterBarHtml(records, filtered.length, filteredVol, false) +
      '<div class="crm-kanban-board">' + columnsHtml + '</div>';
  }

  /* ======================================================================
   * TAB 2: DANH SÁCH 36 KH & HỒ SƠ KHÁCH HÀNG 360°
   * ====================================================================== */
  function renderCustomersTab(container, root, records) {
    var b2b = Admin.b2b;
    var filtered = getFilteredRecords(records);
    var filteredVol = filtered.reduce(function (s, r) { return s + (Number(r.expectedVolume) || 0); }, 0);

    container.innerHTML =
      renderFilterBarHtml(records, filtered.length, filteredVol, true) +
      '<div class="card">' +
        '<div class="table-responsive">' +
          '<table class="table table-hover align-middle mb-0 fs-13">' +
            '<thead>' +
              '<tr>' +
                '<th>Mã KH</th>' +
                '<th>Doanh nghiệp &amp; Địa chỉ Kho</th>' +
                '<th>Khu vực / Ngành</th>' +
                '<th>SP Chủ lực &amp; SL</th>' +
                '<th>Kiểm toán MOQ &amp; Chính sách</th>' +
                '<th>Trạng thái Gọi (Pipeline)</th>' +
                '<th>KQ Test Mẫu</th>' +
                '<th class="text-end">Hồ sơ 360°</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
              (filtered.length ? filtered.map(function (rec) {
                var audit = b2b.auditRecord(rec);
                var repInfo = b2b.getSalesRepInfo ? b2b.getSalesRepInfo(rec) : { shortName: 'Sales B2B', badgeCls: 'bg-light text-dark border' };
                var isKey = (Number(rec.expectedVolume) || 0) >= 1000;
                var rowCls = audit.isRisk ? 'b2b-audit-risk-row' : (isKey ? 'b2b-key-account-row' : '');
                var actCount = Array.isArray(rec.activities) ? rec.activities.length : 0;

                return (
                  '<tr class="' + rowCls + '">' +
                    '<td>' +
                      '<span class="badge bg-dark font-monospace">' + esc(rec.code) + '</span>' +
                      (isKey ? '<div class="mt-1"><span class="badge bg-success" style="font-size:.65rem">KEY 1000c</span></div>' : '') +
                    '</td>' +
                    '<td style="max-width:270px">' +
                      '<div class="fw-bold text-ink cursor-pointer" data-open-360="' + esc(rec.code) + '">' + esc(rec.company) + '</div>' +
                      '<div class="fs-12 text-ink-3 text-truncate" title="' + esc(rec.address) + '"><i class="bi bi-geo-alt me-1"></i>' + esc(rec.address) + '</div>' +
                      '<div class="fs-12 text-primary"><i class="bi bi-telephone me-1"></i>' + esc(rec.phone) +
                        (rec.contactPerson ? ' · <strong>' + esc(rec.contactPerson) + '</strong>' : '') +
                      '</div>' +
                    '</td>' +
                    '<td>' +
                      '<div class="fw-semibold">' + esc(rec.region) + '</div>' +
                      '<div class="fs-12 text-ink-3">' + esc(rec.ward) + '</div>' +
                      '<div class="d-flex flex-wrap gap-1 mt-1">' +
                        '<span class="badge bg-light text-dark border">' + esc(rec.industry) + '</span>' +
                        '<span class="badge ' + repInfo.badgeCls + '"><i class="bi bi-person-badge me-1"></i>' + esc(repInfo.shortName) + '</span>' +
                      '</div>' +
                    '</td>' +
                    '<td>' +
                      '<div class="fw-semibold text-ink">' + esc(rec.mainProduct) + '</div>' +
                      '<div class="fw-bold text-primary fs-6">' + fmtNum(rec.expectedVolume) + ' <span class="fs-12 fw-normal">cuộn/th</span></div>' +
                      '<span class="badge ' + audit.tier.badgeCls + '">' + esc(audit.tier.shortLabel) + '</span>' +
                    '</td>' +
                    '<td style="max-width:230px">' +
                      '<div class="fs-12 fw-semibold">' + esc(rec.policy) + '</div>' +
                      (audit.isRisk ? (
                        '<div class="mt-1 p-1 rounded bg-danger-subtle text-danger-emphasis fs-12">' +
                          '<i class="bi bi-exclamation-octagon-fill me-1"></i><strong>Rủi ro công nợ Bậc 1</strong>' +
                        '</div>'
                      ) : (
                        '<div class="fs-12 text-success mt-1"><i class="bi bi-check-circle me-1"></i>' + esc(audit.auditLabel) + '</div>'
                      )) +
                    '</td>' +
                    '<td style="min-width:185px">' +
                      '<select class="form-select form-select-sm fs-12" data-inline-status="' + esc(rec.code) + '">' +
                        b2b.PIPELINE_STAGES.map(function (st) {
                          return '<option value="' + esc(st) + '"' + (rec.status === st ? ' selected' : '') + '>' + esc(st) + '</option>';
                        }).join('') +
                      '</select>' +
                    '</td>' +
                    '<td style="min-width:165px">' +
                      '<select class="form-select form-select-sm fs-12" data-inline-sample="' + esc(rec.code) + '">' +
                        b2b.SAMPLE_RESULTS.map(function (sr) {
                          return '<option value="' + esc(sr) + '"' + (rec.sampleResult === sr ? ' selected' : '') + '>' + esc(sr) + '</option>';
                        }).join('') +
                      '</select>' +
                    '</td>' +
                    '<td class="text-end">' +
                      '<button type="button" class="btn btn-sm btn-primary" data-open-360="' + esc(rec.code) + '">' +
                        '<i class="bi bi-person-badge me-1"></i>Hồ sơ 360°' +
                        (actCount ? ' <span class="badge bg-light text-dark ms-1">' + actCount + '</span>' : '') +
                      '</button>' +
                    '</td>' +
                  '</tr>'
                );
              }).join('') : (
                '<tr><td colspan="8" class="text-center py-4 text-ink-3">Không tìm thấy khách hàng phù hợp bộ lọc.</td></tr>'
              )) +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
  }

  /* ======================================================================
   * TAB 3: DASHBOARD & PHÂN TÍCH ĐỊNH LƯỢNG PHỄU (GIAI ĐOẠN 2: DỰ BÁO TÀI CHÍNH)
   * ====================================================================== */
  function renderDashboardTab(container, root, records) {
    var b2b = Admin.b2b;
    var regStats = b2b.computeRegionalStats(records);
    var indStats = b2b.computeIndustryStats(records);
    var pipeStats = b2b.computePipelineStats(records);
    var salesStats = b2b.computeSalesRepStats ? b2b.computeSalesRepStats(records) : { rows: [] };
    var lostStats = b2b.computeLostReasonStats ? b2b.computeLostReasonStats(records) : { totalLost: 0, totalLostVolume: 0, rows: [] };
    var quant = b2b.computeQuantitativeMetrics(records);
    var tiers = b2b.computeTierDistribution(records);

    container.innerHTML =
      /* 0. BẢNG DỰ BÁO TÀI CHÍNH PHỄU 7 BƯỚC (WEIGHTED PIPELINE FINANCIAL FORECAST) */
      '<div class="card mb-3 border-primary-subtle">' +
        '<div class="card-header bg-primary-subtle text-primary-emphasis d-flex flex-wrap justify-content-between align-items-center gap-2">' +
          '<div>' +
            '<h3 class="h6 fw-bold mb-0"><i class="bi bi-cash-stack me-2"></i>Dự Báo Tài Chính Phễu Bán Hàng 7 Bước (Weighted Pipeline Forecast &amp; Net Profit)</h3>' +
            '<div class="fs-12">Tính toán tự động Doanh thu &amp; Lợi nhuận ròng sau khi trừ Giá vốn xưởng, Phụ phí xe tải ghép chuyến và Lãi vốn công nợ 15-30 ngày</div>' +
          '</div>' +
          '<div class="d-flex gap-2">' +
            '<span class="badge bg-primary fs-12">DT Trọng số: ' + fmtNum(pipeStats.total.weightedRevenue) + ' đ/th</span>' +
            '<span class="badge bg-success fs-12">LN Ròng Trọng số: ' + fmtNum(pipeStats.total.weightedNetProfit) + ' đ/th</span>' +
          '</div>' +
        '</div>' +
        '<div class="table-responsive">' +
          '<table class="table table-hover align-middle mb-0 fs-13">' +
            '<thead>' +
              '<tr>' +
                '<th>Bước Pipeline (7 Giai đoạn)</th>' +
                '<th class="num">Xác suất chốt</th>' +
                '<th class="num">Q12 - HM</th>' +
                '<th class="num">BD - BC - LA</th>' +
                '<th class="num">Tổng KH</th>' +
                '<th class="num">Sản lượng (Cuộn)</th>' +
                '<th class="num">Doanh thu 100% (VNĐ)</th>' +
                '<th class="num bg-primary-subtle">DT Trọng số (VNĐ)</th>' +
                '<th class="num bg-success-subtle">LN Ròng Trọng số (VNĐ)</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
              pipeStats.rows.map(function (r, idx) {
                return (
                  '<tr>' +
                    '<td class="fw-semibold">' + (idx + 1) + '. ' + esc(r.stage) + '</td>' +
                    '<td class="num"><span class="badge bg-light text-dark border">' + r.winProbPct + '%</span></td>' +
                    '<td class="num">' + fmtNum(r.countQ12HM) + '</td>' +
                    '<td class="num">' + fmtNum(r.countBDBCLA) + '</td>' +
                    '<td class="num fw-bold">' + fmtNum(r.totalCount) + ' (' + r.pct + '%)</td>' +
                    '<td class="num fw-bold text-primary">' + fmtNum(r.volume) + '</td>' +
                    '<td class="num">' + fmtNum(r.monthlyRevenue) + ' đ</td>' +
                    '<td class="num fw-bold text-primary bg-primary-subtle bg-opacity-25">' + fmtNum(r.weightedRevenue) + ' đ</td>' +
                    '<td class="num fw-bold text-success bg-success-subtle bg-opacity-25">' + fmtNum(r.weightedNetProfit) + ' đ</td>' +
                  '</tr>'
                );
              }).join('') +
              '<tr class="table-light fw-bold">' +
                '<td>' + esc(pipeStats.total.stage) + '</td>' +
                '<td class="num">—</td>' +
                '<td class="num">' + fmtNum(pipeStats.total.countQ12HM) + '</td>' +
                '<td class="num">' + fmtNum(pipeStats.total.countBDBCLA) + '</td>' +
                '<td class="num">' + fmtNum(pipeStats.total.totalCount) + ' (100%)</td>' +
                '<td class="num text-primary">' + fmtNum(pipeStats.total.volume) + '</td>' +
                '<td class="num">' + fmtNum(pipeStats.total.monthlyRevenue) + ' đ</td>' +
                '<td class="num text-primary">' + fmtNum(pipeStats.total.weightedRevenue) + ' đ</td>' +
                '<td class="num text-success">' + fmtNum(pipeStats.total.weightedNetProfit) + ' đ</td>' +
              '</tr>' +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +

      /* 0B. BẢNG KPI HIỆU SUẤT ĐỘI NGŨ SALES B2B THEO TUYẾN & KEY ACCOUNT (GIAI ĐOẠN 4) */
      '<div class="card mb-3 border-success-subtle">' +
        '<div class="card-header bg-success-subtle text-success-emphasis d-flex flex-wrap justify-content-between align-items-center gap-2">' +
          '<div>' +
            '<h3 class="h6 fw-bold mb-0"><i class="bi bi-people-fill me-2"></i>Bảng KPI Hiệu Suất Đội Ngũ Sales B2B Theo Tuyến &amp; Key Account</h3>' +
            '<div class="fs-12">Đo lường tỷ lệ rải hộp mẫu (Sample Kit), tuân thủ SLA 48h, tiến độ chốt sản lượng và Lợi nhuận ròng trọng số của từng Sales</div>' +
          '</div>' +
          '<span class="badge bg-success fs-12">' + salesStats.rows.length + ' Phụ trách Tuyến &amp; KAM</span>' +
        '</div>' +
        '<div class="table-responsive">' +
          '<table class="table table-hover align-middle mb-0 fs-13">' +
            '<thead>' +
              '<tr>' +
                '<th>Nhân sự Sales &amp; Tuyến Phụ trách</th>' +
                '<th class="num">Số KH / Sản lượng</th>' +
                '<th class="num">Đã gửi Sample Kit</th>' +
                '<th class="num">Đang Báo giá / Đã Chốt</th>' +
                '<th class="num">Quá hạn SLA</th>' +
                '<th class="num">DT Trọng số (VNĐ)</th>' +
                '<th class="num">LN Ròng Trọng số</th>' +
                '<th class="text-end">Xem Phễu</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
              salesStats.rows.map(function (st) {
                var rep = st.rep;
                return (
                  '<tr>' +
                    '<td>' +
                      '<div class="d-flex align-items-center gap-2">' +
                        '<span class="badge ' + rep.badgeCls + '">' + esc(rep.shortName) + '</span>' +
                        '<span class="fw-bold text-ink">' + esc(rep.name) + '</span>' +
                      '</div>' +
                      '<div class="fs-12 text-ink-3 mt-1"><i class="bi bi-truck me-1"></i>' + esc(rep.routeFocus) + ' · <i class="bi bi-telephone ms-1 me-1"></i>' + esc(rep.phone) + '</div>' +
                    '</td>' +
                    '<td class="num">' +
                      '<div class="fw-bold">' + fmtNum(st.totalDeals) + ' KH</div>' +
                      '<div class="fs-12 text-primary fw-semibold">' + fmtNum(st.totalVolume) + ' cuộn/th</div>' +
                    '</td>' +
                    '<td class="num">' +
                      '<div class="fw-bold">' + fmtNum(st.sampleSentCount) + ' / ' + fmtNum(st.totalDeals) + ' KH</div>' +
                      '<div class="fs-12 text-ink-3">Đạt ' + st.sampleRatePct + '%</div>' +
                    '</td>' +
                    '<td class="num">' +
                      '<div>BG: <strong>' + fmtNum(st.quotingCount) + '</strong> · Chốt: <strong class="text-success">' + fmtNum(st.wonCount) + ' KH</strong></div>' +
                      '<div class="fs-12 text-success">SL chốt: ' + fmtNum(st.wonVolume) + ' / ' + fmtNum(rep.targetVolume) + 'c (' + st.targetPct + '% KPI)</div>' +
                    '</td>' +
                    '<td class="num">' +
                      (st.overdueSlaCount > 0
                        ? '<span class="badge bg-danger"><i class="bi bi-alarm-fill me-1"></i>' + st.overdueSlaCount + ' trễ SLA</span>'
                        : '<span class="badge bg-success-subtle text-success-emphasis">100% đúng hạn</span>') +
                    '</td>' +
                    '<td class="num fw-bold text-primary">' + fmtNum(st.weightedRevenue) + ' đ</td>' +
                    '<td class="num fw-bold text-success">' + fmtNum(st.weightedNetProfit) + ' đ</td>' +
                    '<td class="text-end">' +
                      '<button type="button" class="btn btn-xs btn-outline-primary py-1 px-2" data-filter-sales-rep="' + esc(rep.id) + '">' +
                        '<i class="bi bi-funnel me-1"></i>Lọc Kanban' +
                      '</button>' +
                    '</td>' +
                  '</tr>'
                );
              }).join('') +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +

      '<div class="row g-3 mb-3">' +
        /* 1. Bảng Khu vực Địa lý */
        '<div class="col-12 col-lg-6">' +
          '<div class="card h-100">' +
            '<div class="card-header"><h3 class="h6 fw-bold mb-0"><i class="bi bi-geo-alt-fill text-primary me-2"></i>1. Tổng hợp Phễu theo Khu vực Địa lý (5 Vùng)</h3></div>' +
            '<div class="table-responsive">' +
              '<table class="table table-hover align-middle mb-0 fs-13">' +
                '<thead><tr><th>Khu vực</th><th class="num">Số KH</th><th class="num">Sản lượng (Cuộn/th)</th><th class="num">Đã gửi mẫu</th><th class="num">Đã chốt</th></tr></thead>' +
                '<tbody>' +
                  regStats.rows.map(function (r) {
                    return '<tr><td class="fw-semibold">' + esc(r.region) + '</td><td class="num">' + fmtNum(r.count) + '</td><td class="num fw-bold text-primary">' + fmtNum(r.volume) + '</td><td class="num">' + fmtNum(r.sampleSent) + '</td><td class="num text-success fw-bold">' + fmtNum(r.converted) + '</td></tr>';
                  }).join('') +
                  '<tr class="table-light fw-bold"><td>' + esc(regStats.total.region) + '</td><td class="num">' + fmtNum(regStats.total.count) + '</td><td class="num text-primary">' + fmtNum(regStats.total.volume) + '</td><td class="num">' + fmtNum(regStats.total.sampleSent) + '</td><td class="num text-success">' + fmtNum(regStats.total.converted) + '</td></tr>' +
                '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +
        '</div>' +

        /* 2. Bảng Nhóm Ngành Hàng */
        '<div class="col-12 col-lg-6">' +
          '<div class="card h-100">' +
            '<div class="card-header"><h3 class="h6 fw-bold mb-0"><i class="bi bi-diagram-3-fill text-primary me-2"></i>2. Tổng hợp Phễu theo Nhóm Ngành Hàng</h3></div>' +
            '<div class="table-responsive">' +
              '<table class="table table-hover align-middle mb-0 fs-13">' +
                '<thead><tr><th>Nhóm ngành</th><th class="num">Q12 - HM</th><th class="num">BD - BC - LA</th><th class="num">Tổng KH</th><th class="num">Sản lượng</th></tr></thead>' +
                '<tbody>' +
                  indStats.rows.map(function (r) {
                    return '<tr><td class="fw-semibold">' + esc(r.industry) + '</td><td class="num">' + fmtNum(r.countQ12HM) + '</td><td class="num">' + fmtNum(r.countBDBCLA) + '</td><td class="num fw-semibold">' + fmtNum(r.totalCount) + '</td><td class="num fw-bold text-primary">' + fmtNum(r.totalVolume) + '</td></tr>';
                  }).join('') +
                  '<tr class="table-light fw-bold"><td>' + esc(indStats.total.industry) + '</td><td class="num">' + fmtNum(indStats.total.countQ12HM) + '</td><td class="num">' + fmtNum(indStats.total.countBDBCLA) + '</td><td class="num">' + fmtNum(indStats.total.totalCount) + '</td><td class="num text-primary">' + fmtNum(indStats.total.totalVolume) + '</td></tr>' +
                '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* 3. Bảng Định lượng & Phân bổ 3 Bậc MOQ */
      '<div class="row g-3 mb-3">' +
        '<div class="col-12 col-lg-6">' +
          '<div class="card h-100">' +
            '<div class="card-header"><h3 class="h6 fw-bold mb-0"><i class="bi bi-calculator-fill text-primary me-2"></i>3. Phân tích Định lượng Sản lượng (Quantitative Metrics)</h3></div>' +
            '<div class="table-responsive">' +
              '<table class="table align-middle mb-0 fs-13">' +
                '<thead><tr><th>Chỉ số thống kê</th><th class="num">Giá trị</th><th>Ý nghĩa Quản trị B2B</th></tr></thead>' +
                '<tbody>' +
                  '<tr><td>Tổng số khách hàng (Count)</td><td class="num fw-bold">' + fmtNum(quant.count) + ' KH</td><td class="fs-12 text-ink-2">24 KH Nội thành (Q12/HM) + 12 KH KCN (BD/BC/LA)</td></tr>' +
                  '<tr><td>Tổng sản lượng (Sum)</td><td class="num fw-bold text-primary">' + fmtNum(quant.sum) + ' cuộn</td><td class="fs-12 text-ink-2">Tương đương ~3.975 cây (6 cuộn/cây)</td></tr>' +
                  '<tr><td>Trung bình (Mean)</td><td class="num fw-bold">' + fmtNum(quant.mean) + ' cuộn/KH</td><td class="fs-12 text-ink-2">KCN (' + fmtNum(quant.kcnMean) + 'c) cao gấp 1,46 lần Nội thành (' + fmtNum(quant.innerMean) + 'c)</td></tr>' +
                  '<tr><td>Trung vị (Median)</td><td class="num fw-bold">' + fmtNum(quant.median) + ' cuộn/KH</td><td class="fs-12 text-ink-2">50% khách hàng đạt từ 600 cuộn/tháng trở lên</td></tr>' +
                  '<tr><td>Nhỏ nhất / Lớn nhất (Min / Max)</td><td class="num fw-bold">' + fmtNum(quant.min) + ' / ' + fmtNum(quant.max) + ' cuộn</td><td class="fs-12 text-ink-2">5 Key Accounts đạt đỉnh 1.000 cuộn/tháng</td></tr>' +
                  '<tr><td>Độ lệch chuẩn (Std Dev)</td><td class="num fw-bold">' + fmtNum(quant.stdDev) + ' cuộn</td><td class="fs-12 text-ink-2">Biên độ phân hóa rõ -> Cần 3 bậc giá MOQ riêng biệt</td></tr>' +
                '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="col-12 col-lg-6">' +
          '<div class="card h-100">' +
            '<div class="card-header"><h3 class="h6 fw-bold mb-0"><i class="bi bi-layers-fill text-primary me-2"></i>4. Phân bổ Khách hàng theo 3 Bậc Sản lượng MOQ</h3></div>' +
            '<div class="table-responsive">' +
              '<table class="table align-middle mb-0 fs-13">' +
                '<thead><tr><th>Bậc MOQ</th><th class="num">Số KH</th><th class="num">Tổng SL</th><th class="num">Tỷ trọng SL</th><th>Chính sách chuẩn</th></tr></thead>' +
                '<tbody>' +
                  tiers.map(function (t) {
                    return (
                      '<tr>' +
                        '<td class="fw-bold">' + esc(t.label) + '</td>' +
                        '<td class="num">' + fmtNum(t.count) + ' (' + t.countPct + '%)</td>' +
                        '<td class="num fw-bold text-primary">' + fmtNum(t.volume) + '</td>' +
                        '<td class="num"><span class="badge bg-primary-subtle text-primary-emphasis">' + t.volumePct + '%</span></td>' +
                        '<td class="fs-12 text-ink-2">' + esc(t.terms) + '</td>' +
                      '</tr>'
                    );
                  }).join('') +
                '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* 5. Bảng Thống kê Lý do Chưa chốt (Bước 7: Lost Reasons Breakdown) */
      '<div class="card">' +
        '<div class="card-header d-flex justify-content-between align-items-center">' +
          '<h3 class="h6 fw-bold mb-0"><i class="bi bi-clipboard-data text-secondary me-2"></i>5. Phân tích Lý do Chưa chốt ở Bước 7 (Lost / Nurture Reasons Breakdown)</h3>' +
          '<span class="badge bg-secondary">' + fmtNum(lostStats.totalLost) + ' KH (' + fmtNum(lostStats.totalLostVolume) + ' cuộn)</span>' +
        '</div>' +
        '<div class="table-responsive">' +
          '<table class="table align-middle mb-0 fs-13">' +
            '<thead><tr><th>Lý do chưa chốt đơn (Bước 7)</th><th class="num">Số KH</th><th class="num">Sản lượng tiềm năng</th><th>Chiến lược tái tiếp cận (Re-engagement)</th></tr></thead>' +
            '<tbody>' +
              lostStats.rows.map(function (lr) {
                return (
                  '<tr>' +
                    '<td class="fw-semibold">' + esc(lr.reason) + '</td>' +
                    '<td class="num fw-bold">' + fmtNum(lr.count) + ' KH</td>' +
                    '<td class="num text-primary fw-semibold">' + fmtNum(lr.volume) + ' cuộn</td>' +
                    '<td class="fs-12 text-ink-2">Tự động nhắc lịch gọi lại sau 30 - 60 ngày khi khách hết hợp đồng/tồn kho cũ.</td>' +
                  '</tr>'
                );
              }).join('') +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
  }

  /* ======================================================================
   * TAB 4: KIỂM TOÁN MOQ & RỦI RO CÔNG NỢ
   * ====================================================================== */
  function renderAuditTab(container, root, records, riskList, keyAccounts) {
    var b2b = Admin.b2b;

    container.innerHTML =
      /* 1. Cảnh báo đỏ 5 KH Bậc 1 (< 500 cuộn) lệch chuẩn công nợ */
      '<div class="card border-danger mb-3">' +
        '<div class="card-header bg-danger-subtle text-danger-emphasis justify-content-between">' +
          '<div>' +
            '<h3 class="h6 fw-bold mb-0"><i class="bi bi-exclamation-octagon-fill me-2"></i>1. Phát hiện Rủi ro Công nợ: Khách hàng Bậc 1 (&lt; 500 cuộn) đang gán Công nợ / Giá Đại lý</h3>' +
            '<div class="fs-12">Theo chuẩn B2B: Khách dưới 500 cuộn/tháng chỉ áp dụng COD hoặc gối đầu tối đa 7 ngày.</div>' +
          '</div>' +
          '<span class="badge bg-danger fs-12">' + riskList.length + ' KH cần điều chỉnh</span>' +
        '</div>' +
        '<div class="table-responsive">' +
          '<table class="table align-middle mb-0 fs-13">' +
            '<thead><tr><th>Mã KH</th><th>Doanh nghiệp</th><th>Khu vực / Ngành</th><th class="num">SL hiện tại</th><th>Chính sách đang gán</th><th class="num">Cần Upsell</th><th>Khuyến nghị &amp; Xử lý nhanh</th></tr></thead>' +
            '<tbody>' +
              (riskList.length ? riskList.map(function (rec) {
                var audit = b2b.auditRecord(rec);
                return (
                  '<tr class="b2b-audit-risk-row">' +
                    '<td><span class="badge bg-danger font-monospace">' + esc(rec.code) + '</span></td>' +
                    '<td class="fw-bold">' + esc(rec.company) + '</td>' +
                    '<td>' + esc(rec.region) + ' · <span class="text-ink-3">' + esc(rec.industry) + '</span></td>' +
                    '<td class="num fw-bold text-danger">' + fmtNum(rec.expectedVolume) + ' cuộn</td>' +
                    '<td><span class="badge bg-warning-subtle text-warning-emphasis border">' + esc(rec.policy) + '</span></td>' +
                    '<td class="num fw-bold text-primary">+' + fmtNum(audit.upsellNeeded) + ' cuộn</td>' +
                    '<td>' +
                      '<div class="fs-12 text-ink-2 mb-1">' + esc(audit.negotiationAction) + '</div>' +
                      '<div class="d-flex gap-1">' +
                        '<button type="button" class="btn btn-xs btn-primary py-0 px-2 fs-12" data-fix-upsell="' + esc(rec.code) + '">' +
                          '<i class="bi bi-arrow-up-circle me-1"></i>Nâng lên 500 cuộn (Bậc 2)' +
                        '</button>' +
                        '<button type="button" class="btn btn-xs btn-outline-dark py-0 px-2 fs-12" data-fix-cod="' + esc(rec.code) + '">' +
                          'Đổi sang COD Bậc 1' +
                        '</button>' +
                      '</div>' +
                    '</td>' +
                  '</tr>'
                );
              }).join('') : (
                '<tr><td colspan="7" class="text-center py-4 text-success fw-semibold"><i class="bi bi-check-circle-fill me-1"></i>Tuyệt vời! Toàn bộ 36 KH đều đã tuân thủ chuẩn MOQ &amp; Công nợ.</td></tr>'
              )) +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +

      /* 2. Danh sách 5 Key Accounts (1.000 cuộn/tháng) */
      '<div class="card border-success mb-3">' +
        '<div class="card-header bg-success-subtle text-success-emphasis justify-content-between">' +
          '<div>' +
            '<h3 class="h6 fw-bold mb-0"><i class="bi bi-trophy-fill me-2"></i>2. Danh sách 5 Key Accounts Chiến lược (1.000 cuộn/tháng — Chiếm 21,0% Tổng sản lượng phễu)</h3>' +
            '<div class="fs-12">Ưu tiên gửi Bộ Sample Kit + Hồ sơ năng lực và chào Hợp đồng nguyên tắc Công nợ 30 ngày.</div>' +
          '</div>' +
          '<span class="badge bg-success fs-12">5.000 cuộn/tháng</span>' +
        '</div>' +
        '<div class="table-responsive">' +
          '<table class="table align-middle mb-0 fs-13">' +
            '<thead><tr><th>Mã KH</th><th>Doanh nghiệp</th><th>Khu vực</th><th>SP Chủ lực</th><th class="num">Sản lượng</th><th>Chiến lược Tiếp cận &amp; Lịch trình</th><th class="text-end">Thao tác</th></tr></thead>' +
            '<tbody>' +
              keyAccounts.map(function (ka) {
                var r = ka.record;
                return (
                  '<tr class="b2b-key-account-row">' +
                    '<td><span class="badge bg-success font-monospace">' + esc(r.code) + '</span></td>' +
                    '<td class="fw-bold">' + esc(r.company) + '</td>' +
                    '<td>' + esc(r.region) + ' (' + esc(r.ward) + ')</td>' +
                    '<td>' + esc(r.mainProduct) + '</td>' +
                    '<td class="num fw-bold text-success">' + fmtNum(r.expectedVolume) + ' cuộn (' + ka.sharePct + '%)</td>' +
                    '<td class="fs-12 text-ink-2">' + esc(ka.playbook) + '</td>' +
                    '<td class="text-end">' +
                      '<button type="button" class="btn btn-sm btn-outline-success" data-open-360="' + esc(r.code) + '">Hồ sơ 360°</button>' +
                    '</td>' +
                  '</tr>'
                );
              }).join('') +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +

      /* 3. BẢNG THEO DÕI CHU KỲ TÁI ĐẶT HÀNG (RE-ORDER) & SỔ ĐÁO HẠN CÔNG NỢ (GIAI ĐOẠN 3) */
      renderRetentionAndCreditTableHtml(records);
  }

  function renderRetentionAndCreditTableHtml(records) {
    var b2b = Admin.b2b;
    var todayStr = b2b.addDaysIso ? b2b.addDaysIso(0) : '';
    var todayMs = todayStr ? new Date(todayStr + 'T00:00:00').getTime() : Date.now();

    var wonList = records.filter(function (r) {
      return r.status === 'Đã chốt đơn' || (Array.isArray(r.orderHistory) && r.orderHistory.length > 0);
    });

    return (
      '<div class="card border-primary">' +
        '<div class="card-header bg-primary-subtle text-primary-emphasis d-flex flex-wrap justify-content-between align-items-center gap-2">' +
          '<div>' +
            '<h3 class="h6 fw-bold mb-0"><i class="bi bi-arrow-repeat me-2"></i>3. Sổ Theo Dõi Chu Kỳ Tái Đặt Hàng (Re-order) &amp; Đáo Hạn Công Nợ B2B (Bước 6: Đã Chốt Đơn)</h3>' +
            '<div class="fs-12">Quản lý vòng đời mua lặp lại hàng tháng (15 / 25 / 30 ngày) và kiểm soát ngày thu hồi công nợ của các khách hàng đã chốt</div>' +
          '</div>' +
          '<div class="d-flex gap-2 align-items-center">' +
            '<span class="badge bg-primary fs-12">' + wonList.length + ' KH Đã chốt / Đặt hàng</span>' +
            '<a href="#/orders" class="btn btn-xs btn-dark"><i class="bi bi-box-arrow-up-right me-1"></i>Mở Phân hệ Đơn hàng (#/orders)</a>' +
          '</div>' +
        '</div>' +
        '<div class="table-responsive">' +
          '<table class="table table-hover align-middle mb-0 fs-13">' +
            '<thead>' +
              '<tr>' +
                '<th>Mã KH &amp; Doanh nghiệp</th>' +
                '<th class="num">Số đơn / Doanh thu lũy kế</th>' +
                '<th>Đơn gần nhất &amp; Chu kỳ</th>' +
                '<th>Lịch gọi Re-order kế tiếp</th>' +
                '<th>Hạn Công nợ &amp; Trạng thái Thu tiền</th>' +
                '<th class="text-end">Thao tác Re-order &amp; Công nợ</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
              (wonList.length ? wonList.map(function (rec) {
                var fin = b2b.estimateDealFinancials(rec);
                var hist = Array.isArray(rec.orderHistory) ? rec.orderHistory : [];
                var orderCount = hist.length || 1;
                var totalCumRev = hist.length
                  ? hist.reduce(function (s, o) { return s + (Number(o.totalAmount) || 0); }, 0)
                  : fin.monthlyRevenue;
                var cycleDays = Number(rec.reorderCycleDays) || 25;
                var lastOrdDate = rec.lastOrderDate || rec.sampleSentDate || todayStr;
                var nextReorder = rec.nextFollowUp || (b2b.addDaysIso ? b2b.addDaysIso(cycleDays) : '');

                var dueStr = rec.creditDueDate || '';
                var payStat = rec.paymentStatus || (fin.creditDays > 0 ? 'Trong hạn công nợ (' + fin.creditDays + 'N)' : 'Đã thu COD');
                var isOverdueCredit = false;
                if (dueStr && payStat.indexOf('Đã thu') === -1) {
                  var dueMs = new Date(dueStr + 'T00:00:00').getTime();
                  if (isFinite(dueMs) && dueMs < todayMs) isOverdueCredit = true;
                }

                return (
                  '<tr>' +
                    '<td>' +
                      '<div class="fw-bold text-ink"><span class="badge bg-dark font-monospace me-1">' + esc(rec.code) + '</span>' + esc(rec.company) + '</div>' +
                      '<div class="fs-12 text-ink-3"><i class="bi bi-telephone me-1"></i>' + esc(rec.phone) + (rec.contactPerson ? ' · <strong>' + esc(rec.contactPerson) + '</strong>' : '') + '</div>' +
                    '</td>' +
                    '<td class="num">' +
                      '<div class="fw-bold text-primary">' + orderCount + ' đơn hàng</div>' +
                      '<div class="fs-12 text-success fw-semibold">' + fmtNum(totalCumRev) + ' đ</div>' +
                    '</td>' +
                    '<td>' +
                      '<div class="fs-12">Đặt gần nhất: <strong>' + esc(lastOrdDate) + '</strong></div>' +
                      '<span class="badge bg-light text-dark border">Chu kỳ: ' + cycleDays + ' ngày/lần</span>' +
                    '</td>' +
                    '<td>' +
                      '<span class="badge bg-info-subtle text-info-emphasis border border-info-subtle"><i class="bi bi-calendar-check me-1"></i>' + esc(nextReorder) + '</span>' +
                    '</td>' +
                    '<td>' +
                      (dueStr ? '<div class="fs-12">Đáo hạn: <strong>' + esc(dueStr) + '</strong></div>' : '') +
                      '<span class="badge ' + (isOverdueCredit ? 'bg-danger' : (payStat.indexOf('Đã thu') !== -1 ? 'bg-success' : 'bg-warning text-dark')) + '">' +
                        (isOverdueCredit ? '⚠️ Quá hạn thu công nợ!' : esc(payStat)) +
                      '</span>' +
                    '</td>' +
                    '<td class="text-end">' +
                      '<div class="d-flex justify-content-end gap-1 flex-wrap">' +
                        (payStat.indexOf('Đã thu') === -1 ? (
                          '<button type="button" class="btn btn-xs btn-outline-success" data-mark-paid="' + esc(rec.code) + '" title="Xác nhận Kế toán đã thu đủ tiền công nợ">' +
                            '<i class="bi bi-check2-all me-1"></i>Đã thu CN' +
                          '</button>'
                        ) : '') +
                        '<button type="button" class="btn btn-xs btn-outline-primary" data-copy-reorder="' + esc(rec.code) + '" title="Copy kịch bản hỏi thăm tồn kho &amp; lấy đơn lặp lại">' +
                          '<i class="bi bi-chat-text me-1"></i>Kịch bản Re-order' +
                        '</button>' +
                        '<button type="button" class="btn btn-xs btn-success" data-create-order="' + esc(rec.code) + '" title="Tạo đơn đặt hàng kỳ mới">' +
                          '<i class="bi bi-cart-plus me-1"></i>Lên đơn mới' +
                        '</button>' +
                      '</div>' +
                    '</td>' +
                  '</tr>'
                );
              }).join('') : (
                '<tr><td colspan="6" class="text-center py-4 text-ink-3">Chưa có khách hàng nào ở Bước 6 (Đã chốt đơn). Hãy kéo Deal sang Bước 6 trên bảng Kanban hoặc bấm nút "Tạo đơn B2B" để theo dõi chu kỳ Re-order &amp; Công nợ tại đây.</td></tr>'
              )) +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>'
    );
  }

  /* ======================================================================
   * TAB 5: LỊCH ĐI TUYẾN SAMPLE KIT & KỊCH BẢN TELESALE
   * ====================================================================== */
  function renderRouteTab(container, root, records) {
    var b2b = Admin.b2b;
    var selectedRec = records.find(function (r) { return r.code === selectedScriptCustomerCode; }) || records[0];

    container.innerHTML =
      '<div class="card mb-3">' +
        '<div class="card-header justify-content-between">' +
          '<h3 class="h6 fw-bold mb-0"><i class="bi bi-calendar-week text-primary me-2"></i>1. Lịch trình Đi Tuyến &amp; Gửi Mẫu Thử (Sample Run) Cố định Hàng Tuần</h3>' +
          '<span class="badge bg-primary-subtle text-primary-emphasis">Tối ưu ghép chuyến xe tải Thứ 3 - Thứ 5 - Thứ 7</span>' +
        '</div>' +
        '<div class="table-responsive">' +
          '<table class="table table-hover align-middle mb-0 fs-13">' +
            '<thead><tr><th>Thứ</th><th>Tuyến Trọng Tâm</th><th>Cụm Phường / KCN</th><th>Hoạt động Buổi Sáng (8h00 - 11h30)</th><th>Hoạt động Buổi Chiều (13h30 - 17h00)</th></tr></thead>' +
            '<tbody>' +
              b2b.WEEKLY_SCHEDULE.map(function (item) {
                return (
                  '<tr>' +
                    '<td><span class="badge bg-' + esc(item.badge) + ' fs-12">' + esc(item.day) + '</span></td>' +
                    '<td class="fw-bold">' + esc(item.route) + '</td>' +
                    '<td class="text-primary fw-semibold">' + esc(item.cluster) + '</td>' +
                    '<td class="fs-12">' + esc(item.morning) + '</td>' +
                    '<td class="fs-12">' + esc(item.afternoon) + '</td>' +
                  '</tr>'
                );
              }).join('') +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +

      '<div class="alert alert-warning border-warning d-flex align-items-center gap-3 mb-3">' +
        '<i class="bi bi-box2-heart-fill fs-3 text-warning-emphasis"></i>' +
        '<div class="fs-13">' +
          '<strong>Tiêu chuẩn đóng gói 01 Hộp Sample Kit Chuẩn:</strong> ' + esc(b2b.SAMPLE_KIT_SPECS) +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-header justify-content-between flex-wrap gap-2">' +
          '<h3 class="h6 fw-bold mb-0"><i class="bi bi-telephone-forward-fill text-primary me-2"></i>2. Trình Tạo Kịch Bản Telesale Cá Nhân Hóa Theo Từng Khách Hàng</h3>' +
          '<div class="d-flex align-items-center gap-2">' +
            '<span class="fs-12 text-ink-3">Chọn KH mục tiêu:</span>' +
            '<select class="form-select form-select-sm" id="crmScriptCustomerSelect" style="min-width:280px">' +
              records.map(function (r) {
                return '<option value="' + esc(r.code) + '"' + (r.code === selectedRec.code ? ' selected' : '') + '>' +
                  esc(r.code) + ' — ' + esc(r.company) + ' (' + esc(r.region) + ')' +
                '</option>';
              }).join('') +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="row g-3">' +
            b2b.TELESALE_SCRIPTS.map(function (sc) {
              var personalized = sc.template
                .replace(/\{contact\}/g, selectedRec.contactPerson || 'Phụ trách Thu mua / Kho')
                .replace(/\{company\}/g, selectedRec.company)
                .replace(/\{location\}/g, selectedRec.ward + ', ' + selectedRec.region);
              return (
                '<div class="col-12 col-lg-4">' +
                  '<div class="p-3 rounded border bg-light h-100 d-flex flex-column justify-content-between">' +
                    '<div>' +
                      '<div class="fw-bold text-primary mb-2">' + esc(sc.title) + '</div>' +
                      '<p class="fs-13 text-ink mb-3" style="line-height:1.55">' + esc(personalized) + '</p>' +
                    '</div>' +
                    '<div class="d-flex justify-content-between align-items-center pt-2 border-top">' +
                      '<span class="fs-12 text-ink-3">SĐT: <strong>' + esc(selectedRec.phone) + '</strong></span>' +
                      '<button type="button" class="btn btn-sm btn-outline-primary" data-copy-script="' + esc(personalized) + '">' +
                        '<i class="bi bi-clipboard me-1"></i>Copy kịch bản' +
                      '</button>' +
                    '</div>' +
                  '</div>' +
                '</div>'
              );
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ======================================================================
   * TAB 6: BẢNG TÍNH GIÁ VỐN, CHIẾT KHẤU 3 BẬC MOQ & BIÊN LỢI NHUẬN RÒNG
   * ====================================================================== */
  function renderPricingTab(container, root) {
    var b2b = Admin.b2b;
    var cfg = b2b.getPricingConfig();

    container.innerHTML =
      '<div class="card mb-3">' +
        '<div class="card-header justify-content-between">' +
          '<div>' +
            '<h3 class="h6 fw-bold mb-0"><i class="bi bi-sliders text-primary me-2"></i>1. Tham số Tài chính &amp; Chiết khấu MOQ (Ô màu vàng cho phép chỉnh sửa trực tiếp)</h3>' +
            '<div class="fs-12 text-ink-3">Thay đổi bất kỳ ô màu vàng nào để tính lại tức thì Giá bán sỉ 3 Bậc và Biên lợi nhuận ròng sau công nợ.</div>' +
          '</div>' +
          '<button type="button" class="btn btn-sm btn-primary" id="btnSavePricingConfig">' +
            '<i class="bi bi-check2-circle me-1"></i>Lưu Cấu hình Giá B2B' +
          '</button>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="row g-3">' +
            '<div class="col-6 col-md-2">' +
              '<label class="form-label">Lãi vốn lưu động (%/tháng)</label>' +
              '<input type="number" step="0.1" class="form-control form-control-sm b2b-input-yellow" id="cfgCapRate" value="' + cfg.workingCapitalRateMonthly + '">' +
            '</div>' +
            '<div class="col-6 col-md-2">' +
              '<label class="form-label">Phụ phí xe tải (đ/cuộn)</label>' +
              '<input type="number" step="50" class="form-control form-control-sm b2b-input-yellow" id="cfgTruckFee" value="' + cfg.truckFeePerRoll + '">' +
            '</div>' +
            '<div class="col-6 col-md-2">' +
              '<label class="form-label">CK Bậc 2: 500-799c (%)</label>' +
              '<input type="number" step="0.5" class="form-control form-control-sm b2b-input-yellow" id="cfgT2Disc" value="' + cfg.tier2DiscountPct + '">' +
            '</div>' +
            '<div class="col-6 col-md-2">' +
              '<label class="form-label">Công nợ Bậc 2 (Ngày)</label>' +
              '<input type="number" step="1" class="form-control form-control-sm b2b-input-yellow" id="cfgT2Days" value="' + cfg.tier2CreditDays + '">' +
            '</div>' +
            '<div class="col-6 col-md-2">' +
              '<label class="form-label">CK Bậc 3: 800-1000c (%)</label>' +
              '<input type="number" step="0.5" class="form-control form-control-sm b2b-input-yellow" id="cfgT3Disc" value="' + cfg.tier3DiscountPct + '">' +
            '</div>' +
            '<div class="col-6 col-md-2">' +
              '<label class="form-label">Công nợ Bậc 3 (Ngày)</label>' +
              '<input type="number" step="1" class="form-control form-control-sm b2b-input-yellow" id="cfgT3Days" value="' + cfg.tier3CreditDays + '">' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-header">' +
          '<h3 class="h6 fw-bold mb-0"><i class="bi bi-table text-primary me-2"></i>2. Bảng Tính Giá Vốn Xuất Xưởng, Báo Giá Sỉ 3 Bậc MOQ &amp; Biên Lợi Nhuận Ròng</h3>' +
        '</div>' +
        '<div class="table-responsive">' +
          '<table class="table table-bordered align-middle mb-0 fs-13">' +
            '<thead>' +
              '<tr>' +
                '<th>Mã SP</th>' +
                '<th>Quy cách Sản phẩm Chủ lực</th>' +
                '<th style="width:125px">Giá vốn Xưởng (đ)</th>' +
                '<th style="width:125px">Giá Bậc 1 (300-499c)</th>' +
                '<th class="num">Biên LN Bậc 1 (COD)</th>' +
                '<th class="num">Giá Bậc 2 (500-799c)</th>' +
                '<th class="num">CP Công nợ B2</th>' +
                '<th class="num">Biên LN Ròng B2</th>' +
                '<th class="num">Giá Bậc 3 (800-1000c)</th>' +
                '<th class="num">CP Công nợ B3</th>' +
                '<th class="num">Biên LN Ròng B3</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
              cfg.products.map(function (p, idx) {
                var cost = Number(p.factoryCost) || 0;
                var p1 = Number(p.tier1BasePrice) || 0;
                var truck = Number(cfg.truckFeePerRoll) || 0;
                var capRate = (Number(cfg.workingCapitalRateMonthly) || 0) / 100;

                var margin1 = p1 > 0 ? ((p1 - cost - truck) / p1) * 100 : 0;

                var p2 = Math.round(p1 * (1 - (Number(cfg.tier2DiscountPct) || 0) / 100));
                var creditCost2 = Math.round(p2 * capRate * ((Number(cfg.tier2CreditDays) || 0) / 30));
                var margin2 = p2 > 0 ? ((p2 - cost - truck - creditCost2) / p2) * 100 : 0;

                var p3 = Math.round(p1 * (1 - (Number(cfg.tier3DiscountPct) || 0) / 100));
                var creditCost3 = Math.round(p3 * capRate * ((Number(cfg.tier3CreditDays) || 0) / 30));
                var margin3 = p3 > 0 ? ((p3 - cost - truck - creditCost3) / p3) * 100 : 0;

                return (
                  '<tr>' +
                    '<td class="fw-bold font-monospace">' + esc(p.code) + '</td>' +
                    '<td>' +
                      '<div class="fw-semibold">' + esc(p.name) + '</div>' +
                      '<div class="fs-12 text-ink-3">' + esc(p.targetIndustries) + '</div>' +
                    '</td>' +
                    '<td><input type="number" step="500" class="form-control form-control-sm b2b-input-yellow text-end" data-prod-cost="' + idx + '" value="' + cost + '"></td>' +
                    '<td><input type="number" step="500" class="form-control form-control-sm b2b-input-yellow text-end" data-prod-p1="' + idx + '" value="' + p1 + '"></td>' +
                    '<td class="num fw-bold text-success">' + margin1.toFixed(1) + '%</td>' +
                    '<td class="num fw-bold text-primary">' + fmtNum(p2) + ' đ</td>' +
                    '<td class="num text-ink-3">' + fmtNum(creditCost2) + ' đ</td>' +
                    '<td class="num fw-bold ' + (margin2 >= 14 ? 'text-primary' : 'text-danger') + '">' + margin2.toFixed(1) + '%</td>' +
                    '<td class="num fw-bold text-primary">' + fmtNum(p3) + ' đ</td>' +
                    '<td class="num text-ink-3">' + fmtNum(creditCost3) + ' đ</td>' +
                    '<td class="num fw-bold ' + (margin3 >= 10 ? 'text-success' : 'text-danger') + '">' + margin3.toFixed(1) + '%</td>' +
                  '</tr>'
                );
              }).join('') +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
  }

  /* ======================================================================
   * MODAL HỒ SƠ KHÁCH HÀNG 360° (CUSTOMER 360° PROFILE & ACTIVITY LOG)
   * ====================================================================== */
  function openCustomer360Modal(code, root) {
    var b2b = Admin.b2b;
    var records = b2b.getRecords();
    var rec = records.find(function (r) { return r.code === code; });
    var isNew = false;

    if (!rec) {
      isNew = true;
      var nextNum = records.length + 1;
      rec = {
        code: 'KH' + String(nextNum).padStart(2, '0'),
        routeGroup: 'Q12_HM',
        region: 'Quận 12',
        ward: '',
        industry: 'Logistics & Kho vận',
        company: '',
        address: '',
        phone: '',
        website: '',
        contactPerson: '',
        mainProduct: 'Màng PE Pallet + Băng keo OPP',
        expectedVolume: 500,
        status: 'Chưa gọi',
        lastCallDate: '',
        sampleSentDate: '',
        sampleResult: 'Chưa gửi',
        policy: 'Công nợ gối đầu 15 ngày',
        nextFollowUp: '',
        notes: '',
        activities: []
      };
    }

    var audit = b2b.auditRecord(rec);
    var fin = b2b.estimateDealFinancials(rec);
    var repInfo = b2b.getSalesRepInfo ? b2b.getSalesRepInfo(rec) : { id: 'SALE_TUAN', name: 'Nguyễn Minh Tuấn', badgeCls: 'bg-primary-subtle' };
    var activities = Array.isArray(rec.activities) ? rec.activities : [];

    var scriptCall1 = b2b.TELESALE_SCRIPTS[0].template
      .replace(/\{contact\}/g, rec.contactPerson || 'Phụ trách Thu mua / Kho')
      .replace(/\{company\}/g, rec.company || 'Quý công ty')
      .replace(/\{location\}/g, (rec.ward ? rec.ward + ', ' : '') + rec.region);

    var modalId = 'crmCustomer360Modal';
    var existing = document.getElementById(modalId);
    if (existing) existing.remove();

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="modal fade" id="' + modalId + '" tabindex="-1" aria-hidden="true">' +
        '<div class="modal-dialog modal-xl modal-dialog-scrollable">' +
          '<div class="modal-content">' +
            '<div class="modal-header bg-dark text-white">' +
              '<div>' +
                '<div class="d-flex align-items-center gap-2">' +
                  '<span class="badge bg-info text-dark font-monospace">' + esc(rec.code) + '</span>' +
                  '<span class="badge ' + audit.tier.badgeCls + '">' + esc(audit.tier.name) + '</span>' +
                  (audit.isRisk ? '<span class="badge bg-danger">CẢNH BÁO RỦI RO CÔNG NỢ BẬC 1</span>' : '<span class="badge bg-success">Chuẩn định mức MOQ</span>') +
                '</div>' +
                '<h5 class="modal-title fw-bold mt-1">' + (isNew ? 'Thêm Khách hàng B2B Mới' : esc(rec.company)) + '</h5>' +
              '</div>' +
              '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Đóng"></button>' +
            '</div>' +
            '<div class="modal-body">' +
              '<div class="row g-4">' +
                /* Cột Trái: Form Thông tin Doanh nghiệp & Trạng thái Phễu */
                '<div class="col-12 col-lg-7 border-end">' +
                  '<h6 class="fw-bold text-primary mb-3"><i class="bi bi-building me-1"></i>1. Hồ sơ Doanh nghiệp &amp; Trạng thái Phễu</h6>' +
                  '<div class="row g-2">' +
                    '<div class="col-4 col-md-3">' +
                      '<label class="form-label">Mã KH</label>' +
                      '<input type="text" class="form-control form-control-sm font-monospace fw-bold" id="m360Code" value="' + esc(rec.code) + '" ' + (!isNew ? 'readonly' : '') + '>' +
                    '</div>' +
                    '<div class="col-8 col-md-9">' +
                      '<label class="form-label">Tên Doanh nghiệp / Xưởng / Kho *</label>' +
                      '<input type="text" class="form-control form-control-sm fw-bold" id="m360Company" value="' + esc(rec.company) + '">' +
                    '</div>' +
                    '<div class="col-6 col-md-4">' +
                      '<label class="form-label">Khu vực</label>' +
                      '<select class="form-select form-select-sm" id="m360Region">' +
                        b2b.REGIONS.map(function (r) {
                          return '<option value="' + esc(r) + '"' + (rec.region === r ? ' selected' : '') + '>' + esc(r) + '</option>';
                        }).join('') +
                      '</select>' +
                    '</div>' +
                    '<div class="col-6 col-md-4">' +
                      '<label class="form-label">Phường / Xã / KCN</label>' +
                      '<input type="text" class="form-control form-control-sm" id="m360Ward" value="' + esc(rec.ward) + '">' +
                    '</div>' +
                    '<div class="col-12 col-md-4">' +
                      '<label class="form-label">Nhóm Ngành Hàng</label>' +
                      '<select class="form-select form-select-sm" id="m360Industry">' +
                        b2b.INDUSTRIES.map(function (ind) {
                          return '<option value="' + esc(ind) + '"' + (rec.industry === ind ? ' selected' : '') + '>' + esc(ind) + '</option>';
                        }).join('') +
                      '</select>' +
                    '</div>' +
                    '<div class="col-12">' +
                      '<label class="form-label">Địa chỉ Kho / Nhà máy</label>' +
                      '<input type="text" class="form-control form-control-sm" id="m360Address" value="' + esc(rec.address) + '">' +
                    '</div>' +
                    '<div class="col-6 col-md-4">' +
                      '<label class="form-label">Điện thoại</label>' +
                      '<input type="text" class="form-control form-control-sm" id="m360Phone" value="' + esc(rec.phone) + '">' +
                    '</div>' +
                    '<div class="col-6 col-md-4">' +
                      '<label class="form-label">Người liên hệ (Thu mua/Quản kho)</label>' +
                      '<input type="text" class="form-control form-control-sm" id="m360Contact" value="' + esc(rec.contactPerson) + '" placeholder="Anh/Chị...">' +
                    '</div>' +
                    '<div class="col-12 col-md-4">' +
                      '<label class="form-label">Website</label>' +
                      '<input type="text" class="form-control form-control-sm" id="m360Website" value="' + esc(rec.website) + '">' +
                    '</div>' +
                    '<div class="col-5">' +
                      '<label class="form-label">Sản phẩm chào chủ lực</label>' +
                      '<input type="text" class="form-control form-control-sm" id="m360Product" value="' + esc(rec.mainProduct) + '">' +
                    '</div>' +
                    '<div class="col-4">' +
                      '<label class="form-label">Mã SKU Định giá chuẩn</label>' +
                      '<select class="form-select form-select-sm" id="m360PrimarySku">' +
                        '<option value="AUTO"' + ((!rec.primarySku || rec.primarySku === 'AUTO') ? ' selected' : '') + '>Tự động theo tên SP</option>' +
                        '<option value="MIX_PE_OPP"' + (rec.primarySku === 'MIX_PE_OPP' ? ' selected' : '') + '>MIX: 35% PE + 65% OPP</option>' +
                        '<option value="PE-01"' + (rec.primarySku === 'PE-01' ? ' selected' : '') + '>PE-01: Màng PE 2.6kg (108k)</option>' +
                        '<option value="PE-02"' + (rec.primarySku === 'PE-02' ? ' selected' : '') + '>PE-02: Màng PE 3.2kg (132k)</option>' +
                        '<option value="PE-03"' + (rec.primarySku === 'PE-03' ? ' selected' : '') + '>PE-03: Màng PE Chịu lạnh (135k)</option>' +
                        '<option value="OPP-01"' + (rec.primarySku === 'OPP-01' ? ' selected' : '') + '>OPP-01: Băng keo 100Y (11.5k)</option>' +
                        '<option value="OPP-02"' + (rec.primarySku === 'OPP-02' ? ' selected' : '') + '>OPP-02: Băng keo 200Y (21.5k)</option>' +
                      '</select>' +
                    '</div>' +
                    '<div class="col-3">' +
                      '<label class="form-label">Sản lượng (Cuộn/th)</label>' +
                      '<input type="number" step="50" class="form-control form-control-sm b2b-input-yellow" id="m360Volume" value="' + (Number(rec.expectedVolume) || 0) + '">' +
                    '</div>' +
                    '<div class="col-6">' +
                      '<label class="form-label">Trạng thái Gọi (7 bước Pipeline)</label>' +
                      '<select class="form-select form-select-sm" id="m360Status">' +
                        b2b.PIPELINE_STAGES.map(function (st) {
                          return '<option value="' + esc(st) + '"' + (rec.status === st ? ' selected' : '') + '>' + esc(st) + '</option>';
                        }).join('') +
                      '</select>' +
                    '</div>' +
                    '<div class="col-6">' +
                      '<label class="form-label">Kết quả Test Mẫu (Sample Kit)</label>' +
                      '<select class="form-select form-select-sm" id="m360Sample">' +
                        b2b.SAMPLE_RESULTS.map(function (sr) {
                          return '<option value="' + esc(sr) + '"' + (rec.sampleResult === sr ? ' selected' : '') + '>' + esc(sr) + '</option>';
                        }).join('') +
                      '</select>' +
                    '</div>' +
                    '<div class="col-4">' +
                      '<label class="form-label">Ngày gọi gần nhất</label>' +
                      '<input type="date" class="form-control form-control-sm" id="m360LastCall" value="' + esc(rec.lastCallDate || '') + '">' +
                    '</div>' +
                    '<div class="col-4">' +
                      '<label class="form-label">Ngày gửi Sample Kit</label>' +
                      '<input type="date" class="form-control form-control-sm" id="m360SampleDate" value="' + esc(rec.sampleSentDate || '') + '">' +
                    '</div>' +
                    '<div class="col-4">' +
                      '<label class="form-label">Ngày Follow-up kế tiếp</label>' +
                      '<input type="date" class="form-control form-control-sm" id="m360FollowUp" value="' + esc(rec.nextFollowUp || '') + '">' +
                    '</div>' +
                    '<div class="col-6">' +
                      '<label class="form-label">Chính sách Đề xuất (Công nợ / Giao hàng)</label>' +
                      '<input type="text" class="form-control form-control-sm" id="m360Policy" value="' + esc(rec.policy) + '">' +
                    '</div>' +
                    '<div class="col-6">' +
                      '<label class="form-label">Sales Phụ trách Tuyến / KAM</label>' +
                      '<select class="form-select form-select-sm" id="m360SalesRep">' +
                        (b2b.SALES_REPS || []).map(function (sr) {
                          return '<option value="' + esc(sr.id) + '"' + (repInfo.id === sr.id ? ' selected' : '') + '>' + esc(sr.name) + '</option>';
                        }).join('') +
                      '</select>' +
                    '</div>' +
                    '<div class="col-12">' +
                      '<label class="form-label">Ghi chú Đặc thù Kho &amp; Nhu cầu</label>' +
                      '<textarea class="form-control form-control-sm" rows="2" id="m360Notes">' + esc(rec.notes) + '</textarea>' +
                    '</div>' +
                  '</div>' +

                  /* Khung Kiểm toán MOQ, Dự toán Lợi Nhuận Ròng & Lịch Xe Tải (Tự động cập nhật) */
                  '<div id="m360LiveAuditBox" class="mt-3 p-3 rounded border ' + (audit.isRisk ? 'bg-danger-subtle border-danger' : 'bg-light') + '">' +
                    '<div class="d-flex justify-content-between align-items-center mb-1">' +
                      '<div class="fw-bold fs-13"><i class="bi bi-shield-check me-1"></i>Kiểm toán MOQ, Lợi Nhuận Ròng &amp; Lịch Xe Tải:</div>' +
                      '<span class="badge ' + audit.tier.badgeCls + '" id="m360LiveTierBadge">' + esc(audit.tier.name) + '</span>' +
                    '</div>' +
                    '<div class="fs-12 mb-1 text-primary-emphasis" id="m360LiveFinancial">' +
                      '• <strong>Dự toán Tài chính (' + esc(fin.skuCode) + '):</strong> Đơn giá sau CK (' + fin.discountPct + '%): <strong>' + fmtNum(fin.netUnitPrice) + ' đ/c</strong> · Doanh thu: <strong>' + fmtNum(fin.monthlyRevenue) + ' đ/th</strong> · Lợi nhuận ròng: <strong class="text-success">' + fmtNum(fin.monthlyNetProfit) + ' đ/th (' + fin.netMarginPct + '%)</strong>' +
                    '</div>' +
                    '<div class="fs-12 mb-1" id="m360LiveAction">• <strong>Khuyến nghị Đàm phán:</strong> ' + esc(audit.negotiationAction) + '</div>' +
                    '<div class="fs-12" id="m360LiveTruck">• <strong>Lịch xe tải tối ưu:</strong> ' + esc(audit.truckSchedule) + '</div>' +
                  '</div>' +

                  '<div class="mt-3 p-3 rounded border bg-primary-subtle border-primary-subtle">' +
                    '<div class="d-flex justify-content-between align-items-center mb-1">' +
                      '<span class="fw-bold fs-12 text-primary-emphasis"><i class="bi bi-telephone-outbound me-1"></i>Kịch bản Telesale gợi ý cho ' + esc(rec.code) + ':</span>' +
                      '<button type="button" class="btn btn-xs btn-primary py-0 px-2 fs-12" id="btnCopy360Script">Copy</button>' +
                    '</div>' +
                    '<div class="fs-12 text-ink">' + esc(scriptCall1) + '</div>' +
                  '</div>' +
                '</div>' +

                /* Cột Phải: Nhật ký Chăm sóc & Lịch sử Telesale (Activity Timeline) */
                '<div class="col-12 col-lg-5">' +
                  '<h6 class="fw-bold text-primary mb-3"><i class="bi bi-clock-history me-1"></i>2. Nhật ký Chăm sóc &amp; Lịch sử Telesale (CRM Timeline)</h6>' +
                  (isNew ? (
                    '<div class="alert alert-info fs-12">Hãy lưu khách hàng mới trước khi ghi nhật ký cuộc gọi.</div>'
                  ) : (
                    '<div class="p-3 rounded border bg-light mb-3">' +
                      '<label class="form-label mb-1">Ghi nhận Tương tác / Cuộc gọi mới</label>' +
                      '<select class="form-select form-select-sm mb-2" id="m360ActType">' +
                        '<option value="Gọi Telesale Lần 1">📞 Gọi Telesale Lần 1 (Xin gửi Sample Kit)</option>' +
                        '<option value="Gửi hộp Sample Kit">📦 Đã gửi Hộp Sample Kit tận kho</option>' +
                        '<option value="Gọi Follow-up Lần 2">🔄 Gọi Follow-up Lần 2 (Hỏi kết quả test mẫu)</option>' +
                        '<option value="Gửi Báo giá Sỉ">💰 Đã gửi Bảng Báo giá Sỉ 3 Bậc MOQ qua Zalo</option>' +
                        '<option value="Đàm phán Công nợ / MOQ">🤝 Đàm phán định mức MOQ &amp; Công nợ</option>' +
                        '<option value="Chốt đơn hàng">✅ Đã chốt đơn hàng B2B</option>' +
                      '</select>' +
                      '<textarea class="form-control form-control-sm mb-2" rows="2" id="m360ActNote" placeholder="Nhập kết quả cuộc gọi, tên người nhận mẫu, phản hồi độ dính/độ dẻo PE..."></textarea>' +
                      '<button type="button" class="btn btn-sm btn-primary w-100" id="btnAdd360Activity">' +
                        '<i class="bi bi-journal-plus me-1"></i>Ghi vào Nhật ký Chăm sóc' +
                      '</button>' +
                    '</div>' +
                    '<div id="m360TimelineList" class="crm-timeline">' +
                      renderTimelineItemsHtml(activities, rec) +
                    '</div>'
                  )) +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer justify-content-between flex-wrap gap-2">' +
              '<div class="d-flex gap-2 flex-wrap">' +
                (!isNew ? '<button type="button" class="btn btn-sm btn-outline-danger" id="btnDelete360Customer"><i class="bi bi-trash me-1"></i>Xóa KH</button>' : '') +
                (!isNew ? '<button type="button" class="btn btn-sm btn-outline-dark" id="btnPrintQuote360"><i class="bi bi-file-earmark-pdf text-danger me-1"></i>Xuất Báo giá B2B (In / PDF)</button>' : '') +
                (!isNew ? '<button type="button" class="btn btn-sm btn-outline-success" id="btnCreateOrder360"><i class="bi bi-cart-check me-1"></i>Tạo Đơn hàng B2B</button>' : '') +
              '</div>' +
              '<div class="d-flex gap-2">' +
                '<button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Đóng</button>' +
                '<button type="button" class="btn btn-sm btn-primary" id="btnSave360Customer"><i class="bi bi-check2-circle me-1"></i>Lưu Hồ sơ Khách hàng</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(wrap.firstElementChild);
    var modalEl = document.getElementById(modalId);
    var bsModal = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', function () {
      modalEl.remove();
    });
    bsModal.show();

    var btnQuote360 = $('#btnPrintQuote360', modalEl);
    if (btnQuote360) {
      btnQuote360.addEventListener('click', function () {
        bsModal.hide();
        setTimeout(function () { openPrintableQuoteModal(rec.code); }, 250);
      });
    }

    var btnOrder360 = $('#btnCreateOrder360', modalEl);
    if (btnOrder360) {
      btnOrder360.addEventListener('click', function () {
        bsModal.hide();
        setTimeout(function () { openCreateB2BOrderModal(rec.code, root); }, 250);
      });
    }

    var btnCopy = $('#btnCopy360Script', modalEl);
    if (btnCopy) {
      btnCopy.addEventListener('click', function () {
        navigator.clipboard.writeText(scriptCall1);
        ui.toast('Đã copy kịch bản Telesale cho ' + rec.code, 'success');
      });
    }

    // Tự động tính lại Kiểm toán MOQ & Dự toán Lợi nhuận ròng khi thay đổi Sản lượng / SKU / Chính sách / Khu vực
    ['#m360Volume', '#m360Policy', '#m360Region', '#m360PrimarySku', '#m360Product', '#m360Status'].forEach(function (sel) {
      var el = $(sel, modalEl);
      if (!el) return;
      var evtName = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evtName, function () {
        var tempRec = {
          code: $('#m360Code', modalEl).value,
          region: $('#m360Region', modalEl).value,
          mainProduct: $('#m360Product', modalEl).value,
          primarySku: $('#m360PrimarySku', modalEl) ? $('#m360PrimarySku', modalEl).value : 'AUTO',
          status: $('#m360Status', modalEl).value,
          expectedVolume: Number($('#m360Volume', modalEl).value) || 0,
          policy: $('#m360Policy', modalEl).value
        };
        var liveAudit = b2b.auditRecord(tempRec);
        var liveFin = b2b.estimateDealFinancials(tempRec);
        var box = $('#m360LiveAuditBox', modalEl);
        if (box) {
          box.className = 'mt-3 p-3 rounded border ' + (liveAudit.isRisk ? 'bg-danger-subtle border-danger' : 'bg-light');
        }
        var badge = $('#m360LiveTierBadge', modalEl);
        if (badge) {
          badge.className = 'badge ' + liveAudit.tier.badgeCls;
          badge.textContent = liveAudit.tier.name;
        }
        var finEl = $('#m360LiveFinancial', modalEl);
        if (finEl) {
          finEl.innerHTML = '• <strong>Dự toán Tài chính (' + esc(liveFin.skuCode) + '):</strong> Đơn giá sau CK (' + liveFin.discountPct + '%): <strong>' + fmtNum(liveFin.netUnitPrice) + ' đ/c</strong> · Doanh thu: <strong>' + fmtNum(liveFin.monthlyRevenue) + ' đ/th</strong> · Lợi nhuận ròng: <strong class="text-success">' + fmtNum(liveFin.monthlyNetProfit) + ' đ/th (' + liveFin.netMarginPct + '%)</strong>';
        }
        var actEl = $('#m360LiveAction', modalEl);
        if (actEl) actEl.innerHTML = '• <strong>Khuyến nghị Đàm phán:</strong> ' + esc(liveAudit.negotiationAction);
        var trkEl = $('#m360LiveTruck', modalEl);
        if (trkEl) trkEl.innerHTML = '• <strong>Lịch xe tải tối ưu:</strong> ' + esc(liveAudit.truckSchedule);
      });
    });

    var btnAddAct = $('#btnAdd360Activity', modalEl);
    if (btnAddAct) {
      btnAddAct.addEventListener('click', function () {
        var type = $('#m360ActType', modalEl).value;
        var note = $('#m360ActNote', modalEl).value.trim();
        if (!note) {
          ui.toast('Vui lòng nhập nội dung ghi chú cuộc gọi/chăm sóc.', 'warning');
          return;
        }
        var updated = b2b.addActivity(rec.code, type, note);
        if (updated) {
          $('#m360ActNote', modalEl).value = '';
          $('#m360TimelineList', modalEl).innerHTML = renderTimelineItemsHtml(updated.activities || [], updated);
          ui.toast('Đã lưu lịch sử chăm sóc cho ' + rec.code, 'success');
          renderWorkspace(root);
        }
      });
    }

    var btnSave = $('#btnSave360Customer', modalEl);
    if (btnSave) {
      btnSave.addEventListener('click', function () {
        var companyVal = $('#m360Company', modalEl).value.trim();
        if (!companyVal) {
          ui.toast('Vui lòng nhập tên Doanh nghiệp.', 'warning');
          return;
        }
        var list = b2b.getRecords();
        var regionVal = $('#m360Region', modalEl).value;
        var target = isNew ? rec : list.find(function (r) { return r.code === rec.code; });
        if (!target) return;

        target.code = $('#m360Code', modalEl).value.trim() || rec.code;
        target.company = companyVal;
        target.region = regionVal;
        target.routeGroup = (regionVal === 'Quận 12' || regionVal === 'Hóc Môn') ? 'Q12_HM' : 'BD_BC_LA';
        target.ward = $('#m360Ward', modalEl).value.trim();
        target.industry = $('#m360Industry', modalEl).value;
        target.address = $('#m360Address', modalEl).value.trim();
        target.phone = $('#m360Phone', modalEl).value.trim();
        target.contactPerson = $('#m360Contact', modalEl).value.trim();
        target.website = $('#m360Website', modalEl).value.trim();
        target.mainProduct = $('#m360Product', modalEl).value.trim();
        target.primarySku = $('#m360PrimarySku', modalEl) ? $('#m360PrimarySku', modalEl).value : 'AUTO';
        target.expectedVolume = Number($('#m360Volume', modalEl).value) || 300;
        target.status = $('#m360Status', modalEl).value;
        target.sampleResult = $('#m360Sample', modalEl).value;
        target.lastCallDate = $('#m360LastCall', modalEl).value;
        target.sampleSentDate = $('#m360SampleDate', modalEl).value;
        target.nextFollowUp = $('#m360FollowUp', modalEl).value;
        target.policy = $('#m360Policy', modalEl).value.trim();
        target.assignedSales = $('#m360SalesRep', modalEl) ? $('#m360SalesRep', modalEl).value : target.assignedSales;
        target.notes = $('#m360Notes', modalEl).value.trim();

        if (isNew) list.unshift(target);
        b2b.saveRecords(list);
        if (Admin.refreshBadges) Admin.refreshBadges();
        bsModal.hide();
        ui.toast('Đã lưu hồ sơ khách hàng ' + target.code, 'success');
        renderWorkspace(root);
      });
    }

    var btnDel = $('#btnDelete360Customer', modalEl);
    if (btnDel) {
      btnDel.addEventListener('click', function () {
        ui.confirm({
          title: 'Xóa khách hàng ' + rec.code,
          message: 'Bạn có chắc muốn xóa ' + rec.company + ' khỏi phễu CRM B2B?',
          okText: 'Xóa',
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          var list = b2b.getRecords().filter(function (r) { return r.code !== rec.code; });
          b2b.saveRecords(list);
          if (Admin.refreshBadges) Admin.refreshBadges();
          bsModal.hide();
          ui.toast('Đã xóa khách hàng ' + rec.code, 'info');
          renderWorkspace(root);
        });
      });
    }
  }

  function renderTimelineItemsHtml(activities, rec) {
    var html = '';
    if (Array.isArray(activities) && activities.length > 0) {
      html += activities.map(function (act) {
        return (
          '<div class="crm-timeline-item">' +
            '<div class="p-2 px-3 rounded border bg-white shadow-sm">' +
              '<div class="d-flex justify-content-between align-items-center mb-1">' +
                '<span class="badge bg-primary-subtle text-primary-emphasis">' + esc(act.type) + '</span>' +
                '<span class="fs-12 text-ink-3">' + esc(act.time) + '</span>' +
              '</div>' +
              '<div class="fs-13 text-ink">' + esc(act.note) + '</div>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    }
    html +=
      '<div class="crm-timeline-item">' +
        '<div class="p-2 px-3 rounded border bg-light">' +
          '<div class="d-flex justify-content-between align-items-center mb-1">' +
            '<span class="badge bg-secondary">Khởi tạo Hồ sơ B2B</span>' +
            '<span class="fs-12 text-ink-3">Dữ liệu gốc</span>' +
          '</div>' +
          '<div class="fs-12 text-ink-2">' + esc(rec.notes || 'Khách hàng mục tiêu trong danh sách khảo sát.') + '</div>' +
        '</div>' +
      '</div>';
    return html;
  }

  /* ======================================================================
   * CHUYỂN BƯỚC THÔNG MINH & CHỐT CHẶN NGHIỆP VỤ (7-STEP STAGE GATES)
   * ====================================================================== */
  function transitionDealStage(code, nextStage, root) {
    var b2b = Admin.b2b;
    var list = b2b.getRecords();
    var rec = list.find(function (r) { return r.code === code; });
    if (!rec || !nextStage || rec.status === nextStage) return;

    var oldStage = rec.status;
    var today = b2b.addDaysIso ? b2b.addDaysIso(0) : '';

    // STAGE GATE BƯỚC 3: Đã gọi - Xin gửi mẫu -> Kiểm tra Người nhận mẫu tại kho
    if (nextStage === 'Đã gọi - Xin gửi mẫu' && !String(rec.contactPerson || '').trim()) {
      openStageGateStep3Modal(rec, oldStage, nextStage, root);
      return;
    }

    // STAGE GATE BƯỚC 5: Đang báo giá / Thương lượng -> Chốt chặn Rủi ro Công nợ Bậc 1 (< 500 cuộn)
    if ((nextStage === 'Đang báo giá / Thương lượng' || nextStage === 'Đã chốt đơn') && b2b.auditRecord(rec).isRisk) {
      openStageGateStep5RiskModal(rec, oldStage, nextStage, root);
      return;
    }

    // STAGE GATE BƯỚC 7: Chưa có nhu cầu -> Bắt buộc chọn Lý do chưa chốt & Ngày hẹn gọi lại
    if (nextStage === 'Chưa có nhu cầu') {
      openStageGateStep7LostModal(rec, oldStage, nextStage, root);
      return;
    }

    // Áp dụng quy tắc SLA tự động cho các bước còn lại
    rec.status = nextStage;
    rec.lastCallDate = today || rec.lastCallDate;

    var gateLog = 'Chuyển từ "' + oldStage + '" sang "' + nextStage + '".';

    if (nextStage === 'Không nghe máy / Gọi lại') {
      rec.callAttempts = (Number(rec.callAttempts) || 0) + 1;
      rec.nextFollowUp = b2b.addDaysIso ? b2b.addDaysIso(1) : rec.nextFollowUp;
      gateLog += ' Ghi nhận gọi nhỡ lần ' + rec.callAttempts + ', tự động hẹn gọi lại khung giờ vàng ngày mai (' + rec.nextFollowUp + ').';
    } else if (nextStage === 'Đã gọi - Xin gửi mẫu') {
      rec.nextFollowUp = b2b.addDaysIso ? b2b.addDaysIso(2) : rec.nextFollowUp;
      gateLog += ' Lên lịch ghép tuyến giao Sample Kit cho ' + (rec.contactPerson || 'Quản kho') + '.';
    } else if (nextStage === 'Đã gửi Sample Kit') {
      rec.sampleSentDate = today || rec.sampleSentDate;
      if (!rec.sampleResult || rec.sampleResult === 'Chưa gửi') {
        rec.sampleResult = 'Đang test tại kho';
      }
      rec.nextFollowUp = b2b.addDaysIso ? b2b.addDaysIso(2) : rec.nextFollowUp;
      gateLog += ' [SLA 48h Vàng] Đã giao Sample Kit ngày ' + rec.sampleSentDate + ', hẹn gọi hỏi KQ test mẫu ngày ' + rec.nextFollowUp + '.';
    } else if (nextStage === 'Đang báo giá / Thương lượng') {
      if (rec.sampleResult === 'Chưa gửi' || rec.sampleResult === 'Đang test tại kho') {
        rec.sampleResult = 'Đạt - Chờ báo giá';
      }
      rec.nextFollowUp = b2b.addDaysIso ? b2b.addDaysIso(3) : rec.nextFollowUp;
      gateLog += ' Mẫu đạt yêu cầu, gửi Bảng Báo giá Sỉ 3 Bậc MOQ (Follow-up: ' + rec.nextFollowUp + ').';
    } else if (nextStage === 'Đã chốt đơn') {
      rec.sampleResult = 'Đạt - Chờ báo giá';
      rec.nextFollowUp = b2b.addDaysIso ? b2b.addDaysIso(25) : rec.nextFollowUp;
      gateLog += ' Chốt đơn thành công! Tự động đặt chu kỳ Tái đặt hàng (Re-order) sau 25 ngày (' + rec.nextFollowUp + ').';
    }

    b2b.saveRecords(list);
    b2b.addActivity(code, 'Chuyển bước Pipeline', gateLog);
    if (Admin.refreshBadges) Admin.refreshBadges();
    ui.toast('Đã chuyển ' + code + ' sang: ' + nextStage, 'success');
    renderWorkspace(root);
  }

  function openStageGateStep3Modal(rec, oldStage, nextStage, root) {
    var b2b = Admin.b2b;
    var modalId = 'crmGateStep3Modal';
    var existing = document.getElementById(modalId);
    if (existing) existing.remove();

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="modal fade" id="' + modalId + '" tabindex="-1" aria-hidden="true">' +
        '<div class="modal-dialog modal-dialog-centered">' +
          '<div class="modal-content">' +
            '<div class="modal-header bg-primary text-white">' +
              '<h6 class="modal-title fw-bold"><i class="bi bi-box-seam me-2"></i>Chốt chặn Bước 3: Thông tin Nhận Sample Kit (' + esc(rec.code) + ')</h6>' +
              '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>' +
            '</div>' +
            '<div class="modal-body fs-13">' +
              '<div class="alert alert-info py-2 fs-12 mb-3">' +
                '<i class="bi bi-info-circle-fill me-1"></i>Để tài xế giao hộp mẫu không bị bảo vệ KCN/Kho trả về, vui lòng ghi nhận <strong>Tên người nhận mẫu</strong> (Quản kho / Thu mua).' +
              '</div>' +
              '<div class="mb-2">' +
                '<label class="form-label">Doanh nghiệp</label>' +
                '<input type="text" class="form-control form-control-sm bg-light" value="' + esc(rec.company) + '" readonly>' +
              '</div>' +
              '<div class="mb-2">' +
                '<label class="form-label">Tên Người nhận mẫu (Thu mua / Quản đốc kho) *</label>' +
                '<input type="text" class="form-control form-control-sm" id="gate3Contact" placeholder="VD: Anh Tuấn (Thủ kho) / Chị Lan (Thu mua)" value="' + esc(rec.contactPerson || '') + '">' +
              '</div>' +
              '<div class="row g-2">' +
                '<div class="col-6">' +
                  '<label class="form-label">SĐT liên hệ nhận mẫu</label>' +
                  '<input type="text" class="form-control form-control-sm" id="gate3Phone" value="' + esc(rec.phone || '') + '">' +
                '</div>' +
                '<div class="col-6">' +
                  '<label class="form-label">Ngày dự kiến giao mẫu</label>' +
                  '<input type="date" class="form-control form-control-sm" id="gate3FollowUp" value="' + esc(b2b.addDaysIso(2)) + '">' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Hủy</button>' +
              '<button type="button" class="btn btn-sm btn-primary" id="btnConfirmGate3"><i class="bi bi-check2-circle me-1"></i>Xác nhận &amp; Chuyển sang Bước 3</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(wrap.firstElementChild);
    var modalEl = document.getElementById(modalId);
    var bsModal = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', function () { modalEl.remove(); });
    bsModal.show();

    $('#btnConfirmGate3', modalEl).addEventListener('click', function () {
      var contactVal = $('#gate3Contact', modalEl).value.trim() || 'Bộ phận Kho / Thu mua';
      var phoneVal = $('#gate3Phone', modalEl).value.trim() || rec.phone;
      var followVal = $('#gate3FollowUp', modalEl).value || b2b.addDaysIso(2);

      var list = b2b.getRecords();
      var target = list.find(function (r) { return r.code === rec.code; });
      if (target) {
        target.contactPerson = contactVal;
        target.phone = phoneVal;
        target.lastCallDate = b2b.addDaysIso(0);
        target.nextFollowUp = followVal;
        target.status = nextStage;
        b2b.saveRecords(list);
        b2b.addActivity(rec.code, 'Chuyển bước Pipeline (Bước 3)', 'Đã gọi xác nhận gửi Sample Kit cho ' + contactVal + ' (' + phoneVal + '). Lịch giao mẫu: ' + followVal + '.');
      }
      bsModal.hide();
      ui.toast('Đã cập nhật người nhận mẫu & chuyển ' + rec.code + ' sang Bước 3!', 'success');
      renderWorkspace(root);
    });
  }

  function openStageGateStep5RiskModal(rec, oldStage, nextStage, root) {
    var b2b = Admin.b2b;
    var audit = b2b.auditRecord(rec);
    var modalId = 'crmGateStep5Modal';
    var existing = document.getElementById(modalId);
    if (existing) existing.remove();

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="modal fade" id="' + modalId + '" tabindex="-1" aria-hidden="true">' +
        '<div class="modal-dialog modal-dialog-centered">' +
          '<div class="modal-content">' +
            '<div class="modal-header bg-danger text-white">' +
              '<h6 class="modal-title fw-bold"><i class="bi bi-shield-exclamation me-2"></i>Chốt chặn Bước 5: Cảnh báo Rủi ro Công nợ Bậc 1 (' + esc(rec.code) + ')</h6>' +
              '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>' +
            '</div>' +
            '<div class="modal-body fs-13">' +
              '<div class="alert alert-danger py-2 fs-12 mb-3">' +
                '<i class="bi bi-exclamation-octagon-fill me-1"></i><strong>' + esc(rec.company) + '</strong> hiện có sản lượng <strong>' + fmtNum(rec.expectedVolume) + ' cuộn/tháng</strong> (Bậc 1 &lt; 500 cuộn) nhưng đang gắn chính sách: <strong>"' + esc(rec.policy) + '"</strong>.' +
              '</div>' +
              '<div class="mb-2 fw-semibold">Chọn phương án chuẩn hóa trước khi gửi Báo giá / Chốt đơn:</div>' +
              '<div class="d-grid gap-2">' +
                '<button type="button" class="btn btn-sm btn-success text-start p-2" id="btnGate5Upsell">' +
                  '<div class="fw-bold"><i class="bi bi-arrow-up-circle-fill me-1"></i>Phương án 1 (Khuyến nghị): Nâng lên 500 cuộn/tháng (+' + audit.upsellNeeded + ' cuộn)</div>' +
                  '<div class="fs-12 text-white-50">Đạt chuẩn Bậc 2 — Mở Công nợ gối đầu 15 ngày &amp; Miễn phí xe tải ghép chuyến</div>' +
                '</button>' +
                '<button type="button" class="btn btn-sm btn-primary text-start p-2" id="btnGate5Cod">' +
                  '<div class="fw-bold"><i class="bi bi-cash-coin me-1"></i>Phương án 2 (An toàn vốn): Giữ ' + fmtNum(rec.expectedVolume) + ' cuộn &amp; Đổi sang Thanh toán COD</div>' +
                  '<div class="fs-12 text-white-50">Áp dụng đúng chuẩn Bậc 1 (0% CK — Thanh toán ngay khi nhận hàng)</div>' +
                '</button>' +
                '<button type="button" class="btn btn-sm btn-outline-secondary text-start p-2" id="btnGate5Keep">' +
                  '<div class="fw-bold"><i class="bi bi-Unlock me-1"></i>Phương án 3: Giữ nguyên ngoại lệ (Chờ Giám đốc duyệt)</div>' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(wrap.firstElementChild);
    var modalEl = document.getElementById(modalId);
    var bsModal = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', function () { modalEl.remove(); });
    bsModal.show();

    var applyStep5Choice = function (mode) {
      var list = b2b.getRecords();
      var target = list.find(function (r) { return r.code === rec.code; });
      if (target) {
        target.status = nextStage;
        target.sampleResult = 'Đạt - Chờ báo giá';
        target.nextFollowUp = nextStage === 'Đã chốt đơn' ? b2b.addDaysIso(25) : b2b.addDaysIso(3);
        var msg = '';
        if (mode === 'upsell') {
          target.expectedVolume = 500;
          target.policy = 'Công nợ gối đầu 15 ngày (Đạt chuẩn Bậc 2 - 500 cuộn)';
          msg = 'Đã nâng sản lượng lên 500 cuộn (Bậc 2 — CN 15 ngày) & chuyển sang "' + nextStage + '".';
        } else if (mode === 'cod') {
          target.policy = 'Giá sỉ Bậc 1 — Thanh toán COD khi nhận hàng';
          msg = 'Đã chuẩn hóa chính sách COD Bậc 1 & chuyển sang "' + nextStage + '".';
        } else {
          msg = 'Chuyển sang "' + nextStage + '" (Giữ ngoại lệ công nợ Bậc 1 chờ duyệt).';
        }
        b2b.saveRecords(list);
        b2b.addActivity(rec.code, 'Chốt chặn Bước 5 (MOQ & Công nợ)', msg);
      }
      if (Admin.refreshBadges) Admin.refreshBadges();
      bsModal.hide();
      ui.toast('Đã xử lý chốt chặn Bước 5 cho ' + rec.code, 'success');
      renderWorkspace(root);
    };

    $('#btnGate5Upsell', modalEl).addEventListener('click', function () { applyStep5Choice('upsell'); });
    $('#btnGate5Cod', modalEl).addEventListener('click', function () { applyStep5Choice('cod'); });
    $('#btnGate5Keep', modalEl).addEventListener('click', function () { applyStep5Choice('keep'); });
  }

  function openStageGateStep7LostModal(rec, oldStage, nextStage, root) {
    var b2b = Admin.b2b;
    var reasons = b2b.LOST_REASONS || ['Đang còn hợp đồng NCC cũ', 'Giá chưa cạnh tranh', 'Khác'];
    var modalId = 'crmGateStep7Modal';
    var existing = document.getElementById(modalId);
    if (existing) existing.remove();

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="modal fade" id="' + modalId + '" tabindex="-1" aria-hidden="true">' +
        '<div class="modal-dialog modal-dialog-centered">' +
          '<div class="modal-content">' +
            '<div class="modal-header bg-dark text-white">' +
              '<h6 class="modal-title fw-bold"><i class="bi bi-journal-x me-2"></i>Chốt chặn Bước 7: Ghi nhận Lý do Chưa chốt (' + esc(rec.code) + ')</h6>' +
              '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>' +
            '</div>' +
            '<div class="modal-body fs-13">' +
              '<div class="mb-2">' +
                '<label class="form-label">Lý do khách hàng chưa chốt đơn *</label>' +
                '<select class="form-select form-select-sm" id="gate7Reason">' +
                  reasons.map(function (rs) {
                    return '<option value="' + esc(rs) + '">' + esc(rs) + '</option>';
                  }).join('') +
                '</select>' +
              '</div>' +
              '<div class="mb-2">' +
                '<label class="form-label">Hẹn ngày gọi chăm sóc lại (Nurture Follow-up)</label>' +
                '<input type="date" class="form-control form-control-sm" id="gate7FollowUp" value="' + esc(b2b.addDaysIso(30)) + '">' +
              '</div>' +
              '<div>' +
                '<label class="form-label">Ghi chú chi tiết (Giá đối thủ / Thời điểm hết HĐ cũ...)</label>' +
                '<textarea class="form-control form-control-sm" rows="2" id="gate7Note" placeholder="VD: Khách đang nhập PE giá 98.000đ/cuộn, hẹn đầu tháng sau gửi lại báo giá..."></textarea>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Hủy</button>' +
              '<button type="button" class="btn btn-sm btn-dark" id="btnConfirmGate7">Lưu Lý do &amp; Đưa vào Bước 7</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(wrap.firstElementChild);
    var modalEl = document.getElementById(modalId);
    var bsModal = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', function () { modalEl.remove(); });
    bsModal.show();

    $('#btnConfirmGate7', modalEl).addEventListener('click', function () {
      var reasonVal = $('#gate7Reason', modalEl).value;
      var followVal = $('#gate7FollowUp', modalEl).value || b2b.addDaysIso(30);
      var noteVal = $('#gate7Note', modalEl).value.trim();

      var list = b2b.getRecords();
      var target = list.find(function (r) { return r.code === rec.code; });
      if (target) {
        target.status = nextStage;
        target.lostReason = reasonVal;
        target.nextFollowUp = followVal;
        if (noteVal) target.notes = (target.notes ? target.notes + ' | ' : '') + noteVal;
        b2b.saveRecords(list);
        b2b.addActivity(rec.code, 'Chưa có nhu cầu (Bước 7)', 'Lý do: ' + reasonVal + (noteVal ? ' (' + noteVal + ')' : '') + '. Hẹn gọi lại: ' + followVal + '.');
      }
      bsModal.hide();
      ui.toast('Đã lưu lý do & lịch hẹn chăm sóc lại cho ' + rec.code, 'info');
      renderWorkspace(root);
    });
  }

  /* ======================================================================
   * XUẤT PHIẾU BÁO GIÁ SỈ B2B CHUẨN IN / PDF (3 BẬC MOQ)
   * ====================================================================== */
  function openPrintableQuoteModal(code) {
    var b2b = Admin.b2b;
    var rec = b2b.getRecords().find(function (r) { return r.code === code; });
    if (!rec) return;

    var cfg = b2b.getPricingConfig();
    var audit = b2b.auditRecord(rec);
    var fin = b2b.estimateDealFinancials(rec);
    var todayStr = b2b.addDaysIso(0);

    var rowsHtml = (cfg.products || []).map(function (p, idx) {
      var p1 = Number(p.tier1BasePrice) || 0;
      var p2 = Math.round(p1 * (1 - (Number(cfg.tier2DiscountPct) || 4) / 100));
      var p3 = Math.round(p1 * (1 - (Number(cfg.tier3DiscountPct) || 8) / 100));
      var activePrice = audit.tier.code === 'TIER-3' ? p3 : (audit.tier.code === 'TIER-2' ? p2 : p1);
      return (
        '<tr>' +
          '<td class="text-center fw-bold">' + (idx + 1) + '</td>' +
          '<td><div class="fw-bold">' + esc(p.name) + '</div><div class="fs-12 text-muted">Mã SP: ' + esc(p.code) + ' · Ứng dụng: ' + esc(p.targetIndustries) + '</div></td>' +
          '<td class="text-end">' + fmtNum(p1) + ' đ</td>' +
          '<td class="text-end text-primary">' + fmtNum(p2) + ' đ</td>' +
          '<td class="text-end text-success fw-bold">' + fmtNum(p3) + ' đ</td>' +
          '<td class="text-end bg-warning-subtle fw-bold text-dark">' + fmtNum(activePrice) + ' đ/cuộn</td>' +
        '</tr>'
      );
    }).join('');

    var modalId = 'crmPrintableQuoteModal';
    var existing = document.getElementById(modalId);
    if (existing) existing.remove();

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="modal fade" id="' + modalId + '" tabindex="-1" aria-hidden="true">' +
        '<div class="modal-dialog modal-xl modal-dialog-scrollable">' +
          '<div class="modal-content">' +
            '<div class="modal-header bg-dark text-white d-print-none">' +
              '<h6 class="modal-title fw-bold"><i class="bi bi-file-earmark-pdf text-warning me-2"></i>Phiếu Báo Giá Sỉ B2B — ' + esc(rec.company) + ' (' + esc(rec.code) + ')</h6>' +
              '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>' +
            '</div>' +
            '<div class="px-4 py-2 bg-light border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2 d-print-none fs-12">' +
              '<div class="d-flex align-items-center gap-3 flex-wrap">' +
                '<div class="d-flex align-items-center gap-1">' +
                  '<label class="fw-semibold mb-0">Thuế GTGT (VAT):</label>' +
                  '<select class="form-select form-select-sm py-0" id="quoteVatSelect" style="width:145px">' +
                    '<option value="0">Chưa VAT (0%)</option>' +
                    '<option value="8" selected>VAT 8% (Ưu đãi)</option>' +
                    '<option value="10">VAT 10%</option>' +
                  '</select>' +
                '</div>' +
                '<div class="d-flex align-items-center gap-1">' +
                  '<label class="fw-semibold mb-0">Hiệu lực báo giá:</label>' +
                  '<select class="form-select form-select-sm py-0" id="quoteValidSelect" style="width:120px">' +
                    '<option value="7 ngày">07 ngày</option>' +
                    '<option value="15 ngày" selected>15 ngày</option>' +
                    '<option value="30 ngày">30 ngày</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="text-success fw-semibold">' +
                '<i class="bi bi-graph-up-arrow me-1"></i>Lợi nhuận ròng dự kiến của Deal: <strong>' + fmtNum(fin.monthlyNetProfit) + ' đ/th (' + fin.netMarginPct + '%)</strong>' +
              '</div>' +
            '</div>' +
            '<div class="modal-body p-4" id="crmPrintableQuoteArea">' +
              '<div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">' +
                '<div>' +
                  '<h4 class="fw-bold text-primary mb-1">CÔNG TY TNHH SX TM DV VŨ GIA PHÁT</h4>' +
                  '<div class="fs-12 text-ink-2">Nhà máy Sản xuất Băng Keo OPP &amp; Màng PE Quấn Pallet Công Nghiệp</div>' +
                  '<div class="fs-12 text-ink-3">Địa chỉ: Quận 12 / Hóc Môn, TP. Hồ Chí Minh · Hotline B2B: 0909.xxx.xxx</div>' +
                '</div>' +
                '<div class="text-end">' +
                  '<span class="badge bg-primary fs-12 px-3 py-1">BẢNG BÁO GIÁ SỈ B2B</span>' +
                  '<div class="fs-12 text-ink-3 mt-1">Số BG: <strong>BG-' + esc(rec.code) + '-' + todayStr.replace(/-/g, '') + '</strong></div>' +
                  '<div class="fs-12 text-ink-3">Ngày lập: <strong>' + todayStr + '</strong> · Hiệu lực: <strong id="quoteValidText">15 ngày</strong></div>' +
                '</div>' +
              '</div>' +

              '<div class="row g-3 mb-3 p-3 rounded bg-light border fs-13">' +
                '<div class="col-md-7">' +
                  '<div><strong>Kính gửi Quý Doanh nghiệp:</strong> <span class="text-primary fw-bold">' + esc(rec.company) + '</span></div>' +
                  '<div><strong>Người nhận:</strong> ' + esc(rec.contactPerson || 'Phòng Thu mua / Quản lý Kho') + ' · <strong>SĐT:</strong> ' + esc(rec.phone) + '</div>' +
                  '<div><strong>Địa chỉ giao hàng:</strong> ' + esc(rec.address) + '</div>' +
                '</div>' +
                '<div class="col-md-5 border-start">' +
                  '<div><strong>Sản lượng đăng ký:</strong> <span class="fw-bold text-primary">' + fmtNum(rec.expectedVolume) + ' cuộn/tháng</span> (' + esc(audit.tier.name) + ')</div>' +
                  '<div><strong>Chính sách thanh toán:</strong> ' + esc(audit.isRisk ? 'Giá sỉ Bậc 1 (Thanh toán COD) hoặc nâng 500c mở Công nợ 15 ngày' : rec.policy) + '</div>' +
                  '<div><strong>Tuyến xe giao tận kho:</strong> ' + esc(audit.truckSchedule) + '</div>' +
                '</div>' +
              '</div>' +

              '<div class="table-responsive mb-3">' +
                '<table class="table table-bordered align-middle fs-13 mb-0">' +
                  '<thead class="table-light">' +
                    '<tr>' +
                      '<th class="text-center" style="width:45px">STT</th>' +
                      '<th>Quy cách Sản phẩm &amp; Cam kết Kỹ thuật</th>' +
                      '<th class="text-end">Giá Bậc 1<br><small class="fw-normal">(300-499c · COD)</small></th>' +
                      '<th class="text-end">Giá Bậc 2 (-' + cfg.tier2DiscountPct + '%)<br><small class="fw-normal">(500-799c · CN 15N)</small></th>' +
                      '<th class="text-end">Giá Bậc 3 (-' + cfg.tier3DiscountPct + '%)<br><small class="fw-normal">(800-1.000c · CN 30N)</small></th>' +
                      '<th class="text-end bg-warning-subtle">Đơn giá Áp dụng<br><small class="fw-normal">(' + esc(audit.tier.shortLabel) + ')</small></th>' +
                    '</tr>' +
                  '</thead>' +
                  '<tbody>' + rowsHtml + '</tbody>' +
                '</table>' +
              '</div>' +

              '<div class="p-3 rounded border bg-primary-subtle border-primary-subtle fs-13 mb-3">' +
                '<div class="fw-bold text-primary-emphasis mb-1">Ước tính Ngân sách Đặt hàng theo Sản lượng (' + fmtNum(rec.expectedVolume) + ' cuộn/tháng — ' + esc(rec.mainProduct) + '):</div>' +
                '<div id="quoteFinancialSummaryLine">• Đơn giá bình quân sau chiết khấu (' + fin.discountPct + '%): <strong>' + fmtNum(fin.netUnitPrice) + ' đ/cuộn</strong> · Chưa VAT: <strong>' + fmtNum(fin.monthlyRevenue) + ' đ</strong> · Tổng thanh toán (Gồm VAT 8%): <strong class="text-danger fs-6">' + fmtNum(Math.round(fin.monthlyRevenue * 1.08)) + ' VNĐ/tháng</strong>.</div>' +
                '<div>• <strong>Cam kết chất lượng Vũ Gia Phát:</strong> Bảo hành độ dính keo Acrylic &amp; màng PE nguyên sinh co giãn 250%; đổi mới 1-1 trong 24h nếu thiếu Yard hoặc thiếu cân.</div>' +
              '</div>' +

              '<div class="row text-center mt-4 pt-2 fs-13">' +
                '<div class="col-6">' +
                  '<div class="fw-bold">ĐẠI DIỆN KHÁCH HÀNG XÁC NHẬN</div>' +
                  '<div class="fs-12 text-muted">(Ký, ghi rõ họ tên &amp; đóng dấu)</div>' +
                  '<div style="height:70px"></div>' +
                  '<div class="fw-semibold">' + esc(rec.company) + '</div>' +
                '</div>' +
                '<div class="col-6">' +
                  '<div class="fw-bold">ĐẠI DIỆN BÁO GIÁ — VŨ GIA PHÁT</div>' +
                  '<div class="fs-12 text-muted">(Phòng Kinh doanh B2B)</div>' +
                  '<div style="height:70px"></div>' +
                  '<div class="fw-semibold">Công ty TNHH SX TM DV Vũ Gia Phát</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer justify-content-between d-print-none">' +
              '<button type="button" class="btn btn-sm btn-success" id="btnCopyZaloQuote"><i class="bi bi-chat-dots-fill me-1"></i>Copy Báo Giá gửi Zalo (1-Click)</button>' +
              '<div class="d-flex gap-2">' +
                '<button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Đóng</button>' +
                '<button type="button" class="btn btn-sm btn-primary" id="btnPrintQuoteNow"><i class="bi bi-printer me-1"></i>In / Lưu PDF Báo Giá</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(wrap.firstElementChild);
    var modalEl = document.getElementById(modalId);
    var bsModal = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', function () { modalEl.remove(); });
    bsModal.show();

    var updateQuoteVatAndValidity = function () {
      var vatPct = Number($('#quoteVatSelect', modalEl).value) || 0;
      var validVal = $('#quoteValidSelect', modalEl).value || '15 ngày';
      var validEl = $('#quoteValidText', modalEl);
      if (validEl) validEl.textContent = validVal;

      var totalWithVat = Math.round(fin.monthlyRevenue * (1 + vatPct / 100));
      var sumLine = $('#quoteFinancialSummaryLine', modalEl);
      if (sumLine) {
        sumLine.innerHTML =
          '• Đơn giá bình quân sau chiết khấu (' + fin.discountPct + '%): <strong>' + fmtNum(fin.netUnitPrice) + ' đ/cuộn</strong> · ' +
          (vatPct > 0
            ? ('Chưa VAT: <strong>' + fmtNum(fin.monthlyRevenue) + ' đ</strong> · Tổng thanh toán (Gồm VAT ' + vatPct + '%): <strong class="text-danger fs-6">' + fmtNum(totalWithVat) + ' VNĐ/tháng</strong>.')
            : ('Tổng giá trị ước tính (Chưa VAT): <strong class="text-danger fs-6">' + fmtNum(fin.monthlyRevenue) + ' VNĐ/tháng</strong>.'));
      }
    };

    $('#quoteVatSelect', modalEl).addEventListener('change', updateQuoteVatAndValidity);
    $('#quoteValidSelect', modalEl).addEventListener('change', updateQuoteVatAndValidity);

    $('#btnCopyZaloQuote', modalEl).addEventListener('click', function () {
      var vatPct = Number($('#quoteVatSelect', modalEl).value) || 0;
      var validVal = $('#quoteValidSelect', modalEl).value || '15 ngày';
      var totalWithVat = Math.round(fin.monthlyRevenue * (1 + vatPct / 100));
      var prodLines = (cfg.products || []).map(function (p, i) {
        var p1 = Number(p.tier1BasePrice) || 0;
        var p2 = Math.round(p1 * (1 - (Number(cfg.tier2DiscountPct) || 4) / 100));
        var p3 = Math.round(p1 * (1 - (Number(cfg.tier3DiscountPct) || 8) / 100));
        var actP = audit.tier.code === 'TIER-3' ? p3 : (audit.tier.code === 'TIER-2' ? p2 : p1);
        return (i + 1) + '. ' + p.name + ': ' + fmtNum(actP) + ' đ/cuộn (' + audit.tier.shortLabel + ')';
      }).join('\n');

      var zaloText =
        '📋 BẢNG BÁO GIÁ SỈ B2B — NHÀ MÁY BĂNG KEO & MÀNG PE VŨ GIA PHÁT\n' +
        '• Kính gửi: ' + rec.company + ' (' + (rec.contactPerson || 'P. Thu mua / Kho') + ')\n' +
        '• Sản lượng áp dụng: ' + fmtNum(rec.expectedVolume) + ' cuộn/tháng (' + audit.tier.name + ')\n' +
        '• Mặt hàng chủ lực: ' + rec.mainProduct + '\n' +
        '--------------------------------\n' +
        prodLines + '\n' +
        '--------------------------------\n' +
        '💰 Ngân sách ước tính (' + fmtNum(rec.expectedVolume) + ' cuộn/tháng): ' + fmtNum(totalWithVat) + ' VNĐ' + (vatPct > 0 ? ' (Đã gồm VAT ' + vatPct + '%)' : ' (Chưa VAT)') + '\n' +
        '🚚 Lịch xe giao tận kho: ' + audit.truckSchedule + '\n' +
        '💳 Chính sách: ' + (audit.isRisk ? 'Thanh toán COD (Hoặc nâng lên 500 cuộn mở Công nợ 15 ngày)' : rec.policy) + '\n' +
        '✅ Cam kết: Đủ Yard, đủ số cân lõi mỏng 200g, bảo hành 1 đổi 1 trong 24h (Hiệu lực BG: ' + validVal + ').';

      navigator.clipboard.writeText(zaloText);
      b2b.addActivity(rec.code, 'Gửi Báo giá Sỉ (Zalo)', 'Đã copy Báo giá B2B gửi Zalo (' + audit.tier.shortLabel + ' — ' + fmtNum(totalWithVat) + ' đ, VAT ' + vatPct + '%).');
      ui.toast('Đã copy Bảng Báo Giá B2B định dạng Zalo cho ' + rec.code + '!', 'success');
    });

    $('#btnPrintQuoteNow', modalEl).addEventListener('click', function () {
      b2b.addActivity(rec.code, 'Xuất Báo giá PDF', 'Đã xuất phiếu Báo giá B2B (' + audit.tier.name + ' — ~' + fmtNum(fin.monthlyRevenue) + ' đ/tháng).');
      window.print();
    });
  }

  /* ======================================================================
   * LIÊN THÔNG BƯỚC 6 -> TẠO ĐƠN HÀNG B2B SANG PHÂN HỆ ĐƠN HÀNG (#/orders)
   * ====================================================================== */
  function openCreateB2BOrderModal(code, root) {
    var b2b = Admin.b2b;
    var rec = b2b.getRecords().find(function (r) { return r.code === code; });
    if (!rec) return;

    var fin = b2b.estimateDealFinancials(rec);
    var audit = b2b.auditRecord(rec);
    var modalId = 'crmCreateB2BOrderModal';
    var existing = document.getElementById(modalId);
    if (existing) existing.remove();

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="modal fade" id="' + modalId + '" tabindex="-1" aria-hidden="true">' +
        '<div class="modal-dialog modal-dialog-centered">' +
          '<div class="modal-content">' +
            '<div class="modal-header bg-success text-white">' +
              '<h6 class="modal-title fw-bold"><i class="bi bi-cart-check me-2"></i>Tạo Đơn Hàng B2B từ Deal (' + esc(rec.code) + ')</h6>' +
              '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>' +
            '</div>' +
            '<div class="modal-body fs-13">' +
              '<div class="mb-2">' +
                '<label class="form-label">Khách hàng Doanh nghiệp</label>' +
                '<input type="text" class="form-control form-control-sm fw-bold bg-light" value="' + esc(rec.company) + '" readonly>' +
              '</div>' +
              '<div class="row g-2 mb-2">' +
                '<div class="col-6">' +
                  '<label class="form-label">Người nhận hàng</label>' +
                  '<input type="text" class="form-control form-control-sm" id="b2bOrdReceiver" value="' + esc(rec.contactPerson || rec.company) + '">' +
                '</div>' +
                '<div class="col-6">' +
                  '<label class="form-label">Số điện thoại</label>' +
                  '<input type="text" class="form-control form-control-sm" id="b2bOrdPhone" value="' + esc(rec.phone) + '">' +
                '</div>' +
              '</div>' +
              '<div class="mb-2">' +
                '<label class="form-label">Địa chỉ Kho nhận hàng</label>' +
                '<input type="text" class="form-control form-control-sm" id="b2bOrdAddress" value="' + esc(rec.address) + '">' +
              '</div>' +
              '<div class="row g-2 mb-2">' +
                '<div class="col-7">' +
                  '<label class="form-label">Mặt hàng đặt sỉ</label>' +
                  '<input type="text" class="form-control form-control-sm" id="b2bOrdProduct" value="' + esc(rec.mainProduct) + '">' +
                '</div>' +
                '<div class="col-5">' +
                  '<label class="form-label">Số lượng (Cuộn)</label>' +
                  '<input type="number" step="50" class="form-control form-control-sm fw-bold" id="b2bOrdQty" value="' + (Number(rec.expectedVolume) || 500) + '">' +
                '</div>' +
              '</div>' +
              '<div class="row g-2 mb-2">' +
                '<div class="col-6">' +
                  '<label class="form-label">Đơn giá sỉ (VNĐ/cuộn)</label>' +
                  '<input type="number" step="500" class="form-control form-control-sm" id="b2bOrdPrice" value="' + fin.netUnitPrice + '">' +
                '</div>' +
                '<div class="col-6">' +
                  '<label class="form-label">Thành tiền dự kiến (VNĐ)</label>' +
                  '<input type="text" class="form-control form-control-sm fw-bold text-success bg-light" id="b2bOrdTotal" value="' + fmtNum(fin.monthlyRevenue) + ' đ" readonly>' +
                '</div>' +
              '</div>' +
              '<div class="row g-2 mb-2">' +
                '<div class="col-6">' +
                  '<label class="form-label">Điều khoản Thanh toán &amp; Công nợ</label>' +
                  '<select class="form-select form-select-sm" id="b2bOrdPaymentTerm">' +
                    '<option value="0"' + (fin.creditDays === 0 ? ' selected' : '') + '>Thanh toán COD (0 ngày)</option>' +
                    '<option value="15"' + (fin.creditDays === 15 ? ' selected' : '') + '>Công nợ gối đầu 15 ngày (Bậc 2)</option>' +
                    '<option value="30"' + (fin.creditDays >= 30 ? ' selected' : '') + '>Công nợ HĐ 30 ngày (Bậc 3)</option>' +
                  '</select>' +
                '</div>' +
                '<div class="col-6">' +
                  '<label class="form-label">Chu kỳ Tái đặt hàng (Re-order)</label>' +
                  '<select class="form-select form-select-sm" id="b2bOrdCycle">' +
                    '<option value="15"' + (Number(rec.reorderCycleDays) === 15 ? ' selected' : '') + '>15 ngày / lần (Kho tiêu thụ nhanh)</option>' +
                    '<option value="25"' + ((!rec.reorderCycleDays || Number(rec.reorderCycleDays) === 25) ? ' selected' : '') + '>25 ngày / lần (Chuẩn hàng tháng)</option>' +
                    '<option value="30"' + (Number(rec.reorderCycleDays) === 30 ? ' selected' : '') + '>30 ngày / lần</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div>' +
                '<label class="form-label">Ghi chú Giao hàng &amp; Tuyến xe tải</label>' +
                '<input type="text" class="form-control form-control-sm" id="b2bOrdNote" value="' + esc(rec.policy + ' | ' + audit.truckSchedule) + '">' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Hủy</button>' +
              '<button type="button" class="btn btn-sm btn-success" id="btnSubmitB2BOrder"><i class="bi bi-check2-circle me-1"></i>Xác nhận Tạo Đơn B2B</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(wrap.firstElementChild);
    var modalEl = document.getElementById(modalId);
    var bsModal = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', function () { modalEl.remove(); });
    bsModal.show();

    var updateOrdTotal = function () {
      var q = Number($('#b2bOrdQty', modalEl).value) || 0;
      var p = Number($('#b2bOrdPrice', modalEl).value) || 0;
      $('#b2bOrdTotal', modalEl).value = fmtNum(q * p) + ' đ';
    };
    $('#b2bOrdQty', modalEl).addEventListener('input', updateOrdTotal);
    $('#b2bOrdPrice', modalEl).addEventListener('input', updateOrdTotal);

    $('#btnSubmitB2BOrder', modalEl).addEventListener('click', async function () {
      var btn = $('#btnSubmitB2BOrder', modalEl);
      btn.disabled = true;
      var qty = Number($('#b2bOrdQty', modalEl).value) || 500;
      var price = Number($('#b2bOrdPrice', modalEl).value) || fin.netUnitPrice;
      var totalAmount = qty * price;
      var prodName = $('#b2bOrdProduct', modalEl).value.trim();
      var creditDaysVal = Number($('#b2bOrdPaymentTerm', modalEl).value) || 0;
      var cycleDaysVal = Number($('#b2bOrdCycle', modalEl).value) || 25;
      var todayStr = b2b.addDaysIso(0);
      var dueStr = creditDaysVal > 0 ? b2b.addDaysIso(creditDaysVal) : todayStr;
      var nextReorderStr = b2b.addDaysIso(cycleDaysVal);
      var noteStr = '[B2B-' + rec.code + '] ' + prodName + ' (' + fmtNum(qty) + ' cuộn) | ' + (creditDaysVal > 0 ? ('Công nợ ' + creditDaysVal + ' ngày - Hạn: ' + dueStr) : 'COD') + ' | ' + $('#b2bOrdNote', modalEl).value.trim();

      // Lưu vào bảng orders trên Supabase nếu có kết nối
      var sb = window.supabaseClient || window.supabase;
      if (sb && typeof sb.from === 'function') {
        try {
          await sb.from('orders').insert([{
            customer_name: $('#b2bOrdReceiver', modalEl).value.trim() || rec.company,
            customer_phone: $('#b2bOrdPhone', modalEl).value.trim() || rec.phone,
            customer_email: rec.website || '',
            shipping_address: $('#b2bOrdAddress', modalEl).value.trim() || rec.address,
            total_amount: totalAmount,
            payment_method: creditDaysVal > 0 ? 'B2B_CREDIT_' + creditDaysVal : 'COD',
            status: 'pending',
            note: noteStr
          }]);
        } catch (err) {
          console.warn('Lưu đơn B2B lên Supabase:', err);
        }
      }

      // Cập nhật Deal sang Đã chốt đơn, lưu lịch sử đơn hàng & đặt lịch Re-order
      var list = b2b.getRecords();
      var target = list.find(function (r) { return r.code === rec.code; });
      if (target) {
        target.status = 'Đã chốt đơn';
        target.expectedVolume = qty;
        target.lastOrderDate = todayStr;
        target.reorderCycleDays = cycleDaysVal;
        target.nextFollowUp = nextReorderStr;
        target.creditDueDate = dueStr;
        target.paymentStatus = creditDaysVal > 0 ? ('Trong hạn công nợ (' + creditDaysVal + 'N)') : 'Đã thu COD';
        if (!Array.isArray(target.orderHistory)) target.orderHistory = [];
        target.orderHistory.unshift({
          orderDate: todayStr,
          qty: qty,
          unitPrice: price,
          totalAmount: totalAmount,
          creditDays: creditDaysVal,
          creditDueDate: dueStr
        });
        b2b.saveRecords(list);
        b2b.addActivity(rec.code, 'Tạo Đơn hàng B2B', 'Đã lên đơn sỉ: ' + fmtNum(qty) + ' cuộn ' + prodName + ' — Tổng: ' + fmtNum(totalAmount) + ' VNĐ (' + target.paymentStatus + ', Đáo hạn: ' + dueStr + '). Hẹn Re-order sau ' + cycleDaysVal + ' ngày (' + nextReorderStr + ').');
      }

      bsModal.hide();
      ui.toast('Đã tạo Đơn hàng B2B (' + fmtNum(totalAmount) + ' đ) & hẹn Re-order ngày ' + nextReorderStr + '!', 'success');
      renderWorkspace(root);
    });
  }

  /* ======================================================================
   * SỰ KIỆN TƯƠNG TÁC TRÊN TOÀN WORKSPACE CRM
   * ====================================================================== */
  function bindGlobalEvents(root, records) {
    var b2b = Admin.b2b;

    // Chuyển tab CRM
    $$('[data-crm-tab]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeTab = btn.getAttribute('data-crm-tab');
        renderWorkspace(root);
      });
    });

    $$('[data-switch-tab]', root).forEach(function (el) {
      el.addEventListener('click', function () {
        activeTab = el.getAttribute('data-switch-tab');
        renderWorkspace(root);
      });
    });

    // Bộ lọc
    var elRoute = $('#crmFilterRoute', root);
    if (elRoute) elRoute.addEventListener('change', function () { filterRoute = elRoute.value; renderWorkspace(root); });

    var elSales = $('#crmFilterSales', root);
    if (elSales) elSales.addEventListener('change', function () { filterSales = elSales.value; renderWorkspace(root); });

    $$('[data-filter-sales-rep]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterSales = btn.getAttribute('data-filter-sales-rep') || 'all';
        activeTab = 'kanban';
        renderWorkspace(root);
      });
    });

    var elReg = $('#crmFilterRegion', root);
    if (elReg) elReg.addEventListener('change', function () { filterRegion = elReg.value; renderWorkspace(root); });

    var elInd = $('#crmFilterIndustry', root);
    if (elInd) elInd.addEventListener('change', function () { filterIndustry = elInd.value; renderWorkspace(root); });

    var elTier = $('#crmFilterTier', root);
    if (elTier) elTier.addEventListener('change', function () { filterTier = elTier.value; renderWorkspace(root); });

    $$('[data-quick-tier]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterTier = btn.getAttribute('data-quick-tier') || 'all';
        renderWorkspace(root);
      });
    });

    $$('[data-missed-call]', root).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var code = btn.getAttribute('data-missed-call');
        var list = b2b.getRecords();
        var rec = list.find(function (r) { return r.code === code; });
        if (rec) {
          rec.callAttempts = (Number(rec.callAttempts) || 0) + 1;
          rec.lastCallDate = b2b.addDaysIso(0);
          rec.nextFollowUp = b2b.addDaysIso(1);
          b2b.saveRecords(list);
          b2b.addActivity(code, 'Gọi lại không nghe máy (Lần ' + rec.callAttempts + ')', 'Ghi nhận gọi nhỡ lần ' + rec.callAttempts + '. Đổi khung giờ vàng gọi lại vào ' + rec.nextFollowUp + '.');
          ui.toast('Đã ghi nhận gọi nhỡ lần ' + rec.callAttempts + ' cho ' + code, 'warning');
          renderWorkspace(root);
        }
      });
    });

    var elSearch = $('#crmSearchInput', root);
    if (elSearch) {
      elSearch.addEventListener('input', function () {
        searchKeyword = elSearch.value.trim();
        renderWorkspace(root);
        var inputAfter = $('#crmSearchInput', root);
        if (inputAfter) {
          inputAfter.focus();
          inputAfter.setSelectionRange(inputAfter.value.length, inputAfter.value.length);
        }
      });
    }

    // Nút mở Hồ sơ 360°
    $$('[data-open-360]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        openCustomer360Modal(btn.getAttribute('data-open-360'), root);
      });
    });

    // Nút Thêm KH mới
    var btnAdd = $('#btnAddCrmCustomer', root);
    if (btnAdd) {
      btnAdd.addEventListener('click', function () {
        openCustomer360Modal('__NEW__', root);
      });
    }

    // Nút Xuất Báo giá PDF
    $$('[data-print-quote]', root).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openPrintableQuoteModal(btn.getAttribute('data-print-quote'));
      });
    });

    // Nút Tạo Đơn hàng B2B
    $$('[data-create-order]', root).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openCreateB2BOrderModal(btn.getAttribute('data-create-order'), root);
      });
    });

    // Nút Xác nhận Đã thu tiền công nợ (Giai đoạn 3)
    $$('[data-mark-paid]', root).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var code = btn.getAttribute('data-mark-paid');
        var list = b2b.getRecords();
        var rec = list.find(function (r) { return r.code === code; });
        if (rec) {
          rec.paymentStatus = 'Đã thu đủ công nợ (' + b2b.addDaysIso(0) + ')';
          b2b.saveRecords(list);
          b2b.addActivity(code, 'Thu hồi Công nợ B2B', 'Kế toán xác nhận đã thu đủ tiền công nợ của khách hàng ' + rec.company + '.');
          ui.toast('Đã xác nhận thu đủ công nợ cho ' + code + '!', 'success');
          renderWorkspace(root);
        }
      });
    });

    // Nút Copy Kịch bản Gọi lấy đơn lặp lại (Re-order 1-Click - Giai đoạn 3)
    $$('[data-copy-reorder]', root).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var code = btn.getAttribute('data-copy-reorder');
        var rec = b2b.getRecords().find(function (r) { return r.code === code; });
        if (rec) {
          var audit = b2b.auditRecord(rec);
          var reorderScript =
            'Dạ em chào ' + (rec.contactPerson || 'Anh/Chị Quản lý Kho') + ' (' + rec.company + '), em gọi từ Nhà máy Băng keo & Màng PE Vũ Gia Phát ạ. ' +
            'Đợt hàng ' + fmtNum(rec.expectedVolume) + ' cuộn (' + rec.mainProduct + ') bên mình nhập kỳ trước tới nay đã gần tới chu kỳ bổ sung kho (' + (rec.reorderCycleDays || 25) + ' ngày). ' +
            'Kho mình còn đủ dùng trong tuần tới không ạ để em xếp lịch xe tải (' + audit.truckSchedule + ') giao bổ sung đúng đơn giá sỉ ưu đãi cho bên mình luôn ạ?';
          navigator.clipboard.writeText(reorderScript);
          b2b.addActivity(code, 'Chăm sóc Tái đặt hàng (Re-order)', 'Đã copy kịch bản hỏi thăm tồn kho & nhắc lịch đặt hàng lặp lại.');
          ui.toast('Đã copy Kịch bản Gọi Re-order cho ' + code + '!', 'success');
        }
      });
    });

    // Nút Chuyển bước nhanh trên Kanban (Có kiểm tra Stage Gate)
    $$('[data-advance-code]', root).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var code = btn.getAttribute('data-advance-code');
        var nextStage = btn.getAttribute('data-next-stage');
        transitionDealStage(code, nextStage, root);
      });
    });

    // KÉO - THẢ (HTML5 DRAG & DROP) TRÊN BẢNG PHỄU KANBAN 7 BƯỚC
    var draggedCode = null;
    $$('[data-drag-code]', root).forEach(function (card) {
      card.addEventListener('dragstart', function (e) {
        draggedCode = card.getAttribute('data-drag-code');
        card.classList.add('is-dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', draggedCode);
        }
      });
      card.addEventListener('dragend', function () {
        card.classList.remove('is-dragging');
        $$('.crm-kanban-col.is-drag-over', root).forEach(function (c) { c.classList.remove('is-drag-over'); });
      });
    });

    $$('[data-drop-stage]', root).forEach(function (col) {
      col.addEventListener('dragover', function (e) {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        col.classList.add('is-drag-over');
      });
      col.addEventListener('dragleave', function (e) {
        if (!col.contains(e.relatedTarget)) {
          col.classList.remove('is-drag-over');
        }
      });
      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('is-drag-over');
        var targetStage = col.getAttribute('data-drop-stage');
        var code = draggedCode || (e.dataTransfer ? e.dataTransfer.getData('text/plain') : '');
        if (code && targetStage) {
          transitionDealStage(code, targetStage, root);
        }
        draggedCode = null;
      });
    });

    // Đổi trạng thái inline trên bảng Danh sách KH (Có kiểm tra Stage Gate)
    $$('[data-inline-status]', root).forEach(function (sel) {
      sel.addEventListener('change', function () {
        var code = sel.getAttribute('data-inline-status');
        transitionDealStage(code, sel.value, root);
      });
    });

    $$('[data-inline-sample]', root).forEach(function (sel) {
      sel.addEventListener('change', function () {
        var code = sel.getAttribute('data-inline-sample');
        var list = b2b.getRecords();
        var rec = list.find(function (r) { return r.code === code; });
        if (rec) {
          rec.sampleResult = sel.value;
          b2b.saveRecords(list);
          b2b.addActivity(code, 'Cập nhật KQ Test Mẫu', 'Kết quả mẫu: ' + sel.value);
          ui.toast('Đã cập nhật kết quả test mẫu ' + code, 'success');
          renderWorkspace(root);
        }
      });
    });

    // Nút xử lý nhanh rủi ro công nợ ở Tab Audit
    $$('[data-fix-upsell]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var code = btn.getAttribute('data-fix-upsell');
        var list = b2b.getRecords();
        var rec = list.find(function (r) { return r.code === code; });
        if (rec) {
          rec.expectedVolume = 500;
          rec.policy = 'Công nợ gối đầu 15 ngày (Đạt chuẩn Bậc 2 - 500 cuộn)';
          b2b.saveRecords(list);
          b2b.addActivity(code, 'Kiểm toán MOQ & Công nợ', 'Nâng định mức lên 500 cuộn/tháng để hợp lệ Công nợ gối đầu 15 ngày (Bậc 2).');
          ui.toast('Đã nâng định mức ' + code + ' lên 500 cuộn (Hợp lệ Bậc 2)', 'success');
          if (Admin.refreshBadges) Admin.refreshBadges();
          renderWorkspace(root);
        }
      });
    });

    $$('[data-fix-cod]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var code = btn.getAttribute('data-fix-cod');
        var list = b2b.getRecords();
        var rec = list.find(function (r) { return r.code === code; });
        if (rec) {
          rec.policy = 'Giá sỉ Bậc 1 — Thanh toán COD khi nhận hàng';
          b2b.saveRecords(list);
          b2b.addActivity(code, 'Kiểm toán MOQ & Công nợ', 'Chuyển chính sách sang Thanh toán COD chuẩn Bậc 1 (< 500 cuộn).');
          ui.toast('Đã chuyển ' + code + ' sang chính sách COD chuẩn Bậc 1', 'info');
          if (Admin.refreshBadges) Admin.refreshBadges();
          renderWorkspace(root);
        }
      });
    });

    // Tab Kịch bản Telesale
    var selScriptCust = $('#crmScriptCustomerSelect', root);
    if (selScriptCust) {
      selScriptCust.addEventListener('change', function () {
        selectedScriptCustomerCode = selScriptCust.value;
        renderWorkspace(root);
      });
    }

    $$('[data-copy-script]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        navigator.clipboard.writeText(btn.getAttribute('data-copy-script'));
        ui.toast('Đã copy kịch bản Telesale vào bộ nhớ tạm!', 'success');
      });
    });

    // Tab Bảng tính Giá vốn
    var pricingInputs = $$('#cfgCapRate, #cfgTruckFee, #cfgT2Disc, #cfgT2Days, #cfgT3Disc, #cfgT3Days, [data-prod-cost], [data-prod-p1]', root);
    if (pricingInputs.length) {
      pricingInputs.forEach(function (inp) {
        inp.addEventListener('change', function () {
          var cfg = b2b.getPricingConfig();
          cfg.workingCapitalRateMonthly = Number($('#cfgCapRate', root).value) || 0;
          cfg.truckFeePerRoll = Number($('#cfgTruckFee', root).value) || 0;
          cfg.tier2DiscountPct = Number($('#cfgT2Disc', root).value) || 0;
          cfg.tier2CreditDays = Number($('#cfgT2Days', root).value) || 0;
          cfg.tier3DiscountPct = Number($('#cfgT3Disc', root).value) || 0;
          cfg.tier3CreditDays = Number($('#cfgT3Days', root).value) || 0;

          $$('[data-prod-cost]', root).forEach(function (cInp) {
            var idx = Number(cInp.getAttribute('data-prod-cost'));
            if (cfg.products[idx]) cfg.products[idx].factoryCost = Number(cInp.value) || 0;
          });
          $$('[data-prod-p1]', root).forEach(function (pInp) {
            var idx = Number(pInp.getAttribute('data-prod-p1'));
            if (cfg.products[idx]) cfg.products[idx].tier1BasePrice = Number(pInp.value) || 0;
          });

          b2b.savePricingConfig(cfg);
          renderWorkspace(root);
        });
      });
    }

    var btnSavePricing = $('#btnSavePricingConfig', root);
    if (btnSavePricing) {
      btnSavePricing.addEventListener('click', function () {
        ui.toast('Đã lưu bảng tính Giá vốn & Chiết khấu 3 Bậc MOQ!', 'success');
      });
    }

    // Xuất CSV
    var btnExport = $('#btnExportCrmCsv', root);
    if (btnExport) {
      btnExport.addEventListener('click', function () {
        exportCrmCsv(b2b.getRecords());
      });
    }

    // Sao lưu toàn bộ dữ liệu CRM ra file JSON (Giai đoạn 4)
    var btnBackupJson = $('#btnBackupCrmJson', root);
    if (btnBackupJson) {
      btnBackupJson.addEventListener('click', function () {
        var payload = b2b.exportBackupPayload ? b2b.exportBackupPayload() : { records: b2b.getRecords() };
        var jsonStr = JSON.stringify(payload, null, 2);
        var blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        var today = b2b.addDaysIso ? b2b.addDaysIso(0).replace(/-/g, '') : 'backup';
        a.href = url;
        a.download = 'CRM_B2B_VuGiaPhat_Backup_' + today + '.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        ui.toast('Đã tải xuống file Sao lưu JSON (' + payload.records.length + ' hồ sơ B2B)!', 'success');
      });
    }

    // Nạp / Phục hồi dữ liệu CRM từ file JSON (Giai đoạn 4)
    var btnRestoreJson = $('#btnRestoreCrmJson', root);
    var fileRestoreInput = $('#crmRestoreFileInput', root);
    if (btnRestoreJson && fileRestoreInput) {
      btnRestoreJson.addEventListener('click', function () {
        fileRestoreInput.value = '';
        fileRestoreInput.click();
      });
      fileRestoreInput.addEventListener('change', function () {
        var file = fileRestoreInput.files && fileRestoreInput.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (evt) {
          try {
            var parsed = JSON.parse(String(evt.target.result || ''));
            var res = b2b.importBackupPayload ? b2b.importBackupPayload(parsed) : { ok: false, error: 'Chưa hỗ trợ nạp JSON' };
            if (!res.ok) {
              ui.toast(res.error || 'File JSON không hợp lệ.', 'danger');
              return;
            }
            if (Admin.refreshBadges) Admin.refreshBadges();
            renderWorkspace(root);
            ui.toast('Đã phục hồi thành công ' + res.count + ' hồ sơ khách hàng B2B từ file JSON!', 'success');
          } catch (err) {
            ui.toast('Lỗi đọc file JSON: ' + (err.message || err), 'danger');
          }
        };
        reader.readAsText(file, 'utf-8');
      });
    }

    // Khôi phục 36 KH mặc định
    var btnReset = $('#btnResetCrmData', root);
    if (btnReset) {
      btnReset.addEventListener('click', function () {
        ui.confirm({
          title: 'Khôi phục dữ liệu gốc 36 Khách hàng B2B',
          message: 'Khôi phục lại toàn bộ 36 khách hàng mục tiêu từ file Excel gốc CRM_Theo_Doi_Khach_Hang_B2B_BangKeo_MangPE-v3.xlsx?',
          okText: 'Khôi phục',
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          b2b.resetDefaultRecords();
          if (Admin.refreshBadges) Admin.refreshBadges();
          renderWorkspace(root);
          ui.toast('Đã khôi phục 36 khách hàng B2B gốc.', 'info');
        });
      });
    }
  }

  function exportCrmCsv(records) {
    var b2b = Admin.b2b;
    var headers = ['Mã KH', 'Khu vực', 'Phường/Xã/KCN', 'Ngành hàng', 'Sales Phụ trách', 'Tên Công ty', 'Địa chỉ', 'Điện thoại', 'Người liên hệ', 'SP Chủ lực', 'Sản lượng (Cuộn/tháng)', 'Trạng thái Gọi', 'KQ Test Mẫu', 'Chính sách Đề xuất', 'Ghi chú'];
    var rows = [headers.join(',')];
    records.forEach(function (r) {
      var repName = (b2b && b2b.getSalesRepInfo) ? b2b.getSalesRepInfo(r).shortName : '';
      var cols = [
        r.code, r.region, r.ward, r.industry, repName, r.company, r.address, r.phone,
        r.contactPerson, r.mainProduct, r.expectedVolume, r.status, r.sampleResult, r.policy, r.notes
      ].map(function (val) {
        return '"' + String(val || '').replace(/"/g, '""') + '"';
      });
      rows.push(cols.join(','));
    });
    var blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'CRM_B2B_VuGiaPhat_36KH.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ======================================================================
   * TAB 7: LEADS BÁO GIÁ TỪ WEBSITE (SUPABASE LEAD TABLE)
   * ====================================================================== */
  async function renderWebLeadsTab(container, root) {
    var supabase = window.supabaseClient;
    if (!supabase) {
      container.innerHTML = '<div class="alert alert-warning">Chưa kết nối Supabase để đọc danh sách Leads từ Website.</div>';
      return;
    }

    container.innerHTML =
      '<div class="d-flex justify-content-center py-5">' +
        '<div class="spinner-border text-primary" role="status"></div>' +
      '</div>';

    var items = [];
    try {
      var query = supabase.from('lead').select('*').order('created_at', { ascending: false });
      if (webLeadSource !== 'all') {
        if (webLeadSource === 'quick-quote') {
          query = query.in('source', ['quick-quote', 'quick_quote_modal']);
        } else {
          query = query.eq('source', webLeadSource);
        }
      }
      if (webLeadStatus !== 'all') {
        query = query.eq('status', webLeadStatus);
      }
      var res = await query;
      if (res.error) throw res.error;
      items = res.data || [];
      if (webLeadQuery) {
        var kw = Admin.util.deaccent(webLeadQuery);
        items = items.filter(function (r) {
          return Admin.util.deaccent([r.name, r.phone, r.email, r.product_interest, r.note].join(' ')).indexOf(kw) !== -1;
        });
      }
    } catch (err) {
      container.innerHTML = ui.emptyState(
        'bi-exclamation-triangle',
        'Không nạp được Leads từ Website',
        err.message || 'Lỗi kết nối bảng lead trên Supabase.'
      );
      return;
    }

    container.innerHTML =
      '<div class="card p-3 mb-3 bg-light border-0">' +
        '<div class="d-flex flex-wrap gap-2 align-items-center">' +
          '<div class="input-group input-group-sm" style="max-width:280px">' +
            '<span class="input-group-text bg-white"><i class="bi bi-search"></i></span>' +
            '<input type="search" class="form-control" id="webLeadSearch" placeholder="Tìm tên, SĐT, email, sản phẩm..." value="' + esc(webLeadQuery) + '">' +
          '</div>' +
          '<select class="form-select form-select-sm w-auto" id="webLeadSource">' +
            '<option value="all"' + (webLeadSource === 'all' ? ' selected' : '') + '>Mọi nguồn đăng ký</option>' +
            '<option value="quick-quote"' + (webLeadSource === 'quick-quote' ? ' selected' : '') + '>Báo giá nhanh</option>' +
            '<option value="product_detail"' + (webLeadSource === 'product_detail' ? ' selected' : '') + '>Trang chi tiết SP</option>' +
            '<option value="popup"' + (webLeadSource === 'popup' ? ' selected' : '') + '>Popup Lead Magnet</option>' +
            '<option value="landing"' + (webLeadSource === 'landing' ? ' selected' : '') + '>Landing Page</option>' +
            '<option value="cart-checkout"' + (webLeadSource === 'cart-checkout' ? ' selected' : '') + '>Giỏ hàng</option>' +
          '</select>' +
          '<select class="form-select form-select-sm w-auto" id="webLeadStatus">' +
            '<option value="all"' + (webLeadStatus === 'all' ? ' selected' : '') + '>Mọi trạng thái</option>' +
            '<option value="new"' + (webLeadStatus === 'new' ? ' selected' : '') + '>Mới (New)</option>' +
            '<option value="contacted"' + (webLeadStatus === 'contacted' ? ' selected' : '') + '>Đã liên hệ</option>' +
            '<option value="converted"' + (webLeadStatus === 'converted' ? ' selected' : '') + '>Đã chuyển vào CRM</option>' +
            '<option value="closed"' + (webLeadStatus === 'closed' ? ' selected' : '') + '>Đóng / Hủy</option>' +
          '</select>' +
          '<span class="ms-auto fs-12 text-ink-3">Tổng cộng: <strong class="text-ink">' + items.length + ' yêu cầu</strong> từ Website</span>' +
        '</div>' +
      '</div>' +
      (items.length === 0
        ? ui.emptyState('bi-globe', 'Chưa có yêu cầu báo giá từ Website', 'Khách hàng điền form Báo giá nhanh, Popup hoặc Chi tiết sản phẩm sẽ hiển thị tại đây.')
        : '<div class="card">' +
            '<div class="table-responsive">' +
              '<table class="table table-hover align-middle mb-0 fs-13">' +
                '<thead><tr>' +
                  '<th>Khách hàng / Liên hệ</th>' +
                  '<th>Nguồn</th>' +
                  '<th>Sản phẩm quan tâm</th>' +
                  '<th>Số lượng dự kiến</th>' +
                  '<th>Ngày gửi</th>' +
                  '<th>Trạng thái xử lý</th>' +
                  '<th class="text-end">Đưa vào Phễu CRM</th>' +
                '</tr></thead>' +
                '<tbody>' +
                  items.map(function (item) {
                    var srcLabel = WEB_SOURCE_LABELS[item.source] || item.source || 'Website';
                    var qty = item.quantity_estimate || item.quantity_expected || '—';
                    return '<tr data-web-lead-id="' + esc(item.id) + '">' +
                      '<td>' +
                        '<div class="fw-bold text-ink">' + esc(item.name || 'Khách hàng Web') + '</div>' +
                        '<div class="fs-12 text-primary"><i class="bi bi-telephone me-1"></i>' + esc(item.phone || '—') + '</div>' +
                        (item.email ? '<div class="fs-12 text-ink-3"><i class="bi bi-envelope me-1"></i>' + esc(item.email) + '</div>' : '') +
                      '</td>' +
                      '<td><span class="badge bg-light text-dark border">' + esc(srcLabel) + '</span></td>' +
                      '<td class="fw-semibold">' + esc(item.product_interest || '—') + '</td>' +
                      '<td>' + esc(qty) + '</td>' +
                      '<td class="fs-12 text-ink-3">' + (item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '—') + '</td>' +
                      '<td style="width:150px">' +
                        '<select class="form-select form-select-sm fs-12" data-web-status="' + esc(item.id) + '">' +
                          '<option value="new"' + (item.status === 'new' ? ' selected' : '') + '>Mới</option>' +
                          '<option value="contacted"' + (item.status === 'contacted' ? ' selected' : '') + '>Đã liên hệ</option>' +
                          '<option value="converted"' + (item.status === 'converted' ? ' selected' : '') + '>Đã chuyển đổi</option>' +
                          '<option value="closed"' + (item.status === 'closed' ? ' selected' : '') + '>Đóng/Hủy</option>' +
                        '</select>' +
                      '</td>' +
                      '<td class="text-end">' +
                        '<button type="button" class="btn btn-sm btn-outline-primary" data-promote-web="' + esc(item.id) + '">' +
                          '<i class="bi bi-plus-circle me-1"></i>Đưa vào Phễu CRM' +
                        '</button>' +
                      '</td>' +
                    '</tr>';
                  }).join('') +
                '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>');

    var sInput = $('#webLeadSearch', container);
    if (sInput) {
      sInput.addEventListener('input', Admin.util.debounce(function () {
        webLeadQuery = sInput.value.trim();
        renderWebLeadsTab(container, root);
      }, 280));
    }

    var srcEl = $('#webLeadSource', container);
    if (srcEl) {
      srcEl.addEventListener('change', function () {
        webLeadSource = srcEl.value;
        renderWebLeadsTab(container, root);
      });
    }

    var stEl = $('#webLeadStatus', container);
    if (stEl) {
      stEl.addEventListener('change', function () {
        webLeadStatus = stEl.value;
        renderWebLeadsTab(container, root);
      });
    }

    $$('[data-web-status]', container).forEach(function (sel) {
      sel.addEventListener('change', async function () {
        var id = sel.getAttribute('data-web-status');
        sel.disabled = true;
        try {
          var res = await supabase.from('lead').update({ status: sel.value }).eq('id', id);
          if (res.error) throw res.error;
          ui.toast('Đã cập nhật trạng thái Lead Website.', 'ok');
        } catch (e) {
          ui.toast('Không cập nhật được trạng thái: ' + e.message, 'err');
        } finally {
          sel.disabled = false;
        }
      });
    });

    $$('[data-promote-web]', container).forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var id = btn.getAttribute('data-promote-web');
        var leadObj = items.find(function (x) { return String(x.id) === String(id); });
        if (!leadObj) return;

        var list = Admin.b2b.getRecords();
        var newCode = 'WEB' + String(list.length + 1).padStart(2, '0');
        var parsedVol = parseInt(String(leadObj.quantity_estimate || '').replace(/[^\d]/g, ''), 10) || 500;
        var srcLabel = WEB_SOURCE_LABELS[leadObj.source] || leadObj.source || 'Website';

        list.unshift({
          code: newCode,
          routeGroup: 'Q12_HM',
          region: 'Quận 12',
          ward: 'Từ Website',
          industry: 'Logistics & Kho vận',
          company: leadObj.name || 'Khách hàng Website',
          address: leadObj.note || 'Đăng ký báo giá trên Website',
          phone: leadObj.phone || '',
          website: leadObj.email || '',
          contactPerson: leadObj.name || '',
          mainProduct: leadObj.product_interest || 'Băng keo OPP + Màng PE',
          expectedVolume: parsedVol,
          status: 'Đã gọi - Xin gửi mẫu',
          lastCallDate: new Date().toISOString().slice(0, 10),
          sampleSentDate: '',
          sampleResult: 'Chưa gửi',
          policy: parsedVol >= 500 ? 'Công nợ gối đầu 15 ngày' : 'Giá sỉ Bậc 1 (COD)',
          nextFollowUp: '',
          notes: 'Chuyển từ Lead Website (' + srcLabel + ')',
          activities: [{
            time: 'Vừa xong',
            type: 'Tiếp nhận từ Website',
            note: 'Chuyển từ yêu cầu báo giá trên Website (' + srcLabel + ').'
          }]
        });
        Admin.b2b.saveRecords(list);
        try {
          await supabase.from('lead').update({ status: 'converted' }).eq('id', id);
        } catch (e) {}
        if (Admin.refreshBadges) Admin.refreshBadges();
        ui.toast('Đã đưa ' + newCode + ' vào Phễu CRM B2B!', 'ok');
        activeTab = 'kanban';
        renderWorkspace(root);
        openCustomer360Modal(newCode, root);
      });
    });
  }

})(window.Admin);

