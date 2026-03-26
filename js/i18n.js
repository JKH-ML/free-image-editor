const translations = {
    ko: {
        "title": "이미지 컷 (Image Cut)",
        "point1": "무제한 무료",
        "point2": "오픈 소스",
        "point3": "가입 불필요",
        "point4": "광고 없음",
        "point5": "워터마크 없음",
        "point6": "데이터 수집 없음",
        "drop-text": "이미지를 드래그하거나 클릭하여 업로드하세요",
        "transform": "변환",
        "adjust": "보정",
        "brightness": "밝기",
        "contrast": "대비",
        "saturation": "채도",
        "quality": "품질",
        "aspect-ratio": "자르기 비율",
        "ratio-free": "자유",
        "resize": "크기 조절",
        "filters": "필터",
        "filter-none": "원본",
        "filter-gray": "그레이스케일",
        "filter-sepia": "세피아",
        "filter-invert": "반전",
        "filter-blur": "흐림",
        "format": "내보내기 설정",
        "download": "다운로드",
        "reset": "초기화",
        "privacy-note": "모든 처리는 브라우저에서 로컬로 수행됩니다. 데이터는 서버로 전송되지 않습니다."
    },
    en: {
        "title": "Image Cut",
        "point1": "Unlimited Free",
        "point2": "Open Source",
        "point3": "No Signup",
        "point4": "No Ads",
        "point5": "No Watermarks",
        "point6": "No Data Collection",
        "drop-text": "Drag and drop or click to upload an image",
        "transform": "Transform",
        "adjust": "Adjust",
        "brightness": "Brightness",
        "contrast": "Contrast",
        "saturation": "Saturation",
        "quality": "Quality",
        "aspect-ratio": "Aspect Ratio",
        "ratio-free": "Free",
        "resize": "Resize",
        "filters": "Filters",
        "filter-none": "None",
        "filter-gray": "Grayscale",
        "filter-sepia": "Sepia",
        "filter-invert": "Invert",
        "filter-blur": "Blur",
        "format": "Export Settings",
        "download": "Download",
        "reset": "Reset",
        "privacy-note": "All processing is done locally in your browser. No data is sent to any server."
    },
    zh: {
        "title": "Image Cut (图片裁剪)",
        "point1": "无限免费",
        "point2": "开源项目",
        "point3": "无需注册",
        "point4": "无广告",
        "point5": "无水印",
        "point6": "无数据收集",
        "drop-text": "拖放或点击上传图片",
        "transform": "变换",
        "adjust": "调整",
        "brightness": "亮度",
        "contrast": "对比度",
        "saturation": "饱和度",
        "quality": "质量",
        "aspect-ratio": "裁剪比例",
        "ratio-free": "自由",
        "resize": "调整大小",
        "filters": "滤镜",
        "filter-none": "原图",
        "filter-gray": "灰度",
        "filter-sepia": "复古",
        "filter-invert": "反转",
        "filter-blur": "模糊",
        "format": "导出设置",
        "download": "下载",
        "reset": "重置",
        "privacy-note": "所有处理均在您的浏览器中本地完成。数据不会发送到任何服务器。"
    },
    ja: {
        "title": "Image Cut (画像編集)",
        "point1": "完全無料",
        "point2": "オープンソース",
        "point3": "登録不要",
        "point4": "広告なし",
        "point5": "ウォーターマークなし",
        "point6": "データ収集なし",
        "drop-text": "画像をドラッグ＆ドロップするか、クリックしてアップロードしてください",
        "transform": "変換",
        "adjust": "調整",
        "brightness": "明るさ",
        "contrast": "コントラスト",
        "saturation": "彩度",
        "quality": "画質",
        "aspect-ratio": "切り抜き比率",
        "ratio-free": "自由",
        "resize": "サイズ変更",
        "filters": "フィルター",
        "filter-none": "元画像",
        "filter-gray": "グレースケール",
        "filter-sepia": "セピア",
        "filter-invert": "反転",
        "filter-blur": "ぼかし",
        "format": "書き出し設定",
        "download": "ダウンロード",
        "reset": "リセット",
        "privacy-note": "すべての処理はブラウザ内でローカルに行われます。データがサーバーに送信されることはありません。"
    }
};

let currentLang = localStorage.getItem('lang') || (navigator.language.startsWith('ko') ? 'ko' : navigator.language.startsWith('zh') ? 'zh' : navigator.language.startsWith('ja') ? 'ja' : 'en');

function updateContent() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = translations[currentLang][key];
    });
    document.documentElement.lang = currentLang;
}

document.getElementById('btn-ko').addEventListener('click', () => {
    currentLang = 'ko';
    localStorage.setItem('lang', 'ko');
    updateContent();
});

document.getElementById('btn-en').addEventListener('click', () => {
    currentLang = 'en';
    localStorage.setItem('lang', 'en');
    updateContent();
});

document.getElementById('btn-zh').addEventListener('click', () => {
    currentLang = 'zh';
    localStorage.setItem('lang', 'zh');
    updateContent();
});

document.getElementById('btn-ja').addEventListener('click', () => {
    currentLang = 'ja';
    localStorage.setItem('lang', 'ja');
    updateContent();
});

// Initial update
updateContent();
