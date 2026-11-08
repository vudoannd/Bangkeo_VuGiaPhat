(function() {
  var currentProduct = null;
  var currentTiers = [];
  var currentBasePrice = 0;

  function getQueryParam(param) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.shareSocial = function(network) {
    var rawUrl = window.location.href;
    var url = encodeURIComponent(rawUrl);
    var title = encodeURIComponent(document.title);
    if (window.trackEvent) window.trackEvent('share', { method: network, content_type: 'product' });

    if (network === 'facebook') {
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + url, '_blank', 'width=600,height=400');
    } else if (network === 'zalo') {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(rawUrl).catch(function() {});
      }
      var zaloShareUrl = 'https://button-share.zalo.me/share_external?d=' + btoa(unescape(encodeURIComponent(JSON.stringify({ url: rawUrl }))));
      window.open(zaloShareUrl, '_blank', 'width=600,height=500');
    } else if (network === 'twitter') {
      window.open('https://twitter.com/intent/tweet?url=' + url + '&text=' + title, '_blank', 'width=600,height=400');
    } else if (network === 'copy') {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(rawUrl).then(function() {
          if (window.toast) window.toast('Đã sao chép đường dẫn sản phẩm!', 'ok');
          else alert('Đã sao chép đường dẫn sản phẩm!');
        });
      } else {
        alert('Copy đường dẫn: ' + rawUrl);
      }
    }
  };

  function buildNormalizedTiers(rawTiers, basePrice) {
    var normalized = [];
    if (Array.isArray(rawTiers) && rawTiers.length > 0) {
      rawTiers.forEach(function(t) {
        var minQ = t.min_quantity != null ? Number(t.min_quantity) : (t.min != null ? Number(t.min) : null);
        var maxQ = t.max_quantity != null && t.max_quantity !== '' ? Number(t.max_quantity) : (t.max != null && t.max !== '' ? Number(t.max) : null);
        var label = t.quantity || '';
        if (!label && minQ != null) {
          label = maxQ ? (minQ + ' – ' + maxQ + ' cuộn') : ('≥ ' + minQ + ' cuộn');
        }
        var p = Number(t.price) || 0;
        normalized.push({
          min: minQ || 1,
          max: maxQ || null,
          label: label || 'Số lượng sỉ',
          price: p
        });
      });
    } else if (basePrice && basePrice > 0) {
      var tier2Price = Math.round((basePrice * 0.94) / 100) * 100;
      var tier3Price = Math.round((basePrice * 0.88) / 100) * 100;
      normalized = [
        { min: 1, max: 99, label: '1 – 99 cuộn', price: basePrice },
        { min: 100, max: 499, label: '100 – 499 cuộn', price: tier2Price },
        { min: 500, max: null, label: '≥ 500 cuộn', price: tier3Price }
      ];
    }
    return normalized;
  }

  function renderPriceTiers(tiers, basePrice) {
    currentTiers = buildNormalizedTiers(tiers, basePrice);
    var tierBar = document.getElementById('pdTierBar');
    if (tierBar && currentTiers.length > 0) {
      var barHtml = '';
      currentTiers.forEach(function(t, idx) {
        var activeCls = idx === 0 ? ' active' : '';
        var pctBadge = '';
        if (basePrice && t.price > 0 && t.price < basePrice) {
          var pct = Math.round(((basePrice - t.price) / basePrice) * 100);
          if (pct > 0) {
            pctBadge = ' <span class="badge bg-danger-subtle text-danger-emphasis" style="font-size:0.65rem">-' + pct + '%</span>';
          }
        }
        barHtml += '<div class="pd-tier-col' + activeCls + '" data-tier-index="' + idx + '" data-min="' + t.min + '" data-max="' + (t.max || '') + '" data-price="' + t.price + '">' +
          '<div class="pd-tier-qty">' + escHtml(t.label) + pctBadge + '</div>' +
          '<div class="pd-tier-price"' + (idx === 0 ? ' id="pdPrice"' : '') + '>' + (t.price > 0 ? t.price.toLocaleString('vi-VN') + ' đ' : 'Liên hệ') + '</div>' +
        '</div>';
      });
      tierBar.innerHTML = barHtml;
    }

    var container = document.getElementById('priceTiersContainer');
    if (!container || !tiers || !tiers.length) return;

    container.classList.remove('d-none');
    var qtyHtml = '<th>Số lượng</th>';
    var priceHtml = '<th>Đơn giá</th>';
    var discountRowHtml = '<th>Tiết kiệm</th>';
    var hasDiscount = false;

    currentTiers.forEach(function(t) {
      qtyHtml += '<td>' + escHtml(t.label) + '</td>';
      priceHtml += '<td>' + (t.price > 0 ? t.price.toLocaleString('vi-VN') + ' đ' : 'Liên hệ') + '</td>';

      if (basePrice && basePrice > t.price && t.price > 0) {
        var pct = Math.round(((basePrice - t.price) / basePrice) * 100);
        if (pct > 0) {
          hasDiscount = true;
          discountRowHtml += '<td><span class="badge bg-success-subtle text-success-emphasis">-' + pct + '%</span></td>';
        } else {
          discountRowHtml += '<td>—</td>';
        }
      } else {
        discountRowHtml += '<td>—</td>';
      }
    });

    var qtyRow = document.getElementById('priceTiersQtyRow');
    var priceRow = document.getElementById('priceTiersPriceRow');
    if (qtyRow) qtyRow.innerHTML = qtyHtml;
    if (priceRow) {
      priceRow.innerHTML = priceHtml;
      var tbody = priceRow.parentElement;
      var oldDisc = document.getElementById('priceTiersDiscountRow');
      if (oldDisc) oldDisc.remove();
      if (hasDiscount && tbody) {
        var tr = document.createElement('tr');
        tr.id = 'priceTiersDiscountRow';
        tr.className = 'small';
        tr.innerHTML = discountRowHtml;
        tbody.appendChild(tr);
      }
    }
  }

  function updateBuyBoxCalculation() {
    var qtyInput = document.getElementById('pdOrderQty');
    var qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;

    var variantSelect = document.getElementById('pdVariant');
    var selectedOpt = variantSelect && variantSelect.options[variantSelect.selectedIndex];
    var variantPrice = selectedOpt && selectedOpt.getAttribute('data-price') ? Number(selectedOpt.getAttribute('data-price')) : 0;

    var unitPrice = variantPrice > 0 ? variantPrice : currentBasePrice;
    var activeTierIdx = 0;

    if (currentTiers && currentTiers.length > 0) {
      currentTiers.forEach(function(t, idx) {
        var matchesMin = qty >= (t.min || 1);
        var matchesMax = !t.max || qty <= t.max;
        if (matchesMin && matchesMax) {
          activeTierIdx = idx;
          if (!variantPrice && t.price > 0) {
            unitPrice = t.price;
          }
        }
      });
    }

    var tierCols = document.querySelectorAll('#pdTierBar .pd-tier-col');
    tierCols.forEach(function(col, idx) {
      col.classList.toggle('active', idx === activeTierIdx);
    });

    var unitEl = document.getElementById('pdActiveUnitPrice');
    var totalEl = document.getElementById('pdEstimatedTotal');
    if (unitEl) {
      unitEl.textContent = unitPrice > 0 ? unitPrice.toLocaleString('vi-VN') + ' đ' : 'Liên hệ';
    }
    if (totalEl) {
      totalEl.textContent = unitPrice > 0 ? (unitPrice * qty).toLocaleString('vi-VN') + ' đ' : 'Liên hệ báo giá';
    }
  }

  function compactProductCardHTML(p) {
    var priceStr = p.price && isFinite(p.price) ? Number(p.price).toLocaleString('vi-VN') + ' đ' : 'Liên hệ';
    var img = p.image || 'images/logo.webp';
    return '<div class="col">' +
      '<a href="product-detail.html?id=' + escHtml(p.id) + '" class="text-decoration-none text-dark d-block h-100">' +
        '<div class="pd-compact-card">' +
          '<img src="' + escHtml(img) + '" alt="' + escHtml(p.title || p.name) + '" loading="lazy">' +
          '<div class="p-2 d-flex flex-column flex-grow-1 border-top">' +
            '<div class="small fw-semibold text-truncate mb-1" title="' + escHtml(p.title || p.name) + '">' + escHtml(p.title || p.name) + '</div>' +
            '<div class="mt-auto">' +
              '<div class="text-danger fw-bold small">' + priceStr + '</div>' +
              '<div class="text-muted" style="font-size:0.7rem">MOQ: ' + escHtml(p.moq || '1 bao') + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</a>' +
    '</div>';
  }

  function renderReviewsSection() {
    var container = document.getElementById('pdReviewsList');
    if (!container) return;

    var fallbackReviews = [
      {
        customer_name: 'Anh Minh Hoàng',
        company: 'Kho vận Logistics Tân Bình',
        rating: 5,
        comment: 'Băng keo trong 4.8F 100Y của xưởng Vũ Gia Phát keo rất ăn thùng carton, kéo máy đóng thùng không bị đứt ngang. Giao hàng đúng hẹn trong ngày.'
      },
      {
        customer_name: 'Chị Thanh Thảo',
        company: 'Công ty May mặc Xuất khẩu Bình Dương',
        rating: 5,
        comment: 'Đã cân thử và đo số yard thực tế, chuẩn đúng cam kết của xưởng. Giá lấy theo pallet rất cạnh tranh, đầy đủ hóa đơn VAT.'
      },
      {
        customer_name: 'Anh Quốc Tuấn',
        company: 'Xưởng Gỗ Nội Thất Đồng Nai',
        rating: 5,
        comment: 'Màng PE quấn pallet dẻo, độ co giãn tốt, lõi giấy mỏng nên lợi số mét màng thực tế hơn nhiều chỗ khác.'
      }
    ];

    function renderItems(items) {
      var html = '';
      items.slice(0, 4).forEach(function(r) {
        var stars = '';
        var rt = Number(r.rating) || 5;
        for (var i = 0; i < 5; i++) {
          stars += '<i class="bi ' + (i < rt ? 'bi-star-fill' : 'bi-star') + '"></i>';
        }
        var initials = (r.customer_name || 'KH').trim().split(' ').pop().charAt(0).toUpperCase();
        html += '<div class="border rounded-3 p-3 bg-white shadow-xs">' +
          '<div class="d-flex justify-content-between align-items-start mb-2">' +
            '<div class="d-flex align-items-center gap-2">' +
              '<div class="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center" style="width:38px;height:38px;font-size:0.9rem">' + escHtml(initials) + '</div>' +
              '<div>' +
                '<div class="fw-bold text-dark small">' + escHtml(r.customer_name) + ' <span class="badge bg-success-subtle text-success-emphasis ms-1" style="font-size:0.65rem">Đã mua sỉ</span></div>' +
                '<div class="text-muted" style="font-size:0.75rem">' + escHtml(r.company || 'Khách hàng Doanh nghiệp') + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="text-warning small">' + stars + '</div>' +
          '</div>' +
          '<p class="small text-secondary mb-0">' + escHtml(r.comment || r.content || '') + '</p>' +
        '</div>';
      });
      container.innerHTML = html;
    }

    if (typeof supabaseClient !== 'undefined') {
      supabaseClient.from('testimonial').select('*').eq('is_active', true).order('sort_order', { ascending: true }).limit(4)
        .then(function(res) {
          if (res.data && res.data.length > 0) {
            renderItems(res.data);
          } else {
            renderItems(fallbackReviews);
          }
        })
        .catch(function() {
          renderItems(fallbackReviews);
        });
    } else {
      renderItems(fallbackReviews);
    }
  }

  function setupStickySectionNav() {
    var nav = document.getElementById('pdSectionNav');
    if (!nav) return;
    var links = nav.querySelectorAll('.nav-link');
    links.forEach(function(link) {
      link.addEventListener('click', function(e) {
        var href = link.getAttribute('href');
        if (href && href.charAt(0) === '#') {
          var target = document.querySelector(href);
          if (target) {
            e.preventDefault();
            links.forEach(function(l) { l.classList.remove('active'); });
            link.classList.add('active');
            var top = target.getBoundingClientRect().top + window.pageYOffset - 135;
            window.scrollTo({ top: top, behavior: 'smooth' });
          }
        }
      });
    });
  }

  function submitProductLead(payload, btnEl) {
    var origText = btnEl ? btnEl.innerHTML : '';
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang gửi...';
    }

    var submissionSummary = {
      type: 'quote',
      name: payload.name,
      phone: payload.phone,
      product: payload.product_interest,
      quantity: payload.quantity_estimate,
      note: payload.note || '',
      created_at: new Date().toISOString()
    };

    try {
      sessionStorage.setItem('vgp_last_submission', JSON.stringify(submissionSummary));
    } catch (e) {}

    if (typeof supabaseClient !== 'undefined') {
      supabaseClient.from('lead').insert([payload])
        .then(function() {
          if (window.trackEvent) {
            window.trackEvent('generate_lead', {
              lead_source: payload.source,
              product_interest: payload.product_interest
            });
          }
          window.location.href = 'thank-you.html?type=quote';
        })
        .catch(function() {
          window.location.href = 'thank-you.html?type=quote';
        });
    } else {
      window.location.href = 'thank-you.html?type=quote';
    }
  }

  function renderProductDetail(product, category) {
    currentProduct = product;

    if (window.trackEvent) {
      window.trackEvent('view_item', {
        item_id: product.id,
        item_name: product.title,
        price: product.price || 0
      });
    }

    // 1. Breadcrumb & Titles
    document.getElementById('bcProductName').textContent = product.title;
    document.getElementById('pdTitle').textContent = product.title;
    document.title = product.title + ' - Vũ Gia Phát';
    if (category) {
      document.getElementById('pdCategory').textContent = category.name;
      var bcCat = document.getElementById('bcCategoryLink');
      if (bcCat) {
        bcCat.textContent = category.name;
        bcCat.href = 'products.html?cat=' + encodeURIComponent(category.id);
      }
    }

    var stockEl = document.getElementById('pdStock');
    if (stockEl) {
      var inStock = Number(product.in_stock) !== 0;
      stockEl.textContent = inStock ? 'Còn hàng sẵn kho' : 'Đặt sản xuất theo đơn';
      stockEl.className = inStock ? 'text-success fw-bold' : 'text-warning fw-bold';
    }

    // 2. Price & Moq
    var priceNum = isFinite(product.price) ? Number(product.price) : 0;
    currentBasePrice = priceNum;
    var pdPriceEl = document.getElementById('pdPrice');
    if (pdPriceEl) {
      pdPriceEl.textContent = priceNum ? priceNum.toLocaleString('vi-VN') + ' đ' : 'Liên hệ';
    }
    document.getElementById('pdMoq').textContent = product.moq || '1 bao / 50 cuộn';

    // 2.5 Price Tiers (Alibaba Horizontal Bar + Reference Table)
    var tiers = [];
    try {
      tiers = product.price_tiers ? (typeof product.price_tiers === 'string' ? JSON.parse(product.price_tiers) : product.price_tiers) : [];
    } catch (e) {}
    renderPriceTiers(tiers, priceNum);

    // 3. Quick Specs
    document.getElementById('pdThickness').textContent = product.thickness || '43 - 50 mic';
    document.getElementById('pdLength').textContent = product.length || '100 Yard';
    document.getElementById('pdWeight').textContent = product.weight || 'Chuẩn xưởng';
    document.getElementById('pdPackaging').textContent = product.packaging || '6 cuộn/cây';

    // 4. Key Attributes Table
    document.getElementById('tbMaterial').textContent = product.material || 'Màng BOPP / PVC nguyên sinh';
    document.getElementById('tbAdhesion').textContent = product.adhesion || 'Keo Acrylic gốc nước siêu dính';
    document.getElementById('tbThickness').textContent = product.thickness || '43 mic / 50 mic (Tùy chọn)';
    document.getElementById('tbLength').textContent = product.length || '80Y / 100Y / 200Y';
    document.getElementById('tbWeight').textContent = product.weight || 'Theo quy cách cây/cuộn';
    document.getElementById('tbColor').textContent = product.color || 'Trong suốt / Đục / Theo mẫu';
    document.getElementById('tbApplication').textContent = product.application || 'Đóng thùng carton, kho vận, xuất khẩu';

    var tbPkg = document.getElementById('tbPackagingDetail');
    if (tbPkg && product.packaging) tbPkg.textContent = product.packaging;
    var tbMoq = document.getElementById('tbMoqDetail');
    if (tbMoq && product.moq) tbMoq.textContent = product.moq;

    // 5. Description
    if (product.description) {
      document.getElementById('pdDescription').innerHTML = product.description;
    } else {
      document.getElementById('pdDescription').innerHTML =
        '<p><strong>' + escHtml(product.title) + '</strong> được sản xuất trực tiếp tại <strong>Xưởng Băng Keo Vũ Gia Phát</strong> trên dây chuyền tráng keo và phân cuộn hiện đại. Sản phẩm đảm bảo độ bám dính vượt trội, màng keo dẻo dai không đứt ngang và cam kết đủ số Yard trên từng cuộn.</p>';
    }

    var showcaseMainImg = document.getElementById('pdShowcaseMainImg');
    if (showcaseMainImg && product.image) {
      showcaseMainImg.src = product.image;
      showcaseMainImg.alt = product.title;
    }

    // 6. Gallery (Vertical Thumbnails + Main Carousel)
    var images = [];
    if (product.galleryParsed && product.galleryParsed.length > 0) {
      images = product.galleryParsed.filter(Boolean);
    }
    if (product.image && images.indexOf(product.image) === -1) {
      images.unshift(product.image);
    }
    if (images.length === 0) {
      images = ['images/logo.webp'];
    }

    var innerHtml = '';
    var thumbsHtml = '';
    images.forEach(function(img, i) {
      var active = i === 0 ? 'active' : '';
      innerHtml += '<div class="carousel-item ' + active + ' h-100">' +
        '<img src="' + escHtml(img) + '" class="d-block w-100 h-100" style="object-fit:contain" alt="' + escHtml(product.title) + '">' +
      '</div>';

      thumbsHtml += '<img src="' + escHtml(img) + '" class="pd-thumb-item ' + active + '" data-slide-idx="' + i + '" alt="' + escHtml(product.title) + ' - ảnh ' + (i + 1) + '">';
    });
    document.getElementById('galleryInner').innerHTML = innerHtml;
    var thumbsContainer = document.getElementById('galleryThumbs');
    thumbsContainer.innerHTML = thumbsHtml;

    var galleryEl = document.getElementById('productGallery');
    thumbsContainer.querySelectorAll('.pd-thumb-item').forEach(function(thumbEl) {
      thumbEl.addEventListener('click', function() {
        var idx = parseInt(thumbEl.getAttribute('data-slide-idx'), 10) || 0;
        bootstrap.Carousel.getOrCreateInstance(galleryEl).to(idx);
        thumbsContainer.querySelectorAll('.pd-thumb-item').forEach(function(el) { el.classList.remove('active'); });
        thumbEl.classList.add('active');
      });
    });
    if (galleryEl) {
      galleryEl.addEventListener('slid.bs.carousel', function(ev) {
        var idx = ev.to;
        thumbsContainer.querySelectorAll('.pd-thumb-item').forEach(function(el, i) {
          el.classList.toggle('active', i === idx);
        });
      });
    }

    // 7. Variants (Visual Pills + Select Sync)
    var variants = [];
    try {
      variants = product.variants ? (typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants) : [];
    } catch (e) {}

    var variantSelect = document.getElementById('pdVariant');
    var variantPills = document.getElementById('pdVariantPills');
    var selectedVariantLabel = document.getElementById('pdSelectedVariantLabel');

    if (variants.length > 0) {
      var opts = '';
      var pillsHtml = '';
      variants.forEach(function(v, idx) {
        var vVal = v.id || v.name || ('v_' + idx);
        var vName = v.name || vVal;
        var vPrice = v.price ? Number(v.price) : 0;
        opts += '<option value="' + escHtml(vVal) + '" data-price="' + vPrice + '" data-name="' + escHtml(vName) + '">' +
          escHtml(vName) + (vPrice ? ' - ' + vPrice.toLocaleString('vi-VN') + ' đ' : '') +
        '</option>';
        pillsHtml += '<button type="button" class="pd-variant-pill' + (idx === 0 ? ' active' : '') + '" data-variant-val="' + escHtml(vVal) + '">' +
          escHtml(vName) +
        '</button>';
      });
      variantSelect.innerHTML = opts;
      if (variantPills) variantPills.innerHTML = pillsHtml;
      if (selectedVariantLabel) selectedVariantLabel.textContent = variants[0].name || 'Tiêu chuẩn';
    } else {
      var defaultSpecs = [
        product.length ? ('Khổ chuẩn • ' + product.length) : 'Quy cách tiêu chuẩn',
        'Thùng / Bao sỉ (20 cây)',
        'Đặt cắt theo yêu cầu'
      ];
      variantSelect.innerHTML = '<option value="default" data-price="' + priceNum + '" data-name="' + escHtml(defaultSpecs[0]) + '">' + escHtml(defaultSpecs[0]) + '</option>';
      if (variantPills) {
        variantPills.innerHTML = defaultSpecs.map(function(sp, idx) {
          return '<button type="button" class="pd-variant-pill' + (idx === 0 ? ' active' : '') + '" data-variant-label="' + escHtml(sp) + '">' + escHtml(sp) + '</button>';
        }).join('');
      }
      if (selectedVariantLabel) selectedVariantLabel.textContent = defaultSpecs[0];
    }

    if (variantPills) {
      variantPills.querySelectorAll('.pd-variant-pill').forEach(function(btn) {
        btn.addEventListener('click', function() {
          variantPills.querySelectorAll('.pd-variant-pill').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          var vVal = btn.getAttribute('data-variant-val');
          var vLabel = btn.getAttribute('data-variant-label') || btn.textContent;
          if (vVal && variantSelect) {
            variantSelect.value = vVal;
          }
          if (selectedVariantLabel) selectedVariantLabel.textContent = vLabel;
          updateBuyBoxCalculation();
        });
      });
    }

    if (variantSelect) {
      variantSelect.addEventListener('change', function() {
        var opt = variantSelect.options[variantSelect.selectedIndex];
        var label = opt ? (opt.getAttribute('data-name') || opt.textContent) : 'Mặc định';
        if (selectedVariantLabel) selectedVariantLabel.textContent = label;
        if (variantPills) {
          variantPills.querySelectorAll('.pd-variant-pill').forEach(function(b) {
            b.classList.toggle('active', b.getAttribute('data-variant-val') === variantSelect.value);
          });
        }
        updateBuyBoxCalculation();
      });
    }

    // 8. Sticky Buy Box Quantity & Actions
    var qtyInput = document.getElementById('pdOrderQty');
    var btnMinus = document.getElementById('pdQtyMinus');
    var btnPlus = document.getElementById('pdQtyPlus');
    if (btnMinus && qtyInput) {
      btnMinus.addEventListener('click', function() {
        var cur = parseInt(qtyInput.value, 10) || 10;
        qtyInput.value = Math.max(1, cur - 10);
        updateBuyBoxCalculation();
      });
    }
    if (btnPlus && qtyInput) {
      btnPlus.addEventListener('click', function() {
        var cur = parseInt(qtyInput.value, 10) || 10;
        qtyInput.value = cur + 10;
        updateBuyBoxCalculation();
      });
    }
    if (qtyInput) {
      qtyInput.addEventListener('input', updateBuyBoxCalculation);
      qtyInput.addEventListener('change', updateBuyBoxCalculation);
    }
    updateBuyBoxCalculation();

    // Add to Cart with selected quantity
    document.getElementById('pdAddToCart').addEventListener('click', function() {
      var vid = variantSelect ? variantSelect.value : 'default';
      var qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;
      if (window.CartManager) {
        window.CartManager.add(product.id, vid, qty);
      } else {
        alert('Giỏ hàng đang khởi tạo, vui lòng thử lại.');
      }
    });

    // Quick Quote Modal Trigger
    var btnOpenQuote = document.getElementById('btnOpenProductQuote');
    if (btnOpenQuote) {
      btnOpenQuote.addEventListener('click', function() {
        var pqProd = document.getElementById('pqProductName');
        var pqVar = document.getElementById('pqVariantName');
        var pqQty = document.getElementById('pqQtyLabel');
        var pqInputQty = document.getElementById('pqCustomerQty');
        var curVarText = selectedVariantLabel ? selectedVariantLabel.textContent : 'Tiêu chuẩn';
        var curQtyVal = qtyInput ? qtyInput.value : '50';

        if (pqProd) pqProd.textContent = product.title;
        if (pqVar) pqVar.textContent = curVarText;
        if (pqQty) pqQty.textContent = curQtyVal + ' cuộn/cây';
        if (pqInputQty && !pqInputQty.value) pqInputQty.value = curQtyVal + ' cuộn (' + curVarText + ')';

        var modalEl = document.getElementById('productQuoteModal');
        if (modalEl && window.bootstrap) {
          bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }
      });
    }

    // Modal Quote Form Submit
    var pqForm = document.getElementById('productQuoteForm');
    if (pqForm) {
      pqForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var name = document.getElementById('pqCustomerName').value.trim();
        var phone = document.getElementById('pqCustomerPhone').value.trim();
        var qtyEst = document.getElementById('pqCustomerQty').value.trim();
        var note = document.getElementById('pqCustomerNote').value.trim();
        if (!name || !phone) return;

        submitProductLead({
          name: name,
          phone: phone,
          product_interest: product.title + ' (' + (selectedVariantLabel ? selectedVariantLabel.textContent : 'Mặc định') + ')',
          quantity_estimate: qtyEst || (qtyInput ? qtyInput.value + ' cuộn' : ''),
          note: note,
          source: 'product_detail',
          status: 'new'
        }, document.getElementById('pqSubmitBtn'));
      });
    }

    // Side Quick Inquiry Form Submit
    var sideForm = document.getElementById('pdSideLeadForm');
    if (sideForm) {
      sideForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var name = document.getElementById('sideLeadName').value.trim();
        var phone = document.getElementById('sideLeadPhone').value.trim();
        var qtyEst = document.getElementById('sideLeadQty').value.trim();
        if (!name || !phone) return;

        submitProductLead({
          name: name,
          phone: phone,
          product_interest: product.title,
          quantity_estimate: qtyEst || 'Báo giá sỉ',
          source: 'product_detail_sidebar',
          status: 'new'
        }, sideForm.querySelector('button[type="submit"]'));
      });
    }

    // Compare button
    var pdCompareBtn = document.getElementById('pdCompareBtn');
    if (pdCompareBtn) {
      pdCompareBtn.setAttribute('data-compare', String(product.id));
      try {
        var cmpIds = JSON.parse(localStorage.getItem('vgp_compare') || '[]').map(String);
        if (cmpIds.indexOf(String(product.id)) !== -1) pdCompareBtn.classList.add('active');
      } catch (e) {}
      pdCompareBtn.addEventListener('click', function() {
        if (window.addToCompare) window.addToCompare(product.id);
      });
    }

    // 9. SEO JSON-LD
    if (window.generateProductJSONLD) {
      window.generateProductJSONLD(product, category);
    }

    // 10. Reviews & Section Nav
    renderReviewsSection();
    setupStickySectionNav();

    // 11. Related Products, Top Recommendations, Catalog Showcase & Bottom More Grid
    supabaseClient.from('product').select('*').neq('id', product.id).limit(18)
      .then(function(res) {
        var allOthers = (res.data || []).filter(function(item) { return !item.is_hidden; }).map(formatProduct);

        // Top Recommendations (6 items)
        var topGrid = document.getElementById('topRecommendationsGrid');
        if (topGrid) {
          var topItems = allOthers.slice(0, 6);
          topGrid.innerHTML = topItems.length
            ? topItems.map(compactProductCardHTML).join('')
            : '<div class="col-12 text-muted small">Đang cập nhật sản phẩm gợi ý.</div>';
        }

        // Catalog Showcase inside Description (6 items)
        var showcaseGrid = document.getElementById('pdCatalogShowcaseGrid');
        if (showcaseGrid) {
          var showcaseItems = allOthers.slice(0, 6);
          showcaseGrid.innerHTML = showcaseItems.map(function(sp) {
            return '<div class="col">' +
              '<a href="product-detail.html?id=' + escHtml(sp.id) + '" class="text-decoration-none text-dark d-block h-100">' +
                '<div class="border rounded-3 p-2 bg-white h-100 text-center shadow-xs hover-lift">' +
                  '<img src="' + escHtml(sp.image || 'images/logo.webp') + '" alt="' + escHtml(sp.title) + '" class="img-fluid mb-2" style="height:120px;object-fit:contain;" loading="lazy">' +
                  '<div class="small fw-bold text-truncate">' + escHtml(sp.title) + '</div>' +
                  '<div class="text-danger small fw-semibold">' + (sp.price ? Number(sp.price).toLocaleString('vi-VN') + ' đ' : 'Giá sỉ tại xưởng') + '</div>' +
                '</div>' +
              '</a>' +
            '</div>';
          }).join('');
        }

        // Related Products (same category first)
        var sameCat = category
          ? allOthers.filter(function(item) { return item.category_id === category.id; })
          : [];
        var relatedList = (sameCat.length > 0 ? sameCat : allOthers).slice(0, 4);
        var relatedGrid = document.getElementById('relatedProductsGrid');
        if (relatedGrid && window.productCardHTML) {
          relatedGrid.innerHTML = relatedList.length > 0
            ? relatedList.map(function(rp) { return window.productCardHTML(rp, false); }).join('')
            : '<div class="col-12 text-muted">Không có sản phẩm cùng danh mục.</div>';
        }

        // Bottom 6-Column More Factory Products Grid (up to 12 items)
        var moreGrid = document.getElementById('moreProductsGrid');
        if (moreGrid) {
          var moreItems = allOthers.slice(0, 12);
          moreGrid.innerHTML = moreItems.map(compactProductCardHTML).join('');
        }
      });

    // 12. Recently Viewed
    var recent = JSON.parse(localStorage.getItem('vgp_recent_products') || '[]');
    recent = recent.filter(function(id) { return id != product.id; });
    recent.unshift(product.id);
    if (recent.length > 4) recent.pop();
    localStorage.setItem('vgp_recent_products', JSON.stringify(recent));

    if (recent.length > 1 && window.productCardHTML) {
      var recentToFetch = recent.filter(function(id) { return id != product.id; });
      supabaseClient.from('product').select('*').in('id', recentToFetch)
        .then(function(res) {
          if (res.data && res.data.length > 0) {
            var sec = document.getElementById('recentProductsSection');
            if (sec) sec.classList.remove('d-none');
            var html = '';
            res.data.forEach(function(rp) {
              html += window.productCardHTML(formatProduct(rp), false);
            });
            var grid = document.getElementById('recentProductsGrid');
            if (grid) grid.innerHTML = html;
          }
        });
    }
  }

  function formatProduct(p) {
    p.title = p.name;
    p.inStock = Number(p.in_stock) !== 0;
    if (p.image && p.image.indexOf('images/products/') === -1 && p.image.indexOf('http') !== 0 && p.image.indexOf('images/') !== 0) {
      p.image = 'images/products/' + p.image.replace(/\.(png|jpg|jpeg)$/i, '.webp');
    }
    if (p.price != null) p.price = Number(p.price);
    return p;
  }

  function normalizeLoadedProduct(p) {
    p.title = p.name || p.title || 'Băng keo đóng thùng OPP Vũ Gia Phát';
    if (p.image && p.image.indexOf('http') !== 0 && p.image.indexOf('images/') !== 0) {
      p.image = 'images/products/' + p.image.replace(/\.(png|jpg|jpeg)$/i, '.webp');
    }
    if (p.gallery && typeof p.gallery === 'string') {
      try {
        p.galleryParsed = JSON.parse(p.gallery).map(function(img) {
          if (!img) return '';
          if (img.indexOf('http') === 0 || img.indexOf('images/') === 0) return img;
          return 'images/products/' + img.replace(/\.(png|jpg|jpeg)$/i, '.webp');
        });
      } catch (e) {}
    } else if (Array.isArray(p.gallery)) {
      p.galleryParsed = p.gallery.map(function(img) {
        if (!img) return '';
        if (img.indexOf('http') === 0 || img.indexOf('images/') === 0) return img;
        return 'images/products/' + img.replace(/\.(png|jpg|jpeg)$/i, '.webp');
      });
    }
    return p;
  }

  function loadAndRenderProductRecord(p) {
    p = normalizeLoadedProduct(p);
    if (p.category_id && typeof supabaseClient !== 'undefined') {
      supabaseClient.from('category').select('*').eq('id', p.category_id).single()
        .then(function(catRes) {
          renderProductDetail(p, catRes.data);
        })
        .catch(function() {
          renderProductDetail(p, null);
        });
    } else {
      renderProductDetail(p, null);
    }
  }

  function getDefaultSampleProduct() {
    return {
      id: 1,
      name: 'Băng keo trong OPP 4.8F x 100 Yard (Siêu dính 50 mic)',
      title: 'Băng keo trong OPP 4.8F x 100 Yard (Siêu dính 50 mic)',
      price: 11500,
      moq: '1 bao (20 cây / 120 cuộn)',
      in_stock: 1,
      material: 'Màng BOPP nguyên sinh dẻo dai',
      adhesion: 'Keo Acrylic gốc nước siêu dính',
      thickness: '50 mic (Chuẩn đóng thùng nặng)',
      length: '100 Yard (~91.4 mét)',
      weight: '1.8 kg / cây (6 cuộn)',
      packaging: '6 cuộn/cây, 20 cây/bao',
      color: 'Trong suốt / Đục',
      application: 'Đóng thùng carton, kho vận Logistics, xuất khẩu',
      image: 'images/products/opp_trong1.webp',
      galleryParsed: [
        'images/products/opp_trong1.webp',
        'images/products/opp_trong2.webp',
        'images/products/opp_trong3.webp',
        'images/products/opp_duc1.webp'
      ]
    };
  }

  function init() {
    var productId = parseInt(getQueryParam('id'), 10);

    if (typeof supabaseClient === 'undefined') {
      setTimeout(init, 300);
      return;
    }

    if (!productId || isNaN(productId)) {
      supabaseClient.from('product').select('*').order('id', { ascending: true }).limit(1)
        .then(function(res) {
          if (res.data && res.data.length > 0) {
            loadAndRenderProductRecord(res.data[0]);
          } else {
            loadAndRenderProductRecord(getDefaultSampleProduct());
          }
        })
        .catch(function() {
          loadAndRenderProductRecord(getDefaultSampleProduct());
        });
      return;
    }

    supabaseClient.from('product').select('*').eq('id', productId).single()
      .then(function(res) {
        if (res.error || !res.data || res.data.is_hidden === true) {
          document.getElementById('productDetailContainer').innerHTML = '<div class="col-12"><div class="alert alert-danger mb-0">Sản phẩm không tìm thấy hoặc đã ngừng kinh doanh. <a href="products.html" class="alert-link">Xem tất cả sản phẩm</a>.</div></div>';
          return;
        }
        loadAndRenderProductRecord(res.data);
      })
      .catch(function() {
        loadAndRenderProductRecord(getDefaultSampleProduct());
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
