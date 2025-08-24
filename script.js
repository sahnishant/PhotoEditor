window.onload = () => {
    // === DOM ELEMENT REFERENCES ===
    const imageLoader = document.getElementById('imageLoader');
    const originalCanvas = document.getElementById('originalCanvas');
    const transformedCanvas = document.getElementById('transformedCanvas');
    const explanationBox = document.getElementById('explanationBox');
    const zoomCanvas = document.getElementById('zoomCanvas');
    const pixelInfo = document.getElementById('pixelInfo');

    // Contexts for canvases
    const originalCtx = originalCanvas.getContext('2d');
    const transformedCtx = transformedCanvas.getContext('2d');
    const zoomCtx = zoomCanvas.getContext('2d');

    // All control elements
    const controls = {
        resetBtn: document.getElementById('resetBtn'),
        grayscaleBtn: document.getElementById('grayscaleBtn'),
        invertBtn: document.getElementById('invertBtn'),
        brightnessSlider: document.getElementById('brightnessSlider'),
        brightnessValue: document.getElementById('brightnessValue'),
        contrastSlider: document.getElementById('contrastSlider'),
        contrastValue: document.getElementById('contrastValue'),
        thresholdSlider: document.getElementById('thresholdSlider'),
        thresholdValue: document.getElementById('thresholdValue'),
        thresholdBtn: document.getElementById('thresholdBtn'),
        redChannelBtn: document.getElementById('redChannelBtn'),
        greenChannelBtn: document.getElementById('greenChannelBtn'),
        blueChannelBtn: document.getElementById('blueChannelBtn'),
        blurBtn: document.getElementById('blurBtn'),
        sharpenBtn: document.getElementById('sharpenBtn'),
        edgeLeftBtn: document.getElementById('edgeLeftBtn'),
        edgeTopBtn: document.getElementById('edgeTopBtn'),
        edgeBothBtn: document.getElementById('edgeBothBtn'),
        downscaleSlider: document.getElementById('downscaleSlider'),
        downscaleValue: document.getElementById('downscaleValue'),
        downscaleBtn: document.getElementById('downscaleBtn'),
        rotateSlider: document.getElementById('rotateSlider'),
        rotateValue: document.getElementById('rotateValue'),
        rotateBtn: document.getElementById('rotateBtn'),
        flipHBtn: document.getElementById('flipHBtn'),
        flipVBtn: document.getElementById('flipVBtn'),
        analyzeBtn: document.getElementById('analyzeBtn')
    };

    let originalImage = null;
    let uploadedFile = null;
    let lastInspectedPixel = { x: 5, y: 5 };
    let controlElements = document.querySelectorAll('.control-btn, .control-btn-small, .slider');

    // === EXPLANATION TEXTS ===
    const explanations = {
        grayscale: `<h3>Grayscaling</h3><p>Grayscaling converts a color image to shades of gray. Instead of a simple average, we use a weighted average that accounts for human perception—our eyes are most sensitive to green. The formula is:</p><p>$$ Gray = 0.299 \\times R + 0.587 \\times G + 0.114 \\times B $$</p><p>This new 'Gray' value is then applied to the R, G, and B channels of each pixel.</p>`,
        invert: `<h3>Color Inversion (Negative)</h3><p>Inversion creates a negative of the image. Each color channel's value is subtracted from the maximum possible value (255). This makes bright areas dark and dark areas bright.</p><p>$$ R_{new} = 255 - R_{old} $$$$ G_{new} = 255 - G_{old} $$$$ B_{new} = 255 - B_{old} $$</p>`,
        brightness: `<h3>Brightness Adjustment</h3><p>This operation simply adds or subtracts a constant value to each color channel (R, G, B) of every pixel. Values are "clamped" to stay within the 0-255 range.</p><p>$$ C_{new} = C_{old} + \\text{value} $$</p>`,
        contrast: `<h3>Contrast Adjustment</h3><p>Contrast stretches or compresses the range of color values. We use a factor to scale the difference of each channel's value from the midpoint (128).</p><p>$$ C_{new} = \\text{Factor} \\times (C_{old} - 128) + 128 $$</p><p>A factor > 1 increases contrast, while a factor < 1 decreases it.</p>`,
        threshold: `<h3>Thresholding</h3><p>Thresholding is a simple way to create a binary (black and white) image. Each pixel's grayscale value is compared to a threshold value. If it's higher, the pixel becomes white; otherwise, it becomes black.</p><p>$$ Pixel_{new} = \\begin{cases} 255 & \\text{if } Gray(Pixel_{old}) > \\text{Threshold} \\\\ 0 & \\text{otherwise} \\end{cases} $$</p>`,
        channelSplit: `<h3>Channel Splitting</h3><p>A color image is composed of three channels: Red, Green, and Blue. This operation isolates one channel by setting the other two to zero for every pixel. For example, to isolate Red:</p><p>$$ Pixel_{new} = (R_{old}, 0, 0) $$</p>`,
        blur: `<h3>Smoothing (Box Blur)</h3><p>Blurring is achieved using a convolution kernel. A 3x3 kernel slides over each pixel, and the pixel's new value is the average of its own value and its 8 neighbors. This smooths out sharp edges.</p><p>Kernel: $$ \\frac{1}{9} \\begin{pmatrix} 1 & 1 & 1 \\\\ 1 & 1 & 1 \\\\ 1 & 1 & 1 \\end{pmatrix} $$</p>`,
        sharpen: `<h3>Sharpening</h3><p>Sharpening also uses a convolution kernel, but one designed to emphasize differences between a pixel and its neighbors. The central value is large, and surrounding values are negative, which amplifies the pixel's intensity relative to its local area.</p><p>Kernel: $$ \\begin{pmatrix} 0 & -1 & 0 \\\\ -1 & 5 & -1 \\\\ 0 & -1 & 0 \\end{pmatrix} $$</p>`,
        edge: `<h3>Edge Detection</h3><p>This process highlights sharp changes in intensity, which correspond to edges. <br><b>Left/Top:</b> A simple method is to find the difference between a pixel and its neighbor: $ C_{new} = |C_{(x,y)} - C_{(x-1,y)}| $. <br><b>Sobel:</b> A more robust method using two kernels to find the horizontal ($G_x$) and vertical ($G_y$) gradients. The final magnitude is $ G = \\sqrt{G_x^2 + G_y^2} $.</p>`,
        downscale: `<h3>Downscaling</h3><p>This reduces the image dimensions. The simplest method is 'Nearest Neighbor', where pixels are simply skipped. A better approach, used here, is to average the pixels in a block to create a single new pixel. This preserves more detail.</p>`,
        rotate: `<h3>Rotation</h3><p>Rotation transforms each pixel's coordinate $(x,y)$ to a new position $(x',y')$ using trigonometry. For a rotation by angle $ \\theta $ around the center $(c_x, c_y)$: </p><p>$$ x' = (x-c_x)\\cos(\\theta) - (y-c_y)\\sin(\\theta) + c_x $$$$ y' = (x-c_x)\\sin(\\theta) + (y-c_y)\\cos(\\theta) + c_y $$</p><p>Since this can create gaps, we perform a 'reverse' lookup from each target pixel to find its source color.</p>`,
        flip: `<h3>Flipping</h3><p>Flipping mirrors the image across an axis. For a horizontal flip, a pixel at coordinate $x$ is moved to $width - x$. For a vertical flip, a pixel at $y$ moves to $height - y$.</p><p>Horizontal: $$ x_{new} = \\text{width} - 1 - x_{old} $$</p>`
    };

    function updateExplanation(key) {
        explanationBox.innerHTML = explanations[key];
        MathJax.typeset(); // Re-render the formulas
        inspectPixel(); 
    }

    // === EVENT LISTENERS ===
    imageLoader.addEventListener('change', handleImageUpload);
    controlElements.forEach(el => {
        if (el.classList.contains('slider') && (el.id.includes('brightness') || el.id.includes('contrast'))) {
             el.addEventListener('input', handleLiveUpdate); // Real-time for simple filters
        }
    });

    originalCanvas.addEventListener('click', inspectPixel);

    function handleLiveUpdate(e) {
        // This is for sliders that can provide real-time feedback
        if (!originalImage) return;

        // Reset to original state before applying live effect
        transformedCtx.drawImage(originalImage, 0, 0, transformedCanvas.width, transformedCanvas.height);
        let pixels = getTransformedData();

        if (e.target.id === 'brightnessSlider') {
            const value = parseInt(e.target.value);
            controls.brightnessValue.textContent = value;
            applyBrightness(pixels, value);
            updateExplanation('brightness');
        } else if (e.target.id === 'contrastSlider') {
            const value = parseFloat(e.target.value);
            controls.contrastValue.textContent = value.toFixed(1);
            applyContrast(pixels, value);
            updateExplanation('contrast');
        }
        putTransformedData(pixels);
    }
    
    // Wire up buttons
    controls.resetBtn.addEventListener('click', resetImage);
    controls.grayscaleBtn.addEventListener('click', () => applyFilter(applyGrayscale, 'grayscale'));
    controls.invertBtn.addEventListener('click', () => applyFilter(applyInvert, 'invert'));
    controls.thresholdBtn.addEventListener('click', () => {
        const value = parseInt(controls.thresholdSlider.value);
        applyFilter(pixels => applyThreshold(pixels, value), 'threshold');
    });
    controls.redChannelBtn.addEventListener('click', () => applyFilter(pixels => applyChannel(pixels, 0), 'channelSplit'));
    controls.greenChannelBtn.addEventListener('click', () => applyFilter(pixels => applyChannel(pixels, 1), 'channelSplit'));
    controls.blueChannelBtn.addEventListener('click', () => applyFilter(pixels => applyChannel(pixels, 2), 'channelSplit'));
    controls.blurBtn.addEventListener('click', () => applyConvolution(getKernel('blur'), 'blur'));
    controls.sharpenBtn.addEventListener('click', () => applyConvolution(getKernel('sharpen'), 'sharpen'));
    controls.edgeLeftBtn.addEventListener('click', () => applyConvolution(getKernel('edgeLeft'), 'edge'));
    controls.edgeTopBtn.addEventListener('click', () => applyConvolution(getKernel('edgeTop'), 'edge'));
    controls.edgeBothBtn.addEventListener('click', () => applySobel('edge'));
    controls.downscaleBtn.addEventListener('click', applyDownscale);
    controls.rotateBtn.addEventListener('click', applyRotation);
    controls.flipHBtn.addEventListener('click', () => applyFilter(applyFlipHorizontal, 'flip'));
    controls.flipVBtn.addEventListener('click', () => applyFilter(applyFlipVertical, 'flip'));
    controls.analyzeBtn.addEventListener('click', analyzeJpeg);


    // Wire up slider value displays
    controls.brightnessSlider.addEventListener('input', e => controls.brightnessValue.textContent = e.target.value);
    controls.contrastSlider.addEventListener('input', e => controls.contrastValue.textContent = parseFloat(e.target.value).toFixed(1));
    controls.thresholdSlider.addEventListener('input', e => controls.thresholdValue.textContent = e.target.value);
    controls.downscaleSlider.addEventListener('input', e => controls.downscaleValue.textContent = e.target.value);
    controls.rotateSlider.addEventListener('input', e => controls.rotateValue.textContent = e.target.value);


    // === CORE FUNCTIONS ===
// Replace your existing handleImageUpload function with this one
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        uploadedFile = file; 
        const reader = new FileReader();
        reader.onload = (event) => {
            originalImage = new Image();
            originalImage.onload = () => {
                // Set canvas sizes to match image
                originalCanvas.width = transformedCanvas.width = originalImage.width;
                originalCanvas.height = transformedCanvas.height = originalImage.height;

                // Draw image on both canvases
                originalCtx.drawImage(originalImage, 0, 0);
                transformedCtx.drawImage(originalImage, 0, 0);
                
                // Enable controls
                controlElements.forEach(el => el.disabled = false);
                // Only enable analyze button for JPEGs
                controls.analyzeBtn.disabled = !file.type.includes('jpeg'); 
                explanationBox.innerHTML = "<p>Image loaded successfully! Select an operation or analyze the JPEG structure.</p>";
            };
            originalImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    
    function resetImage() {
        if (originalImage) {
            transformedCtx.drawImage(originalImage, 0, 0, originalImage.width, originalImage.height);
            explanationBox.innerHTML = "<p>Image has been reset to its original state.</p>";
        }
    }

    function getTransformedData() {
        return transformedCtx.getImageData(0, 0, transformedCanvas.width, transformedCanvas.height);
    }

    function putTransformedData(pixels) {
        transformedCtx.putImageData(pixels, 0, 0);
    }
    
    function applyFilter(filterFunction, explanationKey) {
        if (!originalImage) return;
        let pixels = getTransformedData();
        filterFunction(pixels);
        putTransformedData(pixels);
        updateExplanation(explanationKey);
    }

    // === PIXEL-LEVEL TRANSFORMATIONS ===

    function applyGrayscale(pixels) {
        for (let i = 0; i < pixels.data.length; i += 4) {
            const r = pixels.data[i];
            const g = pixels.data[i + 1];
            const b = pixels.data[i + 2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = gray;
        }
    }
    
    function applyInvert(pixels) {
        for (let i = 0; i < pixels.data.length; i += 4) {
            pixels.data[i] = 255 - pixels.data[i];     // R
            pixels.data[i + 1] = 255 - pixels.data[i + 1]; // G
            pixels.data[i + 2] = 255 - pixels.data[i + 2]; // B
        }
    }

    function applyBrightness(pixels, value) {
        for (let i = 0; i < pixels.data.length; i += 4) {
            pixels.data[i] = Math.max(0, Math.min(255, pixels.data[i] + value));
            pixels.data[i + 1] = Math.max(0, Math.min(255, pixels.data[i + 1] + value));
            pixels.data[i + 2] = Math.max(0, Math.min(255, pixels.data[i + 2] + value));
        }
    }

    function applyContrast(pixels, factor) {
        for (let i = 0; i < pixels.data.length; i += 4) {
            pixels.data[i] = Math.max(0, Math.min(255, factor * (pixels.data[i] - 128) + 128));
            pixels.data[i + 1] = Math.max(0, Math.min(255, factor * (pixels.data[i + 1] - 128) + 128));
            pixels.data[i + 2] = Math.max(0, Math.min(255, factor * (pixels.data[i + 2] - 128) + 128));
        }
    }
    
    function applyThreshold(pixels, threshold) {
        applyGrayscale(pixels); // Threshold works on grayscale
        for (let i = 0; i < pixels.data.length; i += 4) {
            const value = pixels.data[i] > threshold ? 255 : 0;
            pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
        }
    }

    function applyChannel(pixels, channel) { // 0 for R, 1 for G, 2 for B
        for (let i = 0; i < pixels.data.length; i += 4) {
            if (channel !== 0) pixels.data[i] = 0;
            if (channel !== 1) pixels.data[i + 1] = 0;
            if (channel !== 2) pixels.data[i + 2] = 0;
        }
    }
    
    function applyFlipHorizontal(pixels) {
        const w = pixels.width;
        const h = pixels.height;
        const data = pixels.data;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w / 2; x++) {
                const i1 = (y * w + x) * 4;
                const i2 = (y * w + (w - 1 - x)) * 4;
                for (let j = 0; j < 4; j++) {
                    [data[i1 + j], data[i2 + j]] = [data[i2 + j], data[i1 + j]];
                }
            }
        }
    }

    function applyFlipVertical(pixels) {
        const w = pixels.width;
        const h = pixels.height;
        const data = pixels.data;
        for (let y = 0; y < h / 2; y++) {
            for (let x = 0; x < w; x++) {
                const i1 = (y * w + x) * 4;
                const i2 = ((h - 1 - y) * w + x) * 4;
                for (let j = 0; j < 4; j++) {
                    [data[i1 + j], data[i2 + j]] = [data[i2 + j], data[i1 + j]];
                }
            }
        }
    }

    // === CONVOLUTION ===
    function getKernel(name) {
        const kernels = {
            blur: [[1/9, 1/9, 1/9], [1/9, 1/9, 1/9], [1/9, 1/9, 1/9]],
            sharpen: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
            edgeLeft: [[0, 0, 0], [1, -1, 0], [0, 0, 0]],
            edgeTop: [[0, 1, 0], [0, -1, 0], [0, 0, 0]],
            sobelX: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
            sobelY: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]
        };
        return kernels[name];
    }
    
    function applyConvolution(kernel, explanationKey) {
        if (!originalImage) return;
        const pixels = getTransformedData();
        const srcData = new Uint8ClampedArray(pixels.data); // Copy of original data
        const w = pixels.width;
        const h = pixels.height;

        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                let r = 0, g = 0, b = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const i = ((y + ky) * w + (x + kx)) * 4;
                        const weight = kernel[ky + 1][kx + 1];
                        r += srcData[i] * weight;
                        g += srcData[i + 1] * weight;
                        b += srcData[i + 2] * weight;
                    }
                }
                const outIndex = (y * w + x) * 4;
                pixels.data[outIndex] = r;
                pixels.data[outIndex + 1] = g;
                pixels.data[outIndex + 2] = b;
            }
        }
        putTransformedData(pixels);
        updateExplanation(explanationKey);
    }
    
    function applySobel(explanationKey) {
        if (!originalImage) return;
        let pixels = getTransformedData();
        applyGrayscale(pixels); // Sobel operates on grayscale
        const srcData = new Uint8ClampedArray(pixels.data);
        const w = pixels.width;
        const h = pixels.height;
        const kernelX = getKernel('sobelX');
        const kernelY = getKernel('sobelY');
        
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                let gx = 0, gy = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const i = ((y + ky) * w + (x + kx)) * 4;
                        const pixelVal = srcData[i];
                        gx += pixelVal * kernelX[ky + 1][kx + 1];
                        gy += pixelVal * kernelY[ky + 1][kx + 1];
                    }
                }
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const outIndex = (y * w + x) * 4;
                pixels.data[outIndex] = pixels.data[outIndex + 1] = pixels.data[outIndex + 2] = magnitude;
            }
        }
        putTransformedData(pixels);
        updateExplanation(explanationKey);
    }

    // === GEOMETRIC TRANSFORMATIONS ===
    
    function applyDownscale() {
        if (!originalImage) return;
        const scale = parseInt(controls.downscaleSlider.value) / 100;
        const newWidth = Math.floor(originalImage.width * scale);
        const newHeight = Math.floor(originalImage.height * scale);
        
        transformedCanvas.width = newWidth;
        transformedCanvas.height = newHeight;
        
        // Use canvas's built-in scaling which is high quality
        transformedCtx.drawImage(originalImage, 0, 0, newWidth, newHeight);
        updateExplanation('downscale');
    }
    
    function applyRotation() {
        if (!originalImage) return;
        const angle = parseInt(controls.rotateSlider.value) * (Math.PI / 180);
        const w = originalImage.width;
        const h = originalImage.height;

        // Create a temporary canvas to perform rotation
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = w;
        tempCanvas.height = h;

        // Translate to center, rotate, and translate back
        tempCtx.translate(w / 2, h / 2);
        tempCtx.rotate(angle);
        tempCtx.translate(-w / 2, -h / 2);
        tempCtx.drawImage(originalImage, 0, 0);

        // Copy back to the main transformed canvas
        transformedCanvas.width = w;
        transformedCanvas.height = h;
        transformedCtx.drawImage(tempCanvas, 0, 0);
        updateExplanation('rotate');
    }

    // === PIXEL INSPECTOR ===
        
    function inspectPixel(e) {
        if (!originalImage) return;

        if (e) { // If called by a mouse click event
            const rect = originalCanvas.getBoundingClientRect();
            const scaleX = originalCanvas.width / rect.width;
            const scaleY = originalCanvas.height / rect.height;
            lastInspectedPixel.x = Math.floor((e.clientX - rect.left) * scaleX);
            lastInspectedPixel.y = Math.floor((e.clientY - rect.top) * scaleY);
        }
        
        // Use the stored coordinates for the inspection
        const { x, y } = lastInspectedPixel;
        

        const pixelData = originalCtx.getImageData(x, y, 1, 1).data;
        const [r, g, b, a] = pixelData;
        let pixelInfoHtml = `
            <strong>Coords:</strong> (${x}, ${y})<br>
            <strong>Original RGB:</strong> (${r}, ${g}, ${b})
        `;
        
        const zoomSize = 9;
        const magnification = 10;
        
        zoomCanvas.width = zoomSize * magnification;
        zoomCanvas.height = zoomSize * magnification;
        zoomCtx.imageSmoothingEnabled = false;
        
        const halfZoom = Math.floor(zoomSize / 2);
        
        let originalGridHtml = '<div class="grid-wrapper"><strong>Original</strong><table class="rgb-grid">';
        let transformedGridHtml = '<div class="grid-wrapper"><strong>Transformed</strong><table class="rgb-grid">';

        // Check if transformed canvas has the same size before proceeding
        const canCompare = (originalCanvas.width === transformedCanvas.width && originalCanvas.height === transformedCanvas.height);
        if(canCompare){
            const transformedPixelData = transformedCtx.getImageData(x, y, 1, 1).data;
            pixelInfoHtml += `<br><strong>Transformed RGB:</strong> (${transformedPixelData[0]}, ${transformedPixelData[1]}, ${transformedPixelData[2]})`;
        }


        for (let i = 0; i < zoomSize; i++) {
            originalGridHtml += '<tr>';
            if(canCompare) transformedGridHtml += '<tr>';

            for (let j = 0; j < zoomSize; j++) {
                const sourceX = x - halfZoom + j;
                const sourceY = y - halfZoom + i;
                
                let originalColor = [220, 220, 220, 255]; // Default out-of-bounds color
                if (sourceX >= 0 && sourceX < originalCanvas.width && sourceY >= 0 && sourceY < originalCanvas.height) {
                    originalColor = originalCtx.getImageData(sourceX, sourceY, 1, 1).data;
                }
                
                zoomCtx.fillStyle = `rgba(${originalColor[0]}, ${originalColor[1]}, ${originalColor[2]}, ${originalColor[3] / 255})`;
                zoomCtx.fillRect(j * magnification, i * magnification, magnification, magnification);

                const isCenter = (i === halfZoom && j === halfZoom);
                const title = `(${sourceX}, ${sourceY})`;
                
                // Populate Original Grid
                originalGridHtml += `<td title="${title}" class="${isCenter ? 'center-pixel' : ''}">${originalColor[0]},${originalColor[1]},${originalColor[2]}</td>`;

                // Populate Transformed Grid (if possible)
                if (canCompare) {
                    let transformedColor = [220, 220, 220, 255];
                    if (sourceX >= 0 && sourceX < transformedCanvas.width && sourceY >= 0 && sourceY < transformedCanvas.height) {
                        transformedColor = transformedCtx.getImageData(sourceX, sourceY, 1, 1).data;
                    }
                    transformedGridHtml += `<td title="${title}" class="${isCenter ? 'center-pixel' : ''}">${transformedColor[0]},${transformedColor[1]},${transformedColor[2]}</td>`;
                }
            }
            originalGridHtml += '</tr>';
            if(canCompare) transformedGridHtml += '</tr>';
        }
        originalGridHtml += '</table></div>';
        transformedGridHtml += '</table></div>';
        
        let finalGridHtml = `<div class="rgb-grid-container">${originalGridHtml}`;
        if(canCompare) {
            finalGridHtml += transformedGridHtml;
        } else {
            finalGridHtml += '<p class="grid-notice">Comparison grid is unavailable because image dimensions have changed.</p>';
        }
        finalGridHtml += '</div>';

        pixelInfo.innerHTML = pixelInfoHtml + finalGridHtml;
    }

    function analyzeJpeg() {
        if (!uploadedFile || !uploadedFile.type.includes('jpeg')) {
            explanationBox.innerHTML = "<h3>Analysis Error</h3><p>Please upload a valid JPEG file to use this feature.</p>";
            return;
        }
    
        const reader = new FileReader();
        reader.onload = (e) => {
            const buffer = e.target.result;
            const view = new DataView(buffer);
            let offset = 0;
            let markers = [];
    
            // Check for JPEG Start of Image (SOI) marker
            if (view.getUint16(offset) !== 0xFFD8) {
                explanationBox.innerHTML = "<h3>Analysis Error</h3><p>This does not appear to be a valid JPEG file.</p>";
                return;
            }
            offset += 2;
    
            // Loop through the file to find markers
            while (offset < view.byteLength) {
                if (view.getUint8(offset) !== 0xFF) {
                    offset++;
                    continue;
                }
                
                const marker = view.getUint8(offset + 1);
                offset += 2;
    
                // Stop at Start of Scan (SOS), as image data follows
                if (marker === 0xDA) { 
                    markers.push({ name: 'SOS (Start of Scan)', marker: 'FFDA', data: 'Compressed image data begins here.' });
                    break;
                }
    
                const length = view.getUint16(offset);
                const segment = buffer.slice(offset + 2, offset + length);
                
                switch (marker) {
                    case 0xE0: // APP0
                        markers.push({ name: 'APP0 (Application Marker)', marker: 'FFE0', data: `Identifier: ${String.fromCharCode.apply(null, new Uint8Array(segment.slice(0, 5)))}` });
                        break;
                    case 0xDB: // DQT
                        markers.push({ name: 'DQT (Define Quantization Table)', marker: 'FFDB', data: parseDQT(new DataView(segment)) });
                        break;
                    case 0xC0: // SOF0
                        markers.push({ name: 'SOF0 (Start of Frame)', marker: 'FFC0', data: parseSOF0(new DataView(segment)) });
                        break;
                    case 0xC4: // DHT
                         markers.push({ name: 'DHT (Define Huffman Table)', marker: 'FFC4', data: 'Huffman table for entropy coding.' });
                        break;
                }
                offset += length;
            }
            displayAnalysis(markers);
        };
        reader.readAsArrayBuffer(uploadedFile);
    }
    
    function parseSOF0(view) {
        const height = view.getUint16(1);
        const width = view.getUint16(3);
        const components = view.getUint8(5);
        return `Dimensions: ${width}x${height}, Components: ${components}`;
    }
    
    function parseDQT(view) {
        let offset = 0;
        let tables = [];
        while (offset < view.byteLength) {
            const tableInfo = view.getUint8(offset);
            const tableId = tableInfo & 0x0F;
            let table = [];
            offset++;
            for (let i = 0; i < 64; i++) {
                table.push(view.getUint8(offset + i));
            }
            
            let tableHtml = `<div class="matrix-container"><strong>Table ID: ${tableId}</strong><table class="matrix">`;
            for (let i = 0; i < 8; i++) {
                tableHtml += '<tr>';
                for (let j = 0; j < 8; j++) {
                    tableHtml += `<td>${table[i * 8 + j]}</td>`;
                }
                tableHtml += '</tr>';
            }
            tableHtml += '</table></div>';
            tables.push(tableHtml);
            offset += 64;
        }
        return tables.join('');
    }
    
    function displayAnalysis(markers) {
        let html = `
            <h2>JPEG File Structure Analysis</h2>
            <p>A JPEG file is not a simple grid of pixels. It's a compressed file containing mathematical data. The file is structured in segments, each starting with a 'marker' (a code beginning with 0xFF). Here are the key markers found in this file:</p>
            <ul>
                ${markers.map(m => `<li><strong>${m.marker} (${m.name}):</strong><div>${m.data}</div></li>`).join('')}
            </ul>
            <hr>
            <h3>The Mathematics of JPEG Compression</h3>
            <p>JPEG compression is a three-step process applied to 8x8 blocks of pixels:</p>
            <h4>1. The Discrete Cosine Transform (DCT)</h4>
            <p>The image is divided into 8x8 blocks. The DCT converts each block of 64 pixel values into 64 "frequency coefficients." The top-left coefficient represents the block's average color, while coefficients to the bottom-right represent increasingly fine details. The human eye is less sensitive to these high-frequency details.</p>
            
            <h4>2. Quantization (The "Lossy" Step)</h4>
            <p>This is where quality is traded for file size. Each of the 64 DCT coefficients is divided by a corresponding value from a <strong>Quantization Table (DQT)</strong>, and the result is rounded. This is the table you see displayed above.</p>
            <p>$$ \\text{Quantized Coefficient} = \\text{round} \\left( \\frac{\\text{DCT Coefficient}}{\\text{DQT Value}} \\right) $$</p>
            <p>Notice the values in the DQT are smaller in the top-left and larger in the bottom-right. This aggressively reduces or eliminates the high-frequency detail coefficients, which is the primary source of compression and quality loss.</p>
    
            <h4>3. Entropy Coding (Huffman)</h4>
            <p>Finally, the quantized coefficients are compressed losslessly using Huffman tables (DHT). This process is similar to how a ZIP file works, creating a compact binary stream of data that forms the body of the JPEG file.</p>
        `;
        explanationBox.innerHTML = html;
        MathJax.typeset(); // Re-render formulas
    
        // Add some styles for the matrix table
        const style = document.createElement('style');
        style.innerHTML = `
            .matrix-container { margin-top: 10px; }
            .matrix { border-collapse: collapse; margin-top: 5px; }
            .matrix td { border: 1px solid #ccc; padding: 4px; text-align: center; font-family: monospace; font-size: 0.9em; }
        `;
        explanationBox.appendChild(style);
    }

};