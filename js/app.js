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

let originalImage = null;
let cropper = null;
let state = {
    filter: 'none',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    rotation: 0,
    flipH: 1,
    flipV: 1,
    aspectRatio: NaN
};

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
            initEditor();
            uploadSection.classList.add('hidden');
            editorSection.classList.remove('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function initEditor() {
    if (cropper) cropper.destroy();
    resetState();
    
    // Set initial size
    inputWidth.value = originalImage.width;
    inputHeight.value = originalImage.height;

    // Use a temporary image for Cropper to avoid canvas conflicts
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
        ready() {
            renderToCanvas();
        },
        cropend() {
            renderToCanvas();
        },
        zoom() {
            renderToCanvas();
        }
    });
}

function resetState() {
    state = { filter: 'none', brightness: 100, contrast: 100, saturation: 100, rotation: 0, flipH: 1, flipV: 1, aspectRatio: NaN };
    rangeBrightness.value = 100;
    rangeContrast.value = 100;
    rangeSaturation.value = 100;
    ratioBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.ratio === 'NaN'));
}

function renderToCanvas() {
    if (!cropper) return;

    const croppedCanvas = cropper.getCroppedCanvas();
    const w = parseInt(inputWidth.value) || croppedCanvas.width;
    const h = parseInt(inputHeight.value) || croppedCanvas.height;

    canvas.width = w;
    canvas.height = h;

    ctx.save();
    
    // Filters & Adjustments
    const filters = [
        getCanvasFilter(state.filter),
        `brightness(${state.brightness}%)`,
        `contrast(${state.contrast}%)`,
        `saturate(${state.saturation}%)`
    ].join(' ');
    
    ctx.filter = filters;
    
    // Draw cropped content
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

// Controls
[inputWidth, inputHeight, rangeBrightness, rangeContrast, rangeSaturation].forEach(el => {
    el.addEventListener('input', () => {
        state.brightness = rangeBrightness.value;
        state.contrast = rangeContrast.value;
        state.saturation = rangeSaturation.value;
        renderToCanvas();
    });
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        state.filter = btn.getAttribute('data-filter');
        renderToCanvas();
    });
});

ratioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        ratioBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.aspectRatio = parseFloat(btn.dataset.ratio);
        cropper.setAspectRatio(state.aspectRatio);
    });
});

btnRotate.addEventListener('click', () => { cropper.rotate(90); renderToCanvas(); });
btnFlipH.addEventListener('click', () => { cropper.scaleX(cropper.getData().scaleX * -1); renderToCanvas(); });
btnFlipV.addEventListener('click', () => { cropper.scaleY(cropper.getData().scaleY * -1); renderToCanvas(); });

btnReset.addEventListener('click', () => {
    if (!originalImage) return;
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

    // Create a final canvas that applies all effects to the cropped area
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
