document.addEventListener('DOMContentLoaded', () => {
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    const MAX_FILES = 5; // 最多同时处理5张图片
    const SUPPORTED_TYPES = {
        'image/jpeg': 'JPG',
        'image/png': 'PNG',
        'image/webp': 'WebP'
    };
    
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');

    // 存储原始图片数据
    const originalImages = new Map();

    // 点击上传区域触发文件选择
    dropZone.addEventListener('click', () => fileInput.click());

    // 处理文件拖放
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#007AFF';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#DEDEDE';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#DEDEDE';
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });

    // 处理文件选择
    fileInput.addEventListener('change', (e) => {
        handleFiles(Array.from(e.target.files));
    });

    // 处理质量滑块变化
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = `${e.target.value}%`;
        // 使用原始图片重新压缩
        const previews = document.querySelectorAll('.preview-group');
        previews.forEach(container => {
            const imageId = container.dataset.imageId;
            const originalImage = originalImages.get(imageId);
            if (originalImage) {
                compressImage(originalImage, container);
            }
        });
    });

    // 处理多文件上传
    function handleFiles(files) {
        // 过滤无效文件
        const validFiles = Array.from(files).filter(file => {
            if (!SUPPORTED_TYPES[file.type]) {
                alert(`不支持的文件格式: ${file.name}\n请使用 ${Object.values(SUPPORTED_TYPES).join('/')} 格式的图片`);
                return false;
            }
            if (file.size > MAX_FILE_SIZE) {
                alert(`文件过大: ${file.name} (最大支持20MB)`);
                return false;
            }
            return true;
        });

        if (validFiles.length > MAX_FILES) {
            alert(`一次最多只能处理 ${MAX_FILES} 张图片`);
            return;
        }

        if (validFiles.length > 0) {
            clearPreviews();
            validFiles.forEach(processFile);
        }
    }

    // 处理单个文件
    function processFile(file) {
        const reader = new FileReader();
        const previewContainer = createPreviewContainer(file.name);
        const imageId = Date.now().toString();
        previewContainer.dataset.imageId = imageId;
        
        const previewBox = previewContainer.querySelector('.preview-box');
        previewBox.classList.add('loading');
        
        reader.onload = (e) => {
            const image = new Image();
            image.src = e.target.result;
            image.onload = () => {
                previewBox.classList.remove('loading');
                // 存储原始图片
                originalImages.set(imageId, image);
                // 显示原始图片
                previewContainer.querySelector('.original-preview').src = image.src;
                previewContainer.querySelector('.original-size').textContent = formatFileSize(file.size);
                // 压缩图片
                compressImage(image, previewContainer);
            };
            image.onerror = () => {
                previewBox.classList.remove('loading');
                alert('图片加载失败，请重试');
            };
        };
        reader.onerror = () => {
            previewBox.classList.remove('loading');
            alert('文件读取失败，请重试');
        };
        reader.readAsDataURL(file);
    }

    // 创建预览容器
    function createPreviewContainer(filename) {
        const container = document.createElement('div');
        container.className = 'preview-group';
        container.innerHTML = `
            <h4>${filename}</h4>
            <div class="preview-box-container">
                <div class="preview-box">
                    <h3>原始图片</h3>
                    <img class="original-preview" alt="原始图片预览">
                    <div class="file-info">
                        <span>文件大小：</span>
                        <span class="original-size">-</span>
                    </div>
                </div>
                <div class="preview-box">
                    <h3>压缩后</h3>
                    <img class="compressed-preview" alt="压缩后预览">
                    <div class="file-info">
                        <span>文件大小：</span>
                        <span class="compressed-size">-</span>
                    </div>
                    <button class="download-btn" disabled>下载压缩后的图片</button>
                </div>
            </div>
        `;
        document.querySelector('.preview-container').appendChild(container);
        return container;
    }

    // 压缩图片
    function compressImage(image, container) {
        try {
            const previewBox = container.querySelector('.preview-box');
            previewBox.classList.add('loading');

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // 计算压缩后的尺寸
            let { width, height } = calculateDimensions(image.width, image.height);

            canvas.width = width;
            canvas.height = height;

            // 优化图像渲染
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(image, 0, 0, width, height);

            const quality = qualitySlider.value / 100;
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

            updatePreview(container, compressedDataUrl);

            previewBox.classList.remove('loading');
        } catch (error) {
            console.error('压缩失败:', error);
            container.querySelector('.preview-box').classList.remove('loading');
            alert('图片压缩失败，请重试');
        }
    }

    // 添加辅助函数
    function calculateDimensions(width, height) {
        const maxDimension = 1920;
        
        if (width <= maxDimension && height <= maxDimension) {
            return { width, height };
        }

        if (width > height) {
            height = Math.round((height / width) * maxDimension);
            width = maxDimension;
        } else {
            width = Math.round((width / height) * maxDimension);
            height = maxDimension;
        }

        return { width, height };
    }

    function updatePreview(container, dataUrl) {
        const compressedPreview = container.querySelector('.compressed-preview');
        const compressedSize = container.querySelector('.compressed-size');
        const downloadBtn = container.querySelector('.download-btn');

        compressedPreview.src = dataUrl;
        
        const base64Length = dataUrl.length - 'data:image/jpeg;base64,'.length;
        const compressedBytes = base64Length * 0.75;
        compressedSize.textContent = formatFileSize(compressedBytes);

        downloadBtn.disabled = false;
        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            const originalFileName = container.querySelector('h4').textContent;
            const extension = '.jpg';
            const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
            const newFileName = `${originalFileName.replace(/\.[^/.]+$/, '')}_compressed_${timestamp}${extension}`;
            link.download = newFileName;
            link.href = dataUrl;
            link.click();
        };
    }

    // 清空预览区域
    function clearPreviews() {
        document.querySelector('.preview-container').innerHTML = '';
        originalImages.clear();
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    // 添加错误处理
    window.addEventListener('error', (e) => {
        console.error('全局错误:', e.error);
        alert('发生错误，请刷新页面重试');
    });
}); 