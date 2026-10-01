document.write(`
  <footer class="site-footer text-white pt-5" style="background-color: var(--brand);">
    <div class="container">
      <div class="row g-4 pb-4">

        <div class="col-md-6 col-lg-3">
          <h4 class="text-white text-uppercase fs-6 mb-3 fw-bold">Thông tin liên hệ</h4>
          <ul class="list-unstyled small d-flex flex-column gap-3">
            <li class="d-flex gap-2 align-items-center">
              <i class="bi bi-telephone"></i>
              <a href="tel:02838123456" class="text-white text-decoration-none" data-setting-href="hotline1"
                data-setting-prefix="tel:" data-setting-text="hotline1">028 3812 3456</a>
            </li>
            <li class="d-flex gap-2 align-items-center">
              <i class="bi bi-envelope"></i>
              <a href="mailto:info@vugiaphat.vn" class="text-white text-decoration-none" data-setting-href="email1"
                data-setting-prefix="mailto:" data-setting-text="email1">info@vugiaphat.vn</a>
            </li>
            <li class="d-flex gap-2 align-items-center">
              <i class="bi bi-globe"></i>
              <a href="#" class="text-white text-decoration-none">www.vugiaphat.com.vn</a>
            </li>
          </ul>
        </div>

        <div class="col-md-6 col-lg-3">
          <h4 class="text-white text-uppercase fs-6 mb-3 fw-bold">Địa chỉ</h4>
          <ul class="list-unstyled small d-flex flex-column gap-3">
            <li class="d-flex gap-2">
              <i class="bi bi-geo-alt mt-1"></i>
              <span data-setting-text="address">123 Đuờng Tân Thới Hiệp, Quận 12, TP.HCM</span>
            </li>
          </ul>
        </div>

        <div class="col-6 col-lg-3">
          <h4 class="text-white text-uppercase fs-6 mb-3 fw-bold">Liên kết nhanh</h4>
          <ul class="list-unstyled small d-flex flex-column gap-2">
            <li><a href="index.html" class="text-white text-decoration-none">Sơ đồ trang</a></li>
            <li><a href="products.html" class="text-white text-decoration-none">Sản phẩm</a></li>
            <li><a href="contact.html" class="text-white text-decoration-none">Liên hệ</a></li>
            <li><a href="blog.html" class="text-white text-decoration-none">Tin tức & Sự kiện</a></li>
          </ul>
        </div>

        <div class="col-6 col-lg-3">
          <h4 class="text-white text-uppercase fs-6 mb-3 fw-bold">Chính sách</h4>
          <ul class="list-unstyled small d-flex flex-column gap-2">
            <li><a href="privacy-policy.html" class="text-white text-decoration-none">Chính sách bảo mật</a></li>
            <li><a href="terms-of-service.html" class="text-white text-decoration-none">Điều khoản dịch vụ</a></li>
            <li><a href="return-policy.html" class="text-white text-decoration-none">Chính sách đổi trả</a></li>
          </ul>
        </div>

      </div>

      <div class="border-top border-light border-opacity-25 py-3 text-start small">
        &copy; 2024 VŨ GIA PHÁT &mdash; VGP Win Win Tape
      </div>
    </div>
  </footer>
`);
