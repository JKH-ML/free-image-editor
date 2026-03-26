const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const editorSection = document.getElementById('editor-section');
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const thumbnailList = document.getElementById('thumbnail-list');
const btnAddMore = document.getElementById('btn-add-more');

const rangeBrightness = document.getElementById('range-brightness');
const rangeContrast = document.getElementById('range-contrast');
const rangeSaturation = document.getElementById('range-saturation');
const rangeQuality = document.getElementById('range-quality');

const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const btnCompare = document.getElementById('btn-compare');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnZoomReset = document.getElementById('btn-zoom-reset');
const btnRotate = document.getElementById('btn-rotate');
const btnFlipH = document.getElementById('btn-flip-h');
const btnFlipV = document.getElementById('btn-flip-v');
const btnDownload = document.getElementById('btn-download');
const btnDownloadAll = document.getElementById('btn-download-all');
const btnReset = document.getElementById('btn-reset');
const btnCopySettings = document.getElementById('btn-copy-settings');
const btnPasteSettings = document.getElementById('btn-paste-settings');

const filterBtns = document.querySelectorAll('.filter-chip');
const ratioBtns = document.querySelectorAll('.ratio-btn');
const exportFormat = document.getElementById('export-format');
const qualityContainer = document.getElementById('quality-container');
const languageSelect = document.getElementById('language-select');

// Set initial language select value
languageSelect.value = localStorage.getItem('lang') || (navigator.language.startsWith('ko') ? 'ko' : navigator.language.startsWith('zh') ? 'zh' : navigator.language.startsWith('ja') ? 'ja' : 'en');

languageSelect.addEventListener('change', (e) => {
    const lang = e.target.value;
    localStorage.setItem('lang', lang);
    currentLang = lang;
    updateContent();
});

let images = []; 
let currentIndex = -1;
let cropper = null;
let isComparing = false;
let copiedSettings = null;

// Handle Upload
dropZone.addEventListener('click', () => fileInput.click());
btnAddMore.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

async function handleFiles(files) {
    for (const file of files) {
        if (file.type.startsWith('image/')) {
            await addImage(file);
        }
    }
    if (currentIndex === -1 && images.length > 0) {
        switchImage(0);
    }
    uploadSection.classList.add('hidden');
    editorSection.classList.remove('hidden');
    lucide.createIcons();
}

function addImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                images.push({
                    file: file,
                    img: img,
                    state: getDefaultState(),
                    undoStack: [],
                    redoStack: []
                });
                renderThumbnails();
                resolve();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function getDefaultState() {
    return { filter: 'none', brightness: 100, contrast: 100, saturation: 100, aspectRatio: NaN, cropData: null };
}

function renderThumbnails() {
    thumbnailList.innerHTML = '';
    images.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `thumbnail-item ${index === currentIndex ? 'active' : ''}`;
        div.innerHTML = `<img src="${item.img.src}">`;
        div.onclick = () => switchImage(index);
        thumbnailList.appendChild(div);
    });
}

function switchImage(index) {
    if (currentIndex === index) return;
    if (currentIndex !== -1 && cropper) {
        images[currentIndex].state.cropData = cropper.getData();
    }
    currentIndex = index;
    renderThumbnails();
    initEditor(images[currentIndex].state);
}

function initEditor(savedState) {
    if (cropper) cropper.destroy();
    const currentItem = images[currentIndex];
    currentItem.state = JSON.parse(JSON.stringify(savedState));
    updateUIFromState();

    const tempImg = new Image();
    tempImg.src = currentItem.img.src;
    const container = document.querySelector('.canvas-container');
    container.innerHTML = '';
    container.appendChild(tempImg);

    cropper = new Cropper(tempImg, {
        aspectRatio: currentItem.state.aspectRatio,
        viewMode: 1,
        autoCropArea: 1,
        data: currentItem.state.cropData,
        ready() { renderToCanvas(); },
        cropend() { saveHistory(); renderToCanvas(); },
        zoom() { renderToCanvas(); }
    });
}

function updateUIFromState() {
    const s = images[currentIndex].state;
    rangeBrightness.value = s.brightness;
    rangeContrast.value = s.contrast;
    rangeSaturation.value = s.saturation;
    
    // Update labels
    rangeBrightness.closest('.slider-item').querySelector('.val').textContent = s.brightness;
    rangeContrast.closest('.slider-item').querySelector('.val').textContent = s.contrast;
    rangeSaturation.closest('.slider-item').querySelector('.val').textContent = s.saturation;

    ratioBtns.forEach(btn => btn.classList.toggle('active', 
        (isNaN(s.aspectRatio) && btn.dataset.ratio === 'NaN') || 
        (parseFloat(btn.dataset.ratio) === s.aspectRatio)
    ));

    filterBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === s.filter));
    
    updateHistoryButtons();
}

function saveHistory() {
    const item = images[currentIndex];
    const currentState = JSON.parse(JSON.stringify(item.state));
    if (cropper) currentState.cropData = cropper.getData();
    if (item.undoStack.length > 0 && JSON.stringify(item.undoStack[item.undoStack.length - 1]) === JSON.stringify(currentState)) return;
    item.undoStack.push(currentState);
    item.redoStack = [];
    updateHistoryButtons();
}

function updateHistoryButtons() {
    if (currentIndex === -1) return;
    const item = images[currentIndex];
    btnUndo.disabled = item.undoStack.length === 0;
    btnRedo.disabled = item.redoStack.length === 0;
}

function renderToCanvas() {
    if (!cropper || currentIndex === -1) return;
    const croppedCanvas = isComparing ? getOriginalCroppedCanvas() : cropper.getCroppedCanvas();
    if (!croppedCanvas) return;

    canvas.width = croppedCanvas.width;
    canvas.height = croppedCanvas.height;

    ctx.save();
    if (!isComparing) {
        const s = images[currentIndex].state;
        ctx.filter = [getCanvasFilter(s.filter), `brightness(${s.brightness}%)`, `contrast(${s.contrast}%)`, `saturate(${s.saturation}%)`].join(' ');
    }
    ctx.drawImage(croppedCanvas, 0, 0);
    ctx.restore();
}

function getOriginalCroppedCanvas() {
    const data = cropper.getData();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = data.width;
    tempCanvas.height = data.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(images[currentIndex].img, data.x, data.y, data.width, data.height, 0, 0, data.width, data.height);
    return tempCanvas;
}

function getCanvasFilter(filter) {
    switch (filter) {
        case 'grayscale': return 'grayscale(100%)';
        case 'sepia': return 'sepia(100%)';
        case 'invert': return 'invert(100%)';
        case 'blur': return 'blur(5px)';
        default: return '';
    }
}

// Listeners
[rangeBrightness, rangeContrast, rangeSaturation].forEach(el => {
    el.addEventListener('change', () => saveHistory());
    el.addEventListener('input', () => {
        const s = images[currentIndex].state;
        s.brightness = rangeBrightness.value;
        s.contrast = rangeContrast.value;
        s.saturation = rangeSaturation.value;
        el.closest('.slider-item').querySelector('.val').textContent = el.value;
        renderToCanvas();
    });
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        saveHistory();
        images[currentIndex].state.filter = btn.getAttribute('data-filter');
        updateUIFromState();
        renderToCanvas();
    });
});

ratioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        saveHistory();
        images[currentIndex].state.aspectRatio = parseFloat(btn.dataset.ratio);
        cropper.setAspectRatio(images[currentIndex].state.aspectRatio);
        updateUIFromState();
    });
});

btnCopySettings.addEventListener('click', () => {
    const s = images[currentIndex].state;
    copiedSettings = { filter: s.filter, brightness: s.brightness, contrast: s.contrast, saturation: s.saturation };
    btnPasteSettings.disabled = false;
});

btnPasteSettings.addEventListener('click', () => {
    if (!copiedSettings) return;
    saveHistory();
    Object.assign(images[currentIndex].state, copiedSettings);
    updateUIFromState();
    renderToCanvas();
});

btnUndo.addEventListener('click', () => {
    const item = images[currentIndex];
    if (item.undoStack.length === 0) return;
    const current = JSON.parse(JSON.stringify(item.state));
    if (cropper) current.cropData = cropper.getData();
    item.redoStack.push(current);
    applyState(item.undoStack.pop());
});

btnRedo.addEventListener('click', () => {
    const item = images[currentIndex];
    if (item.redoStack.length === 0) return;
    const current = JSON.parse(JSON.stringify(item.state));
    if (cropper) current.cropData = cropper.getData();
    item.undoStack.push(current);
    applyState(item.redoStack.pop());
});

function applyState(targetState) {
    images[currentIndex].state = JSON.parse(JSON.stringify(targetState));
    updateUIFromState();
    if (cropper) { 
        cropper.setAspectRatio(images[currentIndex].state.aspectRatio); 
        cropper.setData(images[currentIndex].state.cropData); 
    }
    renderToCanvas();
}

btnCompare.addEventListener('mousedown', () => { isComparing = true; btnCompare.classList.add('active'); renderToCanvas(); });
btnCompare.addEventListener('mouseup', () => { isComparing = false; btnCompare.classList.remove('active'); renderToCanvas(); });
btnCompare.addEventListener('mouseleave', () => { if (isComparing) { isComparing = false; btnCompare.classList.remove('active'); renderToCanvas(); } });
btnZoomIn.addEventListener('click', () => cropper.zoom(0.1));
btnZoomOut.addEventListener('click', () => cropper.zoom(-0.1));
btnZoomReset.addEventListener('click', () => cropper.reset());
btnRotate.addEventListener('click', () => { saveHistory(); cropper.rotate(90); });
btnFlipH.addEventListener('click', () => { saveHistory(); cropper.scaleX(cropper.getData().scaleX * -1); });
btnFlipV.addEventListener('click', () => { saveHistory(); cropper.scaleY(cropper.getData().scaleY * -1); });

btnReset.addEventListener('click', () => { if (currentIndex !== -1) { saveHistory(); initEditor(getDefaultState()); } });

exportFormat.addEventListener('change', () => {
    qualityContainer.classList.toggle('hidden', !(exportFormat.value === 'image/jpeg' || exportFormat.value === 'image/webp'));
});

rangeQuality.addEventListener('input', () => {
    rangeQuality.closest('.slider-item').querySelector('.val').textContent = rangeQuality.value + '%';
});

// Download Logics
async function getFinalCanvas(imgItem) {
    const s = imgItem.state;
    let cropData = (imgItem === images[currentIndex] && cropper) ? cropper.getData() : s.cropData;
    if (!cropData) cropData = { x: 0, y: 0, width: imgItem.img.width, height: imgItem.img.height };

    const drawCanvas = document.createElement('canvas');
    drawCanvas.width = cropData.width;
    drawCanvas.height = cropData.height;
    const dCtx = drawCanvas.getContext('2d');
    dCtx.filter = [getCanvasFilter(s.filter), `brightness(${s.brightness}%)`, `contrast(${s.contrast}%)`, `saturate(${s.saturation}%)`].join(' ');
    dCtx.drawImage(imgItem.img, cropData.x, cropData.y, cropData.width, cropData.height, 0, 0, cropData.width, cropData.height);
    return drawCanvas;
}

btnDownload.addEventListener('click', async () => {
    const finalCanvas = await getFinalCanvas(images[currentIndex]);
    const link = document.createElement('a');
    link.download = `image-editor-${Date.now()}.${exportFormat.value.split('/')[1]}`;
    link.href = finalCanvas.toDataURL(exportFormat.value, parseInt(rangeQuality.value)/100);
    link.click();
});

btnDownloadAll.addEventListener('click', async () => {
    if (images.length === 0) return;
    const zip = new JSZip();
    btnDownloadAll.disabled = true;
    btnDownloadAll.innerText = 'Processing...';
    for (let i = 0; i < images.length; i++) {
        const finalCanvas = await getFinalCanvas(images[i]);
        const dataUrl = finalCanvas.toDataURL(exportFormat.value, parseInt(rangeQuality.value)/100);
        zip.file(`image-${i+1}.${exportFormat.value.split('/')[1]}`, dataUrl.split(',')[1], {base64: true});
    }
    const content = await zip.generateAsync({type: "blob"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `image-editor-all-${Date.now()}.zip`;
    link.click();
    btnDownloadAll.disabled = false;
    btnDownloadAll.innerHTML = `<i data-lucide="download"></i> <span>Download All (ZIP)</span>`;
    lucide.createIcons();
    updateContent();
});
