const translations = {
    ko: {
        "title": "이미지 컷 (Image Cut)",
        "point1": "무제한 무료",
        "point2": "오픈 소스",
        "point3": "가입 불필요",
        "point4": "광고 없음",
        "drop-text": "이미지를 드래그하거나 클릭하여 업로드하세요",
        "resize": "크기 조절",
        "filters": "필터",
        "filter-none": "원본",
        "filter-gray": "그레이스케일",
        "filter-sepia": "세피아",
        "filter-invert": "반전",
        "format": "형식 변환",
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
        "drop-text": "Drag and drop or click to upload an image",
        "resize": "Resize",
        "filters": "Filters",
        "filter-none": "None",
        "filter-gray": "Grayscale",
        "filter-sepia": "Sepia",
        "filter-invert": "Invert",
        "format": "Format",
        "download": "Download",
        "reset": "Reset",
        "privacy-note": "All processing is done locally in your browser. No data is sent to any server."
    }
};

let currentLang = localStorage.getItem('lang') || (navigator.language.startsWith('ko') ? 'ko' : 'en');

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

// Initial update
updateContent();
