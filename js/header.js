document.write(`
  <!-- ============================ TOPBAR ============================ -->
  <div class="topbar text-white py-1 d-none d-lg-block" style="background-color: var(--brand); font-size: 0.85rem;">
    <div class="container d-flex justify-content-between align-items-center">
      <div>
        <span class="me-3"><i class="bi bi-shield-check me-1"></i>Uy tín. Chất lượng</span>
        <span><i class="bi bi-truck me-1"></i>Giao hàng nhanh toàn quốc</span>
      </div>
      <div class="d-flex gap-3">
        <a href="#" class="text-white text-decoration-none"><i class="bi bi-telephone-fill me-1"></i><span
            data-setting-text="hotline1">1900 xxxx</span></a>
        <a href="#" class="text-white text-decoration-none"><i class="bi bi-envelope-fill me-1"></i><span
            data-setting-text="email">BANGKEOVUGIAPHAT@GMAIL.COM</span></a>
      </div>
    </div>
  </div>

  <!-- ============================ MAIN HEADER ============================ -->
  <header class="bg-white py-3 border-bottom sticky-top shadow-sm" style="z-index: 1020;">
    <div class="container d-flex flex-wrap align-items-center gap-3">
      <!-- Logo -->
      <a class="navbar-brand d-flex align-items-center gap-2 me-lg-4" href="index.html">
        <img src="images/logo.webp" alt="Logo VGP Win Win Tape" height="45">
        <span class="d-flex flex-column d-none d-sm-flex">
          <span class="brand-name fs-5" style="font-weight:900; color:var(--brand)">VŨ GIA PHÁT</span>
          <span class="brand-tag text-muted" style="font-size:0.6rem; font-weight:700">ADHESIVE TAPE & PACKAGING</span>
        </span>
      </a>

      <!-- Search Bar -->
      <form class="flex-grow-1 d-flex mx-lg-4 position-relative" role="search"
        onsubmit="event.preventDefault(); window.location.href='products.html?q='+this.q.value">
        <input class="form-control rounded-start-pill border-end-0 border-brand" type="search" name="q"
          placeholder="Sản phẩm..." aria-label="Search" style="border-width:2px; border-color:var(--brand)">
        <button class="btn rounded-end-pill px-4 text-white" type="submit"
          style="background-color:var(--brand); border:2px solid var(--brand)"><i class="bi bi-search"></i></button>
      </form>

      <!-- Icons & Hotline -->
      <div class="d-flex align-items-center gap-3 ms-auto">
        <a href="cart.html" class="text-dark fs-5 position-relative text-decoration-none" id="btnCart">
          <i class="bi bi-cart3"></i>
          <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style="font-size:0.6rem" id="cartCount">0</span>
        </a>
        <a href="#" class="text-dark fs-5 position-relative text-decoration-none" id="btnNotice" title="Thông báo" onclick="return false;">
          <i class="bi bi-bell"></i>
          <span class="position-absolute top-0 start-100 translate-middle badge border border-light rounded-circle bg-danger p-1 d-none"
            style="width: 10px; height: 10px; margin-top: 6px;" id="noticeBadge"><span class="visually-hidden">Tin mới</span></span>
        </a>
        <a href="admin/login.html" class="text-dark fs-5 text-decoration-none"><i class="bi bi-person"></i></a>

        <a class="btn btn-danger rounded-pill fw-bold ms-2 d-none d-xl-flex align-items-center gap-2"
          href="tel:02838123456" data-setting-href="hotline1" data-setting-prefix="tel:">
          HOTLINE: <span data-setting-text="hotline1">1900 xxxx</span>
        </a>

        <!-- Mobile Toggle -->
        <button class="navbar-toggler border-0 fs-3 d-lg-none ms-2" type="button" data-bs-toggle="offcanvas"
          data-bs-target="#mainNav" aria-controls="mainNav">
          <i class="bi bi-list"></i>
        </button>
      </div>
    </div>
  </header>

  <!-- ============================ BOTTOM NAV (MEGA MENU) ============================ -->
  <nav class="d-none d-lg-block" style="background-color: var(--brand);">
    <div class="container position-relative d-flex align-items-center">
      
      <!-- Mega Menu Toggle -->
      <div class="dropdown-mega">
        <a class="text-white fw-bold px-4 py-3 bg-dark bg-opacity-25 d-flex align-items-center gap-2 text-decoration-none" href="#" style="min-width: 250px;">
          <i class="bi bi-list fs-5"></i> DANH MỤC SẢN PHẨM
        </a>
        <div class="dropdown-menu-mega bg-white border-0 rounded-bottom-3 p-0 overflow-hidden" id="megaMenuContent">
          <!-- main.js sẽ đổ HTML danh mục vào đây -->
          <div class="text-center text-muted small py-4">
            <div class="spinner-border spinner-border-sm me-2"></div>Đang tải danh mục...
          </div>
        </div>
      </div>

      <!-- Main Nav Links -->
      <ul class="nav text-uppercase fw-bold ms-4" style="font-size: 0.9rem;" id="mainNavLinks">
        <li class="nav-item"><a class="nav-link text-white py-2" href="index.html">TRANG CHỦ</a></li>
        <li class="nav-item"><a class="nav-link text-white py-2" href="products.html">CUNG CẤP SỈ LẺ</a></li>
        <li class="nav-item"><a class="nav-link text-white py-2" href="blog.html">TIN TỨC & KIẾN THỨC</a></li>
        <li class="nav-item"><a class="nav-link text-white py-2" href="contact.html">LIÊN HỆ</a></li>
      </ul>

    </div>
  </nav>

  <style>
    /* CSS cho Mega Menu Hover */
    .dropdown-mega:hover .dropdown-menu-mega {
      display: block;
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
    .dropdown-menu-mega {
      position: absolute;
      top: 100%;
      left: 12px; /* Padding của col/container */
      right: 12px;
      z-index: 1050;
      display: none;
      opacity: 0;
      visibility: hidden;
      transform: translateY(10px);
      transition: all 0.3s ease;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15) !important;
    }
  </style>

  <!-- Mobile Offcanvas Menu (Hidden on Desktop) -->
  <div class="offcanvas offcanvas-start" tabindex="-1" id="mainNav" aria-labelledby="mainNavLabel">
    <div class="offcanvas-header border-bottom text-white" style="background-color: var(--brand);">
      <h5 class="offcanvas-title fw-bold" id="mainNavLabel">MENU</h5>
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Đóng"></button>
    </div>
    <div class="offcanvas-body p-0">
      <div class="list-group list-group-flush border-0">
        <a class="list-group-item list-group-item-action py-3 fw-bold text-uppercase" href="index.html">Trang chủ</a>
        <a class="list-group-item list-group-item-action py-3 fw-bold text-uppercase" href="products.html">Sản phẩm</a>
        <a class="list-group-item list-group-item-action py-3 fw-bold text-uppercase" href="about.html">Giới thiệu</a>
        <a class="list-group-item list-group-item-action py-3 fw-bold text-uppercase" href="blog.html">Tin tức</a>
        <a class="list-group-item list-group-item-action py-3 fw-bold text-uppercase" href="contact.html">Liên hệ</a>
      </div>
    </div>
  </div>
`);
