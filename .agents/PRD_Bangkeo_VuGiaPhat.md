# Product Requirements Document (PRD): Website Băng Keo & Màng PE Vũ Gia Phát (VGP Win Win Tape)

## 1. Tổng quan dự án (Project Overview)
**Tên dự án:** Website Băng Keo & Màng PE Vũ Gia Phát (VGP Win Win Tape)
**Mô hình kinh doanh:** D2C (Direct-to-Consumer) — Giới thiệu sản phẩm và bán hàng trực tiếp đến khách hàng lẻ, sỉ, doanh nghiệp.
**Mục tiêu chính:**
1. **Giới thiệu sản phẩm:** Trưng bày catalog băng keo OPP, màng PE căng phủ với đầy đủ thông số kỹ thuật, hình ảnh và giá sỉ/lẻ.
2. **Thu thập Lead (khách hàng tiềm năng):** Tối ưu phễu chuyển đổi để thu thập thông tin khách có nhu cầu tư vấn, báo giá sỉ và đặt hàng thông qua nhiều điểm chạm (floating CTA, form báo giá nhanh, popup lead magnet, form liên hệ, giỏ hàng).
3. **Đặt hàng trực tuyến:** Cho phép khách thêm giỏ hàng, chốt đơn và gửi đơn hàng qua Zalo hoặc lưu vào hệ thống.
4. **Xây dựng uy tín thương hiệu:** Thể hiện năng lực sản xuất, testimonials khách hàng, chứng nhận chất lượng, blog kiến thức ngành.
5. **Đo lường & tối ưu:** Tích hợp analytics để theo dõi hành vi, đo lường chuyển đổi và retarget khách hàng.

**KPIs mục tiêu:**
- Tỷ lệ chuyển đổi (CR) form liên hệ/báo giá: ≥ 3%
- Thời gian trung bình trên trang: ≥ 2 phút
- Tỷ lệ thoát trang (Bounce Rate): ≤ 50%
- Số lead thu thập/tháng: ≥ 50

## 2. Công nghệ sử dụng (Technology Stack)
- **Frontend (Client-side):** 
  - HTML5, CSS3, Vanilla JavaScript (ES6+).
  - Framework CSS: Bootstrap 5.3 (qua CDN), Bootstrap Icons.
  - Kiến trúc: Multi-Page Application (MPA) đối với website khách hàng để tối ưu SEO; Single-Page Application (SPA) đối với trang quản trị (`/admin`).
- **Backend & Database:** 
  - **Supabase** (Backend-as-a-Service).
  - Cơ sở dữ liệu: PostgreSQL.
  - Xác thực (Authentication): Supabase Auth.
  - Tích hợp: Realtime API qua thư viện `@supabase/supabase-js`.
- **Analytics & Tracking:**
  - Google Analytics 4 (GA4) qua Google Tag Manager (GTM).
  - Facebook Pixel (Meta Pixel) cho retargeting.
  - Event tracking: View Product, Add to Cart, Submit Quote, Submit Order, Click Zalo.
- **Infrastructure:**
  - Không yêu cầu build tools (Node.js, Webpack, Vite). Mã nguồn có thể chạy trực tiếp trên bất kỳ static web server nào (GitHub Pages, Vercel, Netlify, Nginx, Apache).

## 3. Kiến trúc hệ thống (System Architecture)
Hệ thống tuân theo mô hình **Serverless Static Frontend**. Giao diện người dùng sẽ gọi trực tiếp đến API của Supabase để thực hiện các thao tác CRUD (Create, Read, Update, Delete) thay vì đi qua một backend server trung gian.
- **Khách hàng (Client):** Tương tác với giao diện HTML/CSS/JS, dữ liệu được render động thông qua việc gọi API tới Supabase.
- **Admin (Quản trị viên):** Truy cập khu vực `/admin`, được bảo vệ bởi Supabase Auth. Quản trị viên thao tác trực tiếp với cơ sở dữ liệu qua giao diện SPA (hash-based routing).

### 3.1 Phễu chuyển đổi D2C (Conversion Funnel)
```
Nguồn traffic (Google/FB Ads/SEO/Zalo)
  → Landing Page hoặc Trang chủ (Thu hút)
    → Catalog sản phẩm / Chi tiết SP (Khám phá)
      → Floating CTA Zalo / Form báo giá nhanh / Giỏ hàng (Hành động)
        → Thank You Page / Zalo Chat (Chuyển đổi)
          → Remarketing qua Pixel / Email (Giữ chân)
```

## 4. Cấu trúc thư mục (Folder Structure)
```
Bangkeo_VuGiaPhat/
├── index.html            # Trang chủ
├── products.html         # Trang danh sách sản phẩm, bộ lọc, tìm kiếm
├── product-detail.html   # Trang chi tiết 1 sản phẩm
├── cart.html             # Giỏ hàng và thanh toán (Checkout)
├── about.html            # Trang giới thiệu công ty
├── blog.html             # Trang bài viết, tin tức
├── post.html             # Trang chi tiết bài viết
├── contact.html          # Trang liên hệ
├── thank-you.html        # Trang xác nhận đặt hàng / gửi form thành công
├── privacy-policy.html   # Chính sách bảo mật
├── terms-of-service.html # Điều khoản dịch vụ
├── return-policy.html    # Chính sách đổi trả
├── sitemap.xml           # Sitemap cho SEO (liệt kê tất cả URL)
├── robots.txt            # Hướng dẫn cho search engine crawler
├── manifest.json         # PWA manifest (Add to Home Screen trên mobile)
├── css/
│   └── style.css         # File định dạng CSS tùy biến chính
├── js/
│   ├── main.js           # Xử lý logic frontend, gọi API Supabase, render UI
│   ├── header.js         # Logic liên quan đến header, navbar (document.write)
│   ├── footer.js         # Logic liên quan đến footer (document.write) — tránh trùng lặp HTML
│   ├── seo.js            # JSON-LD Schema Markup, cập nhật meta tag động theo danh mục/sản phẩm
│   ├── blog.js           # Logic render danh sách bài viết
│   ├── post.js           # Logic render chi tiết bài viết
│   ├── product-detail.js # Logic render chi tiết sản phẩm, gallery, biến thể
│   └── supabase-config.js# Thông tin cấu hình kết nối Supabase (URL, Anon Key)
├── images/               # Chứa logo, banner, ảnh sản phẩm (định dạng WebP/JPG/PNG)
│   └── products/         # Ảnh sản phẩm phân theo thư mục
└── admin/                # Khu vực quản trị (Admin Dashboard)
    ├── index.html        # Khung SPA của trang quản trị
    ├── login.html        # Trang đăng nhập cho Admin
    ├── css/
    │   └── admin.css     # CSS riêng cho khu quản trị
    └── js/
        ├── app.js            # Khởi tạo và xử lý routing của admin SPA
        ├── auth.js           # Xử lý đăng nhập, phiên bản (session) qua Supabase Auth
        ├── core.js           # Các hàm tiện ích dùng chung trong admin
        ├── page-dashboard.js # Logic trang tổng quan (Dashboard)
        ├── page-products.js  # Logic quản lý sản phẩm
        ├── page-categories.js# Logic quản lý danh mục
        ├── page-orders.js    # Logic quản lý đơn hàng
        ├── page-carousel.js  # Logic quản lý banner/carousel
        ├── page-users.js     # Logic quản lý người dùng (phân quyền)
        ├── page-feedback.js  # Logic quản lý phản hồi liên hệ
        ├── page-notices.js   # Logic quản lý thông báo
        ├── page-posts.js     # Logic quản lý bài viết blog (CRUD)
        ├── page-testimonials.js # Logic quản lý đánh giá khách hàng
        ├── page-pages.js     # Logic quản lý trang tĩnh (chính sách)
        ├── page-leads.js     # Logic quản lý Lead (khách tiềm năng)
        └── chart.js          # Vẽ biểu đồ thống kê
```

## 5. Cấu trúc cơ sở dữ liệu (Database Schema)
Hệ thống sử dụng PostgreSQL thông qua Supabase. Bao gồm các bảng chính:

### 5.1 Bảng hiện có
- **`category`**: Danh mục sản phẩm (id, name, description, image, **seo_title**, **seo_description**, **seo_article** [HTML nội dung SEO dưới danh sách SP], sort_order, ...).
- **`product`**: Chi tiết sản phẩm (id, name, description, price, **price_tiers** [JSON bảng giá theo SL, VD: `[{"min":1,"max":99,"price":15000},{"min":100,"max":499,"price":13500}]`], in_stock, category_id, image, gallery, specs [thickness, weight, length, adhesion, packaging, **material**, **color**, **application**], variants, moq, rating, is_hidden, ...).
- **`carousel_slide`**: Quản lý các slide banner trên trang chủ (id, title, image_file, category_id, btn1_text, btn1_url, is_active, sort_order).
- **`order`**: Thông tin đơn đặt hàng (id, customer_info, total_amount, status, **source** [web/zalo/phone], created_at, ...).
- **`order_item`**: Chi tiết các mặt hàng trong 1 đơn hàng (order_id, product_id, quantity, price, variant, ...).
- **`profiles`**: Quản lý thông tin user và phân quyền (id [liên kết Auth], role [admin/customer], ...).
- **`feedback`**: Lưu trữ lời nhắn từ trang Contact (id, name, email, phone, **company**, **subject**, **quantity_estimate**, message, status, ...).
- **`settings`**: Lưu trữ các cấu hình tĩnh của website như Hotline, Email, Link Zalo, Địa chỉ công ty, **Google Maps Embed URL**, **GA4 ID**, **Facebook Pixel ID**.

### 5.2 Bảng mới bổ sung
- **`post`**: Bài viết blog/tin tức (id, title, slug, excerpt, content [HTML], image, category_tag, author, is_published, published_at, created_at, **seo_title**, **seo_description**, ...).
- **`testimonial`**: Đánh giá/nhận xét khách hàng (id, customer_name, company_name, content, rating [1-5], avatar, is_featured, is_active, sort_order, created_at).
- **`lead`**: Khách hàng tiềm năng thu thập từ popup/form báo giá nhanh (id, name, phone, email, source [popup/quick-quote/landing], product_interest, quantity_estimate, status [new/contacted/converted], created_at, ...).
- **`page`**: Trang nội dung tĩnh quản lý từ Admin (id, slug [privacy-policy/terms-of-service/return-policy], title, content [HTML], updated_at).

## 6. Các tính năng chi tiết (Features)

### 6.1 Frontend (Dành cho Khách hàng)

#### 6.1.1 Trang chủ (`index.html`)
- Hero Carousel động (lấy từ bảng `carousel_slide`), hỗ trợ fallback ảnh danh mục nếu thiếu.
- Danh sách danh mục nổi bật (D2C grid, giới hạn top 6 danh mục có nhiều sản phẩm nhất).
- Sản phẩm mới nhất / bán chạy nhất (Top 8).
- Banner ưu điểm cạnh tranh ("Tại sao chọn Gia Phát"), số liệu thống kê (12+ năm, 500+ KH DN, 63 tỉnh thành).
- **[MỚI] Section "Khách hàng nói gì"**: Carousel testimonials lấy từ bảng `testimonial` (is_featured = true). Hiển thị tên, công ty, nội dung, rating sao.
- **[MỚI] Section "Đối tác tiêu biểu"**: Logo grid của các khách hàng doanh nghiệp lớn (ảnh lưu trong `images/partners/`).
- **[MỚI] Announcement Bar**: Thanh thông báo khuyến mãi ở trên cùng trang (dữ liệu từ bảng `notices` đã có). Có nút đóng (X), lưu trạng thái đóng vào sessionStorage.

#### 6.1.2 Sản phẩm (`products.html`, `product-detail.html`)
- Liệt kê toàn bộ sản phẩm.
- Tìm kiếm tiếng Việt không dấu (thuật toán loại bỏ dấu tiếng Việt tích hợp trong `main.js`).
- Lọc theo danh mục (chip-based filter).
- Sắp xếp theo: mới nhất, giá tăng/giảm, đánh giá cao nhất.
- Xem chi tiết sản phẩm: Tên, giá, mô tả, thông số kỹ thuật (độ dày, trọng lượng, chiều dài, bám dính, đóng gói), đánh giá sao, số lượng mua tối thiểu (MOQ), phân loại (variants).
- Quick View (Xem nhanh sản phẩm) qua Bootstrap Modal với thư viện ảnh dạng Carousel thu nhỏ.
- **[MỚI] Bảng giá sỉ theo số lượng**: Render từ cột `price_tiers` dạng bảng trên trang product-detail (VD: 1-99 cuộn: 15.000đ, 100-499: 13.500đ, 500+: 12.000đ).
- **[MỚI] Sản phẩm liên quan**: Section cuối trang product-detail, lấy 4 sản phẩm cùng `category_id` (trừ sản phẩm đang xem).
- **[MỚI] Đã xem gần đây**: Lưu danh sách product ID vào LocalStorage, hiển thị strip 4 sản phẩm cuối trang.
- **[MỚI] Thường mua cùng (Cross-sell)**: Gợi ý combo băng keo + màng PE dựa trên category khác.
- **[MỚI] Nút chia sẻ (Share)**: Chia sẻ sản phẩm qua Zalo, Facebook, Copy Link.
- **[MỚI] So sánh sản phẩm**: Nút "So sánh" trên card sản phẩm, trang so sánh side-by-side tối đa 3-4 sản phẩm.

#### 6.1.3 Giỏ hàng & Đặt hàng (`cart.html`, `thank-you.html`)
- Quản lý giỏ hàng tại LocalStorage (hoặc Session).
- Tiến hành thanh toán và đẩy dữ liệu vào bảng `order` & `order_item`.
- Gửi đơn hàng qua Zalo (deeplink tới Zalo OA kèm nội dung đơn hàng).
- Thông báo "Có sản phẩm chưa có giá, sẽ báo giá qua Zalo" cho sản phẩm price = null.
- **[MỚI] Trang xác nhận (`thank-you.html`)**: Sau khi gửi đơn/form thành công, redirect đến trang "Cảm ơn" hiển thị:
  - Mã đơn hàng / thời gian gửi.
  - Tóm tắt nội dung đã gửi.
  - Hướng dẫn bước tiếp theo ("Chúng tôi sẽ liên hệ qua Zalo trong 30 phút").
  - CTA: "Quay lại trang chủ" / "Xem thêm sản phẩm".
  - **Tracking Pixel event `Purchase` / `Lead`** cho GA4 và Facebook Pixel.

#### 6.1.4 Nội dung & Liên hệ (`about.html`, `blog.html`, `post.html`, `contact.html`)
- Hiển thị thông tin công ty, carousel xưởng sản xuất.
- **[MỚI] Video giới thiệu xưởng**: Nhúng video YouTube/Vimeo (lazy load) trên trang About.
- **[MỚI] Timeline lịch sử phát triển**: Infographic dọc hiển thị các mốc quan trọng của công ty.
- **[MỚI] Chứng nhận & Giấy phép**: Section trưng bày ĐKKD, ISO, test report, giấy kiểm định.
- **[MỚI] Logo khách hàng tiêu biểu**: Grid logo đối tác trên trang About.
- **[MỚI] Google Maps embed**: Nhúng Google Maps iframe (`loading="lazy"`) tại trang Contact thay cho bản đồ CSS. Giữ fallback CSS cho trường hợp offline.
- Blog hiển thị danh sách bài viết từ bảng `post` (is_published = true), phân trang.
- Gửi biểu mẫu liên hệ trực tiếp vào bảng `feedback` (có validate JS tiếng Việt).

#### 6.1.5 Trang chính sách (`privacy-policy.html`, `terms-of-service.html`, `return-policy.html`)
- **[MỚI]** Ba trang nội dung tĩnh, nội dung HTML lấy từ bảng `page` (slug tương ứng).
- Nội dung bao gồm:
  - **Chính sách bảo mật**: Cam kết bảo vệ thông tin cá nhân (tên, SĐT, email) mà khách hàng cung cấp qua form liên hệ, đặt hàng. Tuân thủ PDPA.
  - **Điều khoản dịch vụ**: Quy định về giá sỉ theo đơn, MOQ, phạm vi giao hàng, thanh toán.
  - **Chính sách đổi trả**: 7 ngày đổi trả miễn phí nếu lỗi nhà sản xuất, quy trình khiếu nại.

#### 6.1.6 Floating CTA — Nút liên hệ nổi (MỚI)
- **Nút Zalo Chat nổi** (góc phải dưới): Link đến Zalo OA hoặc số Zalo kinh doanh. Có tooltip "Chat với chúng tôi".
- **Nút Gọi điện nổi** (góc trái dưới, chỉ hiện trên mobile): Link `tel:` đến hotline chính.
- Hiệu ứng pulse animation thu hút chú ý.
- Có thể tùy chỉnh link Zalo từ bảng `settings`.

#### 6.1.7 Form báo giá nhanh — Quick Quote (MỚI)
- **Popup/Slide-in "Nhận báo giá"**: Tự động xuất hiện sau 30 giây hoặc khi scroll 50% trang sản phẩm.
- Fields tối giản: Số điện thoại (bắt buộc) + Sản phẩm quan tâm (dropdown) + Số lượng dự kiến.
- Dữ liệu lưu vào bảng `lead` (source = 'quick-quote').
- Có cookie/localStorage check để không hiện lại trong 24h.

#### 6.1.8 Popup Lead Magnet — Thu thập khách mới (MỚI)
- Popup khi truy cập lần đầu (sau 10 giây): "Nhập SĐT nhận báo giá sỉ + giảm 5% đơn đầu tiên".
- Fields: Số điện thoại + Email (tùy chọn).
- Dữ liệu lưu vào bảng `lead` (source = 'popup').
- Cookie check 7 ngày không hiện lại.

#### 6.1.9 Component hóa Header & Footer (MỚI)
- **Footer** (`footer.js`): Tạo file `footer.js` inject HTML footer bằng `document.write()`, tương tự cách `header.js` đã làm. Đảm bảo đồng bộ nội dung footer trên tất cả trang.
- Chuẩn hóa tên bản quyền: "© 2024 VŨ GIA PHÁT — VGP Win Win Tape" trên mọi trang.

### 6.2 Backend/Admin Panel (`/admin/`)
- **Kiến trúc SPA**: Điều hướng không reload trang thông qua thay đổi `hash` (`#/dashboard`, `#/products`, v.v.).
- **Xác thực**: Kiểm tra Supabase Session tại `auth.js`. Chuyển hướng về `login.html` nếu chưa đăng nhập hoặc không đủ quyền.
- **Dashboard**: Thống kê số lượng đơn hàng, doanh thu, biểu đồ doanh số (sử dụng thư viện Chart.js). **[MỚI]** Thêm widget: Số lead mới, Tỷ lệ chuyển đổi, Top sản phẩm được xem nhiều.
- **Quản lý Sản phẩm**: Thêm, sửa, ẩn, xóa sản phẩm. Cập nhật ảnh chính và thư viện ảnh (gallery), thông số kỹ thuật. **[MỚI]** Quản lý `price_tiers` (bảng giá sỉ theo SL).
- **Quản lý Danh mục**: Thêm, sửa, xóa danh mục. **[MỚI]** Chỉnh sửa SEO fields (`seo_title`, `seo_description`, `seo_article`).
- **Quản lý Đơn hàng**: Xem chi tiết đơn đặt, thay đổi trạng thái đơn hàng (Pending, Processing, Completed, Cancelled).
- **Quản lý Carousel (Banner)**: Chỉnh sửa ảnh slider, text nút bấm, thứ tự hiển thị trang chủ.
- **Quản lý Phản hồi**: Đọc lời nhắn liên hệ, thay đổi trạng thái xử lý.
- **Cấu hình hệ thống (Settings)**: Thay đổi số Hotline, link Zalo, email hiển thị động ở Footer và Header. **[MỚI]** Quản lý Google Maps URL, GA4 ID, Facebook Pixel ID.
- **[MỚI] Quản lý Bài viết (`page-posts.js`)**: CRUD bài viết blog. Soạn nội dung HTML (rich text editor hoặc textarea HTML). Upload ảnh bìa. Quản lý trạng thái xuất bản (draft/published). SEO fields cho mỗi bài viết.
- **[MỚI] Quản lý Testimonials (`page-testimonials.js`)**: CRUD đánh giá khách hàng. Chọn đánh giá nổi bật (is_featured) để hiển thị trang chủ. Upload avatar khách hàng.
- **[MỚI] Quản lý Trang tĩnh (`page-pages.js`)**: Chỉnh sửa nội dung HTML cho các trang: Chính sách bảo mật, Điều khoản dịch vụ, Chính sách đổi trả.
- **[MỚI] Quản lý Lead (`page-leads.js`)**: Xem danh sách lead từ popup/form báo giá nhanh. Lọc theo source, status. Thay đổi trạng thái (new → contacted → converted). Export CSV.

### 6.3 SEO & Analytics (MỚI)

#### 6.3.1 On-page SEO
- Mỗi trang HTML có `<title>`, `<meta name="description">` riêng biệt, tối ưu từ khóa ngành băng keo.
- Breadcrumb trên tất cả trang (trừ trang chủ).
- `<h1>` duy nhất trên mỗi trang.
- `sitemap.xml` liệt kê tất cả URL (trang chủ, sản phẩm, danh mục, blog, liên hệ, chính sách).
- `robots.txt` cho phép crawl toàn bộ, disallow `/admin/`.

#### 6.3.2 Schema Markup (JSON-LD)
File `seo.js` tạo Structured Data cho:
- **`Product`**: Tên, ảnh, giá, tình trạng kho, brand, SKU (trên product-detail).
- **`CollectionPage`**: Tên danh mục, mô tả (trên products.html khi lọc category).
- **[MỚI] `LocalBusiness`**: Tên công ty, địa chỉ, SĐT, giờ mở cửa, tọa độ (trên about.html, contact.html).
- **[MỚI] `Organization`**: Logo, tên, URL, social links (trên mọi trang).
- **[MỚI] `BreadcrumbList`**: Đường dẫn breadcrumb (trên mọi trang có breadcrumb).
- **[MỚI] `FAQPage`**: Câu hỏi thường gặp (trên product-detail tab "Chính sách sỉ & Giao hàng").
- **[MỚI] `Article`**: Bài viết blog (trên post.html).

#### 6.3.3 SEO theo danh mục
- File `seo.js` cần có dữ liệu SEO cho **tất cả danh mục** (không chỉ 2 danh mục đầu). Ưu tiên lấy từ cột `seo_title`, `seo_description`, `seo_article` trong bảng `category` thay vì hardcode.

#### 6.3.4 Analytics & Tracking
- **Google Tag Manager (GTM)**: Nhúng container GTM vào `<head>` và `<body>` của mọi trang.
- **Google Analytics 4 (GA4)**: Cấu hình qua GTM. Tự động theo dõi page view, scroll, outbound click.
- **Facebook Pixel (Meta Pixel)**: Cấu hình qua GTM.
- **Event tracking tùy chỉnh**:
  | Event Name | Trigger | Trang |
  |---|---|---|
  | `view_item` | Xem chi tiết sản phẩm | product-detail |
  | `add_to_cart` | Click "Thêm giỏ hàng" | product-detail, products |
  | `begin_checkout` | Mở trang cart | cart |
  | `purchase` | Submit đơn hàng thành công | thank-you |
  | `generate_lead` | Submit form liên hệ / báo giá / popup | contact, quick-quote, popup |
  | `click_zalo` | Click nút Zalo nổi | mọi trang |
  | `click_hotline` | Click nút gọi điện | mọi trang |

### 6.4 PWA — Progressive Web App cơ bản (MỚI)
- **`manifest.json`**: Cho phép khách hàng "Add to Home Screen" trên mobile. Cấu hình: tên app, icon, theme color, start URL.
- **Service Worker (tùy chọn)**: Cache các static assets (CSS, JS, logo) để tải nhanh hơn khi quay lại.

## 7. Tiêu chuẩn thiết kế và mã nguồn (UI/UX & Code Guidelines)
- **Thiết kế**: 
  - Responsive 100% Mobile-first thông qua Grid & Flexbox của Bootstrap 5.
  - Sử dụng các lớp CSS tiện ích của Bootstrap (utility classes) để căn lề, đổ bóng, màu nền.
  - Các phần tử tương tác (button, link, hình ảnh) có hiệu ứng hover mượt mà (transition).
  - Trạng thái trống (Empty State): Khi không có dữ liệu, hiển thị placeholder text/SVG thay vì để trống giao diện.
  - **[MỚI] Skeleton Loading**: Hiển thị khung xương (skeleton) khi đang tải dữ liệu từ API thay vì spinner đơn thuần.
  - **[MỚI] Micro-animations**: Reveal on scroll (IntersectionObserver), pulse trên floating CTA, toast notification khi thêm giỏ hàng.
- **Mã nguồn**:
  - Đảm bảo xử lý ngoại lệ (Try/Catch) trong các lời gọi API.
  - Hình ảnh sản phẩm cần có đường dẫn dự phòng (fallback SVG `FALLBACK_IMG` trong `main.js`) trong trường hợp lỗi tải ảnh.
  - Hạn chế sử dụng jQuery, ưu tiên sử dụng `document.querySelector` và Vanilla JS.
  - **[MỚI] Component hóa**: Header và Footer phải dùng JS inject (`document.write`) để tránh trùng lặp HTML trên nhiều trang.
  - **[MỚI] main.js cần refactor**: Tách logic theo trang (nếu file vượt quá 50KB) để giảm thời gian parse trên mobile.
- **Accessibility (A11y)**:
  - Skip link "Bỏ qua, đến nội dung chính" trên mọi trang.
  - ARIA labels cho icon buttons, carousel controls, modal.
  - `visually-hidden` cho screen reader text.
  - Đủ contrast ratio cho text trên nền màu.

## 8. Hướng dẫn bảo trì & Khả năng mở rộng (Maintainability & Scalability)
1. **Kiến trúc dữ liệu**:
   - Supabase là RLS (Row Level Security) enabled database. Mọi chính sách bảo mật (Insert/Update/Delete) cần được thiết lập và kiểm soát chặt chẽ phía server (Supabase Dashboard) để tránh việc thao tác dữ liệu trái phép từ Client.
   - **[MỚI]** Bảng `lead` cần RLS policy: chỉ cho phép `INSERT` từ anonymous, `SELECT/UPDATE/DELETE` chỉ admin.
   - **[MỚI]** Bảng `page` cần RLS policy: `SELECT` public, `INSERT/UPDATE/DELETE` chỉ admin.
2. **Khả năng cập nhật (Update)**:
   - Các logic gọi API đều được tách ra các hàm độc lập trong `main.js` hoặc phân chia module rõ ràng ở thư mục `admin/js/`. Khi thay đổi cấu trúc bảng, chỉ cần cập nhật hàm map dữ liệu.
3. **Thêm tính năng tương lai**:
   - Việc tích hợp thanh toán (Payment Gateway - VNPay, Momo) có thể được bổ sung vào `cart.html` và gọi API thông qua Edge Functions của Supabase (nếu cần tính toán Server-side).
   - Tích hợp gửi email tự động (Email notification) cho người mua qua Supabase Triggers (Webhook) khi bảng `order` có bản ghi mới.
   - **[MỚI]** Tích hợp Zalo Notification Service (ZNS) để gửi thông báo tự động đến khách qua Zalo khi đơn hàng thay đổi trạng thái.
   - **[MỚI]** Landing Page cho chiến dịch quảng cáo: Tạo các trang đơn giản (1 CTA, không nav phức tạp) phục vụ Google Ads / Facebook Ads.
   - **[MỚI]** Đa ngôn ngữ (i18n): Nếu mở rộng thị trường xuất khẩu, có thể thêm bản Tiếng Anh.

## 9. Lộ trình triển khai (Roadmap) — MỚI

| Giai đoạn | Thời gian | Hạng mục | Ưu tiên |
|---|---|---|---|
| **Sprint 1** | 1–2 ngày | Floating CTA (Zalo + Hotline), GA4 + Pixel, sitemap.xml, robots.txt, Footer component hóa | 🔴 Khẩn cấp |
| **Sprint 2** | 3–5 ngày | Form báo giá nhanh, Thank You Page, 3 trang Chính sách, Announcement Bar | 🔴 Quan trọng |
| **Sprint 3** | 1 tuần | Testimonials (FE + Admin), Sản phẩm liên quan, Bảng giá sỉ, Schema mở rộng, Google Maps, SEO category đầy đủ | 🟡 Tối ưu |
| **Sprint 4** | 2 tuần | Blog Admin module, Popup Lead Magnet, So sánh SP, Landing page Ads, PWA manifest, Đã xem gần đây | 🟢 Mở rộng |
