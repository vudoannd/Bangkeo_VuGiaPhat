/* ==========================================================================
 * js/compare.js — Logic So sánh sản phẩm (Tối đa 4 sản phẩm side-by-side)
 * ========================================================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'compareList';
  var MAX_COMPARE = 4;

  function getCompareList() {
    try {
      var list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      return Array.isArray(list) ? list.map(function (id) { return Number(id); }).filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCompareList(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    updateCompareBadges();
  }

  function updateCompareBadges() {
    var list = getCompareList();
    var badges = document.querySelectorAll('#compareCount');
    badges.forEach(function (b) {
      b.textContent = list.length;
      b.classList.toggle('d-none', list.length === 0);
    });
    var btns = document.querySelectorAll('[data-compare]');
    btns.forEach(function (btn) {
      var id = Number(btn.getAttribute('data-compare'));
      var active = list.indexOf(id) !== -1;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function addToCompare(id) {
    var numId = Number(id);
    if (!numId) return;
    var list = getCompareList();
    var idx = list.indexOf(numId);

    if (idx !== -1) {
      list.splice(idx, 1);
      saveCompareList(list);
      if (window.toast) window.toast('Đã xóa sản phẩm khỏi danh sách so sánh.', 'info');
    } else {
      if (list.length >= MAX_COMPARE) {
        if (window.toast) window.toast('Chỉ có thể so sánh tối đa ' + MAX_COMPARE + ' sản phẩm cùng lúc.', 'err');
        else alert('Chỉ có thể so sánh tối đa ' + MAX_COMPARE + ' sản phẩm cùng lúc.');
        return;
      }
      list.push(numId);
      saveCompareList(list);
      if (window.toast) window.toast('Đã thêm vào danh sách so sánh (' + list.length + '/' + MAX_COMPARE + ').', 'ok');
    }

    if (document.getElementById('compareTableContainer')) {
      renderCompareTable();
    }
  }

  function removeFromCompare(id) {
    var numId = Number(id);
    var list = getCompareList().filter(function (item) { return item !== numId; });
    saveCompareList(list);
    if (document.getElementById('compareTableContainer')) {
      renderCompareTable();
    }
  }

  function clearCompare() {
    saveCompareList([]);
    if (document.getElementById('compareTableContainer')) {
      renderCompareTable();
    }
  }

  function renderCompareTable() {
    var container = document.getElementById('compareTableContainer');
    var clearBtn = document.getElementById('btnClearCompare');
    if (!container) return;

    var ids = getCompareList();
    if (clearBtn) clearBtn.classList.toggle('d-none', ids.length === 0);

    if (ids.length === 0) {
      container.innerHTML =
        '<div class="text-center py-5 bg-white rounded-4 border shadow-sm p-4">' +
          '<i class="bi bi-arrows-angle-expand text-muted" style="font-size: 3.5rem;"></i>' +
          '<h3 class="h5 fw-bold mt-3">Chưa có sản phẩm nào để so sánh</h3>' +
          '<p class="text-body-secondary small mb-4">Hãy bấm nút <strong>"So sánh"</strong> trên các thẻ sản phẩm để đặt lên bàn cân tối đa 4 sản phẩm cùng lúc.</p>' +
          '<a href="products.html" class="btn btn-primary rounded-pill px-4"><i class="bi bi-grid me-1"></i>Chọn sản phẩm để so sánh</a>' +
        '</div>';
      return;
    }

    if (typeof supabaseClient === 'undefined') {
      setTimeout(renderCompareTable, 400);
      return;
    }

    container.innerHTML =
      '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted small">Đang tải thông số kỹ thuật...</p></div>';

    supabaseClient
      .from('product')
      .select('*, category:category_id(name)')
      .in('id', ids)
      .then(function (res) {
        if (res.error || !res.data || res.data.length === 0) {
          container.innerHTML = '<div class="alert alert-warning">Không tải được thông tin sản phẩm so sánh.</div>';
          return;
        }

        // Sắp xếp đúng theo thứ tự người dùng đã chọn
        var byId = {};
        res.data.forEach(function (p) { byId[p.id] = p; });
        var products = ids.map(function (id) { return byId[id]; }).filter(Boolean);

        var esc = window.esc || function (s) { return String(s == null ? '' : s); };
        var formatPrice = window.formatPrice || function (n) { return n ? n.toLocaleString('vi-VN') + ' đ' : 'Liên hệ'; };
        var fallbackImg = window.FALLBACK_IMG || 'images/logo.webp';

        function imgPath(p) {
          if (!p.image) return fallbackImg;
          if (p.image.indexOf('images/') === 0 || /^https?:\/\//i.test(p.image)) return p.image;
          return 'images/products/' + p.image.replace(/\.(png|jpg|jpeg)$/i, '.webp');
        }

        var colWidth = Math.floor(80 / Math.max(1, products.length)) + '%';

        var html =
          '<div class="card border shadow-sm rounded-4 overflow-hidden">' +
            '<div class="table-responsive">' +
              '<table class="table table-bordered align-middle mb-0 compare-table">' +
                '<thead class="table-light">' +
                  '<tr>' +
                    '<th style="width:20%; min-width:160px;" class="bg-light">Tiêu chí so sánh</th>';

        products.forEach(function (p) {
          html +=
            '<th style="width:' + colWidth + '; min-width:210px;" class="text-center position-relative p-3 bg-white">' +
              '<button type="button" class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-2 rounded-circle" ' +
                      'style="width:30px;height:30px;padding:0;" onclick="removeFromCompare(' + p.id + ')" title="Xóa khỏi so sánh">' +
                '<i class="bi bi-x-lg"></i>' +
              '</button>' +
              '<a href="product-detail.html?id=' + p.id + '" class="d-block mb-2">' +
                '<img src="' + esc(imgPath(p)) + '" alt="' + esc(p.name) + '" style="height:120px; object-fit:contain;" onerror="this.onerror=null;this.src=\'' + fallbackImg + '\'">' +
              '</a>' +
              '<h4 class="fs-6 fw-bold mb-1"><a href="product-detail.html?id=' + p.id + '" class="text-dark text-decoration-none hover-brand">' + esc(p.name) + '</a></h4>' +
              '<span class="badge bg-primary-subtle text-primary-emphasis small">' + esc(p.category ? p.category.name : 'Băng keo & Màng PE') + '</span>' +
            '</th>';
        });

        html += '</tr></thead><tbody>';

        var specsRows = [
          {
            label: 'Giá tham khảo',
            render: function (p) {
              return '<span class="fs-5 fw-bold text-danger">' + formatPrice(isFinite(p.price) ? Number(p.price) : null) + '</span>';
            }
          },
          {
            label: 'Tình trạng kho',
            render: function (p) {
              return Number(p.in_stock) !== 0
                ? '<span class="badge bg-success-subtle text-success-emphasis">Còn hàng</span>'
                : '<span class="badge bg-danger-subtle text-danger-emphasis">Hết hàng</span>';
            }
          },
          {
            label: 'Số lượng tối thiểu (MOQ)',
            render: function (p) { return esc(p.moq || 'Liên hệ'); }
          },
          {
            label: 'Đánh giá',
            render: function (p) {
              return p.rating != null
                ? '<span class="text-warning fw-bold"><i class="bi bi-star-fill me-1"></i>' + Number(p.rating).toFixed(1) + ' / 5.0</span>'
                : '<span class="text-muted fst-italic">Chưa có đánh giá</span>';
            }
          },
          {
            label: 'Độ dày màng (Mic)',
            render: function (p) { return esc(p.thickness || '—'); }
          },
          {
            label: 'Chiều dài (Yard)',
            render: function (p) { return esc(p.length || '—'); }
          },
          {
            label: 'Trọng lượng',
            render: function (p) { return esc(p.weight || '—'); }
          },
          {
            label: 'Độ bám dính',
            render: function (p) { return esc(p.adhesion || '—'); }
          },
          {
            label: 'Quy cách đóng gói',
            render: function (p) { return esc(p.packaging || '—'); }
          },
          {
            label: 'Ứng dụng thực tế',
            render: function (p) { return esc(p.application || '—'); }
          },
          {
            label: 'Hành động',
            render: function (p) {
              return '<div class="d-grid gap-2">' +
                '<button type="button" class="btn btn-sm btn-primary rounded-pill fw-semibold" onclick="if(window.CartManager) window.CartManager.add(' + p.id + ', \'default\', 1)">' +
                  '<i class="bi bi-cart-plus me-1"></i>Thêm vào giỏ' +
                '</button>' +
                '<a href="product-detail.html?id=' + p.id + '" class="btn btn-sm btn-outline-secondary rounded-pill">Xem chi tiết</a>' +
              '</div>';
            }
          }
        ];

        specsRows.forEach(function (row) {
          html += '<tr><th class="bg-light fw-semibold small text-secondary">' + row.label + '</th>';
          products.forEach(function (p) {
            html += '<td class="text-center small">' + row.render(p) + '</td>';
          });
          html += '</tr>';
        });

        html += '</tbody></table></div></div>';
        container.innerHTML = html;
      });
  }

  window.getCompareList = getCompareList;
  window.addToCompare = addToCompare;
  window.removeFromCompare = removeFromCompare;
  window.clearCompare = clearCompare;
  window.renderCompareTable = renderCompareTable;
  window.updateCompareBadges = updateCompareBadges;

  document.addEventListener('DOMContentLoaded', function () {
    updateCompareBadges();
    if (document.getElementById('compareTableContainer')) {
      renderCompareTable();
    }
  });
})();

