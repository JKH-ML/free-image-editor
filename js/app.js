const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const editorSection = document.getElementById('editor-section');
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const thumbnailList = document.getElementById('thumbnail-list');
const btnAddMore = document.getElementById('btn-add-more');

const inputWidth = document.getElementById('input-width');
const inputHeight = document.getElementById('input-height');
const exportFormat = document.getElementById('export-format');
const qualityContainer = document.getElementById('quality-container');
const rangeQuality = document.getElementById('range-quality');
const btnDownload = document.getElementById('btn-download');
const btnDownloadAll = document.getElementById('btn-download-all');
const btnReset = document.getElementById('btn-reset');
const filterBtns = document.querySelectorAll('.filter-btn');
const ratioBtns = document.querySelectorAll('.ratio-btn');

const btnRotate = document.getElementById('btn-rotate');
const btnFlipH = document.getElementById('btn-flip-h');
const btnFlipV = document.getElementById('btn-flip-v');

const rangeBrightness = document.getElementById('range-brightness');
const rangeContrast = document.getElementById('range-contrast');
const rangeSaturation = document.getElementById('range-saturation');

const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');

const btnCompare = document.getElementById('btn-compare');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnZoomReset = document.getElementById('btn-zoom-reset');

const btnCopySettings = document.getElementById('btn-copy-settings');
const btnPasteSettings = document.getElementById('btn-paste-settings');

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
    return {
        filter: 'none',
        brightness: 100,
        contrast: 100,
        saturation: 100,
        aspectRatio: NaN,
        cropData: null
    };
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
    ratioBtns.forEach(btn => btn.classList.toggle('active', 
        (isNaN(s.aspectRatio) && btn.dataset.ratio === 'NaN') || 
        (parseFloat(btn.dataset.ratio) === s.aspectRatio)
    ));
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

    const w = parseInt(inputWidth.value) || croppedCanvas.width;
    const h = parseInt(inputHeight.value) || croppedCanvas.height;
    canvas.width = w;
    canvas.height = h;

    ctx.save();
    if (!isComparing) {
        const s = images[currentIndex].state;
        ctx.filter = [getCanvasFilter(s.filter), `brightness(${s.brightness}%)`, `contrast(${s.contrast}%)`, `saturate(${s.saturation}%)`].join(' ');
    }
    ctx.drawImage(croppedCanvas, 0, 0, w, h);
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

// Settings Copy/Paste
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

// Compare & Zoom Controls
btnCompare.addEventListener('mousedown', () => { isComparing = true; btnCompare.classList.add('active'); renderToCanvas(); });
btnCompare.addEventListener('mouseup', () => { isComparing = false; btnCompare.classList.remove('active'); renderToCanvas(); });
btnCompare.addEventListener('mouseleave', () => { if (isComparing) { isComparing = false; btnCompare.classList.remove('active'); renderToCanvas(); } });
btnZoomIn.addEventListener('click', () => { cropper.zoom(0.1); renderToCanvas(); });
btnZoomOut.addEventListener('click', () => { cropper.zoom(-0.1); renderToCanvas(); });
btnZoomReset.addEventListener('click', () => { cropper.reset(); renderToCanvas(); });

// History Controls
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
    if (cropper) { cropper.setAspectRatio(images[currentIndex].state.aspectRatio); cropper.setData(images[currentIndex].state.cropData); }
    renderToCanvas();
}

// Listeners
[rangeBrightness, rangeContrast, rangeSaturation].forEach(el => {
    el.addEventListener('change', () => saveHistory());
    el.addEventListener('input', () => {
        const s = images[currentIndex].state;
        s.brightness = rangeBrightness.value;
        s.contrast = rangeContrast.value;
        s.saturation = rangeSaturation.value;
        renderToCanvas();
    });
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        saveHistory();
        images[currentIndex].state.filter = btn.getAttribute('data-filter');
        renderToCanvas();
    });
});

ratioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        saveHistory();
        ratioBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        images[currentIndex].state.aspectRatio = parseFloat(btn.dataset.ratio);
        cropper.setAspectRatio(images[currentIndex].state.aspectRatio);
    });
});

btnRotate.addEventListener('click', () => { saveHistory(); cropper.rotate(90); renderToCanvas(); });
btnFlipH.addEventListener('click', () => { saveHistory(); cropper.scaleX(cropper.getData().scaleX * -1); renderToCanvas(); });
btnFlipV.addEventListener('click', () => { saveHistory(); cropper.scaleY(cropper.getData().scaleY * -1); renderToCanvas(); });

btnReset.addEventListener('click', () => { if (currentIndex !== -1) { saveHistory(); initEditor(getDefaultState()); } });

exportFormat.addEventListener('change', () => {
    const format = exportFormat.value;
    qualityContainer.classList.toggle('hidden', !(format === 'image/jpeg' || format === 'image/webp'));
});

// Download Logics
function getFinalCanvas(imgItem) {
    return new Promise((resolve) => {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        const s = imgItem.state;
        
        // If it's current image, use live cropper data
        let cropData = s.cropData;
        if (imgItem === images[currentIndex] && cropper) {
            cropData = cropper.getData();
        }

        if (!cropData) {
            // Default: full image if no crop data
            cropData = { x: 0, y: 0, width: imgItem.img.width, height: imgItem.img.height, rotate: 0, scaleX: 1, scaleY: 1 };
        }

        // We need to create a temporary cropper or manual canvas transformation for non-current images
        // To keep it simple and accurate, we use a hidden canvas approach
        const drawCanvas = document.createElement('canvas');
        drawCanvas.width = cropData.width;
        drawCanvas.height = cropData.height;
        const dCtx = drawCanvas.getContext('2d');

        // Apply filters
        dCtx.filter = [getCanvasFilter(s.filter), `brightness(${s.brightness}%)`, `contrast(${s.contrast}%)`, `saturate(${s.saturation}%)`].join(' ');
        
        // Manual crop & transformation
        dCtx.save();
        // Simplified: just draw the cropped part for background images
        dCtx.drawImage(imgItem.img, cropData.x, cropData.y, cropData.width, cropData.height, 0, 0, cropData.width, cropData.height);
        dCtx.restore();
        
        resolve(drawCanvas);
    });
}

btnDownload.addEventListener('click', async () => {
    const format = exportFormat.value;
    const quality = parseInt(rangeQuality.value) / 100;
    if (format === 'image/gif') { alert('GIF export requires additional processing.'); return; }

    const finalCanvas = await getFinalCanvas(images[currentIndex]);
    const link = document.createElement('a');
    link.download = `image-cut-${Date.now()}.${format.split('/')[1]}`;
    link.href = finalCanvas.toDataURL(format, quality);
    link.click();
});

btnDownloadAll.addEventListener('click', async () => {
    if (images.length === 0) return;
    
    const zip = new JSZip();
    const format = exportFormat.value;
    const ext = format.split('/')[1];
    const quality = parseInt(rangeQuality.value) / 100;
    
    btnDownloadAll.disabled = true;
    const originalText = btnDownloadAll.innerText;
    btnDownloadAll.innerText = 'Processing...';

    for (let i = 0; i < images.length; i++) {
        const finalCanvas = await getFinalCanvas(images[i]);
        const dataUrl = finalCanvas.toDataURL(format, quality);
        const base64Data = dataUrl.split(',')[1];
        zip.file(`image-${i+1}.${ext}`, base64Data, {base64: true});
    }

    const content = await zip.generateAsync({type: "blob"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `image-cut-all-${Date.now()}.zip`;
    link.click();

    btnDownloadAll.disabled = false;
    btnDownloadAll.innerText = originalText;
});
