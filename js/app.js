const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const editorSection = document.getElementById('editor-section');
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');

const inputWidth = document.getElementById('input-width');
const inputHeight = document.getElementById('input-height');
const exportFormat = document.getElementById('export-format');
const qualityContainer = document.getElementById('quality-container');
const rangeQuality = document.getElementById('range-quality');
const btnDownload = document.getElementById('btn-download');
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

let originalImage = null;
let cropper = null;
let state = {
    filter: 'none',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    aspectRatio: NaN,
    cropData: null
};

let undoStack = [];
let redoStack = [];

// Handle Upload
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImage(file);
});
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadImage(file);
});

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            undoStack = [];
            redoStack = [];
            initEditor();
            uploadSection.classList.add('hidden');
            editorSection.classList.remove('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function initEditor(savedState = null) {
    if (cropper) cropper.destroy();
    
    if (savedState) {
        state = JSON.parse(JSON.stringify(savedState));
    } else {
        resetState();
    }
    
    updateUIFromState();

    const tempImg = new Image();
    tempImg.src = originalImage.src;
    tempImg.id = 'cropper-target';
    
    const container = document.querySelector('.canvas-container');
    container.innerHTML = '';
    container.appendChild(tempImg);

    cropper = new Cropper(tempImg, {
        aspectRatio: state.aspectRatio,
        viewMode: 1,
        autoCropArea: 1,
        data: state.cropData,
        ready() {
            renderToCanvas();
        },
        cropend() {
            saveHistory();
            renderToCanvas();
        },
        zoom() {
            renderToCanvas();
        }
    });
}

function resetState() {
    state = { filter: 'none', brightness: 100, contrast: 100, saturation: 100, aspectRatio: NaN, cropData: null };
}

function updateUIFromState() {
    rangeBrightness.value = state.brightness;
    rangeContrast.value = state.contrast;
    rangeSaturation.value = state.saturation;
    ratioBtns.forEach(btn => btn.classList.toggle('active', 
        (isNaN(state.aspectRatio) && btn.dataset.ratio === 'NaN') || 
        (parseFloat(btn.dataset.ratio) === state.aspectRatio)
    ));
    updateHistoryButtons();
}

function saveHistory() {
    const currentState = JSON.parse(JSON.stringify(state));
    if (cropper) currentState.cropData = cropper.getData();
    
    // Prevent saving identical states back-to-back
    if (undoStack.length > 0) {
        const last = undoStack[undoStack.length - 1];
        if (JSON.stringify(last) === JSON.stringify(currentState)) return;
    }

    undoStack.push(currentState);
    redoStack = []; // Clear redo when new action occurs
    updateHistoryButtons();
}

function updateHistoryButtons() {
    btnUndo.disabled = undoStack.length === 0;
    btnRedo.disabled = redoStack.length === 0;
}

function renderToCanvas() {
    if (!cropper) return;

    const croppedCanvas = cropper.getCroppedCanvas();
    if (!croppedCanvas) return;

    const w = parseInt(inputWidth.value) || croppedCanvas.width;
    const h = parseInt(inputHeight.value) || croppedCanvas.height;

    canvas.width = w;
    canvas.height = h;

    ctx.save();
    const filters = [
        getCanvasFilter(state.filter),
        `brightness(${state.brightness}%)`,
        `contrast(${state.contrast}%)`,
        `saturate(${state.saturation}%)`
    ].join(' ');
    
    ctx.filter = filters;
    ctx.drawImage(croppedCanvas, 0, 0, w, h);
    ctx.restore();
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

// History Controls
btnUndo.addEventListener('click', () => {
    if (undoStack.length === 0) return;
    
    const current = JSON.parse(JSON.stringify(state));
    if (cropper) current.cropData = cropper.getData();
    redoStack.push(current);

    const prevState = undoStack.pop();
    applyState(prevState);
});

btnRedo.addEventListener('click', () => {
    if (redoStack.length === 0) return;

    const current = JSON.parse(JSON.stringify(state));
    if (cropper) current.cropData = cropper.getData();
    undoStack.push(current);

    const nextState = redoStack.pop();
    applyState(nextState);
});

function applyState(targetState) {
    state = JSON.parse(JSON.stringify(targetState));
    updateUIFromState();
    if (cropper) {
        cropper.setAspectRatio(state.aspectRatio);
        cropper.setData(state.cropData);
    }
    renderToCanvas();
}

// Controls listeners
[rangeBrightness, rangeContrast, rangeSaturation].forEach(el => {
    el.addEventListener('change', () => {
        saveHistory();
    });
    el.addEventListener('input', () => {
        state.brightness = rangeBrightness.value;
        state.contrast = rangeContrast.value;
        state.saturation = rangeSaturation.value;
        renderToCanvas();
    });
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        saveHistory();
        state.filter = btn.getAttribute('data-filter');
        renderToCanvas();
    });
});

ratioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        saveHistory();
        ratioBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.aspectRatio = parseFloat(btn.dataset.ratio);
        cropper.setAspectRatio(state.aspectRatio);
    });
});

btnRotate.addEventListener('click', () => { saveHistory(); cropper.rotate(90); renderToCanvas(); });
btnFlipH.addEventListener('click', () => { saveHistory(); cropper.scaleX(cropper.getData().scaleX * -1); renderToCanvas(); });
btnFlipV.addEventListener('click', () => { saveHistory(); cropper.scaleY(cropper.getData().scaleY * -1); renderToCanvas(); });

btnReset.addEventListener('click', () => {
    if (!originalImage) return;
    saveHistory();
    initEditor();
});

exportFormat.addEventListener('change', () => {
    const format = exportFormat.value;
    qualityContainer.classList.toggle('hidden', !(format === 'image/jpeg' || format === 'image/webp'));
});

btnDownload.addEventListener('click', () => {
    const format = exportFormat.value;
    const quality = parseInt(rangeQuality.value) / 100;
    
    if (format === 'image/gif') {
        alert('GIF export requires additional processing. Standard image formats (PNG, JPG, WebP) are fully supported.');
        return;
    }

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const finalCtx = finalCanvas.getContext('2d');
    finalCtx.filter = ctx.filter;
    finalCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `image-cut-${Date.now()}.${format.split('/')[1]}`;
    link.href = finalCanvas.toDataURL(format, quality);
    link.click();
});
