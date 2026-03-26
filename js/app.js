const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const viewLanding = document.getElementById('view-landing');
const viewUpload = document.getElementById('view-upload');
const viewEditor = document.getElementById('view-editor');
const logoHome = document.getElementById('logo-home');

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

let images = []; 
let currentIndex = -1;
let cropper = null;
let isComparing = false;
let copiedSettings = null;
let currentMode = 'full';

// --- Router ---
const routes = {
    'home': () => {
        showView(viewLanding);
    },
    'upload': () => {
        showView(viewUpload);
    },
    'editor': () => {
        if (images.length === 0) {
            navigate('home');
            return;
        }
        showView(viewEditor);
        applyModeUI(currentMode);
    }
};

function navigate(routeName, mode = null) {
    if (mode) currentMode = mode;
    window.location.hash = routeName;
}

function handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'home';
    const route = routes[hash] || routes['home'];
    route();
}

function showView(viewElement) {
    [viewLanding, viewUpload, viewEditor].forEach(v => v.classList.add('hidden'));
    viewElement.classList.remove('hidden');
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', handleRoute);

// --- Logo Home ---
logoHome.addEventListener('click', () => {
    if (images.length > 0) {
        if (!confirm('Discard all changes and go to home?')) return;
    }
    images = [];
    currentIndex = -1;
    if (cropper) cropper.destroy();
    cropper = null;
    thumbnailList.innerHTML = '';
    navigate('home');
});

// --- Menu Selection ---
document.querySelectorAll('.menu-card').forEach(card => {
    card.addEventListener('click', () => {
        const mode = card.dataset.route;
        navigate('upload', mode);
    });
});

function applyModeUI(mode) {
    const sections = {
        ratio: document.getElementById('section-ratio'),
        transform: document.getElementById('section-transform'),
        resize: document.getElementById('section-resize'),
        adjust: document.getElementById('section-adjust'),
        filters: document.getElementById('section-filters')
    };

    Object.values(sections).forEach(s => s.classList.remove('hidden'));

    if (mode === 'crop') {
        sections.adjust.classList.add('hidden');
        sections.filters.classList.add('hidden');
    } else if (mode === 'enhance') {
        sections.ratio.classList.add('hidden');
        sections.resize.classList.add('hidden');
        sections.transform.classList.add('hidden');
    }
}

// --- Upload Logic ---
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
    if (images.length > 0) {
        if (currentIndex === -1) switchImage(0);
        navigate('editor');
    }
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
                    state: { filter: 'none', brightness: 100, contrast: 100, saturation: 100, aspectRatio: NaN, cropData: null },
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
    const s = currentItem.state;
    
    rangeBrightness.value = s.brightness;
    rangeContrast.value = s.contrast;
    rangeSaturation.value = s.saturation;
    updateUIValues();

    const tempImg = new Image();
    tempImg.src = currentItem.img.src;
    const container = document.querySelector('.canvas-container');
    container.innerHTML = '';
    container.appendChild(tempImg);

    cropper = new Cropper(tempImg, {
        aspectRatio: s.aspectRatio,
        viewMode: 1,
        autoCropArea: 1,
        data: s.cropData,
        ready() { renderToCanvas(); },
        cropend() { saveHistory(); renderToCanvas(); },
        zoom() { renderToCanvas(); }
    });
    
    ratioBtns.forEach(btn => btn.classList.toggle('active', (isNaN(s.aspectRatio) && btn.dataset.ratio === 'NaN') || (parseFloat(btn.dataset.ratio) === s.aspectRatio)));
    filterBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === s.filter));
}

function updateUIValues() {
    rangeBrightness.closest('.slider-item').querySelector('.val').textContent = rangeBrightness.value;
    rangeContrast.closest('.slider-item').querySelector('.val').textContent = rangeContrast.value;
    rangeSaturation.closest('.slider-item').querySelector('.val').textContent = rangeSaturation.value;
}

function saveHistory() {
    const item = images[currentIndex];
    if (!item) return;
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

// --- Listeners ---
[rangeBrightness, rangeContrast, rangeSaturation].forEach(el => {
    el.addEventListener('change', () => saveHistory());
    el.addEventListener('input', () => {
        const s = images[currentIndex].state;
        s.brightness = rangeBrightness.value; s.contrast = rangeContrast.value; s.saturation = rangeSaturation.value;
        updateUIValues();
        renderToCanvas();
    });
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        saveHistory();
        images[currentIndex].state.filter = btn.dataset.filter;
        filterBtns.forEach(b => b.classList.toggle('active', b === btn));
        renderToCanvas();
    });
});

ratioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        saveHistory();
        images[currentIndex].state.aspectRatio = parseFloat(btn.dataset.ratio);
        cropper.setAspectRatio(images[currentIndex].state.aspectRatio);
        ratioBtns.forEach(b => b.classList.toggle('active', b === btn));
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
    initEditor(images[currentIndex].state);
});

btnUndo.addEventListener('click', () => {
    const item = images[currentIndex];
    if (item.undoStack.length === 0) return;
    const current = JSON.parse(JSON.stringify(item.state));
    if (cropper) current.cropData = cropper.getData();
    item.redoStack.push(current);
    const prevState = item.undoStack.pop();
    images[currentIndex].state = prevState;
    initEditor(prevState);
});

btnRedo.addEventListener('click', () => {
    const item = images[currentIndex];
    if (item.redoStack.length === 0) return;
    const current = JSON.parse(JSON.stringify(item.state));
    if (cropper) current.cropData = cropper.getData();
    item.undoStack.push(current);
    const nextState = item.redoStack.pop();
    images[currentIndex].state = nextState;
    initEditor(nextState);
});

btnCompare.addEventListener('mousedown', () => { isComparing = true; btnCompare.classList.add('active'); renderToCanvas(); });
btnCompare.addEventListener('mouseup', () => { isComparing = false; btnCompare.classList.remove('active'); renderToCanvas(); });
btnCompare.addEventListener('mouseleave', () => { if (isComparing) { isComparing = false; btnCompare.classList.remove('active'); renderToCanvas(); } });
btnZoomIn.addEventListener('click', () => cropper.zoom(0.1));
btnZoomOut.addEventListener('click', () => cropper.zoom(-0.1));
btnZoomReset.addEventListener('click', () => cropper.reset());
btnRotate.addEventListener('click', () => { saveHistory(); cropper.rotate(90); });
btnFlipH.addEventListener('click', () => { saveHistory(); cropper.scaleX(cropper.getData().scaleX * -1); });
btnFlipV.addEventListener('click', () => { saveHistory(); cropper.scaleY(cropper.getData().scaleY * -1); });

btnReset.addEventListener('click', () => { if (currentIndex !== -1) { saveHistory(); images[currentIndex].state = { filter: 'none', brightness: 100, contrast: 100, saturation: 100, aspectRatio: NaN, cropData: null }; initEditor(images[currentIndex].state); } });

exportFormat.addEventListener('change', () => { qualityContainer.classList.toggle('hidden', !(exportFormat.value === 'image/jpeg' || exportFormat.value === 'image/webp')); });
rangeQuality.addEventListener('input', () => { rangeQuality.closest('.slider-item').querySelector('.val').textContent = rangeQuality.value + '%'; });

async function getFinalCanvas(imgItem) {
    const s = imgItem.state;
    let cropData = (imgItem === images[currentIndex] && cropper) ? cropper.getData() : s.cropData;
    if (!cropData) cropData = { x: 0, y: 0, width: imgItem.img.width, height: imgItem.img.height };
    const drawCanvas = document.createElement('canvas');
    drawCanvas.width = cropData.width; drawCanvas.height = cropData.height;
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
    btnDownloadAll.innerHTML = `<i data-lucide="download"></i> <span data-i18n="download-all">Download All</span>`;
    if (window.lucide) lucide.createIcons();
    if (window.updateContent) window.updateContent();
});
