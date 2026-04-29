/**
 * Montessori Development Data
 * Age-appropriate activities, focus areas, and roadmap
 * Based on AMI (Association Montessori Internationale) guidelines
 */

// Age ranges in months
const STAGES = [
  {
    id: 'infant-0-3',
    ageRange: [0, 3],
    title: 'Sơ sinh (0-3 tháng)',
    subtitle: 'Giai đoạn hấp thụ vô thức',
    focus: [
      'Liên kết tình cảm (Bonding)',
      'Giác quan: thị giác, thính giác, xúc giác',
      'Cổ cứng & kiểm soát đầu',
      'Phản xạ nắm bắt (Grasping reflex)',
    ],
    environment: [
      'Không gian yên tĩnh, ánh sáng tự nhiên',
      'Nôi/ghế thấp để bé quan sát xung quanh',
      'Đồ chơi treo mobile đen trắng (0-6 tuần)',
      'Đồ vật nhỏ gọn vừa tay nắm',
    ],
  },
  {
    id: 'infant-3-6',
    ageRange: [3, 6],
    title: 'Giai đoạn 3-6 tháng',
    subtitle: 'Khám phá bàn tay & vận động thô',
    focus: [
      'Với & nắm đồ vật chính xác',
      'Lẫy (Rolling over)',
      'Ngồi với hỗ trợ',
      'Phát âm nguyên âm (cooing)',
      'Nhận biết khuôn mặt quen thuộc',
    ],
    environment: [
      'Thảm nằm (Play mat) rộng rãi',
      'Đồ chơi vừa tay: bóng nhỏ, xúc xắc gỗ',
      'Gương an toàn để bé nhìn mình',
      'Sách vải đen trắng → màu sắc cơ bản',
    ],
  },
  {
    id: 'infant-6-12',
    ageRange: [6, 12],
    title: 'Giai đoạn 6-12 tháng',
    subtitle: 'Bò, đứng & khám phá không gian',
    focus: [
      'Bò, vịn đứng, chập chững',
      'Đối tượng vĩnh viễn (Object permanence)',
      'Nói từ đầu tiên (ba, ma, bà)',
      'Ăn dặm tự chỉ huy (BLW)',
      'Ngón tay cái đối lập (Pincer grasp)',
    ],
    environment: [
      'Thanh vịn thấp để tập đi',
      'Khối hộp lồng vào nhau',
      'Đồ chơi ẩn giấu (peek-a-boo)',
      'Thìa/đĩa riêng cho bé tập ăn',
      'Sách board book hình ảnh thực',
    ],
  },
  {
    id: 'toddler-12-18',
    ageRange: [12, 18],
    title: 'Tập đi (12-18 tháng)',
    subtitle: 'Độc lập & ngôn ngữ đầu tiên',
    focus: [
      'Đi bộ vững vàng',
      'Từ vựng 10-50 từ',
      'Hoạt động thực tế (Practical Life)',
      'Xếp chồng, lồng ghép đơn giản',
      'Bắt chước hành vi người lớn',
    ],
    environment: [
      'Giá đồ chơi thấp, dễ lấy',
      'Bộ đổ nước/đậu để múc rót',
      'Xe đẩy đồ (push walker)',
      'Sách chỉ hình gọi tên',
      'Bàn ghế vừa tầm bé',
    ],
  },
  {
    id: 'toddler-18-24',
    ageRange: [18, 24],
    title: '18-24 tháng',
    subtitle: 'Bùng nổ ngôn ngữ & trật tự',
    focus: [
      'Câu 2-3 từ',
      'Nhu cầu trật tự cao (mọi thứ phải đúng chỗ)',
      'Tự xúc ăn, tập mặc áo',
      'Phân loại màu sắc, hình dạng',
      'Khủng hoảng tuổi lên 2 bắt đầu',
    ],
    environment: [
      'Giá phân loại theo màu/hình',
      'Hoạt động Practical Life: lau bàn, gấp khăn, tưới cây',
      'Đồ chơi kéo đẩy',
      'Bộ ghép hình đơn giản (2-3 mảnh)',
      'Cho bé tham gia nấu ăn đơn giản',
    ],
  },
  {
    id: 'toddler-2-3',
    ageRange: [24, 36],
    title: '2-3 tuổi',
    subtitle: 'Giai đoạn nhạy cảm vận động & ngôn ngữ',
    focus: [
      'Câu hoàn chỉnh, từ vựng bùng nổ',
      'Tập ngồi bô/ Toilet training',
      'Vận động tinh: cắt kéo, xé giấy, nặn đất',
      'Đếm đến 10, nhận biết màu cơ bản',
      'Chơi song song → bắt đầu chơi chung',
      'Tự đi giày, mặc áo đơn giản',
    ],
    environment: [
      'Giá sách Montessori thấp',
      'Bộ chữ cái nổi (Sandpaper Letters)',
      'Đồ chơi xây dựng (blocks)',
      'Hoạt động Practical Life: rửa bát, gấp quần áo',
      'Bảng phân loại (Sorting boards)',
      'Vẽ & nặn tự do',
    ],
  },
  {
    id: 'primary-3-4',
    ageRange: [36, 48],
    title: '3-4 tuổi',
    subtitle: 'Giai đoạn nhạy cảm văn hóa & giác quan',
    focus: [
      'Hoạt động giác quan (Sensorial): so sánh, phân loại',
      'Làm quen chữ cái qua Sandpaper Letters',
      'Đếm & nhận biết số 1-10',
      'Vẽ hình người đơn giản',
      'Chơi vai trò (imaginative play)',
      'Hiểu quy tắc đơn giản',
    ],
    environment: [
      'Pink Tower, Brown Stair (cảm quan kích thước)',
      'Bộ Cylinder Blocks',
      'Moveable Alphabet (chữ cái di động)',
      'Bảng phân loại theo nhiều tiêu chí',
      'Globe, bản đồ đơn giản',
      'Thí nghiệm khoa học đơn giản',
    ],
  },
  {
    id: 'primary-4-5',
    ageRange: [48, 60],
    title: '4-5 tuổi',
    subtitle: 'Học đọc, viết & toán học cụ thể',
    focus: [
      'Đọc từ đơn giản (3-4 chữ cái)',
      'Viết tên, viết chữ cái',
      'Cộng trừ đơn giản với vật liệu cụ thể',
      'Hiểu khái niệm thời gian (hôm qua, ngày mai)',
      'Khám phá thiên nhiên, khoa học',
      'Kỹ năng xã hội: chia sẻ, hợp tác',
    ],
    environment: [
      'Sandpaper Letters + Moveable Alphabet',
      'Bead Frame (khung tính hạt) cho toán',
      'Number Rods (thanh số)',
      'Bộ lịch & thời tiết',
      'Sách truyện dài hơn',
      'Hoạt động nhóm nhỏ',
    ],
  },
  {
    id: 'primary-5-6',
    ageRange: [60, 72],
    title: '5-6 tuổi',
    subtitle: 'Chuẩn bị vào lớp 1 & tư duy trừu tượng',
    focus: [
      'Đọc hiểu đoạn văn ngắn',
      'Viết câu hoàn chỉnh',
      'Cộng trừ trong phạm vi 20',
      'Khái niệm phân số cơ bản (1/2, 1/4)',
      'Tự quản lý đồ dùng cá nhân',
      'Tư duy logic & giải quyết vấn đề',
    ],
    environment: [
      'Stamp Game (trò chơi tem) cho toán',
      'Grammar Symbols (ký hiệu ngữ pháp)',
      'Thí nghiệm khoa học có hệ thống',
      'Bản đồ chi tiết, địa lý',
      'Hoạt động dự án nhóm',
      'Sách truyện chương (chapter books)',
    ],
  },
];

// Daily activities database by age range (months)
const ACTIVITIES = [
  // 0-3 months
  { ageMin: 0, ageMax: 3, category: 'giác quan', title: 'Mobile đen trắng', desc: 'Treo mobile đen trắng cách mắt bé 20-30cm. Di chuyển chậm để bé tập nhìn theo.', materials: 'Mobile đen trắng / thẻ flashcard', duration: '5-10 phút', icon: '👀' },
  { ageMin: 0, ageMax: 3, category: 'vận động', title: 'Thời gian nằm sấp (Tummy time)', desc: 'Đặt bé nằm sấp trên thảm, 2-3 phút mỗi lần. Tăng dần thời gian.', materials: 'Thảm mềm, đồ chơi nhỏ', duration: '2-5 phút x nhiều lần', icon: '🍼' },
  { ageMin: 0, ageMax: 3, category: 'ngôn ngữ', title: 'Nói chuyện với bé', desc: 'Kể chuyện khi thay tã, tắm, cho ăn. Nói chậm, rõ ràng, nhìn mắt bé.', materials: 'Không cần', duration: 'Cả ngày', icon: '🗣️' },

  // 3-6 months
  { ageMin: 3, ageMax: 6, category: 'vận động', title: 'Tập với nắm đồ vật', desc: 'Đưa đồ vật gần tay bé để tập nắm. Cho bé chạm vào đồ vật có nhiều chất liệu khác nhau.', materials: 'Xúc xắc vải, bóng mềm, vòng gỗ', duration: '10-15 phút', icon: '✊' },
  { ageMin: 3, ageMax: 6, category: 'giác quan', title: 'Gương Montessori', desc: 'Đặt gương an toàn trước bé khi nằm sấp. Bé sẽ thích nhìn mình và các chuyển động.', materials: 'Gương acrylic an toàn', duration: '10-15 phút', icon: '🪞' },
  { ageMin: 3, ageMax: 6, category: 'ngôn ngữ', title: 'Đọc sách vải', desc: 'Đọc sách vải đen trắng chuyển dần sang màu. Chỉ vào hình và gọi tên.', materials: 'Sách vải, board book', duration: '5-10 phút', icon: '📖' },

  // 6-12 months
  { ageMin: 6, ageMax: 12, category: 'vận động', title: 'Đường hầm bò', desc: 'Tạo đường hầm từ hộp/carton để bé bò qua. Đặt đồ chơi ở cuối để khuyến khích.', materials: 'Hộp carton lớn', duration: '10-15 phút', icon: '🏃' },
  { ageMin: 6, ageMax: 12, category: 'thực tế', title: 'Ăn dặm tự chỉ huy (BLW)', desc: 'Cho bé tự cầm thức ăn mềm để ăn. Bé học phối hợp tay-miệng và độc lập.', materials: 'Thức ăn mềm cắt vừa tay', duration: '15-20 phút', icon: '🍽️' },
  { ageMin: 6, ageMax: 12, category: 'giác quan', title: 'Trò chơi ẩn giấu', desc: 'Ẩn đồ vật dưới khăn/mũi để bé tìm. Phát triển đối tượng vĩnh viễn.', materials: 'Khăn nhỏ, đồ chơi yêu thích', duration: '5-10 phút', icon: '🫣' },
  { ageMin: 6, ageMax: 12, category: 'ngôn ngữ', title: 'Gọi tên đồ vật', desc: 'Chỉ vào đồ vật xung quanh và gọi tên rõ ràng. Lặp lại nhiều lần.', materials: 'Đồ vật hàng ngày', duration: 'Cả ngày', icon: '🗣️' },

  // 12-18 months
  { ageMin: 12, ageMax: 18, category: 'thực tế', title: 'Múc & rót', desc: 'Cho bé dùng thìa múc đậu/chuyển nước giữa 2 cốc. Phát triển phối hợp tay.', materials: 'Đậu, thìa, khay, cốc nhỏ', duration: '10-15 phút', icon: '🥄' },
  { ageMin: 12, ageMax: 18, category: 'vận động', title: 'Xe đẩy đồ (Push walker)', desc: 'Cho bé đẩy xe đi quanh nhà. Hỗ trợ tập đi và giữ thăng bằng.', materials: 'Xe đẩy Montessori', duration: '15-20 phút', icon: '🛒' },
  { ageMin: 12, ageMax: 18, category: 'ngôn ngữ', title: 'Chỉ hình gọi tên', desc: 'Dùng sách hình thực: "Con chó! Con chó gâu gâu!" Hỏi bé "Đâu là con chó?"', materials: 'Sách hình thực', duration: '10-15 phút', icon: '📚' },
  { ageMin: 12, ageMax: 18, category: 'giác quan', title: 'Xếp chồng & lồng ghép', desc: 'Cho bé xếp ly/cốc từ lớn đến nhỏ. Học khái niệm lớn-nhỏ.', materials: 'Bộ xếp chồng gỗ', duration: '10-15 phút', icon: '🧊' },

  // 18-24 months
  { ageMin: 18, ageMax: 24, category: 'thực tế', title: 'Lau bàn / quét nhà', desc: 'Cho bé khăn nhỏ để lau bàn sau khi ăn. Bé sẽ thích bắt chước người lớn.', materials: 'Khăn lau nhỏ, chổi nhỏ', duration: '5-10 phút', icon: '🧹' },
  { ageMin: 18, ageMax: 24, category: 'giác quan', title: 'Phân loại màu sắc', desc: 'Cho bé phân loại đồ vật theo màu: đỏ, xanh, vàng. Bắt đầu từ 2-3 màu.', materials: 'Pom-pom, nút áo, khối gỗ màu', duration: '10-15 phút', icon: '🔴' },
  { ageMin: 18, ageMax: 24, category: 'ngôn ngữ', title: 'Nói câu 2 từ', desc: 'Khuyến khích bé nói "Mẹ ơi", "Cho con". Lặp lại và mở rộng câu của bé.', materials: 'Không cần', duration: 'Cả ngày', icon: '💬' },
  { ageMin: 18, ageMax: 24, category: 'vận động', title: 'Leo trèo an toàn', desc: 'Cho bé leo lên đệm, bậc thang thấp. Phát triển thăng bằng và tự tin.', materials: 'Xếp hình foam, bậc thang nhỏ', duration: '15-20 phút', icon: '🧗' },

  // 2-3 years
  { ageMin: 24, ageMax: 36, category: 'thực tế', title: 'Tự mặc áo', desc: 'Để bé tập mặc áo đơn giản. Bắt đầu với áo rộng, không cúc phức tạp.', materials: 'Áo rộng, giày dán velcro', duration: '10-15 phút', icon: '👕' },
  { ageMin: 24, ageMax: 36, category: 'thực tế', title: 'Nấu ăn cùng bé', desc: 'Cho bé rửa rau, khuấy bột, xé bánh mì. Hoạt động Practical Life yêu thích.', materials: 'Nguyên liệu đơn giản, dụng cụ an toàn', duration: '15-20 phút', icon: '👩‍🍳' },
  { ageMin: 24, ageMax: 36, category: 'toán học', title: 'Đếm đồ vật', desc: 'Đếm bước chân, đếm nút áo, đếm quả táo. Đếm mọi thứ trong cuộc sống.', materials: 'Đồ vật hàng ngày', duration: '10-15 phút', icon: '🔢' },
  { ageMin: 24, ageMax: 36, category: 'giác quan', title: 'Sandpaper Letters (chữ cái nhám)', desc: 'Cho bé sờ chữ cái nhám và nói âm. Bắt đầu từ chữ trong tên bé.', materials: 'Bộ Sandpaper Letters', duration: '5-10 phút', icon: '🔤' },
  { ageMin: 24, ageMax: 36, category: 'vận động', title: 'Cắt kéo an toàn', desc: 'Cho bé cắt giấy bằng kéo an toàn. Phát triển cơ tay và phối hợp.', materials: 'Kéo an toàn, giấy mềm', duration: '10-15 phút', icon: '✂️' },
  { ageMin: 24, ageMax: 36, category: 'văn hóa', title: 'Khám phá thiên nhiên', desc: 'Đi dạo ngoài trời, nhặt lá, ngắm chim. Hỏi "Cái này màu gì? Cảm giác thế nào?"', materials: 'Giỏ nhỏ để nhặt đồ', duration: '20-30 phút', icon: '🌿' },

  // 3-4 years
  { ageMin: 36, ageMax: 48, category: 'giác quan', title: 'Pink Tower (Tháp hồng)', desc: 'Xếp 10 khối từ lớn đến nhỏ. Phát triển cảm quan kích thước và phối hợp.', materials: 'Pink Tower Montessori', duration: '10-15 phút', icon: '🏗️' },
  { ageMin: 36, ageMax: 48, category: 'giác quan', title: 'Color Tablets (Màu sắc)', desc: 'So sánh và sắp xếp bảng màu từ đậm đến nhạt. Bắt đầu từ 3 màu cơ bản.', materials: 'Color Tablets Box 1-3', duration: '10-15 phút', icon: '🎨' },
  { ageMin: 36, ageMax: 48, category: 'toán học', title: 'Number Rods (Thanh số)', desc: 'Dùng thanh gỗ nhiều độ dài để hiểu khái niệm số 1-10.', materials: 'Number Rods', duration: '10-15 phút', icon: '📏' },
  { ageMin: 36, ageMax: 48, category: 'ngôn ngữ', title: 'Moveable Alphabet', desc: 'Dùng chữ cái di động để ghép từ đơn giản. Bắt đầu từ tên bé.', materials: 'Moveable Alphabet', duration: '10-15 phút', icon: '🔡' },
  { ageMin: 36, ageMax: 48, category: 'văn hóa', title: 'Bản đồ lục địa', desc: 'Giới thiệu 7 châu lục qua bản đồ puzzle. Kể chuyện về các nước.', materials: 'World map puzzle', duration: '10-15 phút', icon: '🌍' },
  { ageMin: 36, ageMax: 48, category: 'khoa học', title: 'Thí nghiệm nước', desc: 'Chìm/nổi: cho đồ vật vào nước để đoán. Ghi nhận kết quả.', materials: 'Chậu nước, đồ vật khác nhau', duration: '15-20 phút', icon: '🔬' },

  // 4-5 years
  { ageMin: 48, ageMax: 60, category: 'ngôn ngữ', title: 'Đọc từ 3-4 chữ cái', desc: 'Ghép âm: c-a → ca, m-a-m → mam. Dùng Sandpaper Letters + Moveable Alphabet.', materials: 'Sandpaper Letters, sách đơn giản', duration: '10-15 phút', icon: '📖' },
  { ageMin: 48, ageMax: 60, category: 'toán học', title: 'Bead Frame (Khung tính hạt)', desc: 'Cộng trừ đơn giản trong phạm vi 20 bằng hạt màu.', materials: 'Bead Frame / Seguin Board', duration: '10-15 phút', icon: '🧮' },
  { ageMin: 48, ageMax: 60, category: 'thực tế', title: 'Gấp quần áo', desc: 'Dạy bé gấp khăn, áo đơn giản theo nếp. Rèn tính cẩn thận.', materials: 'Khăn vuông, áo nhỏ', duration: '10-15 phút', icon: '👔' },
  { ageMin: 48, ageMax: 60, category: 'văn hóa', title: 'Thí nghiệm khoa học', desc: 'Núi lửa baking soda, nhuộm màu hoa. Giải thích đơn giản tại sao.', materials: 'Baking soda, giấm, phẩm màu', duration: '15-20 phút', icon: '🧪' },
  { ageMin: 48, ageMax: 60, category: 'xã hội', title: 'Chơi vai trò nhóm', desc: 'Chơi nhà hàng, bác sĩ, trường học. Học hợp tác và giải quyết xung đột.', materials: 'Đồ chơi vai trò', duration: '20-30 phút', icon: '🎭' },

  // 5-6 years
  { ageMin: 60, ageMax: 72, category: 'toán học', title: 'Stamp Game (Trò chơi tem)', desc: 'Cộng trừ có nhớ bằng tem màu: hàng đơn vị, chục, trăm.', materials: 'Stamp Game', duration: '15-20 phút', icon: '🎲' },
  { ageMin: 60, ageMax: 72, category: 'ngôn ngữ', title: 'Viết câu hoàn chỉnh', desc: 'Viết nhật ký 1-2 câu mỗi ngày. Kể chuyện theo trình tự.', materials: 'Vở, bút chì', duration: '10-15 phút', icon: '✍️' },
  { ageMin: 60, ageMax: 72, category: 'toán học', title: 'Phân số cơ bản', desc: 'Dùng pizza/circle cắt 1/2, 1/4. Hiểu "một phần hai" bằng vật liệu cụ thể.', materials: 'Fraction circles, pizza thật', duration: '10-15 phút', icon: '🍕' },
  { ageMin: 60, ageMax: 72, category: 'văn hóa', title: 'Dự án nhóm', desc: 'Làm dự án đơn giản: trồng cây, quan sát thời tiết, làm sách.', materials: 'Tùy dự án', duration: '30-45 phút', icon: '📋' },
  { ageMin: 60, ageMax: 72, category: 'logic', title: 'Trò chơi logic', desc: 'Cờ vua đơn giản, sudoku 4x4, bài toán đố vui. Phát triển tư duy.', materials: 'Board game, puzzle', duration: '15-20 phút', icon: '🧩' },
];

// Tips for parents by stage
const PARENT_TIPS = {
  'infant-0-3': [
    'Nói chuyện với bé thật nhiều — bé đang hấp thụ ngôn ngữ từ bạn',
    'Không cần đồ chơi đắt tiền — khuôn mặt bạn là "đồ chơi" tốt nhất',
    'Để bé tự giải quyết khi khóc nhẹ — học cách tự trấn an',
  ],
  'infant-3-6': [
    'Cho bé nhiều thời gian nằm sấp — đây là nền tảng vận động',
    'Hạn chế thời gian ngồi ghế/bouncer — bé cần tự do vận động',
    'Mô tả mọi thứ bạn đang làm: "Mẹ đang thay tã cho con"',
  ],
  'infant-6-12': [
    'Để bé tự bốc ăn — bẩn một chút nhưng rất quan trọng',
    'Không can thiệp quá nhanh khi bé gặp khó khăn — cho bé thời gian thử',
    'Nhà phải an toàn cho bé bò tự do (baby-proofing)',
  ],
  'toddler-12-18': [
    'Cho bé tham gia hoạt động hàng ngày: lau bàn, gấp khăn',
    'Hạn chế nói "Không" — thay bằng hướng dẫn tích cực',
    'Cho bé chọn 2 lựa chọn thay vì hỏi mở: "Con mặc áo đỏ hay xanh?"',
  ],
  'toddler-18-24': [
    'Giai đoạn trật tự: bé có thể khóc nếu đồ vật bị di chuyển — bình thường!',
    'Cho bé làm cùng: rửa rau, khuấy bột, quét nhà',
    'Đọc sách cùng bé mỗi ngày — ít nhất 15 phút',
  ],
  'toddler-2-3': [
    'Không ép ngồi bô — chờ bé sẵn sàng',
    'Cho bé nhiều thời gian ngoài trời — thiên nhiên là lớp học tốt nhất',
    'Khen hành vi cụ thể: "Con tự mặc áo giỏi quá!" thay vì "Giỏi quá!"',
  ],
  'primary-3-4': [
    'Giai đoạn "Tại sao?" — hãy kiên nhẫn trả lời mọi câu hỏi',
    'Cho bé tiếp xúc nhiều ngôn ngữ, âm nhạc, nghệ thuật',
    'Hạn chế màn hình — ưu tiên hoạt động tay chân',
  ],
  'primary-4-5': [
    'Đọc cho bé nghe mỗi ngày — và để bé "đọc" lại cho bạn',
    'Cho bé làm dự án nhỏ: trồng cây, nuôi cá, quan sát thời tiết',
    'Khuyến khích bé tự giải quyết xung đột với bạn bè',
  ],
  'primary-5-6': [
    'Chu bị vào lớp 1: tập ngồi yên 15-20 phút, viết tên, đếm đến 20',
    'Cho bé trải nghiệm nhiều: đi bảo tàng, công viên, chợ',
    'Đọc sách chương together — tạo thói quen đọc sách dài',
  ],
};

function getAgeInMonths(birthday) {
  if (!birthday) return null;
  const b = new Date(birthday);
  const now = new Date();
  return (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
}

function getCurrentStage(birthday) {
  const months = getAgeInMonths(birthday);
  if (months === null) return null;
  return STAGES.find(s => months >= s.ageRange[0] && months < s.ageRange[1]) || STAGES[STAGES.length - 1];
}

function getUpcomingStages(birthday) {
  const months = getAgeInMonths(birthday);
  if (months === null) return [];
  return STAGES.filter(s => s.ageRange[0] > months);
}

function getDailyActivities(birthday, count = 5) {
  const months = getAgeInMonths(birthday);
  if (months === null) return [];
  const eligible = ACTIVITIES.filter(a => months >= a.ageMin && months < a.ageMax);
  // Shuffle and pick
  const shuffled = eligible.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getParentTips(birthday) {
  const stage = getCurrentStage(birthday);
  if (!stage) return [];
  return PARENT_TIPS[stage.id] || [];
}

function getAllActivities(birthday) {
  const months = getAgeInMonths(birthday);
  if (months === null) return [];
  return ACTIVITIES.filter(a => months >= a.ageMin && months < a.ageMax);
}

module.exports = {
  STAGES, ACTIVITIES, PARENT_TIPS,
  getAgeInMonths, getCurrentStage, getUpcomingStages,
  getDailyActivities, getParentTips, getAllActivities,
};
