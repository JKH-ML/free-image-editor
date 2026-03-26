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

const btnRotate = document.getElementById('btn-rotate');
const btnFlipH = document.getElementById('btn-flip-h');
const btnFlipV = document.getElementById('btn-flip-v');

const rangeBrightness = document.getElementById('range-brightness');
const rangeContrast = document.getElementById('range-contrast');
const rangeSaturation = document.getElementById('range-saturation');

let originalImage = null;
let state = {
    filter: 'none',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    rotation: 0,
    flipH: 1,
    flipV: 1
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
            resetState();
            inputWidth.value = img.width;
            inputHeight.value = img.height;
            renderCanvas();
            uploadSection.classList.add('hidden');
            editorSection.classList.remove('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function resetState() {
    state = { filter: 'none', brightness: 100, contrast: 100, saturation: 100, rotation: 0, flipH: 1, flipV: 1 };
    rangeBrightness.value = 100;
    rangeContrast.value = 100;
    rangeSaturation.value = 100;
}

function renderCanvas() {
    if (!originalImage) return;

    const w = parseInt(inputWidth.value) || originalImage.width;
    const h = parseInt(inputHeight.value) || originalImage.height;

    // Handle rotation dimensions
    const isRotated = (state.rotation / 90) % 2 !== 0;
    canvas.width = isRotated ? h : w;
    canvas.height = isRotated ? w : h;

    ctx.save();
    
    // Move to center for transformations
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((state.rotation * Math.PI) / 180);
    ctx.scale(state.flipH, state.flipV);
    
    // Filters
    const filters = [
        getCanvasFilter(state.filter),
        `brightness(${state.brightness}%)`,
        `contrast(${state.contrast}%)`,
        `saturate(${state.saturation}%)`
    ].join(' ');
    
    ctx.filter = filters;
    ctx.drawImage(originalImage, -w / 2, -h / 2, w, h);
    
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

// Event Listeners
[inputWidth, inputHeight, rangeBrightness, rangeContrast, rangeSaturation].forEach(el => {
    el.addEventListener('input', () => {
        state.brightness = rangeBrightness.value;
        state.contrast = rangeContrast.value;
        state.saturation = rangeSaturation.value;
        renderCanvas();
    });
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        state.filter = btn.getAttribute('data-filter');
        renderCanvas();
    });
});

btnRotate.addEventListener('click', () => { state.rotation = (state.rotation + 90) % 360; renderCanvas(); });
btnFlipH.addEventListener('click', () => { state.flipH *= -1; renderCanvas(); });
btnFlipV.addEventListener('click', () => { state.flipV *= -1; renderCanvas(); });

btnReset.addEventListener('click', () => {
    if (!originalImage) return;
    resetState();
    inputWidth.value = originalImage.width;
    inputHeight.value = originalImage.height;
    renderCanvas();
});

exportFormat.addEventListener('change', () => {
    const format = exportFormat.value;
    if (format === 'image/jpeg' || format === 'image/webp') {
        qualityContainer.classList.remove('hidden');
    } else {
        qualityContainer.classList.add('hidden');
    }
});

btnDownload.addEventListener('click', () => {
    const format = exportFormat.value;
    const quality = parseInt(rangeQuality.value) / 100;
    
    if (format === 'image/gif') {
        alert('GIF export requires additional processing. Standard image formats (PNG, JPG, WebP) are fully supported.');
        return;
    }

    const link = document.createElement('a');
    link.download = `image-cut-${Date.now()}.${format.split('/')[1]}`;
    link.href = canvas.toDataURL(format, quality);
    link.click();
});
