const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const editorSection = document.getElementById('editor-section');
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');

const inputWidth = document.getElementById('input-width');
const inputHeight = document.getElementById('input-height');
const exportFormat = document.getElementById('export-format');
const btnDownload = document.getElementById('btn-download');
const btnReset = document.getElementById('btn-reset');
const filterBtns = document.querySelectorAll('.filter-btn');

let originalImage = null;
let currentFilter = 'none';

// Handle Upload
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
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

function renderCanvas() {
    if (!originalImage) return;

    const targetWidth = parseInt(inputWidth.value) || originalImage.width;
    const targetHeight = parseInt(inputHeight.value) || originalImage.height;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply Filter
    ctx.filter = getCanvasFilter(currentFilter);
    ctx.drawImage(originalImage, 0, 0, targetWidth, targetHeight);
}

function getCanvasFilter(filter) {
    switch (filter) {
        case 'grayscale': return 'grayscale(100%)';
        case 'sepia': return 'sepia(100%)';
        case 'invert': return 'invert(100%)';
        default: return 'none';
    }
}

// Controls
inputWidth.addEventListener('input', renderCanvas);
inputHeight.addEventListener('input', renderCanvas);

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentFilter = btn.getAttribute('data-filter');
        renderCanvas();
    });
});

btnReset.addEventListener('click', () => {
    currentFilter = 'none';
    inputWidth.value = originalImage.width;
    inputHeight.value = originalImage.height;
    renderCanvas();
});

// Download
btnDownload.addEventListener('click', () => {
    const format = exportFormat.value;
    const quality = 0.9;
    
    if (format === 'image/gif') {
        alert('GIF export requires additional processing. Standard image formats (PNG, JPG, WebP) are fully supported.');
        // In a real scenario, you'd use FFmpeg.wasm or gif.js here.
        return;
    }

    const link = document.createElement('a');
    link.download = `image-cut-${Date.now()}.${format.split('/')[1]}`;
    link.href = canvas.toDataURL(format, quality);
    link.click();
});
